import { useMemo, useState } from 'react';
import { CrmTable } from '../../crm/CrmTable';
import type { CrmColumnDef, FilterValue, Sort } from '../../crm/types';
import type { InboxStatus, ProviderInboxItem } from '../../../services/providerInbox';
import { cn } from '../../../lib/utils';

function statusClass(s: InboxStatus): string {
  if (s === 'invited') return 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200';
  if (s === 'matched') return 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200';
  if (s === 'accepted') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200';
  if (s === 'declined') return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200';
  if (s === 'expired') return 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200';
  return 'bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200';
}

function fullName(row: ProviderInboxItem): string {
  const parts = [row.customer.firstName, row.customer.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (row.customer.displayName?.trim()) return row.customer.displayName;
  return 'Customer';
}

/** Primary label for the order (catalog service type, else package name). */
function orderTitle(row: ProviderInboxItem): string {
  const sc = row.serviceCatalog?.name?.trim();
  if (sc) return sc;
  const pkg = row.package?.name?.trim();
  if (pkg) return pkg;
  return 'Order';
}

function categoryLabel(row: ProviderInboxItem): string {
  return row.serviceCatalog?.category?.trim() || '—';
}

/** Maps `BookingMode` from the matched package to a short inbox label. */
export function bookingModeLabel(mode: string | undefined): string {
  if (!mode) return '—';
  if (mode === 'auto_appointment') return 'Auto';
  if (mode === 'inherit_from_catalog') return 'Appointment';
  if (mode === 'negotiation') return 'Negotiation';
  return mode.replace(/_/g, ' ');
}

function relTime(iso: string | null): string {
  if (!iso) return '—';
  const dt = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - dt) / 60000);
  if (Math.abs(diffMin) < 60) return `${Math.max(1, Math.abs(diffMin))}m ${diffMin >= 0 ? 'ago' : 'from now'}`;
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 48) return `${Math.max(1, Math.abs(diffHr))}h ${diffHr >= 0 ? 'ago' : 'from now'}`;
  const diffDay = Math.round(diffHr / 24);
  return `${Math.max(1, Math.abs(diffDay))}d ${diffDay >= 0 ? 'ago' : 'from now'}`;
}

function canRespond(r: ProviderInboxItem): boolean {
  return r.status === 'matched' || r.status === 'invited';
}

type Props = {
  rows: ProviderInboxItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onOpen: (row: ProviderInboxItem) => void;
  onAcknowledge: (row: ProviderInboxItem) => void;
  onDecline: (row: ProviderInboxItem) => void;
};

