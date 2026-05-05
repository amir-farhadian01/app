import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, User, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../lib/AuthContext';
import type { FilterValue, Sort } from '../../crm/types';
import type { AdminOrderListItem } from '../../../../lib/adminOrdersList';
import {
  cancelAdminOrder,
  fetchAdminOrdersList,
  fetchAdminOrdersStats,
  type AdminOrderListQuery,
  type AdminOrdersStats,
} from '../../../services/adminOrders';
import { OrdersTable } from './OrdersTable';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { AdminOrdersFilterBar } from './AdminOrdersFilterBar';
import type { AdminOrdersSegment } from './orderColumns';

type Props = {
  showSuccess: (message: string) => void;
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
  filterSeed?: { createdFrom?: string } | null;
  onConsumedFilterSeed?: () => void;
};

const SEGMENT_STORAGE_PREFIX = 'admin.orders.segment.';

function normalizeSegment(raw: string | null): AdminOrdersSegment {
  if (!raw) return 'offer';
  const t = raw.toLowerCase();
  if (t === 'all') return 'all';
  if (t === 'offers' || t === 'offer') return 'offer';
  if (t === 'orders' || t === 'order') return 'order';
  if (t === 'jobs' || t === 'job') return 'job';
  if (t === 'cancelled' || t === 'canceled') return 'cancelled';
  return 'offer';
}

function segmentToApi(
  seg: AdminOrdersSegment,
): Pick<AdminOrderListQuery, 'phase' | 'status' | 'includeDrafts'> {
  switch (seg) {
    case 'all':
      return {};
    case 'offer':
      return { phase: ['offer'], status: ['submitted'] };
    case 'order':
      return { phase: ['order'], status: ['matching', 'matched'] };
    case 'job':
      return {
        phase: ['job'],
        status: ['contracted', 'paid', 'in_progress', 'completed', 'closed'],
      };
    case 'cancelled':
      return { status: ['cancelled'] };
    default:
      return { phase: ['offer'], status: ['submitted'] };
  }
}

function notifyError(
  setNotification: Props['setNotification'],
  message: string
) {
  setNotification({ show: true, message, type: 'error' });
  setTimeout(() => setNotification(null), 4000);
}

function orderFiltersToQueryParts(filters: Record<string, FilterValue>): Partial<AdminOrderListQuery> {
  const q: Partial<AdminOrderListQuery> = {};
  for (const [col, fv] of Object.entries(filters)) {
    if (!fv) continue;
    if (fv.type === 'checkbox' && fv.values.length) {
      if (col === 'status') q.status = [...fv.values];
      else if (col === 'entryPoint') q.entryPoint = [...fv.values];
      else if (col === 'serviceCatalog') q.serviceCatalogId = fv.values[0];
    }
    if (fv.type === 'dateRange') {
      if (col === 'createdAt') {
        if (fv.from) q.createdFrom = fv.from;
        if (fv.to) q.createdTo = fv.to;
      }
      if (col === 'scheduledAt') {
        if (fv.from) q.scheduledFrom = fv.from;
        if (fv.to) q.scheduledTo = fv.to;
      }
    }
  }
  return q;
}

function mergeStatuses(segmentBase: string[] | undefined, legacy: string[] | undefined): string[] | null {
  if (!legacy?.length) return segmentBase ?? [];
  if (!segmentBase?.length) return legacy;
  const hit = segmentBase.filter((s) => legacy.includes(s));
  return hit.length ? hit : null;
}

