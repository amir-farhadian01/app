import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { format } from 'date-fns';
import { 
  collection, query, where, onSnapshot, doc, getDoc, 
  setDoc, updateDoc, serverTimestamp, addDoc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Briefcase, DollarSign, Users, Star, 
  CheckCircle2, Clock, Sparkles, Loader2, Building2, 
  ArrowRight, Calendar as CalendarIcon, Shield, ShieldCheck, Trash2, UserPlus, 
  Mail, Phone, Globe, Instagram, Facebook, Twitter, 
  Linkedin, ClipboardList, LayoutDashboard, AlertCircle, 
  MessageSquare, Zap, Image as ImageIcon, Search, 
  Menu, X, ChevronDown, ChevronRight, Bell, HeartHandshake,
  MessageSquareQuote, ThumbsUp, ThumbsDown, MessageCircle, 
  TrendingUp, TrendingDown, FileText, Zap as ZapIcon,
  ShoppingBag, Share2, Youtube, Layout, Target, Map,
  Boxes, BarChart3, Receipt, Wallet, CreditCard, Users2,
  Settings, HelpCircle, Activity, Info, Filter, LogOut, Home, Heart, BrainCircuit, ShieldAlert,
  CalendarPlus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Standard components we'll reuse or adapt
import ProviderCRM from './ProviderCRM';

const getGeminiKey = () => (import.meta as any).env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || '';
const ai = new GoogleGenerativeAI(getGeminiKey());

type MainTab = 'ai' | 'explorer' | 'home' | 'company';

export default function ProviderWorkspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>('dashboard');
  const [activePage, setActivePage] = useState<string>('overview');
  const [activeSubTab, setActiveSubTab] = useState<string>('default');

  const [company, setCompany] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [personalKyc, setPersonalKyc] = useState<any>(null);
  const [businessKyc, setBusinessKyc] = useState<any>(null);
  const [companyMembers, setCompanyMembers] = useState<any[]>([]);
  const [providerServices, setProviderServices] = useState<any[]>([]);
  const [legalPolicies, setLegalPolicies] = useState<any[]>([]);
  const [b2bConnections, setB2bConnections] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [externalEvents, setExternalEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation support
  const isSimulated = searchParams.has('role_preview');
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [lockoutDuration, setLockoutDuration] = useState(7); // Default 7 days

  const handleCancelOrder = async (id: string) => {
    try {
      // Find if it's a request or contract and update
      await updateDoc(doc(db, 'requests', id), { status: 'cancelled', updatedAt: serverTimestamp() }).catch(() => {});
      await updateDoc(doc(db, 'contracts', id), { status: 'cancelled', updatedAt: serverTimestamp() }).catch(() => {});
      setShowCancelModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'cancellation');
    }
  };

  useEffect(() => {
    const userId = auth.currentUser?.uid || (isSimulated ? 'preview-user-id' : null);
    if (!userId) {
      if (!isSimulated) setLoading(false);
      return;
    }

    const userUnsub = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) setUserData(doc.data());
    });

    const cQ = query(collection(db, 'companies'), where('ownerId', '==', userId));
    const cUnsub = onSnapshot(cQ, (snapshot) => {
      if (!snapshot.empty) setCompany({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      else setCompany(null);
    });

    const rQ = query(collection(db, 'requests'), where('providerId', '==', userId));
    const rUnsub = onSnapshot(rQ, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const ctQ = query(collection(db, 'contracts'), where('providerId', '==', userId));
    const ctUnsub = onSnapshot(ctQ, (snapshot) => {
      setContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const pkQ = query(collection(db, 'kyc'), where('userId', '==', userId), where('type', '==', 'personal'));
    const pkUnsub = onSnapshot(pkQ, (snapshot) => {
      if (!snapshot.empty) setPersonalKyc(snapshot.docs[0].data());
    });

    const bkQ = query(collection(db, 'kyc'), where('userId', '==', userId), where('type', '==', 'business'));
    const bkUnsub = onSnapshot(bkQ, (snapshot) => {
      if (!snapshot.empty) setBusinessKyc(snapshot.docs[0].data());
    });

    const nQ = query(collection(db, 'notifications'), where('userId', '==', userId));
    const nUnsub = onSnapshot(nQ, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const tktQ = query(collection(db, 'tickets'), where('recipientId', '==', userId));
    const tktUnsub = onSnapshot(tktQ, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const postUnsub = onSnapshot(collection(db, 'posts'), (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);
    return () => {
      userUnsub();
      cUnsub();
      rUnsub();
      ctUnsub();
      pkUnsub();
      bkUnsub();
      nUnsub();
      tktUnsub();
      postUnsub();
    };
  }, [isSimulated]);

  useEffect(() => {
    if (!company?.id) return;
    const tQ = query(collection(db, 'transactions'), where('companyId', '==', company.id));
    const tUnsub = onSnapshot(tQ, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const sQ = query(collection(db, 'schedules'), where('companyId', '==', company.id));
    const sUnsub = onSnapshot(sQ, (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const mQ = query(collection(db, 'users'), where('companyId', '==', company.id));
    const mUnsub = onSnapshot(mQ, (snapshot) => {
      setCompanyMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const psQ = query(collection(db, 'provider_services'), where('providerId', '==', company.ownerId));
    const psUnsub = onSnapshot(psQ, (snapshot) => {
      setProviderServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const lpQ = query(collection(db, 'legal_policies'), where('companyId', '==', company.id));
    const lpUnsub = onSnapshot(lpQ, (snapshot) => {
      setLegalPolicies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const b2bQ = query(collection(db, 'b2b_connections'), where('providerAId', '==', company.id));
    const b2bUnsub = onSnapshot(b2bQ, (snapshot) => {
      setB2bConnections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const aQ = query(collection(db, 'appointments'), where('companyId', '==', company.id));
    const aUnsub = onSnapshot(aQ, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch external events if synced
    if (company.googleCalendarSynced) {
      fetch(`/api/calendar/events?companyId=${company.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setExternalEvents(data);
        })
        .catch(err => console.error("Error fetching external events:", err));
    }

    return () => {
      tUnsub();
      sUnsub();
      mUnsub();
      psUnsub();
      lpUnsub();
      b2bUnsub();
      aUnsub();
    };
  }, [company?.id]);

  const updateCompany = async (updates: any) => {
    if (!company?.id) return;
    try {
      await updateDoc(doc(db, 'companies', company.id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'companies');
    }
  };

  const addProviderService = async (serviceData: any) => {
    try {
      await addDoc(collection(db, 'provider_services'), {
        ...serviceData,
        providerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'provider_services');
    }
  };

  const updateProviderService = async (serviceId: string, updates: any) => {
    try {
      await updateDoc(doc(db, 'provider_services', serviceId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'provider_services');
    }
  };

  const deleteProviderService = async (serviceId: string) => {
    try {
      // In a real app we might soft delete or just delete the doc
      // For now, let's just use updateDoc to mark as inactive if we had a status, 
      // but the user wants to see and edit, so let's stick to standard ops.
      // deleteDoc(doc(db, 'provider_services', serviceId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'provider_services');
    }
  };

  const saveLegalPolicy = async (title: string, content: string) => {
    if (!company?.id) return;
    try {
      const existingPolicy = legalPolicies.find(p => p.title === title);
      if (existingPolicy) {
        await updateDoc(doc(db, 'legal_policies', existingPolicy.id), {
          content,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'legal_policies'), {
          title,
          content,
          companyId: company.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'legal_policies');
    }
  };

  const connectGoogleCalendar = async () => {
    if (!company?.id) return;
    try {
      const response = await fetch(`/api/auth/google/url?companyId=${company.id}`);
      const { url } = await response.json();
      const authWindow = window.open(url, 'google_auth_popup', 'width=600,height=700');
      if (!authWindow) {
        alert('Please allow popups for Google Calendar sync.');
      }
    } catch (error) {
      console.error("Connect Google Error:", error);
    }
  };

  useEffect(() => {
    const handleOauthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        // Trigger a re-fetch or state update if needed
      }
    };
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, []);

  const addAppointment = async (appointmentData: any) => {
    if (!company?.id) return;
    try {
      await addDoc(collection(db, 'appointments'), {
        ...appointmentData,
        companyId: company.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const handleRequestAction = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      await updateDoc(doc(db, 'requests', requestId), {
        status: action,
        updatedAt: serverTimestamp()
      });

      if (action === 'accepted') {
        const req = requests.find(r => r.id === requestId);
        if (req) {
          await addDoc(collection(db, 'contracts'), {
            requestId,
            customerId: req.customerId,
            providerId: auth.currentUser?.uid,
            status: 'pending',
            amount: req.price || 0,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'requests');
    }
  };

  // Drawer Groups Config
  const menuGroups = [
    {
      id: 'dashboard',
      label: 'DASHBOARD',
      icon: LayoutDashboard,
      defaultPage: 'orders',
    },
    {
      id: 'activity',
      label: 'ACTIVITY',
      icon: Activity,
      defaultPage: 'active_jobs',
    },
    {
      id: 'service_management',
      label: 'SERVICE MANAGEMENT',
      icon: Briefcase,
      defaultPage: 'services',
    },
    {
      id: 'finance',
      label: 'FINANCE',
      icon: DollarSign,
      defaultPage: 'wallet',
    },
    {
      id: 'network',
      label: 'NETWORK',
      icon: Globe,
      defaultPage: 'ads',
    },
    {
      id: 'company_settings',
      label: 'COMPANY',
      icon: Building2,
      defaultPage: 'users_roles',
    },
    {
      id: 'ai_recommendations',
      label: 'AI RECOMMENDATIONS',
      icon: BrainCircuit,
      defaultPage: 'competitors',
    },
    {
      id: 'social',
      label: 'SOCIAL NETWORK',
      icon: Share2,
      defaultPage: 'social_explorer',
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app-bg">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // --- Sub-Pages Implementation ---

  const DashboardPage = () => {
    // Ensure activePage belongs to dashboard tabs, otherwise default to orders
    const dashboardTabIds = ['orders', 'notifications', 'calendar'];
    const currentTabId = dashboardTabIds.includes(activePage) ? activePage : 'orders';
    
    return (
      <div className="space-y-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           {currentTabId === 'orders' && <OrdersPage />}
           {currentTabId === 'notifications' && <NotificationsPage />}
           {currentTabId === 'calendar' && <CalendarPage />}
        </div>
      </div>
    );
  };
  const OrdersPage = () => {
    // Nested tabs for Orders page
    const [subTab, setSubTab] = useState<'new' | 'waiting'>('new');
    const filtered = requests.filter(r => r.status === (subTab === 'new' ? 'pending' : 'accepted'));
    
    return (
      <div className="space-y-6">
        <div className="flex bg-app-bg/50 p-1 rounded-2xl border border-app-border flex-wrap gap-1 justify-center md:justify-start w-full md:w-fit">
          <button 
            onClick={() => setSubTab('new')}
            className={cn("flex-1 md:flex-none px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all", subTab === 'new' ? "bg-emerald-500 text-black shadow-lg font-black" : "text-neutral-500 hover:text-app-text")}
          >
            New order
          </button>
          <button 
            onClick={() => setSubTab('waiting')}
            className={cn("flex-1 md:flex-none px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all", subTab === 'waiting' ? "bg-emerald-500 text-black shadow-lg font-black" : "text-neutral-500 hover:text-app-text")}
          >
            Waiting orders
          </button>
        </div>
        
        <div className="grid gap-4">
          {filtered.length === 0 ? (
            <div className="p-12 text-center bg-app-card rounded-[3rem] border border-app-border">
              <ClipboardList className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 font-medium italic text-[10px] uppercase font-black tracking-widest">No {subTab === 'new' ? 'new' : 'waiting'} requests</p>
            </div>
          ) : (
            filtered.map(req => (
              <div key={req.id} className="p-6 bg-app-card border border-app-border rounded-[3rem] flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-app-bg rounded-2xl flex items-center justify-center font-black text-emerald-500 text-lg border border-app-border">
                    {req.id.slice(0, 1)}
                  </div>
                  <div>
                    <h4 className="font-black italic uppercase tracking-tight text-app-text">{req.category || 'General Service'}</h4>
                    <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">ID: {req.id.slice(0, 8)} • $ {req.price}</p>
                  </div>
                </div>
                {subTab === 'new' ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleRequestAction(req.id, 'accepted')} className="px-6 py-2 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-transform shadow-lg shadow-emerald-500/20">Verify</button>
                    <button 
                      onClick={() => handleRequestAction(req.id, 'declined')}
                      className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-app-text rounded-xl text-[10px] font-black uppercase"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowCancelModal(req.id)}
                      className="px-6 py-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10"
                    >
                      Cancel Order
                    </button>
                    <button 
                      onClick={() => navigate(`/chat/${req.id}`)}
                      className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-app-text rounded-xl text-[10px] font-black uppercase"
                    >
                      Chat
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const NotificationsPage = () => {
    const [tab, setTab] = useState<'chat' | 'explorer' | 'contract'>('chat');
    
    const filteredNotifications = notifications.filter(n => {
      if (tab === 'chat') return n.type === 'ticket';
      if (tab === 'explorer') return n.type === 'system' || n.type === 'request';
      if (tab === 'contract') return n.type === 'payment';
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="flex bg-app-card p-1 rounded-2xl border border-app-border flex-wrap gap-1 justify-center md:justify-start w-full md:w-fit">
          {['Chat', 'Explorer', 'Contract'].map(t => (
            <button 
              key={t}
              onClick={() => setTab(t.toLowerCase() as any)}
              className={cn("flex-1 md:flex-none px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all", tab === t.toLowerCase() ? "bg-emerald-500 text-black shadow-lg" : "text-neutral-500 hover:text-app-text")}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="space-y-4">
           {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center bg-app-card rounded-[3rem] border border-app-border">
                <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 font-medium">Your {tab} feed is currently empty.</p>
              </div>
           ) : (
             <div className="grid gap-4">
                {filteredNotifications.map(n => (
                  <div key={n.id} className={cn("p-6 bg-app-card border rounded-3xl flex items-start gap-4 transition-all", n.read ? "border-app-border opacity-70" : "border-emerald-500/30 bg-emerald-500/5")}>
                     <div className="w-10 h-10 bg-app-bg rounded-xl flex items-center justify-center shrink-0">
                        {n.type === 'ticket' ? <MessageSquare className="w-5 h-5 text-blue-500" /> : <Sparkles className="w-5 h-5 text-emerald-500" />}
                     </div>
                     <div className="flex-1">
                        <h4 className="font-bold text-app-text">{n.title}</h4>
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    );
  };  const CalendarPage = () => {
    const [tab, setTab] = useState<'calendar' | 'appointments'>('calendar');
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      serviceId: ''
    });
    const [saving, setSaving] = useState(false);

    const handleAddAppointment = async () => {
      setSaving(true);
      await addAppointment({
        ...formData,
        status: 'scheduled'
      });
      setSaving(false);
      setIsAdding(false);
      setFormData({ title: '', description: '', startTime: '', endTime: '', location: '', serviceId: '' });
    };

    const allEvents = [
      ...appointments.map(a => ({ 
        id: a.id, 
        title: a.title, 
        start: a.startTime, 
        end: a.endTime, 
        type: 'internal',
        status: a.status
      })),
      ...externalEvents.map(e => ({
        id: e.id,
        title: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        type: 'google'
      }))
    ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex bg-app-card p-1 rounded-2xl border border-app-border flex-wrap gap-1 w-full md:w-fit shadow-sm">
             {['Calendar', 'Appointments'].map(t => (
               <button 
                 key={t}
                 onClick={() => setTab(t.toLowerCase() as any)}
                 className={cn(
                   "flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all", 
                   tab === t.toLowerCase() ? "bg-emerald-500 text-black shadow-lg" : "text-neutral-500 hover:text-app-text hover:bg-app-bg"
                 )}
               >
                 {t}
               </button>
             ))}
           </div>

           <div className="flex items-center gap-2">
              <button 
                onClick={connectGoogleCalendar}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border transition-all",
                  company?.googleCalendarSynced ? "bg-blue-500/10 border-blue-500/20 text-blue-500" : "bg-app-card border-app-border text-neutral-500 hover:border-blue-500 hover:text-blue-500"
                )}
              >
                <Globe className="w-4 h-4" />
                {company?.googleCalendarSynced ? 'Synced with Google' : 'Connect Google Calendar'}
              </button>
              <button 
                onClick={() => setIsAdding(true)}
                className="px-4 py-2 bg-app-text text-app-bg rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Appointment
              </button>
           </div>
        </div>

        {isAdding && (
          <div className="bg-app-card border border-app-border rounded-[3rem] p-8 space-y-6 max-w-2xl mx-auto shadow-2xl relative">
             <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 p-2 hover:bg-app-bg rounded-full">
                <X className="w-5 h-5 text-neutral-500" />
             </button>
             <div className="space-y-1">
                <h4 className="text-2xl font-black italic uppercase tracking-tighter">Schedule Appointment</h4>
                <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Reserve neighborhood resources or agent time</p>
             </div>

             <div className="grid gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Appointment Title</label>
                   <input 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500 outline-none transition-all"
                      placeholder="e.g. Strategy Consultation"
                   />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Start Date & Time</label>
                      <input 
                         type="datetime-local"
                         value={formData.startTime}
                         onChange={e => setFormData({...formData, startTime: e.target.value})}
                         className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500 outline-none transition-all cursor-pointer"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">End Date & Time</label>
                      <input 
                         type="datetime-local"
                         value={formData.endTime}
                         onChange={e => setFormData({...formData, endTime: e.target.value})}
                         className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500 outline-none transition-all cursor-pointer"
                      />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Location / Meet Link</label>
                   <input 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500 outline-none transition-all"
                      placeholder="Address or Google Meet URL"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Internal Notes</label>
                   <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500 outline-none transition-all h-24 resize-none"
                      placeholder="Any specific details for this session..."
                   />
                </div>
             </div>

             <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsAdding(false)} className="px-8 py-3 bg-app-bg text-app-text border border-app-border rounded-2xl text-[10px] font-black uppercase">Cancel</button>
                <button 
                  onClick={handleAddAppointment}
                  disabled={saving}
                  className="px-8 py-3 bg-app-text text-app-bg rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Schedule Now
                </button>
             </div>
          </div>
        )}

        {tab === 'calendar' ? (
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 bg-app-card rounded-[3rem] border border-app-border p-10 shadow-sm relative overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black italic uppercase tracking-tighter">Availability Hub</h4>
                  <div className="flex items-center gap-2">
                     <button className="p-2 hover:bg-app-bg rounded-xl transition-colors"><ChevronDown className="w-4 h-4 rotate-90" /></button>
                     <span className="text-xs font-black uppercase tracking-widest">{format(new Date(), 'MMMM yyyy')}</span>
                     <button className="p-2 hover:bg-app-bg rounded-xl transition-colors"><ChevronDown className="w-4 h-4 -rotate-90" /></button>
                  </div>
               </div>
               
               <div className="grid grid-cols-7 gap-4">
                 {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                   <div key={d} className="text-center text-[10px] font-black text-neutral-400 uppercase tracking-widest pb-4">{d}</div>
                 ))}
                 {Array.from({length: 35}).map((_, i) => {
                    const day = i - 1; // Simplistic offset for demo
                    const isToday = day === new Date().getDate();
                    const hasEvents = day > 0 && day < 28 && i % 3 === 0;
                    return (
                      <div key={i} className={cn(
                        "aspect-square rounded-[1.5rem] border border-app-border p-2 flex flex-col items-center justify-between group transition-all cursor-pointer hover:border-emerald-500/30",
                        isToday ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/30" : "bg-app-bg/50",
                        day <= 0 ? "opacity-0" : ""
                      )}>
                        <span className={cn("text-xs font-black", isToday ? "text-black" : "text-app-text")}>{day > 0 ? day : ''}</span>
                        {hasEvents && day > 0 && (
                          <div className="flex gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </div>
                        )}
                      </div>
                    );
                 })}
               </div>
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            </div>

            <div className="space-y-6">
               <div className="bg-app-card rounded-[2.5rem] border border-app-border p-6 shadow-sm">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-2">
                     <ZapIcon className="w-3 h-3 text-emerald-500" />
                     Coming Up
                  </h4>
                  <div className="space-y-4">
                     {allEvents.length === 0 ? (
                        <div className="p-10 text-center bg-app-bg rounded-2xl border-2 border-dashed border-app-border">
                           <CalendarIcon className="w-8 h-8 text-neutral-700 mx-auto mb-2 opacity-30" />
                           <p className="text-[8px] font-black uppercase text-neutral-500 tracking-widest italic">No schedule active</p>
                        </div>
                     ) : (
                        allEvents.slice(0, 4).map(ev => (
                           <div key={ev.id} className="p-4 bg-app-bg border border-app-border rounded-2xl group hover:border-emerald-500/30 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                 <div className={cn(
                                    "px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest",
                                    ev.type === 'google' ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
                                 )}>
                                    {ev.type}
                                 </div>
                                 <span className="text-[8px] font-black text-neutral-400 uppercase">{format(new Date(ev.start), 'HH:mm')}</span>
                              </div>
                              <p className="text-[11px] font-bold text-app-text group-hover:text-emerald-500 transition-colors line-clamp-1">{ev.title}</p>
                           </div>
                        ))
                     )}
                  </div>
               </div>

               <div className="bg-emerald-500 rounded-[2.5rem] p-8 text-black space-y-4 shadow-xl shadow-emerald-500/20">
                   <Sparkles className="w-8 h-8 opacity-40" />
                   <div className="space-y-1">
                      <h5 className="font-black italic uppercase text-lg leading-tight">Sync Mastery</h5>
                      <p className="text-[9px] font-black uppercase opacity-60 leading-relaxed">Automatically detect conflicts across your entire neighborhood operation in real-time.</p>
                   </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-8">
             <div className="lg:col-span-3 space-y-6">
                <div className="bg-app-card rounded-[3rem] border border-app-border p-10">
                   <div className="flex items-center justify-between mb-8">
                      <div>
                         <h4 className="text-xl font-black italic uppercase tracking-tighter">Appointment Manager</h4>
                         <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Structured neighborhood service sessions</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="p-2 bg-app-bg border border-app-border rounded-xl flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-neutral-500" />
                            <span className="text-[9px] font-black uppercase text-neutral-500">Filter</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid gap-3">
                      {appointments.length === 0 ? (
                         <div className="p-20 text-center bg-app-bg rounded-[2rem] border-2 border-dashed border-app-border">
                            <CalendarPlus className="w-12 h-12 text-neutral-700 mx-auto mb-4 opacity-50" />
                            <h5 className="text-sm font-black uppercase tracking-widest">No Active Sessions</h5>
                            <button onClick={() => setIsAdding(true)} className="mt-4 px-6 py-2 bg-app-text text-app-bg rounded-xl text-[10px] font-black uppercase italic">Create First Appointment</button>
                         </div>
                      ) : (
                         appointments.map(a => (
                            <div key={a.id} className="p-6 bg-app-bg border border-app-border hover:border-emerald-500/30 rounded-[2.5rem] flex items-center justify-between transition-all group">
                               <div className="flex items-center gap-6">
                                  <div className="w-16 h-16 bg-app-card rounded-2xl flex flex-col items-center justify-center border border-app-border group-hover:scale-105 transition-transform">
                                     <span className="text-[8px] font-black uppercase text-emerald-500">{format(new Date(a.startTime), 'MMM')}</span>
                                     <span className="text-2xl font-black text-app-text">{format(new Date(a.startTime), 'dd')}</span>
                                  </div>
                                  <div>
                                     <h5 className="text-lg font-black italic uppercase tracking-tight group-hover:text-emerald-500 transition-colors truncate max-w-md">{a.title}</h5>
                                     <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-1.5">
                                           <Clock className="w-3 h-3 text-neutral-500" />
                                           <span className="text-[9px] font-black uppercase text-neutral-500">{format(new Date(a.startTime), 'HH:mm')} - {format(new Date(a.endTime), 'HH:mm')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-blue-500">
                                           <Map className="w-3 h-3" />
                                           <span className="text-[9px] font-black uppercase truncate max-w-[150px]">{a.location || 'Online Session'}</span>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                               <div className="flex items-center gap-3">
                                  <div className={cn(
                                     "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                     a.status === 'confirmed' ? "bg-emerald-500/10 text-emerald-500" : "bg-neutral-500/10 text-neutral-400"
                                  )}>
                                     {a.status}
                                  </div>
                                  <button className="p-3 bg-app-bg border border-app-border rounded-xl text-neutral-500 hover:text-emerald-500 hover:border-emerald-500/50 transition-all">
                                     <ChevronRight className="w-4 h-4" />
                                  </button>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="bg-app-card rounded-[2.5rem] border border-app-border p-8 shadow-sm">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6 italic">Session Stats</h5>
                   <div className="space-y-6">
                      <div className="flex justify-between items-end border-b border-app-border pb-4">
                         <div>
                            <p className="text-[9px] font-black uppercase text-neutral-400">Monthly Completed</p>
                            <p className="text-2xl font-black italic">24</p>
                         </div>
                         <TrendingUp className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex justify-between items-end border-b border-app-border pb-4">
                         <div>
                            <p className="text-[9px] font-black uppercase text-neutral-400">Total Hours</p>
                            <p className="text-2xl font-black italic">148.5</p>
                         </div>
                         <Clock className="w-5 h-5 text-blue-500" />
                      </div>
                   </div>
                </div>

                <div className="bg-app-bg rounded-[2.5rem] border-2 border-dashed border-app-border p-8 text-center space-y-4">
                   <Target className="w-10 h-10 text-neutral-700 mx-auto opacity-40" />
                   <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest leading-relaxed italic">Neighborhood target: Complete 30 sessions this month to unlock "Elite Provider" status.</p>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  const FinancePage = () => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
    const outcome = transactions.filter(t => t.type === 'outcome').reduce((acc, t) => acc + (t.amount || 0), 0);
    const balance = income - outcome;

    const stats = [
       { label: 'Weekly Revenue', value: '$8,450', trend: '+12%', up: true },
       { label: 'Monthly Growth', value: '$32,100', trend: '+5%', up: true },
       { label: 'Platform Fees', value: '$1,605', trend: '2% lower', up: false },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="mt-4">
          {activePage === 'wallet' && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-emerald-500 p-10 rounded-[3rem] text-black relative overflow-hidden group shadow-2xl shadow-emerald-500/20">
                   <div className="relative z-10 space-y-8">
                      <div className="flex justify-between items-start">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Available Funds</p>
                            <h4 className="text-5xl font-black italic tracking-tighter">${balance.toLocaleString()}</h4>
                         </div>
                         <Wallet className="w-12 h-12 opacity-20" />
                      </div>
                      <div className="flex gap-3">
                         <button className="px-8 py-3 bg-black text-white rounded-2xl font-black uppercase text-[10px] hover:scale-105 transition-all">Withdraw Funds</button>
                         <button className="px-8 py-3 bg-white/20 backdrop-blur-md text-black rounded-2xl font-black uppercase text-[10px] border border-black/10 hover:bg-white/30 transition-all">Add Credits</button>
                      </div>
                   </div>
                   <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                </div>
                <div className="bg-app-card p-10 rounded-[3rem] border border-app-border flex flex-col justify-between shadow-sm">
                   <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Quick Stats</p>
                      <div className="space-y-4">
                         {stats.map(s => (
                           <div key={s.label} className="flex justify-between items-end border-b border-app-border pb-2">
                              <div>
                                 <p className="text-[9px] font-black uppercase text-neutral-400">{s.label}</p>
                                 <p className="text-xl font-black text-app-text">{s.value}</p>
                              </div>
                              <span className={cn("text-[9px] font-black uppercase tracking-widest", s.up ? "text-emerald-500" : "text-rose-500")}>
                                 {s.trend}
                              </span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>

              <div className="bg-app-card border border-app-border rounded-[3rem] p-8 space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-black italic uppercase tracking-tighter">Transaction Ledger</h4>
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Detailed neighborhood financial history</p>
                    </div>
                    <button className="p-3 bg-app-bg border border-app-border rounded-2xl hover:scale-110 transition-all">
                       <Filter className="w-4 h-4 text-neutral-500" />
                    </button>
                 </div>
                 
                 <div className="space-y-2">
                   {transactions.length === 0 ? (
                      <div className="p-20 text-center bg-app-bg rounded-[2rem] border-2 border-dashed border-app-border">
                         <Receipt className="w-10 h-10 text-neutral-700 mx-auto mb-4 opacity-50" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">No ledger activity found</p>
                      </div>
                   ) : (
                      transactions.map(t => (
                        <div key={t.id} className="group p-5 bg-app-bg border border-app-border hover:border-emerald-500/30 rounded-[2rem] flex items-center justify-between transition-all">
                           <div className="flex items-center gap-5">
                              <div className={cn(
                                 "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                                 t.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                              )}>
                                 {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                              </div>
                              <div>
                                 <p className="font-bold text-app-text">{t.description || 'Neighborhood Service'}</p>
                                 <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">{new Date(t.timestamp).toLocaleDateString()} • {t.category || 'General'}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className={cn("text-lg font-black italic", t.type === 'income' ? "text-emerald-500" : "text-rose-500")}>
                                 {t.type === 'income' ? '+' : '-'}${t.amount?.toLocaleString()}
                              </p>
                              <p className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Conf# {t.id.slice(0, 8)}</p>
                           </div>
                        </div>
                      ))
                   )}
                 </div>
              </div>
            </div>
          )}

          {activePage === 'revenue' && (
            <div className="space-y-8 max-w-5xl mx-auto">
               <div className="bg-app-card border border-app-border rounded-[3rem] p-10 flex flex-col md:flex-row gap-10">
                  <div className="flex-1 space-y-8">
                     <div className="space-y-2">
                        <h4 className="text-3xl font-black italic uppercase tracking-tighter">Budgeting Core</h4>
                        <p className="text-sm text-neutral-500">Analyze your neighbor revenue streams and allocate resources for business expansion.</p>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-app-bg rounded-[2rem] border border-app-border">
                           <p className="text-[10px] font-black uppercase text-neutral-500">Projected Q2</p>
                           <p className="text-2xl font-black text-emerald-500">$45,000</p>
                        </div>
                        <div className="p-6 bg-app-bg rounded-[2rem] border border-app-border">
                           <p className="text-[10px] font-black uppercase text-neutral-500">Operating Costs</p>
                           <p className="text-2xl font-black text-rose-500">$12,400</p>
                        </div>
                     </div>
                  </div>
                  <div className="w-full md:w-72 aspect-square bg-app-bg rounded-[3rem] border border-app-border flex items-center justify-center relative overflow-hidden group">
                     <BarChart3 className="w-20 h-20 text-neutral-300 group-hover:scale-125 transition-transform" />
                     <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
                  </div>
               </div>
            </div>
          )}

          {activePage === 'commission' && (
             <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-app-card border border-app-border rounded-[3rem] p-10 text-center space-y-8 relative overflow-hidden">
                   <div className="bg-emerald-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto relative z-10 border border-emerald-500/20 shadow-xl">
                      <Sparkles className="w-10 h-10 text-emerald-500" />
                   </div>
                   <div className="space-y-2 relative z-10">
                      <h4 className="text-3xl font-black italic uppercase tracking-tighter">Commission Tiers</h4>
                      <p className="text-sm text-neutral-500 max-w-md mx-auto">The more you help neighbors, the more you keep. Scale your business to unlock lower platform fees.</p>
                   </div>
                   <div className="grid md:grid-cols-2 gap-6 relative z-10">
                      <div className="p-8 bg-app-bg rounded-[2.5rem] border-2 border-emerald-500 relative shadow-2xl shadow-emerald-500/10">
                         <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-black text-[9px] font-black uppercase rounded-full">Current Level</div>
                         <p className="text-[10px] font-black uppercase text-neutral-500 mb-2">Standard Fee</p>
                         <p className="text-5xl font-black text-emerald-500 italic">5%</p>
                         <p className="text-[9px] font-black uppercase text-neutral-400 mt-4">$0 - $50k Annual Volume</p>
                      </div>
                      <div className="p-8 bg-app-bg rounded-[2.5rem] border border-app-border opacity-70 hover:opacity-100 transition-all">
                         <p className="text-[10px] font-black uppercase text-neutral-500 mb-2">Neighborhood Pro</p>
                         <p className="text-5xl font-black text-app-text italic">3%</p>
                         <p className="text-[9px] font-black uppercase text-neutral-400 mt-4">$50k - $250k Annual Volume</p>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {activePage === 'payroll' && (
             <div className="bg-app-card border border-app-border rounded-[3rem] p-8 space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between pb-6 border-b border-app-border">
                   <div className="space-y-1">
                      <h4 className="text-2xl font-black italic uppercase tracking-tighter">Team Payroll</h4>
                      <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Next distribution: May 1, 2026</p>
                   </div>
                   <button className="px-8 py-3 bg-app-text text-app-bg rounded-2xl text-[10px] font-black uppercase shadow-xl">Process Payroll</button>
                </div>
                <div className="grid gap-3">
                   {companyMembers.map(member => (
                      <div key={member.id} className="p-6 bg-app-bg border border-app-border rounded-[2rem] flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-app-card rounded-xl flex items-center justify-center font-black text-emerald-500">
                               {member.displayName?.slice(0, 1) || 'U'}
                            </div>
                            <div>
                               <p className="font-bold text-app-text">{member.displayName}</p>
                               <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">{member.staffRole || 'Field Agent'} • Salaried</p>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <p className="text-lg font-black text-app-text tracking-tight">$4,250</p>
                            <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">Ready to Pay</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}
          
          {activePage === 'subcontractors' && (
             <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-app-card border border-app-border rounded-[3rem] p-12 text-center space-y-6">
                   <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/10">
                      <Users2 className="w-10 h-10 text-blue-500" />
                   </div>
                   <div className="space-y-2">
                       <h4 className="text-3xl font-black italic uppercase tracking-tighter">B2B Outcomes</h4>
                       <p className="text-sm text-neutral-500 max-w-md mx-auto">Manage payments for your sub-contracted partners and neighborhood contractors.</p>
                   </div>
                   <div className="pt-8">
                      <div className="p-8 bg-app-bg border-2 border-dashed border-app-border rounded-[2.5rem]">
                         <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest italic">No active sub-contractor debts found</p>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {activePage === 'payment_methods' && (
             <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-app-card border border-app-border rounded-[3rem] p-10 space-y-8">
                    <div className="flex items-center justify-between">
                       <h4 className="text-2xl font-black italic uppercase tracking-tighter">Billing Methods</h4>
                       <button className="px-6 py-2 bg-app-text text-app-bg rounded-xl text-[10px] font-black uppercase">Add Method</button>
                    </div>
                    <div className="grid gap-4">
                       <div className="p-6 bg-app-bg border border-app-border rounded-[2rem] flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                                <CreditCard className="w-6 h-6 text-black" />
                             </div>
                             <div>
                                <p className="font-bold">Business Checking **** 4421</p>
                                <p className="text-[9px] font-black uppercase text-neutral-500">Verified • Default Payout</p>
                             </div>
                          </div>
                          <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[8px] font-black uppercase">Active</div>
                       </div>
                    </div>
                </div>
             </div>
          )}

          {activePage === 'my_cards' && (
             <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-app-card border border-app-border rounded-[3rem] p-10 space-y-8">
                   <div className="flex items-center justify-between">
                      <h4 className="text-2xl font-black italic uppercase tracking-tighter">Fleet Cards</h4>
                      <button className="px-6 py-2 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase italic shadow-lg shadow-emerald-500/20">Request Cards</button>
                   </div>
                   <div className="relative aspect-[1.6/1] w-full max-w-sm mx-auto bg-gradient-to-br from-neutral-800 to-black rounded-[2.5rem] p-10 shadow-2xl overflow-hidden group">
                      <div className="relative z-10 h-full flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                            <h5 className="text-white/60 font-black italic uppercase text-xs">Neighborhood Fleet</h5>
                            <div className="w-12 h-8 bg-amber-500/40 rounded-lg backdrop-blur-sm" />
                         </div>
                         <div className="space-y-4">
                            <p className="text-2xl font-black text-white tracking-widest">•••• •••• •••• 8829</p>
                            <div className="flex justify-between items-end">
                               <div>
                                  <p className="text-[8px] font-black text-white/40 uppercase">Card Holder</p>
                                  <p className="text-sm font-bold text-white uppercase tracking-tight">{company?.name}</p>
                               </div>
                               <p className="text-xs font-black text-white italic tracking-tighter italic">VISA Platinum</p>
                            </div>
                         </div>
                      </div>
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                         <button className="px-6 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase shadow-xl">Manage Card</button>
                      </div>
                   </div>
                </div>
             </div>
          )}
          
          {activePage === 'statements' && (
             <div className="grid gap-4 max-w-4xl mx-auto">
                <div className="bg-app-card border border-app-border rounded-[3rem] p-8">
                   <h4 className="text-xl font-black italic uppercase tracking-tighter mb-6">Past Statements</h4>
                   <div className="divide-y divide-app-border">
                      {['March 2026', 'February 2026', 'January 2026', 'December 2025'].map(m => (
                         <div key={m} className="py-6 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-app-bg rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Receipt className="w-5 h-5 text-neutral-500" />
                               </div>
                               <div>
                                  <p className="font-bold text-app-text">{m} Statement</p>
                                  <p className="text-[10px] font-black uppercase text-neutral-500">PDF • 2.4 MB</p>
                               </div>
                            </div>
                            <button className="px-6 py-2 bg-app-bg border border-app-border rounded-xl text-[10px] font-black uppercase hover:border-app-text transition-colors flex items-center gap-2">
                               Download
                            </button>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          )}
        </div>
      </div>
    );
  };

  const ServiceManagementPage = () => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingService, setEditingService] = useState<any>(null);
    const [formData, setFormData] = useState({
      title: '',
      price: '',
      description: '',
      images: [] as string[],
      useDefaultTerms: true,
      customTerms: '',
      useDefaultPolicy: true,
      customPolicy: ''
    });

    const [policyContent, setPolicyContent] = useState('');
    const [termsContent, setTermsContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [legalTab, setLegalTab] = useState<'terms' | 'policy'>('terms');
    const [isAiEnhancing, setIsAiEnhancing] = useState(false);

    const handleAiEnhance = async (type: 'terms' | 'policy') => {
      const currentContent = type === 'terms' ? termsContent : policyContent;
      if (!currentContent && !company?.name) return;

      setIsAiEnhancing(true);
      try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are a legal expert for Neighborly, a neighborhood services marketplace. 
        Enhance and professionalize the following ${type === 'terms' ? 'Terms and Conditions' : 'Privacy and Safety Policy'} for a service provider named "${company?.name || 'Local Provider'}".
        Make it comprehensive, protecting both the provider and the neighbor. 
        Keep it clear, professional, and slightly neighborhood-friendly but legally strict.
        Current content: "${currentContent}"
        Return ONLY the enhanced content as plain text.`;

        const result = await model.generateContent(prompt);
        const enhanced = result.response.text().trim();
        
        if (type === 'terms') setTermsContent(enhanced);
        else setPolicyContent(enhanced);
      } catch (error) {
        console.error('AI Enhancement failed:', error);
      } finally {
        setIsAiEnhancing(false);
      }
    };

    useEffect(() => {
      const p = legalPolicies.find(lp => lp.title === 'Policy')?.content || '';
      const t = legalPolicies.find(lp => lp.title === 'Terms')?.content || '';
      setPolicyContent(p);
      setTermsContent(t);
    }, [legalPolicies]);

    const handleAddService = async () => {
      setSaving(true);
      await addProviderService({
        ...formData,
        price: Number(formData.price),
        status: 'active'
      });
      setSaving(false);
      setIsAdding(false);
      setFormData({
        title: '', price: '', description: '', images: [],
        useDefaultTerms: true, customTerms: '',
        useDefaultPolicy: true, customPolicy: ''
      });
    };

    const handleUpdateService = async () => {
      if (!editingService) return;
      setSaving(true);
      await updateProviderService(editingService.id, {
        ...formData,
        price: Number(formData.price)
      });
      setSaving(false);
      setEditingService(null);
    };

    const startEdit = (s: any) => {
      setEditingService(s);
      setFormData({
        title: s.title || '',
        price: s.price?.toString() || '',
        description: s.description || '',
        images: s.images || [],
        useDefaultTerms: s.useDefaultTerms ?? true,
        customTerms: s.customTerms || '',
        useDefaultPolicy: s.useDefaultPolicy ?? true,
        customPolicy: s.customPolicy || ''
      });
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="mt-4">
          {(isAdding || editingService) && (
            <div className="bg-app-card border border-app-border rounded-[3rem] p-8 space-y-8 max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
               <div className="flex items-center justify-between pb-6 border-b border-app-border">
                  <div className="space-y-1">
                     <h4 className="text-2xl font-black italic uppercase tracking-tighter text-app-text">
                       {editingService ? 'Edit Service' : 'Add New Service'}
                     </h4>
                     <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Define your neighborhood offering and rates</p>
                  </div>
                  <button onClick={() => { setIsAdding(false); setEditingService(null); }} className="p-2 hover:bg-app-bg rounded-full transition-colors">
                     <X className="w-5 h-5 text-neutral-500" />
                  </button>
               </div>

               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Service Title</label>
                        <input 
                           value={formData.title}
                           onChange={e => setFormData({...formData, title: e.target.value})}
                           className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500 transition-all outline-none"
                           placeholder="e.g. Lawn Mowing & Edging"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Rate (USD)</label>
                        <div className="relative">
                           <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                           <input 
                              type="number"
                              value={formData.price}
                              onChange={e => setFormData({...formData, price: e.target.value})}
                              className="w-full bg-app-bg border border-app-border rounded-2xl p-4 pl-10 text-sm font-medium focus:border-emerald-500 transition-all outline-none"
                              placeholder="45.00"
                           />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Service Description</label>
                        <textarea 
                           value={formData.description}
                           onChange={e => setFormData({...formData, description: e.target.value})}
                           className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500 transition-all outline-none h-32 resize-none"
                           placeholder="Describe what's included in this service..."
                        />
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="p-6 bg-app-bg border border-app-border rounded-[2rem] space-y-4">
                        <div className="flex items-center justify-between">
                           <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Service Images</h5>
                           <Plus className="w-4 h-4 text-neutral-500 cursor-pointer" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="aspect-video bg-app-card rounded-xl border-2 border-dashed border-app-border flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-neutral-700" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase text-neutral-500">Terms & Conditions</label>
                              <button 
                                onClick={() => setFormData({...formData, useDefaultTerms: !formData.useDefaultTerms})}
                                className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all", 
                                formData.useDefaultTerms ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-neutral-500/10 border-neutral-500/20 text-neutral-500")}
                              >
                                {formData.useDefaultTerms ? 'Using Company Default' : 'Using Custom Terms'}
                              </button>
                           </div>
                           {!formData.useDefaultTerms && (
                              <textarea 
                                 value={formData.customTerms}
                                 onChange={e => setFormData({...formData, customTerms: e.target.value})}
                                 className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-xs font-medium focus:border-emerald-500 transition-all outline-none h-24 resize-none"
                                 placeholder="Override standard terms for this specific service..."
                              />
                           )}
                        </div>

                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase text-neutral-500">Specific Policy</label>
                              <button 
                                onClick={() => setFormData({...formData, useDefaultPolicy: !formData.useDefaultPolicy})}
                                className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all", 
                                formData.useDefaultPolicy ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-neutral-500/10 border-neutral-500/20 text-neutral-500")}
                              >
                                {formData.useDefaultPolicy ? 'Using Company Default' : 'Using Custom Policy'}
                              </button>
                           </div>
                           {!formData.useDefaultPolicy && (
                              <textarea 
                                 value={formData.customPolicy}
                                 onChange={e => setFormData({...formData, customPolicy: e.target.value})}
                                 className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-xs font-medium focus:border-emerald-500 transition-all outline-none h-24 resize-none"
                                 placeholder="Override standard policy for this specific service..."
                              />
                           )}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex justify-end gap-3 pt-6 border-t border-app-border">
                  <button onClick={() => { setIsAdding(false); setEditingService(null); }} className="px-8 py-3 bg-app-bg text-app-text border border-app-border rounded-2xl text-[10px] font-black uppercase">Cancel</button>
                  <button 
                    onClick={editingService ? handleUpdateService : handleAddService}
                    disabled={saving}
                    className="px-8 py-3 bg-app-text text-app-bg rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl"
                  >
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                    {editingService ? 'Update Service' : 'Add Service Product'}
                  </button>
               </div>
            </div>
          )}

          {activePage === 'services' && !isAdding && !editingService && (
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter">My Service Portfolio</h4>
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Live products in the neighborhood explorer</p>
                  </div>
               </div>

               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Add New Service Card */}
                 <div 
                   onClick={() => setIsAdding(true)}
                   className="bg-app-card/40 border-2 border-dashed border-app-border rounded-[2.5rem] flex flex-col items-center justify-center p-8 min-h-[300px] cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all group"
                 >
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-90 transition-all duration-500 shadow-xl shadow-emerald-500/10 mb-4">
                       <Plus className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h5 className="font-black italic uppercase text-lg text-app-text tracking-tighter">Add New Service</h5>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mt-2 text-center max-w-[150px]">Expand your neighborhood reach</p>
                 </div>

                 {providerServices.map(s => (
                      <div key={s.id} className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden group hover:border-emerald-500/30 transition-all flex flex-col">
                         <div className="aspect-video bg-app-bg border-b border-app-border relative overflow-hidden">
                            {s.images?.[0] ? (
                               <img src={s.images[0]} alt={s.title} className="w-full h-full object-cover" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center opacity-20">
                                  <ImageIcon className="w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-xl text-white text-[10px] font-black italic">
                               ${s.price?.toLocaleString()}
                            </div>
                         </div>
                         <div className="p-6 flex-1 space-y-4">
                            <div>
                               <h5 className="font-black italic uppercase text-lg group-hover:text-emerald-500 transition-colors uppercase truncate">{s.title}</h5>
                               <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{s.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="px-2 py-1 bg-app-bg border border-app-border rounded-lg text-[8px] font-black uppercase text-neutral-500">
                                  {s.useDefaultTerms ? 'Default Terms' : 'Custom Terms'}
                               </div>
                               <div className="px-2 py-1 bg-app-bg border border-app-border rounded-lg text-[8px] font-black uppercase text-neutral-500">
                                  {s.useDefaultPolicy ? 'Default Policy' : 'Custom Policy'}
                               </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                               <button 
                                 onClick={() => startEdit(s)}
                                 className="flex-1 py-2 bg-app-bg border border-app-border rounded-xl text-[9px] font-black uppercase hover:border-emerald-500/50 transition-all"
                               >
                                 Edit Service
                               </button>
                               <button className="p-2 bg-app-bg border border-app-border rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
               </div>
            </div>
          )}

          {activePage === 'legal' && (
            <div className="space-y-6 max-w-5xl mx-auto">
               <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-2xl">
                  {/* Tab Header */}
                  <div className="flex border-b border-app-border bg-app-bg/50">
                    <button 
                      onClick={() => setLegalTab('terms')}
                      className={cn(
                        "flex-1 px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                        legalTab === 'terms' ? "text-emerald-500" : "text-neutral-500 hover:text-app-text"
                      )}
                    >
                      Master Terms & Conditions
                      {legalTab === 'terms' && <motion.div layoutId="legalActive" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />}
                    </button>
                    <button 
                      onClick={() => setLegalTab('policy')}
                      className={cn(
                        "flex-1 px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                        legalTab === 'policy' ? "text-emerald-500" : "text-neutral-500 hover:text-app-text"
                      )}
                    >
                      Privacy & Safety Policy
                      {legalTab === 'policy' && <motion.div layoutId="legalActive" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />}
                    </button>
                  </div>

                  <div className="p-10 space-y-8 animate-in fade-in duration-300">
                     {legalTab === 'terms' ? (
                       <div className="space-y-6">
                         <div className="flex items-center justify-between gap-6 pb-6 border-b border-app-border">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-app-bg rounded-2xl border border-app-border flex items-center justify-center">
                                 <FileText className="w-6 h-6 text-neutral-400" />
                              </div>
                              <div className="space-y-1">
                                 <h4 className="text-xl font-black italic uppercase tracking-tighter">Legal Agreement</h4>
                                 <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">Master neighborhood rules for all services</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleAiEnhance('terms')}
                              disabled={isAiEnhancing}
                              className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-all shadow-lg shadow-emerald-500/5 group disabled:opacity-50"
                            >
                               {isAiEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5 group-hover:animate-pulse" />}
                            </button>
                         </div>
                         
                         <div className="space-y-2">
                            <div className="flex justify-between items-center px-2">
                              <label className="text-[10px] font-black uppercase text-neutral-500">Agreement Content</label>
                              <button 
                                onClick={() => handleAiEnhance('terms')}
                                disabled={isAiEnhancing}
                                className="text-[9px] font-black uppercase text-emerald-500 flex items-center gap-1 hover:underline disabled:opacity-50"
                              >
                                <Sparkles className={cn("w-3 h-3", isAiEnhancing && "animate-spin")} /> AI Enhancement
                              </button>
                            </div>
                            <textarea 
                               value={termsContent}
                               onChange={e => setTermsContent(e.target.value)}
                               className="w-full bg-app-bg border border-app-border rounded-[2.5rem] p-8 text-sm font-medium focus:border-emerald-500 transition-all outline-none h-[400px] resize-none leading-relaxed shadow-inner"
                               placeholder="Define your standard cancellation period, deposit requirements, and liability limits..."
                            />
                         </div>

                         <div className="flex justify-end pt-4">
                            <button 
                               onClick={() => saveLegalPolicy('Terms', termsContent)}
                               disabled={saving}
                               className="px-10 py-4 bg-emerald-500 text-black rounded-[1.5rem] font-black uppercase text-[10px] shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:scale-105 transition-all"
                            >
                               {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                               Update Master Terms
                            </button>
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-6">
                         <div className="flex items-center justify-between gap-6 pb-6 border-b border-app-border">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-app-bg rounded-2xl border border-app-border flex items-center justify-center">
                                 <ShieldCheck className="w-6 h-6 text-emerald-500" />
                              </div>
                              <div className="space-y-1">
                                 <h4 className="text-xl font-black italic uppercase tracking-tighter">Safety Protocols</h4>
                                 <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">Neighbor data protections & neighborhood safety</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleAiEnhance('policy')}
                              disabled={isAiEnhancing}
                              className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-all shadow-lg shadow-emerald-500/5 group disabled:opacity-50"
                            >
                               {isAiEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5 group-hover:animate-pulse" />}
                            </button>
                         </div>
                         
                         <div className="space-y-2">
                            <div className="flex justify-between items-center px-2">
                              <label className="text-[10px] font-black uppercase text-neutral-500">Policy Content</label>
                              <button 
                                onClick={() => handleAiEnhance('policy')}
                                disabled={isAiEnhancing}
                                className="text-[9px] font-black uppercase text-emerald-500 flex items-center gap-1 hover:underline disabled:opacity-50"
                              >
                                <Sparkles className={cn("w-3 h-3", isAiEnhancing && "animate-spin")} /> AI Optimization
                              </button>
                            </div>
                            <textarea 
                               value={policyContent}
                               onChange={e => setPolicyContent(e.target.value)}
                               className="w-full bg-app-bg border border-app-border rounded-[2.5rem] p-8 text-sm font-medium focus:border-emerald-500 transition-all outline-none h-[400px] resize-none leading-relaxed shadow-inner"
                               placeholder="Detail how you protect neighbor information and your safety standards..."
                            />
                         </div>

                         <div className="flex justify-end pt-4">
                            <button 
                               onClick={() => saveLegalPolicy('Policy', policyContent)}
                               disabled={saving}
                               className="px-10 py-4 bg-app-text text-app-bg rounded-[1.5rem] font-black uppercase text-[10px] shadow-xl flex items-center gap-2 hover:scale-105 transition-all"
                            >
                               {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                               Publish Policy
                            </button>
                         </div>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CompanyPage = () => {
    const [editData, setEditData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (company && !editData) {
        setEditData(company);
      }
    }, [company]);

    const handleSave = async () => {
      if (!editData) return;
      setSaving(true);
      const { id, ownerId, ...updates } = editData;
      await updateCompany(updates);
      setSaving(false);
    };

    const emailTemplates = [
      { id: '1', name: 'Welcome Neighbor', subject: 'Welcome to our neighborhood!', type: 'Automated' },
      { id: '2', name: 'Contract Signed', subject: 'Your project is confirmed.', type: 'Transaction' },
      { id: '3', name: 'Follow-up Review', subject: 'How was our service?', type: 'Marketing' },
      { id: '4', name: 'Holiday Promo', subject: 'Special neighborhood discount!', type: 'Promo' },
    ];

    return (
      <div className="space-y-6">
        <div className="mt-4">
          {activePage === 'business_profile' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="bg-app-card border border-app-border rounded-[3rem] p-8 space-y-8">
                  <div className="flex items-center gap-6 pb-6 border-b border-app-border">
                     <div className="w-24 h-24 bg-app-bg rounded-[2rem] border border-app-border flex items-center justify-center overflow-hidden group relative cursor-pointer">
                        {editData?.logoUrl ? (
                          <img src={editData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-neutral-700" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                           <Plus className="w-6 h-6 text-white" />
                        </div>
                     </div>
                     <div className="flex-1 space-y-2">
                        <h4 className="text-2xl font-black italic uppercase tracking-tighter text-app-text">Business Profile</h4>
                        <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Public neighborhood identity for {company?.name}</p>
                     </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Business Name</label>
                           <input 
                              value={editData?.name || ''} 
                              onChange={e => setEditData({...editData, name: e.target.value})}
                              className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500/50 transition-all outline-none"
                              placeholder="Neighborhood Services Inc."
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Slogan</label>
                           <input 
                              value={editData?.slogan || ''} 
                              onChange={e => setEditData({...editData, slogan: e.target.value})}
                              className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500/50 transition-all outline-none"
                              placeholder="Building better together"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Phone</label>
                           <input 
                              value={editData?.phone || ''} 
                              onChange={e => setEditData({...editData, phone: e.target.value})}
                              className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500/50 transition-all outline-none"
                              placeholder="+1 555-0000"
                           />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-neutral-500 ml-2">About the Business</label>
                           <textarea 
                              value={editData?.about || ''} 
                              onChange={e => setEditData({...editData, about: e.target.value})}
                              className="w-full bg-app-bg border border-app-border rounded-2xl p-4 text-sm font-medium focus:border-emerald-500/50 transition-all outline-none h-40 resize-none"
                              placeholder="Tell the neighborhood about your history and values..."
                           />
                        </div>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-app-border flex justify-end gap-3">
                     <button className="px-8 py-3 bg-app-bg text-app-text border border-app-border rounded-2xl text-[10px] font-black uppercase">Cancel</button>
                     <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-emerald-500 text-black rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                     >
                        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save Changes
                     </button>
                  </div>
               </div>
            </div>
          )}

          {activePage === 'users_roles' && (
             <div className="space-y-8 animate-in fade-in duration-500">
                <div className="bg-app-card border border-app-border rounded-[3rem] p-8 space-y-8">
                   <div className="flex items-center justify-between pb-6 border-b border-app-border">
                      <div className="space-y-1">
                         <h4 className="text-2xl font-black italic uppercase tracking-tighter text-app-text">Team Hub</h4>
                         <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Manage employees and staff roles</p>
                      </div>
                      <button className="px-6 py-2 bg-app-text text-app-bg rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                         <UserPlus className="w-4 h-4" />
                         Add Member
                      </button>
                   </div>

                   <div className="grid gap-4">
                      {companyMembers.map(member => (
                        <div key={member.id} className="p-6 bg-app-bg border border-app-border rounded-[2rem] flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-app-card rounded-xl flex items-center justify-center font-black text-emerald-500 border border-app-border">
                                 {member.displayName?.slice(0, 1) || 'U'}
                              </div>
                              <div>
                                 <p className="font-bold text-app-text">{member.displayName}</p>
                                 <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{member.role} • {member.staffRole || 'No Specific Title'}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className={cn(
                                 "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                 member.status === 'active' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                              )}>
                                 {member.status}
                              </div>
                              <Settings className="w-4 h-4 text-neutral-700 cursor-pointer hover:text-emerald-500 transition-colors" />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {activePage === 'reviews' && (
             <div className="bg-app-card border border-app-border rounded-[3rem] p-12 text-center space-y-6">
                <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto">
                   <Star className="w-10 h-10 text-amber-500" />
                </div>
                <div className="space-y-2">
                   <h4 className="font-black italic uppercase text-2xl">Neighbor Ratings</h4>
                   <p className="text-neutral-500 text-sm max-w-md mx-auto">Your reputation is your most valuable neighborhood asset. Manage feedback and build trust with every job.</p>
                </div>
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-8">
                   <div className="p-6 bg-app-bg rounded-3xl border border-app-border">
                      <p className="text-[10px] font-black uppercase text-neutral-500">Rating</p>
                      <p className="text-2xl font-black text-amber-500">4.9</p>
                   </div>
                   <div className="p-6 bg-app-bg rounded-3xl border border-app-border">
                      <p className="text-[10px] font-black uppercase text-neutral-500">Reviews</p>
                      <p className="text-2xl font-black text-app-text">128</p>
                   </div>
                   <div className="p-6 bg-app-bg rounded-3xl border border-app-border">
                      <p className="text-[10px] font-black uppercase text-neutral-500">Verified</p>
                      <p className="text-2xl font-black text-emerald-500">100%</p>
                   </div>
                </div>
             </div>
          )}

          {activePage === 'email_templates' && (
             <div className="space-y-4 animate-in fade-in duration-500">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-10 rounded-[3rem] relative overflow-hidden group shadow-xl">
                   <div className="relative z-10 space-y-2">
                      <h4 className="text-3xl font-black italic uppercase text-white tracking-tighter">Marketing Hub</h4>
                      <p className="text-white/70 text-sm max-w-sm">Design automated neighborhood communications and drive customer retention.</p>
                      <div className="pt-4">
                        <button className="px-8 py-3 bg-white text-black rounded-2xl font-black uppercase text-[10px] shadow-2xl hover:scale-105 transition-all">Create Template</button>
                      </div>
                   </div>
                   <Mail className="absolute top-10 right-10 w-24 h-24 text-white/10 group-hover:scale-125 transition-transform" />
                </div>
                <div className="grid gap-3">
                   {emailTemplates.map(t => (
                     <div key={t.id} className="p-6 bg-app-card border border-app-border rounded-[2.5rem] flex items-center justify-between hover:border-blue-500/50 transition-all cursor-pointer group shadow-sm">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 bg-app-bg rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-inner">
                              <Mail className="w-6 h-6 text-blue-500" />
                           </div>
                           <div>
                              <h5 className="text-lg font-black italic uppercase text-app-text">{t.name}</h5>
                              <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{t.type} • {t.subject}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="px-4 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-500/20">Active</div>
                           <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:translate-x-1 transition-transform" />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          )}
        </div>
      </div>
    );
  };
  const ActivityPage = () => {
    const filteredContracts = contracts.filter(c => {
      if (activePage === 'active_jobs') return c.status === 'confirmed' || c.status === 'started';
      if (activePage === 'done_jobs') return c.status === 'completed';
      if (activePage === 'not_contracted') return c.status === 'pending';
      if (activePage === 'cancelled_jobs') return c.status === 'cancelled' || c.status === 'disputed';
      return false;
    });

    return (
      <div className="space-y-6">
        {filteredContracts.length === 0 ? (
          <div className="p-12 text-center bg-app-card rounded-[3rem] border border-app-border">
             <Activity className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
             <p className="text-neutral-500 font-medium italic">No jobs found for this category.</p>
          </div>
        ) : (
          <div className="bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-neutral-50/50 dark:bg-neutral-800/50">
                  <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Tracking ID</th>
                  <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Service Type</th>
                  <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client/Provider</th>
                  <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredContracts.map(c => (
                  <tr key={c.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-8 py-4 text-xs font-bold text-app-text">JOB_{c.id.slice(0, 6)}</td>
                    <td className="px-8 py-4 text-xs font-medium text-app-text">{c.serviceType || 'General'}</td>
                    <td className="px-8 py-4 text-xs font-medium text-app-text">{c.clientName || 'Client'}</td>
                    <td className="px-8 py-4 text-xs font-black text-app-text">${c.amount?.toLocaleString()}</td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1 bg-app-bg text-app-text border border-app-border rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      {c.status !== 'completed' && c.status !== 'cancelled' && (
                        <button 
                          onClick={() => setShowCancelModal(c.id)}
                          className="px-4 py-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cancel Modal */}
      </div>
    );
  };

  const SocialPage = () => {
    const handleCreateStory = async () => {
      if (!company?.id) return;
      try {
        await addDoc(collection(db, 'posts'), {
          providerId: auth.currentUser?.uid,
          imageUrl: 'https://images.unsplash.com/photo-1541888941259-773a9417d741?w=800&q=80',
          caption: `New project completed by ${company.name}! neighborhood aesthetics rising. #Neighborly`,
          likes: [],
          createdAt: new Date().toISOString()
        });
        alert('Story posted to community feed!');
      } catch (e) {
        console.error(e);
      }
    };

    return (
      <div className="space-y-6">
        <div className="mt-4">
          {activePage === 'social_explorer' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-8 rounded-[3rem] border border-emerald-500/10 flex items-center justify-between">
                 <div className="space-y-1">
                    <h4 className="text-xl font-black italic uppercase">Community Hub</h4>
                    <p className="text-xs text-neutral-500">Sync with the neighborhood explorer feed.</p>
                 </div>
                 <button onClick={handleCreateStory} className="px-6 py-3 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px]">Post Story</button>
              </div>
              <div className="p-12 text-center bg-app-card rounded-[3rem] border border-app-border italic text-neutral-500 text-[10px] uppercase font-black">Feed visualization loading...</div>
            </div>
          )}

          {activePage === 'pages' && (
            <div className="p-12 text-center bg-app-card rounded-[3rem] border border-app-border">
              <Layout className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h4 className="font-black uppercase italic text-lg">Public Micro-site</h4>
              <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-2">{company?.name?.toLowerCase().replace(/\s+/g, '-')}.neighborly.com</p>
              <button className="mt-6 px-6 py-2 bg-app-text text-app-bg rounded-xl text-[10px] font-black uppercase">Edit Website</button>
            </div>
          )}

          {(activePage === 'facebook' || activePage === 'instagram' || activePage === 'youtube') && (
            <div className="p-12 text-center bg-app-card rounded-[3rem] border border-app-border">
              {activePage === 'facebook' && <Facebook className="w-12 h-12 text-blue-600 mx-auto mb-4" />}
              {activePage === 'instagram' && <Instagram className="w-12 h-12 text-pink-600 mx-auto mb-4" />}
              {activePage === 'youtube' && <Youtube className="w-12 h-12 text-red-600 mx-auto mb-4" />}
              <h4 className="font-black uppercase italic text-lg">{activePage} API Connection</h4>
              <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-2">Connect to sync your neighborhood stories.</p>
              <button className="mt-6 px-6 py-2 bg-app-text text-app-bg rounded-xl text-[10px] font-black uppercase">Link Account</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activeMainTab === 'home') {
      return (
        <div className="space-y-12 pb-32 max-w-6xl mx-auto px-6 pt-12">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-12 rounded-[4rem] relative overflow-hidden group shadow-2xl">
             <div className="relative z-10 space-y-4">
                <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">Status:<br/>{userData?.displayName?.split(' ')[0]}</h2>
                <p className="text-white/70 max-w-md font-medium">Your neighborhood service hub is active. You have {requests.filter(r => r.status === 'pending').length} new matching requests today.</p>
                <button onClick={() => setActiveMainTab('company')} className="px-8 py-3 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl">Launch Console</button>
             </div>
             <Sparkles className="absolute top-12 right-12 w-32 h-32 text-white/10 group-hover:scale-125 transition-transform" />
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
             <div onClick={() => { setActiveMainTab('company'); setActivePage('orders'); }} className="p-8 bg-app-card border border-app-border rounded-[3rem] space-y-4 cursor-pointer hover:border-emerald-500/50 transition-all group shadow-sm">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <ClipboardList className="text-emerald-500 w-6 h-6" />
                </div>
                <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text">Active Orders</h4>
                <p className="text-neutral-500 text-xs">Verify new customer requests and start building contracts.</p>
             </div>
             <div onClick={() => { setActiveMainTab('company'); setActivePage('notifications'); }} className="p-8 bg-app-card border border-app-border rounded-[3rem] space-y-4 cursor-pointer hover:border-blue-500/50 transition-all group shadow-sm">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Bell className="text-blue-500 w-6 h-6" />
                </div>
                <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text">Inbox</h4>
                <p className="text-neutral-500 text-xs">Manage chats, community posts, and document signatures.</p>
             </div>
             <div onClick={() => { setActiveMainTab('company'); setActivePage('calendar'); }} className="p-8 bg-app-card border border-app-border rounded-[3rem] space-y-4 cursor-pointer hover:border-amber-500/50 transition-all group shadow-sm">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <CalendarIcon className="text-amber-500 w-6 h-6" />
                </div>
                <h4 className="text-xl font-black italic uppercase tracking-tight text-app-text">Schedule</h4>
                <p className="text-neutral-500 text-xs">Sync your availability and view upcoming neighbor bookings.</p>
             </div>
          </div>
        </div>
      );
    }

    if (activeMainTab === 'company') {
      const categoryTabs: Record<string, { id: string; label: string }[]> = {
        dashboard: [
          { id: 'orders', label: 'Orders' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'calendar', label: 'Calendar & Appointments' },
        ],
        activity: [
          { id: 'active_jobs', label: 'Active' },
          { id: 'done_jobs', label: 'Done' },
          { id: 'not_contracted', label: 'Not Contracted' },
          { id: 'cancelled_jobs', label: 'Canceled' },
        ],
        service_management: [
          { id: 'services', label: 'My Services' },
          { id: 'legal', label: 'Terms & Policies' },
        ],
        finance: [
          { id: 'wallet', label: 'Wallet' },
          { id: 'revenue', label: 'Budget' },
          { id: 'commission', label: 'Platform Com.' },
          { id: 'statements', label: 'Statements' },
          { id: 'payroll', label: 'Payroll' },
          { id: 'subcontractors', label: 'Sub-contractors' },
          { id: 'payment_methods', label: 'Payment Methods' },
          { id: 'my_cards', label: 'My Cards' },
        ],
        network: [
          { id: 'ads', label: 'B2B Ads' },
          { id: 'marketplace', label: 'Marketplace' },
          { id: 'b2b_contracts', label: 'Contracts' },
          { id: 'rooms', label: 'Rooms' },
          { id: 'referral', label: 'Referral' },
        ],
        company_settings: [
          { id: 'business_profile', label: 'Business Profile' },
          { id: 'users_roles', label: 'Users & Roles' },
          { id: 'reviews', label: 'Reviews' },
          { id: 'email_templates', label: 'Email Templates' },
        ],
        ai_recommendations: [
          { id: 'competitors', label: 'Competitors' },
          { id: 'opportunities', label: 'Opportunities' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'reports', label: 'Reports' },
        ],
        social: [
          { id: 'social_explorer', label: 'Explorer' },
          { id: 'pages', label: 'Pages' },
          { id: 'facebook', label: 'Facebook group' },
          { id: 'instagram', label: 'Instagram' },
          { id: 'youtube', label: 'YouTube' },
        ]
      };

      const currentTabs = categoryTabs[activeGroup] || [];

      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 pb-32">
           {/* KYC Guard for Core Features */}
           {['finance', 'service_management', 'company_settings'].includes(activeGroup || '') && 
             (!businessKyc || businessKyc?.status !== 'verified') && (
             <div className="mb-8 p-8 bg-rose-500/10 border border-rose-500/20 rounded-[3rem] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl shadow-rose-500/40 relative z-10 group-hover:scale-110 transition-transform">
                   <ShieldAlert className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1 space-y-2 relative z-10">
                   <h4 className="text-2xl font-black italic uppercase text-rose-500 tracking-tighter">Business Verification Mandatory</h4>
                   <p className="text-sm text-neutral-400 max-w-2xl">
                     Your business profile for <span className="text-white font-bold italic">"{company?.name || 'Your Company'}"</span> is currently in <span className="text-rose-500 font-black uppercase underline decoration-2 offset-2">{businessKyc?.status || 'uninitiated'}</span> phase. 
                     Core neighborly business features including Finance, Team Management, and Service Expansion require a verified Business KYC.
                   </p>
                </div>
                <button 
                  onClick={() => navigate('/profile?tab=kyc')}
                  className="px-8 py-3 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase whitespace-nowrap shadow-xl hover:bg-rose-600 transition-all relative z-10"
                >
                  Start Verification
                </button>
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
             </div>
           )}

           {/* Section Banner Header */}
           <div className="mb-8 p-6 bg-app-card/40 border border-app-border rounded-[2.5rem] relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-app-text leading-none">
                  {menuGroups.find(g => g.id === activeGroup)?.label}
                </h2>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 mt-1 opacity-70">Workspace Context / {activeMainTab}</p>
              </div>
              <div className="absolute -right-4 -bottom-8 opacity-[0.03] pointer-events-none">
                 <h2 className="text-9xl font-black italic uppercase tracking-tighter leading-none select-none">
                   {activeGroup.replace('_', ' ')}
                 </h2>
              </div>
           </div>

           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              {/* Universal Tab Header (Tier 2 for Finance/Social, Tier 1 for others) */}
              {currentTabs.length > 1 && (
                <div className="bg-app-card p-1 rounded-2xl border border-app-border flex flex-wrap gap-1 justify-center md:justify-start w-full md:w-auto">
                  {currentTabs.map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setActivePage(tab.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all",
                        activePage === tab.id ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-neutral-400 hover:text-app-text"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
           </div>

           <div className="mt-0">
             {activeGroup === 'dashboard' && <DashboardPage />}
             {activeGroup === 'activity' && <ActivityPage />}
             {activeGroup === 'finance' && <FinancePage />}
             {activeGroup === 'social' && <SocialPage />}
             
             {activeGroup === 'network' && (
                <div className="p-12 text-center bg-app-card rounded-[3rem] border border-app-border">
                  <Globe className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                  <h4 className="font-black italic uppercase text-lg">{currentTabs.find(t => t.id === activePage)?.label}</h4>
                  <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mt-2">B2B Network Management</p>
                </div>
             )}

             {activeGroup === 'company_settings' && <CompanyPage />}

             {activeGroup === 'ai_recommendations' && (
                <div className="p-12 text-center bg-app-card rounded-[3rem] border border-app-border">
                  <BrainCircuit className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
                  <h4 className="font-black italic uppercase text-lg">AI: {currentTabs.find(t => t.id === activePage)?.label}</h4>
                  <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mt-2">Automated Optimization</p>
                </div>
             )}
             
             {activeGroup === 'service_management' && <ServiceManagementPage />}
           </div>
        </div>
      );
    }

    if (activeMainTab === 'explorer') {
      return (
        <div className="max-w-md mx-auto space-y-8 pb-32 pt-8">
           {posts.length === 0 ? (
              <div className="p-12 text-center bg-app-card rounded-[3rem] border border-app-border">
                <p className="text-neutral-500 font-medium">No community posts yet.</p>
              </div>
           ) : (
             posts.map(post => (
               <div key={post.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase">
                        {post.providerId?.slice(0, 1)}
                     </div>
                     <div>
                        <p className="text-sm font-bold text-app-text">Provider_{post.providerId?.slice(0, 6)}</p>
                        <p className="text-[10px] text-neutral-500">{new Date(post.createdAt).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <div className="aspect-square bg-app-card rounded-[2rem] overflow-hidden border border-app-border">
                     {post.imageUrl ? (
                       <img src={post.imageUrl} alt="post" className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-neutral-800" />
                       </div>
                     )}
                  </div>
                  <div className="px-2">
                     <p className="text-sm text-app-text">{post.caption}</p>
                  </div>
                  <div className="flex gap-4 px-2">
                     <Heart className="w-6 h-6 text-neutral-400 hover:text-rose-500 cursor-pointer" />
                     <MessageCircle className="w-6 h-6 text-neutral-400 hover:text-blue-500 cursor-pointer" />
                     <Share2 className="w-6 h-6 text-neutral-400 hover:text-emerald-500 cursor-pointer" />
                  </div>
               </div>
             ))
           )}
        </div>
      );
    }

    if (activeMainTab === 'ai') {
      return (
         <div className="max-w-2xl mx-auto space-y-12 p-12 bg-app-card rounded-[4rem] border border-app-border">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-[2rem] flex items-center justify-center shrink-0">
                 <BrainCircuit className="w-10 h-10 text-black" />
              </div>
              <div>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-app-text">Business Intelligence</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Neighborly AI Assistant</p>
              </div>
            </div>

            <div className="space-y-6">
               <div className="p-8 bg-app-bg/50 border border-emerald-500/20 rounded-3xl space-y-4">
                 <p className="text-sm font-medium text-app-text leading-relaxed">
                   "Your neighborhood demand for <span className="text-emerald-500 font-black italic">'Roof Repair'</span> has increased by 14% this week. Based on your current capacity, I recommend launching a local promo."
                 </p>
                 <div className="flex gap-4">
                    <button className="px-6 py-2 bg-emerald-500 text-black rounded-xl font-black uppercase text-[10px]">Optimize Capacity</button>
                    <button className="px-6 py-2 bg-app-card text-app-text rounded-xl font-black uppercase text-[10px] border border-app-border">Dismiss</button>
                 </div>
               </div>

               <div className="p-8 bg-app-bg/50 border border-blue-500/10 rounded-3xl space-y-4">
                 <p className="text-sm font-medium text-app-text leading-relaxed">
                   "I've identified 3 neighbors looking for your category who haven't received a quote yet. Would you like me to draft introduction messages?"
                 </p>
                 <button className="px-6 py-2 bg-blue-500 text-white rounded-xl font-black uppercase text-[10px]">Draft Replies</button>
               </div>
            </div>

            <div className="pt-12 border-t border-app-border">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6">Ask me anything about your business</h4>
               <div className="relative">
                  <input 
                    type="text" 
                    placeholder="e.g. How's my revenue compared to last month?"
                    className="w-full bg-app-bg border border-app-border rounded-2xl py-4 pl-6 pr-16 text-xs text-app-text outline-none focus:border-emerald-500 transition-all font-medium"
                  />
                  <button className="absolute right-3 top-2 bottom-2 aspect-square bg-emerald-500 rounded-xl flex items-center justify-center text-black">
                     <ArrowRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
         </div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-screen bg-app-bg text-app-text font-sans selection:bg-emerald-500/30 overflow-hidden">
      {/* Sidebar - Collapsible - Left Side */}
      <AnimatePresence mode="wait">
        {activeMainTab === 'company' && (
          <motion.div
            initial={false}
            animate={{ width: sidebarCollapsed ? '80px' : '280px' }}
            className="hidden md:flex flex-col border-r border-app-border bg-app-card sticky top-0 h-screen overflow-hidden z-40 transition-all duration-300 shadow-xl"
          >
            {/* Sidebar Toggle */}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute -right-3 top-20 w-6 h-6 bg-app-card border border-app-border rounded-full flex items-center justify-center text-neutral-400 hover:text-emerald-500 z-50 transition-colors shadow-sm"
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform duration-300", sidebarCollapsed ? "" : "rotate-180")} />
            </button>

            {/* Sidebar Content */}
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-10 overflow-hidden">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-black" />
                </div>
                {!sidebarCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <h2 className="font-black italic uppercase tracking-tight text-sm truncate">{company?.name || 'My Company'}</h2>
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{userData?.companyId?.slice(0, 8) || 'cmp_7k2'}</p>
                  </motion.div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
                {menuGroups.map((group) => (
                  <div key={group.id} className="space-y-1">
                    <button 
                      onClick={() => {
                        setActiveGroup(group.id);
                        if (group.defaultPage) setActivePage(group.defaultPage);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                        sidebarCollapsed ? "justify-center" : "justify-between",
                        activeGroup === group.id ? "bg-emerald-500/5 text-emerald-500" : "text-neutral-500 hover:text-app-text"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <group.icon className={cn("w-5 h-5 shrink-0", activeGroup === group.id ? "text-emerald-500" : "group-hover:scale-110 transition-transform")} />
                        {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">{group.label}</span>}
                      </div>
                      {!sidebarCollapsed && 'items' in group && (group as any).items && activeGroup !== group.id && <ChevronRight className="w-3 h-3 transition-transform" />}
                      {!sidebarCollapsed && 'items' in group && (group as any).items && activeGroup === group.id && <ChevronRight className="w-3 h-3 transition-transform rotate-90" />}
                    </button>

                    {/* Sub-items removed as per user request to move them to in-page tabs */}
                  </div>
                ))}
              </div>

              {/* Sidebar Footer */}
              {!sidebarCollapsed && (
                <div className="pt-6 border-t border-app-border mt-auto">
                   <button onClick={() => auth.signOut()} className="w-full flex items-center gap-3 px-3 py-2 text-neutral-500 hover:text-red-500 transition-colors">
                      <LogOut className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
                   </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Workspace Header - Desktop Only */}
        <header className="hidden md:flex px-6 py-4 border-b border-app-border items-center justify-between sticky top-0 bg-app-bg/80 backdrop-blur-xl z-30">
          <div className="flex items-center gap-8">
             <h1 className="text-sm font-black italic uppercase tracking-tight">{activeMainTab} Mode</h1>
             <div className="flex items-center gap-6">
                <button onClick={() => setActiveMainTab('home')} className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", activeMainTab === 'home' ? "text-emerald-500" : "text-neutral-500 hover:text-app-text")}>Home</button>
                <button onClick={() => setActiveMainTab('explorer')} className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", activeMainTab === 'explorer' ? "text-emerald-500" : "text-neutral-500 hover:text-app-text")}>Explorer</button>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Neighborly Verified</p>
                <p className="text-xs font-bold text-app-text">{userData?.displayName}</p>
             </div>
             <div className="w-10 h-10 bg-app-card border border-app-border rounded-xl flex items-center justify-center font-black text-xs">
                {userData?.displayName?.slice(0, 1)}
             </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden px-6 py-4 border-b border-app-border flex items-center justify-between sticky top-0 bg-app-bg/80 backdrop-blur-xl z-30">
          <Building2 className="w-6 h-6 text-emerald-500" />
          <h1 className="text-sm font-black italic uppercase tracking-tight">{company?.name || 'Workspace'}</h1>
          <button className="p-2"><Menu className="w-6 h-6" /></button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {renderContent()}
        </main>

        {/* Global Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-app-bg via-app-bg to-transparent pointer-events-none z-50">
          <div className="max-w-md mx-auto bg-app-card/80 backdrop-blur-2xl p-2 rounded-[2.5rem] border border-app-border flex items-center justify-around shadow-2xl pointer-events-auto">
            {[
              { id: 'ai', label: 'AI', icon: BrainCircuit },
              { id: 'explorer', label: 'Explorer', icon: Compass },
              { id: 'home', label: 'Home', icon: Home },
              { id: 'company', label: 'Company', icon: Building2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id as MainTab)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative group min-w-[64px]",
                  activeMainTab === tab.id ? "text-emerald-500 scale-110" : "text-neutral-500 hover:text-app-text"
                )}
              >
                <tab.icon className={cn("w-5 h-5", activeMainTab === tab.id ? "fill-emerald-500/20" : "group-hover:scale-110 transition-transform")} />
                <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                {activeMainTab === tab.id && (
                  <motion.div 
                    layoutId="tabActive"
                    className="absolute -top-1 w-1 h-1 bg-emerald-500 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Global Cancel Modal */}
        <AnimatePresence>
          {showCancelModal && (
            <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-app-card p-8 rounded-[3rem] border border-app-border max-w-md w-full space-y-6 shadow-2xl"
              >
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-8 h-8 text-rose-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black uppercase italic tracking-tight">Confirm Cancellation</h3>
                  <p className="text-neutral-500 text-sm leading-relaxed">Are you sure you want to cancel this job? This action will result in a <span className="font-black text-rose-500">{lockoutDuration}-day lockout</span> penalty from the marketplace.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => handleCancelOrder(showCancelModal)} className="w-full px-6 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-lg shadow-rose-500/20">Cancel & Accept Penalty</button>
                  <button onClick={() => setShowCancelModal(null)} className="w-full px-6 py-4 bg-neutral-100 dark:bg-neutral-800 text-app-text rounded-2xl font-black uppercase tracking-widest text-xs">Keep Job</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Icons needed but not imported above
function Compass(props: any) {
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
      <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  );
}
