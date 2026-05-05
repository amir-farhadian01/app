import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutList, Loader2, MessageCircle, X } from 'lucide-react';
import { isServiceQuestionnaireV1, type ServiceFieldDef } from '../../../../lib/serviceDefinitionTypes';
import { resolveMediaUrl } from '../../../lib/resolveMediaUrl';
import type { ProviderInboxItem } from '../../../services/providerInbox';
import { cn } from '../../../lib/utils';
import type { LostFeedbackReason } from '../../../services/providerInbox';
import { LostFeedbackPanel } from './LostFeedbackPanel';
import { InboxDrawerChat } from './InboxDrawerChat';

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

function serviceBreadcrumb(item: ProviderInboxItem): string {
  const cat = item.serviceCatalog?.category?.trim();
  const svc = item.serviceCatalog?.name?.trim() || item.package.name;
  if (cat && svc) {
    if (cat.includes(svc)) return cat;
    return `${cat} › ${svc}`;
  }
  return svc || 'Service';
}

function lifecycleStatusBadge(item: ProviderInboxItem): string {
  if (item.order.status === 'completed') return 'COMPLETED';
  if (item.status === 'invited') return 'INVITED';
  if (item.status === 'matched') return 'MATCHED';
  if (item.status === 'accepted') return 'ACKNOWLEDGED';
  if (item.status === 'declined') return 'DECLINED';
  if (item.status === 'expired') return 'EXPIRED';
  if (item.status === 'superseded') return 'LOST';
  return String(item.status).toUpperCase();
}

