import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AdminContractDetail, AdminContractQueueItem } from '../../../services/adminContracts';
import { fetchAdminContractDetail, fetchContractQueue } from '../../../services/adminContracts';
import { ContractsTable } from './ContractsTable';
import { ContractDetailDrawer } from './ContractDetailDrawer';

type Props = {
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
};

export function AdminContractsSection({ setNotification }: Props) {
  const [rows, setRows] = useState<AdminContractQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [versionStatus, setVersionStatus] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminContractDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchContractQueue({
        attention: attentionOnly || undefined,
        workspaceId: workspaceId.trim() || undefined,
        q: q.trim() || undefined,
        dateFrom: dateFrom.trim() || undefined,
        dateTo: dateTo.trim() || undefined,
        versionStatus: versionStatus.trim() || undefined,
      });
      setRows(res.items);
    } catch (e: unknown) {
      setNotification({
        show: true,
        message: e instanceof Error ? e.message : 'Failed to load contracts',
        type: 'error',
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [attentionOnly, workspaceId, q, dateFrom, dateTo, versionStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDrawer = useCallback(
    async (contractId: string) => {
      setDrawerOpen(true);
      setDetailLoading(true);
      try {
        const d = await fetchAdminContractDetail(contractId);
        setDetail(d);
      } catch (e: unknown) {
        setNotification({
          show: true,
          message: e instanceof Error ? e.message : 'Failed to load contract',
          type: 'error',
        });
        setDrawerOpen(false);
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [setNotification],
  );

  const refreshDetail = useCallback(async () => {
    if (!detail?.id) return;
    const d = await fetchAdminContractDetail(detail.id);
    setDetail(d);
    await load();
  }, [detail?.id, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-app-text">Contracts</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Order contract lifecycle, mismatch warnings, and support overrides.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-app-border px-4 text-sm font-bold text-app-text disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-app-border bg-app-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500">
          Attention (sent/rejected)
          <input
            type="checkbox"
            checked={attentionOnly}
            onChange={(e) => setAttentionOnly(e.target.checked)}
            className="mt-2 block h-5 w-5"
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500">
          Workspace ID
          <input
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
            placeholder="cuid…"
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500">
          Version status filter
          <input
            value={versionStatus}
            onChange={(e) => setVersionStatus(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
            placeholder="sent,rejected or approved"
          />
        </label>
        <label className="sm:col-span-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
          Provider / customer / order search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
            placeholder="email, name, or order id"
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500">
          Updated from
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500">
          Updated to
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-[44px] w-full rounded-xl bg-neutral-900 text-sm font-bold text-white dark:bg-white dark:text-neutral-900"
          >
            Apply filters
          </button>
        </div>
      </div>

      <ContractsTable rows={rows} loading={loading} onOpen={(id) => void openDrawer(id)} />

      <ContractDetailDrawer
        detail={detail}
        open={drawerOpen}
        loading={detailLoading}
        onClose={() => {
          setDrawerOpen(false);
          setDetail(null);
        }}
        onRefresh={refreshDetail}
      />
    </div>
  );
}
