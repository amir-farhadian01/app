import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Briefcase, ClipboardList, FileText, MapPin } from 'lucide-react';
import { getMyOrders, type MyOrderListItem, type OrderPhaseFacetCounts } from '../services/orders';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

const TAB_STORAGE_PREFIX = 'customer.orders.listTab.';

/** Statuses included in non-cancelled pipeline tabs (matches server lifecycle). */
const NON_CANCELLED_STATUSES = [
  'draft',
  'submitted',
  'matching',
  'matched',
  'contracted',
  'paid',
  'in_progress',
  'completed',
  'closed',
] as const;

type PhaseListTab = 'active' | 'offers' | 'jobs' | 'cancelled';

function normalizeListTab(raw: string | null): PhaseListTab {
  if (!raw) return 'active';
  const t = raw.toLowerCase();
  if (t === 'offers' || t === 'offer') return 'offers';
  if (t === 'jobs' || t === 'job') return 'jobs';
  if (t === 'cancelled' || t === 'canceled') return 'cancelled';
  if (t === 'active') return 'active';
  // Legacy URLs
  if (t === 'past' || t === 'completed') return 'jobs';
  if (['order', 'orders'].includes(t)) return 'active';
  return 'active';
}

function tabToRequest(tab: PhaseListTab): { phase?: string[]; status?: string[] } {
  switch (tab) {
    case 'active':
      return { phase: ['offer', 'order', 'job'], status: [...NON_CANCELLED_STATUSES] };
    case 'offers':
      return { phase: ['offer'], status: [...NON_CANCELLED_STATUSES] };
    case 'jobs':
      return { phase: ['job'], status: [...NON_CANCELLED_STATUSES] };
    case 'cancelled':
      return { status: ['cancelled'] };
    default:
      return { phase: ['offer', 'order', 'job'], status: [...NON_CANCELLED_STATUSES] };
  }
}

/** Tab badge numbers use only `facets.phase` from `GET /api/orders/me` (never length of `items`). */
function facetCounts(fp: OrderPhaseFacetCounts | undefined): {
  active: number;
  offers: number;
  jobs: number;
  cancelled: number;
} {
  if (!fp) return { active: 0, offers: 0, jobs: 0, cancelled: 0 };
  const cancelled = fp.cancelledOffer + fp.cancelledOrder + fp.cancelledJob;
  const active = fp.offer + fp.order + fp.job;
  return { active, offers: fp.offer, jobs: fp.job, cancelled };
}

function statusPill(status: string) {
  const s = status.toLowerCase();
  return cn(
    'px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest',
    s === 'submitted' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    s === 'draft' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    s === 'cancelled' && 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200',
    s === 'completed' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    s === 'closed' && 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
    !['submitted', 'draft', 'cancelled', 'completed', 'closed'].includes(s) &&
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
  return ['matching', 'matched', 'contracted', 'paid', 'in_progress', 'completed', 'closed'].includes(o.status);
}

function TabEmpty({ tab }: { tab: PhaseListTab }) {
  if (tab === 'active') {
    return (
      <div className="mx-auto max-w-md space-y-6 px-4 py-12 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-app-border bg-app-card">
          <ClipboardList className="h-12 w-12 text-neutral-400" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-app-text">Nothing in your active pipeline</h2>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Submit a request or check other tabs for offers, jobs, or cancelled history.
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
  if (tab === 'offers') {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-app-border bg-app-card">
          <FileText className="h-10 w-10 text-neutral-400" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-app-text">No open offers</h2>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Offers in matching appear here.
        </p>
      </div>
    );
  }
  if (tab === 'jobs') {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-app-border bg-app-card">
          <Briefcase className="h-10 w-10 text-neutral-400" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-app-text">No jobs in this view</h2>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Confirmed work (contracted and beyond) lives under Jobs.
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
    let next: PhaseListTab = 'active';
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
    (next: PhaseListTab) => {
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
  const [accountHasOrders, setAccountHasOrders] = useState(false);
  const [facets, setFacets] = useState<{ phase: OrderPhaseFacetCounts } | undefined>();
  const [items, setItems] = useState<MyOrderListItem[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    void getMyOrders({ pageSize: 1, page: 1 })
      .then((r) => {
        setAccountHasOrders(r.total > 0);
        if (r.facets) setFacets(r.facets);
      })
      .catch(() => {
        setAccountHasOrders(false);
        setFacets(undefined);
      })
      .finally(() => {
        setProbeDone(true);
      });
  }, []);

  useEffect(() => {
    if (!probeDone) return;
    if (!accountHasOrders) {
      setItems([]);
      setListTotal(0);
      return;
    }
    setListLoading(true);
    const q = tabToRequest(listTab);
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
  }, [probeDone, accountHasOrders, listTab]);

  const counts = useMemo(() => facetCounts(facets?.phase), [facets]);

  const tabs: { id: PhaseListTab; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'offers', label: 'Offers', count: counts.offers },
    { id: 'jobs', label: 'Jobs', count: counts.jobs },
    { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
  ];

  if (!probeDone) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-app-border border-t-app-text" />
      </div>
    );
  }

  if (!accountHasOrders) {
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
          This tab: {listTotal} order{listTotal === 1 ? '' : 's'}
        </p>
      </header>

      <div
        className={cn(
          'sticky top-0 z-10 -mx-1 flex flex-wrap gap-1 border-b border-app-border bg-app-card/95 px-1 backdrop-blur-sm',
        )}
        role="tablist"
        aria-label="Order segments"
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
