import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useReactTable, getCoreRowModel, type ColumnDef, flexRender } from '@tanstack/react-table';
import { motion } from 'motion/react';
import {
  Search,
  Columns3,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import type { CrmTableProps, CrmColumnDef, FilterValue, SortState } from './types.js';
import { useCrmTableState } from './useCrmTableState.js';
import { FilterPopover } from './FilterPopover.js';
import { ColumnManager } from './ColumnManager.js';
import { SortIndicator } from './SortIndicator.js';
import { BulkActionBar } from './BulkActionBar.js';

const SELECT_COL_ID = '__crm_select__';
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

function buildPageList(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 0) return [1];
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, 'ellipsis', totalPages] as const;
  if (current >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  }
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages] as const;
}

function defaultFilterFor<TRow>(c: CrmColumnDef<TRow>): FilterValue {
  if (!c.filter) return { type: 'text', value: '' };
  switch (c.filter.kind) {
    case 'checkbox':
      return { type: 'checkbox', values: [] };
    case 'boolean':
      return { type: 'boolean', value: null };
    case 'dateRange':
      return { type: 'dateRange' };
    case 'text':
      return { type: 'text', value: '' };
  }
}

function filterLabel<TRow>(c: CrmColumnDef<TRow>, v: FilterValue): string {
  if (v.type === 'text' && v.value) return `${c.header}: ${v.value}`;
  if (v.type === 'checkbox' && v.values.length) return `${c.header} (${v.values.length})`;
  if (v.type === 'boolean' && v.value !== null) return `${c.header}: ${v.value ? 'Yes' : 'No'}`;
  if (v.type === 'dateRange' && (v.from || v.to)) return `${c.header}: ${v.from ?? '…'} – ${v.to ?? '…'}`;
  return '';
}

function buildTableDefaults<TRow>(columns: CrmColumnDef<TRow>[], initialPageSize: number) {
  return {
    columnOrder: columns.map((c) => c.id),
    columnVisibility: Object.fromEntries(
      columns.map(
        (c) => [c.id, c.hideable === false ? true : !c.defaultHidden] as [string, boolean]
      )
    ),
    pageSize: initialPageSize,
  };
}

