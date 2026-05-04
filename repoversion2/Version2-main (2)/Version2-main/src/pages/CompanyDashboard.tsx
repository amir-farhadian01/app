import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, updateDoc, arrayUnion, serverTimestamp, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Users, Briefcase, DollarSign, Plus, Settings, ChevronRight, CheckCircle2, Calendar, TrendingUp, TrendingDown, CreditCard, Handshake, Shield, UserPlus, Clock, LayoutDashboard, BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';
import BusinessIntelligence from '../components/BusinessIntelligence';

type Tab = 'overview' | 'staff' | 'finance' | 'schedule' | 'b2b' | 'insights';

export default function CompanyDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'company') setActiveTab('overview');
    else if (tab === 'members' || tab === 'staff') setActiveTab('staff');
    else if (tab && ['finance', 'schedule', 'b2b', 'insights'].includes(tab)) setActiveTab(tab as Tab);
  }, []);
  const [company, setCompany] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [b2bConnections, setB2BConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'staff', staffRole: 'handyman' });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const isSimulatedRole = new URLSearchParams(window.location.search).has('role_preview');

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!auth.currentUser && !isSimulatedRole) {
      setLoading(false);
      return;
    }

    const fetchCompany = async () => {
      try {
        const userId = auth.currentUser?.uid || 'preview-user-id';
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        let cId = userDoc.exists() ? userDoc.data().companyId : null;
        
        // Mock company for simulation if none found
        if (!cId && isSimulatedRole) cId = 'preview-company-id';

        if (cId) {
          const cDoc = await getDoc(doc(db, 'companies', cId));
          if (cDoc.exists() || isSimulatedRole) {
            const data = cDoc.exists() ? cDoc.data() : { name: 'Neighborly Simulation Corp', status: 'verified' };
            setCompany({ id: cId, ...data });
            
            // Listen to members
            const mQuery = query(collection(db, 'users'), where('companyId', '==', cId));
            const unsubMembers = onSnapshot(mQuery, (snapshot) => {
              setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            });

            // Listen to jobs
            const jQuery = query(collection(db, 'contracts'), where('providerId', '==', userId), where('status', 'in', ['confirmed', 'started']));
            const unsubJobs = onSnapshot(jQuery, (snapshot) => {
              setActiveJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            });

            // Listen to all contracts for BI
            const cQuery = query(collection(db, 'contracts'), where('companyId', '==', cId));
            const unsubContracts = onSnapshot(cQuery, (snapshot) => {
              setContracts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            });

            // Listen to transactions
            const tQuery = query(collection(db, 'transactions'), where('companyId', '==', cId));
            const unsubTransactions = onSnapshot(tQuery, (snapshot) => {
              setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            });

            // Listen to schedules
            const sQuery = query(collection(db, 'schedules'), where('companyId', '==', cId));
            const unsubSchedules = onSnapshot(sQuery, (snapshot) => {
              setSchedules(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            });

            // Listen to B2B
            const bQuery = query(collection(db, 'b2b_connections'), where('providerAId', '==', userId));
            const unsubB2B = onSnapshot(bQuery, (snapshot) => {
              setB2BConnections(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            });

            setLoading(false);
            return () => {
              unsubMembers();
              unsubJobs();
              unsubContracts();
              unsubTransactions();
              unsubSchedules();
              unsubB2B();
            };
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'company_data');
      }
      setLoading(false);
    };

    fetchCompany();
  }, []);

  const handleRegisterCompany = async () => {
    if (!newCompanyName.trim() || !auth.currentUser) return;
    setRegistering(true);
    try {
      const companyData = {
        name: newCompanyName,
        ownerId: auth.currentUser.uid,
        type: 'business',
        kycStatus: 'pending',
        credit: 1000,
        createdAt: new Date().toISOString(),
        members: [auth.currentUser.uid]
      };

      const companyRef = await addDoc(collection(db, 'companies'), companyData);
      
      // Update user with companyId
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        companyId: companyRef.id,
        role: 'provider'
      });

      // Seed some test data for the new company
      await addDoc(collection(db, 'transactions'), {
        companyId: companyRef.id,
        type: 'income',
        amount: 500,
        category: 'Service',
        description: 'Initial Project Payment',
        timestamp: new Date().toISOString()
      });

      await addDoc(collection(db, 'schedules'), {
        companyId: companyRef.id,
        staffId: auth.currentUser.uid,
        taskId: 'task_test_1',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        status: 'scheduled'
      });

      window.location.reload(); // Refresh to load the new company state
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'companies');
    } finally {
      setRegistering(false);
    }
  };

  const handleInviteStaff = async () => {
    if (!inviteData.email) return;
    try {
      // In a real app, this would send an email. Here we'll just mock it by finding a user or creating a placeholder.
      // For demo, we'll just show a success message.
      showNotification(`Invitation sent to ${inviteData.email} as ${inviteData.staffRole}`);
      setShowInviteModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invitation');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-app-border border-t-app-text rounded-full animate-spin" />
    </div>
  );

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-app-card border border-app-border rounded-3xl flex items-center justify-center mx-auto">
          <Building2 className="w-10 h-10 text-neutral-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-app-text">Create your Company</h2>
          <p className="text-neutral-500">Manage your team, departments, and B2B partnerships.</p>
        </div>
        <div className="max-w-sm mx-auto space-y-4">
          <input 
            type="text" 
            placeholder="Enter Company Name"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
          />
          <button 
            onClick={handleRegisterCompany}
            disabled={registering || !newCompanyName}
            className="w-full px-8 py-4 bg-app-text text-app-bg rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {registering ? 'Registering...' : 'Register Business'}
          </button>
        </div>
      </div>
    );
  }

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const outcome = transactions.filter(t => t.type === 'outcome').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-app-text text-app-bg rounded-2xl flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight italic uppercase text-app-text">{company.name}</h1>
            <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-widest">
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md">
                {company.kycStatus}
              </span>
              <span>•</span>
              <span>{members.length} Members</span>
              <span>•</span>
              <span className="text-app-text">Credit: ${company.credit || 0}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="flex-1 md:flex-none px-6 py-3 bg-app-text text-app-bg rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1 bg-app-card border border-app-border rounded-2xl">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'insights', label: 'AI Mentor & BI', icon: BrainCircuit },
          { id: 'staff', label: 'Staff & Roles', icon: Users },
          { id: 'finance', label: 'Finance', icon: DollarSign },
          { id: 'schedule', label: 'Schedule', icon: Calendar },
          { id: 'b2b', label: 'B2B Network', icon: Handshake },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-app-bg text-app-text shadow-sm border border-app-border" : "text-neutral-500 hover:text-app-text"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'insights' && (
            <BusinessIntelligence 
              company={company}
              members={members}
              transactions={transactions}
              contracts={contracts}
              schedules={schedules}
            />
          )}

          {activeTab === 'overview' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Revenue', value: `$${income}`, icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10' },
                  { label: 'Expenses', value: `$${outcome}`, icon: TrendingDown, color: 'text-red-500 bg-red-500/10' },
                  { label: 'Team', value: members.length, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
                  { label: 'B2B Partners', value: b2bConnections.length, icon: Handshake, color: 'text-purple-500 bg-purple-500/10' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-app-card p-6 rounded-[2rem] border border-app-border space-y-3 shadow-sm">
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

              <div className="grid lg:grid-cols-2 gap-10">
                <section className="space-y-6">
                  <h3 className="text-xl font-black italic uppercase tracking-tight px-2 text-app-text">Recent Activity</h3>
                  <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden shadow-sm divide-y divide-app-border">
                    {transactions.slice(0, 5).map(t => (
                      <div key={t.id} className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", t.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                            {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-app-text">{t.description}</p>
                            <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">{t.category}</p>
                          </div>
                        </div>
                        <span className={cn("font-black text-sm", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>
                          {t.type === 'income' ? '+' : '-'}${t.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-xl font-black italic uppercase tracking-tight px-2 text-app-text">Today's Schedule</h3>
                  <div className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden shadow-sm divide-y divide-app-border">
                    {schedules.length === 0 ? (
                      <div className="p-12 text-center text-neutral-400 font-bold text-sm uppercase tracking-widest">No tasks scheduled</div>
                    ) : (
                      schedules.map(s => (
                        <div key={s.id} className="p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-app-bg/50 rounded-xl flex items-center justify-center text-neutral-400">
                              <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-app-text">Task #{s.taskId?.slice(0, 6)}</p>
                              <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">
                                {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-app-bg border border-app-border rounded-full text-[8px] font-black uppercase tracking-widest text-app-text">
                            {s.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Staff Management</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-app-card border border-app-border rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    {members.length} Total
                  </span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map(member => (
                  <div key={member.id} className="bg-app-card p-6 rounded-[2.5rem] border border-app-border shadow-sm space-y-6 group hover:border-app-text transition-all">
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 bg-app-text text-app-bg rounded-2xl flex items-center justify-center font-black italic text-xl">
                        {member.displayName?.[0] || member.email?.[0] || '?'}
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 bg-app-bg border border-app-border text-neutral-400 rounded-lg text-[8px] font-black uppercase tracking-widest">
                          {member.staffRole || 'No Role'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-app-text">{member.displayName}</h4>
                      <p className="text-xs text-neutral-400 font-medium">{member.email}</p>
                    </div>
                    <div className="pt-4 border-t border-app-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-neutral-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Permissions Active</span>
                      </div>
                      <button className="p-2 text-neutral-300 hover:text-app-text transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-app-text text-app-bg p-8 rounded-[2.5rem] space-y-4 shadow-2xl shadow-app-text/20">
                  <div className="w-12 h-12 bg-app-bg/10 rounded-2xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Available Credit</p>
                    <p className="text-4xl font-black italic">${company.credit || 0}</p>
                  </div>
                  <button className="w-full py-3 bg-app-bg text-app-text rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all">
                    Top Up Credit
                  </button>
                </div>
                
                <div className="bg-app-card p-8 rounded-[2.5rem] border border-app-border space-y-4 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Income</p>
                    <p className="text-4xl font-black italic text-emerald-500">${income}</p>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">+12% from last month</p>
                </div>

                <div className="bg-app-card p-8 rounded-[2.5rem] border border-app-border space-y-4 shadow-sm">
                  <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Outcome</p>
                    <p className="text-4xl font-black italic text-red-500">${outcome}</p>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">-5% from last month</p>
                </div>
              </div>

              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Transaction History</h3>
                  <button className="px-4 py-2 bg-app-card border border-app-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-app-bg transition-all text-app-text">Export PDF</button>
                </div>
                <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-app-bg/50">
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Date</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Description</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Category</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-app-bg/50 transition-all">
                          <td className="px-8 py-6 text-xs font-bold text-neutral-400">{new Date(t.timestamp).toLocaleDateString()}</td>
                          <td className="px-8 py-6 text-sm font-bold text-app-text">{t.description}</td>
                          <td className="px-8 py-6">
                            <span className="px-2 py-1 bg-app-bg border border-app-border rounded-lg text-[8px] font-black uppercase tracking-widest text-neutral-400">
                              {t.category}
                            </span>
                          </td>
                          <td className={cn("px-8 py-6 text-sm font-black text-right", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>
                            {t.type === 'income' ? '+' : '-'}${t.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Staff Schedules</h3>
                <button className="px-6 py-3 bg-app-text text-app-bg rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all">
                  Assign Task
                </button>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-app-card border border-app-border rounded-[3rem] p-8 shadow-sm">
                  {/* Calendar View Placeholder */}
                  <div className="grid grid-cols-7 gap-4 mb-8">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-neutral-400">{day}</div>
                    ))}
                    {Array.from({ length: 31 }).map((_, i) => (
                      <div key={i} className={cn(
                        "aspect-square rounded-2xl border border-app-border flex items-center justify-center text-sm font-bold transition-all hover:border-app-text cursor-pointer",
                        i + 1 === new Date().getDate() ? "bg-app-text text-app-bg shadow-lg shadow-app-text/20" : "bg-app-bg/50 text-neutral-400"
                      )}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 ml-2">Upcoming Tasks</h4>
                  <div className="space-y-4">
                    {schedules.map(s => (
                      <div key={s.id} className="bg-app-card p-6 rounded-[2rem] border border-app-border shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-neutral-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                              {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-app-bg border border-app-border rounded text-[8px] font-black uppercase tracking-widest text-app-text">
                            {s.status}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-app-text">Service Task #{s.taskId?.slice(0, 8)}</p>
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Assigned: {members.find(m => m.id === s.staffId)?.displayName || 'Unknown'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'b2b' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">B2B Connections</h3>
                <button className="px-6 py-3 bg-app-text text-app-bg rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all">
                  Find Partners
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {b2bConnections.length === 0 ? (
                  <div className="md:col-span-2 p-20 text-center bg-app-card border border-app-border rounded-[3rem] space-y-6">
                    <div className="w-20 h-20 bg-app-bg/50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                      <Handshake className="w-10 h-10 text-neutral-200" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text">Expand your Network</h4>
                      <p className="text-neutral-400 text-sm max-w-xs mx-auto">Connect with other providers to offer special prices and sub-contracting opportunities.</p>
                    </div>
                  </div>
                ) : (
                  b2bConnections.map(conn => (
                    <div key={conn.id} className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-app-text text-app-bg rounded-2xl flex items-center justify-center">
                            <Building2 className="w-8 h-8" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-app-text">Partner Provider</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                              {conn.type === 'contractor' ? 'Main Contractor' : 'Sub-Contractor'}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest">
                          {conn.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-app-bg/50 p-4 rounded-2xl border border-app-border">
                          <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Special Price</p>
                          <p className="text-xl font-black text-app-text">${conn.specialPrice}</p>
                        </div>
                        <div className="bg-app-bg/50 p-4 rounded-2xl border border-app-border">
                          <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Active Jobs</p>
                          <p className="text-xl font-black text-app-text">3</p>
                        </div>
                      </div>
                      <button className="w-full py-4 bg-app-bg text-app-text border border-app-border rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-app-text hover:text-app-bg transition-all">
                        Manage Partnership
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-app-card border border-app-border rounded-[3rem] p-10 space-y-8 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-app-text text-app-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Add Staff Member</h2>
                <p className="text-neutral-500 text-sm">Invite a new member to your company team.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="staff@example.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all text-app-text"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Department / Role</label>
                  <select 
                    value={inviteData.staffRole}
                    onChange={(e) => setInviteData({ ...inviteData, staffRole: e.target.value })}
                    className="w-full p-4 bg-app-input border border-app-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-text transition-all font-bold text-sm text-app-text"
                  >
                    <option value="handyman">Handyman (Technical)</option>
                    <option value="finance">Finance Department</option>
                    <option value="adv">ADV Department (Marketing)</option>
                    <option value="career">Career Department</option>
                    <option value="task_manager">Task Manager</option>
                    <option value="internal_manager">Internal Manager</option>
                    <option value="hr">Human Resources (HR)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleInviteStaff}
                  className="w-full py-4 bg-app-text text-app-bg rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all"
                >
                  Send Invitation
                </button>
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-4 bg-app-card text-neutral-400 rounded-2xl font-bold text-sm hover:text-app-text transition-all border border-app-border"
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
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          <p className="font-bold">{notification.message}</p>
        </motion.div>
      )}
    </div>
  );
}
