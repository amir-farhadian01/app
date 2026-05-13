import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Inbox,
  Building2,
  LayoutDashboard,
  Users,
  Wallet,
  Calendar,
  Network,
  BarChart3,
  ShieldCheck,
  Tag,
  Boxes,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useWorkspace } from '../lib/WorkspaceContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { BusinessKycFlow } from '../components/kyc/business/BusinessKycFlow';
import { WorkspaceSwitcher } from '../components/workspace/WorkspaceSwitcher';
import { ProviderPackagesSection } from '../components/provider/packages/ProviderPackagesSection';
import { ProviderInventorySection } from '../components/provider/inventory/ProviderInventorySection';
import { ProviderInboxSection } from '../components/provider/inbox/ProviderInboxSection';
import { ProviderFinanceSection } from '../components/provider/finance/ProviderFinanceSection.js';
import { ProviderScheduleSection } from '../components/provider/schedule/ProviderScheduleSection.js';
import { ProviderStaffSection } from '../components/provider/staff/ProviderStaffSection.js';
import { ProviderOverviewSection } from '../components/provider/overview/ProviderOverviewSection';
import { listInbox } from '../services/providerInbox';

type Tab = 'inbox' | 'overview' | 'staff' | 'finance' | 'schedule' | 'b2b' | 'insights' | 'packages' | 'inventory' | 'kyc';

function tabFromSearchParam(raw: string | null): Tab {
  if (!raw) return 'overview';
  const allowed: Tab[] = [
    'inbox',
    'overview',
    'staff',
    'finance',
    'schedule',
    'b2b',
    'insights',
    'packages',
    'inventory',
    'kyc',
  ];
  if (allowed.includes(raw as Tab)) return raw as Tab;
  if (raw === 'company') return 'overview';
  if (raw === 'members') return 'staff';
  return 'overview';
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'b2b', label: 'B2B', icon: Network },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'packages', label: 'My Packages', icon: Tag },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'kyc', label: 'Business KYC', icon: ShieldCheck },
];

