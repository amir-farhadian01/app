import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Mail, FileText, Calendar, 
  BarChart3, BrainCircuit, Zap, ArrowUpRight, 
  Settings, Plus, ChevronRight, Globe, Newspaper, 
  DollarSign, Briefcase, Users, MessageSquare, 
  ShieldCheck, HelpCircle, X, Check, Bell, LayoutDashboard, Sparkles, Clock,
  HeartHandshake, MessageSquareQuote, Star, ThumbsUp, ThumbsDown, MessageCircle, AlertTriangle
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

// Safe access to Gemini API Key
const getGeminiKey = () => (import.meta as any).env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: getGeminiKey() });

interface CRMTabProps {
  category: string;
}

export default function ProviderCRM({ category }: CRMTabProps) {
  const [activeView, setActiveView] = useState<'overview' | 'finance' | 'emails' | 'appointments' | 'hr' | 'customer-voice' | 'feedback' | 'news'>('overview');
  const [marketData, setMarketData] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [newsCategory, setNewsCategory] = useState(category || 'general');
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', category: 'Operational', date: new Date().toISOString().split('T')[0] });
  const [emailTemplates, setEmailTemplates] = useState<any[]>([
    { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to our service!', body: 'Hi {{name}}, we are excited to work with you...' },
    { id: 'contract', name: 'Service Contract', subject: 'Your Contract: {{id}}', body: 'Please review the attached contract for {{service}}...' },
    { id: 'completion', name: 'Task Completed', subject: 'Project Completed!', body: 'Hi {{name}}, your request {{id}} has been marked as finished...' }
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [autoBooking, setAutoBooking] = useState(false);
  const [merchantConfig, setMerchantConfig] = useState({ stripeKey: '', paypalEmail: '', enabled: false });
  const [availability, setAvailability] = useState<any>({
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '09:00',
    endTime: '17:00'
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if company is fully set up for onboarding
  useEffect(() => {
    if (!auth.currentUser) return;
    const checkSetup = async () => {
      const userId = auth.currentUser?.uid;
      const cQ = query(collection(db, 'companies'), where('ownerId', '==', userId));
      const snap = await getDocs(cQ);
      if (snap.empty) {
        setShowOnboarding(true);
      }
    };
    checkSetup();
  }, []);

  // Load Services (for Appointment setup)
  useEffect(() => {
    if (!auth.currentUser) return;
    const sQ = query(collection(db, 'services'), where('providerId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(sQ, (snapshot) => {
      setServices(snapshot.docs.map(d => ({ id: d.id, ...d.data(), autoBook: false })));
    });
    return unsub;
  }, []);

  // Load Market Data
  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch('/api/market-data');
        const data = await res.json();
        setMarketData(data);
      } catch (err) {
        console.error("Market data error:", err);
      }
    };
    fetchMarket();
    const interval = setInterval(fetchMarket, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Load News
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`/api/news-hub?category=${newsCategory.toLowerCase()}`);
        const data = await res.json();
        setNews(data);
      } catch (err) {
        console.error("News error:", err);
      }
    };
    fetchNews();
  }, [newsCategory]);

  // Load Financials
  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    const incQ = query(collection(db, 'transactions'), where('providerId', '==', userId), where('type', '==', 'income'));
    const expQ = query(collection(db, 'expenses'), where('providerId', '==', userId));

    const unsubInc = onSnapshot(incQ, (snapshot) => {
      setIncomes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubExp = onSnapshot(expQ, (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubInc();
      unsubExp();
    };
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'expenses'), {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        providerId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setShowAddExpense(false);
      setNewExpense({ title: '', amount: '', category: 'Operational', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
    }
  };

  const askAi = async (prompt: string) => {
    setAiLoading(true);
    setAiAssistantOpen(true);
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setAiResponse(response.text || "AI produced an empty response.");
    } catch (err) {
      setAiResponse("I'm sorry, I encountered an issue. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const marketTicker = marketData ? (
    <div className="bg-neutral-950/50 backdrop-blur-xl border-b border-white/5 py-3 px-6 overflow-hidden flex items-center gap-8 whitespace-nowrap">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Live Markets</span>
      </div>
      <div className="flex gap-12 animate-marquee">
        {/* Fuel Prices */}
        <div className="flex gap-4">
          <span className="text-[10px] font-black uppercase text-neutral-400">Gasoline: <span className="text-white">${marketData.markets.fuel.gasoline}</span></span>
          <span className="text-[10px] font-black uppercase text-neutral-400">Diesel: <span className="text-white">${marketData.markets.fuel.diesel}</span></span>
        </div>
        {/* Commodities */}
        <div className="flex gap-4">
          <span className="text-[10px] font-black uppercase text-neutral-400">Gold: <span className="text-amber-500">${marketData.markets.commodities.goldfish}</span></span>
          <span className="text-[10px] font-black uppercase text-neutral-400">Silver: <span className="text-neutral-300">${marketData.markets.commodities.silver}</span></span>
        </div>
        {/* Crypto */}
        <div className="flex gap-4">
          <span className="text-[10px] font-black uppercase text-neutral-400">BTC: <span className="text-orange-500">${marketData.markets.crypto.bitcoin}</span></span>
          <span className="text-[10px] font-black uppercase text-neutral-400">ETH: <span className="text-blue-500">${marketData.markets.crypto.ethereum}</span></span>
        </div>
        {/* Indices */}
        <div className="flex gap-4">
          {Object.entries(marketData.markets.indices).map(([name, val]) => (
            <span key={name} className="text-[10px] font-black uppercase text-neutral-400">{name}: <span className="text-white">{val as string}</span></span>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans selection:bg-emerald-500/30">
      {marketTicker}

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* CRM Header Navigation */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white">CRM <span className="text-emerald-500">Suite</span></h1>
            <p className="text-neutral-500 font-medium">Enterprise-grade management for professional providers.</p>
          </div>
          
          <nav className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
              { id: 'finance', icon: DollarSign, label: 'Financials' },
              { id: 'emails', icon: Mail, label: 'Marketing' },
              { id: 'appointments', icon: Calendar, label: 'Booking' },
              { id: 'hr', icon: Users, label: 'Team Advisor' },
              { id: 'customer-voice', icon: HeartHandshake, label: 'Voice of Customer' },
              { id: 'feedback', icon: MessageSquareQuote, label: 'Feedback Hub' },
              { id: 'news', icon: Newspaper, label: 'Industry Hub' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeView === tab.id 
                    ? "bg-white text-black shadow-xl" 
                    : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Dynamic Content Views */}
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-4 gap-6"
            >
              {/* Onboarding Guide (Conditional) */}
              <AnimatePresence>
                {showOnboarding && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="lg:col-span-4 overflow-hidden"
                  >
                    <div className="bg-emerald-500 p-8 rounded-[3rem] text-black space-y-6 relative group overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
                          <BrainCircuit className="w-32 h-32" />
                       </div>
                       <div className="relative z-10 space-y-4">
                          <div className="flex items-center gap-2">
                             <span className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full">AI Roadmap</span>
                             <h2 className="text-3xl font-black italic uppercase tracking-tight">Welcome to your new HQ</h2>
                          </div>
                          <div className="grid md:grid-cols-3 gap-6">
                             {[
                                { step: 1, title: 'Identity & Business', desc: 'Complete your Personal and Business KYC in Profile.', done: false },
                                { step: 2, title: 'Asset Setup', desc: 'Create your first services and set your hourly rates.', done: false },
                                { step: 3, title: 'Direct Payments', desc: 'Configure your Merchant API in Finance to bypass platform holds.', done: false }
                             ].map((s) => (
                                <div key={s.step} className="bg-black/5 p-6 rounded-2xl border border-black/10 space-y-2">
                                   <p className="text-[10px] font-black uppercase opacity-40">Step 0{s.step}</p>
                                   <p className="text-sm font-bold">{s.title}</p>
                                   <p className="text-xs opacity-70 font-medium">{s.desc}</p>
                                </div>
                             ))}
                          </div>
                          <div className="pt-4 flex gap-3">
                             <button onClick={() => askAi("Guide me through setting up my company environment and CRM step by step.")} className="px-8 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all">Start Onboarding</button>
                             <button onClick={() => setShowOnboarding(false)} className="px-8 py-4 border border-black/20 rounded-2xl font-black uppercase tracking-widest text-[10px]">I'll do it later</button>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick AI Advisor */}
              <div 
                onClick={() => askAi("As an AI advisor for a service provider, what are the top 3 tactical steps to increase local revenue this week?")}
                className="lg:col-span-4 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/30 p-8 rounded-[3rem] group cursor-pointer hover:border-emerald-500 transition-all shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Zap className="w-5 h-5 fill-current" />
                      <span className="text-[10px] font-black uppercase tracking-widest">AI Strategic Advice</span>
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tight">Need a growth strategy?</h2>
                    <p className="text-neutral-400 group-hover:text-neutral-200 transition-colors">Ask our AI Advisor for tactical recommendations based on current market trends.</p>
                  </div>
                  <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <BrainCircuit className="w-8 h-8 text-black" />
                  </div>
                </div>
              </div>

              {/* News Highlights */}
              <div className="lg:col-span-2 bg-neutral-950 border border-white/5 p-8 rounded-[3rem] space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black italic uppercase tracking-tight">Industry Pulse</h3>
                  <button onClick={() => setActiveView('news')} className="text-[10px] font-black uppercase text-emerald-500 hover:underline">Full Feed</button>
                </div>
                <div className="space-y-4">
                  {news.slice(0, 3).map((item, i) => (
                    <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                      <p className="text-[10px] font-black uppercase text-emerald-500 mb-1">{item.source}</p>
                      <h4 className="text-sm font-bold group-hover:text-emerald-400 transition-colors">{item.title}</h4>
                      <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{item.excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="lg:col-span-2 bg-neutral-950 border border-white/5 p-8 rounded-[3rem] space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black italic uppercase tracking-tight">Revenue flow</h3>
                  <BarChart3 className="w-5 h-5 text-neutral-500" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { day: 'Mon', revenue: 400 },
                      { day: 'Tue', revenue: 700 },
                      { day: 'Wed', revenue: 550 },
                      { day: 'Thu', revenue: 900 },
                      { day: 'Fri', revenue: 1200 },
                      { day: 'Sat', revenue: 1500 },
                      { day: 'Sun', revenue: 1100 },
                    ]}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-app-bg/50 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black uppercase text-neutral-500 mb-1">Weekly Profit</p>
                    <p className="text-2xl font-black">$6,350</p>
                  </div>
                  <div className="p-4 bg-app-bg/50 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black uppercase text-neutral-500 mb-1">Active Leads</p>
                    <p className="text-2xl font-black">24</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'emails' && (
            <motion.div 
              key="emails"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-1 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Templates</h3>
                    <button className="p-2 bg-emerald-500 rounded-xl text-black hover:bg-emerald-400 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                  {emailTemplates.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className={cn(
                        "w-full p-6 text-left rounded-[2.5rem] border transition-all group",
                        selectedTemplate?.id === t.id ? "bg-white border-white text-black" : "bg-neutral-950 border-white/5 text-white hover:border-white/20"
                      )}
                    >
                      <h4 className="text-sm font-black uppercase tracking-tight">{t.name}</h4>
                      <p className={cn("text-xs font-medium mt-1 truncate", selectedTemplate?.id === t.id ? "text-neutral-600" : "text-neutral-400")}>{t.subject}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-neutral-950 border border-white/5 p-10 rounded-[3rem] space-y-8">
                 {selectedTemplate ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter">Edit Template</h3>
                        <div className="flex gap-2">
                           <button onClick={() => askAi(`Improve this email template: Subject: ${selectedTemplate.subject}. Body: ${selectedTemplate.body}`)} className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl font-bold text-xs hover:bg-blue-500/20 transition-all flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" /> AI Polish
                           </button>
                           <button className="px-6 py-2 bg-emerald-500 text-black rounded-xl font-black uppercase tracking-widest text-[10px]">Save Template</button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Subject Line</label>
                          <input 
                            value={selectedTemplate.subject}
                            onChange={e => setSelectedTemplate({...selectedTemplate, subject: e.target.value})}
                            className="w-full p-4 bg-app-bg border border-white/5 rounded-2xl text-sm focus:border-emerald-500/50 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Email Body</label>
                          <textarea 
                            rows={12}
                            value={selectedTemplate.body}
                            onChange={e => setSelectedTemplate({...selectedTemplate, body: e.target.value})}
                            className="w-full p-4 bg-app-bg border border-white/5 rounded-2xl text-sm focus:border-emerald-500/50 transition-all outline-none min-h-[300px]"
                          />
                          <p className="text-[10px] text-neutral-500 italic mt-2">Available tags: {'{{name}}'}, {'{{id}}'}, {'{{service}}'}, {'{{date}}'}</p>
                        </div>
                      </div>
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                        <Mail className="w-16 h-16" />
                        <p className="text-xl font-black uppercase tracking-widest">Select a template to begin editing</p>
                    </div>
                 )}
              </div>
            </motion.div>
          )}

          {activeView === 'appointments' && (
            <motion.div 
              key="appointments"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter">Booking Automator</h3>
                  <p className="text-neutral-500 font-medium">Enable 24/7 automated scheduling for your services.</p>
                </div>
                <div className="flex items-center gap-3 p-2 bg-neutral-950 border border-white/10 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-3">Global Sync</span>
                    <button 
                      onClick={() => setAutoBooking(!autoBooking)}
                      className={cn(
                        "w-14 h-8 rounded-full transition-all relative p-1",
                        autoBooking ? "bg-emerald-500" : "bg-neutral-800"
                      )}
                    >
                      <div className={cn("w-6 h-6 bg-white rounded-full transition-all", autoBooking ? "translate-x-6" : "translate-x-0")} />
                    </button>
                </div>
              </div>

              {/* Availability Settings */}
              <div className="bg-neutral-950 border border-white/5 p-10 rounded-[3rem] grid md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" /> Working Days
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <button 
                        key={day}
                        onClick={() => {
                          const newDays = availability.days.includes(day) 
                            ? availability.days.filter((d: string) => d !== day)
                            : [...availability.days, day];
                          setAvailability({...availability, days: newDays});
                        }}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          availability.days.includes(day) ? "bg-emerald-500 border-emerald-500 text-black shadow-lg" : "bg-white/5 border-white/5 text-neutral-500"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-sm font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" /> Business Hours
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-neutral-500 ml-1">Start</p>
                      <input type="time" value={availability.startTime} onChange={e => setAvailability({...availability, startTime: e.target.value})} className="w-full p-3 bg-app-bg border border-white/5 rounded-xl text-xs outline-none" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-neutral-500 ml-1">End</p>
                      <input type="time" value={availability.endTime} onChange={e => setAvailability({...availability, endTime: e.target.value})} className="w-full p-3 bg-app-bg border border-white/5 rounded-xl text-xs outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-center">
                   <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center space-y-2">
                      <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Public Booking Link</p>
                      <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                        <input readOnly value={`https://app.neighberly.com/book/${auth.currentUser?.uid}`} className="bg-transparent text-[9px] w-full outline-none text-neutral-400" />
                        <button onClick={() => {
                          navigator.clipboard.writeText(`https://app.neighberly.com/book/${auth.currentUser?.uid}`);
                          alert("Link copied!");
                        }} className="p-1 px-2 bg-emerald-500 text-black rounded text-[8px] font-bold">Copy</button>
                      </div>
                   </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map(service => (
                  <div key={service.id} className="bg-neutral-950 border border-white/5 p-8 rounded-[3rem] space-y-6 group">
                    <div className="flex items-start justify-between">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                        <Briefcase className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div className="p-2 px-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase text-neutral-500">
                        ${service.price}/hr
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xl font-black tracking-tight text-white mb-1">{service.title}</h4>
                      <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">{service.category}</p>
                    </div>
                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className={cn("w-2 h-2 rounded-full", service.autoBook ? "bg-emerald-500" : "bg-neutral-700")} />
                         <span className="text-[10px] font-black uppercase text-neutral-500">Auto-Booking</span>
                       </div>
                       <button 
                        onClick={() => {
                          setServices(services.map(s => s.id === service.id ? {...s, autoBook: !s.autoBook} : s));
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          service.autoBook ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-white text-black"
                        )}
                       >
                        {service.autoBook ? 'Disable' : 'Enable'}
                       </button>
                    </div>
                  </div>
                ))}

                {services.length === 0 && (
                  <div className="col-span-full p-20 bg-neutral-950 border border-dashed border-white/10 rounded-[3rem] text-center space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                        <BarChart3 className="w-8 h-8 text-neutral-600" />
                    </div>
                    <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">No services found. Add services in the services tab first.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'customer-voice' && (
            <motion.div 
              key="customer-voice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-10"
            >
              <div className="space-y-1">
                <h3 className="text-4xl font-black italic uppercase tracking-tighter">Voice of the Customer</h3>
                <p className="text-neutral-500 font-medium">Analyze service health metrics and sentiment from your neighborhood.</p>
              </div>

              {/* Health Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { status: 'Very Poor', count: 0, color: 'bg-rose-500', text: 'text-rose-500' },
                  { status: 'Poor', count: 0, color: 'bg-orange-500', text: 'text-orange-500' },
                  { status: 'Fair', count: 1, color: 'bg-amber-500', text: 'text-amber-500' },
                  { status: 'Good', count: 4, color: 'bg-emerald-400', text: 'text-emerald-400' },
                  { status: 'Excellent', count: 12, color: 'bg-emerald-600', text: 'text-emerald-600' }
                ].map((tier, i) => (
                  <div key={i} className="bg-neutral-950 border border-white/5 p-6 rounded-3xl text-center space-y-2">
                    <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase text-black", tier.color)}>{tier.status}</span>
                    <p className="text-3xl font-black">{tier.count}</p>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Listings</p>
                  </div>
                ))}
              </div>

              {/* Listings Table */}
              <div className="bg-neutral-950 border border-white/5 rounded-[3rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="relative">
                        <input placeholder="Search SKU or Service..." className="pl-10 pr-4 py-2 bg-app-bg border border-white/5 rounded-xl text-xs outline-none" />
                        <LayoutDashboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      </div>
                   </div>
                   <button className="text-[10px] font-black uppercase text-neutral-400 hover:text-white transition-colors">Download Data</button>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Service Image</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Service Name</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Jobs</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Star Rating</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">NCX Rate</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">CX Health</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {services.map(s => (
                           <tr key={s.id} className="hover:bg-white/5 transition-colors">
                             <td className="p-6">
                               <div className="w-12 h-12 bg-app-bg rounded-xl border border-white/5 overflow-hidden">
                                  <Briefcase className="w-full h-full p-3 text-neutral-600" />
                               </div>
                             </td>
                             <td className="p-6 font-bold text-sm">{s.title}</td>
                             <td className="p-6 text-sm font-medium text-neutral-400">24</td>
                             <td className="p-6">
                               <div className="flex items-center gap-1 text-emerald-500">
                                  <Star className="w-3 h-3 fill-current" />
                                  <span className="text-xs font-black">4.8</span>
                               </div>
                             </td>
                             <td className="p-6 text-xs font-medium text-rose-500">2.1%</td>
                             <td className="p-6">
                               <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase rounded">Healthy</span>
                             </td>
                             <td className="p-6">
                               <button className="text-[10px] font-black uppercase text-emerald-500 hover:underline">Resolve Issues</button>
                             </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'feedback' && (
            <motion.div 
              key="feedback"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                 <div className="space-y-1">
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter">Feedback Hub</h3>
                    <p className="text-neutral-500 font-medium">Customer Service Insights & Sentiment Analysis.</p>
                 </div>
                 <div className="flex items-center gap-2 bg-neutral-950 p-2 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-neutral-500 px-3">Sync Period: 30 Days</span>
                 </div>
              </div>

              {/* Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Buyer Contact Rate', val: '4.2%', avg: '5.8%', icon: MessageCircle, color: 'text-indigo-400' },
                  { label: 'Avg. Response Time', val: '1.2 hr', avg: '4.5 hr', icon: Clock, color: 'text-emerald-400' },
                  { label: 'Buyer Dissatisfaction', val: '0.8%', avg: '2.5%', icon: AlertTriangle, color: 'text-rose-400' }
                ].map((stat, i) => (
                  <div key={i} className="bg-neutral-950 border border-white/5 p-8 rounded-[3rem] space-y-4">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{stat.label}</p>
                        <stat.icon className={cn("w-5 h-5", stat.color)} />
                     </div>
                     <div className="space-y-1">
                        <p className="text-3xl font-black">{stat.val}</p>
                        <p className="text-[10px] text-neutral-600 font-medium italic">Neighborly Avg: {stat.avg}</p>
                     </div>
                  </div>
                ))}
              </div>

              {/* Feedback Summary Table */}
              <div className="bg-neutral-950 border border-white/5 rounded-[3rem] p-10 space-y-8">
                 <div className="space-y-1">
                    <h4 className="text-xl font-black italic uppercase tracking-tight">Rating Distribution</h4>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Comparison over lifecycle</p>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-white/5">
                             <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-white/5">Period</th>
                             <th className="p-6 text-[10px] font-black uppercase tracking-widest text-emerald-500 border-b border-white/5">Positive</th>
                             <th className="p-6 text-[10px] font-black uppercase tracking-widest text-amber-500 border-b border-white/5">Neutral</th>
                             <th className="p-6 text-[10px] font-black uppercase tracking-widest text-rose-500 border-b border-white/5">Negative</th>
                             <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-500 border-b border-white/5">Total Count</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {[
                            { period: '30 Days', pos: '95%', neu: '3%', neg: '2%', count: 42 },
                            { period: '90 Days', pos: '92%', neu: '5%', neg: '3%', count: 128 },
                            { period: 'lifetime', pos: '94%', neu: '4%', neg: '2%', count: 450 }
                          ].map((row, i) => (
                            <tr key={i}>
                               <td className="p-6 text-sm font-black italic uppercase">{row.period}</td>
                               <td className="p-6 text-sm font-bold text-emerald-400">{row.pos}</td>
                               <td className="p-6 text-sm font-bold text-amber-400">{row.neu}</td>
                               <td className="p-6 text-sm font-bold text-rose-400">{row.neg}</td>
                               <td className="p-6 text-sm font-medium text-neutral-500">{row.count}</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Recent Feedback List */}
              <div className="bg-neutral-950 border border-white/5 rounded-[3rem] p-10 space-y-8">
                 <div className="flex items-center justify-between">
                    <h4 className="text-xl font-black italic uppercase tracking-tight">Recent Interactions</h4>
                    <button className="text-[10px] font-black uppercase text-emerald-500">View Inbox</button>
                 </div>
                 <div className="space-y-4">
                    {[
                      { date: '2026-04-20', rating: 5, id: 'JOB-992', comment: 'Absolutely professional and timely. The best neighborhood service!', name: 'Sarah J.' },
                      { date: '2026-04-18', rating: 4, id: 'JOB-981', comment: 'Great job, but was 10 mins late. Otherwise perfect.', name: 'Michael K.' },
                      { date: '2026-04-15', rating: 5, id: 'JOB-975', comment: 'Incredible attention to detail. Highly recommend.', name: 'Neighbor L.' }
                    ].map((f, i) => (
                      <div key={i} className="p-6 bg-app-bg/40 border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-emerald-500/30 transition-all">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center border border-white/5">
                               <Users className="w-5 h-5 text-neutral-500" />
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold">{f.name}</p>
                                  <span className="text-[8px] font-black uppercase text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full">{f.id}</span>
                               </div>
                               <p className="text-xs text-neutral-500 font-medium mt-1">{f.comment}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-6">
                            <div className="flex items-center gap-1 text-emerald-500">
                               {[...Array(f.rating)].map((_, j) => <Star key={j} className="w-3 h-3 fill-current" />)}
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{f.date}</p>
                               <button className="text-[10px] font-black uppercase text-emerald-500 hover:underline mt-1">Reply</button>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}

          {activeView === 'hr' && (
            <motion.div 
              key="hr"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid lg:grid-cols-2 gap-8"
            >
              <div className="space-y-8">
                 <div className="bg-neutral-950 border border-white/5 p-10 rounded-[3rem] space-y-6">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter">Team Analytics</h3>
                    <div className="space-y-4">
                      <div className="p-6 bg-app-bg/50 rounded-3xl border border-white/5 flex items-center justify-between">
                         <div>
                            <p className="text-[10px] font-black uppercase text-neutral-500 mb-1">Retention Rate</p>
                            <p className="text-2xl font-black">94%</p>
                         </div>
                         <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                            <ArrowUpRight className="w-5 h-5" />
                         </div>
                      </div>
                      <div className="p-6 bg-app-bg/50 rounded-3xl border border-white/5 flex items-center justify-between">
                         <div>
                            <p className="text-[10px] font-black uppercase text-neutral-500 mb-1">Total Salaries (Estimated)</p>
                            <p className="text-2xl font-black">$4,200/mo</p>
                         </div>
                         <div className="p-3 bg-white/5 text-neutral-400 rounded-xl">
                            <DollarSign className="w-5 h-5" />
                         </div>
                      </div>
                    </div>
                 </div>

                 <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/20 border border-indigo-500/30 p-10 rounded-[3rem] space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">HR Compliance</span>
                    </div>
                    <h4 className="text-xl font-black uppercase italic tracking-tight">Contract Verification</h4>
                    <p className="text-sm text-neutral-300 font-medium leading-relaxed">
                      "3 team members have licenses expiring in 60 days. I've automatically reminded them to upload new documents to keep your business verified."
                    </p>
                 </div>
              </div>

              <div className="bg-neutral-950 border border-white/5 p-10 rounded-[3rem] space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">AI Talent Advisor</h3>
                    <BrainCircuit className="w-6 h-6 text-emerald-500" />
                  </div>
                  
                  <div className="space-y-6">
                     {[
                        { title: "Peak Efficiency", body: "Your team is most productive on Tuesday mornings. Consider scheduling high-effort projects then.", impact: "+12%" },
                        { title: "Hiring Insight", body: "Based on current request volume, you might need 1 more gardener by next month to avoid backlog.", impact: "High Priority" },
                        { title: "Training Rec", body: "A short safety training for your cleaning staff could reduce reported insurance anomalies by up to 20%.", impact: "-20% Risk" }
                     ].map((rec, i) => (
                        <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-2 hover:border-white/10 transition-all cursor-pointer group">
                           <div className="flex justify-between items-center">
                              <h5 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{rec.title}</h5>
                              <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{rec.impact}</span>
                           </div>
                           <p className="text-xs text-neutral-500 leading-relaxed font-medium">{rec.body}</p>
                        </div>
                     ))}
                  </div>

                  <button 
                    onClick={() => askAi("Analyze my team performance and identify potential burnout risks.")}
                    className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-neutral-200 transition-all"
                  >
                    Generate Deep Audit
                  </button>
              </div>
            </motion.div>
          )}

          {activeView === 'finance' && (
            <motion.div 
              key="finance"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              {/* Direct Payment Gateway Setup */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 rounded-[3rem] text-black space-y-6 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-40 h-40" />
                 </div>
                 <div className="relative z-10 max-w-2xl space-y-4">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter">Direct Payment Gateway</h3>
                    <p className="font-medium opacity-80 leading-relaxed">
                      "Connect your own Stripe or PayPal to receive client payments directly. No platform holds. We only track our 10% commission as a separate liability."
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 pt-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-1">Stripe Secret Key</label>
                          <input 
                            type="password"
                            placeholder="sk_live_..."
                            value={merchantConfig.stripeKey}
                            onChange={e => setMerchantConfig({...merchantConfig, stripeKey: e.target.value})}
                            className="w-full p-4 bg-white/20 border border-black/10 rounded-2xl text-sm focus:bg-white/40 outline-none placeholder:text-black/30"
                          />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-1">PayPal Business Email</label>
                          <input 
                            placeholder="finance@yourcompany.com"
                            value={merchantConfig.paypalEmail}
                            onChange={e => setMerchantConfig({...merchantConfig, paypalEmail: e.target.value})}
                            className="w-full p-4 bg-white/20 border border-black/10 rounded-2xl text-sm focus:bg-white/40 outline-none placeholder:text-black/30"
                          />
                       </div>
                    </div>
                    <div className="pt-4 flex items-center gap-4">
                       <button className="px-10 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg">Save Config</button>
                       <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", merchantConfig.enabled ? "bg-white shadow-[0_0_10px_white]" : "bg-black/20")} />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status: {merchantConfig.enabled ? 'Active' : 'Disconnected'}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { label: 'Total Revenue', val: '$12,450', change: '+12%', color: 'emerald' },
                  { label: 'Business Expenses', val: '$3,120', change: '-5%', color: 'rose' },
                  { label: 'Direct Payments', val: '$8,200', change: '+20%', color: 'blue' }
                ].map((stat, i) => (
                  <div key={i} className="bg-neutral-950 border border-white/5 p-8 rounded-[3rem] space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{stat.label}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-4xl font-black">{stat.val}</p>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-1 rounded-lg",
                        stat.change.startsWith('+') ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}>{stat.change}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-neutral-950 border border-white/5 p-10 rounded-[3rem] space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black italic uppercase tracking-tight">Recent Transactions</h3>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddExpense(true)} className="px-4 py-2 bg-white text-black rounded-xl font-bold text-xs hover:bg-neutral-200 transition-colors">Add Expense</button>
                      <button className="px-4 py-2 bg-white/5 text-white rounded-xl font-bold text-xs hover:bg-white/10 transition-colors">Export Report</button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {[...incomes, ...expenses].sort((a,b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).slice(0, 8).map((t, i) => (
                      <div key={i} className="p-4 bg-app-bg/30 rounded-2xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            t.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{t.title || 'Service Payment'}</p>
                            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{t.category || (t.type === 'income' ? 'Client' : 'Operational')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-sm font-black", t.type === 'income' ? "text-emerald-500" : "text-rose-500")}>
                            {t.type === 'income' ? '+' : '-'}${t.amount}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-medium">{new Date(t.date || t.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Commision Debt Tracker */}
                  <div className="bg-rose-950/20 border border-rose-500/20 p-8 rounded-[3rem] space-y-6">
                    <h3 className="text-lg font-black uppercase italic tracking-tight text-rose-500">Commission Debt</h3>
                    <div className="space-y-2">
                        <p className="text-4xl font-black">$482.50</p>
                        <p className="text-[10px] text-rose-500/70 font-black uppercase tracking-widest">Payable to Platform</p>
                    </div>
                    <div className="h-2 bg-rose-500/10 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 w-[70%]" />
                    </div>
                    <button className="w-full py-4 bg-rose-500 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-400 transition-all">Settle Balance</button>
                  </div>

                  {/* AI Finance Assistant */}
                  <div className="bg-blue-950/20 border border-blue-500/20 p-8 rounded-[3rem] space-y-4">
                    <div className="flex items-center gap-2 text-blue-500">
                      <Zap className="w-4 h-4 fill-current" />
                      <span className="text-[10px] font-black uppercase tracking-widest">AI Audit</span>
                    </div>
                    <p className="text-xs text-neutral-300 font-medium leading-relaxed">
                      "I've noticed your fuel expenses increased by 15% this month compared to the local average. Improving your routing could save you an estimated <b>$120/mo</b>."
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'news' && (
            <motion.div 
              key="news"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">Industry News</h3>
                  <p className="text-neutral-500 font-medium">Curated intelligence for the {newsCategory} sector.</p>
                </div>
                <div className="flex gap-2">
                  {['Construction', 'Cleaning', 'Home', 'General'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setNewsCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        newsCategory === cat ? "bg-emerald-500 text-black" : "bg-white/5 text-neutral-500 hover:text-white"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {news.map((item, i) => (
                  <div key={i} className="bg-neutral-950 border border-white/5 p-8 rounded-[3rem] h-full flex flex-col justify-between group hover:border-emerald-500/50 transition-all shadow-xl">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase text-neutral-500">{item.source}</span>
                        <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <h4 className="text-xl font-black tracking-tight leading-tight group-hover:text-emerald-400 transition-colors">{item.title}</h4>
                      <p className="text-sm text-neutral-500 group-hover:text-neutral-300 transition-colors">{item.excerpt}</p>
                    </div>
                    <div className="pt-8 mt-8 border-t border-white/5 flex items-center justify-between">
                      <button className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Read Analysis</button>
                      <div className="flex gap-1">
                        <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ShieldCheck className="w-3.5 h-3.5 text-blue-500" /></button>
                        <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><Bell className="w-3.5 h-3.5 text-neutral-500" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating AI Butler */}
        <div className="fixed bottom-12 right-12 z-50">
          <button 
            onClick={() => setAiAssistantOpen(!aiAssistantOpen)}
            className={cn(
              "p-6 rounded-full shadow-2xl transition-all hover:scale-110",
              aiAssistantOpen ? "bg-white text-black rotate-90" : "bg-emerald-500 text-black animate-bounce"
            )}
          >
            {aiAssistantOpen ? <X className="w-8 h-8" /> : <BrainCircuit className="w-8 h-8" />}
          </button>
        </div>

        {/* AI Assistant Sidebar */}
        <AnimatePresence>
          {aiAssistantOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 w-full md:w-96 h-full bg-neutral-950 border-l border-white/10 shadow-3xl z-[60] flex flex-col"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-black fill-current" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic italic tracking-tight">AI Onboarding</h3>
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest leading-none">Online & Ready</p>
                  </div>
                </div>
                <button onClick={() => setAiAssistantOpen(false)} className="p-2 text-neutral-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Consulting Intelligence...</p>
                  </div>
                ) : aiResponse ? (
                  <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-4">
                    <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap font-medium">
                      {aiResponse}
                    </div>
                    <button 
                      onClick={() => setAiResponse('')}
                      className="text-[10px] font-black uppercase text-emerald-500 hover:underline"
                    >
                      Start New Analysis
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl space-y-2">
                        <p className="text-xl font-black text-emerald-400">Welcome To CRM</p>
                        <p className="text-xs text-neutral-400">I can help you set up your direct payments, manage your team more effectively, or draft professional emails for your clients.</p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Suggested Actions</p>
                        {[
                          "How do I setup direct payments?",
                          "Audit my business expenses",
                          "Draft a professional contract",
                          "Optimize my service pricing",
                          "Help me with employee HR recommendations"
                        ].map((q, i) => (
                           <button 
                            key={i} 
                            onClick={() => askAi(q)}
                            className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl text-left text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-between group"
                           >
                            {q}
                            <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-emerald-500 transition-colors" />
                           </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Expense Modal */}
        <AnimatePresence>
          {showAddExpense && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-neutral-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-lg shadow-3xl space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-black italic uppercase tracking-tight">Log Expense</h3>
                  <button onClick={() => setShowAddExpense(false)} className="p-2 text-neutral-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleAddExpense} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Title</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Fuel Refill" 
                      value={newExpense.title}
                      onChange={e => setNewExpense({...newExpense, title: e.target.value})}
                      className="w-full p-4 bg-black border border-white/5 rounded-2xl text-sm focus:border-emerald-500/50 transition-all outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Amount ($)</label>
                      <input 
                        required 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={newExpense.amount}
                        onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                        className="w-full p-4 bg-black border border-white/5 rounded-2xl text-sm focus:border-emerald-500/50 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Category</label>
                      <select 
                        value={newExpense.category}
                        onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                        className="w-full p-4 bg-black border border-white/5 rounded-2xl text-sm focus:border-emerald-500/50 transition-all outline-none"
                      >
                        <option>Operational</option>
                        <option>Fuel</option>
                        <option>Team</option>
                        <option>Equipment</option>
                        <option>Marketing</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full py-5 bg-emerald-500 text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-emerald-500/10 hover:bg-emerald-400 transition-all"
                  >
                    Confirm Entry
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .animate-marquee {
          display: flex;
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.5);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
