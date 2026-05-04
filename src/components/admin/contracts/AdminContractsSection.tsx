import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AdminContractDetail, AdminContractQueueItem } from '../../../services/adminContracts';
import { fetchAdminContractDetail, fetchContractQueue } from '../../../services/adminContracts';
import { ContractsTable } from './ContractsTable';
import { ContractDetailDrawer } from './ContractDetailDrawer';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function versionStatusParam(f: StatusFilter): string | undefined {
  if (f === 'all') return undefined;
  if (f === 'pending') return 'sent';
  if (f === 'approved') return 'approved';
  return 'rejected';
}

type Props = {
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
};

export function AdminContractsSection({ setNotification }: Props) {
  const [rows, setRows] = useState<AdminContractQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [orderIdApplied, setOrderIdApplied] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminContractDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const vs = versionStatusParam(statusFilter);
      const res = await fetchContractQueue({
        versionStatus: vs,
        q: orderIdApplied.trim() || undefined,
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
  }, [statusFilter, orderIdApplied]);

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

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-app-border bg-app-card p-4">
        <label className="block min-w-[200px] flex-1 text-xs font-bold uppercase tracking-wide text-neutral-500">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="mt-1 block w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
          >
            <option value="all">All</option>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="block min-w-[220px] flex-[2] text-xs font-bold uppercase tracking-wide text-neutral-500">
          Search by order ID
          <input
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 font-mono text-sm text-app-text"
            placeholder="Order cuid…"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setOrderIdApplied(orderIdInput.trim());
          }}
          className="min-h-[44px] rounded-xl bg-neutral-900 px-6 text-sm font-bold text-white dark:bg-white dark:text-neutral-900"
        >
          Apply
        </button>
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
