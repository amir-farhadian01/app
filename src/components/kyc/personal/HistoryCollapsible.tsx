import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { kycPersonalApi, type PersonalHistoryRow } from './kycPersonalApi';

export function HistoryCollapsible() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PersonalHistoryRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && rows === null) {
      setLoading(true);
      setErr(null);
      try {
        const data = await kycPersonalApi.getPersonalHistory();
        setRows(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-start text-sm font-bold text-app-text"
        aria-expanded={open}
        aria-label="View KYC submission history"
      >
        View history
        {open ? <ChevronUp className="w-4 h-4 shrink-0" aria-hidden /> : <ChevronDown className="w-4 h-4 shrink-0" aria-hidden />}
      </button>
      {open ? (
        <div className="border-t border-app-border px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" aria-label="Loading history" />
            </div>
          ) : err ? (
            <p className="text-xs text-red-600">{err}</p>
          ) : !rows?.length ? (
            <p className="text-xs text-neutral-500">No submissions yet.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="rounded-xl bg-app-bg border border-app-border p-3 text-xs space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="font-black uppercase tracking-wide text-neutral-500">{r.status}</span>
                  <span className="text-neutral-400">{new Date(r.submittedAt).toLocaleString()}</span>
                </div>
                {r.reviewNote ? <p className="text-neutral-600 dark:text-neutral-400">{r.reviewNote}</p> : null}
                {r.reviewerName ? (
                  <p className="text-[10px] text-neutral-400">Reviewer: {r.reviewerName}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