export function CrmTable<TRow>({
  tableId,
  columns: columnDefs,
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
  rowKey,
  onRowClick,
  bulkActions = [],
  rightToolbar,
  error = null,
  onSelectAllMatching,
  className,
}: CrmTableProps<TRow>) {
  const defaults = useMemo(
    () => buildTableDefaults(columnDefs, pageSize),
    [columnDefs, pageSize]
  );
  const { state: tableState, setVisibility, setOrder, setPageSize, reset: resetTableState } = useCrmTableState(
    tableId,
    defaults
  );

  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    if (tableState.pageSize !== pageSize) onPageSizeChange(tableState.pageSize);
    synced.current = true;
  }, [tableId, tableState.pageSize, pageSize, onPageSizeChange]);

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [filterOpenId, setFilterOpenId] = useState<string | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<DOMRect | null>(null);
  const [colMgrOpen, setColMgrOpen] = useState(false);

  const [searchInput, setSearchInput] = useState(globalSearch);
  useEffect(() => {
    setSearchInput(globalSearch);
  }, [globalSearch]);
  useEffect(() => {
    const t = window.setTimeout(() => onGlobalSearchChange(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput, onGlobalSearchChange]);

  const orderedVisibleColumns = useMemo(() => {
    const map = new Map(columnDefs.map((c) => [c.id, c] as const));
    const o = tableState.columnOrder.filter((id) => map.has(id));
    for (const c of columnDefs) {
      if (!o.includes(c.id)) o.push(c.id);
    }
    return o
      .map((id) => map.get(id)!)
      .filter((c) => tableState.columnVisibility[c.id] !== false);
  }, [columnDefs, tableState.columnOrder, tableState.columnVisibility]);

  const dataCols = useMemo((): ColumnDef<TRow>[] => {
    return orderedVisibleColumns.map((c) => ({
      id: c.id,
      accessorFn: (row: TRow) => c.accessor(row),
      size: typeof c.width === 'number' ? c.width : undefined,
      minSize: 60,
      header: c.header,
      cell: (ctx) =>
        c.cell ? (
          c.cell(ctx.row.original)
        ) : (
          <span className="truncate">{String(ctx.getValue() ?? '')}</span>
        ),
    }));
  }, [orderedVisibleColumns]);

  const hasSticky = orderedVisibleColumns[0]?.sticky === true;

  const table = useReactTable({
    data,
    columns: useMemo<ColumnDef<TRow>[]>(
      () => [
        {
          id: SELECT_COL_ID,
          size: 44,
          minSize: 44,
          maxSize: 44,
          header: () => {
            const pageKeys = new Set(data.map((r) => rowKey(r)));
            const selectedOnPage = [...pageKeys].filter((k) => rowSelection[k]).length;
            const allOnPage = data.length > 0 && selectedOnPage === data.length;
            const some = selectedOnPage > 0 && !allOnPage;
            return (
              <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label="Select all rows on this page"
                  className="rounded border-app-border"
                  checked={allOnPage}
                  ref={(el) => {
                    if (el) el.indeterminate = some;
                  }}
                  onChange={() => {
                    if (allOnPage) {
                      setRowSelection((prev) => {
                        const n = { ...prev };
                        for (const r of data) delete n[rowKey(r)];
                        return n;
                      });
                    } else {
                      setRowSelection((prev) => {
                        const n = { ...prev };
                        for (const r of data) n[rowKey(r)] = true;
                        return n;
                      });
                    }
                  }}
                />
              </div>
            );
          },
          cell: ({ row }) => {
            const k = rowKey(row.original);
            return (
              <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label="Select row"
                  className="rounded border-app-border"
                  checked={!!rowSelection[k]}
                  onChange={() => {
                    setRowSelection((p) => ({ ...p, [k]: !p[k] }));
                  }}
                />
              </div>
            );
          },
        } as ColumnDef<TRow>,
        ...dataCols,
      ],
      [data, dataCols, rowKey, rowSelection]
    ),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => rowKey(r),
  });

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
    [rowSelection]
  );
  const selectedCount = selectedIds.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const cycleSort = (colId: string) => {
    if (!sort || sort.id !== colId) onSortChange({ id: colId, dir: 'asc' });
    else if (sort.dir === 'asc') onSortChange({ id: colId, dir: 'desc' });
    else onSortChange(null);
  };

  const sortStateFor = (id: string): 'asc' | 'desc' | null => {
    if (!sort || sort.id !== id) return null;
    return sort.dir;
  };

  const openFilter = (c: CrmColumnDef<TRow>, e: MouseEvent, rect: DOMRect) => {
    e.stopPropagation();
    setFilterAnchor(rect);
    setFilterOpenId(c.id);
  };

  const filterCol = useMemo(
    () => (filterOpenId ? columnDefs.find((c) => c.id === filterOpenId) : null),
    [filterOpenId, columnDefs]
  );
  const filterValue = filterCol ? (filters[filterCol.id] ?? defaultFilterFor(filterCol)) : undefined;

  const chips = useMemo(() => {
    const out: { colId: string; label: string }[] = [];
    for (const c of columnDefs) {
      const f = filters[c.id];
      if (!f) continue;
      const label = filterLabel(c, f);
      if (label) out.push({ colId: c.id, label });
    }
    return out;
  }, [columnDefs, filters]);

  const showSelectAllMatching =
    !!onSelectAllMatching && selectedCount > 0 && total > data.length;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            type="search"
            aria-label="Search table"
            className="w-full rounded-xl border border-app-border bg-app-input py-2 pl-9 pr-3 text-sm text-app-text placeholder:text-neutral-400"
            placeholder="Search…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {rightToolbar}
          <button
            type="button"
            aria-label="Manage columns"
            className="inline-flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm font-medium text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => setColMgrOpen(true)}
          >
            <Columns3 className="h-4 w-4" />
            Columns
          </button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((ch) => (
            <span
              key={ch.colId + ch.label}
              className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-neutral-100 px-2 py-1 text-xs text-app-text dark:bg-neutral-800"
            >
              {ch.label}
              <button
                type="button"
                aria-label={`Remove filter ${ch.label}`}
                className="rounded p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                onClick={() => {
                  const next = { ...filters };
                  delete next[ch.colId];
                  onFiltersChange(next);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            aria-label="Clear all filters"
            className="ml-auto text-xs font-medium text-neutral-500 hover:text-app-text"
            onClick={() => onFiltersChange({})}
          >
            Clear all
          </button>
        </div>
      )}

      {showSelectAllMatching && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden"
        >
          <div className="rounded-lg border border-app-border bg-app-input px-3 py-2 text-sm text-app-text">
            {selectedCount} row(s) selected on this page.{' '}
            <button
              type="button"
              className="font-semibold text-neutral-900 underline dark:text-white"
              aria-label="Select all matching records"
              onClick={async () => {
                if (!onSelectAllMatching) return;
                const ids = await onSelectAllMatching();
                setRowSelection(Object.fromEntries(ids.map((id) => [id, true])));
              }}
            >
              Select all {total} records matching your filters
            </button>
          </div>
        </motion.div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-app-border bg-app-card">
        {loading && (
          <div className="p-4" aria-busy>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="mb-2 h-10 animate-pulse rounded-md bg-gradient-to-r from-neutral-200/80 via-neutral-100 to-neutral-200/80 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800"
                style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.2s ease-in-out infinite' }}
              />
            ))}
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
          </div>
        )}
        {!loading && error && data.length === 0 && (
          <div className="p-12 text-center text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </div>
        )}
        {!loading && !error && data.length === 0 && (
          <div className="p-12 text-center text-sm text-neutral-500">No records found.</div>
        )}
        {!loading && !error && data.length > 0 && (
          <div className="min-w-0 max-h-[min(70vh,900px)] overflow-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-app-card shadow-[0_1px_0_0_var(--app-border)]">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h, idx) => {
                      const col = h.column.id === SELECT_COL_ID ? null : orderedVisibleColumns.find((c) => c.id === h.column.id);
                      const isSelect = h.column.id === SELECT_COL_ID;
                      const isStickyData = isSelect || (hasSticky && idx === 1);
                      const align = col?.align ?? 'left';
                      const canSort = Boolean(col && col.sortable !== false);
                      return (
                        <th
                          key={h.id}
                          className={cn(
                            'whitespace-nowrap border-b border-app-border bg-app-card px-2 py-2.5 text-left text-xs font-semibold text-app-text',
                            align === 'center' && 'text-center',
                            align === 'right' && 'text-right',
                            isSelect && 'sticky z-20 w-11 min-w-11',
                            isStickyData && !isSelect && 'sticky z-20 border-l border-app-border',
                            isStickyData && isSelect && 'left-0',
                            isStickyData && !isSelect && hasSticky && 'left-11',
                            isStickyData && 'shadow-sm'
                          )}
                          style={
                            isSelect
                              ? { minWidth: 44 }
                              : col?.width != null
                                ? { width: col.width, minWidth: col.width }
                                : undefined
                          }
                        >
                          {isSelect && flexRender(h.column.columnDef.header, h.getContext())}
                          {col && (
                            <div
                              className={cn('flex items-center gap-1', align === 'right' && 'justify-end', align === 'center' && 'justify-center')}
                            >
                              {canSort ? (
                                <button
                                  type="button"
                                  className="inline-flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                  aria-label={`Sort by ${col.header}`}
                                  onClick={() => cycleSort(col.id)}
                                >
                                  <span className="truncate">{col.header}</span>
                                  <SortIndicator active={sortStateFor(col.id)} />
                                </button>
                              ) : (
                                <span className="truncate">{col.header}</span>
                              )}
                              {col.filter && (
                                <button
                                  type="button"
                                  className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-app-text dark:hover:bg-neutral-800"
                                  aria-label={`Filter ${col.header}`}
                                  onClick={(e) => {
                                    const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                    openFilter(col, e, r);
                                  }}
                                >
                                  <Filter
                                    className={cn('h-3.5 w-3.5', filters[col.id] && 'text-app-text')}
                                  />
                                </button>
                              )}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-app-border">
                {table.getRowModel().rows.map((tr) => (
                  <tr
                    key={tr.id}
                    className="cursor-pointer hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50"
                    onClick={() => {
                      onRowClick?.(tr.original);
                    }}
                  >
                    {tr.getVisibleCells().map((cell, idx) => {
                      const isSelect = cell.column.id === SELECT_COL_ID;
                      const isStickyData = isSelect || (hasSticky && idx === 1);
                      const col = columnDefs.find((c) => c.id === cell.column.id);
                      const align = col?.align ?? 'left';
                      return (
                        <td
                          key={cell.id}
                          onClick={isSelect ? (e) => e.stopPropagation() : undefined}
                          className={cn(
                            'max-w-0 border-app-border bg-app-card px-2 py-2',
                            align === 'center' && 'text-center',
                            align === 'right' && 'text-right',
                            isSelect && 'sticky z-10 w-11 min-w-11',
                            isStickyData && !isSelect && 'sticky z-10 border-l border-app-border',
                            isSelect && 'left-0',
                            isStickyData && !isSelect && hasSticky && 'left-11',
                            isStickyData && 'shadow-sm'
                          )}
                          style={col?.width != null ? { width: col.width, minWidth: col.width } : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span>Rows per page</span>
            <select
              aria-label="Rows per page"
              className="rounded-lg border border-app-border bg-app-input px-2 py-1 text-app-text"
              value={pageSize}
              onChange={(e) => {
                const s = Number(e.target.value);
                setPageSize(s);
                onPageSizeChange(s);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="ml-2">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              className="rounded-lg border border-app-border p-1.5 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {buildPageList(page, totalPages).map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`e-${i}`} className="px-1 text-neutral-400" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  aria-label={`Page ${p}`}
                  className={cn(
                    'min-w-8 rounded-md px-2 py-1 text-sm',
                    p === page ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  )}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              aria-label="Next page"
              className="rounded-lg border border-app-border p-1.5 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {filterCol && (
        <FilterPopover
          open={!!filterOpenId}
          column={filterCol}
          value={filterValue as FilterValue}
          onChange={(next) => {
            onFiltersChange({ ...filters, [filterCol.id]: next });
          }}
          onClose={() => {
            setFilterOpenId(null);
            setFilterAnchor(null);
          }}
          anchorRect={filterAnchor}
        />
      )}

      <ColumnManager<TRow>
        open={colMgrOpen}
        columns={columnDefs}
        columnOrder={tableState.columnOrder}
        columnVisibility={tableState.columnVisibility}
        onSave={(v, o) => {
          setVisibility(v);
          setOrder(o);
        }}
        onReset={resetTableState}
        onClose={() => setColMgrOpen(false)}
      />

      {bulkActions.length > 0 && (
        <BulkActionBar
          count={selectedCount}
          selectedIds={selectedIds}
          onClear={() => setRowSelection({})}
          actions={bulkActions}
        />
      )}

    </div>
  );
}
