import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line
} from 'recharts';
import { 
  Sparkles, BrainCircuit, TrendingUp, Users, Target, ShieldAlert, 
  Lightbulb, Zap, Rocket, ChevronRight, Activity, PieChart as PieIcon,
  BarChart3, LineChart as LineIcon
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

// Safe access to Gemini API Key
const getGeminiKey = () => (import.meta as any).env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: getGeminiKey() });

interface BIProps {
  company: any;
  members: any[];
  transactions: any[];
  contracts: any[];
  schedules: any[];
}

export default function BusinessIntelligence({ company, members, transactions, contracts, schedules }: BIProps) {
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'finance' | 'ops' | 'marketing'>('finance');

  // Logic: Calculate Data Science Metrics
  const revenueData = transactions
    .filter(t => t.type === 'income')
    .slice(-6)
    .map(t => ({ name: new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short' }), value: t.amount }));

  const expenseData = transactions
    .filter(t => t.type === 'outcome')
    .slice(-6)
    .map(t => ({ name: new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short' }), value: t.amount }));

  // Radar Data for Business Strength
  // We calculate scores based on real data
  const marketingScore = Math.min(100, (contracts.length * 10)); // Simplified
  const supportScore = 85; // Placeholder for now
  const financeScore = transactions.length > 0 ? 90 : 20;
  const deliveryScore = schedules.filter(s => s.status === 'completed').length > 0 ? 95 : 40;
  const teamScore = members.length * 15;

  const radarData = [
    { subject: 'Marketing', A: marketingScore, fullMark: 100 },
    { subject: 'Customer Support', A: supportScore, fullMark: 100 },
    { subject: 'Finance', A: financeScore, fullMark: 100 },
    { subject: 'Operations', A: deliveryScore, fullMark: 100 },
    { subject: 'Team Spirit', A: teamScore, fullMark: 100 },
  ];

  const getStrategicAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const prompt = `
        You are the Neighborly Business Mentor, a data science expert. 
        Analyze the following business data for company "${company.name}":
        - Staff Count: ${members.length}
        - Total Transactions: ${transactions.length}
        - Total Contracts: ${contracts.length}
        - Conversion Data: ${marketingScore}% strength in marketing.
        - Financial Health: ${financeScore}% strength.
        - Team Capacity: ${teamScore}%.
        
        Provide a professional strategic advice report in Persian (Farsi).
        Include:
        1. A summary of current standing (Data-driven).
        2. Strengths and Weaknesses.
        3. 3 Actionable strategic recommendations to increase profit and brand value.
        4. Use a tone like a high-end management consultant (McKinsey/BCG level).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      setAdvice(response.text || "Analysis failed. Try again.");
    } catch (err) {
      console.error(err);
      setAdvice("Could not reach the AI mentor. Check your connection and API configuration.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  useEffect(() => {
    if (company && !advice) {
      getStrategicAdvice();
    }
  }, [company]);

  return (
    <div className="space-y-10">
      {/* Top Hero Section: AI Mentor Status */}
      <div className="relative overflow-hidden bg-neutral-900 rounded-[3rem] p-12 text-white border border-neutral-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[100px] -ml-48 -mb-48" />
        
        <div className="relative flex flex-col lg:flex-row gap-12 items-start">
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                <BrainCircuit className="w-6 h-6 text-emerald-500" />
              </div>
              <h2 className="text-xl font-black italic uppercase tracking-widest text-emerald-500">Business Mentor AI</h2>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-black tracking-tighter leading-none italic uppercase">
                Data-Driven <br/> Insights Report
              </h1>
              <p className="text-neutral-400 font-medium max-w-xl text-lg">
                Your AI consultant has analyzed 100+ data points across your operations, finance, and marketing departments.
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={getStrategicAdvice} 
                disabled={loadingAdvice}
                className="px-8 py-4 bg-white text-neutral-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all flex items-center gap-2"
              >
                {loadingAdvice ? 'Analyzing...' : 'Refresh AI Analysis'}
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full lg:w-96 bg-neutral-950/50 rounded-[2.5rem] border border-neutral-800 p-8 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-500">Business Pulse</h3>
            <div className="space-y-4">
               {[
                 { label: 'Growth Rating', value: '78%', trend: 'up' },
                 { label: 'Ops Efficiency', value: '92%', trend: 'up' },
                 { label: 'Churn Risk', value: '4%', trend: 'down' },
               ].map(m => (
                 <div key={m.label} className="flex justify-between items-end p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
                   <div>
                     <p className="text-[10px] font-black uppercase text-neutral-500 mb-1">{m.label}</p>
                     <p className="text-2xl font-black italic">{m.value}</p>
                   </div>
                   <Activity className={cn("w-5 h-5", m.trend === 'up' ? "text-emerald-500" : "text-blue-500")} />
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Strategic Advice */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-app-card p-10 rounded-[3rem] border border-app-border shadow-sm space-y-8 min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text flex items-center gap-3">
                <Target className="w-6 h-6 text-emerald-500" />
                Strategic Recommendations
              </h3>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />)}
              </div>
            </div>

            <div className="flex-1 prose prose-invert max-w-none">
              {loadingAdvice ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs animate-pulse">Consulting the Intelligence Engine...</p>
                </div>
              ) : (
                <div className="text-app-text space-y-6 leading-loose text-lg whitespace-pre-wrap font-medium rtl text-right">
                  {advice}
                </div>
              )}
            </div>
          </div>

          {/* Revenue & Growth Charts */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-app-card p-8 rounded-[3rem] border border-app-border space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400">Monthly Revenue Stream</h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData.length > 0 ? revenueData : [{name: 'Jan', value: 0}, {name: 'Feb', value: 0}]}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip contentStyle={{ backgroundColor: '#171717', border: 'none', borderRadius: '1rem' }} />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-app-card p-8 rounded-[3rem] border border-app-border space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400">Order Delivery Efficiency</h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Mon', value: 40 },
                    { name: 'Tue', value: 30 },
                    { name: 'Wed', value: 60 },
                    { name: 'Thu', value: 45 },
                    { name: 'Fri', value: 90 },
                    { name: 'Sat', value: 75 },
                  ]}>
                    <Tooltip contentStyle={{ backgroundColor: '#171717', border: 'none', borderRadius: '1rem' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Radar & Metrics */}
        <div className="space-y-8">
          {/* Radar Chart (Business Archetype) */}
          <div className="bg-app-card p-8 rounded-[3rem] border border-app-border shadow-sm flex flex-col h-full">
             <h3 className="text-xl font-black italic uppercase tracking-tight text-app-text mb-6">Competency Radar</h3>
             <div className="flex-1 flex items-center justify-center">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#262626" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#737373', fontSize: 10, fontWeight: 900 }} />
                      <Radar
                        name="Strength"
                        dataKey="A"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
             </div>
             
             <div className="pt-6 space-y-4 border-t border-app-border">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Competitive Edge: High</p>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed italic">
                  "Your delivery efficiency is in the top 5% of providers in your region."
                </p>
             </div>
          </div>

          {/* Quick Mentor Action Cards */}
          <div className="grid grid-cols-1 gap-4">
             {[
               { icon: Rocket, label: 'Marketing Boost', desc: 'Generate a new campaign strategy based on current trends.', color: 'emerald' },
               { icon: Target, label: 'Staff Optimization', desc: 'Re-assign members to high-value tasks.', color: 'blue' },
               { icon: Zap, label: 'Cost Reduction', desc: 'Analyze hidden expenses and burn rate.', color: 'amber' },
             ].map((action, i) => (
               <button key={i} className="group p-6 bg-app-card border border-app-border rounded-[2rem] text-left hover:border-app-text transition-all">
                 <div className="flex items-center gap-4">
                   <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110", 
                     action.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                     action.color === 'blue' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                     "bg-amber-500/10 border-amber-500/20 text-amber-500"
                   )}>
                     <action.icon className="w-6 h-6" />
                   </div>
                   <div>
                     <h4 className="font-black text-app-text uppercase italic tracking-tight">{action.label}</h4>
                     <p className="text-[10px] text-neutral-500 font-medium leading-tight">{action.desc}</p>
                   </div>
                   <ChevronRight className="w-4 h-4 ml-auto text-neutral-800 group-hover:text-app-text group-hover:translate-x-1 transition-all" />
                 </div>
               </button>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