export function AdminOrdersSection({
  showSuccess,
  setNotification,
  filterSeed,
  onConsumedFilterSeed,
}: Props) {
  const { user: authUser } = useAuth();
  const canCancel = ['owner', 'platform_admin'].includes(authUser?.role ?? '');
  const [searchParams, setSearchParams] = useSearchParams();

  const segment = useMemo(
    () => normalizeSegment(searchParams.get('segment')),
    [searchParams],
  );

  const segmentSyncedRef = useRef(false);
  useEffect(() => {
    if (segmentSyncedRef.current) return;
    if (searchParams.get('segment')) {
      segmentSyncedRef.current = true;
      return;
    }
    const uid = authUser?.id;
    let next: AdminOrdersSegment = 'offer';
    if (uid && typeof window !== 'undefined') {
      try {
        const v = localStorage.getItem(`${SEGMENT_STORAGE_PREFIX}${uid}`);
        if (v) next = normalizeSegment(v);
      } catch {
        /* ignore */
      }
    }
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set('segment', next === 'offer' ? 'offer' : next);
        return n;
      },
      { replace: true },
    );
    segmentSyncedRef.current = true;
  }, [authUser?.id, searchParams, setSearchParams]);

  const setSegment = useCallback(
    (next: AdminOrdersSegment) => {
      const uid = authUser?.id;
      if (uid && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`${SEGMENT_STORAGE_PREFIX}${uid}`, next);
        } catch {
          /* ignore */
        }
      }
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set('segment', next);
          return n;
        },
        { replace: true },
      );
    },
    [setSearchParams, authUser?.id],
  );

  const [stats, setStats] = useState<AdminOrdersStats | null>(null);
  const [data, setData] = useState<AdminOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<{
    serviceCatalog: Array<{ id: string; name: string; count: number }>;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<Sort | null>({ id: 'createdAt', dir: 'desc' });
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusSearchInput, setStatusSearchInput] = useState('');
  const [debouncedStatusSearch, setDebouncedStatusSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const cancelWaitRef = useRef<((reason: string | null) => void) | null>(null);
  const [cancelPromptOpen, setCancelPromptOpen] = useState(false);
  const [cancelPromptIds, setCancelPromptIds] = useState<string[]>([]);
  const [cancelPromptReason, setCancelPromptReason] = useState('');

  /** CRM deep-link: filter orders for one user (distinct from KYC `userId` query key). */
  const ordersUserId = useMemo(() => searchParams.get('ordersUserId')?.trim() ?? '', [searchParams]);

  const legacyStatuses = useMemo(() => {
    const a = searchParams.getAll('status');
    return a.length ? a : undefined;
  }, [searchParams]);

  const listImpossible = useMemo(() => {
    const seg = segmentToApi(segment);
    const merged = mergeStatuses(seg.status, legacyStatuses);
    return merged === null;
  }, [segment, legacyStatuses]);

  const segmentStatusEmpty = useMemo(() => {
    const seg = segmentToApi(segment);
    let status = mergeStatuses(seg.status, legacyStatuses) ?? [];
    const fv = orderFiltersToQueryParts(filters);
    if (fv.status?.length) {
      status = status.filter((s) => fv.status!.includes(s));
    }
    return status.length === 0 && (!!seg.status?.length || !!fv.status?.length);
  }, [segment, legacyStatuses, filters]);

  const listBlocked = listImpossible || segmentStatusEmpty;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedStatusSearch(statusSearchInput), 300);
    return () => window.clearTimeout(t);
  }, [statusSearchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedStatusSearch]);

  const listQuery = useMemo((): AdminOrderListQuery => {
    const sortBy =
      sort?.id && ['createdAt', 'scheduledAt', 'status', 'updatedAt'].includes(sort.id)
        ? sort.id
        : 'createdAt';
    const sortDir = sort?.dir ?? 'desc';
    const seg = segmentToApi(segment);
    let status = mergeStatuses(seg.status, legacyStatuses) ?? [];
    const fv = orderFiltersToQueryParts(filters);
    if (fv.status?.length) {
      status = status.filter((s) => fv.status!.includes(s));
    }
    const q: AdminOrderListQuery = {
      page,
      pageSize,
      sortBy,
      sortDir,
      q: globalSearch.trim() || undefined,
      search: debouncedStatusSearch.trim() || undefined,
      ...fv,
    };
    if (ordersUserId) q.userId = ordersUserId;
    if (seg.phase) q.phase = seg.phase;
    q.status = status.length ? status : undefined;
    if (seg.includeDrafts === true) q.includeDrafts = true;
    return q;
  }, [page, pageSize, sort, filters, globalSearch, debouncedStatusSearch, segment, legacyStatuses, ordersUserId]);

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchAdminOrdersStats();
      setStats(s);
    } catch {
      setStats(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (listBlocked) {
      setData([]);
      setTotal(0);
      setFacets(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetchAdminOrdersList(listQuery);
      setData(res.items);
      setTotal(res.total);
      setFacets(res.facets);
      await loadStats();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load orders';
      setError(msg);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [listQuery, listBlocked, loadStats]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!filterSeed?.createdFrom) return;
    setFilters((prev) => ({
      ...prev,
      createdAt: { type: 'dateRange', from: filterSeed.createdFrom },
    }));
    setPage(1);
    onConsumedFilterSeed?.();
  }, [filterSeed, onConsumedFilterSeed]);

  const serviceCatalogFilterOptions = useCallback(async () => {
    const list = facets?.serviceCatalog ?? [];
    return list.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.count})`,
    }));
  }, [facets]);

  const finishCancelPrompt = (reason: string | null) => {
    setCancelPromptOpen(false);
    setCancelPromptIds([]);
    setCancelPromptReason('');
    cancelWaitRef.current?.(reason);
    cancelWaitRef.current = null;
  };

  const bulkCancelAction = useMemo(() => {
    if (!canCancel) return null;
    return {
      id: 'cancel',
      label: 'Cancel',
      icon: <Ban className="h-4 w-4" />,
      variant: 'danger' as const,
      onRun: async (ids: string[]) => {
        const reason = await new Promise<string | null>((resolve) => {
          cancelWaitRef.current = resolve;
          setCancelPromptIds(ids);
          setCancelPromptReason('');
          setCancelPromptOpen(true);
        });
        if (!reason || reason.trim().length < 5) {
          if (reason !== null) notifyError(setNotification, 'Reason must be at least 5 characters.');
          return;
        }
        let ok = 0;
        for (const id of ids) {
          try {
            await cancelAdminOrder(id, reason.trim());
            ok++;
          } catch (e) {
            notifyError(setNotification, e instanceof Error ? e.message : `Failed to cancel ${id}`);
          }
        }
        if (ok) showSuccess(`Cancelled ${ok} order(s).`);
        await load();
        setDrawerId((open) => (open && ids.includes(open) ? null : open));
      },
    };
  }, [canCancel, load, setNotification, showSuccess]);

  const counts = useMemo(() => {
    if (!stats) {
      return { all: 0, offer: 0, order: 0, job: 0, cancelled: 0 };
    }
    return {
      all: stats.totalOrders,
      offer: stats.submittedCount,
      order: stats.orders,
      job: stats.jobs,
      cancelled: stats.cancelledCount,
    };
  }, [stats]);

  const phaseOptions = useMemo(
    () => [
      { id: 'all' as const, label: 'All', count: counts.all },
      { id: 'offer' as const, label: 'Offers', count: counts.offer },
      { id: 'order' as const, label: 'Orders', count: counts.order },
      { id: 'job' as const, label: 'Jobs', count: counts.job },
      { id: 'cancelled' as const, label: 'Cancelled', count: counts.cancelled },
    ],
    [counts],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Orders</h2>
        <p className="text-sm text-neutral-500">Review customer orders, answers, and photos.</p>
      </div>

      <AdminOrdersFilterBar
        segment={segment}
        onSegmentChange={(next) => {
          setSegment(next);
          setPage(1);
        }}
        phaseOptions={phaseOptions}
        statusSearch={statusSearchInput}
        onStatusSearchChange={setStatusSearchInput}
      />

      {ordersUserId ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-app-border bg-app-input px-4 py-3 text-sm text-app-text">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
            <span>
              Showing orders for user ID <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{ordersUserId}</code>{' '}
              (customer or matched provider).
            </span>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-app-border px-2 py-1 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => {
              setSearchParams(
                (prev) => {
                  const n = new URLSearchParams(prev);
                  n.delete('ordersUserId');
                  return n;
                },
                { replace: true },
              );
              setPage(1);
            }}
          >
            <X className="h-3.5 w-3.5" />
            Clear user filter
          </button>
        </div>
      ) : null}

      <OrdersTable
        key={segment}
        segment={segment}
        tableId={`admin-orders-${segment}`}
        data={data}
        total={total}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(s) => {
          setSort(s);
          setPage(1);
        }}
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        globalSearch={globalSearch}
        onGlobalSearchChange={(q) => {
          setGlobalSearch(q);
          setPage(1);
        }}
        onRowClick={(row) => setDrawerId(row.id)}
        serviceCatalogFilterOptions={serviceCatalogFilterOptions}
        bulkCancelAction={bulkCancelAction}
        onCopied={showSuccess}
        error={error}
      />

      <OrderDetailDrawer
        orderId={drawerId}
        open={drawerId != null}
        onClose={() => setDrawerId(null)}
        canCancel={canCancel}
        onOrderUpdated={() => void load()}
        onNotify={(message, type) => {
          if (type === 'success') showSuccess(message);
          else notifyError(setNotification, message);
        }}
      />

      {cancelPromptOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-app-border bg-app-card p-8 shadow-xl">
            <h3 className="text-lg font-black italic uppercase text-app-text">Cancel orders</h3>
            <p className="mt-2 text-sm text-neutral-500">
              {cancelPromptIds.length} order(s). Reason is required (min. 5 characters).
            </p>
            <textarea
              value={cancelPromptReason}
              onChange={(e) => setCancelPromptReason(e.target.value)}
              className="mt-4 min-h-[100px] w-full rounded-xl border border-app-border bg-neutral-50 p-3 text-sm dark:bg-neutral-900"
              placeholder="Reason…"
            />
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700"
                onClick={() => finishCancelPrompt(cancelPromptReason.trim() || null)}
              >
                Confirm cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-2xl border border-app-border py-3 text-sm font-bold text-neutral-600 dark:text-neutral-300"
                onClick={() => finishCancelPrompt(null)}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
