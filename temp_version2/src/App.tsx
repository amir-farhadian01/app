import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { Component, ReactNode } from 'react';
import { useAuth } from './lib/AuthContext';
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
import Layout from './components/Layout';
import { AlertCircle, RefreshCcw } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary:', error, info);
  }
  render() {
    const s = (this as any).state;
    if (s.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 shadow-2xl space-y-6 border border-neutral-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Application Error</h2>
              <p className="text-neutral-500 text-sm">{s.error?.message}</p>
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
    return (this as any).props.children;
  }
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  const role = user?.role || null;
  const companyId = user?.companyId || null;

  return (
    <ErrorBoundary>
      <Router>
        <Layout user={user} role={role} companyId={companyId}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth />} />
            <Route path="/service/:id" element={<ServiceDetails />} />
            <Route path="/services" element={<Services />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/ai-consultant" element={user ? <AIConsultant /> : <Navigate to="/auth" />} />
            <Route path="/tickets" element={user ? <Tickets /> : <Navigate to="/auth" />} />
            <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/auth" />} />
            <Route path="/contract/:id" element={user ? <ContractView /> : <Navigate to="/auth" />} />
            <Route path="/community" element={user ? <ProviderCommunity /> : <Navigate to="/auth" />} />
            <Route path="/c/:id" element={<PublicCompanyPage />} />
            <Route path="/p/:slug" element={<CustomPage />} />

            <Route
              path="/dashboard"
              element={
                !user ? <Navigate to="/auth" /> :
                ['owner', 'platform_admin', 'support', 'finance'].includes(role || '') ? <AdminDashboard /> :
                companyId ? <CompanyDashboard /> :
                role === 'provider' ? <ProviderDashboard /> :
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
