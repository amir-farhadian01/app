import { motion } from 'motion/react';
import { Search, MapPin, Star, ShieldCheck, Zap, Heart, Building2, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import React, { useEffect, useState } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const [featuredCompanies, setFeaturedCompanies] = useState<any[]>([]);

  useEffect(() => {
    api.get<any[]>('/api/companies').then((data) => {
      setFeaturedCompanies((data || []).slice(0, 4));
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="relative py-12 overflow-hidden">
        <div className="relative z-10 text-center space-y-8 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 bg-app-card text-neutral-600 dark:text-neutral-400 text-xs font-bold uppercase tracking-widest rounded-full mb-6 border border-app-border shadow-sm">
              Trusted by 10,000+ Neighbors
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-app-text leading-[1.1]">
              Your neighborhood, <br />
              <span className="text-neutral-400 italic font-serif">at your service.</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-500 max-w-xl mx-auto leading-relaxed">
              Find trusted local professionals for everything from home repairs to personal training. Simple, secure, and right next door.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input 
                type="text" 
                placeholder="What do you need help with?" 
                className="w-full pl-12 pr-4 py-4 bg-app-card border border-app-border rounded-2xl shadow-xl shadow-neutral-200/10 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-app-text"
              />
            </div>
            <button 
              onClick={() => navigate('/services')}
              className="w-full sm:w-auto px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold rounded-2xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg shadow-neutral-900/20 active:scale-95"
            >
              Search
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-8 py-4 bg-app-card border border-app-border text-app-text font-bold rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200/5 active:scale-95"
            >
              Dashboard
            </button>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 pointer-events-none opacity-20">
          <div className="absolute top-20 left-10 w-64 h-64 bg-neutral-200 dark:bg-neutral-800 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-neutral-200 dark:bg-neutral-800 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Featured Categories */}
      <section className="space-y-12">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-app-text">Popular Services</h2>
            <p className="text-neutral-500">The most requested help in your area right now.</p>
          </div>
          <Link to="/services" className="text-sm font-bold text-neutral-900 dark:text-white hover:underline">
            View all categories →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { id: 'plumbing', name: 'Plumbing', icon: Zap, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
            { id: 'cleaning', name: 'Cleaning', icon: Star, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
            { id: 'gardening', name: 'Gardening', icon: Heart, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
            { id: 'moving', name: 'Moving', icon: Zap, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
            { id: 'repairs', name: 'Repairs', icon: ShieldCheck, color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' },
            { id: 'tutoring', name: 'Tutoring', icon: Star, color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
          ].map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(`/services?category=${cat.name}`)}
              className="group p-6 bg-app-card border border-app-border rounded-3xl hover:border-neutral-900 dark:hover:border-white transition-all cursor-pointer text-center space-y-4"
            >
              <div className={cn("w-12 h-12 mx-auto rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", cat.color)}>
                <cat.icon className="w-6 h-6" />
              </div>
              <span className="block font-bold text-sm text-app-text">{cat.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Discover Local Businesses (Explorer) */}
      <section className="space-y-12">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-app-text">Discover Local Businesses</h2>
            <p className="text-neutral-500">Support your neighbors and find the best local teams.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredCompanies.length > 0 ? featuredCompanies.map((company, i) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(`/c/${company.id}`)}
              className="group relative h-80 bg-neutral-100 dark:bg-neutral-800 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-xl shadow-neutral-200/20 dark:shadow-none"
            >
              <img 
                src={company.coverImageUrl || `https://picsum.photos/seed/${company.id}/600/800`} 
                alt={company.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white dark:bg-neutral-800 rounded-lg overflow-hidden border border-white/20">
                    <img src={company.logoUrl || `https://picsum.photos/seed/logo${company.id}/100/100`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{company.type || 'Local Business'}</span>
                </div>
                <h4 className="text-white font-black text-xl leading-tight">{company.name}</h4>
                <div className="flex items-center gap-2 mt-2 text-white/40 text-[10px] font-bold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{company.rating || '5.0'}</span>
                  <span>•</span>
                  <span>{company.address || 'Verified'}</span>
                </div>
              </div>
            </motion.div>
          )) : (
            // Skeleton / Placeholder
            [1,2,3,4].map(i => (
              <div key={i} className="h-80 bg-neutral-100 dark:bg-neutral-800 rounded-[2.5rem] animate-pulse" />
            ))
          )}
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-neutral-900 dark:bg-white rounded-[3rem] p-12 md:p-20 text-white dark:text-neutral-900 overflow-hidden relative">
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Safe, secure, and <br />
              <span className="text-neutral-400">verified neighbors.</span>
            </h2>
            <div className="space-y-6">
              {[
                { title: 'Identity Verified', desc: 'Every provider undergoes a strict background check.', icon: ShieldCheck },
                { title: 'Secure Payments', desc: 'Funds are held in escrow until the job is done.', icon: Zap },
                { title: 'Real Reviews', desc: 'Read honest feedback from people in your neighborhood.', icon: Star },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-10 h-10 bg-white/10 dark:bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-neutral-300 dark:text-neutral-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">{item.title}</h4>
                    <p className="text-neutral-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-neutral-800 dark:bg-neutral-100 rounded-[2rem] overflow-hidden border border-white/10 dark:border-neutral-200">
              <img 
                src="https://picsum.photos/seed/neighbor/800/800" 
                alt="Happy Neighbor" 
                className="w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 bg-app-card text-app-text p-6 rounded-3xl shadow-2xl space-y-2 max-w-[200px] border border-app-border">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm font-bold leading-tight">"Best service I've ever used for my home repairs!"</p>
              <p className="text-xs text-neutral-500">— Sarah J., Brooklyn</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
