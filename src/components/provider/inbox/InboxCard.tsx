import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import type { ProviderInboxItem } from '../../../services/providerInbox';
import { cn } from '../../../lib/utils';

function fmtPrice(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy || 'CAD', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n} ${ccy}`;
  }
}

function maskedCity(address: string): string {
  if (!address) return '—';
  // Return only the city/area portion — last meaningful segment before postal
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2] ?? parts[0] ?? '—';
  return parts[0] ?? '—';
}

function budgetLine(item: ProviderInboxItem): string | null {
  const picks = item.order.customerPicks;
  if (!picks) return null;
  const min = typeof picks.budgetMin === 'number' ? picks.budgetMin : null;
  const max = typeof picks.budgetMax === 'number' ? picks.budgetMax : null;
  const ccy = item.package.currency || 'CAD';
  if (min != null && max != null) return `${fmtPrice(min, ccy)} – ${fmtPrice(max, ccy)}`;
  if (min != null) return `From ${fmtPrice(min, ccy)}`;
  if (max != null) return `Up to ${fmtPrice(max, ccy)}`;
  return null;
}

/** Returns [hh:mm remaining, isDanger] or null if no/expired expiry. */
function computeCountdown(expiresAt: string | null | undefined): [string, boolean] | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return ['Expired', true];
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60).toString().padStart(2, '0');
  const m = (totalMin % 60).toString().padStart(2, '0');
  const danger = ms <= 2 * 3600 * 1000;
  return [`${h}:${m}`, danger];
}

function useCountdown(expiresAt: string | null | undefined): [string, boolean] | null {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return computeCountdown(expiresAt);
  // tick is intentionally read to force re-evaluation each minute
  void tick;
}

// Suppress the lint warning about unused tick — it's used to trigger re-render
function useCountdownWithTick(expiresAt: string | null | undefined): [string, boolean] | null {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return tick >= 0 ? computeCountdown(expiresAt) : null;
}

export { useCountdownWithTick as useCountdown };

interface InboxCardProps {
  item: ProviderInboxItem;
  pendingAction?: 'ack' | 'decline' | null;
  busy?: boolean;
  onOpen: (item: ProviderInboxItem) => void;
  onAcknowledge: (item: ProviderInboxItem) => void;
  onDecline: (item: ProviderInboxItem) => void;
}

export function InboxCard({ item, pendingAction, busy = false, onOpen, onAcknowledge, onDecline }: InboxCardProps) {
  const countdown = useCountdownWithTick(item.expiresAt);
  const budget = budgetLine(item);
  const city = maskedCity(item.order.address);
  const serviceName = item.serviceCatalog?.name ?? item.package.name;

  // "Accept" (acknowledge) is only available for invited/matched; for invited it's the first step
  const canAck = item.status === 'invited' || item.status === 'matched';
  const canDecline = item.status === 'invited' || item.status === 'matched';

  return (
    <div
      className="rounded-2xl border border-app-border bg-app-card p-4 space-y-3 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 transition"
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(item)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-black text-app-text">{serviceName}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{city}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest',
            item.status === 'invited' && 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200',
            item.status === 'matched' && 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
            item.status === 'accepted' && 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
            item.status === 'declined' && 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
            item.status === 'expired' && 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
            item.status === 'superseded' && 'bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200',
          )}
        >
          {item.status}
        </span>
      </div>

      {/* Budget + expiry */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {budget ? (
          <span className="font-semibold text-app-text">{budget}</span>
        ) : (
          <span className="font-semibold text-app-text">{fmtPrice(item.package.finalPrice, item.package.currency)}</span>
        )}
        {countdown ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold',
              countdown[1]
                ? 'animate-pulse border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                : 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
            )}
          >
            {countdown[1] ? <AlertTriangle className="h-3 w-3" aria-hidden /> : <Clock className="h-3 w-3" aria-hidden />}
            {countdown[0]}
          </span>
        ) : null}
      </div>

      {/* BOM lines */}
      {item.package.bom && item.package.bom.length > 0 ? (
        <div className="rounded-lg border border-app-border bg-app-input/30 px-3 py-2 text-xs space-y-1">
          <p className="font-black uppercase tracking-wider text-neutral-500">Materials</p>
          {item.package.bom.slice(0, 3).map((line, i) => (
            <div key={i} className="flex justify-between gap-2 text-app-text">
              <span className="truncate">{line.snapshotProductName} × {line.quantity}</span>
              <span className="tabular-nums shrink-0 text-neutral-500">
                {fmtPrice(line.snapshotUnitPrice * line.quantity, line.snapshotCurrency)}
              </span>
            </div>
          ))}
          {item.package.bom.length > 3 ? (
            <p className="text-neutral-500">+{item.package.bom.length - 3} more</p>
          ) : null}
        </div>
      ) : null}

      {/* Actions */}
      {canAck || canDecline ? (
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={!canAck || busy}
            onClick={() => onAcknowledge(item)}
            className={cn(
              'flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-black uppercase tracking-wide',
              canAck
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60'
                : 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-800',
            )}
          >
            {busy && pendingAction === 'ack' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {item.status === 'invited' ? 'Accept' : 'Acknowledge'}
          </button>
          <button
            type="button"
            disabled={!canDecline || busy}
            onClick={() => onDecline(item)}
            className={cn(
              'flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-black uppercase tracking-wide',
              canDecline
                ? 'border-amber-500 text-amber-800 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-200 dark:hover:bg-amber-950/40 disabled:opacity-60'
                : 'cursor-not-allowed border-neutral-200 text-neutral-400 dark:border-neutral-700',
            )}
          >
            {busy && pendingAction === 'decline' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Decline
          </button>
        </div>
      ) : null}
    </div>
  );
}
