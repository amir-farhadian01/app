import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState, Component, ReactNode } from 'react';
import Auth from './pages/Auth';
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ServiceDetails from './pages/ServiceDetails';
import Services from './pages/Services';
import CustomerHome from './pages/CustomerHome';
import CompanyDashboard from './pages/CompanyDashboard';
import Profile from './pages/Profile';
import ClientAccount from './pages/ClientAccount';
import AIConsultant from './pages/AIConsultant';
import Tickets from './pages/Tickets';
import Notifications from './pages/Notifications';
import CustomPage from './pages/CustomPage';
import ContractView from './pages/ContractView';
import PublicCompanyPage from './pages/PublicCompanyPage';
import ProviderCommunity from './pages/ProviderCommunity';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderWizard from './components/orders/OrderWizard';
import Layout from './components/Layout';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { useAuth } from './lib/AuthContext';
import { api } from './lib/api';
import { SoftToastProvider } from './lib/SoftToastContext';
import { OrderLifecycleNotificationBridge } from './components/OrderLifecycleNotificationBridge';
import { WorkspaceProvider } from './lib/WorkspaceContext';
import { isAdminPanelPort, isStaffPlatformRole, getAdminPanelOrigin } from './lib/adminPort';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
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

/** Staff opened `/dashboard` on the main customer port — send them to the admin host. */
function StaffDashboardPortRedirect() {
  useEffect(() => {
    window.location.replace(`${getAdminPanelOrigin()}/dashboard`);
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    async function syncRole() {
      if (!user) {
        setRole(null);
        setCompanyId(null);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);
      try {
        const me = await api.me();
        setRole(me.role);
        setCompanyId(me.companyId || null);
        setBootError(null);
      } catch (error: any) {
        console.error('Error syncing session:', error);
        let msg = error.message || 'Unknown error';
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) msg = parsed.error;
        } catch {
          /* ignore */
        }
        setBootError(`Failed to initialize session: ${msg}`);
      } finally {
        setRoleLoading(false);
      }
    }
    syncRole();
  }, [user]);

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
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
        <SoftToastProvider>
          <OrderLifecycleNotificationBridge />
          <WorkspaceProvider>
            <Layout role={role} companyId={companyId}>
              <Routes>
            <Route path="/" element={<CustomerHome />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
            <Route path="/service/:id" element={<ServiceDetails />} />
            <Route path="/services" element={<Services />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/account" element={user ? <ClientAccount /> : <Navigate to="/auth" />} />
            <Route path="/ai-consultant" element={<AIConsultant />} />
            <Route path="/orders/new" element={<OrderWizard />} />
            <Route
              path="/orders/:id/confirmation"
              element={user ? <OrderConfirmationPage /> : <Navigate to="/auth" />}
            />
            <Route path="/orders/:id" element={user ? <OrderDetail /> : <Navigate to="/auth" />} />
            <Route path="/orders" element={user ? <MyOrders /> : <Navigate to="/auth" />} />
            <Route path="/tickets" element={user ? <Tickets /> : <Navigate to="/auth" />} />
            <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/auth" />} />
            <Route path="/contract/:id" element={user ? <ContractView /> : <Navigate to="/auth" />} />
            <Route path="/community" element={user ? <ProviderCommunity /> : <Navigate to="/auth" />} />
            <Route path="/c/:id" element={<PublicCompanyPage />} />
            <Route path="/p/:slug" element={<CustomPage />} />

            <Route
              path="/dashboard"
              element={
                !user ? (
                  <Navigate to="/auth" />
                ) : isStaffPlatformRole(role) ? (
                  isAdminPanelPort() ? (
                    <AdminDashboard />
                  ) : (
                    <StaffDashboardPortRedirect />
                  )
                ) : companyId ? (
                  <CompanyDashboard />
                ) : role === 'provider' ? (
                  <ProviderDashboard />
                ) : (
                  <CustomerDashboard />
                )
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </WorkspaceProvider>
        </SoftToastProvider>
      </Router>
    </ErrorBoundary>
  );
}
