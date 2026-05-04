import { motion } from 'motion/react';
import { Search, MapPin, Star, ShieldCheck, Zap, Heart, Building2, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Home() {
  const navigate = useNavigate();
  const [featuredCompanies, setFeaturedCompanies] = useState<any[]>([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const list = await api.get<any[]>('/api/companies');
        setFeaturedCompanies((list || []).slice(0, 4));
      } catch {
        setFeaturedCompanies([]);
      }
    };
    fetchCompanies();
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

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 pointer-events-none opacity-20">
          <div className="absolute top-20 left-10 w-64 h-64 bg-neutral-200 dark:bg-neutral-800 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-neutral-200 dark:bg-neutral-800 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Featured Categories */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Home & Garden', icon: MapPin, desc: 'Repairs, cleaning, landscaping' },
          { title: 'Professional', icon: Star, desc: 'Legal, finance, consulting' },
          { title: 'Wellness', icon: Heart, desc: 'Fitness, health, beauty' },
        ].map((c) => (
          <motion.div
            key={c.title}
            whileHover={{ y: -4 }}
            className="p-8 bg-app-card border border-app-border rounded-[2rem] shadow-sm space-y-4"
          >
            <c.icon className="w-8 h-8 text-neutral-900 dark:text-white" />
            <h3 className="text-xl font-bold text-app-text">{c.title}</h3>
            <p className="text-neutral-500 text-sm">{c.desc}</p>
          </motion.div>
        ))}
      </section>

      {featuredCompanies.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black italic uppercase tracking-tight text-app-text">Featured Companies</h2>
            <Link to="/services" className="text-sm font-bold text-neutral-500 hover:text-app-text flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCompanies.map((company) => (
              <Link
                key={company.id}
                to={`/c/${company.id}`}
                className="group p-6 bg-app-card border border-app-border rounded-[2rem] hover:border-neutral-900 dark:hover:border-white transition-all shadow-sm"
              >
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6 text-neutral-900 dark:text-white" />
                </div>
                <h3 className="font-bold text-lg text-app-text mb-1">{company.name}</h3>
                <p className="text-xs text-neutral-500 line-clamp-2">{company.about || company.slogan || 'Local provider'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[3rem] p-12 md:p-20 text-center space-y-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <ShieldCheck className="w-12 h-12 mx-auto opacity-50" />
          <h2 className="text-4xl font-black italic uppercase tracking-tight">Safety first.</h2>
          <p className="text-neutral-400 dark:text-neutral-600 leading-relaxed">
            Every provider is verified through our multi-step KYC process. Your home and family deserve the best neighbors.
          </p>
          <div className="flex flex-wrap justify-center gap-8 pt-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
              <span className="text-sm font-bold uppercase tracking-widest">Instant Booking</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
              <span className="text-sm font-bold uppercase tracking-widest">Secure Payments</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
