import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AdminPaymentOrderDetail, AdminPaymentRowStatus } from '../../../services/adminPayments';

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
  open: boolean;
  loading: boolean;
  detail: AdminPaymentOrderDetail | null;
  onClose: () => void;
};

export function PaymentDetailDrawer({ open, loading, detail, onClose }: Props) {
  if (!open) return null;

  if (loading || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-busy="true">
        <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close drawer" onClick={onClose} />
        <div className="relative flex h-full w-full max-w-lg items-center justify-center border-l border-app-border bg-app-card p-8 shadow-xl">
          <p className="text-sm font-semibold text-neutral-500">Loading payment…</p>
        </div>
      </div>
    );
  }

  const { breakdown, timeline, audit, status } = detail;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="pay-drawer-title">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close drawer" onClick={onClose} />
      <div
        className={cn(
          'relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-app-border bg-app-card shadow-xl',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-card px-6 py-4">
          <h2 id="pay-drawer-title" className="text-lg font-black text-app-text">
            Payment detail
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section className="rounded-2xl border border-app-border bg-neutral-50/50 p-4 dark:bg-neutral-900/30">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Order summary</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Order ID</dt>
                <dd className="font-mono text-xs text-app-text">{detail.orderId}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Customer</dt>
                <dd className="text-right font-semibold text-app-text">{detail.customerName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Provider</dt>
                <dd className="text-right font-semibold text-app-text">{detail.providerName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Service</dt>
                <dd className="text-right text-app-text">{detail.serviceName}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-2">
                <dt className="text-neutral-500">Status</dt>
                <dd>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest', statusBadgeClass(status))}>
                    {status}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-app-border p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Amount breakdown</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
                <span className="font-semibold text-app-text">{formatCad(breakdown.subtotal)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Platform fee ({breakdown.platformFeePercent}%)</span>
                <span className="font-semibold text-app-text">{formatCad(breakdown.platformFeeAmount)}</span>
              </li>
              <li className="flex justify-between border-t border-app-border pt-2">
                <span className="font-bold text-app-text">Provider payout</span>
                <span className="font-bold text-app-text">{formatCad(breakdown.providerPayout)}</span>
              </li>
            </ul>
            <p className="mt-2 text-[10px] text-neutral-400">
              Breakdown uses the approved contract amount where available; fee rate is a placeholder until billing rules ship.
            </p>
          </section>

          <section className="rounded-2xl border border-app-border p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Status timeline</h3>
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                <div>
                  <p className="text-sm font-bold text-app-text">Session Created</p>
                  <p className="text-xs text-neutral-500">
                    {timeline.sessionCreatedAt ? new Date(timeline.sessionCreatedAt).toLocaleString() : '—'}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span
                  className={cn(
                    'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                    timeline.capturedAt ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600',
                  )}
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-bold text-app-text">Captured</p>
                  <p className="text-xs text-neutral-500">
                    {timeline.capturedAt ? new Date(timeline.capturedAt).toLocaleString() : 'Pending'}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" aria-hidden />
                <div>
                  <p className="text-sm font-bold text-app-text">Settled</p>
                  <p className="text-xs text-neutral-500">
                    {timeline.settledAt ? new Date(timeline.settledAt).toLocaleString() : 'Awaiting Stripe payout rail'}
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled
              title="Stripe not connected"
              className="min-h-[44px] rounded-xl bg-neutral-200 px-4 text-sm font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            >
              Capture
            </button>
            <button
              type="button"
              disabled
              title="Stripe not connected"
              className="min-h-[44px] rounded-xl bg-neutral-200 px-4 text-sm font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            >
              Refund
            </button>
          </section>

          <section className="rounded-2xl border border-app-border p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Audit log</h3>
            {audit.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No payment audit events recorded for this order yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {audit.map((a) => (
                  <li key={a.id} className="rounded-xl border border-app-border bg-neutral-50/40 px-3 py-2 text-sm dark:bg-neutral-900/20">
                    <p className="font-bold text-app-text">{a.action}</p>
                    <p className="text-[10px] text-neutral-400">{new Date(a.timestamp).toLocaleString()}</p>
                    {a.actor ? (
                      <p className="mt-1 text-xs text-neutral-500">Actor: {a.actor.displayName || a.actor.email}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
