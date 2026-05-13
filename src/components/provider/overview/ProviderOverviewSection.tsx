import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { fetchWorkspaceFinance, type ProviderWorkspaceFinanceResponse } from '../../../services/providerFinance';
import { getProviderPipelineOrders, type MyOrderListItem } from '../../../services/orders';
import { cn } from '../../../lib/utils';

function moneyCad(value: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency === 'MIXED' || !currency ? 'CAD' : currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function maskName(displayName: string | null | undefined): string {
  if (!displayName) return 'Customer';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[1]![0]}.`;
}

function statusTone(status: string): string {
  if (['matched', 'contracted', 'paid'].includes(status)) return 'bg-[#2b6eff]/15 text-[#2b6eff]';
  if (['submitted', 'matching'].includes(status)) return 'bg-[#ffb800]/15 text-[#ffb800]';
  if (['completed', 'closed'].includes(status)) return 'bg-[#0fc98a]/15 text-[#0fc98a]';
  return 'bg-[#8b5cf6]/15 text-[#8b5cf6]';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    submitted: 'Pending', matching: 'Pending', matched: 'Confirmed',
    contracted: 'Confirmed', paid: 'Confirmed', in_progress: 'Active',
    completed: 'Done', closed: 'Done', disputed: 'Review',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface Props {
  workspaceId: string;
  inboxCount: number;
}

export function ProviderOverviewSection({ workspaceId, inboxCount }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Finance — fetched once per workspaceId
  const [finance, setFinance] = useState<ProviderWorkspaceFinanceResponse | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const lastFetchedWsId = useRef<string | null>(null);

  useEffect(() => {
    if (lastFetchedWsId.current === workspaceId) return;
    lastFetchedWsId.current = workspaceId;
    let cancelled = false;
    setFinanceLoading(true);
    setFinanceError(null);
    fetchWorkspaceFinance(workspaceId)
      .then((data) => { if (!cancelled) setFinance(data); })
      .catch((e) => { if (!cancelled) setFinanceError(e instanceof Error ? e.message : 'Could not load finance'); })
      .finally(() => { if (!cancelled) setFinanceLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  // Recent activity — last 5 provider orders
  const [recentOrders, setRecentOrders] = useState<MyOrderListItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRecentLoading(true);
    getProviderPipelineOrders({ page: 1, pageSize: 5 })
      .then((res) => {
        if (!cancelled) {
          setRecentOrders(res.items.filter((r) => r.matchedWorkspaceId === workspaceId));
        }
      })
      .catch(() => { if (!cancelled) setRecentOrders([]); })
      .finally(() => { if (!cancelled) setRecentLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const summary = finance?.summary;
  const activeOrdersCount = recentOrders.filter((r) =>
    ['matched', 'contracted', 'paid', 'in_progress'].includes(r.status)
  ).length;

  function goTab(tab: string) {
    const p = new URLSearchParams(searchParams);
    p.set('tab', tab);
    navigate({ pathname: '/dashboard', search: p.toString() });
  }

  return (
    <section className="space-y-5">
      {financeError && (
        <div className="flex items-start gap-3 rounded-[1.15rem] border border-[#ffb800]/35 bg-[#ffb800]/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ffb800]" />
          <span>{financeError}</span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Active Orders"
          value={recentLoading ? null : activeOrdersCount}
          tone="text-[#2b6eff]"
          loading={recentLoading}
        />
        <KpiCard
          label="Pending Inbox"
          value={inboxCount}
          tone="text-[#ffb800]"
          loading={false}
        />
        <KpiCard
          label="Est. Earnings"
          value={
            financeLoading || !summary
              ? null
              : summary.mixedCurrency
              ? moneyCad(summary.estimatedEarnings, 'CAD')
              : moneyCad(summary.estimatedEarnings, summary.displayCurrency)
          }
          tone="text-[#0fc98a]"
          loading={financeLoading}
          unavailableHint="Coming soon"
        />
      </div>

      {/* Recent activity feed */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-[#8b90b0]">Recent Activity</h3>
        {recentLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-[0.9rem] bg-[#1e2235]" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="rounded-[0.9rem] border border-dashed border-[#2a2f4a] bg-[#1e2235]/70 p-5 text-center text-sm text-[#8b90b0]">
            No recent orders for this workspace.
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((row) => {
              const customerName = maskName(
                row.matchedSummary?.provider?.displayName ??
                row.matchedSummary?.provider?.firstName
              );
              return (
                <Link
                  key={row.id}
                  to={`/orders/${row.id}`}
                  className="flex items-center gap-3 rounded-[0.9rem] border border-[#2a2f4a] bg-[#1e2235] p-3 transition hover:border-[#2b6eff] focus:outline-none focus:ring-2 focus:ring-[#2b6eff]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-white">
                      {row.serviceCatalog.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-[#8b90b0]">
                      {customerName} · {relativeDate(row.createdAt)}
                    </span>
                  </span>
                  <span className={cn('shrink-0 rounded-lg px-2 py-1 text-[10px] font-black', statusTone(row.status))}>
                    {statusLabel(row.status)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => goTab('inbox')}
          className="flex items-center justify-between rounded-[0.9rem] border border-[#0fc98a]/35 bg-[#0fc98a]/10 p-3 text-left transition hover:border-[#0fc98a] focus:outline-none focus:ring-2 focus:ring-[#2b6eff]"
        >
          <span className="text-sm font-black text-white">Go to Inbox</span>
          <ArrowRight className="h-4 w-4 text-[#0fc98a]" />
        </button>
        <button
          type="button"
          onClick={() => goTab('schedule')}
          className="flex items-center justify-between rounded-[0.9rem] border border-[#0fc98a]/35 bg-[#0fc98a]/10 p-3 text-left transition hover:border-[#0fc98a] focus:outline-none focus:ring-2 focus:ring-[#2b6eff]"
        >
          <span className="text-sm font-black text-white">View Schedule</span>
          <ArrowRight className="h-4 w-4 text-[#0fc98a]" />
        </button>
      </section>
    </section>
  );
}
