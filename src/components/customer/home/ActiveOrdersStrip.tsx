import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { getMyOrders, type MyOrderListItem } from '../../../services/orders';
import { cn } from '../../../lib/utils';

const ACTIVE_STATUSES = [
  'submitted', 'matching', 'matched', 'contracted', 'paid', 'in_progress',
] as const;

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === 'matched' || s === 'contracted') return 'bg-emerald-900/30 text-emerald-300';
  if (s === 'matching') return 'bg-yellow-900/30 text-yellow-300';
  if (s === 'paid' || s === 'in_progress') return 'bg-sky-900/30 text-sky-200';
  return 'bg-[#2a2f4a] text-[#8b90b0]';
}

function providerName(o: MyOrderListItem): string | null {
  const p = o.matchedSummary?.provider;
  if (!p) return null;
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.displayName || null;
}

export interface ActiveOrdersStripProps {
  /** Called after data loads so parent can react if needed */
  onLoad?: (count: number) => void;
}

export function ActiveOrdersStrip({ onLoad }: ActiveOrdersStripProps) {
  const [items, setItems] = useState<MyOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyOrders({ pageSize: 3, status: [...ACTIVE_STATUSES] })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items.slice(0, 3));
        onLoad?.(r.total);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2a2f4a] border-t-[#2b6eff]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#2a2f4a] bg-[#1e2235] px-6 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#2a2f4a] bg-[#0d0f1a]">
          <ClipboardList className="h-8 w-8 text-[#4a4f70]" />
        </span>
        <p className="text-sm font-black text-white">No active orders yet</p>
        <p className="text-xs text-[#8b90b0]">Your in-progress services will appear here.</p>
        <Link
          to="/orders/new"
          className="mt-1 inline-flex min-h-[44px] items-center rounded-xl bg-[#2b6eff] px-6 text-sm font-black text-white transition hover:bg-[#245be0]"
        >
          Book your first service
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((o) => (
        <Link
          key={o.id}
          to={`/orders/${o.id}`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#2a2f4a] bg-[#1e2235] px-4 py-3 transition hover:border-[#2b6eff]"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{o.serviceCatalog.name}</p>
            {providerName(o) && (
              <p className="mt-0.5 truncate text-[11px] font-semibold text-[#8b90b0]">
                {providerName(o)}
              </p>
            )}
          </div>
          <span className={cn(
            'shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest',
            statusColor(o.status),
          )}>
            {o.status.replace(/_/g, ' ')}
          </span>
        </Link>
      ))}
      <div className="pt-1 text-right">
        <Link
          to="/orders"
          className="text-[11px] font-black uppercase tracking-widest text-[#2b6eff] hover:underline"
        >
          See all →
        </Link>
      </div>
    </div>
  );
}
