import { motion } from 'motion/react';
import { CheckCircle2, Hourglass, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type Props = {
  orderId?: string;
  /** When true, footer shows View order + Back to Home only (order confirmation route). */
  confirmationRoute?: boolean;
  matchOutcome?: {
    mode: 'auto_matched' | 'round_robin_invited' | 'no_eligible_providers';
    attemptId?: string;
    invitedCount?: number;
    attemptIds?: string[];
    windowExpiresAt?: string | null;
    reason?: string;
  };
  autoMatchExhausted?: boolean;
  matchedSummary?: {
    provider: { displayName: string | null; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null };
    workspace: { name: string };
    package: { finalPrice: number; currency: string };
  } | null;
};

function fmtPrice(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy || 'CAD' }).format(n);
  } catch {
    return `${n} ${ccy}`;
  }
}

export function ConfirmationView({
  orderId,
  confirmationRoute,
  matchOutcome,
  autoMatchExhausted,
  matchedSummary,
}: Props) {
  const navigate = useNavigate();
  const matched = matchOutcome?.mode === 'auto_matched';
  const rrInvited = matchOutcome?.mode === 'round_robin_invited';
  const providerName =
    [matchedSummary?.provider.firstName, matchedSummary?.provider.lastName].filter(Boolean).join(' ') ||
    matchedSummary?.provider.displayName ||
    'a verified provider';

  const rrHours = (() => {
    if (!matchOutcome?.windowExpiresAt) return '24:00';
    const ms = new Date(matchOutcome.windowExpiresAt).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return '00:00';
    const mins = Math.floor(ms / 60000);
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  })();

  return (
    <div className="max-w-lg mx-auto py-12 px-4 text-center space-y-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-24 h-24 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
      >
        {rrInvited ? (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-300">
            <Users className="h-8 w-8" />
            <Hourglass className="h-7 w-7" />
          </div>
        ) : (
          <CheckCircle2 className="w-14 h-14 text-emerald-600 dark:text-emerald-400" />
        )}
      </motion.div>
      <div className="space-y-3">
        <h1 className="text-2xl font-black text-app-text">
          {rrInvited ? `We're inviting up to ${matchOutcome?.invitedCount ?? 0} providers` : 'Order submitted'}
        </h1>
        {matched ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4 text-left dark:bg-emerald-900/20">
            <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">Matched with {providerName}</p>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              Workspace: {matchedSummary?.workspace.name ?? 'Provider workspace'}
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              Estimated price:{' '}
              {matchedSummary?.package
                ? fmtPrice(matchedSummary.package.finalPrice, matchedSummary.package.currency)
                : '—'}
            </p>
          </div>
        ) : rrInvited ? (
          <p className="text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            We&apos;ll notify you as they respond — typically within {rrHours} hours.
          </p>
        ) : autoMatchExhausted ? (
          <p className="text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            We didn&apos;t find an instant match. We&apos;re looking for the right provider - we&apos;ll notify you within hours.
          </p>
        ) : (
          <p className="text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Your offer is open. {matchOutcome?.invitedCount ? `${matchOutcome.invitedCount} provider invitations were sent.` : 'Providers will reach out shortly.'}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate(orderId ? `/orders/${orderId}` : '/orders')}
          className={
            confirmationRoute
              ? 'w-full min-h-[48px] rounded-2xl font-bold text-[15px] text-white'
              : 'w-full min-h-[48px] rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-[15px]'
          }
          style={confirmationRoute ? { backgroundColor: '#01696f' } : undefined}
        >
          {orderId ? (rrInvited ? 'View candidates' : confirmationRoute ? 'View Order' : 'View order') : 'View my orders'}
        </button>
        {confirmationRoute ? (
          <Link
            to="/"
            className="w-full min-h-[48px] inline-flex items-center justify-center rounded-2xl font-bold text-[15px] text-app-text underline-offset-4 hover:underline"
          >
            Back to Home
          </Link>
        ) : (
          <>
            {orderId ? (
              <Link
                to="/orders"
                className="w-full min-h-[48px] inline-flex items-center justify-center rounded-2xl border-2 border-app-border font-bold text-[15px] text-app-text"
              >
                Order history
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/services')}
              className="w-full min-h-[48px] rounded-2xl border-2 border-app-border font-bold text-[15px] text-app-text"
            >
              Browse more services
            </button>
          </>
        )}
      </div>
    </div>
  );
}
