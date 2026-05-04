import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmTableStateDefaults } from './types.js';

const STORAGE_PREFIX = 'crm-table:';

function readStorage(tableId: string): Partial<CrmTableStateDefaults> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<CrmTableStateDefaults>;
  } catch {
    return null;
  }
}

function writeStorage(tableId: string, v: CrmTableStateDefaults) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tableId}`, JSON.stringify(v));
  } catch {
    /* ignore quota */
  }
}

export function useCrmTableState(tableId: string, defaults: CrmTableStateDefaults) {
  const mergedDefaults = useMemo(
    () => ({
      columnVisibility: { ...defaults.columnVisibility },
      columnOrder: [...defaults.columnOrder],
      pageSize: defaults.pageSize,
    }),
    [defaults]
  );

  const [state, setState] = useState<CrmTableStateDefaults>(() => {
    const stored = readStorage(tableId);
    if (!stored) return mergedDefaults;
    return {
      columnVisibility: { ...mergedDefaults.columnVisibility, ...stored.columnVisibility },
      columnOrder: stored.columnOrder?.length
        ? mergeOrder(mergedDefaults.columnOrder, stored.columnOrder)
        : mergedDefaults.columnOrder,
      pageSize: [25, 50, 100, 200].includes(stored.pageSize as number) ? (stored.pageSize as number) : mergedDefaults.pageSize,
    };
  });

  useEffect(() => {
    writeStorage(tableId, state);
  }, [tableId, state]);

  const setVisibility = useCallback((columnVisibility: Record<string, boolean>) => {
    setState((s) => ({ ...s, columnVisibility }));
  }, []);

  const setOrder = useCallback((columnOrder: string[]) => {
    setState((s) => ({ ...s, columnOrder }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setState((s) => ({ ...s, pageSize }));
  }, []);

  const reset = useCallback(() => {
    setState(mergedDefaults);
  }, [mergedDefaults]);

  return { state, setVisibility, setOrder, setPageSize, reset };
}

function mergeOrder(defaultOrder: string[], storedOrder: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of storedOrder) {
    if (defaultOrder.includes(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of defaultOrder) {
    if (!seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  return out;
}
