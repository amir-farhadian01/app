import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { Plus, Briefcase, DollarSign, Users, Star, CheckCircle2, Clock, Sparkles, Loader2, Building2, ArrowRight, Calendar, Shield, Trash2, UserPlus, Mail, Phone, Globe, Instagram, Facebook, Twitter, Linkedin, ClipboardList, LayoutDashboard, AlertCircle, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import CategorySelector from '../components/CategorySelector';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'home';
  const [services, setServices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [requestFilter, setRequestFilter] = useState({ category: 'All', status: 'All', search: '' });
  const [showAddService, setShowAddService] = useState(false);
  const [showSetupCompany, setShowSetupCompany] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newService, setNewService] = useState({ title: '', category: '', price: '', description: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [newTask, setNewTask] = useState({ title: '', date: '', time: '', memberId: '' });
  const [tasks, setTasks] = useState<any[]>([]);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    slogan: '',
    about: '',
    licenseNumber: '',
    experienceDate: '',
    address: '',
    phone: '',
    website: '',
    type: 'solo',
    logoUrl: '',
    coverImageUrl: '',
    socialLinks: { instagram: '', facebook: '', twitter: '', linkedin: '' }
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [svcData, reqData, ctData, txData] = await Promise.all([
        api.get<any[]>('/api/services'),
        api.get<any[]>('/api/requests'),
        api.get<any[]>('/api/contracts'),
        api.get<any[]>('/api/transactions'),
      ]);
      setServices(svcData || []);
      setRequests(reqData || []);
      setContracts(ctData || []);
      setTransactions(txData || []);
    } catch (err) {
      console.error('Failed to fetch provider data:', err);
    }
  };

  const fetchCompany = async () => {
    if (!user) return;
    try {
      const companies = await api.get<any[]>('/api/companies');
      const myCompany = (companies || []).find((c: any) => c.ownerId === user.id);
      if (myCompany) {
        setCompany(myCompany);
        setCompanyForm(prev => ({ ...prev, ...myCompany }));
      } else {
        setCompany(null);
      }
    } catch (err) {
      console.error('Failed to fetch company:', err);
      setCompany(null);
    } finally {
      setCompanyLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCompany();
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const totalEarnings = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const improveWithAI = async () => {
    if (!newService.title || !newService.category) {
      alert("Please enter a title and category first.");
      return;
    }
    setAiLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Write a professional and engaging service description for a neighborly platform.
        Service: ${newService.title}
        Category: ${newService.category}
        Current Description: ${newService.description}
        Make it concise, trustworthy, and highlight the value to a neighbor.`,
      });
      if (response.text) {
        setNewService(prev => ({ ...prev, description: response.text || '' }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSetupCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (company?.id) {
        await api.put(`/api/companies/${company.id}`, companyForm);
      } else {
        await api.post('/api/companies', {
          ...companyForm,
          ownerId: user.id,
        });
        await api.put('/api/users/me', { companyId: 'pending' });
      }
      await fetchCompany();
      setShowSetupCompany(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error setting up company. Please check your permissions.");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !memberEmail) return;
    try {
      await api.post(`/api/companies/${company.id}/members`, { email: memberEmail });
      await fetchCompany();
      setShowAddMember(false);
      setMemberEmail('');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to add member.');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    // Tasks/schedules managed in local state only (no API endpoint)
    const task = { id: Date.now().toString(), ...newTask, status: 'scheduled' };
    setTasks(prev => [...prev, task]);
    setShowAddTask(false);
    setNewTask({ title: '', date: '', time: '', memberId: '' });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!company || memberId === user?.id) return;
    try {
      await api.delete(`/api/companies/${company.id}/members/${memberId}`);
      await fetchCompany();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to remove member.');
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await api.post('/api/services', {
        ...newService,
        price: parseFloat(newService.price),
      });
      setShowAddService(false);
      setNewService({ title: '', category: '', price: '', description: '' });
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to create service.');
    }
  };

  const handleRequestAction = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      await api.put(`/api/requests/${requestId}/status`, { status: action });
      await fetchData();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to update request.');
    }
  };

  const handleUpdateJobStatus = async (requestId: string, newStatus: string) => {
    try {
      await api.put(`/api/requests/${requestId}/status`, { status: newStatus });
      await fetchData();
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleSwitchToCustomer = async () => {
    if (!user) return;
    try {
      await api.put('/api/users/me', { role: 'customer' });
      window.location.reload();
    } catch (error: any) {
      console.error("Error switching to customer:", error);
    }
  };

  const renderTabContent = () => {
    if (companyLoading) {
      return (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      );
    }

    // Personal KYC check using user.isVerified
    if (!user?.isVerified) {
      return (
        <div className="p-20 text-center bg-app-card border border-app-border rounded-[3rem] space-y-8 shadow-sm">
          <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-12 h-12 text-red-600" />
          </div>
          <div className="space-y-4 max-w-md mx-auto">
            <h2 className="text-3xl font-black italic uppercase tracking-tight text-app-text">Identity Verification Required</h2>
            <p className="text-neutral-500 font-medium">You must complete your Personal Identity Verification (KYC Level 1) before you can access the Provider Dashboard.</p>
            <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 text-left space-y-3">
              <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-widest">Current Status: Not Verified</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="px-10 py-4 bg-app-text text-app-bg rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
          >
            Complete Identity KYC
          </button>
        </div>
      );
    }

    if (activeTab === 'company') {
      return (
        <div className="space-y-12 pb-20">
        <header className="flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-app-text">My Company</h1>
            <p className="text-neutral-500 font-medium">Manage your business profile and team.</p>
          </div>
          {company && (
            <button
              onClick={() => setShowSetupCompany(true)}
              className="px-6 py-3 bg-app-text text-app-bg rounded-2xl font-bold text-sm hover:scale-105 transition-all"
            >
              Edit Profile
            </button>
          )}
        </header>

        {!company ? (
          <div className="p-20 text-center bg-app-card border border-app-border rounded-[3rem] space-y-6 shadow-sm">
            <div className="w-20 h-20 bg-app-bg/50 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-10 h-10 text-neutral-400" />
            </div>
            <div className="space-y-2">
              <p className="text-app-text font-bold text-xl">Company profile is empty</p>
              <p className="text-neutral-400 text-sm max-w-xs mx-auto">Set up your business details to start hiring team members and showcase your brand.</p>
            </div>
            <button
              onClick={() => setShowSetupCompany(true)}
              className="px-8 py-3 bg-app-text text-app-bg rounded-2xl font-bold text-sm hover:scale-105 transition-all"
            >
              Setup Company
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Profile Header */}
              <div className="relative h-64 bg-app-card rounded-[3rem] overflow-hidden group border border-app-border">
                {company.coverImageUrl ? (
                  <img src={company.coverImageUrl} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-app-text flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-app-bg/20" />
                  </div>
                )}
                <div className="absolute bottom-8 left-8 flex items-end gap-6">
                  <div className="w-24 h-24 bg-app-card rounded-3xl border-4 border-app-card shadow-xl overflow-hidden">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-app-bg flex items-center justify-center text-neutral-400">
                        <Building2 className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="mb-2">
                    <h2 className="text-3xl font-black text-white drop-shadow-md">{company.name}</h2>
                    <p className="text-white/80 font-bold italic">{company.slogan}</p>
                  </div>
                </div>
              </div>

              {/* About & Details */}
              <div className="bg-app-card p-10 rounded-[3rem] border border-app-border shadow-sm space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-black uppercase italic tracking-tight text-app-text">About Us</h3>
                  <p className="text-neutral-500 leading-relaxed">{company.about || 'No description provided.'}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 pt-8 border-t border-app-border">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Business Info</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-neutral-500">License:</span>
                        <span className="font-bold text-app-text">{company.licenseNumber || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-neutral-500">Experience since:</span>
                        <span className="font-bold text-app-text">{company.experienceDate || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Contact & Web</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-neutral-500 w-16">Phone:</span>
                        <span className="font-bold text-app-text">{company.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-neutral-500 w-16">Site:</span>
                        <a href={company.website} target="_blank" rel="noreferrer" className="font-bold text-app-text hover:underline">{company.website || 'N/A'}</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="bg-app-card p-10 rounded-[3rem] border border-app-border shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase italic tracking-tight text-app-text">Team Members</h3>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-4 py-2 bg-app-bg text-app-text rounded-xl font-bold text-xs hover:bg-app-bg/80 transition-colors border border-app-border"
                  >
                    Add Member
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {company.members?.map((memberId: string) => (
                    <div key={memberId} className="p-4 bg-app-bg/50 rounded-2xl flex items-center justify-between border border-app-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-app-card rounded-xl flex items-center justify-center border border-app-border">
                          <Users className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-app-text">
                            {memberId === user?.id ? 'You (Owner)' : 'Staff Member'}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Active</p>
                        </div>
                      </div>
                      {memberId !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(memberId)}
                          className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Schedule / Calendar Preview */}
              <div className="bg-app-text p-8 rounded-[3rem] text-app-bg space-y-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase italic tracking-tight">Schedule</h3>
                  <Clock className="w-5 h-5 opacity-20" />
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-app-bg/10 rounded-2xl border border-app-bg/10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Today's Tasks</p>
                    <p className="text-sm font-bold">No tasks scheduled for today.</p>
                  </div>
                  <button className="w-full py-4 bg-app-bg text-app-text rounded-2xl font-bold text-sm hover:opacity-90 transition-all">
                    Open Calendar
                  </button>
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6">
                <h3 className="text-lg font-black uppercase italic tracking-tight text-app-text">Social Presence</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(company.socialLinks || {}).map(([platform, link]) => (
                    <a
                      key={platform}
                      href={link as string}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 bg-app-bg/50 border border-app-border rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-app-text hover:bg-app-bg transition-colors"
                    >
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      );
    }

    if (activeTab === 'members') {
      return (
        <div className="space-y-12 pb-20">
          <header className="flex justify-between items-end">
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tighter uppercase italic text-app-text">Team Members</h1>
              <p className="text-neutral-500 font-medium">Manage your staff, roles, and permissions.</p>
            </div>
            <button
              onClick={() => setShowAddMember(true)}
              className="px-6 py-3 bg-app-text text-app-bg rounded-2xl font-bold text-sm hover:scale-105 transition-all flex items-center gap-2 shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {company?.members?.map((memberId: string, idx: number) => (
              <div key={memberId} className="bg-app-card p-8 rounded-[2.5rem] border border-app-border shadow-sm space-y-6 group hover:border-app-text transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 bg-app-bg/50 rounded-2xl flex items-center justify-center border border-app-border">
                    <Users className="w-8 h-8 text-neutral-400 group-hover:text-app-text transition-colors" />
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-neutral-400 hover:text-app-text transition-colors"><Shield className="w-4 h-4" /></button>
                    {memberId !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(memberId)}
                        className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-app-text">
                    {memberId === user?.id ? 'You (Owner)' : `Staff Member ${idx + 1}`}
                  </h3>
                  <p className="text-xs text-neutral-400 font-black uppercase tracking-widest mt-1">
                    {memberId === user?.id ? 'Administrator' : 'Lead Handyman'}
                  </p>
                </div>
                <div className="space-y-2 pt-4 border-t border-app-border">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Mail className="w-3 h-3" />
                    <span>{memberId.includes('@') ? memberId : `staff${idx + 1}@neighborly.io`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Phone className="w-3 h-3" />
                    <span>+1 234 567 890</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setNewTask(prev => ({ ...prev, memberId }));
                    setShowAddTask(true);
                  }}
                  className="w-full py-3 bg-app-bg text-app-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-app-text hover:text-app-bg transition-all border border-app-border"
                >
                  Assign Task
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'schedule') {
      return (
        <div className="space-y-12 pb-20">
          <header className="flex justify-between items-end">
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tighter uppercase italic text-app-text">Schedule</h1>
              <p className="text-neutral-500 font-medium">Coordinate tasks and manage time slots.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 bg-app-card border border-app-border rounded-2xl font-bold text-sm text-app-text">Today</button>
              <button
                onClick={() => setShowAddTask(true)}
                className="px-6 py-3 bg-app-text text-app-bg rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg"
              >
                <Calendar className="w-4 h-4" />
                New Task
              </button>
            </div>
          </header>

          <div className="bg-app-card rounded-[3rem] border border-app-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-app-border">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-neutral-400 border-r border-app-border last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-5 h-[600px]">
              {Array.from({ length: 35 }).map((_, i) => {
                const dayTasks = tasks.filter(t => {
                  const taskDate = new Date(t.date);
                  return taskDate.getDate() === i + 1;
                });
                return (
                  <div key={i} className="p-4 border-r border-b border-app-border last:border-r-0 group hover:bg-app-bg/50 transition-colors relative">
                    <span className="text-xs font-bold text-neutral-400 group-hover:text-app-text transition-colors">{i + 1}</span>
                    {dayTasks.map(task => (
                      <div key={task.id} className="mt-2 p-2 bg-app-text text-app-bg rounded-lg text-[8px] font-bold uppercase tracking-tight truncate">
                        {task.title} @ {task.time}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'new-requests') {
      const filteredRequests = requests.filter(r => {
        const matchesCategory = requestFilter.category === 'All' || r.category === requestFilter.category;
        const matchesStatus = requestFilter.status === 'All' || r.status === requestFilter.status;
        const matchesSearch = !requestFilter.search ||
          r.id.toLowerCase().includes(requestFilter.search.toLowerCase()) ||
          r.customerName?.toLowerCase().includes(requestFilter.search.toLowerCase());
        return matchesCategory && matchesStatus && matchesSearch;
      });

      return (
        <div className="space-y-12 pb-20">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tighter uppercase italic text-app-text">Job Requests</h1>
              <p className="text-neutral-500 font-medium">Manage incoming opportunities and project status.</p>
            </div>
          </header>

          {/* Filters */}
          <div className="bg-app-card p-6 rounded-[2.5rem] border border-app-border shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Category</label>
                <select
                  value={requestFilter.category}
                  onChange={e => setRequestFilter({...requestFilter, category: e.target.value})}
                  className="w-full p-3 bg-app-bg border border-app-border rounded-xl text-sm font-bold text-app-text"
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
                  className="w-full p-3 bg-app-bg border border-app-border rounded-xl text-sm font-bold text-app-text"
                >
                  <option value="All">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="started">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Search ID / Name</label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={requestFilter.search}
                  onChange={e => setRequestFilter({...requestFilter, search: e.target.value})}
                  className="w-full p-3 bg-app-bg border border-app-border rounded-xl text-sm font-bold text-app-text"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="p-20 text-center bg-app-card border border-app-border rounded-[3rem]">
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No matching requests found</p>
              </div>
            ) : (
              filteredRequests.map(req => (
                <div key={req.id} className="p-8 bg-app-card border border-app-border rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-app-text transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center font-black italic text-xl",
                      req.status === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-app-text text-app-bg"
                    )}>
                      {req.status[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-lg uppercase tracking-tight text-app-text">Job #{req.id.slice(0,8).toUpperCase()}</h4>
                        <span className="px-2 py-0.5 bg-app-bg border border-app-border rounded text-[8px] font-black uppercase tracking-widest text-neutral-400">{req.category}</span>
                      </div>
                      <p className="text-xs text-neutral-500 font-medium">Customer: {req.customerName || 'Neighbor'}</p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Received {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleRequestAction(req.id, 'accepted')}
                          className="px-6 py-3 bg-app-text text-app-bg rounded-2xl font-bold text-sm hover:scale-105 transition-all"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.id, 'declined')}
                          className="px-6 py-3 border border-app-border rounded-2xl font-bold text-sm hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all text-app-text"
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <select
                        value={req.status}
                        onChange={(e) => handleUpdateJobStatus(req.id, e.target.value)}
                        className="px-4 py-3 border border-app-text text-app-text rounded-2xl font-bold text-sm bg-app-card focus:outline-none"
                      >
                        <option value="accepted">Accepted</option>
                        <option value="started">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    )}
                  </div>
                </div>
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
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-app-text">Finance</h1>
            <p className="text-neutral-500 font-medium">Track your earnings and business transactions.</p>
          </header>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-emerald-900 p-8 rounded-[3rem] text-white space-y-2 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Revenue</p>
              <h3 className="text-4xl font-black">${totalEarnings.toLocaleString()}</h3>
            </div>
            <div className="bg-app-card p-8 rounded-[3rem] border border-app-border space-y-2 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Pending Payout</p>
              <h3 className="text-4xl font-black text-app-text">$450</h3>
            </div>
            <div className="bg-app-card p-8 rounded-[3rem] border border-app-border space-y-2 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Completed Jobs</p>
              <h3 className="text-4xl font-black text-app-text">{requests.filter(r => r.status === 'completed').length}</h3>
            </div>
          </div>

          <div className="bg-app-card rounded-[3rem] border border-app-border shadow-sm overflow-hidden">
            <div className="p-8 border-b border-app-border flex items-center justify-between">
              <h3 className="font-black uppercase italic tracking-tight text-app-text">Transaction History</h3>
              <button className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-app-text transition-colors">Export CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-app-bg/50">
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Date</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Description</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Type</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-app-bg/50 transition-colors">
                      <td className="p-6 text-sm font-medium text-neutral-400">{new Date(t.timestamp).toLocaleDateString()}</td>
                      <td className="p-6 text-sm font-bold text-app-text">{t.description}</td>
                      <td className="p-6">
                        <span className={cn(
                          "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                          t.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {t.type}
                        </span>
                      </td>
                      <td className={cn(
                        "p-6 text-sm font-black",
                        t.type === 'income' ? "text-emerald-500" : "text-red-500"
                      )}>
                        {t.type === 'income' ? '+' : '-'}${t.amount}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center text-neutral-400 font-bold uppercase tracking-widest text-xs">
                        No transactions recorded yet.
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

    return (
      <div className="space-y-12 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic">Provider Terminal</h1>
            <p className="text-neutral-500 font-medium">Manage your business operations and neighborhood impact.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/community')}
              className="px-6 py-3 bg-white border border-neutral-100 rounded-2xl font-bold text-sm hover:bg-neutral-50 transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Community
            </button>
            <button
              onClick={handleSwitchToCustomer}
              className="px-6 py-3 bg-white border border-neutral-100 rounded-2xl font-bold text-sm hover:bg-neutral-50 transition-all"
            >
              Switch to Customer
            </button>
            <button
              onClick={() => setShowAddService(true)}
              className="px-6 py-3 bg-neutral-900 text-white font-bold rounded-2xl hover:scale-105 transition-all flex items-center gap-2 shadow-xl shadow-neutral-900/20"
            >
              <Plus className="w-5 h-5" />
              Add New Service
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[
            { label: 'Total Earnings', value: `$${totalEarnings.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Active Jobs', value: requests.filter(r => r.status === 'accepted' || r.status === 'started').length, icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
            { label: 'Total Clients', value: [...new Set(requests.map(r => r.customerId))].length, icon: Users, color: 'text-purple-600 bg-purple-50' },
            { label: 'Rating', value: company?.rating || '5.0', icon: Star, color: 'text-amber-600 bg-amber-50' },
            { label: 'Debt / Credit', value: `$${user?.currentDebt || 0} / $500`, icon: AlertCircle, color: (user?.currentDebt || 0) > 400 ? 'text-red-600 bg-red-50' : 'text-neutral-600 bg-neutral-50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-neutral-100 space-y-2 shadow-sm">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-2xl font-bold">{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Incoming Requests Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2 italic uppercase">
                <Clock className="w-5 h-5 text-neutral-400" />
                Recent Requests
              </h2>
              <button onClick={() => navigate('/dashboard?tab=new-requests')} className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900">View All</button>
            </div>
            <div className="space-y-4">
              {requests.slice(0, 3).map((req) => (
                <div key={req.id} className="p-6 bg-white border border-neutral-100 rounded-3xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center font-bold text-neutral-400">
                      {req.status[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold">Request from Customer</h4>
                      <p className="text-xs text-neutral-500">Status: {req.status}</p>
                      {req.status === 'accepted' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const contract = contracts.find(c => c.requestId === req.id);
                            if (contract) navigate(`/contract/${contract.id}`);
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline mt-1"
                        >
                          View Contract
                        </button>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-200" />
                </div>
              ))}
              {requests.length === 0 && (
                <div className="p-12 text-center bg-white border border-dashed border-neutral-200 rounded-[2rem]">
                  <p className="text-neutral-400 text-sm">No requests yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* My Services Preview */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2 italic uppercase">
                <CheckCircle2 className="w-5 h-5 text-neutral-400" />
                My Services
              </h2>
              <button onClick={() => setShowAddService(true)} className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900">Add New</button>
            </div>
            <div className="space-y-4">
              {services.slice(0, 3).map((service) => (
                <div key={service.id} className="p-6 bg-white border border-neutral-100 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{service.category}</span>
                      <h4 className="font-bold">{service.title}</h4>
                    </div>
                    <span className="font-bold text-neutral-900">${service.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'home', label: 'Overview', icon: LayoutDashboard },
    { id: 'new-requests', label: 'Requests', icon: ClipboardList },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'members', label: 'Members', icon: Users },
  ];

  return (
    <div className="min-h-screen space-y-8">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-neutral-100 sticky top-16 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(`/dashboard?tab=${tab.id}`)}
              className={cn(
                "flex items-center gap-2 py-4 border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "border-neutral-900 text-neutral-900"
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

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-app-card w-full max-w-lg rounded-[2.5rem] p-8 space-y-8 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Add New Service</h3>
              <button onClick={() => setShowAddService(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-app-text">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Service Title</label>
                <input
                  required
                  value={newService.title}
                  onChange={e => setNewService({...newService, title: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                  placeholder="e.g. Professional House Cleaning"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Select Category (Up to 5 levels)</label>
                <CategorySelector
                  onSelect={(cat) => setNewService({...newService, category: cat.name})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Price /hr</label>
                  <input
                    required
                    type="number"
                    value={newService.price}
                    onChange={e => setNewService({...newService, price: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                    placeholder="25"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Description</label>
                  <button
                    type="button"
                    onClick={improveWithAI}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-900 bg-neutral-100 px-2 py-1 rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-50"
                  >
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Improve with AI
                  </button>
                </div>
                <textarea
                  required
                  value={newService.description}
                  onChange={e => setNewService({...newService, description: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all min-h-[100px] text-app-text"
                  placeholder="Tell customers about your service..."
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-neutral-900 text-white font-bold rounded-2xl hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-900/20"
              >
                Create Service
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Setup Company Modal */}
      {showSetupCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-app-card w-full max-w-2xl rounded-[3rem] p-10 my-8 space-y-8 shadow-2xl relative"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black italic uppercase tracking-tight">Setup Business</h3>
                <p className="text-neutral-500 text-sm">Define your brand and operational details.</p>
              </div>
              <button onClick={() => setShowSetupCompany(false)} className="p-3 hover:bg-neutral-100 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSetupCompany} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Logo (JPG/PNG)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setCompanyForm({ ...companyForm, logoUrl: URL.createObjectURL(file) });
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full aspect-square bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl flex flex-col items-center justify-center gap-2 group-hover:border-neutral-900 transition-all overflow-hidden">
                      {companyForm.logoUrl ? (
                        <img src={companyForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Building2 className="w-8 h-8 text-neutral-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Upload Logo</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Cover Image (JPG/PNG)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setCompanyForm({ ...companyForm, coverImageUrl: URL.createObjectURL(file) });
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full aspect-video bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl flex flex-col items-center justify-center gap-2 group-hover:border-neutral-900 transition-all overflow-hidden">
                      {companyForm.coverImageUrl ? (
                        <img src={companyForm.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Sparkles className="w-8 h-8 text-neutral-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Upload Cover</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Company Name</label>
                  <input
                    required
                    value={companyForm.name}
                    onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                    placeholder="e.g. Neighborly Cleaners"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Slogan</label>
                  <input
                    value={companyForm.slogan}
                    onChange={e => setCompanyForm({...companyForm, slogan: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                    placeholder="e.g. Quality you can trust"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">About Us</label>
                <textarea
                  value={companyForm.about}
                  onChange={e => setCompanyForm({...companyForm, about: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all min-h-[100px] text-app-text"
                  placeholder="Tell your story..."
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">License #</label>
                  <input
                    value={companyForm.licenseNumber}
                    onChange={e => setCompanyForm({...companyForm, licenseNumber: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                    placeholder="Cert-12345"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Experience Date</label>
                  <input
                    type="date"
                    value={companyForm.experienceDate}
                    onChange={e => setCompanyForm({...companyForm, experienceDate: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Business Type</label>
                  <select
                    value={companyForm.type}
                    onChange={e => setCompanyForm({...companyForm, type: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                  >
                    <option value="solo">Solo Provider</option>
                    <option value="business">Registered Business</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Phone</label>
                  <input
                    value={companyForm.phone}
                    onChange={e => setCompanyForm({...companyForm, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Website</label>
                  <input
                    value={companyForm.website}
                    onChange={e => setCompanyForm({...companyForm, website: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Address</label>
                <input
                  value={companyForm.address}
                  onChange={e => setCompanyForm({...companyForm, address: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                  placeholder="123 Neighbor St, City"
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 ml-2">Social Media</h4>
                <div className="grid grid-cols-2 gap-4">
                  {['instagram', 'facebook', 'twitter', 'linkedin'].map(platform => (
                    <input
                      key={platform}
                      value={(companyForm.socialLinks as any)[platform]}
                      onChange={e => setCompanyForm({
                        ...companyForm,
                        socialLinks: { ...companyForm.socialLinks, [platform]: e.target.value }
                      })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                      placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-5 bg-neutral-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-900/20"
              >
                {company ? 'Update Profile' : 'Create Company'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-app-card w-full max-w-md rounded-[2.5rem] p-8 space-y-8 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold italic uppercase tracking-tight">Add Team Member</h3>
              <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-app-text">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Member Email</label>
                <input
                  required
                  type="email"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                  placeholder="staff@example.com"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-neutral-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-800 transition-all">
                Send Invitation
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-app-card w-full max-w-md rounded-[2.5rem] p-8 space-y-8 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold italic uppercase tracking-tight">New Task</h3>
              <button onClick={() => setShowAddTask(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-app-text">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Task Title</label>
                <input
                  required
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                  placeholder="e.g. Garden Maintenance"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Date</label>
                  <input
                    required
                    type="date"
                    value={newTask.date}
                    onChange={e => setNewTask({...newTask, date: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Time</label>
                  <input
                    required
                    type="time"
                    value={newTask.time}
                    onChange={e => setNewTask({...newTask, time: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Assign To</label>
                <select
                  value={newTask.memberId}
                  onChange={e => setNewTask({...newTask, memberId: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
                >
                  <option value="">Select Member...</option>
                  {company?.members?.map((m: string) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-4 bg-neutral-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-800 transition-all">
                Create Task
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
