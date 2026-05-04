import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Briefcase, ClipboardList, FileText, MapPin } from 'lucide-react';
import { getMyOrders, type MyOrderListItem, type OrderPhaseFacetCounts } from '../services/orders';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

const TAB_STORAGE_PREFIX = 'customer.orders.listTab.';

/** Non-terminal order rows shown under Active. */
const ACTIVE_STATUSES = [
  'draft',
  'submitted',
  'matching',
  'matched',
  'contracted',
  'paid',
  'in_progress',
] as const;

type OrderListTab = 'active' | 'past' | 'cancelled';

function normalizeListTab(raw: string | null): OrderListTab {
  if (!raw) return 'active';
  const t = raw.toLowerCase();
  if (t === 'past') return 'past';
  if (t === 'cancelled' || t === 'canceled') return 'cancelled';
  if (t === 'active') return 'active';
  // Legacy lifecycle URLs → Active
  if (['offer', 'offers', 'order', 'orders', 'job', 'jobs'].includes(t)) return 'active';
  return 'active';
}

function tabToQueryParams(tab: OrderListTab): { status: string[] } {
  switch (tab) {
    case 'active':
      return { status: [...ACTIVE_STATUSES] };
    case 'past':
      return { status: ['completed'] };
    case 'cancelled':
      return { status: ['cancelled'] };
    default:
      return { status: [...ACTIVE_STATUSES] };
  }
}

function cancelledCountFromFacets(fp: OrderPhaseFacetCounts | undefined): number {
  if (!fp) return 0;
  return fp.cancelledOffer + fp.cancelledOrder + fp.cancelledJob;
}

function statusPill(status: string) {
  const s = status.toLowerCase();
  return cn(
    'px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest',
    s === 'submitted' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    s === 'draft' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    s === 'cancelled' && 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200',
    s === 'completed' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    !['submitted', 'draft', 'cancelled', 'completed'].includes(s) &&
      'bg-app-card border border-app-border text-app-text',
  );
}

function phaseWasLabel(phase: string | null | undefined): string {
  if (phase === 'offer') return 'Offer';
  if (phase === 'order') return 'Order';
  if (phase === 'job') return 'Job';
  return '';
}

function matchedName(o: MyOrderListItem): string | null {
  const p = o.matchedSummary?.provider;
  if (!p) return null;
  const n = [p.firstName, p.lastName].filter(Boolean).join(' ');
  return n || p.displayName || null;
}

function canOpenChat(o: MyOrderListItem): boolean {
  if (!o.matchedProviderId) return false;
  return ['matched', 'contracted', 'paid', 'in_progress', 'completed'].includes(o.status);
}

function canOpenContract(o: MyOrderListItem): boolean {
  if (!o.matchedProviderId) return false;
  return ['matching', 'matched', 'contracted', 'paid', 'in_progress', 'completed'].includes(o.status);
}

