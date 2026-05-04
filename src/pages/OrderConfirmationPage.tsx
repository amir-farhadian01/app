import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ConfirmationView } from '../components/orders/ConfirmationView';
import { getOrder, getServiceCatalogSchema } from '../services/orders';
import { formatScheduleLabel } from '../lib/wizardScheduleLabel';
import type { ScheduleChoice } from '../components/orders/Step2When';

export type OrderConfirmationLocationState = {
  matchOutcome?: {
    mode: 'auto_matched' | 'round_robin_invited' | 'no_eligible_providers';
    attemptId?: string;
    invitedCount?: number;
    attemptIds?: string[];
    windowExpiresAt?: string | null;
    reason?: string;
  };
  matchedSummary?: {
    provider: { displayName: string | null; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null };
    workspace: { name: string };
    package: { finalPrice: number; currency: string };
  } | null;
  autoMatchExhausted?: boolean;
  headlineServiceName?: string;
  scheduleLabel?: string;
  bookingSummary?: string;
};

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation() as { state?: OrderConfirmationLocationState | null };
  const [serviceName, setServiceName] = useState(state?.headlineServiceName ?? '');
  const [scheduleLine, setScheduleLine] = useState(state?.scheduleLabel ?? '');
  const [bookingExtra, setBookingExtra] = useState(state?.bookingSummary ?? '');
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id?.trim()) return;
    if (serviceName && scheduleLine) return;
    let cancelled = false;
    void (async () => {
      try {
        const o = await getOrder(id);
        if (cancelled) return;
        if (!serviceName) {
          try {
            const r = await getServiceCatalogSchema(o.serviceCatalogId);
            if (!cancelled) setServiceName(r.serviceCatalog.name || 'Service');
          } catch {
            if (!cancelled) setServiceName('Service');
          }
        }
        if (!scheduleLine) {
          const flex = o.scheduleFlexibility as ScheduleChoice;
          setScheduleLine(
            formatScheduleLabel(
              flex === 'asap' || flex === 'this_week' || flex === 'specific' ? flex : 'asap',
              o.scheduledAt,
            ),
          );
        }
      } catch (e: unknown) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Could not load order');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, serviceName, scheduleLine]);

  if (!id?.trim()) {
    return <Navigate to="/orders" replace />;
  }

  if (loadErr) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 space-y-4 text-center">
        <p className="text-red-600 font-bold">{loadErr}</p>
        <Link to="/orders" className="font-bold text-[#01696f] underline">
          View my orders
        </Link>
      </div>
    );
  }

  const bookingBlock = [scheduleLine, bookingExtra?.trim() || null].filter(Boolean).join('\n\n');

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-4 space-y-6">
      <div className="rounded-2xl border border-app-border bg-app-card p-4 text-left space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Order</p>
        <p className="text-[15px] font-mono text-app-text break-all">{id}</p>
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400 pt-2">Service</p>
        <p className="text-[15px] text-app-text">{serviceName || '…'}</p>
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400 pt-2">Booking</p>
        <p className="text-[15px] text-app-text whitespace-pre-wrap">{bookingBlock || '…'}</p>
      </div>

      <ConfirmationView
        orderId={id}
        confirmationRoute
        matchOutcome={state?.matchOutcome}
        matchedSummary={state?.matchedSummary ?? null}
        autoMatchExhausted={state?.autoMatchExhausted}
      />
    </div>
  );
}
