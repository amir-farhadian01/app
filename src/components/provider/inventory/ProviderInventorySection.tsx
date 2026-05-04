import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../../lib/WorkspaceContext';
import { useSoftToast } from '../../../lib/SoftToastContext';
import {
  listProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  unarchiveProduct,
  deleteProduct,
  type ProductRow,
} from '../../../services/inventory';
import type { FilterValue, Sort } from '../../crm/types';
import { ProductsTable } from './ProductsTable';
import { ProductEditorDrawer } from './ProductEditorDrawer';
import { cn } from '../../../lib/utils';

type ArchivedMode = 'active' | 'archived' | 'all';

export function ProviderInventorySection() {
  const navigate = useNavigate();
  const { activeWorkspaceId, loading: wsLoad } = useWorkspace();
  const { showToast } = useSoftToast();
  const [workspaceCurrency, setWorkspaceCurrency] = useState('CAD');
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [load, setLoad] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<Sort | null>({ id: 'updatedAt', dir: 'desc' });
  const [filters, setFilters] = useState<Record<string, FilterValue>>({
    isActive: { type: 'boolean', value: null },
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [archivedMode, setArchivedMode] = useState<ArchivedMode>('active');
  const [categoryExact, setCategoryExact] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [edit, setEdit] = useState<ProductRow | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let c = false;
    void (async () => {
      try {
        const res = await listProducts(activeWorkspaceId, { page: 1, pageSize: 200, archived: 'false' });
        if (c) return;
        const s = new Set<string>();
        for (const p of res.items) {
          if (p.category?.trim()) s.add(p.category.trim());
        }
        setCategoryOptions([...s].sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!c) setCategoryOptions([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [activeWorkspaceId]);

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
    const sortBy = map[id] ?? 'updatedAt';
    return { sortBy, sortDir: dir as 'asc' | 'desc' };
  }, [sort]);

  const loadProducts = useCallback(async () => {
    if (!activeWorkspaceId) {
      setRows([]);
      setTotal(0);
      setLoad(false);
      return;
    }
    setLoad(true);
    try {
      const isActiveF = filters.isActive;
      const isActive =
        isActiveF?.type === 'boolean' && isActiveF.value !== null ? isActiveF.value : undefined;
      const res = await listProducts(activeWorkspaceId, {
        page,
        pageSize,
        q: globalSearch.trim() || undefined,
        category: categoryExact.trim() || undefined,
        isActive,
        archived: archivedMode === 'active' ? 'false' : archivedMode === 'archived' ? 'true' : undefined,
        sortBy: sortApi.sortBy,
        sortDir: sortApi.sortDir,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load');
      setRows([]);
      setTotal(0);
    } finally {
      setLoad(false);
    }
  }, [
    activeWorkspaceId,
    page,
    pageSize,
    globalSearch,
    categoryExact,
    archivedMode,
    filters,
    sortApi.sortBy,
    sortApi.sortDir,
    showToast,
  ]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const goPackages = useCallback(() => {
    const p = new URLSearchParams();
    p.set('tab', 'packages');
    navigate({ pathname: '/dashboard', search: p.toString() });
  }, [navigate]);

  const onDuplicate = async (r: ProductRow) => {
    try {
      await createProduct(activeWorkspaceId!, {
        name: `${r.name} (Copy)`.slice(0, 120),
        category: r.category ?? undefined,
        unit: r.unit,
        unitPrice: r.unitPrice,
        currency: r.currency,
        stockQuantity: r.stockQuantity,
        description: r.description ?? undefined,
      });
      showToast('Product duplicated');
      void loadProducts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Duplicate failed');
    }
  };

  const onArchiveToggle = async (r: ProductRow) => {
    try {
      if (r.archivedAt) {
        await unarchiveProduct(activeWorkspaceId!, r.id);
      } else {
        await archiveProduct(activeWorkspaceId!, r.id);
      }
      showToast('Updated');
      void loadProducts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Archive failed');
    }
  };

  const onDelete = async (r: ProductRow) => {
    if (!window.confirm(`Delete “${r.name}”? This cannot be undone.`)) return;
    try {
      await deleteProduct(activeWorkspaceId!, r.id);
      showToast('Product deleted');
      void loadProducts();
    } catch (e) {
      const err = e as Error & { status?: number; body?: { packageIds?: string[]; referenceCount?: number } };
      if (err.status === 409) {
        const n = (err.body as { referenceCount?: number })?.referenceCount ?? 0;
        showToast(
          `Used in ${n} package(s). Remove it from Bill of Materials in My Packages first, then delete here.`,
        );
        return;
      }
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const onToggleActive = async (r: ProductRow, on: boolean) => {
    try {
      await updateProduct(activeWorkspaceId!, r.id, { isActive: on });
      void loadProducts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (wsLoad) {
    return <p className="text-sm text-neutral-500">Loading workspace…</p>;
  }
  if (!activeWorkspaceId) {
    return <p className="text-sm text-amber-700 dark:text-amber-300">Select a workspace first.</p>;
  }

  return (
    <div className="space-y-4">
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
            <span className="font-semibold">Category</span>
            <input
              className="w-36 rounded-lg border border-app-border bg-app-input px-2 py-1 text-sm text-app-text"
              value={categoryExact}
              onChange={(e) => {
                setCategoryExact(e.target.value);
                setPage(1);
              }}
              placeholder="Exact match"
              list="inv-cat-list"
            />
            <datalist id="inv-cat-list">
              {categoryOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <button
            type="button"
            onClick={() => {
              setEdit(null);
              setDrawerOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>
      </div>

      {!load && total === 0 && !globalSearch.trim() && !categoryExact.trim() ? (
        <div
          className="rounded-3xl border border-dashed border-app-border bg-app-card/60 p-10 text-center"
          role="region"
          aria-labelledby="inv-empty-title"
        >
          <h2 id="inv-empty-title" className="text-lg font-black text-app-text">
            Add your first product
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Products are used to build cost-of-service breakdowns for your packages.
          </p>
          <button
            type="button"
            onClick={() => {
              setEdit(null);
              setDrawerOpen(true);
            }}
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900"
          >
            Add your first product →
          </button>
        </div>
      ) : (
        <ProductsTable
          workspaceId={activeWorkspaceId}
          rows={rows}
          total={total}
          loading={load}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          sort={sort}
          onSortChange={setSort}
          filters={filters}
          onFiltersChange={setFilters}
          globalSearch={globalSearch}
          onGlobalSearchChange={(q) => {
            setGlobalSearch(q);
            setPage(1);
          }}
          onEdit={(r) => {
            setEdit(r);
            setDrawerOpen(true);
          }}
          onDuplicate={onDuplicate}
          onArchiveToggle={onArchiveToggle}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      )}

      <p className="text-center text-xs text-neutral-500">
        Used in packages?{' '}
        <button type="button" className="font-bold text-app-text underline" onClick={goPackages}>
          Go to My Packages →
        </button>
      </p>

      <ProductEditorDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEdit(null);
        }}
        workspaceId={activeWorkspaceId}
        workspaceCurrency={workspaceCurrency}
        initial={edit}
        categorySuggestions={categoryOptions}
        onSaved={() => void loadProducts()}
        showToast={showToast}
      />
    </div>
  );
}
