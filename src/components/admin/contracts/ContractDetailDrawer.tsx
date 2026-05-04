import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AdminContractDetail, AdminContractVersionRow } from '../../../services/adminContracts';
import {
  addContractInternalNote,
  markContractReviewed,
  overrideSupersedeVersion,
} from '../../../services/adminContracts';
import { VersionTimeline } from '../../orders/contracts/VersionTimeline';
import { ContractViewer } from '../../orders/contracts/ContractViewer';
import { MismatchWarnings } from '../../orders/contracts/MismatchWarnings';
import { parseMismatchWarnings } from '../../../services/orderContracts';

type Props = {
  detail: AdminContractDetail | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
};

export function ContractDetailDrawer({ detail, open, loading, onClose, onRefresh }: Props) {
  const [selectedVid, setSelectedVid] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState('');
  const [supersedeTarget, setSupersedeTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const versionsAsc = useMemo(() => {
    if (!detail?.versions?.length) return [];
    return [...detail.versions].sort((a, b) => a.versionNumber - b.versionNumber);
  }, [detail?.versions]);

  useEffect(() => {
    if (!detail?.versions?.length) {
      setSelectedVid(null);
      return;
    }
    const last = [...detail.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
    setSelectedVid(last?.id ?? null);
  }, [detail?.id, detail?.versions]);

  const selected: AdminContractVersionRow | null = useMemo(() => {
    if (!detail || !selectedVid) return null;
    return detail.versions.find((v) => v.id === selectedVid) ?? null;
  }, [detail, selectedVid]);

  const paymentGateUnlocked = detail?.currentVersion?.status === 'approved';

  if (!open) return null;
  if (loading || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-busy="true">
        <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
        <div className="relative flex h-full w-full max-w-md items-center justify-center border-l border-app-border bg-app-card p-8 shadow-xl">
          <p className="text-sm font-semibold text-neutral-500">Loading contract…</p>
        </div>
      </div>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await onRefresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="ctr-drawer-title">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close drawer" onClick={onClose} />
      <div
        className={cn(
          'relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-app-border bg-app-card shadow-xl',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-card px-6 py-4">
          <h2 id="ctr-drawer-title" className="text-sm font-black uppercase tracking-widest text-app-text">
            Contract · order {detail.order.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 p-6 text-sm">
          {err ? <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{err}</p> : null}

          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-xs font-bold',
              paymentGateUnlocked
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
                : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100',
            )}
            role="status"
          >
            {paymentGateUnlocked ? 'Payment gate unlocked' : 'Payment gate locked — contract approval required'}
          </div>

          <div className="grid gap-2 text-xs text-neutral-500 sm:grid-cols-2">
            <p>
              <span className="font-bold uppercase tracking-wider text-neutral-400">Contract ID</span>{' '}
              <span className="font-mono text-app-text">{detail.id}</span>
            </p>
            <p>
              <span className="font-bold uppercase tracking-wider text-neutral-400">Order status</span>{' '}
              <span className="text-app-text">{detail.order.status}</span>
            </p>
            {detail.adminLastReviewAt ? (
              <p className="sm:col-span-2">
                <span className="font-bold uppercase tracking-wider text-neutral-400">Last admin review</span>{' '}
                {new Date(detail.adminLastReviewAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <section>
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">Version history</h3>
            <ol className="space-y-2 rounded-xl border border-app-border bg-neutral-50/50 p-3 dark:bg-neutral-900/40">
              {[...versionsAsc].reverse().map((v) => {
                const who =
                  v.sentBy != null
                    ? [v.sentBy.firstName, v.sentBy.lastName].filter(Boolean).join(' ').trim() ||
                      v.sentBy.displayName?.trim() ||
                      v.sentBy.email
                    : null;
                const ts = v.sentAt ?? v.createdAt;
                return (
                  <li key={v.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-app-border pb-2 text-xs last:border-0 last:pb-0">
                    <span className="font-black text-app-text">v{v.versionNumber}</span>
                    <span className="text-neutral-500">
                      {who ? <>Sent by {who}</> : <>Not sent</>}
                      {ts ? <> · {new Date(ts).toLocaleString()}</> : null}
                    </span>
                    <span className="w-full font-mono text-[10px] uppercase text-neutral-400 sm:w-auto">{v.status}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <VersionTimeline versionsAsc={versionsAsc} selectedId={selectedVid} onSelect={setSelectedVid} />
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Contract body</h3>
              {selected && parseMismatchWarnings(selected.mismatchWarnings).length ? (
                <MismatchWarnings warnings={parseMismatchWarnings(selected.mismatchWarnings)} />
              ) : null}
              {selected ? (
                <ContractViewer
                  title={selected.title}
                  termsMarkdown={selected.termsMarkdown}
                  policiesMarkdown={selected.policiesMarkdown}
                  scopeSummary={selected.scopeSummary}
                  amount={selected.amount}
                  currency={selected.currency}
                  startDate={selected.startDate}
                  endDate={selected.endDate}
                />
              ) : null}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">Events</h3>
            <ul className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-app-border bg-neutral-50/50 p-3 text-xs dark:bg-neutral-900/40">
              {(detail.events ?? []).map((ev) => (
                <li key={ev.id} className="border-b border-app-border pb-2 last:border-0">
                  <div className="flex flex-wrap justify-between gap-1 font-mono text-[10px] text-neutral-400">
                    <span>{new Date(ev.createdAt).toLocaleString()}</span>
                    <span>{ev.actionType}</span>
                  </div>
                  {ev.note ? <p className="mt-1 whitespace-pre-wrap text-app-text">{ev.note}</p> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 rounded-2xl border border-app-border bg-neutral-50/40 p-4 dark:bg-neutral-900/30">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Admin actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await markContractReviewed(detail.id);
                  })
                }
                className="min-h-[44px] rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white disabled:opacity-50 dark:bg-emerald-600"
              >
                Mark Reviewed
              </button>
            </div>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (internalNote.trim().length < 3) return;
                void run(async () => {
                  await addContractInternalNote(detail.id, internalNote.trim());
                  setInternalNote('');
                });
              }}
            >
              <label className="min-w-0 flex-1 text-xs font-bold text-neutral-500">
                Add internal note
                <input
                  type="text"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                  placeholder="At least 3 characters"
                  minLength={3}
                />
              </label>
              <button
                type="submit"
                disabled={busy || internalNote.trim().length < 3}
                className="min-h-[44px] shrink-0 rounded-xl bg-neutral-900 px-4 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
              >
                Add note
              </button>
            </form>
            <div className="space-y-2 border-t border-app-border pt-3">
              <label className="block text-xs font-bold text-neutral-500">
                Override supersede (draft or sent version)
                <select
                  value={supersedeTarget}
                  onChange={(e) => setSupersedeTarget(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                >
                  <option value="">Select version…</option>
                  {detail.versions
                    .filter((v) => v.status === 'draft' || v.status === 'sent')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNumber} · {v.status}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy || !supersedeTarget}
                onClick={() => {
                  if (
                    !window.confirm(
                      'Mark this version as SUPERSEDED? Customers cannot approve a superseded version. This action is logged for audit.',
                    )
                  ) {
                    return;
                  }
                  void run(async () => {
                    await overrideSupersedeVersion(detail.id, supersedeTarget);
                    setSupersedeTarget('');
                  });
                }}
                className="w-full min-h-[44px] rounded-xl border border-amber-500 bg-amber-50 text-xs font-bold text-amber-950 disabled:opacity-50 dark:bg-amber-950/30 dark:text-amber-100"
              >
                Override Supersede
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
