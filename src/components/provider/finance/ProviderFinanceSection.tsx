import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDot,
  Loader2,
  Receipt,
  Wallet,
} from 'lucide-react';
import { useWorkspace } from '../../../lib/WorkspaceContext.js';
import { cn } from '../../../lib/utils.js';
import {
  fetchWorkspaceFinance,
  type ProviderWorkspaceFinanceResponse,
} from '../../../services/providerFinance.js';

function formatOrderMoney(amount: number, currency: string): string {
  if (currency === 'MIXED') {
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (numeric sum)`;
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatLedgerAmount(row: ProviderWorkspaceFinanceResponse['ledger'][0]): string {
  const prefix =
    row.flow === 'credit' ? '+' : row.flow === 'debit' ? '−' : '';
  const n = row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (row.kind === 'order' && row.currency) {
    try {
      const cur = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: row.currency,
      }).format(row.amount);
      return `${prefix}${cur}`;
    } catch {
      return `${prefix}${row.currency} ${n}`;
    }
  }
  return `${prefix}${n}`;
}

export function ProviderFinanceSection() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const [data, setData] = useState<ProviderWorkspaceFinanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorkspaceFinance(activeWorkspaceId);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Could not load finance data');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const focusRing =
    'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

  if (wsLoading) {
    return (
      <div
        className="rounded-2xl border border-app-border bg-app-card p-10 flex items-center justify-center gap-3 text-neutral-500"
        aria-busy="true"
      >
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        Loading workspace…
      </div>
    );
  }

  if (!activeWorkspaceId) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-card p-8 space-y-2">
        <h2 className="text-lg font-black text-app-text">Finance</h2>
        <p className="text-sm text-neutral-500">
          Select or create a company workspace to see orders, internal ledger entries, and contract amounts.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl border border-app-border bg-app-card p-10 flex items-center justify-center gap-3 text-neutral-500"
        aria-busy="true"
      >
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        Loading finance overview…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 space-y-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-bold text-app-text">Could not load finance</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className={cn(
            'inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-bold',
            focusRing,
          )}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, ledger, invoices, payoutHistory } = data;
  const cur = summary.displayCurrency;

  return (
    <div className="space-y-8">
      <section
        className="rounded-2xl border border-amber-500/35 bg-amber-500/10 dark:bg-amber-500/15 p-5 space-y-2"
        aria-labelledby="finance-gateway-heading"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <div>
            <h2 id="finance-gateway-heading" className="text-sm font-black uppercase tracking-widest text-app-text">
              Payment gateway not connected
            </h2>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
              Amounts below come from matched orders, contract versions, and internal ledger records only. No card
              processor is attached;{' '}
              <strong className="font-semibold text-app-text">payouts are not processed</strong> and totals are not
              bank settlements.
            </p>
            <p className="text-xs text-neutral-500 mt-2">
              Operational view — use your own accounting for tax and compliance.
            </p>
          </div>
        </div>
      </section>

      {summary.mixedCurrency ? (
        <p className="text-xs text-amber-800 dark:text-amber-200/90 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          Multiple currencies detected on orders. Summary totals add numeric amounts across currencies; treat them as a
          rough indicator only.
        </p>
      ) : null}

      <section aria-label="Finance summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-1">
            <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-black uppercase tracking-widest">
              <Wallet className="w-3.5 h-3.5" aria-hidden />
              Estimated earnings
            </div>
            <p className="text-2xl font-black text-app-text tabular-nums">
              {formatOrderMoney(summary.estimatedEarnings, cur)}
            </p>
            <p className="text-xs text-neutral-500">
              Sum of agreed amounts on completed + closed orders (contract or package). Not a payout or bank balance.
            </p>
          </div>
          <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-1">
            <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-black uppercase tracking-widest">
              <CircleDot className="w-3.5 h-3.5" aria-hidden />
              Pending amount
            </div>
            <p className="text-2xl font-black text-app-text tabular-nums">
              {formatOrderMoney(summary.pendingAmount, cur)}
            </p>
            <p className="text-xs text-neutral-500">
              Matched through in progress — value may still change with the job lifecycle.
            </p>
          </div>
          <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Completed job count</p>
            <p className="text-2xl font-black text-app-text tabular-nums">{summary.completedJobCount}</p>
            <p className="text-xs text-neutral-500">Statuses: completed + closed.</p>
          </div>
          <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Disputed jobs</p>
            <p className="text-2xl font-black text-app-text tabular-nums">{summary.disputedJobCount}</p>
            <p className="text-xs text-neutral-500">Orders currently in disputed status.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-app-border bg-app-card overflow-hidden" aria-labelledby="ledger-h">
        <div className="px-5 py-4 border-b border-app-border flex items-center gap-2">
          <Receipt className="w-4 h-4 text-app-text" aria-hidden />
          <h3 id="ledger-h" className="text-sm font-black uppercase tracking-widest text-app-text">
            Ledger (orders + internal entries)
          </h3>
        </div>
        {ledger.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">No ledger rows yet — no matched orders or company-scoped transactions.</p>
        ) : (
          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-app-card border-b border-app-border text-[10px] uppercase tracking-widest text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-black">Date</th>
                  <th className="px-4 py-2 font-black">Description</th>
                  <th className="px-4 py-2 font-black text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="border-b border-app-border/60 last:border-0">
                    <td className="px-4 py-2.5 text-neutral-500 whitespace-nowrap tabular-nums">
                      {new Date(row.at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-app-text">{row.label}</div>
                      {row.detail ? (
                        <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                          {row.flow === 'credit' ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" aria-hidden />
                          ) : row.flow === 'debit' ? (
                            <ArrowUpRight className="w-3 h-3 text-rose-600" aria-hidden />
                          ) : null}
                          <span className="break-all">{row.detail}</span>
                        </div>
                      ) : null}
                      {row.kind === 'transaction' ? (
                        <div className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wide">
                          Internal transaction record (no currency on file)
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-app-text whitespace-nowrap">
                      {formatLedgerAmount(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="rounded-2xl border border-dashed border-app-border bg-app-bg/40 p-6 space-y-2"
        aria-labelledby="payout-h"
      >
        <h3 id="payout-h" className="text-sm font-black uppercase tracking-widest text-app-text">
          Payout history
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{payoutHistory.placeholderMessage}</p>
        {!payoutHistory.available ? (
          <p className="text-xs text-neutral-500">No payout batches have been recorded for this workspace.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-app-border bg-app-card overflow-hidden" aria-labelledby="inv-h">
        <div className="px-5 py-4 border-b border-app-border flex items-center gap-2">
          <Receipt className="w-4 h-4 text-app-text" aria-hidden />
          <h3 id="inv-h" className="text-sm font-black uppercase tracking-widest text-app-text">
            Job value by order (invoice-style)
          </h3>
        </div>
        {invoices.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">No matched orders for this workspace yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-app-border text-[10px] uppercase tracking-widest text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-black">Order</th>
                  <th className="px-4 py-2 font-black">Customer</th>
                  <th className="px-4 py-2 font-black">Service</th>
                  <th className="px-4 py-2 font-black">Contract version</th>
                  <th className="px-4 py-2 font-black">Order status</th>
                  <th className="px-4 py-2 font-black text-right">Amount</th>
                  <th className="px-4 py-2 font-black text-right">Updated</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.orderId} className="border-b border-app-border/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/orders/${inv.orderId}`}
                        className={cn('font-mono text-xs text-emerald-700 dark:text-emerald-400 underline-offset-2 hover:underline', focusRing)}
                      >
                        {inv.orderId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 max-w-[140px] truncate" title={inv.customerLabel}>
                      {inv.customerLabel}
                    </td>
                    <td className="px-4 py-2.5 max-w-[160px] truncate" title={inv.serviceName}>
                      {inv.serviceName}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400 text-xs">
                      {inv.contractVersionStatus ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs uppercase tracking-wide">{inv.orderStatus}</td>
                    <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
                      {formatOrderMoney(inv.amount, inv.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-neutral-500 text-xs whitespace-nowrap tabular-nums">
                      {new Date(inv.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