function TabEmpty({ tab }: { tab: OrderListTab }) {
  if (tab === 'active') {
    return (
      <div className="mx-auto max-w-md space-y-6 px-4 py-12 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-app-border bg-app-card">
          <ClipboardList className="h-12 w-12 text-neutral-400" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-app-text">Nothing active</h2>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Submit a request or check Past for completed work.
        </p>
        <Link
          to="/orders/new"
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-8 text-[15px] font-bold text-white dark:bg-white dark:text-neutral-900"
        >
          Book a service
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }
  if (tab === 'past') {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-app-border bg-app-card">
          <Briefcase className="h-10 w-10 text-neutral-400" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-app-text">No completed orders yet</h2>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Finished jobs will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
      <h2 className="text-xl font-black text-app-text">Nothing cancelled</h2>
      <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        Cancelled orders will appear in this list.
      </p>
    </div>
  );
}

export default function MyOrders() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const segmentParam = searchParams.get('tab') ?? searchParams.get('segment');
  const listTab = useMemo(() => normalizeListTab(segmentParam), [segmentParam]);

  const tabSyncedRef = useRef(false);

  /** Migrate legacy `?segment=` URLs to `?tab=`. */
  useEffect(() => {
    if (searchParams.get('tab') || !searchParams.get('segment')) return;
    const mapped = normalizeListTab(searchParams.get('segment'));
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete('segment');
        n.set('tab', mapped);
        return n;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (tabSyncedRef.current) return;
    if (segmentParam) {
      tabSyncedRef.current = true;
      return;
    }
    const uid = user?.id;
    let next: OrderListTab = 'active';
    if (uid && typeof window !== 'undefined') {
      try {
        const v = localStorage.getItem(`${TAB_STORAGE_PREFIX}${uid}`);
        if (v) next = normalizeListTab(v);
      } catch {
        /* ignore */
      }
    }
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set('tab', next);
        n.delete('segment');
        return n;
      },
      { replace: true },
    );
    tabSyncedRef.current = true;
  }, [user?.id, segmentParam, setSearchParams]);

  const setListTab = useCallback(
    (next: OrderListTab) => {
      const uid = user?.id;
      if (uid && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`${TAB_STORAGE_PREFIX}${uid}`, next);
        } catch {
          /* ignore */
        }
      }
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set('tab', next);
          n.delete('segment');
          return n;
        },
        { replace: true },
      );
    },
    [setSearchParams, user?.id],
  );

  const [probeDone, setProbeDone] = useState(false);
  /** Total rows for customer (draft + all phases), unfiltered by status. */
  const [pipelineTotal, setPipelineTotal] = useState(0);
  const [pastTotal, setPastTotal] = useState(0);
  const [facets, setFacets] = useState<{ phase: OrderPhaseFacetCounts } | undefined>();
  const [items, setItems] = useState<MyOrderListItem[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    void Promise.all([getMyOrders({ pageSize: 1 }), getMyOrders({ pageSize: 1, status: ['completed'] })])
      .then(([all, past]) => {
        setPipelineTotal(all.total);
        setPastTotal(past.total);
        if (all.facets) setFacets(all.facets);
      })
      .catch(() => {
        setPipelineTotal(0);
        setPastTotal(0);
        setFacets(undefined);
      })
      .finally(() => {
        setProbeDone(true);
      });
  }, []);

  useEffect(() => {
    if (!probeDone) return;
    if (pipelineTotal === 0) {
      setItems([]);
      setListTotal(0);
      return;
    }
    setListLoading(true);
    const q = tabToQueryParams(listTab);
    void getMyOrders({
      pageSize: 50,
      ...q,
    })
      .then((r) => {
        setItems(r.items);
        setListTotal(r.total);
        if (r.facets) setFacets(r.facets);
      })
      .catch(() => {
        setItems([]);
        setListTotal(0);
      })
      .finally(() => {
        setListLoading(false);
      });
  }, [probeDone, pipelineTotal, listTab]);

  const cancelledTabCount = useMemo(() => cancelledCountFromFacets(facets?.phase), [facets]);
  const activeTabCount = useMemo(
    () => Math.max(0, pipelineTotal - pastTotal - cancelledTabCount),
    [pipelineTotal, pastTotal, cancelledTabCount],
  );

  const tabs: { id: OrderListTab; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: activeTabCount },
    { id: 'past', label: 'Past', count: pastTotal },
    { id: 'cancelled', label: 'Cancelled', count: cancelledTabCount },
  ];

  if (!probeDone) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-app-border border-t-app-text" />
      </div>
    );
  }

  if (pipelineTotal === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-app-border bg-app-card">
          <ClipboardList className="h-10 w-10 text-neutral-400" />
        </div>
        <h1 className="text-2xl font-black text-app-text">No orders yet</h1>
        <p className="text-[15px] text-neutral-600 dark:text-neutral-400">
          Book your first service — we&apos;ll keep everything organized here.
        </p>
        <Link
          to="/orders/new"
          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-neutral-900 px-8 text-[15px] font-bold text-white dark:bg-white dark:text-neutral-900"
        >
          Book your first service
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-20">
      <header>
        <h1 className="text-3xl font-black text-app-text">My orders</h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          {pipelineTotal} total · this tab: {listTotal}
        </p>
      </header>

      <div
        className={cn(
          'sticky top-0 z-10 -mx-1 flex flex-wrap gap-1 border-b border-app-border bg-app-card/95 px-1 backdrop-blur-sm',
        )}
        role="tablist"
        aria-label="Order history"
      >
        {tabs.map((t) => {
          const active = listTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'border-b-[4px] border-transparent px-4 py-3 text-sm font-black uppercase tracking-wide transition-colors',
                active ? 'border-app-text text-app-text' : 'text-neutral-500 hover:text-app-text',
              )}
              onClick={() => setListTab(t.id)}
            >
              {t.label} <span className="tabular-nums opacity-80">({t.count})</span>
            </button>
          );
        })}
      </div>

      {listLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-app-border border-t-app-text" />
        </div>
      ) : items.length === 0 ? (
        <TabEmpty tab={listTab} />
      ) : (
        <ul className="space-y-3">
          {items.map((o) => (
            <motion.li
              key={o.id}
              layout
              className="space-y-3 rounded-2xl border border-app-border bg-app-card p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={statusPill(o.status)}>{o.status}</span>
                  {o.status === 'cancelled' && o.phase ? (
                    <span className="inline-flex rounded-md border border-app-border bg-neutral-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-app-text dark:bg-neutral-800">
                      Was: {phaseWasLabel(o.phase)}
                    </span>
                  ) : o.phase ? (
                    <span className="rounded-md border border-app-border bg-neutral-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      {phaseWasLabel(o.phase)}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs font-bold text-neutral-400">{o.serviceCatalog.name}</span>
              </div>
              {matchedName(o) ? (
                <p className="text-xs font-semibold text-neutral-500">
                  Matched provider: <span className="text-app-text">{matchedName(o)}</span>
                </p>
              ) : null}
              <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="line-clamp-2">
                  {o.scheduleFlexibility === 'asap'
                    ? 'ASAP'
                    : o.scheduleFlexibility === 'this_week'
                      ? 'This week'
                      : o.scheduledAt
                        ? new Date(o.scheduledAt).toLocaleString()
                        : 'Flexible'}
                  {' · '}
                  {o.address.length > 60 ? `${o.address.slice(0, 57)}…` : o.address}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  to={`/orders/${o.id}`}
                  className="inline-flex min-h-[48px] items-center text-sm font-bold text-blue-600 dark:text-blue-400"
                >
                  {o.status === 'matching'
                    ? 'Choose provider →'
                    : canOpenChat(o)
                      ? 'Open chat'
                      : 'View'}
                </Link>
                {canOpenContract(o) ? (
                  <Link
                    to={`/orders/${o.id}?tab=contract`}
                    className="inline-flex min-h-[48px] items-center gap-1.5 text-sm font-bold text-violet-700 dark:text-violet-300"
                  >
                    <FileText className="h-4 w-4 shrink-0" aria-hidden />
                    Open contract
                  </Link>
                ) : null}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
