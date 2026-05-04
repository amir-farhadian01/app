import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { OrderWithSchema } from '../../services/orders';

type OrderStatus = OrderWithSchema['status'];

type StepVisual = 'complete' | 'current' | 'future';

type LifecycleKey = 'submitted' | 'matching' | 'accepted' | 'service' | 'completed';

type RenderStep = {
  key: string;
  label: string;
  kind: 'lifecycle' | 'payment';
};

function showServiceRow(status: OrderStatus, phase: string | null | undefined): boolean {
  if (status === 'cancelled') {
    return phase === 'job';
  }
  return ['contracted', 'paid', 'in_progress', 'completed', 'closed'].includes(status);
}

/** Cancelled orders: steps are only complete/future (no current pulse), mirroring prior timeline rules. */
function cancelledLifecycleComplete(
  key: LifecycleKey,
  phase: string | null | undefined,
  submittedAt: string | null | undefined,
  matchedProviderId: string | null | undefined,
  showService: boolean,
): boolean {
  const p = phase ?? 'offer';
  if (key === 'submitted') return Boolean(submittedAt);
  if (key === 'matching') return p === 'order' || p === 'job';
  if (key === 'accepted') return Boolean(matchedProviderId && (p === 'order' || p === 'job'));
  if (key === 'service') return showService && p === 'job';
  if (key === 'completed') return false;
  return false;
}

type Progress = { completeBefore: number; currentIdx: number };

function lifecycleProgress(status: OrderStatus, showService: boolean): Progress | null {
  if (status === 'cancelled') return null;

  const n = showService ? 5 : 4;

  if (status === 'draft') {
    return { completeBefore: 0, currentIdx: 0 };
  }
  if (status === 'submitted' || status === 'matching') {
    return { completeBefore: 1, currentIdx: 1 };
  }
  if (status === 'matched') {
    return { completeBefore: 2, currentIdx: 2 };
  }
  if (status === 'contracted' || status === 'paid' || status === 'in_progress') {
    if (!showService) {
      return { completeBefore: 2, currentIdx: 2 };
    }
    return { completeBefore: 3, currentIdx: 3 };
  }
  if (status === 'completed' || status === 'closed') {
    return { completeBefore: n, currentIdx: -1 };
  }

  return { completeBefore: 0, currentIdx: 0 };
}

function TimelineDot({ state }: { state: StepVisual }) {
  if (state === 'complete') {
    return (
      <div
        className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
        aria-hidden
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </div>
    );
  }
  if (state === 'current') {
    return (
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden>
        <span className="order-timeline-pulse-ring pointer-events-none absolute inline-flex h-7 w-7 rounded-full bg-sky-500/40 dark:bg-sky-400/35" />
        <span className="relative z-10 h-3.5 w-3.5 rounded-full border-[3px] border-sky-600 bg-app-card dark:border-sky-300" />
      </div>
    );
  }
  return (
    <div
      className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 bg-transparent dark:border-neutral-600"
      aria-hidden
    />
  );
}

export function OrderStatusTimeline({ order }: { order: OrderWithSchema }) {
  const status = order.status as OrderStatus;
  const cancelled = status === 'cancelled';
  const showService = showServiceRow(status, order.phase);
  const progress = lifecycleProgress(status, showService);

  const lifecycleDefs: { key: LifecycleKey; label: string }[] = [
    { key: 'submitted', label: 'Order Submitted' },
    { key: 'matching', label: 'Matching / Provider Invited' },
    { key: 'accepted', label: 'Provider Accepted' },
  ];
  if (showService) {
    lifecycleDefs.push({ key: 'service', label: 'Service In Progress' });
  }
  lifecycleDefs.push({ key: 'completed', label: 'Completed' });

  const lifecycleKeys = lifecycleDefs.map((s) => s.key);

  const steps: RenderStep[] = [
    ...lifecycleDefs.map((s) => ({ ...s, kind: 'lifecycle' as const })),
    { key: 'payment', label: 'Payment — coming soon', kind: 'payment' },
  ];

  const visualForLifecycle = (i: number): StepVisual => {
    if (cancelled) {
      const key = lifecycleKeys[i];
      if (!key) return 'future';
      const done = cancelledLifecycleComplete(
        key,
        order.phase,
        order.submittedAt,
        order.matchedProviderId,
        showService,
      );
      return done ? 'complete' : 'future';
    }
    if (!progress) return 'future';
    const { completeBefore, currentIdx } = progress;
    if (i < completeBefore) return 'complete';
    if (currentIdx >= 0 && i === currentIdx) return 'current';
    return 'future';
  };

  return (
    <section
      className="rounded-2xl border border-app-border bg-app-card p-4"
      aria-label="Order status timeline"
    >
      <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Progress</h3>
      {cancelled ? (
        <p className="mt-2 text-xs font-semibold text-neutral-500">This order was cancelled.</p>
      ) : null}
      <ol className="mt-4 space-y-0">
        {steps.map((step, idx) => {
          const isPayment = step.kind === 'payment';
          const lifecycleIndex = isPayment ? -1 : idx;
          const state: StepVisual = isPayment
            ? 'future'
            : visualForLifecycle(lifecycleIndex);
          const isLast = idx === steps.length - 1;
          const lineSolid =
            !isLast && !isPayment && visualForLifecycle(idx) === 'complete';

          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <TimelineDot state={state} />
                {!isLast ? (
                  <div
                    className={cn(
                      'my-1 min-h-[14px] w-px flex-1',
                      lineSolid ? 'bg-neutral-900/30 dark:bg-white/30' : 'bg-neutral-200 dark:bg-neutral-700',
                    )}
                    aria-hidden
                  />
                ) : null}
              </div>
              <div className={cn('min-w-0 flex-1 pb-6', isLast && 'pb-0')}>
                <p
                  className={cn(
                    'text-sm font-bold leading-snug',
                    state === 'future' ? 'text-neutral-400 dark:text-neutral-500' : 'text-app-text',
                  )}
                >
                  {step.label}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
