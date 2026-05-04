import React, { useEffect, useState, useMemo } from 'react';
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
    void listInbox(activeWorkspaceId, ['matched'], 1, 1)
      .then((r) => {
        if (!cancelled) setInboxMatchedCount(r.total);
      })
      .catch(() => {
        if (!cancelled) setInboxMatchedCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, activeTab]);

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

  const focusRing = 'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
      <div className="flex max-h-[60px] flex-col gap-2 overflow-visible sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <WorkspaceSwitcher />
        <div className="flex min-w-0 items-center gap-3">
          <Building2 className="w-8 h-8 shrink-0 text-app-text" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-app-text">Company</h1>
            <p className="text-xs text-neutral-500 uppercase tracking-widest">Dashboard</p>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-30 -mx-1 px-1 py-2 bg-app-bg/90 backdrop-blur-sm border-b border-app-border/60">
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
                  'flex items-center gap-1.5 shrink-0 px-3.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all',
                  on
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg'
                    : 'bg-app-card border border-app-border text-neutral-500 hover:text-app-text',
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
      ) : activeTab === 'inbox' ? (
        <ProviderInboxSection />
      ) : activeTab === 'packages' ? (
        <ProviderPackagesSection />
      ) : activeTab === 'inventory' ? (
        <ProviderInventorySection />
      ) : (
        <>
          {company ? (
            <div className="rounded-3xl border border-app-border p-8 bg-app-card space-y-2">
              <p className="text-xl font-bold">{company.name}</p>
              <p className="text-sm text-neutral-500">{company.about || company.slogan || ''}</p>
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">No company linked to this account.</p>
          )}
          {activeTab !== 'overview' ? (
            <p className="text-sm text-neutral-500 rounded-2xl border border-dashed border-app-border p-6">
              This section is coming soon. Use the tabs above to switch areas.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
