import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAll, get, listWorkspacesForFilter, type AdminProductListItem, type AdminProductDetail } from '../../../services/adminProducts';
import { ProductsGlobalTable } from './ProductsGlobalTable';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import { cn } from '../../../lib/utils';
import type { FilterValue, Sort } from '../../crm/types';

type ArchivedMode = 'active' | 'archived' | 'all';

export function AdminInventorySection({
  setNotification,
}: {
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
}) {
  const [rows, setRows] = useState<AdminProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort | null>({ id: 'updatedAt', dir: 'desc' });
  const [filters, setFilters] = useState<Record<string, FilterValue>>({
    isActive: { type: 'boolean', value: null },
    category: { type: 'text', value: '' },
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [archivedMode, setArchivedMode] = useState<ArchivedMode>('active');
  const [workspaceOptions, setWorkspaceOptions] = useState<{ id: string; name: string }[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await listWorkspacesForFilter();
        setWorkspaceOptions(r.items.map((w) => ({ id: w.id, name: w.name })));
      } catch {
        setWorkspaceOptions([]);
      }
    })();
  }, []);

  const sortApi = useMemo(() => {
    const id = sort?.id ?? 'updatedAt';
    const dir = sort?.dir ?? 'desc';
    const map: Record<string, 'createdAt' | 'name' | 'sku' | 'unitPrice' | 'sortOrder' | 'category' | 'updatedAt'> = {
      name: 'name',
      sku: 'sku',
      unitPrice: 'unitPrice',
      category: 'category',
      updatedAt: 'updatedAt',
    };
    return { sortBy: map[id] ?? 'updatedAt', sortDir: dir as 'asc' | 'desc' };
  }, [sort]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const catF = filters.category;
      const category = catF?.type === 'text' && catF.value.trim() ? catF.value.trim() : undefined;
      const actF = filters.isActive;
      const isActive = actF?.type === 'boolean' && actF.value !== null ? actF.value : undefined;
      const res = await listAll({
        page,
        pageSize,
        q: globalSearch.trim() || undefined,
        workspaceId: workspaceId.trim() || undefined,
        category,
        isActive,
        archived: archivedMode === 'active' ? 'false' : archivedMode === 'archived' ? 'true' : undefined,
        sortBy: sortApi.sortBy,
        sortDir: sortApi.sortDir,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setNotification({
        show: true,
        message: e instanceof Error ? e.message : 'Failed to load inventory',
        type: 'error',
      });
      setTimeout(() => setNotification(null), 5000);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    globalSearch,
    workspaceId,
    archivedMode,
    filters,
    sortApi.sortBy,
    sortApi.sortDir,
    setNotification,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRowOpen = (r: AdminProductListItem) => {
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);
    void (async () => {
      try {
        const d = await get(r.id);
        setDetail(d);
      } catch (e) {
        setNotification({
          show: true,
          message: e instanceof Error ? e.message : 'Load failed',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 5000);
        setDrawerOpen(false);
      } finally {
        setDetailLoading(false);
      }
    })();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-app-text">Inventory</h1>
        <p className="mt-1 text-sm text-neutral-500">Read-only catalog across all workspaces.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Archive</span>
        {(['active', 'archived', 'all'] as ArchivedMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setArchivedMode(m);
              setPage(1);
            }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold transition',
              archivedMode === m
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'border border-app-border bg-app-card text-neutral-600 hover:text-app-text',
            )}
          >
            {m === 'active' ? 'Active' : m === 'archived' ? 'Archived' : 'All'}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-neutral-600">
            <span className="font-semibold">Workspace</span>
            <input
              className="w-44 rounded-lg border border-app-border bg-app-input px-2 py-1 text-sm text-app-text"
              value={workspaceId}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by workspace id"
              list="admin-inv-ws"
            />
            <datalist id="admin-inv-ws">
              {workspaceOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </datalist>
          </label>
        </div>
      </div>

      <ProductsGlobalTable
        rows={rows}
        total={total}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        onRowClick={onRowOpen}
      />

      <ProductDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        row={detail}
        loading={detailLoading}
      />
    </div>
  );
}