/** Lightweight company dashboard. */
export default function CompanyDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeWorkspaceId, loading: workspaceLoading } = useWorkspace();
  const activeTab = useMemo(() => tabFromSearchParam(searchParams.get('tab')), [searchParams]);
  const [company, setCompany] = useState<any>(null);
  const [inboxMatchedCount, setInboxMatchedCount] = useState(0);
  const [companyLoading, setCompanyLoading] = useState(true);
  const companyTargetId = activeWorkspaceId ?? user?.companyId;

  const showKycTab = user?.role === 'provider' || !!user?.companyId;
  const visibleTabs = useMemo(() => TABS.filter((t) => t.id !== 'kyc' || showKycTab), [showKycTab]);
  const refreshInboxMatchedCount = useCallback(async () => {
    if (!activeWorkspaceId) {
      setInboxMatchedCount(0);
      return;
    }
    try {
      const r = await listInbox(activeWorkspaceId, ['matched'], 1, 1);
      setInboxMatchedCount(r.total);
    } catch {
      setInboxMatchedCount(0);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (!raw || !company) return;
    if (raw === 'company' || raw === 'members') {
      const next = raw === 'company' ? 'overview' : 'staff';
      const p = new URLSearchParams(searchParams);
      p.set('tab', next);
      navigate({ pathname: '/dashboard', search: p.toString() }, { replace: true });
    }
  }, [company, searchParams, navigate]);

  useEffect(() => {
    if (activeTab === 'kyc' && !showKycTab) {
      const p = new URLSearchParams(searchParams);
      p.set('tab', 'overview');
      navigate({ pathname: '/dashboard', search: p.toString() }, { replace: true });
    }
  }, [activeTab, showKycTab, navigate, searchParams]);

  useEffect(() => {
    if (workspaceLoading) {
      return;
    }
    if (!companyTargetId) {
      setCompanyLoading(false);
      setCompany(null);
      return;
    }
    let c = false;
    setCompanyLoading(true);
    api
      .get(`/api/companies/${companyTargetId}`)
      .then((co) => {
        if (!c) setCompany(co);
      })
      .catch(() => {
        if (!c) setCompany(null);
      })
      .finally(() => {
        if (!c) setCompanyLoading(false);
      });
    return () => {
      c = true;
    };
  }, [companyTargetId, workspaceLoading]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setInboxMatchedCount(0);
      return;
    }
    let cancelled = false;
    void refreshInboxMatchedCount();
    const onFocus = () => {
      if (!cancelled) void refreshInboxMatchedCount();
    };
    const onVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible') void refreshInboxMatchedCount();
    };
    const interval = window.setInterval(() => {
      if (!cancelled) void refreshInboxMatchedCount();
    }, 30000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeWorkspaceId, refreshInboxMatchedCount]);

  const flowCompany = useMemo(() => {
    if (!company) return null;
    return {
      id: company.id as string,
      name: company.name as string,
      ownerId: company.ownerId as string,
      members: (company.members || []).map((m: { userId: string; role: string }) => ({
        userId: m.userId,
        role: m.role,
      })),
    };
  }, [company]);

  const focusRing = 'focus:outline-none focus:ring-2 focus:ring-[#2b6eff] focus:ring-offset-2 focus:ring-offset-[#0d0f1a]';


  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pb-24 text-[#f0f2ff]">
      <div className="flex max-h-[60px] flex-col gap-2 overflow-visible sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <WorkspaceSwitcher />
        <div className="flex min-w-0 items-center gap-3">
          <Building2 className="w-8 h-8 shrink-0 text-[#ff7a2b]" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-white">My Business</h1>
            <p className="text-xs uppercase tracking-widest text-[#4a4f70]">Business dashboard</p>
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-30 -mx-4 border-y border-[#2a2f4a] bg-[#0d0f1a]/95 px-4 py-2 backdrop-blur-xl">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Company sections">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const on = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('tab', t.id);
                  navigate({ pathname: '/dashboard', search: p.toString() });
                }}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all',
                  on
                    ? 'border-[#ff7a2b] bg-[#ff7a2b]/15 text-[#ff7a2b]'
                    : 'border-[#2a2f4a] bg-[#1e2235] text-[#8b90b0] hover:border-[#ff7a2b]/60 hover:text-white',
                  focusRing,
                )}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {t.label}
                {t.id === 'inbox' && inboxMatchedCount > 0 ? (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                    {inboxMatchedCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'kyc' ? (
        !companyTargetId ? (
          <div
            className="rounded-2xl border border-app-border bg-app-card p-6 space-y-3"
            role="region"
            aria-labelledby="kyc-no-company-title"
          >
            <h2 id="kyc-no-company-title" className="text-lg font-black text-app-text">
              Set up a company first
            </h2>
            <p className="text-sm text-neutral-500">
              Business KYC is tied to a company. Create or join a company, then return here.
            </p>
            <Link
              to={{ pathname: '/dashboard', search: (() => {
                const p = new URLSearchParams(searchParams);
                p.set('tab', 'overview');
                return p.toString();
              })() }}
              className={cn(
                'inline-flex items-center justify-center px-5 py-2.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-bold',
                focusRing,
              )}
            >
              Go to overview
            </Link>
          </div>
        ) : companyLoading ? (
          <div className="rounded-2xl border border-app-border bg-app-card p-8 text-center text-neutral-500" aria-busy="true">
            Loading company…
          </div>
        ) : !flowCompany || !user?.id || !companyTargetId ? (
          <p className="text-neutral-500 text-sm">Could not load company.</p>
        ) : (
          <BusinessKycFlow userId={user.id} companyId={companyTargetId} company={flowCompany} />
        )
      ) : activeTab === 'staff' ? (
        <ProviderStaffSection />
      ) : activeTab === 'finance' ? (
        <ProviderFinanceSection />
      ) : activeTab === 'schedule' ? (
        <ProviderScheduleSection />
      ) : activeTab === 'inbox' ? (
        <ProviderInboxSection onInboxMutation={() => void refreshInboxMatchedCount()} />
      ) : activeTab === 'packages' ? (
        <ProviderPackagesSection />
      ) : activeTab === 'inventory' ? (
        <ProviderInventorySection />
      ) : activeTab === 'overview' ? (
        activeWorkspaceId ? (
          <ProviderOverviewSection workspaceId={activeWorkspaceId} inboxCount={inboxMatchedCount} />
        ) : (
          <p className="text-sm text-[#8b90b0]">No workspace linked to this account.</p>
        )
      ) : (
        <p className="rounded-2xl border border-dashed border-[#ff7a2b]/40 bg-[#ff7a2b]/10 p-6 text-sm font-semibold text-[#ffb38a]">
          This section is not fully connected yet.
        </p>
      )}
    </div>
  );
}

