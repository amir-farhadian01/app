import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { isServiceQuestionnaireV1, type ServiceFieldDef } from '../../../../lib/serviceDefinitionTypes';
import { resolveMediaUrl } from '../../../lib/resolveMediaUrl';
import type { ProviderInboxItem } from '../../../services/providerInbox';
import { cn } from '../../../lib/utils';
import type { LostFeedbackReason } from '../../../services/providerInbox';
import { LostFeedbackPanel } from './LostFeedbackPanel';

function fmtPrice(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy || 'CAD' }).format(n);
  } catch {
    return `${n} ${ccy}`;
  }
}

function formatScheduleLabel(flex: string, scheduledAt: string | null): string {
  if (flex === 'asap') return 'As soon as possible';
  if (flex === 'this_week') return 'This week';
  if (scheduledAt) return new Date(scheduledAt).toLocaleString();
  return 'Flexible scheduling';
}

function parsePhotos(raw: unknown): { url: string; fileName?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object')
    .map((x) => x as Record<string, unknown>)
    .map((o) => ({
      url: typeof o.url === 'string' ? o.url : '',
      fileName: typeof o.fileName === 'string' ? o.fileName : undefined,
    }))
    .filter((x) => x.url.length > 0);
}

function answerText(field: ServiceFieldDef, value: unknown): string {
  if (value == null || value === '') return '—';
  if (field.type === 'boolean') return value === true ? field.trueLabel ?? 'Yes' : field.falseLabel ?? 'No';
  if (field.type === 'select' && field.options?.length) {
    const v = String(value);
    return field.options.find((o) => o.value === v)?.label ?? v;
  }
  if (field.type === 'multiselect' && Array.isArray(value)) {
    return value
      .map((v) => {
        const s = String(v);
        return field.options?.find((o) => o.value === s)?.label ?? s;
      })
      .join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function InboxDetailDrawer({
  open,
  item,
  onClose,
  onAcknowledge,
  onDecline,
  lostFeedbackSubmitting,
  lostFeedbackDone,
  onSubmitLostFeedback,
  onMaybeLaterLostFeedback,
}: {
  open: boolean;
  item: ProviderInboxItem | null;
  onClose: () => void;
  onAcknowledge: (row: ProviderInboxItem) => void;
  onDecline: (row: ProviderInboxItem) => void;
  lostFeedbackSubmitting?: boolean;
  lostFeedbackDone?: boolean;
  onSubmitLostFeedback?: (attemptId: string, body: {
    reasons: LostFeedbackReason[];
    otherText?: string;
    providerComment?: string;
  }) => void;
  onMaybeLaterLostFeedback?: (attemptId: string) => void;
}) {
  const photos = item ? parsePhotos(item.order.photos) : [];
  const schema = item?.order.schemaSnapshot;
  const dynamicSchema = schema && isServiceQuestionnaireV1(schema) ? schema : null;
  const answerObj = item?.order.answers ?? {};
  const breakdownEntries =
    item?.metadata
      ? Object.entries(item.metadata).filter(([, v]) => typeof v === 'number') as Array<[string, number]>
      : [];
  const fullName = [item?.customer.firstName, item?.customer.lastName].filter(Boolean).join(' ') || item?.customer.displayName || 'Customer';
  const matchedToThisProvider = item?.order.matchedProviderId && item.order.matchedProviderId === item.providerId;
  const canRevealPii = item?.status === 'matched' && Boolean(matchedToThisProvider);
  const countdown = (() => {
    if (!item?.expiresAt) return null;
    const ms = new Date(item.expiresAt).getTime() - Date.now();
    if (ms <= 0) return 'Expired';
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const m = (totalMin % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  })();
  const countdownDanger = !!item?.expiresAt && new Date(item.expiresAt).getTime() - Date.now() <= 3600 * 1000;
  const showLostPanel = item?.status === 'superseded' || item?.status === 'declined' || item?.status === 'expired';

  return (
    <AnimatePresence>
      {open && item ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[140] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close drawer"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-[150] flex h-full w-full flex-col border-l border-app-border bg-app-card shadow-2xl md:max-w-[640px]"
            role="dialog"
            aria-modal="true"
          >
            <header className="flex items-start justify-between gap-2 border-b border-app-border p-5">
              <div>
                <h2 className="text-lg font-black text-app-text">Inbox offer detail</h2>
                <p className="text-xs text-neutral-500">{item.id.slice(0, 10)}…</p>
              </div>
              <button type="button" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={onClose}>
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              <section className="rounded-2xl border border-app-border p-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Customer</h3>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-black text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                    {String(fullName).slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-app-text">{fullName}</p>
                    <p className="text-xs text-neutral-500">
                      Email:{' '}
                      {canRevealPii ? item.customer.email ?? '—' : item.customer.maskedEmailLabel ?? 'Available after matching'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Phone:{' '}
                      {canRevealPii ? item.customer.phone ?? '—' : item.customer.maskedPhoneLabel ?? 'Available after matching'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-app-border p-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Service</h3>
                <p className="mt-2 font-semibold text-app-text">{item.serviceCatalog?.name ?? 'Service'}</p>
                <p className="text-xs text-neutral-500">
                  {[item.serviceCatalog?.category, item.serviceCatalog?.name].filter(Boolean).join(' / ') || '—'}
                </p>
                {item.package.serviceCatalog?.lockedBookingMode ? (
                  <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Locked booking mode: {item.package.serviceCatalog.lockedBookingMode}
                  </p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-app-border p-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Schedule</h3>
                <p className="mt-2 text-sm text-app-text">{formatScheduleLabel(item.order.scheduleFlexibility, item.order.scheduledAt)}</p>
                <p className="text-xs text-neutral-500">Invited: {new Date(item.invitedAt).toLocaleString()}</p>
              </section>

              <section className="rounded-2xl border border-app-border p-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Address</h3>
                <p className="mt-2 text-sm text-app-text">{item.order.address}</p>
              </section>

              <section className="rounded-2xl border border-app-border p-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Description</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-app-text">{item.order.description || '—'}</p>
              </section>

              {photos.length > 0 ? (
                <section className="rounded-2xl border border-app-border p-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Photos</h3>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {photos.map((p, idx) => (
                      <a key={`${p.url}-${idx}`} href={resolveMediaUrl(p.url)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-app-border">
                        <img src={resolveMediaUrl(p.url)} alt={p.fileName ?? ''} className="h-20 w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}

              {dynamicSchema ? (
                <section className="rounded-2xl border border-app-border p-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Dynamic answers</h3>
                  <div className="mt-2 space-y-2">
                    {[...dynamicSchema.fields].sort((a, b) => a.order - b.order).map((f) => (
                      <div key={f.id} className="rounded-xl border border-app-border bg-app-input/30 p-2">
                        <div className="text-[11px] font-black uppercase tracking-wider text-neutral-500">{f.label}</div>
                        <div className="text-sm text-app-text">{answerText(f, answerObj[f.id])}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {breakdownEntries.length > 0 ? (
                <section className="rounded-2xl border border-app-border p-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Score breakdown</h3>
                  <div className="mt-2 overflow-hidden rounded-lg border border-app-border">
                    {breakdownEntries.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between border-b border-app-border px-3 py-2 text-sm last:border-b-0">
                        <span className="text-neutral-600">{k}</span>
                        <span className="tabular-nums text-app-text">{v.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
            <footer className="border-t border-app-border p-4">
              {item.status === 'invited' ? (
                <>
                  {countdown ? (
                    <div
                      className={cn(
                        'mb-2 inline-flex rounded-full border px-3 py-1 text-xs font-black',
                        countdownDanger
                          ? 'animate-pulse border-rose-500 bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                          : 'border-indigo-300 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
                      )}
                    >
                      Expires in {countdown}
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="min-h-[46px] flex-1 rounded-2xl bg-neutral-900 font-bold text-white dark:bg-white dark:text-neutral-900"
                      onClick={() => onAcknowledge(item)}
                    >
                      Accept invitation
                    </button>
                    <button type="button" className="min-h-[46px] rounded-2xl border border-app-border px-4 font-bold text-amber-700 dark:text-amber-300" onClick={() => onDecline(item)}>
                      Decline
                    </button>
                  </div>
                </>
              ) : item.status === 'matched' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="min-h-[46px] flex-1 rounded-2xl bg-neutral-900 font-bold text-white dark:bg-white dark:text-neutral-900"
                    onClick={() => onAcknowledge(item)}
                  >
                    Acknowledge & take this job
                  </button>
                  <button type="button" className="min-h-[46px] rounded-2xl border border-app-border px-4 font-bold text-amber-700 dark:text-amber-300" onClick={() => onDecline(item)}>
                    Decline
                  </button>
                </div>
              ) : item.status === 'accepted' ? (
                <div className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200">
                  Awaiting customer&apos;s pick — multiple providers may have accepted. We&apos;ll notify you of the outcome.
                </div>
              ) : item.status === 'superseded' ? (
                <div className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm text-violet-800 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-200">
                  The customer chose another provider for this offer.
                </div>
              ) : item.status === 'declined' || item.status === 'expired' ? (
                <div className="rounded-xl border border-app-border bg-neutral-100 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  This invitation is closed ({item.status}).
                </div>
              ) : (
                <div className="rounded-xl border border-app-border bg-neutral-100 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  Status: {item.status}
                </div>
              )}
              {showLostPanel && onSubmitLostFeedback ? (
                <LostFeedbackPanel
                  submitting={Boolean(lostFeedbackSubmitting)}
                  done={Boolean(lostFeedbackDone)}
                  onSubmit={(body) => onSubmitLostFeedback(item.id, body)}
                  onMaybeLater={() => onMaybeLaterLostFeedback?.(item.id)}
                />
              ) : null}
              <div className={cn('mt-2 text-xs text-neutral-500')}>
                Price: {fmtPrice(item.package.finalPrice, item.package.currency)}
              </div>
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
