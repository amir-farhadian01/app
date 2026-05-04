import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, Camera, MapPin, 
  Clock, Zap, Shield, Sparkles, CheckCircle2,
  Search, Wrench, Eraser, Truck, Home, Droplets
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const CATEGORIES = [
  { id: 'cleaning', label: 'Cleaning', icon: Eraser, color: 'emerald' },
  { id: 'handyman', label: 'Handyman', icon: Wrench, color: 'blue' },
  { id: 'moving', label: 'Moving', icon: Truck, color: 'amber' },
  { id: 'plumbing', label: 'Plumbing', icon: Droplets, color: 'cyan' },
  { id: 'electrical', label: 'Electrical', icon: Zap, color: 'yellow' },
  { id: 'other', label: 'Other', icon: Home, color: 'purple' },
];

export default function OrderWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState({
    category: '',
    description: '',
    address: '',
    budget: '',
    urgency: 'routine',
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setStep(4); // Move to broadcasting step

    try {
      const trackingNumber = `NBRLY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await addDoc(collection(db, 'requests'), {
        ...orderData,
        trackingNumber,
        status: 'broadcasting',
        customerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });

      // Simulate broadcasting for 3 seconds
      setTimeout(() => {
        navigate('/dashboard?tab=requests');
      }, 5000);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-app-text">What do you need?</h2>
              <p className="text-neutral-500 text-sm">Select a service category to begin broadcasting your request.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setOrderData({ ...orderData, category: cat.id });
                    nextStep();
                  }}
                  className={cn(
                    "p-8 bg-app-card border border-app-border rounded-[2.5rem] flex flex-col items-center gap-4 transition-all hover:scale-105 active:scale-95 group",
                    orderData.category === cat.id ? "border-emerald-500 shadow-xl shadow-emerald-500/10" : "hover:border-neutral-300 dark:hover:border-neutral-700"
                  )}
                >
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors shadow-inner",
                    orderData.category === cat.id ? "bg-emerald-500 text-black" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white"
                  )}>
                    <cat.icon className="w-8 h-8" />
                  </div>
                  <span className="font-black italic uppercase tracking-widest text-[10px] text-app-text">{cat.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={prevStep} className="p-3 bg-app-card border border-app-border rounded-xl text-neutral-500 hover:text-app-text">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-1 flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-1/3" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Service Details</h3>
                <textarea
                  className="w-full h-40 p-6 bg-app-card border border-app-border rounded-[2rem] focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-app-text"
                  placeholder="Tell us what needs to be done. The more detail, the better the offers..."
                  value={orderData.description}
                  onChange={(e) => setOrderData({ ...orderData, description: e.target.value })}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-app-border">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-2">Urgency Level</h4>
                <div className="grid grid-cols-2 gap-3">
                  {['routine', 'emergency'].map(u => (
                    <button
                      key={u}
                      onClick={() => setOrderData({ ...orderData, urgency: u })}
                      className={cn(
                        "py-4 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all",
                        orderData.urgency === u 
                          ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent shadow-xl" 
                          : "border-app-border text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold"
                      )}
                    >
                      {u === 'routine' ? 'Routine Task' : '⚡ Emergency'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={nextStep}
              disabled={!orderData.description}
              className="w-full py-5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 hover:scale-105 active:scale-95 transition-all mt-8"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={prevStep} className="p-3 bg-app-card border border-app-border rounded-xl text-neutral-500 hover:text-app-text">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-1 flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-2/3" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Logistics</h3>
                <p className="text-neutral-500 text-xs">Where and how much are you looking to spend?</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    className="w-full pl-16 pr-6 py-5 bg-app-card border border-app-border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    placeholder="Work Address"
                    value={orderData.address}
                    onChange={(e) => setOrderData({ ...orderData, address: e.target.value })}
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-neutral-400">$</span>
                  <input
                    type="number"
                    className="w-full pl-12 pr-6 py-5 bg-app-card border border-app-border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    placeholder="Estimated Budget"
                    value={orderData.budget}
                    onChange={(e) => setOrderData({ ...orderData, budget: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[2rem] flex items-center gap-4">
                <Shield className="w-6 h-6 text-emerald-500" />
                <p className="text-[10px] text-emerald-600/80 font-bold leading-relaxed">
                  Your funds are protected by our Escrow system. You only pay when the job is completed to your satisfaction.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!orderData.address || !orderData.budget || loading}
              className="w-full py-5 bg-emerald-500 text-black rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 hover:scale-105 active:scale-95 transition-all mt-8"
            >
              🚀 Broadcast Request
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center space-y-12 py-12"
          >
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-20"
              />
              <div className="relative w-48 h-48 bg-app-card border-8 border-emerald-500/10 rounded-[3rem] flex items-center justify-center overflow-hidden shadow-inner">
                <motion.div 
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1] 
                  }}
                  transition={{ 
                    rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 2, repeat: Infinity }
                  }}
                  className="absolute inset-0 opacity-10"
                >
                  <Search className="w-full h-full text-emerald-500 p-8" />
                </motion.div>
                <div className="relative">
                   <Zap className="w-16 h-16 text-emerald-500" />
                   <motion.div 
                     animate={{ opacity: [0, 1, 0] }}
                     transition={{ duration: 1.5, repeat: Infinity }}
                     className="absolute -top-2 -right-2"
                   >
                     <Sparkles className="w-6 h-6 text-emerald-300" />
                   </motion.div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4 max-w-sm">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-app-text">Broadcasting...</h2>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Your request is being sent to qualified providers in your neighborhood. We'll notify you as soon as someone accepts the challenge.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
               <div className="p-4 bg-app-card border border-app-border rounded-2xl flex flex-col items-center gap-2">
                 <span className="text-[8px] font-black uppercase text-neutral-400">Scan Radius</span>
                 <span className="font-black text-emerald-500">5.2 KM</span>
               </div>
               <div className="p-4 bg-app-card border border-app-border rounded-2xl flex flex-col items-center gap-2">
                 <span className="text-[8px] font-black uppercase text-neutral-400">Providers</span>
                 <span className="font-black text-emerald-500">12 Active</span>
               </div>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 animate-pulse">Establishing secure channel...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
