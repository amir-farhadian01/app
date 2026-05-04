import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

/** Lightweight provider dashboard. */
export default function ProviderDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'home';
  const [requests, setRequests] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let c = false;
    const tick = async () => {
      try {
        const [r, s] = await Promise.all([api.get<any[]>('/api/requests'), api.get<any[]>('/api/services')]);
        if (c) return;
        setRequests((r || []).filter((x) => x.providerId === user.id));
        setServices((s || []).filter((x) => x.providerId === user.id));
      } catch {
        if (!c) {
          setRequests([]);
          setServices([]);
        }
      }
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      c = true;
      clearInterval(id);
    };
  }, [user?.id]);

  const focusRing = 'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
      <aside
        className="rounded-2xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        role="region"
        aria-labelledby="provider-kyc-banner-title"
      >
        <div>
          <p id="provider-kyc-banner-title" className="text-sm font-black text-app-text">
            Complete your business profile
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 max-w-prose">
            To complete Business KYC and start serving customers, create your company first.
          </p>
        </div>
        {/* TODO(ProviderDashboard.tsx:58): Point CTA at a real company-creation screen; repo has POST /api/companies but no dedicated UI yet. */}
        <Link
          to="/profile"
          className={cn(
            'shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-black uppercase tracking-widest',
            focusRing,
          )}
        >
          Create company
        </Link>
      </aside>
      <header className="flex items-center gap-3">
        <ClipboardList className="w-8 h-8" />
        <div>
          <h1 className="text-2xl font-black text-app-text">Provider hub</h1>
          <p className="text-xs text-neutral-500">Tab: {tab}</p>
        </div>
      </header>
      <section className="rounded-3xl border border-app-border p-6 bg-app-card">
        <h2 className="font-black text-sm uppercase text-neutral-400 mb-4">My services ({services.length})</h2>
        <ul className="space-y-2 text-sm">
          {services.map((s) => (
            <li key={s.id}>
              <button type="button" className="text-left underline" onClick={() => navigate(`/service/${s.id}`)}>
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl border border-app-border p-6 bg-app-card">
        <h2 className="font-black text-sm uppercase text-neutral-400 mb-4">Requests ({requests.length})</h2>
        <ul className="space-y-2 text-sm">
          {requests.map((r) => (
            <li key={r.id}>
              #{r.id.slice(0, 8)} — {r.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
