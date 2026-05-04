/** Global admin table for /api/admin/service-packages (server-paged). */
import { useMemo, useState } from 'react';
import { MoreVertical, Archive, ExternalLink } from 'lucide-react';
import { CrmTable } from '../../crm/CrmTable';
import type { CrmColumnDef } from '../../crm/types';
import { effectiveBookingModeLabel } from '../../provider/packages/bookingModeUtils';
import { useAuth } from '../../../lib/AuthContext';
import { cn } from '../../../lib/utils';
import type { AdminPackageListItem, AdminBookingMode } from '../../../services/adminServicePackages';

type Props = {
  rows: AdminPackageListItem[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onRowOpen: (row: AdminPackageListItem) => void;
  onForceArchive: (row: AdminPackageListItem) => void;
  searchQ: string;
  onSearchQChange: (q: string) => void;
  workspaceFilter: string;
  serviceCatalogFilter: string;
  onWorkspaceFilterChange: (v: string) => void;
  onServiceCatalogFilterChange: (v: string) => void;
  bookingModes: string[];
  onBookingModesChange: (m: string[]) => void;
  isActive: boolean | null;
  onIsActiveChange: (v: boolean | null) => void;
  onApplyFilters: () => void;
};

export function PackagesGlobalTable({
  rows,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowOpen,
  onForceArchive,
  searchQ,
  onSearchQChange,
  workspaceFilter,
  serviceCatalogFilter,
  onWorkspaceFilterChange,
  onServiceCatalogFilterChange,
  bookingModes,
  onBookingModesChange,
  isActive,
  onIsActiveChange,
  onApplyFilters,
}: Props) {
  const { user } = useAuth();
  const canForce = user?.role === 'owner' || user?.role === 'platform_admin';
  const [menuId, setMenuId] = useState<string | null>(null);

  const columns: CrmColumnDef<AdminPackageListItem>[] = useMemo(
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
              <img src={r.workspace.logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-lg object-cover" width={28} height={28} />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-input text-[10px] font-bold">
                {r.workspace.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="truncate font-semibold">{r.workspace.name}</span>
          </div>
        ),
      },
      {
        id: 'provider',
        header: 'Provider',
        sortable: false,
        accessor: (r) => r.provider.displayName ?? r.provider.email ?? '',
      },
      {
        id: 'catalog',
        header: 'Service',
        sortable: false,
        accessor: (r) => r.serviceCatalog.name,
        cell: (r) => (
          <div>
            <div className="font-semibold">{r.serviceCatalog.name}</div>
            <div className="truncate text-[10px] text-neutral-500">{r.serviceCatalog.category}</div>
          </div>
        ),
      },
      {
        id: 'name',
        header: 'Package',
        sortable: false,
        accessor: (r) => r.name,
      },
      {
        id: 'price',
        header: 'Price',
        sortable: false,
        align: 'right',
        accessor: (r) => r.finalPrice,
        cell: (r) => (
          <span className="tabular-nums">
            {r.finalPrice} {r.currency}
          </span>
        ),
      },
      {
        id: 'eff',
        header: 'Effective booking',
        sortable: false,
        accessor: (r) =>
          effectiveBookingModeLabel(r.serviceCatalog.lockedBookingMode, r.bookingMode as AdminBookingMode).label,
        cell: (r) => {
          const eff = effectiveBookingModeLabel(r.serviceCatalog.lockedBookingMode, r.bookingMode as AdminBookingMode);
          return (
            <span
              className={cn(
                'inline-block rounded-md px-2 py-0.5 text-[10px] font-bold',
                eff.tone === 'locked' && 'bg-amber-100 text-amber-900 dark:bg-amber-900/50',
                eff.tone === 'inherit' && 'bg-neutral-200/80 dark:bg-neutral-700',
                eff.tone === 'explicit' && 'bg-emerald-100/80 dark:bg-emerald-900/30'
              )}
            >
              {eff.label}
            </span>
          );
        },
      },
      {
        id: 'active',
        header: 'Active',
        sortable: false,
        accessor: (r) => r.isActive,
        cell: (r) => (
          <span className={cn(r.isActive ? 'text-emerald-600' : 'text-neutral-400')}>{r.isActive ? 'Yes' : 'No'}</span>
        ),
      },
      {
        id: 'updated',
        header: 'Updated',
        sortable: false,
        accessor: (r) => r.updatedAt,
        cell: (r) => <span className="text-xs text-neutral-500">{new Date(r.updatedAt).toLocaleString()}</span>,
      },
      {
        id: 'act',
        header: '',
        width: 44,
        hideable: false,
        sortable: false,
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
                      onRowOpen(r);
                    }}
                  >
                    <ExternalLink className="h-3 w-3" /> Open
                  </button>
                </li>
                {canForce && !r.archivedAt && (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-1 px-3 py-1.5 text-amber-800 hover:bg-app-input dark:text-amber-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(null);
                        onForceArchive(r);
                      }}
                    >
                      <Archive className="h-3 w-3" /> Force archive
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        ),
      },
    ],
    [menuId, canForce, onRowOpen, onForceArchive]
  );

  const toggleBooking = (v: string) => {
    if (bookingModes.includes(v)) {
      onBookingModesChange(bookingModes.filter((x) => x !== v));
    } else {
      onBookingModesChange([...bookingModes, v]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl border border-app-border bg-app-card p-3">
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[12rem] flex-1">
            <label className="text-[10px] font-black uppercase text-neutral-400">Search</label>
            <input
              className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-2 py-1.5 text-sm"
              value={searchQ}
              onChange={(e) => onSearchQChange(e.target.value)}
              placeholder="Name, id, description…"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400">Workspace ID</label>
            <input
              className="mt-1 w-44 rounded-xl border border-app-border bg-app-input px-2 py-1.5 text-xs"
              value={workspaceFilter}
              onChange={(e) => onWorkspaceFilterChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400">Service catalog ID</label>
            <input
              className="mt-1 w-56 rounded-xl border border-app-border bg-app-input px-2 py-1.5 text-xs font-mono"
              value={serviceCatalogFilter}
              onChange={(e) => onServiceCatalogFilterChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400">Active</label>
            <select
              className="mt-1 w-28 rounded-xl border border-app-border bg-app-input px-2 py-1.5 text-xs"
              value={isActive === null ? 'any' : isActive ? 'true' : 'false'}
              onChange={(e) => {
                const v = e.target.value;
                onIsActiveChange(v === 'any' ? null : v === 'true');
              }}
            >
              <option value="any">Any</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-black uppercase text-neutral-400">Booking mode</span>
          {(['auto_appointment', 'negotiation', 'inherit_from_catalog'] as const).map((b) => (
            <label key={b} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={bookingModes.includes(b)}
                onChange={() => toggleBooking(b)}
                className="rounded border-app-border"
              />
              {b.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={onApplyFilters}
          className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-neutral-900"
        >
          Apply & refresh
        </button>
      </div>
      <CrmTable<AdminPackageListItem>
        tableId="admin-packages-global-v1"
        columns={columns}
        data={rows}
        total={total}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        sort={null}
        onSortChange={() => {}}
        filters={{}}
        onFiltersChange={() => {}}
        globalSearch=""
        onGlobalSearchChange={() => {}}
        rowKey={(r) => r.id}
        onRowClick={onRowOpen}
        rightToolbar={null}
      />
    </div>
  );
}
