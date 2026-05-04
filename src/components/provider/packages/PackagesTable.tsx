/** TODO(Sprint F): drag-reorder rows within the same ServiceCatalog group (HTML5 drag + POST /reorder). */
import React, { useCallback, useMemo, useState } from 'react';
import { MoreVertical, Pencil, Copy, Archive, Trash2 } from 'lucide-react';
import { CrmTable } from '../../crm/CrmTable';
import type { CrmColumnDef, FilterValue, Sort } from '../../crm/types';
import { cn } from '../../../lib/utils';
import type { ProviderServicePackageRow } from '../../../services/workspaces';
import { effectiveBookingModeLabel } from './bookingModeUtils';
import {
  archivePackage,
  createPackage,
  deletePackage,
  unarchivePackage,
  updatePackage,
} from '../../../services/workspaces';

export type EnrichedPackage = ProviderServicePackageRow & { catalogBreadcrumb: string };

type Props = {
  workspaceId: string;
  rows: EnrichedPackage[];
  loading: boolean;
  onEdit: (row: EnrichedPackage) => void;
  onRefresh: () => void;
  showToast: (msg: string) => void;
};

function fmtPrice(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy || 'CAD' }).format(n);
  } catch {
    return `${n} ${ccy}`;
  }
}

const BOOK_OPTS = [
  { value: 'auto_appointment', label: 'Auto appointment' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'inherit_from_catalog', label: 'Inherit' },
];