export function InboxList({
  rows,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onAcknowledge,
  onDecline,
}: Props) {
  const [sort, setSort] = useState<Sort | null>({ id: 'invitedAt', dir: 'desc' });
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
  const [globalSearch, setGlobalSearch] = useState('');

  const filtered = useMemo(() => {
    let out = [...rows];
    const q = globalSearch.trim().toLowerCase();
    if (q) {
      out = out.filter((r) => {
        const hay = [
          fullName(r),
          orderTitle(r),
          categoryLabel(r),
          bookingModeLabel(r.package?.bookingMode),
          r.order.address,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const s = filters.status;
    if (s?.type === 'checkbox' && s.values.length > 0) {
      out = out.filter((r) => s.values.includes(r.status));
    }
    const dateF = filters.invitedAt;
    if (dateF?.type === 'dateRange' && (dateF.from || dateF.to)) {
      const fromMs = dateF.from ? new Date(dateF.from).getTime() : Number.NEGATIVE_INFINITY;
      const toMs = dateF.to ? new Date(dateF.to).getTime() + 86_399_999 : Number.POSITIVE_INFINITY;
      out = out.filter((r) => {
        const ts = new Date(r.invitedAt).getTime();
        return ts >= fromMs && ts <= toMs;
      });
    }
    if (sort) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      out.sort((a, b) => {
        if (sort.id === 'invitedAt') {
          return (new Date(a.invitedAt).getTime() - new Date(b.invitedAt).getTime()) * dir;
        }
        if (sort.id === 'orderTitle') {
          return orderTitle(a).localeCompare(orderTitle(b)) * dir;
        }
        if (sort.id === 'customer') {
          return fullName(a).localeCompare(fullName(b)) * dir;
        }
        return 0;
      });
    }
    return out;
  }, [rows, globalSearch, filters, sort]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const columns: CrmColumnDef<ProviderInboxItem>[] = useMemo(
    () => [
      {
        id: 'status',
        header: 'Status',
        sticky: true,
        width: 120,
        sortable: false,
        filter: {
          kind: 'checkbox',
          options: [
            { value: 'matched', label: 'Matched' },
            { value: 'invited', label: 'Invited' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'declined', label: 'Declined' },
            { value: 'expired', label: 'Expired' },
            { value: 'superseded', label: 'Superseded' },
          ],
        },
        accessor: (r) => r.status,
        cell: (r) => (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-widest',
              statusClass(r.status),
            )}
          >
            {r.status}
          </span>
        ),
      },
      {
        id: 'orderTitle',
        header: 'Order',
        sortable: true,
        width: 220,
        accessor: (r) => orderTitle(r),
        cell: (r) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-app-text">{orderTitle(r)}</div>
            {r.package?.name && r.package.name !== orderTitle(r) ? (
              <div className="truncate text-xs text-neutral-500">{r.package.name}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: 'customer',
        header: 'Customer',
        sortable: true,
        width: 200,
        accessor: (r) => fullName(r),
        cell: (r) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-app-text">{fullName(r)}</div>
            <div className="truncate text-xs text-neutral-500">{r.customer.maskedEmailLabel ?? ''}</div>
          </div>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        width: 160,
        sortable: false,
        accessor: (r) => categoryLabel(r),
        cell: (r) => <span className="text-sm text-app-text">{categoryLabel(r)}</span>,
      },
      {
        id: 'bookingMode',
        header: 'Booking',
        width: 130,
        sortable: false,
        accessor: (r) => bookingModeLabel(r.package?.bookingMode),
        cell: (r) => (
          <span className="text-sm font-semibold text-app-text">{bookingModeLabel(r.package?.bookingMode)}</span>
        ),
      },
      {
        id: 'invitedAt',
        header: 'Invited',
        sortable: true,
        width: 120,
        filter: { kind: 'dateRange' },
        accessor: (r) => r.invitedAt,
        cell: (r) => <span title={new Date(r.invitedAt).toLocaleString()}>{relTime(r.invitedAt)}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        sortable: false,
        width: 220,
        accessor: (r) => r.id,
        cell: (r) => (
          <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={!canRespond(r)}
              onClick={() => onAcknowledge(r)}
              className={cn(
                'min-h-[40px] rounded-xl px-3 text-xs font-black uppercase tracking-wide',
                canRespond(r)
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'cursor-not-allowed bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
              )}
            >
              Accept
            </button>
            <button
              type="button"
              disabled={!canRespond(r)}
              onClick={() => onDecline(r)}
              className={cn(
                'min-h-[40px] rounded-xl px-3 text-xs font-black uppercase tracking-wide',
                canRespond(r)
                  ? 'border border-amber-600 text-amber-800 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-200 dark:hover:bg-amber-950/40'
                  : 'cursor-not-allowed border border-neutral-200 text-neutral-400 dark:border-neutral-700',
              )}
            >
              Decline
            </button>
          </div>
        ),
      },
    ],
    [onAcknowledge, onDecline],
  );

  return (
    <CrmTable
      tableId="provider-inbox"
      columns={columns}
      data={pageRows}
      total={filtered.length}
      loading={loading}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      sort={sort}
      onSortChange={setSort}
      filters={filters}
      onFiltersChange={setFilters}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      rowKey={(r) => r.id}
      onRowClick={onOpen}
    />
  );
}
