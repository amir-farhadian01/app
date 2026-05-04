import React from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type KycBannerModel = {
  submissionStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'resubmit_requested';
  reviewedAt?: string | null;
  submittedAt?: string | null;
  reviewNote?: string | null;
  onResubmit?: () => void;
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function StatusBanner({ model }: { model: KycBannerModel }) {
  const { submissionStatus, reviewedAt, submittedAt, reviewNote, onResubmit } = model;

  if (submissionStatus === 'approved') {
    const d = fmtDate(reviewedAt || submittedAt);
    return (
      <div
        className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex gap-3 items-start"
        role="status"
        aria-label="Identity verification approved"
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm font-medium text-app-text">
          Identity verified{d ? ` on ${d}` : ''}.
        </p>
      </div>
    );
  }

  if (submissionStatus === 'pending') {
    return (
      <div
        className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex gap-3 items-start"
        role="status"
        aria-label="KYC under review"
      >
        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm font-medium text-app-text">
          Under review. We aim to respond within 24–48 hours.
        </p>
      </div>
    );
  }

  if (submissionStatus === 'rejected' || submissionStatus === 'resubmit_requested') {
    return (
      <div
        className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 space-y-3"
        role="alert"
        aria-label="KYC action required"
      >
        <div className="flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold text-app-text">
              {submissionStatus === 'resubmit_requested' ? 'Resubmission requested' : 'Verification declined'}
            </p>
            {reviewNote ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">{reviewNote}</p>
            ) : null}
          </div>
        </div>
        {onResubmit ? (
          <button
            type="button"
            onClick={onResubmit}
            className="w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold"
            aria-label="Resubmit identity verification now"
          >
            Resubmit now
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-app-border bg-app-card px-4 py-3 flex gap-3 items-start',
      )}
      role="status"
      aria-label="Identity verification not started"
    >
      <AlertCircle className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" aria-hidden />
      <p className="text-sm font-medium text-app-text">Verify your identity to unlock all features.</p>
    </div>
  );
}
