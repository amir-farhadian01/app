import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Copy, Plus, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { CrmTable } from '../../crm/CrmTable.js';
import type { CrmColumnDef, FilterValue, Sort } from '../../crm/types.js';
import { cn } from '../../../lib/utils.js';
import {
  listServiceDefinitions,
  deleteServiceDefinition,
  updateServiceDefinition,
  getCategoryTree,
  type ServiceCatalogListItem,
  type CategoryTreeNode,
} from '../../../services/adminServiceDefinitions';
import { buildBreadcrumbFromTree } from './CategoryPicker';

type Props = {
  /** Changes here refetch the list (e.g. after duplicate) */
  refreshKey?: number;
  onEdit: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
  setShowConfirm: (c: {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    type?: 'danger' | 'warning' | 'info';
  }) => void;
};

function flattenCategoryOptions(nodes: CategoryTreeNode[], out: { value: string; label: string }[] = []): { value: string; label: string }[] {
  for (const n of nodes) {
    out.push({ value: n.id, label: n.name });
    if (n.children?.length) flattenCategoryOptions(n.children, out);
  }
  return out;
}

const MATCHING_OPTS = [
  { value: 'manual_review', label: 'Manual review' },
  { value: 'auto_book', label: 'Auto book' },
  { value: 'round_robin_5', label: 'Round robin 5' },
];

