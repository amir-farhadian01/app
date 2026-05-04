import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Columns3, Search } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type SimpleColumn<T> = {
  id: string;
  header: string;
  accessor: (row: T) => unknown;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
};

type SortState = { id: string; dir: 'asc' | 'desc' } | null;

type Props<T> = {
  columns: SimpleColumn<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  sort: SortState;
  onSortChange: (s: SortState) => void;
  loading: boolean;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  globalSearch: string;
  onGlobalSearchChange: (q: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  filterSlot?: ReactNode;
  emptyMessage?: string;
  /** When true, rows are already ordered by the server; only show sort UI. */
  serverSorted?: boolean;
};

export function KycSimpleTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  sort,
  onSortChange,
  loading,
  rowKey,
  onRowClick,
  globalSearch,
  onGlobalSearchChange,
  selectable,
  selectedIds,
  onSelectionChange,
  filterSlot,
  emptyMessage = 'No rows',
  serverSorted,
}: Props<T>) {
  const [colMenu, setColMenu] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map((c) => [c.id, true])),
  );

  const visibleCols = useMemo(() => columns.filter((c) => visibility[c.id] !== false), [columns, visibility]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSort = (id: string) => {
    const col = columns.find((c) => c.id === id);
    if (!col?.sortable) return;
    if (sort?.id !== id) onSortChange({ id, dir: 'desc' });
    else if (sort.dir === 'desc') onSortChange({ id, dir: 'asc' });
    else onSortChange(null);
  };

  const sortedLocal = useMemo(() => {
    if (!sort || serverSorted) return data;
    const col = columns.find((c) => c.id === sort.id);
    if (!col) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const va = col.accessor(a);
      const vb = col.accessor(b);
      const na = va instanceof Date ? va.getTime() : typeof va === 'number' ? va : String(va ?? '');
      const nb = vb instanceof Date ? vb.getTime() : typeof vb === 'number' ? vb : String(vb ?? '');
      const c = na < nb ? -1 : na > nb ? 1 : 0;
      return sort.dir === 'asc' ? c : -c;
    });
    return copy;
  }, [data, sort, columns, serverSorted]);

  const displayRows = sortedLocal;

  const allOnPageSelected =
    selectable &&
    displayRows.length > 0 &&
    displayRows.every((r) => selectedIds?.has(rowKey(r)));

  const toggleAllPage = () => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      for (const r of displayRows) next.delete(rowKey(r));
    } else {
      for (const r of displayRows) next.add(rowKey(r));
    }
    onSelectionChange(next);
  };

  return (
    <div className="rounded-[2rem] border border-app-border bg-app-card overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 p-4 border-b border-app-border items-stretch sm:items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={globalSearch}
            onChange={(e) => onGlobalSearchChange(e.target.value)}
            placeholder="Search…"
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-app-border bg-app-bg text-sm text-app-text"
            aria-label="Search table"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setColMenu(!colMenu)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-app-border text-xs font-bold text-app-text hover:bg-app-bg"
              aria-label="Column visibility"
              aria-expanded={colMenu}
            >
              <Columns3 className="w-4 h-4" />
              Columns
            </button>
            {colMenu ? (
              <div className="absolute right-0 mt-1 z-50 min-w-[200px] rounded-xl border border-app-border bg-app-card shadow-lg p-2 space-y-1">
                {columns.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibility[c.id] !== false}
                      onChange={() => setVisibility((v) => ({ ...v, [c.id]: !v[c.id] }))}
                    />
                    {c.header}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {filterSlot ? <div className="px-4 py-3 border-b border-app-border bg-app-bg/50">{filterSlot}</div> : null}

      <div className={cn('overflow-x-auto', loading && 'min-h-[220px]')}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur border-b border-app-border">
            <tr>
              {selectable ? (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={!!allOnPageSelected}
                    onChange={toggleAllPage}
                    aria-label="Select all on page"
                  />
                </th>
              ) : null}
              {visibleCols.map((c) => (
                <th key={c.id} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500" style={{ width: c.width }}>
                  <button
                    type="button"
                    disabled={!c.sortable}
                    onClick={() => toggleSort(c.id)}
                    className={cn(
                      'inline-flex items-center gap-1',
                      c.sortable && 'hover:text-app-text cursor-pointer',
                      !c.sortable && 'cursor-default',
                    )}
                    aria-label={c.sortable ? `Sort by ${c.header}` : undefined}
                  >
                    {c.header}
                    {c.sortable && sort?.id === c.id ? (
                      sort.dir === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {(selectable ? 1 : 0) + visibleCols.length > 0
                    ? [...Array((selectable ? 1 : 0) + visibleCols.length)].map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                        </td>
                      ))
                    : null}
                </tr>
              ))
            ) : displayRows.length === 0 ? (
              <tr>
                <td colSpan={(selectable ? 1 : 0) + visibleCols.length} className="px-4 py-12 text-center text-neutral-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayRows.map((row) => {
                const id = rowKey(row);
                const sel = selectedIds?.has(id);
                return (
                  <tr
                    key={id}
                    className={cn(
                      'hover:bg-app-bg/80 transition-colors',
                      onRowClick && 'cursor-pointer',
                      sel && 'bg-blue-50/50 dark:bg-blue-950/20',
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable ? (
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!sel}
                          onChange={() => {
                            if (!onSelectionChange || !selectedIds) return;
                            const next = new Set(selectedIds);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            onSelectionChange(next);
                          }}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    ) : null}
                    {visibleCols.map((c) => (
                      <td key={c.id} className="px-4 py-3 text-app-text max-w-[280px]">
                        {c.cell ? c.cell(row) : <span className="truncate block">{String(c.accessor(row) ?? '')}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-app-border text-xs text-neutral-500">
        <span>
          {total} total · page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1 rounded-lg border border-app-border font-bold disabled:opacity-40"
            aria-label="Previous page"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1 rounded-lg border border-app-border font-bold disabled:opacity-40"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
