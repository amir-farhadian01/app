import type { CrmColumnDef } from './types.js';
import * as XLSX from 'xlsx';

function escapeCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/**
 * Build CSV (UTF-8) and trigger download. No extra dependencies.
 */
export function exportCsv<TRow>(
  columns: CrmColumnDef<TRow>[],
  rows: TRow[],
  filename: string
): void {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.exportValue
          ? c.exportValue(row)
          : c.accessor(row);
        if (raw == null) return '';
        return escapeCell(String(raw));
      })
      .join(',')
  );
  const body = [header, ...lines].join('\r\n');
  const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Optional XLSX export using the existing `xlsx` package (user-triggered only).
 */
export function exportXlsx<TRow>(
  columns: CrmColumnDef<TRow>[],
  rows: TRow[],
  filename: string
): void {
  const data: Record<string, string | number | null>[] = rows.map((row) => {
    const o: Record<string, string | number | null> = {};
    for (const c of columns) {
      const raw = c.exportValue ? c.exportValue(row) : c.accessor(row);
      o[c.header] = raw == null ? '' : (typeof raw === 'number' ? raw : String(raw));
    }
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
