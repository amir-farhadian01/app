import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Users, Briefcase, AlertCircle, Settings, BarChart3, Trash2,
  CheckCircle, DollarSign, Activity, Lock, Key, List, FileText,
  CreditCard, UserPlus, Globe, Layout, Cpu, Plus, Save, ExternalLink,
  Search, Filter, ChevronRight, X, Mail, Phone, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';

type AdminTab =
  | 'overview'
  | 'users'
  | 'kyc'
  | 'categories'
  | 'finance'
  | 'teams'
  | 'content'
  | 'monitoring'
  | 'integrations'
  | 'legal'
  | 'settings';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [legalPolicies, setLegalPolicies] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showKycReviewModal, setShowKycReviewModal] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [kycSearch, setKycSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');

  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  const showSuccess = (message: string) => {
    setNotification({ show: true, message, type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchAll = async () => {
    try {
      const [usersData, kycData, catsData, svcData, reqData, auditData, configData, legalData, pagesData] = await Promise.all([
        api.get<any[]>('/api/admin/users'),
        api.get<any[]>('/api/admin/kyc'),
        api.get<any[]>('/api/categories'),
        api.get<any[]>('/api/services'),
        api.get<any[]>('/api/requests'),
        api.get<any[]>('/api/admin/audit-logs'),
        api.get<any>('/api/admin/config'),
        api.get<any[]>('/api/admin/legal-policies'),
        api.get<any[]>('/api/admin/pages'),
      ]);
      setUsers(usersData || []);
      setKycSubmissions(kycData || []);
      setCategories(catsData || []);
      setServices(svcData || []);
      setRequests(reqData || []);
      setAuditLogs(auditData || []);
      setSystemConfig(configData || null);
      setLegalPolicies(legalData || []);
      setPages(pagesData || []);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateConfig = async (newData: any) => {
    try {
      await api.put('/api/admin/config', { ...systemConfig, ...newData });
      setSystemConfig((prev: any) => ({ ...prev, ...newData }));
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/api/admin/users/${selectedUser.id}`, {
        role: formData.role,
        status: formData.status
      });
      showSuccess(`User ${selectedUser.email} updated.`);
      setShowUserModal(false);
      setSelectedUser(null);
      await fetchAll();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleKycAction = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await api.put(`/api/admin/kyc/${id}`, { status });
      showSuccess(`KYC ${status === 'verified' ? 'approved' : 'rejected'} successfully.`);
      setShowKycReviewModal(false);
      setSelectedKyc(null);
      await fetchAll();
    } catch (error) {
      console.error('Failed to update KYC:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!formData.name) return;
    try {
      await api.post('/api/categories', formData);
      setShowAddModal(false);
      setFormData({});
      await fetchAll();
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleSavePage = async () => {
    if (!formData.title || !formData.slug) return;
    try {
      const pageData = { ...formData, lastEdit: new Date().toISOString() };
      if (selectedPage) {
        await api.put(`/api/admin/pages/${selectedPage.id}`, pageData);
      } else {
        await api.post('/api/admin/pages', pageData);
      }
      setShowPageModal(false);
      setSelectedPage(null);
      setFormData({});
      await fetchAll();
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      await api.delete(`/api/admin/pages/${id}`);
      await fetchAll();
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'kyc', label: 'KYC', icon: ShieldCheck },
    { id: 'categories', label: 'Categories', icon: List },
    { id: 'finance', label: 'Finance & Tax', icon: DollarSign },
    { id: 'teams', label: 'Teams', icon: UserPlus },
    { id: 'content', label: 'Pages & Content', icon: Layout },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'legal', label: 'Legal & Terms', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-20 min-h-screen bg-app-bg">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 space-y-2">
        <div className="p-6 mb-4">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none flex items-center gap-3 text-app-text">
            <Shield className="w-8 h-8" />
            Control
          </h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-2">Platform Admin Panel</p>
        </div>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all",
                activeTab === tab.id
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl shadow-neutral-900/20 dark:shadow-none"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-white dark:text-neutral-900" : "text-neutral-400")} />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Overview Section */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'KYC Pending', value: kycSubmissions.filter(k => k.status === 'pending').length, icon: ShieldAlert, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Active Services', value: services.length, icon: Briefcase, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Total Revenue', value: '$12,450', icon: DollarSign, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border space-y-2 shadow-sm">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.color)}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{stat.label}</p>
                      <h3 className="text-3xl font-bold text-app-text">{stat.value}</h3>
                    </div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-app-text">Recent Activity</h3>
                    <div className="space-y-4">
                      {auditLogs.slice(0, 10).map((log) => (
                        <div key={log.id} className="flex items-center justify-between py-3 border-b border-app-border last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                              <Activity className="w-4 h-4 text-neutral-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-app-text">{log.action}</p>
                              <p className="text-[10px] text-neutral-400 uppercase tracking-widest">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{String(log.actorId || '').slice(0, 5)}</span>
                        </div>
                      ))}
                      {auditLogs.length === 0 && (
                        <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs text-center py-8">No activity logs.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-app-text">System Health</h3>
                    <div className="space-y-6">
                      {[
                        { label: 'API Response', value: '98ms', status: 'Healthy' },
                        { label: 'Database Load', value: '12%', status: 'Healthy' },
                        { label: 'Storage Usage', value: '4.2 GB', status: 'Healthy' },
                        { label: 'Active Sessions', value: '142', status: 'Normal' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">{item.label}</p>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-black text-app-text">{item.value}</span>
                            <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-md">{item.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Management Section */}
            {activeTab === 'users' && (
              <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-app-border flex items-center justify-between">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">User Directory</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text"
                      />
                    </div>
                    <button className="p-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700">
                      <Filter className="w-4 h-4 text-neutral-400" />
                    </button>
                  </div>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/50">
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">User</th>
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Role</th>
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl flex items-center justify-center font-black italic">
                              {u.displayName?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-app-text">{u.displayName}</p>
                              <p className="text-xs text-neutral-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            u.role === 'owner' ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" :
                            u.role === 'provider' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                            "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          )}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full", u.status === 'active' ? "bg-emerald-500" : "bg-neutral-300")} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{u.status}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setFormData({ role: u.role, status: u.status });
                                setShowUserModal(true);
                              }}
                              className="p-2 text-neutral-400 hover:text-neutral-900"
                              title="Edit User"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            {u.role === 'provider' && (
                              <button
                                onClick={() => {
                                  setShowConfirmModal({
                                    show: true,
                                    title: 'Reset User Role',
                                    message: `Are you sure you want to reset ${u.email} to Customer? This will reject their KYC and remove provider access.`,
                                    type: 'warning',
                                    onConfirm: async () => {
                                      try {
                                        await api.put(`/api/admin/users/${u.id}`, {
                                          role: 'customer',
                                          isVerified: false
                                        });
                                        showSuccess(`${u.email} reset to Customer.`);
                                        setShowConfirmModal(prev => ({ ...prev, show: false }));
                                        await fetchAll();
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                  });
                                }}
                                className="p-2 text-neutral-400 hover:text-amber-600"
                                title="Reset to Customer"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowConfirmModal({
                                  show: true,
                                  title: 'Delete User',
                                  message: `PERMANENTLY DELETE ${u.email}? This action cannot be undone and will remove all associated data.`,
                                  type: 'danger',
                                  onConfirm: async () => {
                                    try {
                                      await api.delete(`/api/admin/users/${u.id}`);
                                      showSuccess(`User ${u.email} deleted.`);
                                      setShowConfirmModal(prev => ({ ...prev, show: false }));
                                      await fetchAll();
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }
                                });
                              }}
                              className="p-2 text-neutral-400 hover:text-red-600"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* KYC Section */}
            {activeTab === 'kyc' && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { label: 'Pending Verification', count: kycSubmissions.filter(k => k.status === 'pending').length, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
                    { label: 'Verified Users', count: kycSubmissions.filter(k => k.status === 'verified').length, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
                    { label: 'Rejected', count: kycSubmissions.filter(k => k.status === 'rejected').length, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-app-card p-6 rounded-3xl border border-app-border shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{stat.label}</p>
                      <h4 className={cn("text-3xl font-black mt-1", stat.color.split(' ')[2])}>{stat.count}</h4>
                    </div>
                  ))}
                </div>

                <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-app-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-app-text">KYC Submissions</h3>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="text"
                          placeholder="Search name, email, phone..."
                          value={kycSearch}
                          onChange={(e) => setKycSearch(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 text-app-text w-64"
                        />
                      </div>
                      <select
                        value={kycFilter}
                        onChange={(e) => setKycFilter(e.target.value)}
                        className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl text-sm font-bold text-app-text focus:outline-none"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 dark:bg-neutral-800/50">
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">User Details</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Type</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Submitted</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {kycSubmissions
                        .filter(k => {
                          const matchesSearch = !kycSearch ||
                            k.userName?.toLowerCase().includes(kycSearch.toLowerCase()) ||
                            k.userEmail?.toLowerCase().includes(kycSearch.toLowerCase()) ||
                            k.userPhone?.toLowerCase().includes(kycSearch.toLowerCase()) ||
                            k.userId?.toLowerCase().includes(kycSearch.toLowerCase());
                          const matchesFilter = kycFilter === 'all' || k.status === kycFilter;
                          return matchesSearch && matchesFilter;
                        })
                        .map((kyc) => (
                        <tr key={kyc.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="px-8 py-6">
                            <div className="space-y-0.5">
                              <p className="font-bold text-app-text">{kyc.userName || 'Anonymous'}</p>
                              <p className="text-[10px] text-neutral-500 font-medium">{kyc.userEmail}</p>
                              <p className="text-[10px] text-neutral-400">{kyc.userPhone || 'No phone'}</p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-app-text rounded-md">{kyc.type}</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                              kyc.status === 'verified' ? "bg-emerald-100 text-emerald-700" :
                              kyc.status === 'pending' ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            )}>
                              {kyc.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-xs text-neutral-500">{new Date(kyc.createdAt).toLocaleDateString()}</td>
                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => {
                                setSelectedKyc(kyc);
                                setShowKycReviewModal(true);
                              }}
                              className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Categories Section */}
            {activeTab === 'categories' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Service Taxonomy</h3>
                  <button
                    onClick={() => { setShowAddModal(true); setFormData({ type: 'category' }); }}
                    className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Category
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map(cat => (
                    <div key={cat.id} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm space-y-4 group">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-2xl">
                          {cat.icon || '📁'}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-neutral-400 hover:text-app-text"><Settings className="w-4 h-4" /></button>
                          <button className="p-2 text-neutral-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-black text-lg uppercase tracking-tight text-app-text">{cat.name}</h4>
                        <p className="text-xs text-neutral-500">{cat.description || 'No description provided.'}</p>
                      </div>
                      <div className="pt-4 border-t border-app-border">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Subcategories</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {categories.filter(s => s.parentId === cat.id).map(sub => (
                            <span key={sub.id} className="px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-lg text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                              {sub.name}
                            </span>
                          ))}
                          <button className="px-2 py-1 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg text-[10px] font-bold text-neutral-400 hover:border-neutral-900 dark:hover:border-white hover:text-neutral-900 dark:hover:text-white">
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finance & Tax Section */}
            {activeTab === 'finance' && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-app-text">Payment Methods</h3>
                    <div className="space-y-4">
                      {['Credit Card', 'PayPal', 'Apple Pay', 'Google Pay', 'Bank Transfer'].map(method => (
                        <div key={method} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-neutral-400" />
                            <span className="font-bold text-sm text-app-text">{method}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Active</span>
                            <div className="w-10 h-5 bg-neutral-900 dark:bg-white rounded-full relative">
                              <div className="absolute right-1 top-1 w-3 h-3 bg-white dark:bg-neutral-900 rounded-full" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-app-text">Tax & Commission</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Platform Tax Rate (%)</label>
                        <div className="flex gap-4">
                          <input
                            type="number"
                            defaultValue={systemConfig?.taxRate || 15}
                            className="flex-1 p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl font-black text-xl text-app-text"
                          />
                          <button
                            onClick={() => handleUpdateConfig({ taxRate: 15 })}
                            className="px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Provider Commission (%)</label>
                        <div className="flex gap-4">
                          <input
                            type="number"
                            defaultValue={10}
                            className="flex-1 p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl font-black text-xl text-app-text"
                          />
                          <button className="px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm">Update</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Teams Section */}
            {activeTab === 'teams' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Internal Teams</h3>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setFormData({ role: 'support' });
                      setShowUserModal(true);
                    }}
                    className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign Member
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { name: 'Support Team', role: 'support', icon: Mail },
                    { name: 'Financial Team', role: 'finance', icon: DollarSign },
                    { name: 'Operations Team', role: 'operations', icon: Globe },
                    { name: 'Platform Admins', role: 'platform_admin', icon: Shield },
                  ].map(team => (
                    <div key={team.name} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm space-y-4">
                      <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center">
                        <team.icon className="w-6 h-6 text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-lg uppercase tracking-tight text-app-text">{team.name}</h4>
                        <p className="text-xs text-neutral-500">{users.filter(u => u.role === team.role).length} Active Members</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-app-border">
                    <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text">Staff Directory</h4>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 dark:bg-neutral-800/50">
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Member</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Team</th>
                        <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {users.filter(u => ['support', 'finance', 'operations', 'platform_admin'].includes(u.role)).map((u) => (
                        <tr key={u.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl flex items-center justify-center font-black italic">
                                {u.displayName?.[0] || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-app-text">{u.displayName}</p>
                                <p className="text-xs text-neutral-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setFormData({ role: u.role, status: u.status });
                                setShowUserModal(true);
                              }}
                              className="p-2 text-neutral-400 hover:text-app-text"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Monitoring Section */}
            {activeTab === 'monitoring' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">System Monitoring</h3>
                    <p className="text-neutral-500 text-sm">Real-time audit logs and error tracking.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-app-border flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-app-text">Live Stream</span>
                    </div>
                  </div>
                </div>

                <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-app-border bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400">Recent Activity</h4>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{auditLogs.length} Logs Loaded</span>
                  </div>
                  <div className="divide-y divide-app-border max-h-[600px] overflow-y-auto custom-scrollbar">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-6 hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              log.type === 'error' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                            )}>
                              {log.type === 'error' ? <ShieldAlert className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className={cn(
                                "font-bold text-sm",
                                log.type === 'error' ? "text-red-600" : "text-app-text"
                              )}>
                                {log.action}
                              </p>
                              <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded">
                            ID: {String(log.id).slice(0, 8)}
                          </span>
                        </div>

                        {log.details && (
                          <div className="ml-11 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-app-border">
                            <pre className="text-[10px] font-mono text-neutral-500 whitespace-pre-wrap break-all">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div className="ml-11 flex items-center gap-4 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Actor: {log.actorId}
                          </span>
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <div className="p-20 text-center">
                        <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No logs found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Section */}
            {activeTab === 'integrations' && (
              <div className="bg-app-card p-12 rounded-[3rem] border border-app-border shadow-sm space-y-12">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black italic uppercase tracking-tight text-app-text">API & Integrations</h3>
                  <p className="text-neutral-500 text-sm">Securely manage third-party API keys and system secrets.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {[
                    { name: 'Google Maps API', key: 'AIzaSy...4x9', type: 'Google Key' },
                    { name: 'JWT Secret', key: '••••••••••••••••', type: 'Auth Secret' },
                    { name: 'Stripe Secret', key: 'sk_live_...982', type: 'Payment API' },
                    { name: 'Twilio SID', key: 'AC...821', type: 'SMS API' },
                  ].map(integration => (
                    <div key={integration.name} className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{integration.type}</span>
                        <button className="text-[10px] font-black uppercase tracking-widest text-blue-600">Reveal</button>
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight text-app-text">{integration.name}</h4>
                        <p className="font-mono text-xs text-neutral-400 mt-1 truncate">{integration.key}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-app-card border border-app-border rounded-xl text-[10px] font-black uppercase tracking-widest text-app-text">Edit</button>
                        <button className="flex-1 py-2 bg-app-card border border-app-border rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600">Disable</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-app-border">
                  <button className="px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Integration
                  </button>
                </div>
              </div>
            )}

            {/* Legal & Terms Section */}
            {activeTab === 'legal' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Legal Policies</h3>
                  <button className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Policy
                  </button>
                </div>

                <div className="space-y-4">
                  {legalPolicies.map(policy => (
                    <div key={policy.id} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-neutral-400" />
                        </div>
                        <div>
                          <h4 className="font-black text-lg uppercase tracking-tight text-app-text">{policy.title}</h4>
                          <p className="text-xs text-neutral-500">Version {policy.version} • Last updated {new Date(policy.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-6 py-3 bg-neutral-50 dark:bg-neutral-800 text-app-text rounded-2xl font-bold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all">Edit Content</button>
                        <button className="p-3 text-neutral-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ))}
                  {legalPolicies.length === 0 && (
                    <div className="p-20 text-center bg-app-card border border-app-border rounded-[3rem]">
                      <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No policies created yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content & Pages Section */}
            {activeTab === 'content' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight">Page Manager</h3>
                  <button
                    onClick={() => {
                      setSelectedPage(null);
                      setFormData({ status: 'draft', content: '' });
                      setShowPageModal(true);
                    }}
                    className="px-6 py-3 bg-neutral-900 text-white rounded-2xl font-bold text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Page
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {pages.map(page => (
                    <div key={page.id} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm space-y-6 group">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-black text-xl uppercase tracking-tight">{page.title}</h4>
                          <p className="text-xs text-neutral-400 font-mono">{page.slug}</p>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                          page.status === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {page.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-4 border-t border-app-border">
                        <button
                          onClick={() => {
                            setSelectedPage(page);
                            setFormData(page);
                            setShowPageModal(true);
                          }}
                          className="flex-1 py-3 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                          Edit Content
                        </button>
                        <button
                          onClick={() => handleDeletePage(page.id)}
                          className="p-3 text-neutral-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {pages.length === 0 && (
                    <div className="col-span-full p-20 text-center bg-app-card border border-app-border rounded-[3rem]">
                      <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No pages created yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings Section */}
            {activeTab === 'settings' && (
              <div className="bg-app-card p-12 rounded-[3rem] border border-app-border shadow-sm space-y-12">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black italic uppercase tracking-tight text-app-text">Platform Settings</h3>
                  <p className="text-neutral-500 text-sm">Configure global platform behavior and appearance.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">Appearance</h4>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">App Background Color</label>
                        <div className="flex gap-4">
                          <input
                            type="color"
                            value={systemConfig?.theme?.backgroundColor || '#f9fafb'}
                            onChange={e => handleUpdateConfig({ theme: { ...systemConfig?.theme, backgroundColor: e.target.value } })}
                            className="w-16 h-16 p-1 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl cursor-pointer"
                          />
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              value={systemConfig?.theme?.backgroundColor || '#f9fafb'}
                              onChange={e => handleUpdateConfig({ theme: { ...systemConfig?.theme, backgroundColor: e.target.value } })}
                              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl font-mono text-sm text-app-text"
                              placeholder="#f9fafb"
                            />
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest ml-2">Hex code for global background</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Platform Name</label>
                        <input
                          type="text"
                          defaultValue={systemConfig?.appName || 'Neighborly'}
                          onBlur={e => handleUpdateConfig({ appName: e.target.value })}
                          className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl font-bold text-app-text"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">System Controls</h4>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-800 rounded-[2rem]">
                        <div>
                          <p className="font-bold text-sm text-app-text">Maintenance Mode</p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Disable all user access</p>
                        </div>
                        <button
                          onClick={() => handleUpdateConfig({ maintenanceMode: !systemConfig?.maintenanceMode })}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            systemConfig?.maintenanceMode ? "bg-red-500" : "bg-neutral-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            systemConfig?.maintenanceMode ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-6 bg-neutral-50 dark:bg-neutral-800 rounded-[2rem]">
                        <div>
                          <p className="font-bold text-sm text-app-text">New Registrations</p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Allow new users to join</p>
                        </div>
                        <button
                          onClick={() => handleUpdateConfig({ allowRegistration: !systemConfig?.allowRegistration })}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            systemConfig?.allowRegistration !== false ? "bg-emerald-500" : "bg-neutral-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            systemConfig?.allowRegistration !== false ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* User Edit Modal */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">
                  {selectedUser ? 'Edit User' : 'Assign Staff Member'}
                </h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-app-text transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {!selectedUser ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search user by email..."
                        className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-app-text"
                        onChange={(e) => {
                          const found = users.find(u => u.email?.toLowerCase().includes(e.target.value.toLowerCase()));
                          if (found) setSelectedUser(found);
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest text-center">Search for a user to assign them a staff role</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-app-border">
                    <div className="w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl flex items-center justify-center font-black italic">
                      {selectedUser.displayName?.[0] || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-app-text">{selectedUser.displayName}</p>
                      <p className="text-xs text-neutral-400">{selectedUser.email}</p>
                    </div>
                    {!formData.id && (
                      <button onClick={() => setSelectedUser(null)} className="text-[10px] font-black uppercase text-neutral-400 hover:text-neutral-900 dark:hover:text-white">Change</button>
                    )}
                  </div>
                )}

                {selectedUser && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Role</label>
                      <select
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-app-text"
                      >
                        <option value="customer">Customer</option>
                        <option value="provider">Provider</option>
                        <option value="platform_admin">Platform Admin</option>
                        <option value="support">Support</option>
                        <option value="finance">Finance</option>
                        <option value="operations">Operations</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                        className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-app-text"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending_verification">Pending Verification</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleUpdateUser}
                disabled={!selectedUser}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {selectedUser?.id ? 'Save Changes' : 'Assign Role'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KYC Review Modal */}
      <AnimatePresence>
        {showKycReviewModal && selectedKyc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar border border-app-border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Review KYC</h3>
                  <p className="text-xs text-neutral-400 uppercase tracking-widest font-black">
                    {selectedKyc.type === 'business' ? 'Business Verification' : 'Personal Verification'}
                  </p>
                </div>
                <button onClick={() => setShowKycReviewModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-app-text transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">Submitted Details</h4>

                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-app-border space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">User Contact</p>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-app-text">{selectedKyc.userName || 'N/A'}</p>
                      <p className="text-xs text-neutral-500">{selectedKyc.userEmail}</p>
                      <p className="text-xs text-neutral-400">{selectedKyc.userPhone || 'No phone'}</p>
                    </div>
                  </div>

                  {selectedKyc.type === 'personal' ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ID Type</p>
                        <p className="font-bold capitalize text-app-text">{selectedKyc.details?.idType?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ID Number</p>
                        <p className="font-bold text-app-text">{selectedKyc.details?.idNumber}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Business Name</p>
                        <p className="font-bold text-app-text">{selectedKyc.details?.businessName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Owner Name</p>
                        <p className="font-bold text-app-text">{selectedKyc.details?.ownerName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Registration Number</p>
                        <p className="font-bold text-app-text">{selectedKyc.details?.registrationNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">License Number</p>
                        <p className="font-bold text-app-text">{selectedKyc.details?.businessLicense}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Address</p>
                        <p className="font-bold text-app-text">{selectedKyc.details?.businessAddress}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-app-text border-b border-app-border pb-2">Documents</h4>

                  {selectedKyc.type === 'personal' ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ID Front</p>
                        {selectedKyc.details?.idImageFront || selectedKyc.details?.idImage ? (
                          <img
                            src={selectedKyc.details.idImageFront || selectedKyc.details.idImage}
                            alt="ID Front"
                            className="w-full h-48 object-cover rounded-2xl border border-app-border"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-48 bg-app-bg rounded-2xl flex items-center justify-center border border-dashed border-app-border">
                            <p className="text-xs text-neutral-400">No image provided</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ID Back</p>
                        {selectedKyc.details?.idImageBack ? (
                          <img
                            src={selectedKyc.details.idImageBack}
                            alt="ID Back"
                            className="w-full h-48 object-cover rounded-2xl border border-app-border"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-48 bg-app-bg rounded-2xl flex items-center justify-center border border-dashed border-app-border">
                            <p className="text-xs text-neutral-400">No image provided</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Business Logo</p>
                        {selectedKyc.details?.businessLogo ? (
                          <img
                            src={selectedKyc.details.businessLogo}
                            alt="Logo"
                            className="w-full h-32 object-contain rounded-2xl border border-app-border bg-white"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-32 bg-app-bg rounded-2xl flex items-center justify-center border border-dashed border-app-border">
                            <p className="text-xs text-neutral-400">No logo provided</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Registration Document</p>
                        {selectedKyc.details?.businessRegistrationDoc || selectedKyc.details?.certificates ? (
                          <a
                            href={selectedKyc.details.businessRegistrationDoc || selectedKyc.details.certificates}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-app-bg rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-app-border"
                          >
                            <FileText className="w-5 h-5 text-neutral-400" />
                            <span className="text-xs font-bold text-blue-600 truncate">View Document</span>
                          </a>
                        ) : (
                          <div className="w-full h-24 bg-app-bg rounded-2xl flex items-center justify-center border border-dashed border-app-border">
                            <p className="text-xs text-neutral-400">No document provided</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-8 border-t border-neutral-100">
                <button
                  onClick={() => handleKycAction(selectedKyc.id, 'rejected')}
                  className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-100 transition-all"
                >
                  Reject Submission
                </button>
                <button
                  onClick={() => handleKycAction(selectedKyc.id, 'verified')}
                  className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Approve & Verify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Page Editor Modal */}
      <AnimatePresence>
        {showPageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar border border-app-border"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">
                  {selectedPage ? 'Edit Page' : 'Create New Page'}
                </h3>
                <button onClick={() => setShowPageModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-app-text transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Page Title</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-app-text"
                      placeholder="e.g. About Us"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">URL Slug</label>
                    <input
                      type="text"
                      value={formData.slug || ''}
                      onChange={e => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-app-text"
                      placeholder="e.g. /about"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-app-text"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Page Content (Markdown/HTML)</label>
                  <textarea
                    value={formData.content || ''}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white h-64 resize-none font-mono text-sm text-app-text"
                    placeholder="Enter page content..."
                  />
                </div>
              </div>

              <button
                onClick={handleSavePage}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {selectedPage ? 'Update Page' : 'Create Page'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal (Generic for categories, etc.) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Add New {formData.type}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-app-text">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-app-text"
                    placeholder="Enter name..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white h-32 resize-none text-app-text"
                    placeholder="Enter description..."
                  />
                </div>
                {formData.type === 'category' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Icon (Emoji)</label>
                    <input
                      type="text"
                      value={formData.icon || ''}
                      onChange={e => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-app-text"
                      placeholder="e.g. 🛠️"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleAddCategory}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save {formData.type}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-app-card rounded-[3rem] p-10 space-y-8 shadow-2xl border border-app-border"
            >
              <div className="text-center space-y-4">
                <div className={cn(
                  "w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto",
                  showConfirmModal.type === 'danger' ? "bg-red-50 text-red-500" :
                  showConfirmModal.type === 'warning' ? "bg-amber-50 text-amber-500" :
                  "bg-blue-50 text-blue-500"
                )}>
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">{showConfirmModal.title}</h3>
                <p className="text-neutral-500 text-sm">{showConfirmModal.message}</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={showConfirmModal.onConfirm}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold text-sm transition-all",
                    showConfirmModal.type === 'danger' ? "bg-red-600 text-white hover:bg-red-700" :
                    showConfirmModal.type === 'warning' ? "bg-amber-500 text-white hover:bg-amber-600" :
                    "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  )}
                >
                  Confirm Action
                </button>
                <button
                  onClick={() => setShowConfirmModal(prev => ({ ...prev, show: false }))}
                  className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-bold rounded-2xl text-sm hover:text-neutral-900 dark:hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[300]"
          >
            <div className={cn(
              "px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border",
              notification.type === 'success' ? "bg-emerald-500 border-emerald-400 text-white" : "bg-red-500 border-red-400 text-white"
            )}>
              {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              <span className="font-bold text-sm">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
