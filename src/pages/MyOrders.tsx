import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  FileText,
  MapPin,
  MessageCircle,
  Star,
  X,
} from 'lucide-react';
import { getMyOrders, cancelOrder, type MyOrderListItem, type OrderPhaseFacetCounts } from '../services/orders';
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

function primaryStatusBadge(status: string) {
  const s = status.toLowerCase();
  return cn(
    'px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest',
    s === 'submitted' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    s === 'matching' && 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100',
    s === 'matched' && 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
    s === 'completed' && 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200',
    s === 'cancelled' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    s === 'closed' && 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
    s === 'draft' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    s === 'disputed' && 'bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100',
    ['contracted', 'paid', 'in_progress'].includes(s) &&
      'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100',
    ![
      'submitted',
      'matching',
      'matched',
      'completed',
      'cancelled',
      'closed',
      'draft',
      'disputed',
      'contracted',
      'paid',
      'in_progress',
    ].includes(s) && 'bg-app-card border border-app-border text-app-text',
  );
}

function phaseBadgeClass(phase: string | null | undefined, cancelled: boolean) {
  if (cancelled) return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-200 dark:border-red-900';
  const p = phase ?? '';
  if (p === 'offer') return 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800';
  if (p === 'order') return 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-800';
  if (p === 'job') return 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-emerald-800';
  return 'bg-neutral-50 text-neutral-700 border-app-border dark:bg-neutral-800 dark:text-neutral-200';
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
        <h2 className="text-xl font-black text-app-text">No active orders yet</h2>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Book your first service!
        </p>
        <Link
          to="/home"
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-8 text-[15px] font-bold text-white dark:bg-white dark:text-neutral-900"
        >
          Browse Services
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
        <h2 className="text-xl font-black text-app-text">No pending offers</h2>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          When providers invite you, they&apos;ll appear here.
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
        <h2 className="text-xl font-black text-app-text">No active jobs</h2>
        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Match with a provider to get started.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
      <h2 className="text-xl font-black text-app-text">No cancelled orders</h2>
      <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        Orders you cancel will show up in this list.
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
  const [cancelTarget, setCancelTarget] = useState<MyOrderListItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);

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
          {items.map((o) => {
            const isClosed = o.status === 'closed';
            const ratingVal = o.matchedProviderRating;
            const roundedStars =
              ratingVal != null && Number.isFinite(ratingVal) ? Math.min(5, Math.round(ratingVal)) : null;
            const showCancel = o.status === 'submitted' || o.status === 'matching';
            const showRate = o.status === 'completed';
            return (
              <motion.li
                key={o.id}
                layout
                className={cn(
                  'space-y-3 rounded-2xl border border-app-border bg-app-card p-5',
                  isClosed && 'border-neutral-200 bg-neutral-50/80 ring-1 ring-neutral-200/80 dark:border-neutral-700 dark:bg-neutral-900/40 dark:ring-neutral-700',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={primaryStatusBadge(o.status)}>{o.status.replace(/_/g, ' ')}</span>
                    {o.status === 'cancelled' && o.phase ? (
                      <span
                        className={cn(
                          'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
                          phaseBadgeClass(o.phase, true),
                        )}
                      >
                        Phase · {phaseWasLabel(o.phase)}
                      </span>
                    ) : o.phase ? (
                      <span
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
                          phaseBadgeClass(o.phase, false),
                        )}
                      >
                        {phaseWasLabel(o.phase)}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs font-bold text-neutral-400">{o.serviceCatalog.name}</span>
                </div>

                {o.matchedProviderId && matchedName(o) ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-app-border bg-app-input/30 px-3 py-2">
                    {o.matchedSummary?.provider.avatarUrl ? (
                      <img
                        src={o.matchedSummary.provider.avatarUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-black text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                        {String(matchedName(o)).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-wide text-neutral-500">Your provider</p>
                      <p className="truncate font-semibold text-app-text">{matchedName(o)}</p>
                      <div className="mt-0.5 flex items-center gap-0.5" aria-label={ratingVal != null ? `Rating ${ratingVal.toFixed(1)} of 5` : 'No rating'}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              'h-3.5 w-3.5',
                              roundedStars != null && n <= roundedStars
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-neutral-300 dark:text-neutral-600',
                            )}
                            strokeWidth={1.5}
                          />
                        ))}
                        <span className="ml-1 text-[11px] font-semibold text-neutral-500">
                          {ratingVal != null ? ratingVal.toFixed(1) : '—'}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/orders/${o.id}?tab=chat`}
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 text-xs font-bold text-app-text"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      Message
                    </Link>
                  </div>
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

                {!isClosed ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Link
                      to={`/orders/${o.id}`}
                      className="inline-flex min-h-[48px] items-center text-sm font-bold text-blue-600 dark:text-blue-400"
                    >
                      {o.status === 'matching'
                        ? 'Choose provider →'
                        : canOpenChat(o)
                          ? 'Open detail'
                          : 'View order'}
                    </Link>
                    {canOpenContract(o) ? (
                      <Link
                        to={`/orders/${o.id}?tab=contract`}
                        className="inline-flex min-h-[48px] items-center gap-1.5 text-sm font-bold text-violet-700 dark:text-violet-300"
                      >
                        <FileText className="h-4 w-4 shrink-0" aria-hidden />
                        Contract
                      </Link>
                    ) : null}
                    {showCancel ? (
                      <button
                        type="button"
                        className="inline-flex min-h-[48px] items-center text-sm font-bold text-red-600 dark:text-red-400"
                        onClick={() => {
                          setCancelReason('');
                          setCancelTarget(o);
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                    {showRate ? (
                      <Link
                        to={`/orders/${o.id}?rate=1`}
                        className="inline-flex min-h-[48px] items-center text-sm font-bold text-amber-700 dark:text-amber-300"
                      >
                        Rate provider
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-neutral-500">Closed — read-only summary on the order page.</p>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}

      <AnimatePresence>
        {cancelTarget ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            <motion.button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCancelTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-3xl border border-app-border bg-app-card p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-app-text">Cancel this order?</h2>
                <button
                  type="button"
                  className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-neutral-500"
                  onClick={() => setCancelTarget(null)}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-neutral-500">Please tell us why (at least 5 characters).</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="mt-3 w-full rounded-2xl border border-app-border bg-app-input px-3 py-2 text-[15px] text-app-text"
                placeholder="Reason…"
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="min-h-[48px] flex-1 rounded-2xl border border-app-border font-bold"
                  onClick={() => setCancelTarget(null)}
                >
                  Keep order
                </button>
                <button
                  type="button"
                  disabled={cancelReason.trim().length < 5 || cancelBusy}
                  className="min-h-[48px] flex-1 rounded-2xl bg-red-600 font-bold text-white disabled:opacity-50"
                  onClick={() => {
                    void (async () => {
                      if (!cancelTarget) return;
                      setCancelBusy(true);
                      try {
                        await cancelOrder(cancelTarget.id, cancelReason.trim());
                        setCancelTarget(null);
                        const q = tabToRequest(listTab);
                        const r = await getMyOrders({
                          pageSize: 50,
                          ...q,
                        });
                        setItems(r.items);
                        setListTotal(r.total);
                        if (r.facets) setFacets(r.facets);
                      } catch {
                        /* optional toast */
                      } finally {
                        setCancelBusy(false);
                      }
                    })();
                  }}
                >
                  {cancelBusy ? '…' : 'Confirm cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
