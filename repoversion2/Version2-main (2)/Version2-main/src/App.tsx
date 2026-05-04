import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import React, { useEffect, useState, Component, ReactNode } from 'react';
import Home from './pages/Home';
import Auth from './pages/Auth';
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ServiceDetails from './pages/ServiceDetails';
import Services from './pages/Services';
import CompanyDashboard from './pages/CompanyDashboard';
import Profile from './pages/Profile';
import AIConsultant from './pages/AIConsultant';
import Tickets from './pages/Tickets';
import Notifications from './pages/Notifications';
import CustomPage from './pages/CustomPage';
import ContractView from './pages/ContractView';
import PublicCompanyPage from './pages/PublicCompanyPage';
import ProviderCommunity from './pages/ProviderCommunity';
import OrderWizard from './pages/OrderWizard';
import ChatHub from './pages/ChatHub';
import ProviderWorkspace from './pages/ProviderWorkspace';
import Layout from './components/Layout';
import CMSInspector from './components/CMSInspector';
import { AlertCircle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(this.state.error?.message || '{}');
        if (parsed.error) errorMessage = parsed.error;
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 shadow-2xl space-y-6 border border-neutral-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Application Error</h2>
              <p className="text-neutral-500 text-sm">{errorMessage}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const isSimulating = new URLSearchParams(window.location.search).has('role_preview');
  const previewRole = new URLSearchParams(window.location.search).get('role_preview');
  
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState<string | null>(isSimulating && previewRole ? previewRole : null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(() => !isSimulating);
  const [bootError, setBootError] = useState<string | null>(null);
  const [inspectorActive, setInspectorActive] = useState(false);

  useEffect(() => {
    if (!isSimulating) return;
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'TOGGLE_INSPECTOR') {
        setInspectorActive(e.data.active);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isSimulating]);

  useEffect(() => {
    // If we're simulating, we already set the role, just handle the redirect
    if (isSimulating) {
        if (window.location.pathname === '/' || window.location.pathname === '/auth') {
          window.location.href = `/dashboard${window.location.search}`;
        }
        return;
    }

    async function fetchRole() {
      if (!user) {
        setRole(null);
        setCompanyId(null);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (user.email === "amirfarhadian569@gmail.com") {
            if (data.role !== 'owner') {
              await updateDoc(userRef, { role: 'owner', isVerified: true });
              setRole('owner');
            } else {
              setRole('owner');
            }
          } else {
            setRole(data.role);
          }
          setCompanyId(data.companyId || null);
        } else {
          const isOwner = user.email === "amirfarhadian569@gmail.com";
          const initialRole = isOwner ? 'owner' : 'customer';
          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'New Neighbor',
            role: initialRole,
            status: 'active',
            isVerified: isOwner,
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, userData);
          setRole(initialRole);
        }
        setBootError(null);
      } catch (error: any) {
        console.error("Error fetching role:", error);
        let msg = error.message || 'Unknown error';
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) msg = parsed.error;
        } catch {}
        
        // Log to Firestore for Admin diagnosis
        try {
          await addDoc(collection(db, 'audit_logs'), {
            type: 'error',
            action: 'Session Boot Error',
            details: {
              error: msg,
              userId: user.uid,
              email: user.email,
              userAgent: navigator.userAgent
            },
            actorId: user.uid,
            timestamp: serverTimestamp()
          });
        } catch (logErr) {
          console.error("Failed to log boot error:", logErr);
        }

        setBootError(`Failed to initialize session: ${msg}`);
      } finally {
        setRoleLoading(false);
      }
    }
    fetchRole();
  }, [user]);

  if ((loading && !isSimulating) || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 font-sans">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 shadow-2xl shadow-neutral-200/50 border border-neutral-100 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight italic uppercase">Session Error</h2>
            <p className="text-neutral-500 text-sm">{bootError}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-105 transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Layout user={user} role={role} companyId={companyId}>
          <CMSInspector isActive={isSimulating && inspectorActive} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={(user || isSimulating) ? <Navigate to="/dashboard" /> : <Auth />} />
            <Route path="/service/:id" element={<ServiceDetails />} />
            <Route path="/services" element={<Services />} />
            <Route path="/profile" element={(user || isSimulating) ? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/ai-consultant" element={<AIConsultant />} />
            <Route path="/tickets" element={(user || isSimulating) ? <Tickets /> : <Navigate to="/auth" />} />
            <Route path="/notifications" element={(user || isSimulating) ? <Notifications /> : <Navigate to="/auth" />} />
            <Route path="/contract/:id" element={(user || isSimulating) ? <ContractView /> : <Navigate to="/auth" />} />
            <Route path="/community" element={(user || isSimulating) ? <ProviderCommunity /> : <Navigate to="/auth" />} />
            <Route path="/order-wizard" element={(user || isSimulating) ? <OrderWizard /> : <Navigate to="/auth" />} />
            <Route path="/chat/:id" element={(user || isSimulating) ? <ChatHub /> : <Navigate to="/auth" />} />
            <Route path="/c/:id" element={<PublicCompanyPage />} />
            <Route path="/p/:slug" element={<CustomPage />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                (!user && !isSimulating) ? <Navigate to="/auth" /> :
                ['owner', 'platform_admin', 'support', 'finance'].includes(role || '') ? <AdminDashboard /> :
                (role === 'provider' || companyId) ? <ProviderWorkspace /> :
                <CustomerDashboard />
              } 
            />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}
