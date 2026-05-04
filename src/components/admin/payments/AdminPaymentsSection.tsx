import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminPaymentLedger,
  fetchAdminPaymentLedgerDetail,
  type AdminPaymentLedgerItem,
} from '../../../services/adminPayments.ts';

type Props = {
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
};

export function AdminPaymentsSection({ setNotification }: Props) {
  const [items, setItems] = useState<AdminPaymentLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState('');
  const [detail, setDetail] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPaymentLedger(orderId);
      setItems(res.items);
    } catch (e: unknown) {
      setNotification({
        show: true,
        message: e instanceof Error ? e.message : 'Failed to load payment ledger',
        type: 'error',
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orderId, setNotification]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-app-text">Payments</h2>
        <p className="text-sm text-neutral-500">
          Minimal admin ledger and detail for Sprint M payment session/capture actions.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-app-border bg-app-card p-4">
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">
          Order ID
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
            placeholder="Optional filter"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-[44px] rounded-xl bg-neutral-900 px-4 text-sm font-bold text-white dark:bg-white dark:text-neutral-900"
        >
          Refresh ledger
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-app-border">
        <table className="min-w-full divide-y divide-app-border text-left">
          <thead className="bg-neutral-50 dark:bg-neutral-900/40">
            <tr>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">When</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Order</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Category</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Amount</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-neutral-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border bg-app-card">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  No payment rows
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm text-app-text">{new Date(row.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-app-text">{row.order?.id ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-app-text">{row.category ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-app-text">{row.amount}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-lg border border-app-border px-3 py-1 text-xs font-bold text-app-text"
                      onClick={() => {
                        void (async () => {
                          try {
                            const d = await fetchAdminPaymentLedgerDetail(row.id);
                            setDetail(JSON.stringify(d, null, 2));
                          } catch (e: unknown) {
                            setNotification({
                              show: true,
                              message: e instanceof Error ? e.message : 'Failed to load detail',
                              type: 'error',
                            });
                          }
                        })();
                      }}
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-app-border bg-app-card p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Detail JSON</p>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-neutral-600 dark:text-neutral-300">
          {detail || 'Select a ledger row to inspect details.'}
        </pre>
      </div>
    </div>
  );
}
