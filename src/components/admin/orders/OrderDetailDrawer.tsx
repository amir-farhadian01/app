import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { resolveMediaUrl } from '../../../lib/resolveMediaUrl';
import { ImageLightbox } from '../kyc/ImageLightbox';
import type { ServiceFieldDef, ServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes';
import {
  cancelAdminOrder,
  extendRoundRobinWindow,
  fetchAdminOrderDetail,
  fetchAdminOrderEligibility,
  fetchRoundRobinState,
  forceAdminOrderMatch,
  startRoundRobin,
  type AdminOrderEligibilityResponse,
  type AdminOrderDetailResponse,
  type AdminRoundRobinState,
} from '../../../services/adminOrders';
import { fetchAdminOrderChatThread, type AdminOrderChatThreadResponse } from '../../../services/adminOrderChat';
import {
  fetchAdminContractsByOrderId,
  type AdminContractVersionByOrderRow,
} from '../../../services/adminContracts';

type TabId = 'overview' | 'answers' | 'photos' | 'timeline' | 'matching' | 'chat' | 'contract' | 'payment';

function entryLabel(ep: string) {
  if (ep === 'explorer') return 'Explorer';
  if (ep === 'ai_suggestion') return 'AI';
  if (ep === 'direct') return 'Direct';
  return ep;
}

function statusBannerClass(status: string) {
  if (status === 'submitted') return 'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30';
  if (status === 'draft') return 'bg-neutral-500/10 text-neutral-800 dark:text-neutral-200 border-neutral-500/20';
  if (status === 'cancelled') return 'bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/30';
  if (status === 'closed') return 'bg-slate-500/15 text-slate-900 dark:text-slate-100 border-slate-500/30';
  return 'bg-violet-500/10 text-violet-900 dark:text-violet-200 border-violet-500/25';
}

function phaseLabel(phase: string | null | undefined): string {
  if (phase === 'offer') return 'Offer';
  if (phase === 'order') return 'Order';
  if (phase === 'job') return 'Job';
  return '';
}

function phasePillClass(phase: string | null | undefined) {
  if (phase === 'offer') return 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100';
  if (phase === 'order') return 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100';
  if (phase === 'job') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
  return 'border-app-border bg-neutral-500/10 text-neutral-700 dark:text-neutral-200';
}

function formatAnswerDisplay(field: ServiceFieldDef, raw: unknown): string {
  if (raw === undefined || raw === null) return '—';
  if (field.type === 'boolean') return raw === true ? field.trueLabel ?? 'Yes' : field.falseLabel ?? 'No';
  if (field.type === 'select' && field.options?.length) {
    const v = String(raw);
    return field.options.find((o) => o.value === v)?.label ?? v;
  }
  if (field.type === 'multiselect' && Array.isArray(raw)) {
    const labels = (raw as unknown[]).map((x) => {
      const v = String(x);
      return field.options?.find((o) => o.value === v)?.label ?? v;
    });
    return labels.join(', ') || '—';
  }
  if (typeof raw === 'object') return JSON.stringify(raw, null, 2);
  return String(raw);
}

type PhotoRow = { url: string; fileName?: string; fieldId?: string };

function parsePhotos(raw: unknown): PhotoRow[] {
  if (!Array.isArray(raw)) return [];
  const out: PhotoRow[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    const url = typeof o.url === 'string' ? o.url : '';
    if (!url.trim()) continue;
    out.push({
      url,
      fileName: typeof o.fileName === 'string' ? o.fileName : undefined,
      fieldId: typeof o.fieldId === 'string' ? o.fieldId : undefined,
    });
  }
  return out;
}

function answersRecord(order: AdminOrderDetailResponse['order']): Record<string, unknown> {
  const a = order.answers;
  if (a && typeof a === 'object' && !Array.isArray(a)) return a as Record<string, unknown>;
  return {};
}

export function OrderDetailDrawer({
  orderId,
  open,
  onClose,
  canCancel,
  onOrderUpdated,
  onNotify,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  canCancel: boolean;
  onOrderUpdated: () => void;
  onNotify: (message: string, type: 'success' | 'error') => void;
}) {
  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  const [tab, setTab] = useState<TabId>('overview');
  const [detail, setDetail] = useState<AdminOrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [eligibility, setEligibility] = useState<AdminOrderEligibilityResponse | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [forcingPackageId, setForcingPackageId] = useState<string | null>(null);
  const [rrState, setRrState] = useState<AdminRoundRobinState | null>(null);
  const [rrBusy, setRrBusy] = useState(false);
  const [extendHours, setExtendHours] = useState(24);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [chatPayload, setChatPayload] = useState<AdminOrderChatThreadResponse | null | 'none'>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [contractVersions, setContractVersions] = useState<AdminContractVersionByOrderRow[] | null>(null);
  const [contractLoading, setContractLoading] = useState(false);

  const copyTrackingId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onNotifyRef.current('Copied to clipboard.', 'success');
    } catch {
      onNotifyRef.current('Copy failed.', 'error');
    }
  };

  useEffect(() => {
    if (!open || !orderId) {
      setDetail(null);
      setChatPayload(null);
      setContractVersions(null);
      return;
    }
    setTab('overview');
    setLoading(true);
    setEligibility(null);
    setChatPayload(null);
    setContractVersions(null);
    void fetchAdminOrderDetail(orderId)
      .then(setDetail)
      .catch((e) => {
        onNotifyRef.current(e instanceof Error ? e.message : 'Failed to load order', 'error');
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [open, orderId]);

  useEffect(() => {
    if (!open || !orderId || tab !== 'chat') return;
    setChatLoading(true);
    void fetchAdminOrderChatThread(orderId)
      .then((data) => setChatPayload(data))
      .catch((e: Error & { status?: number }) => {
        if (e.status === 404) setChatPayload('none');
        else onNotifyRef.current(e instanceof Error ? e.message : 'Failed to load chat', 'error');
      })
      .finally(() => setChatLoading(false));
  }, [open, orderId, tab]);

  useEffect(() => {
    if (!open || !orderId || tab !== 'contract') return;
    setContractLoading(true);
    void fetchAdminContractsByOrderId(orderId)
      .then((r) => setContractVersions(r.versions))
      .catch((e) => {
        onNotifyRef.current(e instanceof Error ? e.message : 'Failed to load contracts', 'error');
        setContractVersions([]);
      })
      .finally(() => setContractLoading(false));
  }, [open, orderId, tab]);

  useEffect(() => {
    if (!open || !orderId || tab !== 'matching') return;
    setEligibilityLoading(true);
    void Promise.all([fetchAdminOrderEligibility(orderId), fetchRoundRobinState(orderId)])
      .then(([elig, rr]) => {
        setEligibility(elig);
        setRrState(rr);
      })
      .catch((e) => {
        onNotifyRef.current(e instanceof Error ? e.message : 'Failed to load matching data', 'error');
      })
      .finally(() => setEligibilityLoading(false));
  }, [open, orderId, tab]);

  const schema: ServiceQuestionnaireV1 | null = detail?.schema ?? null;
  const fieldsSorted = schema ? [...schema.fields].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)) : [];
  const ans = detail ? answersRecord(detail.order) : {};
  const photos = detail ? parsePhotos(detail.order.photos) : [];
  const trackingChain = detail
    ? (() => {
        const orderTrace = detail.order as { offerId?: string; orderId?: string; jobId?: string | null; id: string };
        return {
          offerId: typeof orderTrace.offerId === 'string' && orderTrace.offerId ? orderTrace.offerId : orderTrace.id,
          orderId: typeof orderTrace.orderId === 'string' && orderTrace.orderId ? orderTrace.orderId : orderTrace.id,
          jobId: typeof orderTrace.jobId === 'string' ? orderTrace.jobId : null,
        };
      })()
    : null;

  const terminal = detail
    ? !['draft', 'submitted'].includes(detail.order.status)
    : true;
  const cancelDisabled = !canCancel || terminal || cancelling;

  const runCancel = async () => {
    if (!orderId || !detail) return;
    const reason = cancelReason.trim();
    if (reason.length < 5) {
      onNotifyRef.current('Reason must be at least 5 characters.', 'error');
      return;
    }
    setCancelling(true);
    try {
      await cancelAdminOrder(orderId, reason);
      onNotifyRef.current('Order cancelled.', 'success');
      setCancelReason('');
      setCancelDialogOpen(false);
      onOrderUpdated();
      const next = await fetchAdminOrderDetail(orderId);
      setDetail(next);
    } catch (e) {
      onNotifyRef.current(e instanceof Error ? e.message : 'Cancel failed', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const timelineEntries = detail
    ? [...(detail.auditLogs ?? detail.auditLog)].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
    : [];

  const runForceMatch = async (packageId: string) => {
    if (!orderId || !detail) return;
    if (detail.order.status === 'cancelled') return;
    setForcingPackageId(packageId);
    try {
      await forceAdminOrderMatch(orderId, packageId);
      onNotifyRef.current('Match override applied.', 'success');
      onOrderUpdated();
      const [next, nextEligibility] = await Promise.all([
        fetchAdminOrderDetail(orderId),
        fetchAdminOrderEligibility(orderId),
      ]);
      setDetail(next);
      setEligibility(nextEligibility);
    } catch (e) {
      onNotifyRef.current(e instanceof Error ? e.message : 'Force match failed', 'error');
    } finally {
      setForcingPackageId(null);
    }
  };

  const runStartRoundRobin = async () => {
    if (!orderId) return;
    setRrBusy(true);
    try {
      await startRoundRobin(orderId);
      const [elig, rr] = await Promise.all([fetchAdminOrderEligibility(orderId), fetchRoundRobinState(orderId)]);
      setEligibility(elig);
      setRrState(rr);
      onNotifyRef.current('Round-robin started.', 'success');
    } catch (e) {
      onNotifyRef.current(e instanceof Error ? e.message : 'Start round-robin failed', 'error');
    } finally {
      setRrBusy(false);
    }
  };

  const runExtendWindow = async (hours: number) => {
    if (!orderId) return;
    setRrBusy(true);
    try {
      await extendRoundRobinWindow(orderId, hours);
      const rr = await fetchRoundRobinState(orderId);
      setRrState(rr);
      onNotifyRef.current(`Window extended by ${hours}h.`, 'success');
    } catch (e) {
      onNotifyRef.current(e instanceof Error ? e.message : 'Extend window failed', 'error');
    } finally {
      setRrBusy(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close drawer"
              className="fixed inset-0 z-[140] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-order-drawer-title"
              className={cn(
                'fixed right-0 top-0 z-[150] flex h-full w-full flex-col border-l border-app-border bg-app-card shadow-2xl',
                'md:max-w-[560px]'
              )}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <header className="flex items-start justify-between gap-4 border-b border-app-border p-6">
                <div className="min-w-0">
                  <h2 id="admin-order-drawer-title" className="truncate text-lg font-black italic uppercase tracking-tight">
                    Order {orderId ? orderId.slice(0, 8) + '…' : ''}
                  </h2>
                  {detail ? (
                    <p className="mt-1 truncate text-xs text-neutral-500">{detail.customer.email}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="flex flex-wrap gap-1 border-b border-app-border px-2 pt-2 sm:px-4">
                {(
                  [
                    ['overview', 'Overview'],
                    ['answers', 'Answers'],
                    ['photos', 'Photos'],
                    ['timeline', 'Timeline'],
                    ['matching', 'Matching'],
                    ['chat', 'Chat'],
                    ['contract', 'Contract'],
                    ['payment', 'Payment'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      'rounded-t-lg px-2 py-2 text-[10px] font-black uppercase tracking-wider transition-colors sm:px-3 sm:text-[11px]',
                      tab === id
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'text-neutral-500 hover:text-app-text'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {loading && <p className="text-sm text-neutral-500">Loading…</p>}
                {!loading && !detail && <p className="text-sm text-neutral-500">No order loaded.</p>}
                {!loading && detail && tab === 'overview' && (
                  <div className="space-y-6">
                    {detail.staleSnapshot ? (
                      <div
                        className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100"
                        role="status"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Schema snapshot may be stale; answers were captured against an older questionnaire revision.</span>
                      </div>
                    ) : null}
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <div
                          className={cn(
                            'rounded-2xl border px-4 py-2 text-center text-sm font-black uppercase tracking-widest',
                            statusBannerClass(detail.order.status),
                          )}
                        >
                          {detail.order.status.replace(/_/g, ' ')}
                        </div>
                        {detail.order.phase ? (
                          <div
                            className={cn(
                              'rounded-2xl border px-4 py-2 text-center text-xs font-black uppercase tracking-widest',
                              phasePillClass(detail.order.phase),
                            )}
                          >
                            Phase · {phaseLabel(detail.order.phase)}
                          </div>
                        ) : null}
                      </div>
                      {detail.order.status === 'cancelled' && detail.order.phase ? (
                        <p className="text-center text-xs font-semibold text-neutral-500">
                          Was: {phaseLabel(detail.order.phase)}
                        </p>
                      ) : null}
                    </div>
                    {detail.customerReview ? (
                      <div className="rounded-xl border border-app-border bg-app-card p-3 text-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Customer review</p>
                        <p className="mt-1 font-bold text-app-text">{detail.customerReview.rating} / 5</p>
                        {detail.customerReview.reviewText ? (
                          <p className="mt-2 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                            {detail.customerReview.reviewText}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-neutral-500">No written review.</p>
                        )}
                        <p className="mt-2 text-xs text-neutral-500">
                          {new Date(detail.customerReview.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ) : null}
                    <div className="grid gap-4 text-sm">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Customer</p>
                        <p className="font-bold text-app-text">
                          {detail.customer.displayName ?? detail.customer.email}
                        </p>
                        <p className="text-xs text-neutral-500">{detail.customer.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Service</p>
                        <a
                          href={`/service/${detail.serviceCatalog.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {detail.serviceCatalog.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {detail.serviceCatalog.breadcrumb.length ? (
                          <p className="mt-1 text-xs text-neutral-500">
                            {detail.serviceCatalog.breadcrumb.map((b) => b.name).join(' › ')}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Entry point</p>
                        <p className="font-medium">{entryLabel(detail.order.entryPoint)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Scheduled</p>
                        <p className="font-medium">
                          {detail.order.scheduledAt
                            ? new Date(detail.order.scheduledAt).toLocaleString()
                            : '—'}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Flexibility: {detail.order.scheduleFlexibility || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Address</p>
                        <p className="whitespace-pre-wrap font-medium">{detail.order.address || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Description</p>
                        <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                          {detail.order.description || '—'}
                        </p>
                        {detail.order.descriptionAiAssisted ? (
                          <p className="mt-1 text-[10px] text-neutral-400">AI-assisted description</p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Schema snapshot</p>
                        <p className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                          {detail.order.schemaSnapshot != null ? 'Present' : 'Missing'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tracking Chain</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {([
                            ['Offer', trackingChain?.offerId ?? null],
                            ['Order', trackingChain?.orderId ?? null],
                            ['Job', trackingChain?.jobId ?? null],
                          ] as const).map(([label, idValue]) => (
                            <button
                              key={label}
                              type="button"
                              disabled={!idValue}
                              onClick={() => {
                                if (idValue) void copyTrackingId(idValue);
                              }}
                              className={cn(
                                'rounded border px-2 py-1 font-mono',
                                idValue
                                  ? 'border-app-border text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                  : 'border-app-border text-neutral-400'
                              )}
                              title={idValue ?? `${label} ID unavailable`}
                            >
                              {label}: {idValue ?? '—'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!loading && detail && tab === 'answers' && (
                  <div className="space-y-4">
                    {!schema ? (
                      <p className="text-sm text-neutral-500">No resolved questionnaire schema for this order.</p>
                    ) : (
                      fieldsSorted.map((f) => (
                        <div
                          key={f.id}
                          className="rounded-xl border border-app-border bg-neutral-50/50 p-4 dark:bg-neutral-900/30"
                        >
                          <p className="text-xs font-bold text-app-text">{f.label}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-400">{f.type}</p>
                          <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-neutral-800 dark:text-neutral-200">
                            {formatAnswerDisplay(f, ans[f.id])}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {!loading && detail && tab === 'photos' && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.length === 0 ? (
                      <p className="col-span-full text-sm text-neutral-500">No photos.</p>
                    ) : (
                      photos.map((p, i) => (
                        <button
                          key={`${p.url}-${i}`}
                          type="button"
                          className="group relative aspect-square overflow-hidden rounded-xl border border-app-border bg-neutral-100 dark:bg-neutral-800"
                          onClick={() =>
                            setLightbox({
                              src: resolveMediaUrl(p.url),
                              alt: p.fileName ?? `Photo ${i + 1}`,
                            })
                          }
                        >
                          <img
                            src={resolveMediaUrl(p.url)}
                            alt=""
                            className="h-full w-full object-cover transition group-hover:opacity-90"
                          />
                        </button>
                      ))
                    )}
                  </div>
                )}
                {!loading && detail && tab === 'timeline' && (
                  <ul className="space-y-3">
                    {timelineEntries.length === 0 ? (
                      <li className="text-sm text-neutral-500">No audit events for this order.</li>
                    ) : (
                      timelineEntries.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-xl border border-app-border bg-neutral-50/50 p-4 text-sm dark:bg-neutral-900/30"
                        >
                          <p className="font-bold text-app-text">{a.action}</p>
                          <p className="text-[10px] text-neutral-400">
                            {new Date(a.timestamp).toLocaleString()} ·{' '}
                            {a.actor.displayName ?? a.actor.email}
                          </p>
                          {a.metadata != null ? (
                            <pre className="mt-2 max-h-32 overflow-auto text-[10px] text-neutral-500">
                              {typeof a.metadata === 'string'
                                ? a.metadata
                                : JSON.stringify(a.metadata, null, 2)}
                            </pre>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                )}
                {!loading && detail && tab === 'chat' && (
                  <div className="space-y-4">
                    {chatLoading ? <p className="text-sm text-neutral-500">Loading chat…</p> : null}
                    {!chatLoading && chatPayload === 'none' ? (
                      <p className="text-sm text-neutral-500">No chat yet</p>
                    ) : null}
                    {!chatLoading && chatPayload && chatPayload !== 'none' ? (
                      <ul className="space-y-3">
                        {chatPayload.messages.length === 0 ? (
                          <li className="text-sm text-neutral-500">Thread exists but has no messages.</li>
                        ) : (
                          chatPayload.messages.map((m) => (
                            <li
                              key={m.id}
                              className="rounded-xl border border-app-border bg-neutral-50/50 p-3 text-sm dark:bg-neutral-900/30"
                            >
                              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                {m.senderRole} · {new Date(m.createdAt).toLocaleString()}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                                {m.displayText || m.originalText}
                              </p>
                            </li>
                          ))
                        )}
                      </ul>
                    ) : null}
                  </div>
                )}
                {!loading && detail && tab === 'contract' && (
                  <div className="space-y-3">
                    {contractLoading ? <p className="text-sm text-neutral-500">Loading contracts…</p> : null}
                    {!contractLoading && contractVersions && contractVersions.length === 0 ? (
                      <p className="text-sm text-neutral-500">No contract on file for this order.</p>
                    ) : null}
                    {!contractLoading && contractVersions && contractVersions.length > 0 ? (
                      <ul className="space-y-2">
                        {contractVersions.map((v) => (
                          <li
                            key={v.id}
                            className="rounded-xl border border-app-border bg-neutral-50/50 p-4 text-sm dark:bg-neutral-900/30"
                          >
                            <p className="font-bold text-app-text">
                              v{v.versionNumber} · {v.status.replace(/_/g, ' ')}
                            </p>
                            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{v.title}</p>
                            <p className="mt-1 text-[10px] text-neutral-400">
                              Updated {new Date(v.updatedAt).toLocaleString()}
                              {v.amount != null && v.currency ? (
                                <span>
                                  {' '}
                                  · {v.amount} {v.currency}
                                </span>
                              ) : null}
                            </p>
                            {v.scopeSummary ? (
                              <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{v.scopeSummary}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
                {!loading && detail && tab === 'payment' && (
                  <div className="rounded-xl border border-app-border bg-neutral-50/50 p-4 text-sm text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
                    <p className="font-semibold text-app-text">Payment ledger</p>
                    <p className="mt-2 leading-relaxed">
                      Stripe integration coming soon. Admin list:{' '}
                      <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs dark:bg-neutral-800">
                        GET /api/admin/payments
                      </code>
                      ; per-order detail:{' '}
                      <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs dark:bg-neutral-800">
                        GET /api/admin/payments/orders/:orderId
                      </code>
                      .
                    </p>
                  </div>
                )}
                {!loading && detail && tab === 'matching' && (
                  <div className="space-y-6">
                    {eligibilityLoading ? <p className="text-sm text-neutral-500">Loading matching data…</p> : null}
                    {!eligibilityLoading && !eligibility ? (
                      <p className="text-sm text-neutral-500">Matching data not available.</p>
                    ) : null}
                    {!eligibilityLoading && eligibility ? (
                      <>
                        <section className="space-y-3 rounded-xl border border-app-border p-3">
                          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Round-robin controls</h3>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={rrBusy || detail.order.status !== 'submitted' || (rrState?.attempts.some((a) => a.status === 'invited') ?? false)}
                              onClick={() => void runStartRoundRobin()}
                              className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900"
                            >
                              Start round-robin
                            </button>
                            <button
                              type="button"
                              disabled={rrBusy}
                              onClick={() => void runExtendWindow(24)}
                              className="rounded-xl border border-app-border px-3 py-2 text-xs font-bold disabled:opacity-50"
                            >
                              Extend window +24h
                            </button>
                            <button
                              type="button"
                              disabled={rrBusy}
                              onClick={() => void runExtendWindow(48)}
                              className="rounded-xl border border-app-border px-3 py-2 text-xs font-bold disabled:opacity-50"
                            >
                              Extend +48h
                            </button>
                            <select
                              className="rounded-xl border border-app-border bg-transparent px-2 py-2 text-xs"
                              value={extendHours}
                              onChange={(e) => setExtendHours(Number.parseInt(e.target.value, 10) || 24)}
                            >
                              {Array.from({ length: 168 }, (_, i) => i + 1).map((h) => (
                                <option key={h} value={h}>
                                  {h}h
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={rrBusy}
                              onClick={() => void runExtendWindow(extendHours)}
                              className="rounded-xl border border-app-border px-3 py-2 text-xs font-bold disabled:opacity-50"
                            >
                              Extend
                            </button>
                          </div>
                          {rrState ? (
                            <p className="text-xs text-neutral-500">
                              Expires: {rrState.matchingExpiresAt ? new Date(rrState.matchingExpiresAt).toLocaleString() : '—'} · {rrState.secondsRemaining ?? '—'}s remaining
                            </p>
                          ) : null}
                        </section>

                        <section className="space-y-3">
                          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Pool</h3>
                          {(rrState?.attempts?.length ?? 0) === 0 ? (
                            <p className="text-sm text-neutral-500">No attempts yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {[...(rrState?.attempts ?? [])]
                                .sort((a, b) => a.score - b.score)
                                .map((a) => (
                                <div key={a.id} className="rounded-xl border border-app-border bg-neutral-50/50 p-3 text-sm dark:bg-neutral-900/30">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-bold text-app-text">{a.status.toUpperCase()}</p>
                                    <p className="text-xs text-neutral-500">score {a.score.toFixed(3)}</p>
                                  </div>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Provider:{' '}
                                    {a.provider.displayName ??
                                      (`${a.provider.firstName ?? ''} ${a.provider.lastName ?? ''}`.trim() ||
                                        a.provider.email)}
                                  </p>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Package: {a.package.name}</p>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Responded: {a.respondedAt ? new Date(a.respondedAt).toLocaleString() : '—'}
                                  </p>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                    Expires: {a.expiresAt ? new Date(a.expiresAt).toLocaleString() : '—'}
                                  </p>
                                  {a.lostReason ? (
                                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Lost reason: {a.lostReason}</p>
                                  ) : null}
                                  {a.lostFeedback ? (
                                    <details className="mt-2 text-xs text-neutral-500">
                                      <summary className="cursor-pointer">Lost-feedback JSON</summary>
                                      <pre className="mt-1 overflow-auto rounded-lg border border-app-border p-2">
                                        {JSON.stringify(a.lostFeedback, null, 2)}
                                      </pre>
                                    </details>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </section>

                        <section className="space-y-3">
                          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Eligible but not invited</h3>
                          {(rrState?.eligibleNotInvited?.length ?? 0) === 0 ? (
                            <p className="text-sm text-neutral-500">No reserved candidates.</p>
                          ) : (
                            <div className="space-y-2">
                              {rrState?.eligibleNotInvited.slice(0, 10).map((e) => (
                                <div key={e.packageId} className="rounded-xl border border-app-border bg-neutral-50/50 p-3 dark:bg-neutral-900/30">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-app-text">{e.packageId}</p>
                                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                        Provider: {e.providerName}
                                      </p>
                                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                        Score: {e.score.toFixed(3)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                        <section className="space-y-3">
                          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Force re-match</h3>
                          {eligibility.eligible.length === 0 ? (
                            <p className="text-sm text-neutral-500">No eligible package right now.</p>
                          ) : (
                            <div className="space-y-2">
                              {eligibility.eligible.slice(0, 5).map((e) => (
                                <div key={e.package.id} className="flex items-center justify-between rounded-xl border border-app-border p-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-app-text">{e.package.name}</p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                      {e.workspace.name} · {e.provider.email} · {e.score.toFixed(3)}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={!canCancel || detail.order.status === 'cancelled' || forcingPackageId === e.package.id}
                                    onClick={() => void runForceMatch(e.package.id)}
                                    className={cn(
                                      'rounded-xl px-3 py-2 text-xs font-bold',
                                      !canCancel || detail.order.status === 'cancelled'
                                        ? 'cursor-not-allowed bg-neutral-200 text-neutral-500 dark:bg-neutral-800'
                                        : 'bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-neutral-900'
                                    )}
                                  >
                                    {forcingPackageId === e.package.id ? 'Forcing…' : 'Force re-match'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                        {detail.order.status === 'cancelled' ? (
                          <p className="rounded-lg border border-app-border bg-neutral-100 p-2 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            This order is cancelled. Matching is read-only.
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              <footer className="border-t border-app-border p-6">
                <button
                  type="button"
                  disabled={cancelDisabled}
                  onClick={() => {
                    if (!cancelDisabled) setCancelDialogOpen(true);
                  }}
                  className={cn(
                    'w-full rounded-2xl py-3 text-sm font-bold transition-colors',
                    cancelDisabled
                      ? 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-800'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  )}
                >
                  Cancel order…
                </button>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      {cancelDialogOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-app-border bg-app-card p-6 shadow-xl">
            <h3 className="text-lg font-black italic uppercase text-app-text">Cancel this order?</h3>
            <p className="mt-2 text-sm text-neutral-500">
              This sends <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">POST /api/admin/orders/:id/cancel</code> with your reason. This action cannot be undone for orders in a cancellable state.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason (required, min. 5 characters)"
              className="mt-4 min-h-[100px] w-full rounded-xl border border-app-border bg-neutral-50 p-3 text-sm dark:bg-neutral-900"
            />
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={cancelling}
                onClick={() => void runCancel()}
              >
                {cancelling ? 'Cancelling…' : 'Confirm cancel'}
              </button>
              <button
                type="button"
                className="flex-1 rounded-2xl border border-app-border py-3 text-sm font-bold text-neutral-600 dark:text-neutral-300"
                disabled={cancelling}
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelReason('');
                }}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
      <ImageLightbox
        open={!!lightbox}
        src={lightbox?.src ?? null}
        alt={lightbox?.alt ?? ''}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
