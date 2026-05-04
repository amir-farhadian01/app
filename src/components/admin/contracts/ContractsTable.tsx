import { cn } from '../../../lib/utils';
import type { AdminContractQueueItem } from '../../../services/adminContracts';

function personLabel(p: { displayName: string | null; firstName?: string | null; lastName?: string | null; email: string }) {
  const n = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  if (n) return n;
  if (p.displayName?.trim()) return p.displayName.trim();
  return p.email;
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  return cn(
    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
    s === 'draft' && 'bg-neutral-200 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-100',
    s === 'sent' && 'bg-sky-200 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
    s === 'approved' && 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
    s === 'rejected' && 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-100',
    s === 'superseded' && 'bg-neutral-100 text-neutral-500 opacity-80 dark:bg-neutral-800 dark:text-neutral-400',
    !['draft', 'sent', 'approved', 'rejected', 'superseded'].includes(s) &&
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  );
}

type Props = {
  rows: AdminContractQueueItem[];
  loading: boolean;
  onOpen: (contractId: string) => void;
};

export function ContractsTable({ rows, loading, onOpen }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-16 text-sm font-semibold text-neutral-500">Loading contracts…</div>
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-app-border bg-app-card/50 py-16 text-center text-sm text-neutral-500">
        No contracts match these filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-app-border bg-app-card">
      <table className="min-w-[960px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-app-border bg-neutral-50/80 text-[11px] font-black uppercase tracking-widest text-neutral-500 dark:bg-neutral-900/40 dark:text-neutral-400">
            <th className="px-4 py-3">Contract ID</th>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Provider</th>
            <th className="px-4 py-3">Version</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const cv = r.currentVersion ?? r.versions[0] ?? null;
            const st = (cv?.status ?? '—').toLowerCase();
            const stLabel = cv?.status ? cv.status.toUpperCase() : '—';
            return (
              <tr key={r.id} className="border-b border-app-border last:border-0 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                <td className="px-4 py-3 font-mono text-xs text-app-text">{r.id}</td>
                <td className="px-4 py-3 font-mono text-xs text-app-text">{r.order.id}</td>
                <td className="px-4 py-3 text-app-text">{personLabel(r.order.customer)}</td>
                <td className="px-4 py-3 text-app-text">
                  {r.order.matchedProvider ? personLabel(r.order.matchedProvider) : '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                  {cv ? `v${cv.versionNumber}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={statusBadgeClass(st)}>{stLabel}</span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="min-h-[40px] rounded-lg border border-app-border px-3 text-xs font-bold text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(r.id);
                    }}
                  >
                    Open
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
