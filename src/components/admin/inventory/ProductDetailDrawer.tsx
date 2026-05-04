import { AnimatePresence, motion } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AdminProductDetail } from '../../../services/adminProducts';

type Props = {
  open: boolean;
  onClose: () => void;
  row: AdminProductDetail | null;
  loading: boolean;
};

function fmtPrice(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy || 'CAD' }).format(n);
  } catch {
    return `${n} ${ccy}`;
  }
}

export function ProductDetailDrawer({ open, onClose, row, loading }: Props) {
  const navigate = useNavigate();

  const openPackage = (pkgId: string) => {
    const p = new URLSearchParams();
    p.set('tab', 'service-packages');
    p.set('id', pkgId);
    navigate({ pathname: '/dashboard', search: p.toString() });
    onClose();
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
            aria-labelledby="admin-prod-detail-title"
          >
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <h2 id="admin-prod-detail-title" className="text-lg font-black text-app-text">
                Product (read-only)
              </h2>
              <button type="button" onClick={onClose} className="rounded-xl p-2 text-neutral-500" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-app-text">
              {loading || !row ? (
                <p className="text-neutral-500">Loading…</p>
              ) : (
                <div className="space-y-6">
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
                      <dt className="text-[10px] font-black uppercase text-neutral-400">Name</dt>
                      <dd className="font-semibold">{row.name}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase text-neutral-400">SKU</dt>
                      <dd>{row.sku || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase text-neutral-400">Category</dt>
                      <dd>{row.category || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase text-neutral-400">Unit</dt>
                      <dd>{row.unit}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase text-neutral-400">Unit price</dt>
                      <dd>{fmtPrice(row.unitPrice, row.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase text-neutral-400">Stock</dt>
                      <dd>{row.stockQuantity != null ? `${row.stockQuantity} ${row.unit}` : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase text-neutral-400">Active</dt>
                      <dd>{row.isActive ? 'Yes' : 'No'}</dd>
                    </div>
                    {row.description && (
                      <div>
                        <dt className="text-[10px] font-black uppercase text-neutral-400">Description</dt>
                        <dd className="whitespace-pre-wrap text-neutral-600">{row.description}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[10px] font-black uppercase text-neutral-400">Updated</dt>
                      <dd>{new Date(row.updatedAt).toLocaleString()}</dd>
                    </div>
                  </dl>

                  <section className="rounded-2xl border border-app-border bg-app-card/50 p-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">
                      Used in {row.usedInPackages.length} package{row.usedInPackages.length === 1 ? '' : 's'}
                    </h3>
                    {row.usedInPackages.length === 0 ? (
                      <p className="mt-2 text-xs text-neutral-500">Not referenced on any package BOM.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {row.usedInPackages.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => openPackage(p.id)}
                              className="flex w-full flex-col rounded-xl border border-app-border bg-app-bg px-3 py-2 text-left text-sm transition hover:bg-app-input"
                            >
                              <span className="flex items-center gap-1 font-bold text-app-text">
                                {p.name}
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                {p.workspace.name} · {fmtPrice(p.finalPrice, p.currency)} ·{' '}
                                {p.archivedAt ? 'Archived' : p.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
