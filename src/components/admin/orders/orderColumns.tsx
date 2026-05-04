import { Copy } from 'lucide-react';
import type { CrmColumnDef } from '../../crm/types';
import type { AdminOrderListItem } from '../../../../lib/adminOrdersList';
import { cn } from '../../../lib/utils.js';

export type AdminOrdersSegment = 'all' | 'offer' | 'order' | 'job' | 'cancelled';

const STATUS_OPTS = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'matching', label: 'Matching' },
  { value: 'matched', label: 'Matched' },
  { value: 'contracted', label: 'Contracted' },
  { value: 'paid', label: 'Paid' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

const ENTRY_OPTS = [
  { value: 'explorer', label: 'Explorer' },
  { value: 'ai_suggestion', label: 'AI' },
  { value: 'direct', label: 'Direct' },
];

/** Default visible column ids per lifecycle segment (CrmTable column manager can override). */
const SEGMENT_DEFAULT_VISIBLE: Record<AdminOrdersSegment, string[]> = {
  all: ['customer', 'serviceCatalog', 'status', 'provider', 'workspace', 'scheduledAt', 'updatedAt', 'wasPhase'],
  offer: ['customer', 'serviceCatalog', 'scheduledAt', 'createdAt', 'photos', 'address', 'entryPoint'],
  order: ['customer', 'serviceCatalog', 'provider', 'workspace', 'status', 'scheduledAt', 'updatedAt'],
  job: ['customer', 'provider', 'workspace', 'status', 'scheduledAt', 'finalPrice', 'updatedAt'],
  cancelled: ['customer', 'serviceCatalog', 'provider', 'wasPhase', 'cancelledAt', 'cancelReason'],
};

function relTime(iso: string | null | undefined): { rel: string; abs: string } {
  if (!iso) return { rel: '—', abs: '—' };
  const d = new Date(iso);
  const abs = d.toLocaleString();
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return { rel: 'just now', abs };
  if (s < 3600) return { rel: `${Math.floor(s / 60)}m ago`, abs };
  if (s < 86400) return { rel: `${Math.floor(s / 3600)}h ago`, abs };
  if (s < 86400 * 7) return { rel: `${Math.floor(s / 86400)}d ago`, abs };
  return { rel: d.toLocaleDateString(), abs };
}

function statusPillClass(status: string) {
  if (status === 'submitted') return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
  if (status === 'draft') return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
  if (status === 'cancelled') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (status === 'closed') return 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100';
  if (status === 'in_progress' || status === 'paid' || status === 'contracted' || status === 'matched') {
    return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
  }
  if (status === 'matching') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';
}

function entryLabel(ep: string) {
  const o = ENTRY_OPTS.find((x) => x.value === ep);
  return o?.label ?? ep;
}

function phaseWord(phase: string | null | undefined): string {
  if (phase === 'offer') return 'Offer';
  if (phase === 'order') return 'Order';
  if (phase === 'job') return 'Job';
  return '—';
}

function defaultHiddenFor(segment: AdminOrdersSegment, colId: string, hideable: boolean): boolean {
  if (!hideable) return false;
  return !SEGMENT_DEFAULT_VISIBLE[segment].includes(colId);
}

function orderColumnIdsForSegment(segment: AdminOrdersSegment): string[] {
  if (segment === 'all') {
    return [
      'customer',
      'serviceCatalog',
      'status',
      'provider',
      'workspace',
      'scheduledAt',
      'updatedAt',
      'createdAt',
      'photos',
      'address',
      'entryPoint',
      'finalPrice',
      'wasPhase',
      'cancelledAt',
      'cancelReason',
      'id',
    ];
  }
  if (segment === 'offer') {
    return ['customer', 'serviceCatalog', 'scheduledAt', 'createdAt', 'photos', 'address', 'entryPoint', 'status', 'provider', 'workspace', 'updatedAt', 'finalPrice', 'wasPhase', 'cancelledAt', 'cancelReason', 'id'];
  }
  if (segment === 'order') {
    return ['customer', 'serviceCatalog', 'provider', 'workspace', 'status', 'scheduledAt', 'updatedAt', 'createdAt', 'photos', 'address', 'entryPoint', 'finalPrice', 'wasPhase', 'cancelledAt', 'cancelReason', 'id'];
  }
  if (segment === 'job') {
    return ['customer', 'provider', 'workspace', 'status', 'scheduledAt', 'finalPrice', 'updatedAt', 'serviceCatalog', 'createdAt', 'photos', 'address', 'entryPoint', 'wasPhase', 'cancelledAt', 'cancelReason', 'id'];
  }
  return ['customer', 'serviceCatalog', 'provider', 'wasPhase', 'cancelledAt', 'cancelReason', 'status', 'scheduledAt', 'createdAt', 'updatedAt', 'photos', 'address', 'entryPoint', 'finalPrice', 'id'];
}

export function getAdminOrderColumns(ctx: {
  segment: AdminOrdersSegment;
  serviceCatalogOptions: () => Promise<{ value: string; label: string }[]>;
  onCopied?: (msg: string) => void;
}): CrmColumnDef<AdminOrderListItem>[] {
  const { segment, serviceCatalogOptions, onCopied } = ctx;
  const dh = (id: string, hideable = true) => defaultHiddenFor(segment, id, hideable);

  const colsById: Record<string, CrmColumnDef<AdminOrderListItem>> = {
    customer: {
      id: 'customer',
      header: 'Customer',
      accessor: (r) => r.customer.displayName ?? r.customer.email,
      sticky: true,
      hideable: false,
      cell: (r) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-900 text-sm font-black italic text-white dark:bg-white dark:text-neutral-900">
            {r.customer.avatarUrl ? (
              <img src={r.customer.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (r.customer.displayName ?? r.customer.email)?.[0]?.toUpperCase() ?? '?'
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-app-text">{r.customer.displayName ?? '—'}</p>
            <p className="truncate text-xs text-neutral-500">{r.customer.email}</p>
          </div>
        </div>
      ),
    },
    serviceCatalog: {
      id: 'serviceCatalog',
      header: 'Service',
      accessor: (r) => r.serviceCatalog.name,
      defaultHidden: dh('serviceCatalog'),
      cell: (r) => {
        const trail = r.serviceCatalog.breadcrumb.map((b) => b.name).join(' › ');
        const tip = trail ? `${trail} › ${r.serviceCatalog.name}` : r.serviceCatalog.name;
        return (
          <div className="max-w-[240px]">
            <p className="truncate font-medium text-app-text" title={tip}>
              {r.serviceCatalog.name}
            </p>
            {trail ? (
              <p className="truncate text-[10px] uppercase tracking-wider text-neutral-400" title={tip}>
                {trail}
              </p>
            ) : null}
          </div>
        );
      },
      filter: { kind: 'checkbox', options: serviceCatalogOptions },
    },
    provider: {
      id: 'provider',
      header: 'Provider',
      accessor: (r) => r.matchedProviderName ?? '',
      defaultHidden: dh('provider'),
      cell: (r) => <span className="text-sm text-app-text">{r.matchedProviderName ?? '—'}</span>,
    },
    workspace: {
      id: 'workspace',
      header: 'Workspace',
      accessor: (r) => r.matchedWorkspaceName ?? '',
      defaultHidden: dh('workspace'),
      cell: (r) => <span className="text-sm text-app-text">{r.matchedWorkspaceName ?? '—'}</span>,
    },
    status: {
      id: 'status',
      header: 'Status',
      accessor: (r) => r.status,
      defaultHidden: dh('status'),
      sortable: true,
      cell: (r) => (
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              'inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
              statusPillClass(r.status)
            )}
          >
            {r.status.replace(/_/g, ' ')}
          </span>
          {r.status === 'cancelled' && r.phase ? (
            <span className="inline-flex w-fit rounded-md border border-app-border bg-neutral-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              Was: {phaseWord(r.phase)}
            </span>
          ) : null}
        </div>
      ),
      filter: { kind: 'checkbox', options: STATUS_OPTS },
    },
    wasPhase: {
      id: 'wasPhase',
      header: 'Was',
      accessor: (r) => r.phase ?? '',
      defaultHidden: dh('wasPhase'),
      cell: (r) =>
        r.status === 'cancelled' && r.phase ? (
          <span className="inline-flex rounded-md border border-app-border bg-neutral-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-app-text dark:bg-neutral-800">
            {phaseWord(r.phase)}
          </span>
        ) : (
          <span className="text-sm text-neutral-500">—</span>
        ),
    },
    scheduledAt: {
      id: 'scheduledAt',
      header: 'Scheduled',
      accessor: (r) => r.scheduledAt,
      defaultHidden: dh('scheduledAt'),
      sortable: true,
      cell: (r) => {
        const t = relTime(r.scheduledAt);
        return (
          <span className="text-sm text-app-text" title={t.abs}>
            {t.rel}
          </span>
        );
      },
      filter: { kind: 'dateRange' },
    },
    createdAt: {
      id: 'createdAt',
      header: 'Created',
      accessor: (r) => r.createdAt,
      defaultHidden: dh('createdAt'),
      sortable: true,
      cell: (r) => {
        const t = relTime(r.createdAt);
        return (
          <span className="text-sm text-app-text" title={t.abs}>
            {t.rel}
          </span>
        );
      },
      filter: { kind: 'dateRange' },
    },
    updatedAt: {
      id: 'updatedAt',
      header: 'Updated',
      accessor: (r) => r.updatedAt,
      defaultHidden: dh('updatedAt'),
      sortable: true,
      cell: (r) => {
        const t = relTime(r.updatedAt);
        return (
          <span className="text-sm text-app-text" title={t.abs}>
            {t.rel}
          </span>
        );
      },
      filter: { kind: 'dateRange' },
    },
    photos: {
      id: 'photos',
      header: 'Photos',
      accessor: (r) => r.photoCount,
      defaultHidden: dh('photos'),
      cell: (r) => <span className="tabular-nums text-sm">{r.photoCount}</span>,
    },
    address: {
      id: 'address',
      header: 'Address',
      accessor: (r) => r.addressTruncated,
      defaultHidden: dh('address'),
      cell: (r) => (
        <span className="max-w-[200px] truncate text-sm text-neutral-600 dark:text-neutral-400" title={r.address}>
          {r.addressTruncated}
        </span>
      ),
    },
    entryPoint: {
      id: 'entryPoint',
      header: 'Entry',
      accessor: (r) => r.entryPoint,
      defaultHidden: dh('entryPoint'),
      cell: (r) => (
        <span className="inline-flex rounded-lg border border-app-border bg-neutral-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {entryLabel(r.entryPoint)}
        </span>
      ),
      filter: { kind: 'checkbox', options: ENTRY_OPTS },
    },
    finalPrice: {
      id: 'finalPrice',
      header: 'Final price',
      accessor: () => '',
      defaultHidden: dh('finalPrice'),
      cell: () => <span className="text-sm text-neutral-500">—</span>,
    },
    cancelledAt: {
      id: 'cancelledAt',
      header: 'Cancelled',
      accessor: (r) => r.cancelledAt,
      defaultHidden: dh('cancelledAt'),
      cell: (r) => {
        const t = relTime(r.cancelledAt);
        return (
          <span className="text-sm text-app-text" title={t.abs}>
            {t.rel}
          </span>
        );
      },
      filter: { kind: 'dateRange' },
    },
    cancelReason: {
      id: 'cancelReason',
      header: 'Cancel reason',
      accessor: (r) => r.cancelReason ?? '',
      defaultHidden: dh('cancelReason'),
      cell: (r) => (
        <span className="max-w-[220px] truncate text-sm text-neutral-600 dark:text-neutral-400" title={r.cancelReason ?? ''}>
          {r.cancelReason?.trim() ? r.cancelReason : '—'}
        </span>
      ),
    },
    id: {
      id: 'id',
      header: 'Order ID',
      accessor: (r) => r.id,
      defaultHidden: true,
      cell: (r) => (
        <button
          type="button"
          className="flex max-w-[120px] items-center gap-1 truncate font-mono text-[11px] text-app-text hover:underline"
          title="Copy ID"
          onClick={(e) => {
            e.stopPropagation();
            void navigator.clipboard.writeText(r.id);
            onCopied?.('Order ID copied.');
          }}
        >
          <span className="truncate">{r.id}</span>
          <Copy className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      ),
    },
  };

  return orderColumnIdsForSegment(segment).map((id) => colsById[id]!);
}
