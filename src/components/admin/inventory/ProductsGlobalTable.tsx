import React, { useMemo } from 'react';
import { CrmTable } from '../../crm/CrmTable';
import type { CrmColumnDef, FilterValue, Sort } from '../../crm/types';
import { cn } from '../../../lib/utils';
import type { AdminProductListItem } from '../../../services/adminProducts';

type Props = {
  rows: AdminProductListItem[];
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
  onRowClick: (row: AdminProductListItem) => void;
};

function fmtPrice(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy || 'CAD' }).format(n);
  } catch {
    return `${n} ${ccy}`;
  }
}

export function ProductsGlobalTable({
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
  onRowClick,
}: Props) {
  const columns: CrmColumnDef<AdminProductListItem>[] = useMemo(
    () => [
      {
        id: 'workspace',
        header: 'Workspace',
        sticky: true,
        sortable: false,
        width: 200,
        accessor: (r) => r.workspace.name,
        cell: (r) => (
          <div className="flex min-w-0 items-center gap-2">
            {r.workspace.logoUrl ? (
              <img
                src={r.workspace.logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-lg object-cover"
                width={32}
                height={32}
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-input text-[10px] font-bold text-neutral-600">
                {r.workspace.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="truncate font-semibold text-app-text">{r.workspace.name}</span>
          </div>
        ),
      },
      {
        id: 'name',
        header: 'Product',
        sortable: true,
        accessor: (r) => r.name,
        cell: (r) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{r.name}</span>
            {r.archivedAt && (
              <span className="text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300">Archived</span>
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
        filter: { kind: 'text' as const },
        accessor: (r) => r.category ?? '',
        cell: (r) => <span className="text-neutral-600">{r.category || '—'}</span>,
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
        id: 'stockQuantity',
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
          <span
            className={cn(
              'inline-block rounded-md px-2 py-0.5 text-[10px] font-bold',
              r.isActive ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700',
            )}
          >
            {r.isActive ? 'Yes' : 'No'}
          </span>
        ),
      },
      {
        id: 'usedIn',
        header: 'Used in',
        sortable: false,
        align: 'right',
        accessor: (r) => r._count.bomLines,
        cell: (r) => <span className="tabular-nums text-neutral-600">{r._count.bomLines}</span>,
      },
      {
        id: 'updatedAt',
        header: 'Updated',
        sortable: true,
        accessor: (r) => r.updatedAt,
        cell: (r) => <span className="text-xs text-neutral-500">{new Date(r.updatedAt).toLocaleString()}</span>,
      },
    ],
    [],
  );

  return (
    <CrmTable<AdminProductListItem>
      tableId="admin-inventory-global-v1"
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
      onGlobalSearchChange={(q) => {
        onGlobalSearchChange(q);
        onPageChange(1);
      }}
      rowKey={(r) => r.id}
      onRowClick={onRowClick}
    />
  );
}