export function ServiceList({ refreshKey = 0, onEdit, onNew, onDuplicate, setNotification, setShowConfirm }: Props) {
  const { user } = useAuth();
  const canDelete = ['owner', 'platform_admin'].includes(user?.role ?? '');
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [data, setData] = useState<ServiceCatalogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<Sort | null>({ id: 'name', dir: 'asc' });
  const [globalSearch, setGlobalSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, FilterValue>>({
    isActive: { type: 'boolean', value: null },
    categoryId: { type: 'checkbox', values: [] },
    defaultMatchingMode: { type: 'checkbox', values: [] },
  });

  useEffect(() => {
    void (async () => {
      try {
        const t = await getCategoryTree();
        setTree(t);
      } catch {
        /* list still works */
      }
    })();
  }, []);

  const categoryOptions = useMemo(() => flattenCategoryOptions(tree), [tree]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const f = filters;
      const q: Record<string, string | number | string[] | undefined> = {
        page,
        pageSize,
        q: globalSearch || undefined,
      };
      if (sort) {
        q.sortBy = sort.id;
        q.sortDir = sort.dir;
      }
      const ia = f.isActive;
      if (ia?.type === 'boolean' && ia.value !== null) {
        q.isActive = ia.value ? 'true' : 'false';
      }
      const c = f.categoryId;
      if (c?.type === 'checkbox' && c.values.length) {
        (q as Record<string, string>).categoryIds = c.values.join(',');
      }
      const m = f.defaultMatchingMode;
      if (m?.type === 'checkbox' && m.values.length) {
        (q as Record<string, string>).defaultMatchingMode = m.values.join(',');
      }
      const res = await listServiceDefinitions(q);
      setData(res.items);
      setTotal(res.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, globalSearch, filters]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const byId = useCallback(
    (id: string) => {
      if (!id) return '—';
      return buildBreadcrumbFromTree(id, tree);
    },
    [tree]
  );

  const runBulk = async (ids: string[], action: 'activate' | 'deactivate' | 'delete') => {
    for (const id of ids) {
      if (action === 'delete') {
        if (!canDelete) {
          setNotification({ show: true, message: 'Not permitted to delete', type: 'error' });
          return;
        }
        await deleteServiceDefinition(id);
      } else {
        await updateServiceDefinition(id, { isActive: action === 'activate' });
      }
    }
    await load();
  };

  const columns: CrmColumnDef<ServiceCatalogListItem>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        sortable: true,
        accessor: (r) => r.name,
        cell: (r) => <span className="font-bold text-app-text">{r.name}</span>,
        sticky: true,
        hideable: false,
        width: 200,
      },
      {
        id: 'categoryId',
        header: 'Category',
        accessor: (r) => r.categoryId,
        cell: (r) => <span className="text-sm text-neutral-600 dark:text-neutral-400">{byId(r.categoryId)}</span>,
        width: 220,
        filter: { kind: 'checkbox' as const, options: categoryOptions },
      },
      {
        id: 'fieldsCount',
        header: 'Fields',
        accessor: (r) => (r.dynamicFieldsSchema && 'fields' in (r.dynamicFieldsSchema as object) ? (r.dynamicFieldsSchema as { fields: unknown[] }).fields.length : 0),
        width: 80,
        align: 'right',
      },
      {
        id: 'defaultMatchingMode',
        header: 'Matching',
        sortable: true,
        accessor: (r) => r.defaultMatchingMode,
        width: 130,
        filter: { kind: 'checkbox' as const, options: MATCHING_OPTS },
      },
      {
        id: 'isActive',
        header: 'Active',
        sortable: true,
        accessor: (r) => r.isActive,
        width: 90,
        cell: (r) => (
          <span
            className={cn(
              'px-2 py-0.5 rounded-lg text-[10px] font-black uppercase',
              r.isActive
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
            )}
          >
            {r.isActive ? 'active' : 'inactive'}
          </span>
        ),
        filter: { kind: 'boolean' as const, trueLabel: 'Active', falseLabel: 'Inactive' },
      },
      {
        id: 'updatedAt',
        header: 'Updated',
        sortable: true,
        accessor: (r) => r.updatedAt,
        width: 160,
        cell: (r) => (
          <span className="text-xs text-neutral-500">{new Date(r.updatedAt).toLocaleString()}</span>
        ),
      },
      {
        id: 'listings',
        header: 'Listings',
        sortable: false,
        accessor: (r) => r._count.services,
        width: 90,
        align: 'right',
      },
      {
        id: 'actions',
        header: '',
        accessor: () => null,
        width: 120,
        cell: (r) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(r.id);
              }}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(r.id);
              }}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Duplicate as draft"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ),
        hideable: false,
      },
    ],
    [byId, onEdit, onDuplicate, categoryOptions]
  );

  const bulkActions = useMemo(
    () => [
      {
        id: 'activate',
        label: 'Activate',
        icon: <span className="text-xs">✓</span>,
        variant: 'default' as const,
        onRun: (ids: string[]) => runBulk(ids, 'activate'),
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        icon: <span className="text-xs">○</span>,
        variant: 'default' as const,
        onRun: (ids: string[]) => runBulk(ids, 'deactivate'),
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'danger' as const,
        onRun: (ids: string[]) => {
          if (!canDelete) {
            setNotification({ show: true, message: 'Not permitted', type: 'error' });
            return Promise.resolve();
          }
          setShowConfirm({
            show: true,
            title: 'Delete',
            message: `Delete ${ids.length} service definition(s)?`,
            type: 'danger',
            onConfirm: async () => {
              for (const id of ids) await deleteServiceDefinition(id);
              await load();
            },
          });
          return Promise.resolve();
        },
      },
    ],
    [canDelete, setNotification, setShowConfirm]
  );

  const hasActiveFilters = useMemo(() => {
    if (globalSearch.trim()) return true;
    const ia = filters.isActive;
    if (ia?.type === 'boolean' && ia.value !== null) return true;
    const c = filters.categoryId;
    if (c?.type === 'checkbox' && c.values.length) return true;
    const m = filters.defaultMatchingMode;
    if (m?.type === 'checkbox' && m.values.length) return true;
    return false;
  }, [filters, globalSearch]);

  const isPristineList = !hasActiveFilters;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black uppercase tracking-tight text-app-text">Service definitions</h2>
        <button
          type="button"
          onClick={onNew}
          className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New service definition
        </button>
      </div>

      {err && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
          role="alert"
        >
          <p className="font-medium">{err}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-[44px] rounded-xl border border-red-300 bg-app-card px-4 py-2 text-xs font-bold text-red-900 dark:border-red-800 dark:text-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-app-border bg-app-card p-4" aria-busy>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="mb-2 h-11 animate-pulse rounded-lg bg-gradient-to-r from-neutral-200/80 via-neutral-100 to-neutral-200/80 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800"
              style={{ backgroundSize: '200% 100%' }}
            />
          ))}
        </div>
      )}

      {!loading && !err && total === 0 && isPristineList && (
        <div className="rounded-2xl border border-app-border bg-app-card p-10 text-center">
          <p className="text-lg font-black text-app-text">No service definitions yet</p>
          <p className="mt-1 text-sm text-neutral-500">Create a questionnaire-backed service to power the order wizard.</p>
          <button
            type="button"
            onClick={onNew}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900"
          >
            <Plus className="h-4 w-4" />
            Create the first one
          </button>
        </div>
      )}

      {(!loading || err) && !(total === 0 && !err && isPristineList) && (
        <CrmTable<ServiceCatalogListItem>
          tableId="admin-service-definitions"
          columns={columns}
          data={err ? [] : data}
          total={err ? 0 : total}
          loading={false}
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
          rowKey={(r) => r.id}
          onRowClick={(r) => onEdit(r.id)}
          bulkActions={!canDelete ? bulkActions.filter((b) => b.id !== 'delete') : bulkActions}
          rightToolbar={null}
          error={null}
          className="text-app-text"
        />
      )}
    </div>
  );
}