export function PackagesTable({ workspaceId, rows, loading, onEdit, onRefresh, showToast }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<Sort | null>({ id: 'service', dir: 'asc' });
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);

  const applyFilters = useCallback(
    (raw: EnrichedPackage[]) => {
      let o = raw;
      const t = globalSearch.trim().toLowerCase();
      if (t) {
        o = o.filter(
          (r) =>
            r.name.toLowerCase().includes(t) ||
            r.serviceCatalog.name.toLowerCase().includes(t) ||
            r.catalogBreadcrumb.toLowerCase().includes(t)
        );
      }
      const sFilter = filters.service;
      if (sFilter?.type === 'text' && sFilter.value.trim()) {
        const q = sFilter.value.toLowerCase();
        o = o.filter((r) => r.serviceCatalog.name.toLowerCase().includes(q));
      }
      const bFilter = filters.booking;
      if (bFilter?.type === 'checkbox' && bFilter.values.length) {
        o = o.filter((r) => bFilter.values.includes(r.bookingMode as string));
      }
      const aFilter = filters.active;
      if (aFilter?.type === 'boolean' && aFilter.value !== null) {
        o = o.filter((r) => r.isActive === aFilter.value);
      }
      return o;
    },
    [filters, globalSearch]
  );

  const filtered = useMemo(() => {
    const f = applyFilters(rows);
    const s = sort;
    if (s) {
      const m = s.id;
      const dir = s.dir === 'asc' ? 1 : -1;
      f.sort((a, b) => {
        if (m === 'service') {
          const c = a.serviceCatalog.name.localeCompare(b.serviceCatalog.name);
          if (c !== 0) return c * dir;
          return (a.sortOrder - b.sortOrder) * dir;
        }
        if (m === 'name') {
          return a.name.localeCompare(b.name) * dir;
        }
        if (m === 'price') {
          return (a.finalPrice - b.finalPrice) * dir;
        }
        if (m === 'updated') {
          return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
        }
        if (m === 'bomCount') {
          return ((a._count?.bom ?? 0) - (b._count?.bom ?? 0)) * dir;
        }
        if (m === 'margin') {
          return ((a.margin?.marginPercent ?? 0) - (b.margin?.marginPercent ?? 0)) * dir;
        }
        return 0;
      });
    } else {
      f.sort(
        (a, b) =>
          a.serviceCatalog.name.localeCompare(b.serviceCatalog.name) || a.sortOrder - b.sortOrder
      );
    }
    return f;
  }, [rows, applyFilters, sort]);

  const total = filtered.length;
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const onToggle = async (r: EnrichedPackage, on: boolean) => {
    try {
      await updatePackage(workspaceId, r.id, { isActive: on });
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const onDuplicate = async (r: EnrichedPackage) => {
    try {
      await createPackage(workspaceId, {
        serviceCatalogId: r.serviceCatalogId,
        name: `${r.name} (Copy)`.slice(0, 80),
        description: r.description ?? undefined,
        finalPrice: r.finalPrice,
        bookingMode: r.bookingMode,
        durationMinutes: r.durationMinutes,
        currency: r.currency,
      });
      setMenuId(null);
      onRefresh();
      showToast('Package duplicated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Duplicate failed');
    }
  };

  const onArch = async (r: EnrichedPackage) => {
    try {
      if (r.archivedAt) {
        await unarchivePackage(workspaceId, r.id);
      } else {
        await archivePackage(workspaceId, r.id);
      }
      setMenuId(null);
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Archive failed');
    }
  };

  const onGlobalSearch = useCallback((q: string) => {
    setGlobalSearch(q);
    setPage(1);
  }, []);

  const onDel = async (r: EnrichedPackage) => {
    if (!window.confirm('Delete this package? This cannot be undone.')) return;
    try {
      await deletePackage(workspaceId, r.id);
      setMenuId(null);
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns: CrmColumnDef<EnrichedPackage>[] = useMemo(
    () => [
      {
        id: 'service',
        header: 'Service / catalog',
        sticky: true,
        sortable: true,
        width: 200,
        filter: { kind: 'text' as const },
        accessor: (r) => r.serviceCatalog.name,
        cell: (r) => (
          <div>
            <div className="font-semibold text-app-text">{r.serviceCatalog.name}</div>
            <div className="truncate text-[10px] text-neutral-500">{r.catalogBreadcrumb}</div>
          </div>
        ),
      },
      {
        id: 'name',
        header: 'Package',
        sortable: true,
        accessor: (r) => r.name,
      },
      {
        id: 'price',
        header: 'Price',
        sortable: true,
        align: 'right',
        accessor: (r) => r.finalPrice,
        cell: (r) => <span className="tabular-nums">{fmtPrice(r.finalPrice, r.currency)}</span>,
      },
      {
        id: 'bomCount',
        header: 'BOM lines',
        sortable: true,
        align: 'right',
        accessor: (r) => r._count?.bom ?? 0,
        cell: (r) => <span className="tabular-nums text-neutral-600">{r._count?.bom ?? 0}</span>,
      },
      {
        id: 'margin',
        header: 'Margin %',
        sortable: true,
        align: 'right',
        accessor: (r) => r.margin?.marginPercent ?? null,
        cell: (r) => {
          const p = r.margin?.marginPercent;
          return p != null && Number.isFinite(p) ? (
            <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">{p.toFixed(1)}%</span>
          ) : (
            <span className="text-neutral-400">—</span>
          );
        },
      },
      {
        id: 'booking',
        header: 'Booking',
        sortable: false,
        filter: { kind: 'checkbox' as const, options: BOOK_OPTS },
        accessor: (r) => r.bookingMode,
        cell: (r) => {
          const eff = effectiveBookingModeLabel(r.serviceCatalog.lockedBookingMode ?? null, r.bookingMode);
          return (
            <span
              className={cn(
                'inline-block rounded-md px-2 py-0.5 text-[10px] font-bold',
                eff.tone === 'locked' && 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
                eff.tone === 'inherit' && 'bg-neutral-200/80 text-neutral-800 dark:bg-neutral-700',
                eff.tone === 'explicit' && 'bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/30'
              )}
            >
              {eff.label}
            </span>
          );
        },
      },
      {
        id: 'dur',
        header: 'Duration',
        sortable: false,
        accessor: (r) => r.durationMinutes,
        cell: (r) => (
          <span className="text-neutral-600">{r.durationMinutes != null ? `${r.durationMinutes} min` : '—'}</span>
        ),
      },
      {
        id: 'active',
        header: 'Active',
        sortable: false,
        filter: {
          kind: 'boolean' as const,
          trueLabel: 'Active',
          falseLabel: 'Inactive',
        },
        accessor: (r) => r.isActive,
        cell: (r) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void onToggle(r, !r.isActive);
            }}
            className={cn(
              'relative h-6 w-11 rounded-full transition',
              r.isActive ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-600'
            )}
            aria-pressed={r.isActive}
            aria-label="Toggle active"
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition',
                r.isActive ? 'left-5' : 'left-0.5'
              )}
            />
          </button>
        ),
      },
      {
        id: 'updated',
        header: 'Updated',
        sortable: true,
        accessor: (r) => r.updatedAt,
        cell: (r) => <span className="text-xs text-neutral-500">{new Date(r.updatedAt).toLocaleString()}</span>,
      },
      {
        id: 'act',
        header: '',
        sortable: false,
        width: 44,
        hideable: false,
        accessor: () => '',
        cell: (r) => (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="rounded p-1 hover:bg-app-input"
              aria-label="Actions"
              onClick={(e) => {
                e.stopPropagation();
                setMenuId((id) => (id === r.id ? null : r.id));
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuId === r.id && (
              <ul className="absolute right-0 z-50 min-w-[10rem] rounded-xl border border-app-border bg-app-card py-1 text-xs shadow-lg">
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 px-3 py-1.5 hover:bg-app-input"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId(null);
                      onEdit(r);
                    }}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 px-3 py-1.5 hover:bg-app-input"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onDuplicate(r);
                    }}
                  >
                    <Copy className="h-3 w-3" /> Duplicate
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 px-3 py-1.5 hover:bg-app-input"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onArch(r);
                    }}
                  >
                    <Archive className="h-3 w-3" /> {r.archivedAt ? 'Unarchive' : 'Archive'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-app-input"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onDel(r);
                    }}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </li>
              </ul>
            )}
          </div>
        ),
      },
    ],
    [menuId, onEdit, onRefresh, onToggle, workspaceId, showToast]
  );

  return (
    <CrmTable<EnrichedPackage>
      tableId="provider-packages-v1"
      columns={columns}
      data={pageData}
      total={total}
      loading={loading}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(s) => {
        setPageSize(s);
        setPage(1);
      }}
      sort={sort}
      onSortChange={setSort}
      filters={filters}
      onFiltersChange={(n) => {
        setFilters(n);
        setPage(1);
      }}
      globalSearch={globalSearch}
      onGlobalSearchChange={onGlobalSearch}
      rowKey={(r) => r.id}
      onRowClick={(r) => onEdit(r)}
    />
  );
}
