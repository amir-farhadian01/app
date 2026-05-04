import type { CrmColumnDef } from '../../crm/types.js';
import { exportCsv } from '../../crm/exportCsv.js';
import { cn } from '../../../lib/utils.js';
import type { ChatFlagRow, ChatModerationStatus } from '../../../services/adminChatModeration.js';

type ModerationTableProps = {
  rows: ChatFlagRow[];
  loading: boolean;
  onRowClick: (row: ChatFlagRow) => void;
};

function statusBadge(status: ChatModerationStatus) {
  const map: Record<string, string> = {
    masked: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
    flagged: 'bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-100',
    clean: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  };
  return (
    <span
      className={cn(
        'inline-flex rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
        map[status] ?? 'bg-neutral-200 text-neutral-800',
      )}
    >
      {status}
    </span>
  );
}

function reasonsCell(raw: unknown): string {
  if (raw == null) return '—';
  if (Array.isArray(raw)) return raw.slice(0, 3).join(', ') + (raw.length > 3 ? '…' : '');
  if (typeof raw === 'object') return JSON.stringify(raw).slice(0, 80) + '…';
  return String(raw).slice(0, 120);
}

export function ModerationTable({ rows, loading, onRowClick }: ModerationTableProps) {
  const exportColumns: CrmColumnDef<ChatFlagRow>[] = [
    { id: 'createdAt', header: 'Created', accessor: (r) => r.createdAt, exportValue: (r) => r.createdAt },
    { id: 'orderId', header: 'Order ID', accessor: (r) => r.thread.orderId },
    { id: 'workspace', header: 'Workspace', accessor: (r) => r.thread.order.matchedWorkspace?.name ?? '' },
    { id: 'workspaceId', header: 'Workspace ID', accessor: (r) => r.thread.order.matchedWorkspaceId ?? '' },
    { id: 'senderRole', header: 'Sender role', accessor: (r) => r.senderRole },
    { id: 'senderId', header: 'Sender ID', accessor: (r) => r.senderId },
    { id: 'status', header: 'Status', accessor: (r) => r.moderationStatus },
    { id: 'reasons', header: 'Reasons', accessor: (r) => reasonsCell(r.moderationReasons) },
    { id: 'preview', header: 'Preview', accessor: (r) => r.displayText.slice(0, 200) },
    { id: 'original', header: 'Original', accessor: (r) => r.originalText.slice(0, 200) },
    { id: 'messageId', header: 'Message ID', accessor: (r) => r.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => exportCsv(exportColumns, rows, `chat-moderation-${new Date().toISOString().slice(0, 10)}.csv`)}
          disabled={!rows.length}
          className="rounded-xl border border-app-border px-4 py-2 text-[10px] font-black uppercase tracking-widest text-app-text disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-app-border bg-app-card shadow-sm">
        <table className="min-w-full divide-y divide-app-border text-left text-sm">
          <thead className="bg-neutral-50/80 dark:bg-neutral-900/40">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Created</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Order</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Workspace</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Role</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Status</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Reasons</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-neutral-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-neutral-500">
                  No rows match the current filters.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"
                  onClick={() => onRowClick(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(r);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open moderation detail for message ${r.id}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-600">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-app-text">{r.thread.orderId}</td>
                  <td className="max-w-[140px] truncate px-4 py-3 text-xs text-app-text">
                    {r.thread.order.matchedWorkspace?.name ?? r.thread.order.matchedWorkspaceId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-app-text">{r.senderRole}</td>
                  <td className="px-4 py-3">{statusBadge(r.moderationStatus)}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-neutral-600" title={reasonsCell(r.moderationReasons)}>
                    {reasonsCell(r.moderationReasons)}
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-xs text-neutral-700" title={r.displayText}>
                    {r.displayText}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
