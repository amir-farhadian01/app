import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
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
  Star,
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
import { listInbox } from '../services/providerInbox';
import { getProviderDashboardOverview, getProviderPipelineOrders, type MyOrderListItem, type ProviderDashboardOverview } from '../services/orders.js';

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

function moneyCad(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

function shortTime(row: MyOrderListItem): string {
  if (!row.scheduledAt) return row.scheduleFlexibility === 'asap' ? 'ASAP' : 'Flex';
  const d = new Date(row.scheduledAt);
  if (Number.isNaN(d.getTime())) return 'Flex';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function businessStatusLabel(status: string): string {
  const map: Record<string, string> = {
    submitted: 'Pending',
    matching: 'Pending',
    matched: 'Confirmed',
    contracted: 'Confirmed',
    paid: 'Confirmed',
    in_progress: 'Active',
    completed: 'Done',
    closed: 'Done',
    disputed: 'Review',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

function businessStatusTone(status: string): string {
  if (['matched', 'contracted', 'paid'].includes(status)) return 'bg-[#2b6eff]/15 text-[#2b6eff]';
  if (['submitted', 'matching'].includes(status)) return 'bg-[#ffb800]/15 text-[#ffb800]';
  if (['completed', 'closed'].includes(status)) return 'bg-[#0fc98a]/15 text-[#0fc98a]';
  return 'bg-[#8b5cf6]/15 text-[#8b5cf6]';
}

/** Lightweight company dashboard. */
export default function CompanyDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeWorkspaceId, loading: workspaceLoading } = useWorkspace();
  const activeTab = useMemo(() => tabFromSearchParam(searchParams.get('tab')), [searchParams]);
  const [company, setCompany] = useState<any>(null);
  const [inboxMatchedCount, setInboxMatchedCount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewStats, setOverviewStats] = useState<ProviderDashboardOverview | null>(null);
  const [pipelineItems, setPipelineItems] = useState<MyOrderListItem[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!activeWorkspaceId || activeTab !== 'overview') {
      setOverviewError(null);
      if (!activeWorkspaceId) setOverviewStats(null);
      return;
    }

    let cancelled = false;
    setOverviewLoading(true);
    setOverviewError(null);
    void getProviderDashboardOverview(activeWorkspaceId)
      .then((payload) => {
        if (!cancelled) setOverviewStats(payload);
      })
      .catch((e) => {
        if (!cancelled) setOverviewError(e instanceof Error ? e.message : 'Could not load overview');
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, activeTab]);

  useEffect(() => {
    if (!activeWorkspaceId || activeTab !== 'overview') {
      if (!activeWorkspaceId) setPipelineItems([]);
      setPipelineError(null);
      return;
    }

    let cancelled = false;
    setPipelineLoading(true);
    setPipelineError(null);
    void getProviderPipelineOrders({ page: 1, pageSize: 12 })
      .then((res) => {
        if (!cancelled) {
          setPipelineItems(res.items.filter((row) => row.matchedWorkspaceId === activeWorkspaceId));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPipelineItems([]);
          setPipelineError(e instanceof Error ? e.message : 'Could not load jobs');
        }
      })
      .finally(() => {
        if (!cancelled) setPipelineLoading(false);
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

  const focusRing = 'focus:outline-none focus:ring-2 focus:ring-[#2b6eff] focus:ring-offset-2 focus:ring-offset-[#0d0f1a]';
  const todayAppointments = pipelineItems.slice(0, 4);
  const recentOrders = pipelineItems.slice(0, 3);
  const companyName = company?.name || 'My Business';
  const companySubtitle = company?.slogan || company?.about || 'Dashboard';

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
      ) : (
        <>
          {activeTab === 'overview' ? (
            <section className="space-y-5">
              <div className="rounded-[1.15rem] border border-[#2a2f4a] bg-[#131624] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff7a2b] text-sm font-black text-white">
                      {(companyName[0] || 'B').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black tracking-tight text-white">My Business</h2>
                      <p className="truncate text-xs font-semibold text-[#4a4f70]">
                        {companyName}{companySubtitle ? ` · ${companySubtitle}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg border border-[#0fc98a]/40 bg-[#0fc98a]/10 px-3 py-1 text-[11px] font-black text-[#0fc98a]">
                    Live
                  </span>
                </div>
              </div>

              {overviewError ? (
                <div className="flex items-start gap-3 rounded-[1.15rem] border border-[#ffb800]/35 bg-[#ffb800]/10 p-4 text-sm text-amber-100">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ffb800]" />
                  <span>{overviewError}</span>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <BusinessMetric
                  value={overviewLoading ? '...' : String(overviewStats?.totalOrders ?? 0)}
                  label="Today's Appointments"
                  trend="Connected to orders"
                  tone="text-[#2b6eff]"
                />
                <BusinessMetric
                  value={String(inboxMatchedCount)}
                  label="Pending Requests"
                  trend="Connected to inbox"
                  tone="text-[#ffb800]"
                />
                <BusinessMetric
                  value={overviewLoading ? '...' : moneyCad(overviewStats?.totalEarnings ?? 0)}
                  label="Revenue"
                  trend="From completed/paid records"
                  tone="text-[#0fc98a]"
                />
                <div className="rounded-[0.9rem] border border-dashed border-[#ff7a2b]/45 bg-[#ff7a2b]/10 p-4">
                  <div className="flex items-center gap-1 text-2xl font-black text-[#8b5cf6]">
                    N/A
                    <Star className="h-5 w-5 fill-[#ffb800] text-[#ffb800]" />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-[#4a4f70]">Avg Rating</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#ff7a2b]">Backend not ready</p>
                </div>
              </div>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#8b90b0]">Today's Appointments</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      p.set('tab', 'schedule');
                      navigate({ pathname: '/dashboard', search: p.toString() });
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2b6eff]"
                  >
                    See all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {pipelineLoading ? (
                  <div className="rounded-[0.9rem] border border-[#2a2f4a] bg-[#1e2235] p-4 text-sm text-[#8b90b0]">
                    Loading appointments...
                  </div>
                ) : pipelineError ? (
                  <div className="rounded-[0.9rem] border border-[#ffb800]/35 bg-[#ffb800]/10 p-4 text-sm text-amber-100">
                    {pipelineError}
                  </div>
                ) : todayAppointments.length ? (
                  <div className="space-y-2">
                    {todayAppointments.map((row) => (
                      <Link
                        key={row.id}
                        to={`/orders/${row.id}`}
                        className={cn(
                          'flex items-center gap-3 rounded-[0.9rem] border border-[#2a2f4a] bg-[#1e2235] p-3 transition hover:border-[#2b6eff]',
                          focusRing,
                        )}
                      >
                        <span className="w-12 shrink-0 text-center text-[11px] font-semibold leading-4 text-[#4a4f70]">{shortTime(row)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-white">Customer order</span>
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#8b90b0]">
                            {row.serviceCatalog.name}
                          </span>
                        </span>
                        <span className={cn('shrink-0 rounded-lg px-2 py-1 text-[10px] font-black', businessStatusTone(row.status))}>
                          {businessStatusLabel(row.status)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[0.9rem] border border-dashed border-[#2a2f4a] bg-[#1e2235]/70 p-5 text-center text-sm text-[#8b90b0]">
                    No active appointments yet. New accepted jobs will appear here.
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black text-[#8b90b0]">Recent Orders</h3>
                {recentOrders.length ? (
                  <div className="space-y-2">
                    {recentOrders.map((row) => (
                      <Link
                        key={row.id}
                        to={`/orders/${row.id}`}
                        className={cn('flex items-center justify-between rounded-[0.9rem] border border-[#2a2f4a] bg-[#1e2235] p-3', focusRing)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-white">{row.serviceCatalog.name}</span>
                          <span className="text-[11px] font-semibold text-[#8b90b0]">#{row.id.slice(0, 8).toUpperCase()}</span>
                        </span>
                        <span className={cn('ml-3 shrink-0 rounded-lg px-2 py-1 text-[10px] font-black', businessStatusTone(row.status))}>
                          {businessStatusLabel(row.status)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[0.9rem] border border-dashed border-[#2a2f4a] bg-[#1e2235]/70 p-4 text-sm text-[#8b90b0]">
                    No recent orders for this workspace.
                  </div>
                )}
              </section>

              <section className="grid gap-2 sm:grid-cols-2">
                <CapabilityCard label="Inbox" ready onClick={() => navigate('/dashboard?tab=inbox')} />
                <CapabilityCard label="Schedule" ready onClick={() => navigate('/dashboard?tab=schedule')} />
                <CapabilityCard label="Finance" ready onClick={() => navigate('/dashboard?tab=finance')} />
                <CapabilityCard label="Staff" ready onClick={() => navigate('/dashboard?tab=staff')} />
                <CapabilityCard label="B2B network" />
                <CapabilityCard label="Insights AI" />
              </section>
            </section>
          ) : null}
          {!company && activeTab === 'overview' ? <p className="text-sm text-[#8b90b0]">No company linked to this account.</p> : null}
          {activeTab !== 'overview' ? (
            <p className="rounded-2xl border border-dashed border-[#ff7a2b]/40 bg-[#ff7a2b]/10 p-6 text-sm font-semibold text-[#ffb38a]">
              This section is not fully connected yet. Ready sections are highlighted on the overview.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function BusinessMetric({
  value,
  label,
  trend,
  tone,
}: {
  value: string;
  label: string;
  trend: string;
  tone: string;
}) {
  return (
    <div className="rounded-[0.9rem] border border-[#2a2f4a] bg-[#1e2235] p-4">
      <p className={cn('text-2xl font-black tracking-tight', tone)}>{value}</p>
      <p className="mt-2 text-[11px] font-semibold text-[#4a4f70]">{label}</p>
      <p className="mt-2 text-[10px] font-bold text-[#0fc98a]">{trend}</p>
    </div>
  );
}

function CapabilityCard({ label, ready, onClick }: { label: string; ready?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!ready}
      className={cn(
        'flex items-center justify-between rounded-[0.9rem] border p-3 text-left transition',
        ready
          ? 'border-[#0fc98a]/35 bg-[#0fc98a]/10 text-white hover:border-[#0fc98a]'
          : 'cursor-not-allowed border-[#ff7a2b]/35 bg-[#ff7a2b]/10 text-[#ffb38a]',
      )}
    >
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide">
          {ready ? 'Connected' : 'Backend not ready'}
        </span>
      </span>
      {ready ? <ArrowRight className="h-4 w-4 text-[#0fc98a]" /> : <AlertTriangle className="h-4 w-4 text-[#ff7a2b]" />}
    </button>
  );
}
