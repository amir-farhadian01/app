import { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  fetchAdminPaymentsPage,
  fetchAdminPaymentOrderDetail,
  type AdminPaymentListItem,
  type AdminPaymentOrderDetail,
  type AdminPaymentRowStatus,
} from '../../../services/adminPayments';
import { PaymentDetailDrawer } from './PaymentDetailDrawer';

function formatCad(amount: number): string {
  return amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
}

function statusBadgeClass(status: AdminPaymentRowStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200';
    case 'CAPTURED':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200';
    case 'REFUNDED':
    case 'FAILED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
    default:
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200';
  }
}

type Props = {
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
};

export function AdminPaymentsSection({ setNotification }: Props) {
  const [items, setItems] = useState<AdminPaymentListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminPaymentOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPaymentsPage(page, pageSize);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      const st = (e as Error & { status?: number }).status;
      if (st === 404) {
        setItems([]);
        setTotal(0);
      } else {
        setNotification({
          show: true,
          message: e instanceof Error ? e.message : 'Failed to load payments',
          type: 'error',
        });
        setItems([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, setNotification]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDrawer = useCallback(
    async (orderId: string) => {
      setDrawerOpen(true);
      setDetailLoading(true);
      setDetail(null);
      try {
        const d = await fetchAdminPaymentOrderDetail(orderId);
        setDetail(d);
      } catch (e: unknown) {
        setNotification({
          show: true,
          message: e instanceof Error ? e.message : 'Failed to load payment detail',
          type: 'error',
        });
        setDrawerOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [setNotification],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-app-text">Payments</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Order payment ledger and capture controls (Stripe integration deferred).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-app-border px-4 text-sm font-bold text-app-text disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-app-border bg-app-card p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Total collected</p>
          <p className="mt-2 text-2xl font-black text-app-text">{formatCad(0)}</p>
          <span className="mt-2 inline-block rounded-full bg-neutral-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            Stripe not connected
          </span>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-card p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Pending capture</p>
          <p className="mt-2 text-2xl font-black text-app-text">{formatCad(0)}</p>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-card p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Refunded</p>
          <p className="mt-2 text-2xl font-black text-app-text">{formatCad(0)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-app-border text-left">
            <thead className="bg-neutral-50 dark:bg-neutral-900/40">
              <tr>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Order ID</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Customer</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Provider</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Amount</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Status</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Date</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500">
                    Loading payment records…
                  </td>
                </tr>
              ) : showEmpty ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16">
                    <div className="mx-auto flex max-w-md flex-col items-center text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                        <CreditCard className="h-7 w-7 text-neutral-400" aria-hidden />
                      </div>
                      <p className="text-base font-bold text-app-text">No payment records yet</p>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                        This section will populate once Stripe is connected.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.orderId}
                    className="cursor-pointer hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
                    onClick={() => void openDrawer(row.orderId)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-app-text">{row.orderId}</td>
                    <td className="px-4 py-3 text-sm text-app-text">{row.customerName}</td>
                    <td className="px-4 py-3 text-sm text-app-text">{row.providerName}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-app-text">{formatCad(row.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest',
                          statusBadgeClass(row.status),
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                      {new Date(row.date).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-bold text-app-text hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          void openDrawer(row.orderId);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > pageSize ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border px-4 py-3">
            <p className="text-xs text-neutral-500">
              Page {page} of {totalPages} · {total} orders
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-app-border px-3 py-2 text-xs font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-app-border px-3 py-2 text-xs font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <PaymentDetailDrawer open={drawerOpen} loading={detailLoading} detail={detail} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
