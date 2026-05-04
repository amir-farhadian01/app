import { Download } from 'lucide-react';
import type { AdminOrdersSegment } from './orderColumns';
import { cn } from '../../../lib/utils';

type PhaseOption = { id: AdminOrdersSegment; label: string; count: number };

type Props = {
  segment: AdminOrdersSegment;
  onSegmentChange: (next: AdminOrdersSegment) => void;
  phaseOptions: PhaseOption[];
  statusSearch: string;
  onStatusSearchChange: (value: string) => void;
};

export function AdminOrdersFilterBar({
  segment,
  onSegmentChange,
  phaseOptions,
  statusSearch,
  onStatusSearchChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-app-border bg-app-card/80 p-4 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[220px]">
        <label htmlFor="admin-orders-phase" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
          Phase
        </label>
        <select
          id="admin-orders-phase"
          className="rounded-xl border border-app-border bg-neutral-50 px-3 py-2.5 text-sm font-semibold text-app-text dark:bg-neutral-900"
          value={segment}
          onChange={(e) => onSegmentChange(e.target.value as AdminOrdersSegment)}
        >
          {phaseOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label} ({o.count})
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[280px]">
        <label htmlFor="admin-orders-status-search" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
          Status search
        </label>
        <input
          id="admin-orders-status-search"
          type="search"
          autoComplete="off"
          placeholder="e.g. match, cancel, closed…"
          value={statusSearch}
          onChange={(e) => onStatusSearchChange(e.target.value)}
          className="rounded-xl border border-app-border bg-neutral-50 px-3 py-2.5 text-sm text-app-text placeholder:text-neutral-400 dark:bg-neutral-900"
        />
      </div>
      <div className="flex shrink-0 items-end">
        <button
          type="button"
          disabled
          title="Coming soon"
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl border border-app-border px-4 py-2.5 text-sm font-bold',
            'cursor-not-allowed opacity-50 text-neutral-500',
          )}
        >
          <Download className="h-4 w-4" aria-hidden />
          Export CSV
        </button>
      </div>
    </div>
  );
}
