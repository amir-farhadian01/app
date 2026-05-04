import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ModerationDrawer } from './ModerationDrawer.js';
import { ModerationTable } from './ModerationTable.js';
import type { ChatFlagRow, ChatModerationStatus } from '../../../services/adminChatModeration.js';
import { listChatFlags } from '../../../services/adminChatModeration.js';

function isReviewed(row: ChatFlagRow): boolean {
  const meta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const rev = meta.moderationReview;
  if (!rev || typeof rev !== 'object' || Array.isArray(rev)) return false;
  const at = (rev as Record<string, unknown>).reviewedAt;
  return typeof at === 'string' && at.trim().length > 0;
}

export function AdminChatModerationSection() {
  const [items, setItems] = useState<ChatFlagRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChatFlagRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [hideReviewed, setHideReviewed] = useState(false);
  const [statusMasked, setStatusMasked] = useState(true);
  const [statusFlagged, setStatusFlagged] = useState(true);
  const [statusBlocked, setStatusBlocked] = useState(true);

  const statusFilter = useMemo((): ChatModerationStatus[] | undefined => {
    const s: ChatModerationStatus[] = [];
    if (statusMasked) s.push('masked');
    if (statusFlagged) s.push('flagged');
    if (statusBlocked) s.push('blocked');
    return s.length ? s : ['masked', 'flagged', 'blocked', 'clean'];
  }, [statusMasked, statusFlagged, statusBlocked]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await listChatFlags({
        from: from.trim() || undefined,
        to: to.trim() || undefined,
        workspaceId: workspaceId.trim() || undefined,
        providerId: providerId.trim() || undefined,
        customerId: customerId.trim() || undefined,
        participantId: participantId.trim() || undefined,
        status: statusFilter,
        limit: 500,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load flags');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [from, to, workspaceId, providerId, customerId, participantId, statusFilter]);

  useEffect(() => {
    void load();
    // Initial load only; filter changes apply via Refresh / Apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRows = useMemo(
    () => (hideReviewed ? items.filter((r) => !isReviewed(r)) : items),
    [items, hideReviewed],
  );

  const openRow = (row: ChatFlagRow) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const onUpdated = (row: ChatFlagRow) => {
    setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, ...row } : x)));
    setSelected(row);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h3 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Chat moderation</h3>
        <p className="text-sm text-neutral-500">
          Flagged, masked, and blocked order-chat messages. PII decisions are enforced on the server; this view is for review
          and support follow-up.
        </p>
      </div>

      <div className="rounded-[2rem] border border-app-border bg-app-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">From (ISO date)</span>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm"
              placeholder="2026-04-01"
              aria-label="Filter from date"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">To (ISO date)</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm"
              placeholder="2026-04-30"
              aria-label="Filter to date"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">Workspace (company ID)</span>
            <input
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 font-mono text-sm"
              placeholder="matched workspace / company id"
              aria-label="Workspace company id filter"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">Provider user ID</span>
            <input
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 font-mono text-sm"
              aria-label="Provider user id filter"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">Customer user ID</span>
            <input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 font-mono text-sm"
              aria-label="Customer user id filter"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">Participant (any party)</span>
            <input
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 font-mono text-sm"
              placeholder="customer, provider, or sender id"
              aria-label="Participant user id filter"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-app-border pt-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Moderation status</span>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={statusMasked} onChange={(e) => setStatusMasked(e.target.checked)} />
            masked
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={statusFlagged} onChange={(e) => setStatusFlagged(e.target.checked)} />
            flagged
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={statusBlocked} onChange={(e) => setStatusBlocked(e.target.checked)} />
            blocked
          </label>
          <label className="ml-auto flex items-center gap-2 text-xs">
            <input type="checkbox" checked={hideReviewed} onChange={(e) => setHideReviewed(e.target.checked)} />
            Hide reviewed (this page)
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-app-border px-4 py-2 text-[10px] font-black uppercase tracking-widest text-app-text"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-app-text px-4 py-2 text-[10px] font-black uppercase tracking-widest text-app-bg"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
          <span className="text-xs text-neutral-500">
            Showing {visibleRows.length} of {items.length} loaded (server total: {total})
          </span>
        </div>
      </div>

      {err && <p className="text-sm font-medium text-red-600">{err}</p>}

      <ModerationTable rows={visibleRows} loading={loading} onRowClick={openRow} />

      <ModerationDrawer
        row={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={onUpdated}
      />
    </div>
  );
}
