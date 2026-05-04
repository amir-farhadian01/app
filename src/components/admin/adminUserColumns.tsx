import { MoreVertical, Copy, Link2 } from 'lucide-react';
import type { CrmColumnDef } from '../crm/types';
import type { AdminUserRow } from '../../../lib/adminUsersTypes';
import type { UserSegment } from '../../hooks/useAdminUsersController';
import { cn } from '../../lib/utils.js';

const ROLE_FILTER_OPTS = [
  { value: 'owner', label: 'Owner' },
  { value: 'platform_admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'support', label: 'Support' },
  { value: 'finance', label: 'Finance' },
  { value: 'customer', label: 'Customer' },
  { value: 'provider', label: 'Provider' },
  { value: 'staff', label: 'Staff' },
];
const STATUS_OPTS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending_verification', label: 'Pending' },
];
const GENDER_OPTS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];
const KYC_SUB_OPTS = [
  { value: 'none', label: 'None' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

function kycSubLabel(s: string | null | undefined): string {
  if (s == null) return '—';
  if (s === 'pending' || s === 'verified' || s === 'rejected') return s;
  return String(s);
}

function relTime(iso: string | null | undefined, absTitle: string): { rel: string; abs: string } {
  if (!iso) return { rel: '—', abs: 'Never' };
  const d = new Date(iso);
  const abs = d.toLocaleString();
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return { rel: 'just now', abs };
  if (s < 3600) return { rel: `${Math.floor(s / 60)}m ago`, abs };
  if (s < 86400) return { rel: `${Math.floor(s / 3600)}h ago`, abs };
  if (s < 86400 * 7) return { rel: `${Math.floor(s / 86400)}d ago`, abs };
  return { rel: d.toLocaleDateString(), abs };
}

function statusDotClass(status: string) {
  if (status === 'active') return 'bg-emerald-500';
  if (status === 'suspended') return 'bg-amber-500';
  if (status === 'pending_verification') return 'bg-sky-500';
  return 'bg-neutral-400';
}

export function getAdminUserColumns(
  segment: UserSegment,
  ctx: {
    onView: (u: AdminUserRow) => void;
    onEdit: (u: AdminUserRow) => void;
    onResetPassword: (u: AdminUserRow) => void;
    onToggleSuspend: (u: AdminUserRow) => void;
    onDelete: (u: AdminUserRow) => void;
    onCopied?: (msg: string) => void;
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
  }
): CrmColumnDef<AdminUserRow>[] {
  const { onView, onEdit, onResetPassword, onToggleSuspend, onDelete, onCopied, openMenuId, setOpenMenuId } = ctx;

  const base: CrmColumnDef<AdminUserRow>[] = [
    {
      id: 'displayName',
      header: 'User',
      accessor: (r) => r.displayName ?? r.email,
      sticky: true,
      hideable: false,
      sortable: true,
      defaultHidden: false,
      cell: (r) => {
        const label = r.displayName || [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email;
        return (
          <div className="flex min-w-0 max-w-[240px] items-center gap-2">
            {r.avatarUrl ? (
              <img src={r.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-xs font-bold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                {(label[0] || '?').toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium text-app-text">{label}</div>
              <div className="truncate text-xs text-neutral-500">{r.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'id',
      header: 'ID',
      accessor: (r) => r.id,
      defaultHidden: true,
      sortable: false,
      cell: (r) => (
        <button
          type="button"
          className="group inline-flex max-w-[120px] items-center gap-1 font-mono text-xs text-neutral-500 hover:text-app-text"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              await navigator.clipboard.writeText(r.id);
              onCopied?.('ID copied');
            } catch {
              /* */
            }
          }}
        >
          <span className="truncate">{r.id}</span>
          <Copy className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" aria-hidden />
        </button>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      accessor: (r) => r.role,
      defaultHidden: false,
      sortable: true,
      filter: { kind: 'checkbox', options: ROLE_FILTER_OPTS },
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (r) => r.status,
      defaultHidden: false,
      sortable: true,
      filter: { kind: 'checkbox', options: STATUS_OPTS },
      cell: (r) => (
        <div className="inline-flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDotClass(r.status))} title={r.status} />
          <span className="text-xs font-medium text-app-text">{r.status.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      id: 'isVerified',
      header: 'Verified',
      accessor: (r) => (r.isVerified ? 'Y' : 'N'),
      defaultHidden: false,
      sortable: true,
      filter: { kind: 'boolean', trueLabel: 'Yes', falseLabel: 'No' },
      cell: (r) => (
        <span className="text-lg" title={r.isVerified ? 'Verified' : 'Not verified'}>
          {r.isVerified ? '✓' : '✖'}
        </span>
      ),
    },
    {
      id: 'kyc.personal',
      header: 'KYC (personal)',
      accessor: (r) => kycSubLabel(r.kyc.personalStatus),
      defaultHidden: false,
      sortable: false,
      filter: { kind: 'checkbox', options: KYC_SUB_OPTS },
    },
    {
      id: 'kyc.business',
      header: 'KYC (business)',
      accessor: (r) => kycSubLabel(r.kyc.businessStatus),
      defaultHidden: true,
      sortable: false,
      filter: { kind: 'checkbox', options: KYC_SUB_OPTS },
    },
    {
      id: 'phone',
      header: 'Phone',
      accessor: (r) => r.phone,
      defaultHidden: false,
      sortable: false,
      filter: { kind: 'text' },
    },
    {
      id: 'address',
      header: 'Address',
      accessor: (r) => r.address,
      defaultHidden: true,
      sortable: false,
      filter: { kind: 'text' },
      cell: (r) => (
        <span className="line-clamp-2 max-w-[180px] text-left text-xs" title={r.address ?? undefined}>
          {r.address || '—'}
        </span>
      ),
    },
    {
      id: 'gender',
      header: 'Gender',
      accessor: (r) => r.gender,
      defaultHidden: true,
      sortable: false,
      filter: { kind: 'checkbox', options: GENDER_OPTS },
    },
    {
      id: 'lastLoginAt',
      header: 'Last login',
      accessor: (r) => r.lastLoginAt,
      defaultHidden: false,
      sortable: true,
      filter: { kind: 'dateRange' },
      cell: (r) => {
        const t = relTime(r.lastLoginAt, '');
        return (
          <span className="text-xs" title={r.lastLoginAt ? t.abs : 'Never'}>
            {t.rel}
          </span>
        );
      },
    },
    {
      id: 'lastDevice',
      header: 'Last device',
      accessor: (r) => r.lastDevice,
      defaultHidden: true,
      sortable: false,
      filter: { kind: 'text' },
    },
    {
      id: 'lastIp',
      header: 'Last IP',
      accessor: (r) => r.lastIp,
      defaultHidden: true,
      sortable: false,
      filter: { kind: 'text' },
    },
    {
      id: 'createdAt',
      header: 'Created',
      accessor: (r) => r.createdAt,
      defaultHidden: false,
      sortable: true,
      filter: { kind: 'dateRange' },
      cell: (r) => {
        const d = new Date(r.createdAt);
        return <span className="text-xs">{d.toLocaleString()}</span>;
      },
    },
    {
      id: 'ownedCompany',
      header: 'Owned company',
      accessor: (r) => r.ownedCompany?.name,
      defaultHidden: true,
      sortable: false,
      filter: { kind: 'text' },
      cell: (r) => {
        const name = r.ownedCompany?.name;
        if (!name) return '—';
        return (
          <a
            href="/admin#companies"
            className="inline-flex max-w-[160px] items-center gap-1 truncate text-blue-600 underline decoration-blue-400/50 hover:decoration-blue-500 dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
            title="Companies admin (coming soon)"
          >
            <Link2 className="h-3 w-3 shrink-0" aria-hidden />
            {name}
          </a>
        );
      },
    },
    {
      id: 'memberships',
      header: 'Memberships',
      accessor: (r) => r.memberships.length,
      defaultHidden: true,
      sortable: false,
      cell: (r) => {
        const m = r.memberships;
        const title = m.map((x) => `${x.companyName} (${x.role})`).join(' · ') || '—';
        return (
          <span className="text-xs" title={title}>
            {m.length} {m.length === 1 ? 'company' : 'companies'}
          </span>
        );
      },
    },
    {
      id: 'requestsAsCustomer',
      header: 'Req. (customer)',
      accessor: (r) => r.counts.requestsAsCustomer,
      defaultHidden: true,
      sortable: true,
    },
    {
      id: 'requestsAsProvider',
      header: 'Req. (provider)',
      accessor: (r) => r.counts.requestsAsProvider,
      defaultHidden: true,
      sortable: true,
    },
  ];

  if (segment === 'clients') {
    base.push(
      {
        id: 'contractsAsCustomer',
        header: 'Contracts (cust.)',
        accessor: (r) => r.counts.contractsAsCustomer,
        defaultHidden: false,
        sortable: true,
      },
      {
        id: 'hiringVolume',
        header: 'Hiring volume',
        accessor: (r) => r.customerContractsValue ?? 0,
        defaultHidden: false,
        sortable: false,
        cell: (r) => (
          <span className="text-xs">
            {r.customerContractsValue != null
              ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(
                  r.customerContractsValue
                )
              : '—'}
          </span>
        ),
      },
      {
        id: 'lastRequestAt',
        header: 'Last request',
        accessor: (r) => r.lastCustomerRequestAt,
        defaultHidden: true,
        sortable: false,
        cell: (r) => {
          if (!r.lastCustomerRequestAt) return '—';
          const t = relTime(r.lastCustomerRequestAt, '');
          return (
            <span className="text-xs" title={t.abs}>
              {t.rel}
            </span>
          );
        },
      }
    );
  }

  if (segment === 'providers') {
    base.push(
      {
        id: 'ownedCoKyc',
        header: 'Co. KYC',
        accessor: (r) => r.ownedCompanyKycStatus ?? r.ownedCompany?.kycStatus,
        defaultHidden: false,
        sortable: false,
        cell: (r) => {
          const o = r.ownedCompany;
          if (!o?.name) return '—';
          const b = o.kycStatus ?? r.ownedCompanyKycStatus;
          return (
            <div className="flex min-w-0 flex-col text-xs">
              <span className="truncate font-medium" title={o.name}>
                {o.name}
              </span>
              {b && (
                <span className="mt-0.5 inline-flex w-fit rounded border border-app-border px-1.5 py-0.5 text-[10px] uppercase text-neutral-500">
                  {b}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'services',
        header: 'Services',
        accessor: (r) => r.counts.services,
        defaultHidden: false,
        sortable: true,
      },
      {
        id: 'contractsAsProvider',
        header: 'Contracts (prov.)',
        accessor: (r) => r.counts.contractsAsProvider,
        defaultHidden: false,
        sortable: true,
      },
      {
        id: 'avgRating',
        header: 'Avg. rating',
        accessor: (r) => r.avgServiceRating,
        defaultHidden: true,
        sortable: false,
        cell: (r) => (
          <span className="text-xs">
            {r.avgServiceRating != null && !Number.isNaN(r.avgServiceRating)
              ? r.avgServiceRating.toFixed(1)
              : '—'}
          </span>
        ),
      },
      {
        id: 'staffRole',
        header: 'Staff role',
        accessor: (r) => r.staffRole,
        defaultHidden: true,
        sortable: false,
        cell: (r) => <span className="text-xs">{r.staffRole || '—'}</span>,
      }
    );
  }

  if (segment === 'clients') {
    const c = base.find((x) => x.id === 'requestsAsProvider');
    if (c) c.defaultHidden = true;
  }
  if (segment === 'providers') {
    const c = base.find((x) => x.id === 'requestsAsCustomer');
    if (c) c.defaultHidden = true;
  }

  const actions: CrmColumnDef<AdminUserRow> = {
    id: 'actions',
    header: '',
    accessor: () => '',
    defaultHidden: false,
    sortable: false,
    width: 48,
    align: 'right',
    cell: (r) => {
      const open = openMenuId === r.id;
      return (
        <div
          className="relative flex justify-end"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-app-text dark:hover:bg-neutral-800"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpenMenuId(open ? null : r.id)}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {open && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                tabIndex={-1}
                aria-label="Close menu"
                onClick={() => setOpenMenuId(null)}
              />
              <ul
                className="absolute end-0 top-full z-50 mt-0.5 min-w-[180px] rounded-xl border border-app-border bg-app-card py-1 text-left text-sm shadow-lg"
                role="menu"
              >
                {[
                  { label: 'View', on: () => onView(r) },
                  { label: 'Edit', on: () => onEdit(r) },
                  { label: 'Reset password', on: () => onResetPassword(r) },
                  {
                    label: r.status === 'suspended' ? 'Activate' : 'Suspend',
                    on: () => onToggleSuspend(r),
                  },
                  { label: 'Delete', on: () => onDelete(r), danger: true },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        'flex w-full px-3 py-2 text-left text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800',
                        item.danger && 'text-red-600 dark:text-red-400'
                      )}
                      onClick={() => {
                        setOpenMenuId(null);
                        item.on();
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      );
    },
  };

  return [...base, actions];
}

export function tableIdForSegment(s: UserSegment): string {
  if (s === 'clients') return 'admin.users.clients';
  if (s === 'providers') return 'admin.users.providers';
  return 'admin.users.all';
}
