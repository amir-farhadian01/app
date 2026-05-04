import type { ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';

export type SortState = { id: string; dir: SortDir };
/** Alias for public API (matches prompt `Sort` name). */
export type Sort = SortState;

/** Checkbox: selected values; boolean: true | false | null (any); dateRange: ISO date strings; text: free string */
export type FilterCheckbox = { type: 'checkbox'; values: string[] };
export type FilterBoolean = { type: 'boolean'; value: boolean | null };
export type FilterDateRange = { type: 'dateRange'; from?: string; to?: string };
export type FilterText = { type: 'text'; value: string };

export type FilterValue = FilterCheckbox | FilterBoolean | FilterDateRange | FilterText;

export type CrmFilterConfig<TRow> =
  | {
      kind: 'checkbox';
      options: { value: string; label: string }[] | (() => Promise<{ value: string; label: string }[]>);
    }
  | { kind: 'boolean'; trueLabel: string; falseLabel: string }
  | { kind: 'dateRange' }
  | { kind: 'text' };

export type CrmColumnDef<TRow> = {
  id: string;
  header: string;
  accessor: (row: TRow) => unknown;
  cell?: (row: TRow) => ReactNode;
  sortable?: boolean;
  filter?: CrmFilterConfig<TRow>;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  defaultHidden?: boolean;
  /** If false, column stays visible; column manager does not allow hiding. */
  hideable?: boolean;
  /** Only the first *data* column (after the selection column) may stick; others ignore. */
  sticky?: boolean;
  exportValue?: (row: TRow) => string | number | null;
};

/** Alias (prompt name). */
export type ColumnDef<TRow> = CrmColumnDef<TRow>;

export type BulkActionVariant = 'default' | 'danger' | 'primary';

export type BulkActionItem = {
  id: string;
  label: string;
  icon: ReactNode;
  variant: BulkActionVariant;
  onRun: (ids: string[]) => Promise<void>;
};

export type CrmTableStateDefaults = {
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  pageSize: number;
};

export type CrmTableProps<TRow> = {
  tableId: string;
  columns: CrmColumnDef<TRow>[];
  data: TRow[];
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
  rowKey: (row: TRow) => string;
  onRowClick?: (row: TRow) => void;
  bulkActions?: BulkActionItem[];
  rightToolbar?: ReactNode;
  /** Shown when `!loading` and `data.length === 0` */
  error?: string | null;
  /** Returns ids for all rows matching current filters (server). Used by “select all matching” banner. */
  onSelectAllMatching?: () => Promise<string[]>;
  className?: string;
};