function timelineHint(item: ProviderInboxItem): string {
  if (item.order.scheduledAt) {
    return new Date(item.order.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  if (item.order.scheduleFlexibility === 'this_week') return 'This week';
  if (item.order.scheduleFlexibility === 'asap') return 'As soon as possible';
  return formatScheduleLabel(item.order.scheduleFlexibility, item.order.scheduledAt);
}

function pickStr(obj: Record<string, unknown> | null | undefined, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function pickNum(obj: Record<string, unknown> | null | undefined, key: string): number | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === 'number' && !Number.isNaN(v) ? v : undefined;
}

function effectiveBookingMode(item: ProviderInboxItem): 'auto_appointment' | 'negotiation' | 'inherit' {
  const bm = item.package.bookingMode;
  if (bm === 'auto_appointment' || bm === 'negotiation') return bm;
  const locked = item.package.serviceCatalog?.lockedBookingMode;
  if (locked === 'auto_appointment' || locked === 'negotiation') return locked;
  return 'inherit';
}

const TIME_PREF_LABELS: Record<string, string> = {
  AS_SOON_AS_POSSIBLE: 'As soon as possible',
  THIS_WEEK: 'This week',
  NEXT_WEEK: 'Next week',
  FLEXIBLE: 'Flexible',
};

function schedulingBlock(item: ProviderInboxItem): string {
  const picks = item.order.customerPicks ?? undefined;
  const mode = effectiveBookingMode(item);
  if (mode === 'negotiation') {
    const tp = pickStr(picks, 'wizardTimePreference') ?? pickStr(picks, 'timePreference');
    if (tp && TIME_PREF_LABELS[tp]) return `Negotiation · ${TIME_PREF_LABELS[tp]}`;
    return `Negotiation · ${formatScheduleLabel(item.order.scheduleFlexibility, item.order.scheduledAt)}`;
  }
  if (item.order.scheduledAt) {
    return `Scheduled · ${new Date(item.order.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
  }
  return `Auto booking · ${formatScheduleLabel(item.order.scheduleFlexibility, item.order.scheduledAt)}`;
}

function budgetLine(item: ProviderInboxItem): string | null {
  const picks = item.order.customerPicks;
  const min = pickNum(picks ?? undefined, 'budgetMin');
  const max = pickNum(picks ?? undefined, 'budgetMax');
  if (min == null && max == null) return null;
  const ccy = item.package.currency || 'CAD';
  if (min != null && max != null) return `${fmtPrice(min, ccy)} – ${fmtPrice(max, ccy)}`;
  if (min != null) return `From ${fmtPrice(min, ccy)}`;
  if (max != null) return `Up to ${fmtPrice(max, ccy)}`;
  return null;
}

/** Next-step copy for negotiated orders once the job is contracted (contract lifecycle). */
function providerContractCloseHint(summary: ProviderInboxItem['order']['contractSummary']): string | null {
  if (!summary?.currentVersionStatus) return null;
  switch (summary.currentVersionStatus) {
    case 'draft':
      return 'Contract is still in draft — send it from the order Contract tab when ready.';
    case 'sent':
      return 'Contract sent — waiting for customer approval.';
    case 'approved':
      return 'Contract approved — mark the job complete when the work is finished.';
    case 'rejected':
      return 'Customer rejected the contract — send a revised version before completing the job.';
    case 'superseded':
      return 'A contract version was superseded — follow the latest contract on the order.';
    default:
      return null;
  }
}

function structuredAddressLines(item: ProviderInboxItem): { street?: string; city?: string; postal?: string } {
  const picks = item.order.customerPicks;
  return {
    street: pickStr(picks ?? undefined, 'addressStreet'),
    city: pickStr(picks ?? undefined, 'addressCity'),
    postal: pickStr(picks ?? undefined, 'addressPostal'),
  };
}

function customerDisplayLabel(item: ProviderInboxItem, revealPii: boolean): string {
  if (revealPii) {
    return [item.customer.firstName, item.customer.lastName].filter(Boolean).join(' ') || item.customer.displayName || 'Customer';
  }
  const fn = item.customer.firstName?.trim();
  const ln = item.customer.lastName?.trim();
  if (fn && ln) return `${fn} ${ln.slice(0, 1).toUpperCase()}.`;
  if (fn) return `${fn.slice(0, 1).toUpperCase()}.`;
  const dn = item.customer.displayName?.trim();
  if (dn) return `${dn.slice(0, 1).toUpperCase()}.`;
  return 'Customer';
}

function getTrackingIds(item: ProviderInboxItem): { offerId: string; orderId: string; jobId: string | null } {
  const orderTrace = item.order as {
    offerId?: string;
    orderId?: string;
    jobId?: string | null;
  };
  const offerId = typeof orderTrace.offerId === 'string' && orderTrace.offerId ? orderTrace.offerId : item.order.id;
  const orderId = typeof orderTrace.orderId === 'string' && orderTrace.orderId ? orderTrace.orderId : item.order.id;
  const jobId = typeof orderTrace.jobId === 'string' && orderTrace.jobId ? orderTrace.jobId : null;
  return { offerId, orderId, jobId };
}

export function InboxDetailDrawer({
  open,
  item,
  activeWorkspaceId,
  onClose,
  onAcknowledge,
  onDecline,
  footerMutationBusy,
  footerMutationKind,
  onMarkComplete,
  markCompleteBusy,
  showPaymentBanner,
  lostFeedbackSubmitting,
  lostFeedbackDone,
  onSubmitLostFeedback,
  onMaybeLaterLostFeedback,
}: {
  open: boolean;
  item: ProviderInboxItem | null;
  activeWorkspaceId: string | null;
  onClose: () => void;
  onAcknowledge: (row: ProviderInboxItem) => void;
  onDecline: (row: ProviderInboxItem) => void;
  footerMutationBusy?: boolean;
  footerMutationKind?: 'ack' | 'decline' | null;
  onMarkComplete?: (orderId: string) => void;
  markCompleteBusy?: boolean;
  showPaymentBanner?: boolean;
  lostFeedbackSubmitting?: boolean;
  lostFeedbackDone?: boolean;
  onSubmitLostFeedback?: (attemptId: string, body: {
    reasons: LostFeedbackReason[];
    otherText?: string;
    providerComment?: string;
  }) => void;
  onMaybeLaterLostFeedback?: (attemptId: string) => void;
}) {
  const [mainTab, setMainTab] = useState<'details' | 'chat'>('details');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMainTab('details');
      setLightboxUrl(null);
    }
  }, [open, item?.id]);

  const photos = item ? parsePhotos(item.order.photos).slice(0, 5) : [];
  const schema = item?.order.schemaSnapshot;
  const dynamicSchema = schema && isServiceQuestionnaireV1(schema) ? schema : null;
  const answerObj = item?.order.answers ?? {};
  const breakdownEntries =
    item?.metadata
      ? Object.entries(item.metadata).filter(([, v]) => typeof v === 'number') as Array<[string, number]>
      : [];
  const fullName = [item?.customer.firstName, item?.customer.lastName].filter(Boolean).join(' ') || item?.customer.displayName || 'Customer';
  const matchedToThisProvider = item?.order.matchedProviderId && item.order.matchedProviderId === item.providerId;
  const isThisWorkspace = Boolean(activeWorkspaceId && item?.order.matchedWorkspaceId === activeWorkspaceId);
  const canRevealPii =
    Boolean(item?.status === 'matched' && matchedToThisProvider) ||
    Boolean(item?.status === 'accepted' && isThisWorkspace) ||
    Boolean(item?.order.status === 'contracted' && isThisWorkspace);
  const customerLabel = item ? customerDisplayLabel(item, canRevealPii) : 'Customer';
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
  const canMarkComplete =
    Boolean(item && activeWorkspaceId) &&
    item!.order.status === 'contracted' &&
    item!.order.matchedWorkspaceId === activeWorkspaceId &&
    (item!.status === 'accepted' || item!.status === 'matched');
  const contractCloseHint = item ? providerContractCloseHint(item.order.contractSummary) : null;
  const tracking = item ? getTrackingIds(item) : null;

  const badge = item ? lifecycleStatusBadge(item) : '';
  const addrParts = item ? structuredAddressLines(item) : {};
  const budget = item ? budgetLine(item) : null;
  const orderCompleted = item?.order.status === 'completed';

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
          {lightboxUrl ? (
            <button
              type="button"
              className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 p-4"
              onClick={() => setLightboxUrl(null)}
              aria-label="Close photo"
            >
              <img src={resolveMediaUrl(lightboxUrl)} alt="" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
            </button>
          ) : null}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-[150] flex h-full w-full flex-col border-l border-app-border bg-app-card shadow-2xl md:max-w-[720px]"
            role="dialog"
            aria-modal="true"
          >
            <header className="shrink-0 space-y-4 border-b border-app-border p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Order</p>
                  <h2 className="text-base font-black leading-snug text-app-text">{serviceBreadcrumb(item)}</h2>
                  {tracking ? (
                    <span className="text-xs text-muted-foreground">
                      Ref: Offer #{tracking.offerId.slice(-6)} · Order #{tracking.orderId.slice(-6)}
                      {tracking.jobId ? ` · Job #${tracking.jobId.slice(-6)}` : ''}
                    </span>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-app-border bg-app-input/50 px-2.5 py-0.5 text-[11px] font-black tracking-wide text-app-text">
                      {badge}
                    </span>
                    <span className="text-xs text-neutral-500">{timelineHint(item)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-sm font-black text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
                        {item.customer.avatarUrl ? (
                          <img src={resolveMediaUrl(item.customer.avatarUrl)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          String(customerLabel).slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-semibold text-app-text">{customerLabel}</span>
                    </div>
                    <button
                      type="button"
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-app-border px-3 text-sm font-bold text-app-text hover:bg-app-input/50"
                      onClick={() => setMainTab('chat')}
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      Message
                    </button>
                  </div>
                </div>
                <button type="button" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={onClose}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-2 rounded-xl border border-app-border bg-app-input/30 p-1">
                <button
                  type="button"
                  className={cn(
                    'flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg text-sm font-bold',
                    mainTab === 'details' ? 'bg-app-card text-app-text shadow-sm' : 'text-neutral-500',
                  )}
                  onClick={() => setMainTab('details')}
                >
                  <LayoutList className="h-4 w-4" aria-hidden />
                  Details
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg text-sm font-bold',
                    mainTab === 'chat' ? 'bg-app-card text-app-text shadow-sm' : 'text-neutral-500',
                  )}
                  onClick={() => setMainTab('chat')}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Chat
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden">
              {mainTab === 'details' ? (
                <div className="h-full space-y-5 overflow-y-auto p-5">
                  <section className="rounded-2xl border border-app-border p-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Order details</h3>
                    <div className="mt-3 space-y-3 text-sm text-app-text">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Scope & description</div>
                        <p className="mt-1 whitespace-pre-wrap">{item.order.description || '—'}</p>
                      </div>
                      {budget ? (
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Budget (CAD)</div>
                          <p className="mt-1">{budget}</p>
                        </div>
                      ) : null}
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Location</div>
                        <div className="mt-1 space-y-0.5">
                          {addrParts.street || addrParts.city || addrParts.postal ? (
                            <>
                              {addrParts.street ? <p>{addrParts.street}</p> : null}
                              <p>{[addrParts.city, addrParts.postal].filter(Boolean).join(', ') || '—'}</p>
                            </>
                          ) : (
                            <p>{item.order.address || '—'}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Scheduling</div>
                        <p className="mt-1">{schedulingBlock(item)}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-app-border p-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Customer contact</h3>
                    <div className="mt-2 text-sm">
                      <p className="font-semibold text-app-text">{fullName}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Email:{' '}
                        {canRevealPii ? item.customer.email ?? '—' : item.customer.maskedEmailLabel ?? 'Available after matching'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Phone:{' '}
                        {canRevealPii ? item.customer.phone ?? '—' : item.customer.maskedPhoneLabel ?? 'Available after matching'}
                      </p>
                    </div>
                  </section>

                  {photos.length > 0 ? (
                    <section className="rounded-2xl border border-app-border p-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Reference photos (max 5)</h3>
                      <div className="mt-2 grid grid-cols-5 gap-2">
                        {photos.map((p, idx) => (
                          <button
                            key={`${p.url}-${idx}`}
                            type="button"
                            className="block overflow-hidden rounded-lg border border-app-border"
                            onClick={() => setLightboxUrl(p.url)}
                          >
                            <img src={resolveMediaUrl(p.url)} alt={p.fileName ?? ''} className="h-16 w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-2xl border border-app-border p-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Package</h3>
                    <p className="mt-2 font-semibold text-app-text">{item.package.name}</p>
                    {item.package.description ? (
                      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{item.package.description}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-app-text">
                      {fmtPrice(item.package.finalPrice, item.package.currency)}
                      {item.package.durationMinutes != null ? ` · ${item.package.durationMinutes} min` : null}
                    </p>
                    {item.package.bom && item.package.bom.length > 0 ? (
                      <div className="mt-3 overflow-hidden rounded-lg border border-app-border">
                        <div className="bg-app-input/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-500">Bill of materials</div>
                        {item.package.bom.map((line, i) => (
                          <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-app-border px-3 py-2 text-xs">
                            <span className="text-app-text">
                              {line.snapshotProductName} × {line.quantity} {line.snapshotUnit}
                            </span>
                            <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
                              {fmtPrice(line.snapshotUnitPrice * line.quantity, line.snapshotCurrency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {item.package.serviceCatalog?.lockedBookingMode ? (
                      <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        Catalog booking lock: {item.package.serviceCatalog.lockedBookingMode}
                      </p>
                    ) : null}
                  </section>

                  <section className="rounded-2xl border border-app-border p-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Match meta</h3>
                    <p className="mt-2 text-xs text-neutral-500">Attempt: {item.id.slice(0, 12)}…</p>
                    <p className="text-xs text-neutral-500">Invited: {new Date(item.invitedAt).toLocaleString()}</p>
                  </section>

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
              ) : (
                <div className="flex h-full min-h-0 flex-col overflow-y-auto p-5">
                  <InboxDrawerChat orderId={item.order.id} customer={item.customer} />
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-app-border p-4">
              {showPaymentBanner || orderCompleted ? (
                <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                  Payment will be processed here. Stripe integration coming soon.
                </div>
              ) : null}
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
                      disabled={Boolean(footerMutationBusy)}
                      className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-900 font-bold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                      onClick={() => onAcknowledge(item)}
                    >
                      {footerMutationBusy && footerMutationKind === 'ack' ? (
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                      ) : null}
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(footerMutationBusy)}
                      className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-app-border px-4 font-bold text-amber-700 disabled:opacity-60 dark:text-amber-300"
                      onClick={() => onDecline(item)}
                    >
                      {footerMutationBusy && footerMutationKind === 'decline' ? (
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                      ) : null}
                      Decline
                    </button>
                  </div>
                </>
              ) : item.status === 'matched' && item.order.status === 'contracted' ? (
                <div className="space-y-3">
                  {orderCompleted ? (
                    <div className="rounded-xl border border-app-border bg-neutral-100 px-3 py-2 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                      This job is complete. Payment and payout steps will appear here next.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100">
                        Customer selected your workspace — this job is confirmed. Use Chat or open the order Contract tab to
                        finalize terms, then mark complete when finished.
                      </div>
                      {contractCloseHint ? (
                        <div className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-900 dark:border-indigo-700 dark:bg-indigo-900/25 dark:text-indigo-100">
                          {contractCloseHint}
                        </div>
                      ) : null}
                      {canMarkComplete && onMarkComplete ? (
                        <button
                          type="button"
                          disabled={Boolean(markCompleteBusy)}
                          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 font-bold text-white disabled:opacity-60 dark:bg-emerald-600"
                          onClick={() => onMarkComplete(item.order.id)}
                        >
                          {markCompleteBusy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden /> : null}
                          Mark complete
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : item.status === 'matched' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={Boolean(footerMutationBusy)}
                    className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-900 font-bold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                    onClick={() => onAcknowledge(item)}
                  >
                    {footerMutationBusy && footerMutationKind === 'ack' ? (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                    ) : null}
                    Acknowledge — take this job
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(footerMutationBusy)}
                    className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-app-border px-4 font-bold text-amber-700 disabled:opacity-60 dark:text-amber-300"
                    onClick={() => onDecline(item)}
                  >
                    {footerMutationBusy && footerMutationKind === 'decline' ? (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                    ) : null}
                    Decline
                  </button>
                </div>
              ) : item.status === 'accepted' ? (
                <div className="space-y-3">
                  {orderCompleted ? (
                    <div className="rounded-xl border border-app-border bg-neutral-100 px-3 py-2 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                      This job is complete. Payment and payout steps will appear here next.
                    </div>
                  ) : item.order.status === 'matching' ? (
                    <div className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200">
                      Awaiting customer&apos;s pick — multiple providers may have accepted. We&apos;ll notify you of the outcome.
                    </div>
                  ) : item.order.status === 'contracted' ? (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100">
                        You&apos;re on this job. Mark it complete when the work is finished.
                      </div>
                      {contractCloseHint ? (
                        <div className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-900 dark:border-indigo-700 dark:bg-indigo-900/25 dark:text-indigo-100">
                          {contractCloseHint}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {canMarkComplete && onMarkComplete && !orderCompleted ? (
                    <button
                      type="button"
                      disabled={Boolean(markCompleteBusy)}
                      className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 font-bold text-white disabled:opacity-60 dark:bg-emerald-600"
                      onClick={() => onMarkComplete(item.order.id)}
                    >
                      {markCompleteBusy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden /> : null}
                      Mark complete
                    </button>
                  ) : null}
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
                Package price: {fmtPrice(item.package.finalPrice, item.package.currency)}
              </div>
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
