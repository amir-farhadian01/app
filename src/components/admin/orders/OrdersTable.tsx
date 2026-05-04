import { CrmTable } from '../../crm/CrmTable.js';
import type { BulkActionItem, FilterValue, Sort } from '../../crm/types';
import type { AdminOrderListItem } from '../../../../lib/adminOrdersList';
import { getAdminOrderColumns, type AdminOrdersSegment } from './orderColumns.js';

type Props = {
  segment: AdminOrdersSegment;
  tableId: string;
  data: AdminOrderListItem[];
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
  onRowClick: (row: AdminOrderListItem) => void;
  serviceCatalogFilterOptions: () => Promise<{ value: string; label: string }[]>;
  bulkCancelAction: BulkActionItem | null;
  onCopied?: (msg: string) => void;
  error?: string | null;
};

export function OrdersTable({
  segment,
  tableId,
  data,
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
  serviceCatalogFilterOptions,
  bulkCancelAction,
  onCopied,
  error,
}: Props) {
  const columns = getAdminOrderColumns({
    segment,
    serviceCatalogOptions: serviceCatalogFilterOptions,
    onCopied,
  });

  const bulkActions: BulkActionItem[] = bulkCancelAction ? [bulkCancelAction] : [];

  return (
    <CrmTable<AdminOrderListItem>
      key={tableId}
      tableId={tableId}
      columns={columns}
      data={data}
      total={total}
      loading={loading}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      sort={sort}
      onSortChange={onSortChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
      globalSearch={globalSearch}
      onGlobalSearchChange={onGlobalSearchChange}
      rowKey={(r) => r.id}
      onRowClick={onRowClick}
      bulkActions={bulkActions}
      error={error ?? null}
    />
  );
}
