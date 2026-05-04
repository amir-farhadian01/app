import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CircleHelp, FileText, LayoutList, Star, X } from 'lucide-react';
import {
  getOrder,
  cancelOrder,
  normalizePhotos,
  getServiceCatalogSchema,
  getOrderCandidates,
  selectOrderProvider,
  type OrderCandidate,
  type OrderWithSchema,
} from '../services/orders';
import { Step7Review } from '../components/orders/Step7Review';
import { formatScheduleLabel } from '../lib/wizardScheduleLabel';
import type { ScheduleChoice } from '../components/orders/Step2When';
import type { ServiceQuestionnaireV1 } from '@/lib/serviceDefinitionTypes';
import { isServiceQuestionnaireV1 } from '@/lib/serviceDefinitionTypes';
import { cn } from '../lib/utils';
import { useSoftToast } from '../lib/SoftToastContext';
import { OrderChatPanel } from '../components/orders/chat/OrderChatPanel';
import { isOrderChatEnabled } from '../services/orderChat';
import { ContractPanel } from '../components/orders/contracts/ContractPanel';
import { useAuth } from '../lib/AuthContext';
import { createOrderPaymentSession, fetchOrderPaymentStatus, type OrderPaymentStatus } from '../services/orderPayments';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useSoftToast();
  const [order, setOrder] = useState<OrderWithSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [serviceLabel, setServiceLabel] = useState('Service');
  const [categoryBreadcrumbNames, setCategoryBreadcrumbNames] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<OrderCandidate[]>([]);
  const [windowExpiresAt, setWindowExpiresAt] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectingAttemptId, setSelectingAttemptId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [savePriorityTemplate, setSavePriorityTemplate] = useState(false);
  const [weights, setWeights] = useState({ price: 5, distance: 5, rating: 5, responseTime: 5 });
  const [pickModal, setPickModal] = useState<{ attemptId: string; providerName: string; price: string } | null>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'contract'>('details');
  const [paymentStatus, setPaymentStatus] = useState<OrderPaymentStatus | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const o = await getOrder(id);
        setOrder(o);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!order) return;
    if (searchParams.get('tab') !== 'contract') return;
    const show =
      Boolean(order.matchedProviderId) &&
      !['draft', 'cancelled'].includes(order.status) &&
      (user?.id === order.customerId ||
        user?.id === order.matchedProviderId ||
        Boolean(user?.companyId && order.matchedWorkspaceId && user.companyId === order.matchedWorkspaceId));
    if (show) setDetailTab('contract');
  }, [order, searchParams, user?.id, user?.companyId]);

  useEffect(() => {
    if (!order?.serviceCatalogId) return;
    void getServiceCatalogSchema(order.serviceCatalogId)
      .then((r) => {
        setServiceLabel(r.serviceCatalog.name);
        setCategoryBreadcrumbNames(Array.isArray(r.breadcrumbs) ? r.breadcrumbs.map((b) => b.name) : []);
      })
      .catch(() => {
        setServiceLabel('Service');
        setCategoryBreadcrumbNames([]);
      });
  }, [order?.serviceCatalogId]);

  useEffect(() => {
    if (!order?.id || order.status !== 'matching') {
      setCandidates([]);
      setWindowExpiresAt(null);
      setSecondsRemaining(null);
      return;
    }
    let cancelled = false;
    setCandidatesLoading(true);
    void getOrderCandidates(order.id)
      .then((r) => {
        if (cancelled) return;
        setCandidates(r.candidates);
        setWindowExpiresAt(r.windowExpiresAt);
        setSecondsRemaining(r.secondsRemaining);
      })
      .catch(() => {
        if (cancelled) return;
        setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setCandidatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.status, refreshTick]);

  useEffect(() => {
    if (order?.status !== 'matching') return;
    const t = setInterval(() => setRefreshTick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, [order?.status]);

  useEffect(() => {
    if (!order?.id) return;
    let cancelled = false;
    setPaymentLoading(true);
    void fetchOrderPaymentStatus(order.id)
      .then((row) => {
        if (!cancelled) setPaymentStatus(row);
      })
      .catch(() => {
        if (!cancelled) setPaymentStatus(null);
      })
      .finally(() => {
        if (!cancelled) setPaymentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.status]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-2 border-app-border border-t-app-text rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-app-text font-bold">Order not found</p>
        <Link to="/orders" className="text-blue-600 font-bold">
          Back to orders
        </Link>
      </div>
    );
  }

  const schema: ServiceQuestionnaireV1 | null =
    order.schema != null && isServiceQuestionnaireV1(order.schema)
      ? order.schema
      : order.schemaSnapshot != null && isServiceQuestionnaireV1(order.schemaSnapshot)
        ? order.schemaSnapshot
        : null;

  const flex = order.scheduleFlexibility as ScheduleChoice;
  const scheduleLabel = formatScheduleLabel(
    flex === 'asap' || flex === 'this_week' || flex === 'specific' ? flex : 'asap',
    order.scheduledAt,
  );

  const canCancel = order.status === 'draft' || order.status === 'submitted';
  const matchedProviderName =
    [order.matchedSummary?.provider.firstName, order.matchedSummary?.provider.lastName].filter(Boolean).join(' ') ||
    order.matchedSummary?.provider.displayName ||
    null;
  const windowLabel =
    windowExpiresAt != null
      ? new Date(windowExpiresAt).toLocaleString()
      : null;
  const etaLabel = (() => {
    if (secondsRemaining == null) return '—';
    const mins = Math.max(0, Math.floor(secondsRemaining / 60));
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  })();
  const isWindowExpired = secondsRemaining != null && secondsRemaining <= 0;

  const formatMoney = (value: number, currency: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'CAD' }).format(value);

  const isCustomer = user?.id === order.customerId;
  const isMatchedProvider = user?.id === order.matchedProviderId;
  const workspaceAligned =
    Boolean(user?.companyId && order.matchedWorkspaceId && user.companyId === order.matchedWorkspaceId);
  const showContractTab =
    Boolean(order.matchedProviderId) &&
    !['draft', 'cancelled'].includes(order.status) &&
    (isCustomer || isMatchedProvider || workspaceAligned);

  const contractViewerRole: 'customer' | 'provider' = isCustomer ? 'customer' : 'provider';
  const showPaymentCard = isCustomer && ['contracted', 'paid', 'in_progress', 'completed'].includes(order.status);

  return (
    <div
      className={cn(
        'mx-auto space-y-6 pb-24',
        detailTab === 'contract' && showContractTab ? 'max-w-4xl' : 'max-w-2xl',
      )}
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="min-h-[48px] flex items-center gap-2 text-sm font-bold text-neutral-500"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              'rounded-2xl px-4 py-2 font-bold text-[15px]',
              order.status === 'submitted' && 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200',
              order.status === 'draft' && 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200',
              order.status === 'cancelled' && 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
            )}
          >
            Status: {order.status}
          </div>
          {order.phase ? (
            <div
              className={cn(
                'rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-widest',
                order.phase === 'offer' && 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100',
                order.phase === 'order' && 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100',
                order.phase === 'job' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100',
                !['offer', 'order', 'job'].includes(order.phase) &&
                  'border-app-border bg-neutral-500/10 text-neutral-700 dark:text-neutral-200',
              )}
            >
              Phase ·{' '}
              {order.phase === 'offer' ? 'Offer' : order.phase === 'order' ? 'Order' : order.phase === 'job' ? 'Job' : order.phase}
            </div>
          ) : null}
        </div>
        {order.status === 'cancelled' && order.phase ? (
          <p className="text-sm font-semibold text-neutral-500">
            Was:{' '}
            {order.phase === 'offer' ? 'Offer' : order.phase === 'order' ? 'Order' : order.phase === 'job' ? 'Job' : order.phase}
          </p>
        ) : null}
        {order.staleSnapshot ? (
          <p className="text-xs font-medium text-neutral-500">Questionnaire may have changed since submit.</p>
        ) : null}
        {order.status === 'contracted' ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100">
            Job confirmed
          </div>
        ) : null}
        {order.status === 'in_progress' ? (
          <div className="rounded-xl border border-sky-500/30 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 dark:bg-sky-900/20 dark:text-sky-100">
            Job in progress (status transitions are managed manually in this sprint)
          </div>
        ) : null}
        {order.status === 'completed' ? (
          <div className="rounded-xl border border-purple-500/30 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-900 dark:bg-purple-900/20 dark:text-purple-100">
            Job completed
          </div>
        ) : null}
      </div>

      {showContractTab ? (
        <div
          className="sticky top-0 z-20 -mx-1 flex gap-1 rounded-2xl border border-app-border bg-app-card/95 p-1 shadow-sm backdrop-blur-sm"
          role="tablist"
          aria-label="Order views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={detailTab === 'details'}
            className={cn(
              'flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition-colors',
              detailTab === 'details'
                ? 'bg-app-text text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:text-app-text',
            )}
            onClick={() => {
              setDetailTab('details');
              setSearchParams(
                (prev) => {
                  const n = new URLSearchParams(prev);
                  n.delete('tab');
                  return n;
                },
                { replace: true },
              );
            }}
          >
            <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
            Details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={detailTab === 'contract'}
            className={cn(
              'flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition-colors',
              detailTab === 'contract'
                ? 'bg-app-text text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:text-app-text',
            )}
            onClick={() => {
              setDetailTab('contract');
              setSearchParams(
                (prev) => {
                  const n = new URLSearchParams(prev);
                  n.set('tab', 'contract');
                  return n;
                },
                { replace: true },
              );
            }}
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            Contract
          </button>
        </div>
      ) : null}

      {showContractTab && detailTab === 'contract' ? (
        <ContractPanel
          orderId={order.id}
          viewer={contractViewerRole}
          orderStatus={order.status}
          onContractApproved={() => {
            void (async () => {
              try {
                const next = await getOrder(order.id);
                setOrder(next);
              } catch {
                /* ignore */
              }
            })();
          }}
        />
      ) : null}

      {showPaymentCard && !(showContractTab && detailTab === 'contract') ? (
        <section className="rounded-2xl border border-app-border bg-app-card p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Payment</h3>
          {paymentLoading ? (
            <p className="mt-2 text-sm text-neutral-500">Loading payment status…</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                Status:{' '}
                <span className="font-semibold text-app-text">
                  {paymentStatus?.payment?.status ?? 'unpaid'}
                </span>
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Contract must be approved and order contracted before creating a payment session.
              </p>
              {paymentStatus?.payment?.timestamp ? (
                <p className="mt-1 text-xs text-neutral-500">
                  Last update: {new Date(paymentStatus.payment.timestamp).toLocaleString()}
                </p>
              ) : null}
              {paymentStatus?.payment?.status !== 'paid' ? (
                <button
                  type="button"
                  disabled={paymentBusy}
                  onClick={() => {
                    void (async () => {
                      if (!order) return;
                      setPaymentBusy(true);
                      try {
                        const res = await createOrderPaymentSession(order.id);
                        setPaymentStatus(await fetchOrderPaymentStatus(order.id));
                        showToast(`Payment session ready: ${res.session.id.slice(0, 8)}…`);
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : 'Failed to create payment session';
                        showToast(msg);
                      } finally {
                        setPaymentBusy(false);
                      }
                    })();
                  }}
                  className="mt-3 min-h-[44px] rounded-xl bg-neutral-900 px-4 text-sm font-bold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                >
                  {paymentBusy ? 'Creating session…' : 'Create payment session'}
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {!(showContractTab && detailTab === 'contract') && order.matchedProviderId && order.matchedSummary ? (
        <section className="rounded-2xl border border-app-border bg-app-card p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Matched provider</h3>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-black text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
              {String(matchedProviderName ?? 'P').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-app-text">{matchedProviderName ?? 'Provider'}</p>
              <p className="text-xs text-neutral-500">{order.matchedSummary.workspace.name}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-neutral-600 dark:text-neutral-300 sm:grid-cols-2">
            <p>
              Package: <span className="font-semibold text-app-text">{order.matchedSummary.package.name}</span>
            </p>
            <p>
              Estimated price:{' '}
              <span className="font-semibold text-app-text">
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: order.matchedSummary.package.currency || 'CAD',
                }).format(order.matchedSummary.package.finalPrice)}
              </span>
            </p>
            <p>
              Duration:{' '}
              <span className="font-semibold text-app-text">
                {order.matchedSummary.package.durationMinutes != null
                  ? `${order.matchedSummary.package.durationMinutes} min`
                  : '—'}
              </span>
            </p>
            <p>
              Scheduled:{' '}
              <span className="font-semibold text-app-text">
                {order.scheduledAt ? new Date(order.scheduledAt).toLocaleString() : 'Flexible'}
              </span>
            </p>
          </div>
          <p className="mt-2 text-xs text-neutral-500">Provider contact details are hidden until chat launches in Sprint K.</p>
        </section>
      ) : null}

      {!(showContractTab && detailTab === 'contract') && order.status === 'matching' ? (
        <section className="rounded-2xl border border-app-border bg-app-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Choose your provider</h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                Compare providers who accepted your request and pick one for this job.
              </p>
            </div>
            <div className={cn('rounded-full border px-3 py-1 text-xs font-black', isWindowExpired ? 'border-red-300 bg-red-50 text-red-700' : 'border-indigo-300 bg-indigo-50 text-indigo-700')}>
              {etaLabel}
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Window expires: {windowLabel ?? '—'}
          </p>
          {candidatesLoading ? (
            <p className="mt-3 text-sm text-neutral-500">Loading candidates…</p>
          ) : candidates.length === 0 ? (
            <div className="mt-3 rounded-xl border border-app-border p-3 text-sm text-neutral-600">
              {isWindowExpired
                ? 'No providers responded in time. Our team has been notified.'
                : `Waiting for providers to respond. ETA: ${etaLabel}.`}
              {isWindowExpired ? (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="mt-3 block rounded-xl border border-red-300 px-3 py-2 text-red-700"
                >
                  Cancel offer
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {candidates.map((c) => {
                return (
                  <div key={c.attemptId} className="rounded-xl border border-app-border p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-xs font-black text-neutral-700">
                        {c.workspaceLogoUrl ? (
                          <img src={c.workspaceLogoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          c.workspaceName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-app-text">{c.workspaceName} · {c.providerName}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500">
                          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {c.providerRating?.toFixed(1) ?? '—'}</span>
                          {c.distanceKm != null ? <span>{c.distanceKm.toFixed(1)} km</span> : null}
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                      {c.packageName} · {formatMoney(c.packageFinalPrice, c.packageCurrency)} · {c.packageDuration != null ? `${c.packageDuration} min` : '—'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-neutral-500 hover:text-app-text"
                        title={`Score: ${c.score.toFixed(3)}`}
                      >
                        Why this provider? <CircleHelp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="text-blue-600 hover:underline"
                        onClick={() => {
                          if (c.workspaceId) navigate(`/c/${c.workspaceId}`);
                          else showToast('Public profile coming soon');
                        }}
                      >
                        View profile
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={selectingAttemptId === c.attemptId}
                      className="mt-2 min-h-[42px] rounded-xl bg-neutral-900 px-3 text-sm font-bold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                      onClick={() => setPickModal({
                        attemptId: c.attemptId,
                        providerName: c.providerName,
                        price: formatMoney(c.packageFinalPrice, c.packageCurrency),
                      })}
                    >
                      {selectingAttemptId === c.attemptId ? 'Selecting…' : 'Pick this provider'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <details className="mt-4 rounded-xl border border-app-border p-3">
            <summary className="cursor-pointer text-sm font-bold text-app-text">Set my priorities</summary>
            <div className="mt-3 space-y-3">
              {([
                ['price', 'Price'],
                ['distance', 'Distance'],
                ['rating', 'Rating'],
                ['responseTime', 'Response time'],
              ] as const).map(([key, label]) => (
                <label key={key} className="block text-xs text-neutral-600">
                  {label}: <span className="font-bold">{weights[key]}</span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={weights[key]}
                    onChange={(e) =>
                      setWeights((w) => ({ ...w, [key]: Number.parseInt(e.target.value, 10) || 0 }))
                    }
                    className="mt-1 w-full"
                  />
                </label>
              ))}
              <label className="flex items-center gap-2 text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={savePriorityTemplate}
                  onChange={(e) => setSavePriorityTemplate(e.target.checked)}
                />
                Save as default for future orders
              </label>
            </div>
          </details>
        </section>
      ) : null}

      {!(showContractTab && detailTab === 'contract') ? (
        <OrderChatPanel
          orderId={order.id}
          enabled={isOrderChatEnabled({ status: order.status, matchedProviderId: order.matchedProviderId })}
          matchedProviderId={order.matchedProviderId}
          status={order.status}
        />
      ) : null}

      {!(showContractTab && detailTab === 'contract') ? (
      <Step7Review
        serviceName={serviceLabel}
        categoryTrail={categoryBreadcrumbNames}
        bookingMode={undefined}
        scheduleLabel={scheduleLabel}
        address={order.address}
        schema={schema}
        answers={order.answers as Record<string, unknown>}
        description={order.description}
        photos={normalizePhotos(order.photos)}
        readOnly
      />
      ) : null}

      {!(showContractTab && detailTab === 'contract') && canCancel ? (
        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          className="w-full min-h-[48px] rounded-2xl border-2 border-red-200 text-red-700 dark:border-red-900 dark:text-red-300 font-bold text-[15px]"
        >
          Cancel order
        </button>
      ) : null}

      <AnimatePresence>
        {pickModal ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPickModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-app-card border border-app-border rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <h2 className="text-lg font-black text-app-text">
                Pick {pickModal.providerName} for {pickModal.price}?
              </h2>
              <p className="text-sm text-neutral-500">
                Other providers will be notified they were not selected. You can chat with them on this offer only after we ship Chat in a future sprint.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 min-h-[48px] rounded-2xl border border-app-border font-bold"
                  onClick={() => setPickModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectingAttemptId != null}
                  className="flex-1 min-h-[48px] rounded-2xl bg-neutral-900 text-white font-bold disabled:opacity-50"
                  onClick={() => {
                    void (async () => {
                      if (!order) return;
                      setSelectingAttemptId(pickModal.attemptId);
                      try {
                        await selectOrderProvider(order.id, {
                          attemptId: pickModal.attemptId,
                          savePriorityTemplate,
                          ...(savePriorityTemplate
                            ? {
                                priorityTemplate: {
                                  weights: {
                                    price: weights.price,
                                    distance: weights.distance,
                                    rating: weights.rating,
                                    responseRate: weights.responseTime,
                                  },
                                },
                              }
                            : {}),
                        });
                        const next = await getOrder(order.id);
                        setOrder(next);
                        showToast(`Job confirmed with ${pickModal.providerName}`);
                        setPickModal(null);
                      } catch (e) {
                        showToast(e instanceof Error ? e.message : 'Selection failed');
                      } finally {
                        setSelectingAttemptId(null);
                      }
                    })();
                  }}
                >
                  {selectingAttemptId ? 'Picking…' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
        {cancelOpen ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCancelOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-app-card border border-app-border rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-app-text">Cancel this order?</h2>
                <button
                  type="button"
                  className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl text-neutral-500"
                  onClick={() => setCancelOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-500">
                Please tell us why (at least 5 characters). You can book again anytime.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-app-border bg-app-input px-3 py-2 text-[15px] text-app-text"
                placeholder="Reason…"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 min-h-[48px] rounded-2xl border border-app-border font-bold"
                  onClick={() => setCancelOpen(false)}
                >
                  Keep order
                </button>
                <button
                  type="button"
                  disabled={cancelReason.trim().length < 5 || cancelBusy}
                  className="flex-1 min-h-[48px] rounded-2xl bg-red-600 text-white font-bold disabled:opacity-50"
                  onClick={() => {
                    void (async () => {
                      setCancelBusy(true);
                      try {
                        const updated = await cancelOrder(order.id, cancelReason.trim());
                        setOrder((prev) =>
                          prev
                            ? {
                                ...prev,
                                ...updated,
                                schema: prev.schema,
                                staleSnapshot: prev.staleSnapshot,
                              }
                            : null,
                        );
                        setCancelOpen(false);
                      } catch {
                        /* toast optional */
                      } finally {
                        setCancelBusy(false);
                      }
                    })();
                  }}
                >
                  {cancelBusy ? '…' : 'Confirm cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
