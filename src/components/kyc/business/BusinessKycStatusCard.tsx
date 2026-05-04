import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardCheck, AlertTriangle } from 'lucide-react';
import type { BusinessSubmissionDto } from './kycBusinessApi';
import type { ExpiryFlagEntry } from '../../../../lib/kycExpiryFlags';
import { cn } from '../../../lib/utils';

const focusRing = 'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

function pillClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'approved') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40';
  if (s === 'pending') return 'bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/40';
  if (s === 'rejected' || s === 'resubmit_requested') return 'bg-red-500/15 text-red-900 dark:text-red-100 border-red-500/40';
  if (s === 'draft') return 'bg-neutral-500/15 text-app-text border-app-border';
  return 'bg-app-bg text-app-text border-app-border';
}

type Props = {
  submission: BusinessSubmissionDto | null;
  schemaVersionLabel?: string | null;
  expiryFlags: Record<string, unknown>;
  inquiryResults: unknown;
  onResubmit?: () => void;
  resubmitBusy?: boolean;
};

export function BusinessKycStatusCard({
  submission,
  schemaVersionLabel,
  expiryFlags,
  inquiryResults,
  onResubmit,
  resubmitBusy,
}: Props) {
  const [inqOpen, setInqOpen] = useState(false);

  const expiryAlerts = useMemo(() => {
    const out: { fieldId: string; msg: string; severe: boolean }[] = [];
    for (const [fieldId, raw] of Object.entries(expiryFlags || {})) {
      if (!raw || typeof raw !== 'object') continue;
      const e = raw as ExpiryFlagEntry;
      if (e.passesThreshold) continue;
      const mo = e.monthsRemaining ?? 0;
      out.push({
        fieldId,
        severe: mo < 1,
        msg: `Field “${fieldId}” expires in ~${mo} month(s) — below the required lead time.`,
      });
    }
    return out;
  }, [expiryFlags]);

  const inqSummary = useMemo(() => {
    if (inquiryResults == null) return null;
    if (typeof inquiryResults !== 'object') return { pass: 0, fail: 0, raw: inquiryResults };
    const o = inquiryResults as Record<string, unknown>;
    if (Array.isArray(o.results)) {
      let pass = 0;
      let fail = 0;
      for (const r of o.results) {
        if (r && typeof r === 'object' && 'ok' in r && (r as { ok?: boolean }).ok) pass++;
        else fail++;
      }
      return { pass, fail, raw: inquiryResults };
    }
    return { pass: 0, fail: 0, raw: inquiryResults };
  }, [inquiryResults]);

  if (!submission) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-card p-4 text-sm text-neutral-500">
        No business KYC submission on file yet.
      </div>
    );
  }

  const st = submission.status;

  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', pillClass(st))}>
          {st.replace('_', ' ')}
        </span>
        {schemaVersionLabel ? (
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Schema v{schemaVersionLabel}</span>
        ) : null}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {submission.submittedAt ? (
          <>
            <dt className="text-neutral-500">Submitted</dt>
            <dd className="font-medium text-app-text">{new Date(submission.submittedAt).toLocaleString()}</dd>
          </>
        ) : null}
        {submission.reviewedAt ? (
          <>
            <dt className="text-neutral-500">Reviewed</dt>
            <dd className="font-medium text-app-text">{new Date(submission.reviewedAt).toLocaleString()}</dd>
          </>
        ) : null}
      </dl>
      {submission.reviewNote ? (
        <p className="text-xs rounded-xl bg-app-bg border border-app-border p-2 text-app-text">
          <span className="font-bold text-neutral-500">Note: </span>
          {submission.reviewNote}
        </p>
      ) : null}

      {expiryAlerts.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Expiry alerts">
          {expiryAlerts.map((a) => (
            <li
              key={a.fieldId}
              className={cn(
                'flex gap-2 text-xs rounded-xl p-2 border',
                a.severe ? 'border-red-500/50 bg-red-500/10 text-red-900 dark:text-red-100' : 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100',
              )}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              {a.msg}
            </li>
          ))}
        </ul>
      ) : null}

      {inqSummary ? (
        <div className="rounded-xl border border-app-border bg-app-bg overflow-hidden">
          <button
            type="button"
            onClick={() => setInqOpen((v) => !v)}
            className={cn('w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-app-text', focusRing)}
            aria-expanded={inqOpen}
            aria-label="Toggle inquiry results"
          >
            <span className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" aria-hidden />
              Inquiry: {inqSummary.pass} pass · {inqSummary.fail} needs review
            </span>
            {inqOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {inqOpen ? (
            <pre className="text-[10px] p-3 overflow-x-auto border-t border-app-border text-neutral-600 dark:text-neutral-400 max-h-48">
              {JSON.stringify(inqSummary.raw, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}

      {st === 'rejected' || st === 'resubmit_requested' ? (
        <button
          type="button"
          disabled={resubmitBusy}
          onClick={onResubmit}
          className={cn(
            'w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50',
            focusRing,
          )}
          aria-label="Resubmit business KYC"
        >
          {resubmitBusy ? 'Working…' : 'Resubmit business KYC'}
        </button>
      ) : null}
    </div>
  );
}
