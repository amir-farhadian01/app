/**
 * Standalone compile-time example for `CrmTable` — not imported by the app.
 */
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { CrmTable } from './CrmTable';
import type { CrmColumnDef, FilterValue } from './types';
import { exportCsv, exportXlsx } from './exportCsv';

type Row = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  when: string;
  note: string;
};

const STATIC: Row[] = [
  { id: '1', name: 'Ava', role: 'admin', active: true, when: '2026-01-10', note: 'alpha' },
  { id: '2', name: 'Ben', role: 'user', active: false, when: '2026-02-20', note: 'beta' },
  { id: '3', name: 'Cara', role: 'user', active: true, when: '2026-03-15', note: 'gamma' },
];

export function CrmTableExample() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
  const [q, setQ] = useState('');

  const columns: CrmColumnDef<Row>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        sticky: true,
        accessor: (r) => r.name,
        filter: { kind: 'text' },
      },
      {
        id: 'role',
        header: 'Role',
        accessor: (r) => r.role,
        filter: {
          kind: 'checkbox',
          options: [
            { value: 'admin', label: 'Admin' },
            { value: 'user', label: 'User' },
          ],
        },
      },
      {
        id: 'active',
        header: 'Active',
        accessor: (r) => r.active,
        cell: (r) => (r.active ? 'Yes' : 'No'),
        sortable: false,
        filter: { kind: 'boolean', trueLabel: 'Active', falseLabel: 'Inactive' },
      },
      {
        id: 'when',
        header: 'Date',
        accessor: (r) => r.when,
        filter: { kind: 'dateRange' },
      },
    ],
    []
  );

  return (
    <div className="p-4">
      <CrmTable<Row>
        tableId="crm-example"
        columns={columns}
        data={STATIC}
        total={STATIC.length}
        loading={false}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
        globalSearch={q}
        onGlobalSearchChange={setQ}
        rowKey={(r) => r.id}
        onSelectAllMatching={async () => STATIC.map((r) => r.id)}
        rightToolbar={
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text"
              aria-label="Export CSV"
              onClick={() => exportCsv(columns, STATIC, 'example.csv')}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text"
              aria-label="Export XLSX"
              onClick={() => exportXlsx(columns, STATIC, 'example.xlsx')}
            >
              Export XLSX
            </button>
          </div>
        }
      />
    </div>
  );
}

export default CrmTableExample;
