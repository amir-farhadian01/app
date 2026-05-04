import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, MapPin, Phone, Shield, Bell, CreditCard, Settings, LogOut, ChevronRight, Camera, Briefcase, CheckCircle2, AlertCircle, FileText, Building2, Users, Fingerprint, Loader2 } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { cn } from '../lib/utils';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [kyc, setKyc] = useState<any>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycType, setKycType] = useState<'personal' | 'business'>('personal');
  const [kycData, setKycData] = useState({
    idNumber: '',
    idType: 'passport',
    idImageFront: '',
    idImageBack: '',
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

  const fetchKyc = async () => {
    if (!user) return;
    try {
      const kycList = await api.get<any[]>('/api/admin/kyc');
      const myKyc = kycList?.find((k: any) => k.userId === user.id);
      if (myKyc) setKyc(myKyc);
    } catch {
      // Non-admin won't have access — try user-level endpoint or ignore
      setKyc(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchKyc();
  }, [user]);

  if (!user) return null;

  const handleBecomeProvider = async () => {
    try {
      await api.put(`/api/users/me`, {
        role: 'provider',
      });
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to update role.');
    }
  };

  const submitKyc = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await api.post('/api/tickets', {
        subject: `KYC Submission - ${kycType}`,
        type: 'client_to_admin',
        recipientId: 'admin',
        message: JSON.stringify({
          kycType,
          userId: user.id,
          userName: user.displayName || 'Anonymous',
          userEmail: user.email,
          details: kycData,
        }),
      });
      setShowKycModal(false);
      setKyc({ status: 'pending', type: kycType });
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to submit KYC.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!user) return;
    setBiometricLoading(true);
    setBiometricStatus('idle');

    try {
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });

      if (!optionsRes.ok) {
        const err = await optionsRes.json();
        throw new Error(err.error || "Failed to get registration options");
      }

      const options = await optionsRes.json();
      const regResponse = await startRegistration(options);

      const verifyRes = await fetch('/api/auth/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, body: regResponse }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || "Biometric verification failed");
      }

      const { verified } = await verifyRes.json();

      if (verified) {
        setBiometricStatus('success');
        alert("Biometric authentication (Passkey) registered successfully! You can now sign in using your fingerprint or face ID.");
      } else {
        throw new Error("Biometric verification failed");
      }
    } catch (error: any) {
      console.error(error);
      setBiometricStatus('error');
      alert(error.message || "Failed to register biometric authentication. Make sure your browser and device support it.");
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="max-w-2xl mx-auto pb-32 space-y-8">
      <header className="relative pt-12 pb-8 px-6 text-center space-y-4">
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-neutral-900 dark:bg-white rounded-[3rem] flex items-center justify-center overflow-hidden shadow-2xl mx-auto border-4 border-app-bg">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white dark:text-neutral-900 text-5xl font-black italic">{user.displayName?.[0]}</span>
            )}
          </div>
          <button className="absolute bottom-0 right-0 w-10 h-10 bg-app-card rounded-2xl shadow-xl flex items-center justify-center border border-app-border hover:scale-110 transition-all">
            <Camera className="w-5 h-5 text-app-text" />
          </button>
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-app-text">{user.displayName}</h1>
          <div className="flex items-center justify-center gap-2">
            <p className="text-neutral-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              {user.role === 'provider' ? 'Service Provider' : 'Verified Neighbor'}
            </p>
            {kyc?.status === 'verified' && <Shield className="w-3 h-3 text-emerald-500" />}
          </div>
        </div>
      </header>

      {/* Tabs */}
      {user.role === 'provider' && (
        <div className="flex gap-2 p-1 bg-app-card/50 rounded-2xl mx-6 border border-app-border">
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
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                tab.id === 'profile' ? "bg-app-card text-app-text shadow-sm border border-app-border" : "text-neutral-400 hover:text-app-text"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 px-6">
        {[
          { label: 'Jobs', value: '12' },
          { label: 'Rating', value: '5.0' },
          { label: 'Points', value: '450' },
        ].map(stat => (
          <div key={stat.label} className="bg-app-card p-4 rounded-3xl text-center border border-app-border shadow-sm">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-xl font-black text-app-text">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6 px-6">
        {/* KYC Status Section */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Verification Status</h3>
          <div className="bg-app-card p-6 rounded-[2.5rem] border border-app-border shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                kyc?.status === 'verified' ? "bg-emerald-500/10 text-emerald-500" :
                kyc?.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                kyc?.status === 'rejected' ? "bg-red-500/10 text-red-500" :
                "bg-neutral-500/10 text-neutral-400"
              )}>
                {kyc?.status === 'verified' ? <CheckCircle2 className="w-6 h-6" /> :
                 kyc?.status === 'rejected' ? <AlertCircle className="w-6 h-6" /> :
                 <Shield className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-bold text-sm text-app-text">
                  {kyc?.status === 'verified' ? 'Identity Verified' :
                   kyc?.status === 'pending' ? 'Verification Pending' :
                   kyc?.status === 'rejected' ? 'Verification Rejected' :
                   'Not Verified'}
                </p>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">
                  {kyc?.type === 'business' ? 'Business Account' : 'Personal Account'}
                </p>
              </div>
            </div>
            {(!kyc || kyc.status === 'rejected') && (
              <button
                onClick={() => {
                  setKycType(user.role === 'provider' ? 'business' : 'personal');
                  setShowKycModal(true);
                }}
                className="px-4 py-2 bg-app-text text-app-bg rounded-xl font-bold text-xs hover:opacity-90 transition-opacity"
              >
                {kyc?.status === 'rejected' ? 'Try Again' : 'Verify Now'}
              </button>
            )}
          </div>
        </section>

        {/* Become Provider Section */}
        {user.role === 'customer' && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Opportunities</h3>
            <button
              onClick={handleBecomeProvider}
              className="w-full p-6 bg-app-text text-app-bg rounded-[2.5rem] flex items-center justify-between group hover:scale-[1.02] transition-all shadow-xl shadow-neutral-900/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-app-bg/10">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-sm block">Become a Provider</span>
                  <span className="text-[10px] opacity-60 uppercase tracking-widest font-black">Start earning today</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-all" />
            </button>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Security</h3>
          <div className="bg-app-card p-6 rounded-[2.5rem] border border-app-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm text-app-text">Biometric Login</p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Fingerprint / Face ID</p>
                </div>
              </div>
              <button
                onClick={handleRegisterBiometric}
                disabled={biometricLoading}
                className={cn(
                  "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                  biometricStatus === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-app-text text-app-bg"
                )}
              >
                {biometricLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : biometricStatus === 'success' ? <CheckCircle2 className="w-3 h-3" /> : null}
                {biometricStatus === 'success' ? 'Registered' : 'Register Device'}
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 leading-relaxed px-2">
              Register this device to sign in securely without a password using your device's biometric sensors or screen lock.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Account Settings</h3>
          <div className="bg-app-card rounded-[2.5rem] border border-app-border overflow-hidden shadow-sm">
            {[
              { label: 'Personal Information', icon: User, color: 'text-blue-500', path: '/profile' },
              { label: 'Payment Methods', icon: CreditCard, color: 'text-emerald-500', path: '/dashboard?tab=finance' },
              { label: 'Notifications', icon: Bell, color: 'text-amber-500', path: '/notifications' },
              { label: 'Security & Privacy', icon: Shield, color: 'text-purple-500', path: '/profile' },
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
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center bg-app-bg/50", item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-app-text group-hover:translate-x-1 transition-all" />
              </button>
            ))}
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
          onClick={handleSignOut}
          className="w-full p-6 bg-red-500/10 text-red-500 rounded-[2.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      {/* KYC Modal */}
      <AnimatePresence>
        {showKycModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl border border-app-border"
            >
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">ID Front (JPG/PNG)</label>
                        <div className="relative group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setKycData({ ...kycData, idImageFront: URL.createObjectURL(file) });
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-full aspect-[4/3] bg-app-bg border-2 border-dashed border-app-border rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-app-text transition-all overflow-hidden">
                            {kycData.idImageFront ? (
                              <img src={kycData.idImageFront} alt="Front" className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <Camera className="w-6 h-6 text-neutral-400" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Upload Front</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">ID Back (JPG/PNG)</label>
                        <div className="relative group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setKycData({ ...kycData, idImageBack: URL.createObjectURL(file) });
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-full aspect-[4/3] bg-app-bg border-2 border-dashed border-app-border rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-app-text transition-all overflow-hidden">
                            {kycData.idImageBack ? (
                              <img src={kycData.idImageBack} alt="Back" className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <Camera className="w-6 h-6 text-neutral-400" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Upload Back</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                    <div className="grid grid-cols-2 gap-4">
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Business Address</label>
                      <input
                        type="text"
                        placeholder="Full physical address"
                        value={kycData.businessAddress}
                        onChange={(e) => setKycData({ ...kycData, businessAddress: e.target.value })}
                        className="w-full p-4 bg-app-bg border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Business Logo</label>
                        <div className="relative group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setKycData({ ...kycData, businessLogo: URL.createObjectURL(file) });
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-full aspect-square bg-app-bg border-2 border-dashed border-app-border rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-app-text transition-all overflow-hidden">
                            {kycData.businessLogo ? (
                              <img src={kycData.businessLogo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <Building2 className="w-6 h-6 text-neutral-400" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Upload Logo</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Registration Doc</label>
                        <div className="relative group">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setKycData({ ...kycData, businessRegistrationDoc: URL.createObjectURL(file) });
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-full aspect-square bg-app-bg border-2 border-dashed border-app-border rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-app-text transition-all overflow-hidden">
                            {kycData.businessRegistrationDoc ? (
                              <div className="flex flex-col items-center gap-2">
                                <FileText className="w-8 h-8 text-emerald-500" />
                                <span className="text-[8px] font-black text-emerald-500">Document Added</span>
                              </div>
                            ) : (
                              <>
                                <FileText className="w-6 h-6 text-neutral-400" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Upload Doc</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={submitKyc}
                  disabled={submitting}
                  className="w-full py-4 bg-app-text text-app-bg rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit for Verification'}
                </button>
                <button
                  onClick={() => setShowKycModal(false)}
                  className="w-full py-4 bg-app-card text-neutral-400 rounded-2xl font-bold text-sm hover:text-app-text transition-all border border-app-border"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
