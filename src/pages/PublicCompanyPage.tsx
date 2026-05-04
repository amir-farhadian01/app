import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { handleApiError, OperationType } from '../lib/errors';
import { motion } from 'motion/react';
import { Building2, Star, MapPin, Phone, Globe, Instagram, Facebook, Twitter, Linkedin, CheckCircle2, Briefcase, Users, ArrowLeft, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

export default function PublicCompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await api.get<any>(`/api/companies/${id}`);
        if (cancelled) return;
        setCompany(data);
        const svc = await api.get<any[]>(`/api/services?providerId=${encodeURIComponent(data.ownerId)}`);
        if (cancelled) return;
        setServices(svc || []);
      } catch (e) {
        await handleApiError(e, OperationType.GET, `companies/${id}`);
        if (!cancelled) setCompany(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    tick();
    const iv = setInterval(tick, 10000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <Building2 className="w-16 h-16 text-neutral-200 mx-auto" />
        <h2 className="text-2xl font-black italic uppercase tracking-tight">Company Not Found</h2>
        <button onClick={() => navigate('/')} className="text-sm font-bold text-neutral-400 hover:text-neutral-900 underline">Return Home</button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Header */}
      <section className="relative h-[400px] rounded-[3rem] overflow-hidden group">
        {company.coverImageUrl ? (
          <img src={company.coverImageUrl} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
            <Building2 className="w-20 h-20 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row items-end justify-between gap-8">
          <div className="flex items-end gap-8">
            <div className="w-32 h-32 bg-white rounded-[2rem] border-4 border-white shadow-2xl overflow-hidden shrink-0">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-neutral-50 flex items-center justify-center text-neutral-300">
                  <Building2 className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="mb-2 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-white tracking-tight">{company.name}</h1>
                <CheckCircle2 className="w-6 h-6 text-blue-400 fill-blue-400/20" />
              </div>
              <p className="text-white/80 font-bold italic text-lg">{company.slogan}</p>
              <div className="flex items-center gap-4 text-white/60 text-xs font-black uppercase tracking-widest">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {company.rating || '5.0'}</span>
                <span>•</span>
                <span>{company.experienceDate ? `Since ${company.experienceDate}` : 'New Provider'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {company.address || 'Local Area'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mb-2">
            <button className="px-8 py-4 bg-white text-neutral-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl">
              Book Service
            </button>
            <button className="p-4 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10">
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Left Column: About & Services */}
        <div className="lg:col-span-2 space-y-12">
          <section className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm space-y-6">
            <h3 className="text-2xl font-black italic uppercase tracking-tight">About Our Business</h3>
            <p className="text-neutral-600 leading-relaxed text-lg">
              {company.about || "We are a dedicated team of professionals committed to providing top-tier services to our neighborhood. With years of experience and a passion for excellence, we ensure every job is handled with care and precision."}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-neutral-50">
              {[
                { label: 'Team Size', value: company.members?.length || 1, icon: Users },
                { label: 'Completed', value: '150+', icon: CheckCircle2 },
                { label: 'Experience', value: '5+ Years', icon: Briefcase },
                { label: 'Verified', value: 'Yes', icon: ShieldCheck },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{item.label}</p>
                  <p className="font-bold text-neutral-900">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-8">
            <h3 className="text-2xl font-black italic uppercase tracking-tight">Our Services</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {services.map(service => (
                <div 
                  key={service.id}
                  onClick={() => navigate(`/service/${service.id}`)}
                  className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:border-neutral-900 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-neutral-50 text-neutral-400 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                      {service.category}
                    </span>
                    <span className="text-xl font-black italic">${service.price}</span>
                  </div>
                  <h4 className="text-xl font-black tracking-tight mb-2">{service.title}</h4>
                  <p className="text-sm text-neutral-500 line-clamp-2">{service.description}</p>
                </div>
              ))}
              {services.length === 0 && (
                <div className="col-span-full p-12 text-center bg-neutral-50 rounded-[2rem] border border-dashed border-neutral-200">
                  <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No services listed yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Contact & Social */}
        <div className="space-y-8">
          <section className="bg-neutral-900 text-white p-10 rounded-[3rem] space-y-8 shadow-2xl shadow-neutral-900/20">
            <h3 className="text-xl font-black italic uppercase tracking-tight">Contact Info</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Phone</p>
                  <p className="font-bold">{company.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Website</p>
                  <a href={company.website} target="_blank" rel="noreferrer" className="font-bold hover:underline">{company.website || 'N/A'}</a>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-white/10">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Social Media</p>
              <div className="flex gap-3">
                {[
                  { icon: Instagram, link: company.socialLinks?.instagram },
                  { icon: Facebook, link: company.socialLinks?.facebook },
                  { icon: Twitter, link: company.socialLinks?.twitter },
                  { icon: Linkedin, link: company.socialLinks?.linkedin },
                ].filter(s => s.link).map((social, i) => (
                  <a 
                    key={i} 
                    href={social.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white hover:text-neutral-900 transition-all"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black italic uppercase tracking-tight">Business Hours</h3>
            <div className="space-y-3">
              {['Monday - Friday', 'Saturday', 'Sunday'].map(day => (
                <div key={day} className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 font-medium">{day}</span>
                  <span className="font-bold text-neutral-900">{day.includes('Sunday') ? 'Closed' : '08:00 - 18:00'}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck(props: any) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
