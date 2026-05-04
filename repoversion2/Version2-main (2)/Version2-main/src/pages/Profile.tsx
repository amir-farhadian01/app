import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, addDoc, getDoc, getDocs, orderBy } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, MapPin, Phone, UserCheck, Shield, Bell, CreditCard, Settings, LogOut, ChevronRight, Camera, Briefcase, CheckCircle2, AlertCircle, FileText, Building2, Users, Fingerprint, Loader2, Image as ImageIcon, Lock, Smartphone, Key, RefreshCw, History, Locate, Eye, EyeOff, Settings2, Activity, XCircle, Grid, Trash2, ShieldCheck, QrCode, Copy } from 'lucide-react';
import Autocomplete from "react-google-autocomplete";
import { QRCodeSVG } from 'qrcode.react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { startRegistration } from '@simplewebauthn/browser';
import { cn } from '../lib/utils';
import UniversalUpload from '../components/UniversalUpload';
import { verifyBusinessEntity } from '../services/businessVerificationService';

export default function Profile() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [isEditing, setIsEditing] = useState(false);
  const [kycList, setKycList] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycType, setKycType] = useState<'personal' | 'business'>('personal');
  const [kycData, setKycData] = useState({ 
    idNumber: '', 
    idType: 'passport',
    idImageFront: '',
    idImageBack: '',
    expiryDate: '',
    businessName: '', 
    registrationNumber: '',
    businessLicense: '',
    businessAddress: '',
    ownerName: '',
    certificates: '',
    businessLogo: '',
    businessRegistrationDoc: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasRegisteredBiometrics, setHasRegisteredBiometrics] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [activeSecurityTab, setActiveSecurityTab] = useState<'account' | 'devices' | 'safety' | 'privacy'>('account');
  
  const [securityData, setSecurityData] = useState({
    loginMethod: 'biometric', // 'biometric', 'pin', 'pattern'
    backupPin: '',
    shareLocation: false,
    googleLinked: true,
    twoFactorEnabled: false,
    twoFactorSecret: '',
    shareStatusWith: [] as { uid: string; displayName: string; photoURL: string }[],
    devices: [
      { id: '1', name: 'iPhone 15 Pro', location: 'Vancouver, CA', lastActive: 'Now', current: true },
      { id: '2', name: 'MacBook Air M2', location: 'Vancouver, CA', lastActive: '2h ago', current: false }
    ],
    safetyWhitelist: [] as string[]
  });

  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [personalData, setPersonalData] = useState({
    displayName: '',
    phone: '',
    bio: '',
    dob: '',
    gender: '',
    address: {
      street: '',
      city: '',
      zip: ''
    },
    emergencyContact: {
      name: '',
      phone: ''
    }
  });

  const [userData, setUserData] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  
  const isAdmin = ['owner', 'platform_admin', 'support', 'finance'].includes(userRole || '');

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!user) return;

    // Fetch user data for biometrics and personal info
    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setHasRegisteredBiometrics(!!data.webauthnCredentials?.length);
        if (data.webauthnCredentials?.length) setBiometricStatus('success');
        
        // Sync personal data
        setPersonalData({
          displayName: data.displayName || user.displayName || '',
          phone: data.phone || '',
          bio: data.bio || '',
          dob: data.dob || '',
          gender: data.gender || '',
          address: {
            street: data.address?.street || '',
            city: data.address?.city || '',
            zip: data.address?.zip || ''
          },
          emergencyContact: {
            name: data.emergencyContact?.name || '',
            phone: data.emergencyContact?.phone || ''
          }
        });
      }
    };
    fetchUserData();
    if (!user) return;

    // Fetch user role
    const fetchRole = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role);
      }
    };
    fetchRole();

    // Listen to KYC status
    const q = query(collection(db, 'kyc'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'));
    const kycUnsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setKycList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setKycList([]);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'kyc'));

    const configUnsubscribe = onSnapshot(doc(db, 'system_config', 'global'), (doc) => {
      if (doc.exists()) {
        setSystemConfig(doc.data());
      }
    });

    return () => {
      kycUnsubscribe();
      configUnsubscribe();
    };
  }, [user]);

  const handleProfilePhotoUpdate = async (url: string) => {
    if (!user) return;
    try {
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      showNotification("Profile photo updated successfully");
      setShowProfileUpload(false);
    } catch (error) {
      console.error("Error updating profile photo:", error);
      showNotification("Failed to update profile photo", 'error');
    }
  };

  if (!user) return null;

  const handleBecomeProvider = async () => {
    if (!user) return;

    // Check KYC status for Level 1 (Personal) - we use the kycList we're already listening to
    const personalKyc = kycList.find(k => k.type === 'personal');

    if (!personalKyc || personalKyc.status !== 'verified') {
      showNotification("You must complete Personal Identity Verification (KYC Level 1) before becoming a provider.", "error");
      setKycType('personal');
      setShowKycModal(true);
      return;
    }

    try {
      setSubmitting(true);
      await updateDoc(doc(db, 'users', user.uid), {
        status: 'pending_verification',
        requestedProviderRole: true
      });
      showNotification("Application received. Please complete Business KYC (Level 2) and wait for admin approval.", "success");
      
      // After role update, prompt or redirect for Business KYC
      setKycType('business');
      setShowKycModal(true);
      
      // Potentially reload or navigate after a short delay if needed
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setSubmitting(false);
    }
  };

  const mapsApiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;

  const handlePlaceSelected = (place: any) => {
    const newAddress = {
      street: '',
      city: '',
      zip: ''
    };

    if (place.address_components) {
      const streetNumber = place.address_components.find((c: any) => c.types.includes('street_number'))?.long_name || '';
      const route = place.address_components.find((c: any) => c.types.includes('route'))?.long_name || '';
      newAddress.street = `${streetNumber} ${route}`.trim() || place.name || '';
      newAddress.city = place.address_components.find((c: any) => c.types.includes('locality'))?.long_name || '';
      newAddress.zip = place.address_components.find((c: any) => c.types.includes('postal_code'))?.long_name || '';
    } else {
      newAddress.street = place.name || '';
    }

    setPersonalData(prev => ({
      ...prev,
      address: newAddress
    }));
  };

  const submitPersonalInfo = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...personalData,
        updatedAt: new Date().toISOString()
      });
      
      if (personalData.displayName !== user.displayName) {
        await updateProfile(user, { displayName: personalData.displayName });
      }
      
      showNotification("Personal information updated successfully");
      setShowPersonalInfoModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setSubmitting(false);
    }
  };

  const personalKyc = kycList.find(k => k.type === 'personal');
  const businessKyc = kycList.find(k => k.type === 'business');

  const submitKyc = async () => {
    if (!user) return;

    // Validation
    if (kycType === 'personal') {
      if (!kycData.idNumber.trim()) {
        showNotification("Please enter your Document Number", "error");
        return;
      }
      if (!kycData.idImageFront || !kycData.idImageBack) {
        showNotification("Please upload both Front and Back images of your document", "error");
        return;
      }
    } else {
      if (!kycData.businessName.trim() || !kycData.registrationNumber.trim() || !kycData.businessLicense.trim()) {
        showNotification("Please enter business name, registration, and license numbers", "error");
        return;
      }
      if (!kycData.businessRegistrationDoc) {
        showNotification("Please upload your business registration document", "error");
        return;
      }
      if (!kycData.expiryDate) {
        showNotification("Please select license expiry date", "error");
        return;
      }

      // 3-month Rule for Business Licenses
      const expiry = new Date(kycData.expiryDate);
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      if (expiry < threeMonthsFromNow) {
        showNotification("Your business license is expiring in less than 3 months. Please renew it first.", "error");
        return;
      }

      // Business Verification API Call
      setSubmitting(true);
      try {
        const strictLookup = systemConfig?.kycConfig?.strictBusinessLookup ?? true;
        const verification = await verifyBusinessEntity(
          kycData.businessName,
          kycData.registrationNumber,
          kycData.businessLicense,
          { strictLookup }
        );

        if (!verification.isValid) {
          showNotification(verification.message, "error");
          setSubmitting(false);
          return;
        }
        showNotification("Business details verified successfully!", "success");
      } catch (error) {
        showNotification("External verification failed. Please try again later.", "error");
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(true);
    try {
      const activeKyc = kycType === 'personal' ? personalKyc : businessKyc;
      console.log("[DEBUG] Submitting KYC:", { kycType, kycId: activeKyc?.id, kycData });
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const kycPayload = {
        userId: user.uid,
        userName: userData.displayName || user.displayName || 'Anonymous',
        userEmail: userData.email || user.email,
        userPhone: userData.phone || '',
        type: kycType,
        status: 'pending',
        details: kycData,
        updatedAt: new Date().toISOString()
      };

      // If there's an existing record of this type, we update it if it was rejected or pending.
      // But user said "no record even rejected should be deleted". 
      // To preserve history, let's always create a new record if the previous one was NOT pending.
      if (activeKyc?.id && activeKyc.status === 'pending') {
        await updateDoc(doc(db, 'kyc', activeKyc.id), kycPayload);
        console.log("[DEBUG] KYC Updated successfully");
      } else {
        const payloadWithCreated = { ...kycPayload, createdAt: new Date().toISOString() };
        await addDoc(collection(db, 'kyc'), payloadWithCreated);
        console.log("[DEBUG] KYC Created successfully");
      }
      
      showNotification("KYC documents submitted for review!", "success");
      setShowKycModal(false);
    } catch (error: any) {
      console.error("KYC Submission Error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'kyc');
      showNotification(error.message || "Failed to submit KYC documents", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!user) return;
    setBiometricLoading(true);
    setBiometricStatus('idle');

    try {
      // 1. Get registration options from server
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, email: user.email }),
      });

      if (!optionsRes.ok) {
        const err = await optionsRes.json();
        throw new Error(err.error || "Failed to get registration options");
      }

      const options = await optionsRes.json();

      // 2. Start WebAuthn registration
      const regResponse = await startRegistration(options);

      // 3. Verify registration on server
      const verifyRes = await fetch('/api/auth/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, body: regResponse }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || "Biometric verification failed");
      }

      const { verified } = await verifyRes.json();

      if (verified) {
        setBiometricStatus('success');
        showNotification("Biometric authentication (Passkey) registered successfully! You can now sign in using your fingerprint or face ID.");
      } else {
        throw new Error("Biometric verification failed");
      }
    } catch (error: any) {
      console.error(error);
      setBiometricStatus('error');
      showNotification(error.message || "Failed to register biometric authentication. Make sure your browser and device support it.", 'error');
    } finally {
      setBiometricLoading(false);
    }
  };

  const updateSecuritySetting = async (key: string, value: any) => {
    setSecurityData(prev => ({ ...prev, [key]: value }));
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`securitySettings.${key}`]: value
      });
      showNotification("Security settings updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const generateBase32Secret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const verify2FA = async () => {
    if (twoFactorToken.length !== 6) {
      showNotification("Please enter a 6-digit verification code", "error");
      return;
    }
    setSubmitting(true);
    try {
      // Simulation: successful link
      await updateSecuritySetting('twoFactorEnabled', true);
      setShow2FASetup(false);
      setTwoFactorToken('');
      showNotification("Google Authenticator linked successfully!");
    } catch (error) {
      showNotification("Failed to verify 2FA code", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    if (passwordForm.new !== passwordForm.confirm) {
      showNotification("New passwords do not match", "error");
      return;
    }
    if (passwordForm.new.length < 6) {
      showNotification("Password must be at least 6 characters", "error");
      return;
    }

    setSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordForm.old);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.new);
      setShowPasswordChangeModal(false);
      setPasswordForm({ old: '', new: '', confirm: '' });
      showNotification("Password updated successfully!");
    } catch (error: any) {
      console.error(error);
      showNotification(error.message || "Failed to update password. Check your old password.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddShareUser = async () => {
    if (!searchEmail || !user) return;
    setIsSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', searchEmail.toLowerCase().trim()));
      const querySnapshot = await getDocs(query(usersRef, where('email', '==', searchEmail.toLowerCase().trim())));
      
      if (querySnapshot.empty) {
        showNotification("User not found", "error");
        return;
      }

      const userData = querySnapshot.docs[0].data();
      const userUid = querySnapshot.docs[0].id;

      if (userUid === user.uid) {
        showNotification("You cannot share with yourself", "error");
        return;
      }

      if (securityData.shareStatusWith.some(u => u.uid === userUid)) {
        showNotification("User already in your sharing list", "error");
        return;
      }

      const newUser = {
        uid: userUid,
        displayName: userData.displayName || 'Anonymous',
        photoURL: userData.photoURL || ''
      };

      const updatedList = [...securityData.shareStatusWith, newUser];
      await updateSecuritySetting('shareStatusWith', updatedList);
      setSearchEmail('');
      showNotification(`Now sharing status with ${newUser.displayName}`);
    } catch (error) {
      console.error(error);
      showNotification("Failed to add user", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveShareUser = async (uid: string) => {
    const updatedList = securityData.shareStatusWith.filter(u => u.uid !== uid);
    await updateSecuritySetting('shareStatusWith', updatedList);
    showNotification("User removed from sharing list");
  };

  const calculateCompletion = () => {
    let score = 0;
    if (personalData.displayName) score += 15;
    if (personalData.phone) score += 15;
    if (personalData.bio) score += 15;
    if (personalData.dob) score += 10;
    if (personalData.gender) score += 10;
    if (personalData.address.street) score += 5;
    if (personalData.address.city) score += 5;
    if (personalData.address.zip) score += 5;
    if (personalData.emergencyContact.name) score += 10;
    if (personalData.emergencyContact.phone) score += 10;
    return score;
  };

  const completion = calculateCompletion();

  return (
    <div className="max-w-2xl mx-auto pb-32 space-y-4 sm:space-y-8 px-4 sm:px-0 scroll-smooth">
      <header className="relative pt-6 sm:pt-12 pb-4 sm:pb-8 px-6 text-center space-y-3 sm:space-y-4">
        <div className="relative inline-block">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-neutral-900 dark:bg-white rounded-[2rem] sm:rounded-[3rem] flex items-center justify-center overflow-hidden shadow-2xl mx-auto border-4 border-app-bg">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-white dark:text-neutral-900 text-3xl sm:text-5xl font-black italic">{user.displayName?.[0]}</span>
            )}
          </div>
          <button 
            onClick={() => setShowProfileUpload(true)}
            className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-app-card rounded-xl sm:rounded-2xl shadow-xl flex items-center justify-center border border-app-border hover:scale-110 transition-all text-app-text"
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-app-text">{user.displayName}</h1>
            {isAdmin && (
              <Link 
                to="/dashboard"
                className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
              >
                <Settings className="w-2.5 h-2.5" />
                Staff
              </Link>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <p className="text-neutral-400 font-bold uppercase tracking-[0.2em] text-[8px] sm:text-[10px]">
              {userRole === 'provider' ? 'Service Provider' : 'Verified Neighbor'}
            </p>
            {personalKyc?.status === 'verified' && businessKyc?.status === 'verified' && <Shield className="w-2.5 h-2.5 sm:w-3 h-3 text-emerald-500" />}
          </div>
          
          {isAdmin && (
            <div className="pt-4 flex justify-center">
              <Link 
                to="/dashboard?tab=kyc"
                className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-app-border/10"
              >
                <ShieldCheck className="w-4 h-4" />
                Enter KYC Review Hub
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      {userRole === 'provider' && (
        <div className="flex gap-2 p-1 bg-app-card/50 rounded-2xl mx-4 sm:mx-6 border border-app-border overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth snap-x">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'company', label: 'Company', icon: Building2 },
            { id: 'members', label: 'Members', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'profile') navigate('/profile');
                else navigate(`/dashboard?tab=${tab.id}`);
              }}
              className={cn(
                "flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all snap-center",
                tab.id === 'profile' ? "bg-app-card text-app-text shadow-sm border border-app-border" : "text-neutral-400 hover:text-app-text shrink-0"
              )}
            >
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 sm:px-6">
        {/* Compact Stats for Mobile */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Jobs', value: '12' },
            { label: 'Rating', value: '5.0' },
            { label: 'Points', value: '450' },
          ].map(stat => (
            <div key={stat.label} className="bg-app-card p-2 sm:p-3 rounded-2xl text-center border border-app-border shadow-sm">
              <p className="text-[7px] sm:text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-sm sm:text-lg font-black text-app-text">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* KYC Status Section - Level 1 Personal */}
        <div className="bg-app-card p-3 sm:p-4 rounded-3xl border border-app-border shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              personalKyc?.status === 'verified' ? "bg-emerald-500/10 text-emerald-500" :
              personalKyc?.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
              personalKyc?.status === 'rejected' ? "bg-red-500/10 text-red-500" :
              "bg-neutral-500/10 text-neutral-400"
            )}>
              {personalKyc?.status === 'verified' ? <CheckCircle2 className="w-5 h-5" /> : 
               personalKyc?.status === 'rejected' ? <AlertCircle className="w-5 h-5" /> :
               <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-bold text-[11px] sm:text-sm text-app-text truncate max-w-[120px]">
                {personalKyc?.status === 'verified' ? 'Identity Verified' : 
                 personalKyc?.status === 'pending' ? 'Reviewing Identity' : 
                 personalKyc?.status === 'rejected' ? 'Identity Rejected' :
                 'Verify Identity'}
              </p>
              <p className="text-[8px] text-neutral-400 uppercase tracking-widest font-black">
                Level 1: Personal KYC
              </p>
            </div>
          </div>
          {(!personalKyc || personalKyc.status === 'rejected') && (
            <button 
              onClick={() => {
                setKycType('personal');
                const lastPersonal = kycList.find(k => k.type === 'personal');
                if (lastPersonal?.details) {
                  setKycData(prev => ({ ...prev, ...lastPersonal.details }));
                } else {
                  setKycData({ 
                    idNumber: '', idType: 'passport', idImageFront: '', idImageBack: '', expiryDate: '',
                    businessName: '', registrationNumber: '', businessLicense: '', businessAddress: '', ownerName: '', certificates: '', businessLogo: '', businessRegistrationDoc: ''
                  });
                }
                setShowKycModal(true);
              }}
              className="px-3 py-1.5 bg-app-text text-app-bg rounded-lg font-bold text-[9px] uppercase tracking-wider hover:opacity-90 transition-opacity shrink-0"
            >
              {personalKyc?.status === 'rejected' ? 'Retry' : 'Verify'}
            </button>
          )}
        </div>

        {/* KYC Status Section - Level 2 Business (Provider Only) */}
        {userRole === 'provider' && (
          <div className="bg-app-card p-3 sm:p-4 rounded-3xl border border-app-border shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                businessKyc?.status === 'verified' ? "bg-emerald-500/10 text-emerald-500" :
                businessKyc?.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                businessKyc?.status === 'rejected' ? "bg-red-500/10 text-red-500" :
                "bg-neutral-500/10 text-neutral-400"
              )}>
                {businessKyc?.status === 'verified' ? <CheckCircle2 className="w-5 h-5" /> : 
                 businessKyc?.status === 'rejected' ? <AlertCircle className="w-5 h-5" /> :
                 <Building2 className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-[11px] sm:text-sm text-app-text truncate max-w-[120px]">
                  {businessKyc?.status === 'verified' ? 'Business Verified' : 
                   businessKyc?.status === 'pending' ? 'Reviewing Business' : 
                   businessKyc?.status === 'rejected' ? 'Business Rejected' :
                   'Verify Business'}
                </p>
                <p className="text-[8px] text-neutral-400 uppercase tracking-widest font-black">
                  Level 2: Professional KYC
                </p>
              </div>
            </div>
            {(!businessKyc || businessKyc.status === 'rejected') && (
              <button 
                onClick={() => {
                  if (personalKyc?.status !== 'verified') {
                    showNotification("Please complete Level 1: Personal Identity verification first.", "error");
                    return;
                  }
                  setKycType('business');
                  const lastBusiness = kycList.find(k => k.type === 'business');
                  if (lastBusiness?.details) {
                    setKycData(prev => ({ ...prev, ...lastBusiness.details }));
                  } else {
                    setKycData({ 
                      idNumber: '', idType: 'passport', idImageFront: '', idImageBack: '', expiryDate: '',
                      businessName: '', registrationNumber: '', businessLicense: '', businessAddress: '', ownerName: '', certificates: '', businessLogo: '', businessRegistrationDoc: ''
                    });
                  }
                  setShowKycModal(true);
                }}
                className="px-3 py-1.5 bg-app-text text-app-bg rounded-lg font-bold text-[9px] uppercase tracking-wider hover:opacity-90 transition-opacity shrink-0"
              >
                {businessKyc?.status === 'rejected' ? 'Retry' : 'Verify'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 px-4 sm:px-6 mt-2">
        {/* Become Provider Section - Highly Compact */}
        {userRole === 'customer' && (
          <button 
            onClick={handleBecomeProvider}
            className="w-full p-4 bg-app-text text-app-bg rounded-3xl flex items-center justify-between group hover:scale-[1.01] transition-all shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-app-bg/10">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-bold text-xs block">Become a Provider</span>
                <span className="text-[8px] opacity-60 uppercase tracking-widest font-black">Join our network</span>
              </div>
            </div>
            <ChevronRight className="w-3 h-3 opacity-40 group-hover:translate-x-1 transition-all" />
          </button>
        )}

        <section className="space-y-2">
          <h3 className="text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Security & Devices</h3>
          <div className="bg-app-card p-4 rounded-3xl border border-app-border shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-[11px] sm:text-sm text-app-text">Biometrics</p>
                <p className="text-[8px] text-neutral-400 uppercase tracking-widest font-black">Instant Login</p>
              </div>
            </div>
            <button 
              onClick={handleRegisterBiometric}
              disabled={biometricLoading}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all flex items-center gap-2 shrink-0",
                biometricStatus === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-app-text text-app-bg"
              )}
            >
              {biometricLoading ? <Loader2 className="w-2 h-2 animate-spin" /> : biometricStatus === 'success' ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
              {biometricStatus === 'success' ? 'Active' : 'Enable'}
            </button>
          </div>
        </section>

        <section className="space-y-2 pb-10">
          <h3 className="text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Account Settings</h3>
          <div className="bg-app-card rounded-3xl border border-app-border overflow-hidden shadow-sm">
            {[
              { label: 'Personal Info', icon: User, color: 'text-blue-500', onClick: () => setShowPersonalInfoModal(true) },
              { label: 'Payments', icon: CreditCard, color: 'text-emerald-500', path: '/dashboard?tab=finance' },
              { label: 'Notifications', icon: Bell, color: 'text-amber-500', path: '/notifications' },
              { label: 'Privacy', icon: Shield, color: 'text-purple-500', onClick: () => setShowSecurityModal(true) },
            ].map((item, i) => 
                item.onClick ? (
                  <button 
                    key={item.label} 
                    onClick={item.onClick}
                    className={cn(
                      "w-full p-4 flex items-center justify-between group hover:bg-app-bg/50 transition-all text-app-text",
                      i !== 0 && "border-t border-app-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-app-bg/50", item.color)}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-neutral-400 group-hover:text-app-text transition-all" />
                  </button>
                ) : (
                  <button 
                    key={item.label} 
                    onClick={() => navigate(item.path!)}
                    className={cn(
                      "w-full p-4 flex items-center justify-between group hover:bg-app-bg/50 transition-all text-app-text",
                      i !== 0 && "border-t border-app-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-app-bg/50", item.color)}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-neutral-400 group-hover:text-app-text transition-all" />
                  </button>
                )
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Support</h3>
          <div className="bg-app-card rounded-[2.5rem] border border-app-border overflow-hidden shadow-sm">
            {[
              { label: 'Help Center', icon: Settings, path: '/tickets' },
              { label: 'Contact Us', icon: Mail, path: '/tickets' },
            ].map((item, i) => (
              <button 
                key={item.label} 
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full p-6 flex items-center justify-between group hover:bg-app-bg/50 transition-all text-app-text",
                  i !== 0 && "border-t border-app-border"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-app-bg/50 text-neutral-400">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-app-text group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </section>

        <button 
          onClick={() => auth.signOut()}
          className="w-full p-6 bg-red-500/10 text-red-500 rounded-[2.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      {/* Profile Photo Upload Modal */}
      <AnimatePresence>
        {showProfileUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl border border-app-border"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Update Photo</h2>
                <p className="text-neutral-500 text-xs">Choose a professional photo to build trust with your neighbors.</p>
              </div>

              <UniversalUpload 
                onUploadComplete={handleProfilePhotoUpdate}
                onUploadError={(err) => showNotification(err.message, 'error')}
                label="New Profile Photo"
                folder="profiles/avatars"
              />

              <button 
                onClick={() => setShowProfileUpload(false)}
                className="w-full py-4 bg-app-bg text-neutral-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:text-app-text transition-all"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {show2FASetup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-3xl bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              {/* Left Side: Setup Steps */}
              <div className="flex-1 p-8 sm:p-12 space-y-10">
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-4">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white leading-none">Protect Account</h3>
                  <p className="text-sm text-neutral-500 font-medium">Follow these steps to link Google Authenticator</p>
                </div>

                <div className="space-y-8">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-black shrink-0">1</div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Scan the QR Code</p>
                      <p className="text-xs text-neutral-500 leading-relaxed font-medium">Use Google Authenticator or any TOTP app to scan the code on the right.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-black shrink-0">2</div>
                    <div className="space-y-4 w-full">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Enter Security Token</p>
                      <div className="relative">
                        <div className="flex justify-between gap-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <div 
                              key={index}
                              className={cn(
                                "w-10 h-14 sm:w-12 sm:h-16 rounded-xl border-2 flex items-center justify-center text-xl font-mono font-black transition-all",
                                twoFactorToken[index] 
                                  ? "border-blue-500 bg-blue-500/5 text-blue-500" 
                                  : "border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-400"
                              )}
                            >
                              {twoFactorToken[index] || '•'}
                            </div>
                          ))}
                        </div>
                        <input 
                          type="text"
                          maxLength={6}
                          autoFocus
                          value={twoFactorToken}
                          onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                          autoComplete="one-time-code"
                        />
                      </div>
                      <p className="text-[10px] text-neutral-400 text-center font-bold uppercase tracking-widest pt-2">Type the 6-digit code from your app</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex flex-col gap-4">
                  <button 
                    disabled={submitting || twoFactorToken.length !== 6}
                    onClick={verify2FA}
                    className="w-full py-5 bg-blue-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify and Enable"}
                  </button>
                  <button 
                    onClick={() => setShow2FASetup(false)}
                    className="w-full py-2 text-neutral-400 font-bold uppercase tracking-widest text-[10px] hover:text-rose-500 transition-all"
                  >
                    Cancel Setup
                  </button>
                </div>
              </div>

              {/* Right Side: QR & Key (Google Like Style) */}
              <div className="w-full md:w-80 bg-neutral-50 dark:bg-neutral-900/50 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-800 p-10 flex flex-col items-center justify-center space-y-8">
                <div className="bg-white p-6 rounded-[2rem] shadow-2xl shadow-black/10 ring-1 ring-black/5">
                  <QRCodeSVG 
                    value={`otpauth://totp/Neighborly:${user?.email}?secret=${securityData.twoFactorSecret}&issuer=Neighborly`}
                    size={200}
                    level="H"
                  />
                </div>
                
                <div className="text-center w-full max-w-[200px] space-y-5">
                  <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Manual Setup Key</p>
                    <div className="flex items-center gap-3 justify-center">
                      <code className="text-sm font-mono font-bold text-neutral-900 dark:text-white tracking-wider">{securityData.twoFactorSecret}</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(securityData.twoFactorSecret);
                          showNotification("Key copied to clipboard");
                        }}
                        className="p-1.5 hover:bg-blue-500/10 rounded-lg text-neutral-400 hover:text-blue-500 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">Can't scan the code? <br/> Enter this secret manually in your Authenticator app.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChangeModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-app-card rounded-[3rem] p-10 border border-app-border space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-app-text">Update Password</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Old Password</label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.old}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old: e.target.value })}
                    className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">New Password</label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Confirm New Password</label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    disabled={submitting}
                    onClick={handleChangePassword}
                    className="w-full py-5 bg-app-text text-app-bg rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                  </button>
                  <button 
                    onClick={() => setShowPasswordChangeModal(false)}
                    className="w-full py-4 text-neutral-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security & Privacy Modal */}
      <AnimatePresence>
        {showSecurityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-app-card rounded-[3rem] shadow-2xl border border-app-border max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 sm:p-10 pb-4 flex items-center justify-between border-b border-app-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-app-text">Security Center</h2>
                    <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Manage your protection</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSecurityModal(false)}
                  className="w-10 h-10 bg-app-bg border border-app-border rounded-xl flex items-center justify-center text-neutral-400 hover:text-app-text transition-all"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex px-10 py-2 gap-8 border-b border-app-border bg-app-bg/30">
                {[
                  { id: 'account', label: 'Account', icon: Lock },
                  { id: 'devices', label: 'Devices', icon: Smartphone },
                  { id: 'safety', label: 'Safety', icon: Activity },
                  { id: 'privacy', label: 'Privacy', icon: Eye }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSecurityTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 py-4 border-b-2 transition-all text-xs font-black uppercase tracking-widest",
                      activeSecurityTab === tab.id 
                        ? "border-purple-500 text-app-text" 
                        : "border-transparent text-neutral-500 hover:text-neutral-300"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                {activeSecurityTab === 'account' && (
                  <div className="space-y-6">
                    <div className="bg-app-bg/50 border border-app-border rounded-3xl p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-app-text">Google Account</p>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Linked for secure login</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Connected</span>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Authentication</p>
                      <button 
                        onClick={() => setShowPasswordChangeModal(true)}
                        className="w-full p-6 bg-app-bg border border-app-border rounded-3xl flex items-center justify-between hover:bg-neutral-800/50 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Key className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm text-app-text">Change Password</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Secure your account</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:translate-x-1" />
                      </button>

                      {/* 2FA Toggle */}
                      <div className="bg-app-bg/50 border border-app-border rounded-3xl p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm text-app-text">Google Authenticator (2FA)</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">
                              {securityData.twoFactorEnabled ? 'Securely enabled' : 'Not protected'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (!securityData.twoFactorEnabled) {
                              const secret = generateBase32Secret();
                              setSecurityData(prev => ({ ...prev, twoFactorSecret: secret }));
                              setShow2FASetup(true);
                            } else {
                              updateSecuritySetting('twoFactorEnabled', false);
                            }
                          }}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            securityData.twoFactorEnabled ? "bg-emerald-500" : "bg-neutral-800"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                            securityData.twoFactorEnabled ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSecurityTab === 'devices' && (
                  <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Active Sessions</p>
                    <div className="space-y-3">
                      {securityData.devices.map(dev => (
                        <div key={dev.id} className="bg-app-bg/50 border border-app-border rounded-3xl p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center text-neutral-400">
                              <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-app-text">{dev.name}</p>
                                {dev.current && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black uppercase">Current</span>}
                              </div>
                              <p className="text-[10px] text-neutral-500 font-bold">{dev.location} • {dev.lastActive}</p>
                            </div>
                          </div>
                          {!dev.current && (
                            <button className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSecurityTab === 'safety' && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Login Methods</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { id: 'biometric', label: 'Face / Fingerprint', icon: Fingerprint, color: 'text-purple-500' },
                          { id: 'pin', label: 'Security PIN', icon: Grid, color: 'text-blue-500' },
                          { id: 'pattern', label: 'Touch Pattern', icon: RefreshCw, color: 'text-emerald-500' }
                        ].map(method => (
                          <button
                            key={method.id}
                            onClick={() => updateSecuritySetting('loginMethod', method.id)}
                            className={cn(
                              "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 text-center",
                              securityData.loginMethod === method.id 
                                ? "bg-purple-500/5 border-purple-500/50" 
                                : "bg-app-bg border-app-border hover:border-neutral-700"
                            )}
                          >
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-app-bg shadow-inner", method.color)}>
                              <method.icon className="w-6 h-6" />
                            </div>
                            <span className="font-black uppercase tracking-widest text-[10px] text-app-text">{method.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Backup Protection (Required)</p>
                      <div className="bg-app-bg/50 border border-app-border rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Backup PIN Code</label>
                          <button className="text-[10px] font-black uppercase tracking-widest text-blue-500">Reset PIN</button>
                        </div>
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="•••••"
                          value={securityData.backupPin}
                          onChange={(e) => setSecurityData(prev => ({ ...prev, backupPin: e.target.value }))}
                          className="w-full p-4 bg-app-bg border border-app-border rounded-2xl text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
                        />
                        <p className="text-[8px] text-neutral-500 uppercase tracking-widest text-center leading-relaxed font-bold">Used when primary biometric login fails</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSecurityTab === 'privacy' && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Real-time Visibility</p>
                      <div className="bg-app-bg/50 border border-app-border rounded-3xl p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            securityData.shareLocation ? "bg-blue-500/20 text-blue-500" : "bg-neutral-800 text-neutral-500"
                          )}>
                            <Locate className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-app-text">Share My Status</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Live location during active services</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => updateSecuritySetting('shareLocation', !securityData.shareLocation)}
                          className={cn(
                            "w-14 h-8 rounded-full transition-all relative",
                            securityData.shareLocation ? "bg-emerald-500" : "bg-neutral-800"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 bg-white rounded-full absolute top-1 transition-all",
                            securityData.shareLocation ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>

                      {/* Share with Users Section */}
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between ml-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Share with Specific Neighbors</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input 
                              type="email"
                              placeholder="neighbor@email.com"
                              value={searchEmail}
                              onChange={(e) => setSearchEmail(e.target.value)}
                              className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-xs"
                            />
                            {isSearching && <Loader2 className="w-4 h-4 animate-spin absolute right-4 top-4 text-blue-500" />}
                          </div>
                          <button 
                            onClick={handleAddShareUser}
                            disabled={!searchEmail || isSearching}
                            className="px-6 bg-app-text text-app-bg rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 disabled:opacity-50 transition-all"
                          >
                            Add
                          </button>
                        </div>

                        <div className="space-y-2">
                          {securityData.shareStatusWith?.length > 0 ? (
                            securityData.shareStatusWith.map(sharedUser => (
                              <div key={sharedUser.uid} className="bg-app-bg/30 border border-app-border/50 rounded-2xl p-4 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  {sharedUser.photoURL ? (
                                    <img src={sharedUser.photoURL} className="w-8 h-8 rounded-full border border-app-border" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-black">{sharedUser.displayName[0]}</div>
                                  )}
                                  <div>
                                    <p className="font-bold text-xs text-app-text">{sharedUser.displayName}</p>
                                    <p className="text-[8px] text-neutral-500 uppercase font-black tracking-widest">Can view your live status</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleRemoveShareUser(sharedUser.uid)}
                                  className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-neutral-600 text-center italic py-2">No users added to your share list yet.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Safety Whitelist</p>
                        <button className="text-[10px] font-black uppercase tracking-widest text-emerald-500">+ Add Provider</button>
                      </div>
                      <div className="bg-app-bg/50 border border-app-border rounded-3xl p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-app-text">Whitelist Verified Providers</p>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black leading-relaxed">Providers you add here will be marked as "Trusted Safely" and can be prioritized in your search results.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-app-border bg-app-bg/10 flex justify-end">
                <button 
                  onClick={() => setShowSecurityModal(false)}
                  className="px-10 py-4 bg-app-text text-app-bg rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all"
                >
                  Confirm Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Personal Information Modal */}
      <AnimatePresence>
        {showPersonalInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-app-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 space-y-6 sm:space-y-8 shadow-2xl border border-app-border max-h-[90vh] overflow-y-auto custom-scrollbar relative"
            >
              <button 
                onClick={() => setShowPersonalInfoModal(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-neutral-400 hover:text-app-text transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Personal Info</h2>
                <p className="text-neutral-500 text-sm">Update your identity and contact details.</p>
                
                {/* Completion Progress */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    <span>Profile Completion</span>
                    <span className={cn(
                      completion === 100 ? "text-emerald-500" : "text-blue-500"
                    )}>{completion}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-app-bg border border-app-border rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${completion}%` }}
                      className={cn(
                        "h-full transition-all duration-500",
                        completion === 100 ? "bg-emerald-500" : "bg-blue-500"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Identity Group */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-500/5 py-1 px-3 rounded-full w-fit">
                    <Shield className="w-3 h-3" /> Identity
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Full Name</label>
                      <input 
                        type="text" 
                        value={personalData.displayName}
                        onChange={(e) => setPersonalData({ ...personalData, displayName: e.target.value })}
                        placeholder="John Doe"
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-app-text"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Gender</label>
                      <select 
                        value={personalData.gender}
                        onChange={(e) => setPersonalData({ ...personalData, gender: e.target.value })}
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-app-text"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Date of Birth</label>
                    <input 
                      type="date" 
                      value={personalData.dob}
                      onChange={(e) => setPersonalData({ ...personalData, dob: e.target.value })}
                      className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-app-text"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Bio / Description</label>
                    <textarea 
                      value={personalData.bio}
                      onChange={(e) => setPersonalData({ ...personalData, bio: e.target.value })}
                      placeholder="Tell your neighbors a bit about yourself..."
                      rows={3}
                      className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-app-text resize-none"
                    />
                  </div>
                </div>

                {/* Neighborhood / Location */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/5 py-1 px-3 rounded-full w-fit">
                    <MapPin className="w-3 h-3" /> Neighborhood
                  </h4>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Street Address</label>
                      {!mapsApiKey && (
                        <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                          Maps API Key Required
                        </span>
                      )}
                    </div>
                    {mapsApiKey ? (
                      <Autocomplete
                        apiKey={mapsApiKey}
                        onPlaceSelected={handlePlaceSelected}
                        defaultValue={personalData.address.street}
                        options={{
                          types: ["address"],
                          componentRestrictions: { country: ["ca", "us"] },
                        }}
                        placeholder="Start typing your address..."
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-app-text"
                        onChange={(e: any) => setPersonalData({ ...personalData, address: { ...personalData.address, street: e.target.value } })}
                      />
                    ) : (
                      <input 
                        type="text" 
                        value={personalData.address.street}
                        onChange={(e) => setPersonalData({ ...personalData, address: { ...personalData.address, street: e.target.value } })}
                        placeholder="123 Neighborhood St"
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-app-text"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">City</label>
                      <input 
                        type="text" 
                        value={personalData.address.city}
                        onChange={(e) => setPersonalData({ ...personalData, address: { ...personalData.address, city: e.target.value } })}
                        placeholder="Neighborville"
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-app-text"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Zip Code</label>
                      <input 
                        type="text" 
                        value={personalData.address.zip}
                        onChange={(e) => setPersonalData({ ...personalData, address: { ...personalData.address, zip: e.target.value } })}
                        placeholder="12345"
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-app-text"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact & Security */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 bg-rose-500/5 py-1 px-3 rounded-full w-fit">
                    <Phone className="w-3 h-3" /> Contact & Security
                  </h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Phone Number</label>
                    <PhoneInput
                      country={'ca'}
                      onlyCountries={['ca', 'us']}
                      value={personalData.phone}
                      onChange={(phone) => setPersonalData({ ...personalData, phone })}
                      containerClass="phone-input-container"
                      inputClass="!w-full !p-4 !h-auto !bg-app-bg !border-app-border !rounded-2xl !text-app-text !text-sm focus:!ring-2 focus:!ring-rose-500/50 !transition-all !pl-14"
                      buttonClass="!bg-transparent !border-app-border !rounded-l-2xl !hover:bg-app-bg/50 !transition-all !border-r-0"
                      dropdownClass="!bg-app-card !text-app-text !border-app-border !rounded-xl !shadow-2xl"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-3xl border border-app-border space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Emergency Contact</p>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Contact Name</label>
                        <input 
                          type="text" 
                          value={personalData.emergencyContact.name}
                          onChange={(e) => setPersonalData({ ...personalData, emergencyContact: { ...personalData.emergencyContact, name: e.target.value } })}
                          placeholder="Trusted Person Name"
                          className="w-full p-3 bg-app-card border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all text-app-text"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Contact Phone</label>
                        <PhoneInput
                          country={'ca'}
                          onlyCountries={['ca', 'us', 'ir']}
                          value={personalData.emergencyContact.phone}
                          onChange={(phone) => setPersonalData({ ...personalData, emergencyContact: { ...personalData.emergencyContact, phone } })}
                          containerClass="phone-input-container"
                          inputClass="!w-full !p-3 !h-auto !bg-app-card !border-app-border !rounded-xl !text-app-text !text-sm focus:!ring-2 focus:!ring-rose-500/20 !transition-all !pl-12"
                          buttonClass="!bg-transparent !border-app-border !rounded-l-xl !border-r-0"
                          dropdownClass="!bg-app-card !text-app-text !border-app-border !rounded-xl"
                          placeholder="Contact Phone Number"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-app-border">
                <button 
                  onClick={submitPersonalInfo}
                  disabled={submitting}
                  className="w-full py-4 bg-app-text text-app-bg rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {submitting ? 'Saving...' : 'Update Information'}
                </button>
                <button 
                  onClick={() => setShowPersonalInfoModal(false)}
                  className="w-full py-4 bg-app-card text-neutral-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:text-app-text transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KYC Modal */}
      <AnimatePresence>
        {showKycModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-app-card rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-10 space-y-6 sm:space-y-8 shadow-2xl border border-app-border max-h-[90vh] overflow-y-auto custom-scrollbar relative"
            >
              <button 
                onClick={() => setShowKycModal(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-neutral-400 hover:text-app-text transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-app-text text-app-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {kycType === 'business' ? <Building2 className="w-8 h-8" /> : <User className="w-8 h-8" />}
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-app-text">
                  {kycType === 'business' ? 'Business KYC' : 'Personal KYC'}
                </h2>
                <p className="text-neutral-500 text-sm">Please provide the following details for verification.</p>
              </div>

              <div className="space-y-4">
                {kycType === 'personal' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Document Type</label>
                      <select 
                        value={kycData.idType}
                        onChange={(e) => setKycData({ ...kycData, idType: e.target.value })}
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
                      >
                        <option value="passport">Passport</option>
                        <option value="id_card">National ID Card</option>
                        <option value="drivers_license">Driver's License</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">ID Number</label>
                      <input 
                        type="text" 
                        placeholder="Enter your Document Number"
                        value={kycData.idNumber}
                        onChange={(e) => setKycData({ ...kycData, idNumber: e.target.value })}
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2 text-center sm:text-left">ID Front (JPG/PNG/WEBP)</label>
                        <UniversalUpload 
                          initialUrl={kycData.idImageFront}
                          onUploadComplete={(url) => setKycData(prev => ({ ...prev, idImageFront: url }))}
                          onDelete={() => setKycData(prev => ({ ...prev, idImageFront: '' }))}
                          onUploadError={(err) => showNotification(err.message, 'error')}
                          label="Front View"
                          folder="kyc/personal/front"
                          maxSizeMB={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2 text-center sm:text-left">ID Back (JPG/PNG/WEBP)</label>
                        <UniversalUpload 
                          initialUrl={kycData.idImageBack}
                          onUploadComplete={(url) => setKycData(prev => ({ ...prev, idImageBack: url }))}
                          onDelete={() => setKycData(prev => ({ ...prev, idImageBack: '' }))}
                          onUploadError={(err) => showNotification(err.message, 'error')}
                          label="Back View"
                          folder="kyc/personal/back"
                          maxSizeMB={5}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[50vh] sm:max-h-[450px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Business Name</label>
                      <input 
                        type="text" 
                        placeholder="Official Company Name"
                        value={kycData.businessName}
                        onChange={(e) => setKycData({ ...kycData, businessName: e.target.value })}
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Owner Full Name</label>
                      <input 
                        type="text" 
                        placeholder="Full name of the business owner"
                        value={kycData.ownerName}
                        onChange={(e) => setKycData({ ...kycData, ownerName: e.target.value })}
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Reg Number</label>
                        <input 
                          type="text" 
                          placeholder="Tax ID / Reg #"
                          value={kycData.registrationNumber}
                          onChange={(e) => setKycData({ ...kycData, registrationNumber: e.target.value })}
                          className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">License #</label>
                        <input 
                          type="text" 
                          placeholder="Activity License #"
                          value={kycData.businessLicense}
                          onChange={(e) => setKycData({ ...kycData, businessLicense: e.target.value })}
                          className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">License Expiry Date</label>
                      <input 
                        type="date" 
                        value={kycData.expiryDate}
                        onChange={(e) => setKycData(prev => ({ ...prev, expiryDate: e.target.value }))}
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
                      />
                      <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest ml-2">Submission will fail if license expires in less than 3 months.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2 text-center sm:text-left">Business Address</label>
                      <Autocomplete
                        apiKey={mapsApiKey}
                        onPlaceSelected={(place) => {
                          const addr = place.formatted_address || place.name || '';
                          setKycData(prev => ({ ...prev, businessAddress: addr }));
                        }}
                        options={{
                          types: ["address"],
                          fields: ["formatted_address", "address_components", "name"]
                        }}
                        defaultValue={kycData.businessAddress}
                        placeholder="Full physical address"
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text text-sm sm:text-base"
                        onBlur={(e) => setKycData(prev => ({ ...prev, businessAddress: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Business Logo</label>
                        <UniversalUpload 
                          initialUrl={kycData.businessLogo}
                          onUploadComplete={(url) => setKycData(prev => ({ ...prev, businessLogo: url }))}
                          onDelete={() => setKycData(prev => ({ ...prev, businessLogo: '' }))}
                          onUploadError={(err) => showNotification(err.message, 'error')}
                          label="Logotype"
                          folder="kyc/business/logo"
                          maxSizeMB={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Registration Doc</label>
                        <UniversalUpload 
                          initialUrl={kycData.businessRegistrationDoc}
                          onUploadComplete={(url) => setKycData(prev => ({ ...prev, businessRegistrationDoc: url }))}
                          onDelete={() => setKycData(prev => ({ ...prev, businessRegistrationDoc: '' }))}
                          onUploadError={(err) => showNotification(err.message, 'error')}
                          label="Certification"
                          folder="kyc/business/docs"
                          maxSizeMB={10}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={submitKyc}
                  disabled={submitting}
                  className="w-full py-4 bg-app-text text-app-bg rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
                <button 
                  onClick={() => setShowKycModal(false)}
                  className="w-full py-4 bg-app-card text-neutral-400 rounded-2xl font-bold text-sm hover:text-app-text transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      {notification && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={cn(
            "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 border",
            notification.type === 'success' 
              ? "bg-emerald-500 text-white border-emerald-400" 
              : "bg-red-500 text-white border-red-400"
          )}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-bold">{notification.message}</p>
        </motion.div>
      )}
    </div>
  );
}
