import React, { useMemo, useState } from 'react';
import { MoreVertical, Pencil, Copy, Archive, Trash2, Package } from 'lucide-react';
import { CrmTable } from '../../crm/CrmTable';
import type { CrmColumnDef, FilterValue, Sort } from '../../crm/types';
import { cn } from '../../../lib/utils';
import type { ProductRow } from '../../../services/inventory';

type Props = {
  workspaceId: string;
  rows: ProductRow[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  sort: Sort | null;
  onSortChange: (s: Sort | null) => void;
  filters: Record<string, FilterValue>;
  onFiltersChange: (next: Record<string, FilterValue>) => void;
  globalSearch: string;
  onGlobalSearchChange: (q: string) => void;
  onEdit: (row: ProductRow) => void;
  onDuplicate: (row: ProductRow) => void;
  onArchiveToggle: (row: ProductRow) => void;
  onDelete: (row: ProductRow) => void;
  onToggleActive: (row: ProductRow, on: boolean) => void;
};

function fmtPrice(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy || 'CAD' }).format(n);
  } catch {
    return `${n} ${ccy}`;
  }
}

export function ProductsTable({
  workspaceId: _workspaceId,
  rows,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  globalSearch,
  onGlobalSearchChange,
  onEdit,
  onDuplicate,
  onArchiveToggle,
  onDelete,
  onToggleActive,
}: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);

  const columns: CrmColumnDef<ProductRow>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        sticky: true,
        sortable: true,
        width: 200,
        accessor: (r) => r.name,
        cell: (r) => (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold text-app-text">{r.name}</span>
            {r.archivedAt && (
              <span className="shrink-0 rounded bg-neutral-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                Archived
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'sku',
        header: 'SKU',
        sortable: true,
        accessor: (r) => r.sku ?? '',
        cell: (r) => <span className="text-neutral-600">{r.sku || '—'}</span>,
      },
      {
        id: 'category',
        header: 'Category',
        sortable: true,
        accessor: (r) => r.category ?? '',
        cell: (r) =>
          r.category ? (
            <span className="inline-block max-w-[8rem] truncate rounded-md bg-neutral-200/70 px-2 py-0.5 text-[10px] font-semibold text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
              {r.category}
            </span>
          ) : (
            <span className="text-neutral-400">—</span>
          ),
      },
      {
        id: 'unit',
        header: 'Unit',
        sortable: false,
        accessor: (r) => r.unit,
      },
      {
        id: 'unitPrice',
        header: 'Price',
        sortable: true,
        align: 'right',
        accessor: (r) => r.unitPrice,
        cell: (r) => <span className="tabular-nums">{fmtPrice(r.unitPrice, r.currency)}</span>,
      },
      {
        id: 'stock',
        header: 'Stock',
        sortable: false,
        accessor: (r) => r.stockQuantity,
        cell: (r) => (
          <span className="text-sm text-neutral-600">
            {r.stockQuantity != null ? `${r.stockQuantity} ${r.unit}` : '—'}
          </span>
        ),
      },
      {
        id: 'isActive',
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
              void onToggleActive(r, !r.isActive);
            }}
            className={cn(
              'relative h-6 w-11 rounded-full transition',
              r.isActive ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-600',
            )}
            aria-pressed={r.isActive}
            aria-label="Toggle active"
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition',
                r.isActive ? 'left-5' : 'left-0.5',
              )}
            />
          </button>
        ),
      },
      {
        id: 'usedIn',
        header: 'Used in',
        sortable: false,
        accessor: (r) => r._count.bomLines,
        cell: (r) => (
          <span className="inline-flex items-center gap-1 tabular-nums text-neutral-600">
            <Package className="h-3.5 w-3.5 opacity-60" aria-hidden />
            {r._count.bomLines}
          </span>
        ),
      },
      {
        id: 'updatedAt',
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
                      setMenuId(null);
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
                      setMenuId(null);
                      void onArchiveToggle(r);
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
                      setMenuId(null);
                      void onDelete(r);
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
    [menuId, onEdit, onDuplicate, onArchiveToggle, onDelete, onToggleActive],
  );

  return (
    <CrmTable<ProductRow>
      tableId="provider-inventory-v1"
      columns={columns}
      data={rows}
      total={total}
      loading={loading}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={(s) => {
        onPageSizeChange(s);
        onPageChange(1);
      }}
      sort={sort}
      onSortChange={onSortChange}
      filters={filters}
      onFiltersChange={(n) => {
        onFiltersChange(n);
        onPageChange(1);
      }}
      globalSearch={globalSearch}
      onGlobalSearchChange={onGlobalSearchChange}
      rowKey={(r) => r.id}
      onRowClick={(r) => onEdit(r)}
    />
  );
}
