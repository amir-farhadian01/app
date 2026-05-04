import { AnimatePresence, motion } from 'motion/react';
import { X, ExternalLink, Archive } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { effectiveBookingModeLabel } from '../../provider/packages/bookingModeUtils';
import {
  forceArchive,
  type AdminBookingMode,
  type AdminPackageDetail,
} from '../../../services/adminServicePackages';

function fmtMoney(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy || 'CAD' }).format(n);
  } catch {
    return `${n} ${ccy}`;
  }
}

function mainSiteBase(): string {
  const o = import.meta.env.VITE_APP_PUBLIC_ORIGIN as string | undefined;
  if (o) return o.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8077`;
  }
  return 'http://localhost:8077';
}

type Props = {
  open: boolean;
  onClose: () => void;
  row: AdminPackageDetail | null;
  loading: boolean;
  onArchived: () => void;
  showMessage: (m: string, t: 'success' | 'error') => void;
};

export function PackageDetailDrawer({ open, onClose, row, loading, onArchived, showMessage }: Props) {
  const { user } = useAuth();
  const canForce = user?.role === 'owner' || user?.role === 'platform_admin';

  const onForce = async () => {
    if (!row || !canForce) return;
    if (!window.confirm('Force-archive this package? It will be hidden from active listings.')) return;
    try {
      await forceArchive(row.id);
      showMessage('Package archived', 'success');
      onArchived();
      onClose();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[300] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close"
          />
          <motion.aside
            className="fixed right-0 top-0 z-[310] flex h-full w-full max-w-lg flex-col border-l border-app-border bg-app-bg"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pkg-detail-title"
          >
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <h2 id="pkg-detail-title" className="text-lg font-black text-app-text">
                Package details
              </h2>
              <button type="button" onClick={onClose} className="rounded-xl p-2 text-neutral-500" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-app-text">
              {loading || !row ? (
                <p className="text-neutral-500">Loading…</p>
              ) : (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Workspace</dt>
                    <dd className="flex items-center gap-2">
                      {row.workspace.logoUrl ? (
                        <img
                          src={row.workspace.logoUrl}
                          alt=""
                          className="h-8 w-8 rounded-lg object-cover"
                          width={32}
                          height={32}
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-input text-xs font-bold">
                          {row.workspace.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-bold">{row.workspace.name}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Provider</dt>
                    <dd>{row.provider.displayName || row.provider.email || row.provider.id}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Service</dt>
                    <dd>
                      {row.serviceCatalog.name}
                      <span className="mt-0.5 block text-xs text-neutral-500">{row.serviceCatalog.category}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Package name</dt>
                    <dd className="font-semibold">{row.name}</dd>
                  </div>
                  {row.description && (
                    <div>
                      <dt className="text-[10px] font-black uppercase text-neutral-400">Description</dt>
                      <dd className="whitespace-pre-wrap text-neutral-600">{row.description}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Price</dt>
                    <dd>
                      {row.finalPrice} {row.currency}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Duration</dt>
                    <dd>{row.durationMinutes != null ? `${row.durationMinutes} min` : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Effective booking</dt>
                    <dd>
                      {
                        effectiveBookingModeLabel(
                          row.serviceCatalog.lockedBookingMode,
                          row.bookingMode as AdminBookingMode
                        ).label
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Stored mode</dt>
                    <dd>{row.bookingMode.replace(/_/g, ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Status</dt>
                    <dd>{row.isActive ? 'Active' : 'Inactive'} {row.archivedAt ? '· Archived' : ''}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase text-neutral-400">Updated</dt>
                    <dd>{new Date(row.updatedAt).toLocaleString()}</dd>
                  </div>

                  <div className="rounded-2xl border border-app-border bg-app-card/50 p-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">
                      Cost breakdown (read-only)
                    </h3>
                    {!row.bom?.length ? (
                      <p className="mt-2 text-xs text-neutral-500">No cost breakdown attached.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {row.margin && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600">
                            <span>
                              Subtotal:{' '}
                              <strong className="text-app-text">{fmtMoney(row.margin.bomCost, row.margin.currency)}</strong>
                            </span>
                            <span>
                              Margin:{' '}
                              <strong className="text-app-text">
                                {fmtMoney(row.margin.margin, row.margin.currency)} ({row.margin.marginPercent.toFixed(1)}%)
                              </strong>
                            </span>
                            {row.margin.crossCurrencyLines > 0 && (
                              <span className="text-amber-700 dark:text-amber-300">
                                Mixed currency: {row.margin.crossCurrencyLines} line(s) excluded
                              </span>
                            )}
                          </div>
                        )}
                        <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                          {row.bom.map((line) => (
                            <li
                              key={line.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-app-border/80 bg-app-bg px-2 py-1.5"
                            >
                              <span className="min-w-0 truncate font-medium">{line.snapshotProductName}</span>
                              <span className="shrink-0 tabular-nums text-neutral-600">
                                ×{line.quantity} @ {fmtMoney(line.snapshotUnitPrice, line.snapshotCurrency)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <p>
                    <a
                      href={`${mainSiteBase()}/dashboard?tab=packages&workspaceId=${encodeURIComponent(row.workspaceId)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open in workspace (My Packages)
                    </a>
                  </p>
                </dl>
              )}
            </div>
            {row && canForce && !row.archivedAt && (
              <div className="border-t border-app-border p-4">
                <button
                  type="button"
                  onClick={() => void onForce()}
                  className="flex w-full min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 text-sm font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <Archive className="h-4 w-4" />
                  Force archive
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
