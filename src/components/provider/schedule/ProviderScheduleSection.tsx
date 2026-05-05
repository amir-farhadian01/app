import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, ChevronRight, Loader2, MapPin } from 'lucide-react';
import { useWorkspace } from '../../../lib/WorkspaceContext.js';
import { cn } from '../../../lib/utils.js';
import { getProviderPipelineOrders, type MyOrderListItem } from '../../../services/orders.js';
import { formatScheduleLabel } from '../../../lib/wizardScheduleLabel.js';
import type { ScheduleChoice } from '../../orders/Step2When.js';

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    submitted: 'Submitted',
    matching: 'Matching',
    matched: 'Matched',
    contracted: 'Contracted',
    paid: 'Paid',
    in_progress: 'In progress',
    disputed: 'Disputed',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

function sortUpcomingWorkspaceJobs(rows: MyOrderListItem[]): MyOrderListItem[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const ta = a.scheduledAt ? Date.parse(a.scheduledAt) : NaN;
    const tb = b.scheduledAt ? Date.parse(b.scheduledAt) : NaN;
    const aHas = Number.isFinite(ta);
    const bHas = Number.isFinite(tb);
    if (aHas && bHas) return ta - tb;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
  return copy;
}

export function ProviderScheduleSection() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const [items, setItems] = useState<MyOrderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProviderPipelineOrders({ page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : 'Could not load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const workspaceRows = useMemo(() => {
    if (!activeWorkspaceId) return [];
    return sortUpcomingWorkspaceJobs(
      items.filter((row) => row.matchedWorkspaceId === activeWorkspaceId),
    );
  }, [activeWorkspaceId, items]);

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
        <h2 className="text-lg font-black text-app-text">Schedule</h2>
        <p className="text-sm text-neutral-500">
          Select a company workspace to see upcoming jobs tied to that workspace.
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
        Loading upcoming jobs…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 space-y-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-bold text-app-text">Could not load schedule</p>
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-black tracking-tight text-app-text">Schedule</h2>
        <p className="text-sm text-neutral-500">
          Active orders for this workspace (not completed or closed), sorted by requested appointment when the
          customer picked a specific time; otherwise most recently updated first.
        </p>
      </header>

      {workspaceRows.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-app-border bg-app-card/60 p-8 text-center text-sm text-neutral-500"
          role="status"
        >
          No active jobs on your calendar for this workspace. New matches appear here after you acknowledge or win
          an offer from{' '}
          <Link to={{ pathname: '/dashboard', search: '?tab=inbox' }} className="font-bold text-app-text underline-offset-2 hover:underline">
            Inbox
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-3">
          {workspaceRows.map((row) => {
            const flex = (row.scheduleFlexibility || 'asap') as ScheduleChoice;
            const when = formatScheduleLabel(flex, row.scheduledAt);
            const shortId = row.id.slice(0, 8).toUpperCase();
            return (
              <li key={row.id}>
                <Link
                  to={`/orders/${row.id}`}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-app-border bg-app-card p-4 hover:border-neutral-400/60 transition-colors group',
                    focusRing,
                  )}
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                        Job #{shortId}
                      </span>
                      <span className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-app-text">
                        {statusLabel(row.status)}
                      </span>
                    </div>
                    <p className="font-bold text-app-text truncate">{row.serviceCatalog.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {when}
                      </span>
                      {row.address ? (
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{row.address}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight
                    className="w-5 h-5 text-neutral-400 group-hover:text-app-text shrink-0 sm:ml-2"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
