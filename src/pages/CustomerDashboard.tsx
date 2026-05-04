import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { handleApiError, OperationType } from '../lib/errors';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Star, Clock, CheckCircle2, AlertCircle, Sparkles, Send, ArrowRight, ShieldCheck, Briefcase, ChevronRight, LayoutDashboard, ClipboardList, MessageSquare, DollarSign, Calendar, Filter, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { getAIConsultantResponse } from '../services/aiService';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'home';
  const [requests, setRequests] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [kycData, setKycData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBecomeProvider, setShowBecomeProvider] = useState(false);
  const [requestFilter, setRequestFilter] = useState({ category: 'All', status: 'All', search: '' });

  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const [reqList, svcList, txList, tkList, cList, kycRow] = await Promise.all([
          api.get<any[]>('/api/requests'),
          api.get<any[]>('/api/services'),
          api.get<any[]>('/api/transactions'),
          api.get<any[]>('/api/tickets'),
          api.get<any[]>('/api/contracts'),
          api.get<any>('/api/kyc/me').catch(() => null),
        ]);
        if (cancelled) return;
        setRequests(
          (reqList || []).map((r) => ({
            ...r,
            providerName: r.provider?.displayName,
            category: r.service?.category,
          })),
        );
        setServices(svcList || []);
        setTransactions(
          (txList || []).map((t) => ({
            ...t,
            timestamp: typeof t.timestamp === 'string' ? t.timestamp : t.timestamp,
          })),
        );
        setTickets(tkList || []);
        setContracts(
          (cList || []).map((c) => ({
            ...c,
            createdAt: c.createdAt,
          })),
        );
        setKycData(kycRow && Object.keys(kycRow).length ? kycRow : null);
        setLoading(false);
      } catch (e) {
        try {
          await handleApiError(e, OperationType.LIST, 'customer-dashboard');
        } catch {
          /* surfaced */
        }
      }
    };

    tick();
    const id = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id]);

  const totalSpent = transactions
    .filter(t => t.type === 'outcome')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const handleBecomeProvider = async () => {
    if (!user?.id) return;

    const personalKyc = kycData?.type === 'personal' ? kycData : null;

    if (!personalKyc || personalKyc.status !== 'verified') {
      showNotification("You must complete Personal Identity Verification (KYC Level 1) before becoming a provider.", "error");
      setTimeout(() => navigate('/account?section=identity'), 2000);
      return;
    }

    try {
      await api.post('/api/users/me/become-provider', {});
      showNotification("Application successful! You are now a Provider. Please complete Business KYC on the Profile page.", "success");
      setTimeout(() => navigate('/account?section=identity'), 1500);
    } catch (error) {
      await handleApiError(error, OperationType.UPDATE, 'users/become-provider');
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'requests') {
      const filteredRequests = requests.filter(r => {
        const matchesCategory = requestFilter.category === 'All' || r.category === requestFilter.category;
        const matchesStatus = requestFilter.status === 'All' || r.status === requestFilter.status;
        const matchesSearch = !requestFilter.search || 
          r.id.toLowerCase().includes(requestFilter.search.toLowerCase()) ||
          r.providerName?.toLowerCase().includes(requestFilter.search.toLowerCase());
        return matchesCategory && matchesStatus && matchesSearch;
      });

      return (
        <div className="space-y-12 pb-20">
          <header className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-app-text">My Requests</h1>
            <p className="text-neutral-500 font-medium">Track your active jobs and service history.</p>
          </header>

          {/* Filters */}
          <div className="bg-app-card p-6 rounded-[2.5rem] border border-app-border shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Category</label>
                <select 
                  value={requestFilter.category}
                  onChange={e => setRequestFilter({...requestFilter, category: e.target.value})}
                  className="w-full p-3 bg-app-input border border-app-border rounded-xl text-sm font-bold text-app-text"
                >
                  <option value="All">All Categories</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Gardening">Gardening</option>
                  <option value="Repairs">Repairs</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Status</label>
                <select 
                  value={requestFilter.status}
                  onChange={e => setRequestFilter({...requestFilter, status: e.target.value})}
                  className="w-full p-3 bg-app-input border border-app-border rounded-xl text-sm font-bold text-app-text"
                >
                  <option value="All">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="started">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Search Provider / ID</label>
                <input 
                  type="text"
                  placeholder="Search..."
                  value={requestFilter.search}
                  onChange={e => setRequestFilter({...requestFilter, search: e.target.value})}
                  className="w-full p-3 bg-app-input border border-app-border rounded-xl text-sm font-bold text-app-text"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
                <div className="p-20 text-center bg-app-card border border-app-border rounded-[3rem] space-y-6">
                  <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10 text-neutral-200 dark:text-neutral-700" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-app-text font-bold text-xl">No matching requests</p>
                    <p className="text-neutral-400 text-sm max-w-xs mx-auto">Try adjusting your filters or find a new service.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/services')}
                    className="px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm"
                  >
                    Explore Services
                  </button>
                </div>
            ) : (
              filteredRequests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 bg-app-card border border-app-border rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl italic",
                      req.status === 'pending' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-500" : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                    )}>
                      {req.status[0].toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-app-text text-lg uppercase tracking-tight">Job #{req.id.slice(0, 8).toUpperCase()}</h4>
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                          req.status === 'pending' ? "bg-amber-100 text-amber-700" :
                          req.status === 'accepted' ? "bg-blue-100 text-blue-700" :
                          req.status === 'started' ? "bg-indigo-100 text-indigo-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 font-medium">Provider: {req.providerName || 'Neighbor'}</p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Requested {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => navigate(`/service/${req.serviceId}`)}
                      className="px-6 py-3 border border-neutral-100 rounded-2xl font-bold text-sm hover:bg-neutral-50 transition-all"
                    >
                      View Service
                    </button>
                    <button className="px-6 py-3 bg-neutral-900 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-neutral-900/10">
                      Track Status
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'finance') {
      return (
        <div className="space-y-12 pb-20">
          <header className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-app-text">Spending</h1>
            <p className="text-neutral-500 font-medium">Manage your payments and transaction history.</p>
          </header>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-neutral-900 dark:bg-white p-8 rounded-[3rem] text-white dark:text-neutral-900 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 dark:text-neutral-400">Total Spent</p>
              <h3 className="text-4xl font-black">${totalSpent.toLocaleString()}</h3>
            </div>
            <div className="bg-app-card p-8 rounded-[3rem] border border-app-border space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Active Subscriptions</p>
              <h3 className="text-4xl font-black text-app-text">0</h3>
            </div>
            <div className="bg-app-card p-8 rounded-[3rem] border border-app-border space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Reward Points</p>
              <h3 className="text-4xl font-black text-app-text">450</h3>
            </div>
          </div>

          <div className="bg-app-card rounded-[3rem] border border-app-border shadow-sm overflow-hidden">
            <div className="p-8 border-b border-app-border flex items-center justify-between">
              <h3 className="font-black uppercase italic tracking-tight text-app-text">Transaction History</h3>
              <button className="text-xs font-black uppercase tracking-widest text-neutral-400">Download PDF</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/50 dark:bg-neutral-800/50">
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Date</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Service</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="p-6 text-sm font-medium text-app-text">{new Date(t.timestamp).toLocaleDateString()}</td>
                      <td className="p-6 text-sm font-bold text-app-text">{t.description}</td>
                      <td className="p-6">
                        <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded text-[8px] font-black uppercase tracking-widest">
                          Completed
                        </span>
                      </td>
                      <td className="p-6 text-sm font-black text-right text-app-text">
                        ${t.amount}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center text-neutral-400 font-bold uppercase tracking-widest text-xs">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'tickets') {
      return (
        <div className="space-y-12 pb-20">
          <header className="flex justify-between items-end">
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tighter uppercase italic text-app-text">Support</h1>
              <p className="text-neutral-500 font-medium">Manage your tickets and disputes.</p>
            </div>
            <button 
              onClick={() => navigate('/tickets')}
              className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm hover:scale-105 transition-all"
            >
              New Ticket
            </button>
          </header>

          <div className="grid gap-4">
            {tickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => navigate(`/tickets?id=${ticket.id}`)}
                className="p-8 bg-app-card border border-app-border rounded-[2.5rem] flex items-center justify-between hover:border-neutral-900 dark:hover:border-white transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    ticket.status === 'open' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-500" : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400"
                  )}>
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg uppercase tracking-tight text-app-text">{ticket.subject}</h4>
                    <p className="text-xs text-neutral-500">Last message {new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    ticket.status === 'open' ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                  )}>
                    {ticket.status}
                  </span>
                  <ChevronRight className="w-5 h-5 text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="p-20 text-center bg-app-card border border-app-border rounded-[3rem]">
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No active tickets.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-12 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-app-text">Terminal</h1>
            <p className="text-neutral-500 font-medium">Welcome back, {user?.displayName?.split(' ')[0]}. Your neighborhood awaits.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowBecomeProvider(true)}
              className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-neutral-900/20"
            >
              <Briefcase className="w-4 h-4" />
              Become a Provider
            </button>
          </div>
        </header>

        {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Active Jobs', value: requests.filter(r => r.status !== 'completed' && r.status !== 'declined').length, icon: Briefcase, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Reward Points', value: '450', icon: Sparkles, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Open Tickets', value: tickets.filter(t => t.status === 'open').length, icon: MessageSquare, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
            ].map((stat) => (
              <div key={stat.label} className="bg-app-card p-6 rounded-[2rem] border border-app-border space-y-2 shadow-sm">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-app-text">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-16">
            
            {/* Featured Services Grid */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight italic uppercase text-app-text">Recommended</h2>
                <button onClick={() => navigate('/services')} className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-app-text">View All</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {services.slice(0, 4).map(service => (
                  <div 
                    key={service.id}
                    onClick={() => navigate(`/service/${service.id}`)}
                    className="group relative aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-[2rem] overflow-hidden cursor-pointer"
                  >
                    <img src={`https://picsum.photos/seed/${service.id}/600/600`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-6 flex flex-col justify-end">
                      <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">{service.category}</p>
                      <h4 className="text-white font-black text-lg leading-tight">{service.title}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Active Requests Preview */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight italic uppercase text-app-text">Active Jobs</h2>
                <button onClick={() => navigate('/dashboard?tab=requests')} className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-app-text">Manage</button>
              </div>
              
              <div className="space-y-4">
                {requests.slice(0, 2).map((req) => (
                  <div key={req.id} className="p-6 bg-app-card border border-app-border rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl flex items-center justify-center font-black italic">
                        {req.status[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-app-text">Job #{req.id.slice(0, 8).toUpperCase()}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{req.status}</p>
                        {req.status === 'accepted' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const contract = contracts.find(c => c.requestId === req.id);
                              if (contract) navigate(`/contract/${contract.id}`);
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline mt-1"
                          >
                            Sign Contract
                          </button>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-200" />
                  </div>
                ))}
                {requests.length === 0 && (
                  <div className="p-12 text-center bg-app-card rounded-[2rem] border border-dashed border-app-border">
                    <p className="text-xs font-bold text-neutral-400">No active jobs found.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-12">
            {/* Quick Stats */}
            <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-10 rounded-[3rem] space-y-8 shadow-2xl shadow-neutral-900/20">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/40 dark:text-neutral-400 uppercase tracking-widest">Neighborhood Points</p>
                <h3 className="text-4xl font-black italic">450 <span className="text-sm font-bold not-italic text-white/60 dark:text-neutral-500">XP</span></h3>
              </div>
              <div className="space-y-4">
                <div className="h-2 bg-white/10 dark:bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-white dark:bg-neutral-900 w-2/3" />
                </div>
                <p className="text-[10px] font-bold text-white/40 dark:text-neutral-400 uppercase tracking-widest">Level 4 Neighbor • 150 XP to Level 5</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-6">Quick Access</h3>
              <div className="space-y-2">
                {[
                  { label: 'Book a service', icon: Plus, path: '/orders/new' },
                  { label: 'AI Consultant', icon: Sparkles, path: '/ai-consultant' },
                  { label: 'Address Book', icon: MapPin, path: '/account?section=account' },
                  { label: 'Support Center', icon: AlertCircle, path: '/account?section=help' },
                ].map((link) => (
                  <button 
                    key={link.label} 
                    onClick={() => navigate(link.path)}
                    className="w-full p-6 bg-app-card border border-app-border rounded-[2rem] flex items-center justify-between group hover:border-neutral-900 dark:hover:border-white transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <link.icon className="w-5 h-5 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                      <span className="font-bold text-sm text-app-text">{link.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'home', label: 'Overview', icon: LayoutDashboard },
    { id: 'requests', label: 'My Requests', icon: ClipboardList },
    { id: 'finance', label: 'Spending', icon: DollarSign },
    { id: 'tickets', label: 'Support', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen space-y-8">
      <div className="bg-app-card border-b border-app-border sticky top-16 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(`/dashboard?tab=${tab.id}`)}
              className={cn(
                "flex items-center gap-2 py-4 border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "border-neutral-900 dark:border-white text-app-text" 
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {renderTabContent()}
      </div>

      {/* Become Provider Modal */}
      <AnimatePresence>
        {showBecomeProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBecomeProvider(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-app-card rounded-[3rem] p-12 space-y-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="space-y-4 text-center">
                <div className="w-20 h-20 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[2rem] flex items-center justify-center mx-auto">
                  <Briefcase className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black tracking-tight italic uppercase text-app-text">Start Earning</h2>
                <p className="text-neutral-500">Transform your skills into a business. Join our network of professional neighbors.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm">Set Your Own Rates</p>
                    <p className="text-xs text-neutral-500">You control how much you earn per hour or project.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm">Flexible Schedule</p>
                    <p className="text-xs text-neutral-500">Work whenever you want, as much as you want.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleBecomeProvider}
                  className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all"
                >
                  Apply Now
                </button>
                <button 
                  onClick={() => setShowBecomeProvider(false)}
                  className="w-full py-4 bg-white text-neutral-400 rounded-2xl font-bold text-sm hover:text-neutral-900 transition-all"
                >
                  Maybe Later
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
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-bold text-sm">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
