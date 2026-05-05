import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FileText, History, LayoutTemplate, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useSoftToast } from '../../../lib/SoftToastContext';
import {
  fetchContractBundle,
  fetchContractTemplates,
  parseMismatchWarnings,
  postApproveContract,
  postContractDraft,
  postDraftFromAi,
  postDraftFromTemplate,
  postRejectContract,
  postSendContract,
  type ContractBundleResponse,
  type ContractVersionDTO,
} from '../../../services/orderContracts';
import { MismatchWarnings } from './MismatchWarnings';
import { ContractViewer } from './ContractViewer';
import { ContractEditor, formToDraftBody, versionToForm, type DraftFormState } from './ContractEditor';
import { VersionTimeline } from './VersionTimeline';

export type ContractPanelProps = {
  orderId: string;
  viewer: 'customer' | 'provider';
  orderStatus: string;
  onContractApproved?: () => void;
};

function sortVersionsAsc(versions: ContractVersionDTO[]) {
  return [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
}

function newestSentVersion(versions: ContractVersionDTO[]): ContractVersionDTO | null {
  const sent = versions.filter((v) => v.status === 'sent');
  if (!sent.length) return null;
  return sent.reduce((a, b) => (a.versionNumber >= b.versionNumber ? a : b));
}

export function ContractPanel({ orderId, viewer, orderStatus, onContractApproved }: ContractPanelProps) {
  const { showToast } = useSoftToast();
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<ContractBundleResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DraftFormState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [approvedBanner, setApprovedBanner] = useState(false);
  const [mobileSeg, setMobileSeg] = useState<'document' | 'timeline'>('document');
  const [modal, setModal] = useState<'reject' | 'request_edit' | null>(null);
  const [note, setNote] = useState('');
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; title: string; description: string }>>([]);
  const [templateId, setTemplateId] = useState<string>('');

  const reload = useCallback(async () => {
    const b = await fetchContractBundle(orderId);
    setBundle(b);
    return b;
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void reload()
      .then((b) => {
        if (cancelled) return;
        const asc = sortVersionsAsc(b.versions);
        if (viewer === 'customer') {
          const ns = newestSentVersion(b.versions);
          const pick = ns?.id ?? b.contract?.currentVersionId ?? asc[asc.length - 1]?.id ?? null;
          setSelectedId(pick);
        } else {
          const last = asc[asc.length - 1];
          setSelectedId(last?.id ?? null);
        }
        if (b.contract?.currentVersion?.status === 'approved') setApprovedBanner(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) showToast(e instanceof Error ? e.message : 'Could not load contract');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, viewer, reload, showToast]);

  useEffect(() => {
    if (viewer !== 'provider') return;
    let cancelled = false;
    void fetchContractTemplates(orderId)
      .then((r) => {
        if (cancelled) return;
        setTemplates(r.templates.map((t) => ({ id: t.id, title: t.title, description: t.description })));
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, viewer]);

  const versionsAsc = useMemo(() => sortVersionsAsc(bundle?.versions ?? []), [bundle?.versions]);
  const selected = useMemo(
    () => versionsAsc.find((v) => v.id === selectedId) ?? null,
    [versionsAsc, selectedId],
  );

  useEffect(() => {
    if (!selectedId || !bundle) {
      if (!selectedId) setForm(null);
      return;
    }
    const v = bundle.versions.find((x) => x.id === selectedId);
    if (!v) {
      setForm(null);
      return;
    }
    setForm(versionToForm(v));
    if (v.status !== 'draft') setEditing(false);
  }, [selectedId, bundle]);

  const canEditSelected = viewer === 'provider' && selected?.status === 'draft';
  const readOnly = !canEditSelected || !editing;

  const heroSent = useMemo(() => newestSentVersion(bundle?.versions ?? []), [bundle?.versions]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const onAiDraft = () =>
    run('ai', async () => {
      await postDraftFromAi(orderId);
      const b = await reload();
      const last = sortVersionsAsc(b.versions).pop();
      if (last) {
        setSelectedId(last.id);
        setEditing(true);
      }
      showToast('Draft generated — review before sending');
    });

  const onTemplateDraft = () =>
    run('template', async () => {
      if (!templateId) {
        showToast('Choose a template first');
        return;
      }
      await postDraftFromTemplate(orderId, templateId);
      const b = await reload();
      const last = sortVersionsAsc(b.versions).pop();
      if (last) {
        setSelectedId(last.id);
        setEditing(true);
      }
      showToast('Draft created from template — review before sending');
    });

  const onSaveDraft = () =>
    run('save', async () => {
      if (!form) return;
      const body = formToDraftBody(form);
      await postContractDraft(orderId, body);
      const b = await reload();
      const asc = sortVersionsAsc(b.versions);
      const last = asc[asc.length - 1];
      if (last) setSelectedId(last.id);
      showToast('Draft saved');
    });

  const onSend = () =>
    run('send', async () => {
      if (!selected) return;
      await postSendContract(orderId, selected.id);
      await reload();
      showToast('Sent to customer');
    });

  const onApprove = () =>
    run('approve', async () => {
      if (!heroSent) return;
      await postApproveContract(orderId, heroSent.id);
      setApprovedBanner(true);
      await reload();
      onContractApproved?.();
      showToast('Contract approved');
    });

  const submitRejectModal = () =>
    run('reject', async () => {
      if (!heroSent) return;
      if (note.trim().length < 10) {
        showToast('Please enter at least 10 characters');
        return;
      }
      await postRejectContract(orderId, heroSent.id, {
        note: note.trim(),
        requestEdit: modal === 'request_edit',
      });
      setModal(null);
      setNote('');
      await reload();
      showToast(modal === 'request_edit' ? 'Edit requested' : 'Contract rejected');
    });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="relative pb-28">
      {approvedBanner ? (
        <div className="mb-4 rounded-xl border border-emerald-400/50 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          Contract approved — this version is locked in as the agreed snapshot.
        </div>
      ) : null}

      <div className="mb-3 flex gap-1 rounded-2xl border border-app-border bg-app-card/80 p-1 md:hidden">
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-black uppercase tracking-wide',
            mobileSeg === 'document' ? 'bg-app-text text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500',
          )}
          onClick={() => setMobileSeg('document')}
        >
          <FileText className="h-4 w-4" aria-hidden />
          Contract
        </button>
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-black uppercase tracking-wide',
            mobileSeg === 'timeline' ? 'bg-app-text text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500',
          )}
          onClick={() => setMobileSeg('timeline')}
        >
          <History className="h-4 w-4" aria-hidden />
          Versions
        </button>
      </div>

      {viewer === 'customer' && bundle?.contract ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-app-border bg-neutral-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
            Status · {(heroSent?.status ?? bundle.contract.currentVersion?.status ?? 'draft').replace(/_/g, ' ')}
          </span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(200px,260px)]">
        <div className={cn('space-y-4', mobileSeg === 'timeline' && 'hidden md:block')}>
          {viewer === 'customer' && heroSent && selected?.id === heroSent.id ? (
            <div className="rounded-2xl border-2 border-sky-400/40 bg-sky-50 px-4 py-3 dark:border-sky-700/50 dark:bg-sky-950/30">
              <p className="text-xs font-black uppercase tracking-widest text-sky-800 dark:text-sky-200">
                Awaiting your decision
              </p>
              <p className="mt-1 text-sm font-semibold text-app-text">Version v{heroSent.versionNumber} is with you for approval.</p>
              {heroSent.status === 'sent' ? (
                <button
                  type="button"
                  className="mt-3 min-h-[44px] w-full rounded-xl border border-sky-700 bg-white px-4 text-sm font-bold text-sky-950 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-50"
                  onClick={() => setReviewSheetOpen(true)}
                >
                  Review contract
                </button>
              ) : null}
            </div>
          ) : null}

          {selected && parseMismatchWarnings(selected.mismatchWarnings).length ? (
            <MismatchWarnings warnings={parseMismatchWarnings(selected.mismatchWarnings)} />
          ) : null}

          {selected ? (
            <>
              {readOnly || !canEditSelected ? (
                <div className="rounded-2xl border border-app-border bg-app-card p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-500">
                      v{selected.versionNumber} · {selected.status}
                    </span>
                    {selected.status !== 'draft' || !canEditSelected ? (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-black uppercase text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                        Read-only
                      </span>
                    ) : null}
                  </div>
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
                </div>
              ) : (
                <div className="rounded-2xl border border-app-border bg-app-card p-4">
                  <ContractEditor form={form!} onChange={setForm} disabled={!!busy} />
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => void onSaveDraft()}
                    className="mt-3 w-full min-h-[48px] rounded-xl bg-neutral-900 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
                  >
                    {busy === 'save' ? 'Saving…' : 'Save draft'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500">No contract versions yet.</p>
          )}
        </div>

        <aside
          className={cn(
            'lg:sticky lg:top-4 lg:self-start',
            mobileSeg === 'document' && 'hidden md:block',
          )}
        >
          <VersionTimeline versionsAsc={versionsAsc} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
      </div>

      {/* Sticky action footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-app-border bg-app-card/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:static md:z-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-0">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 lg:max-w-none">
          {viewer === 'provider' && templates.length ? (
            <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-app-border bg-app-card/80 px-3 py-2">
              <LayoutTemplate className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
              <label className="sr-only" htmlFor={`contract-template-${orderId}`}>
                Contract template
              </label>
              <select
                id={`contract-template-${orderId}`}
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={!!busy || ['draft', 'cancelled'].includes(orderStatus)}
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-app-border bg-app-input px-3 text-sm font-semibold text-app-text disabled:opacity-50"
              >
                <option value="">Template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!!busy || !templateId || ['draft', 'cancelled'].includes(orderStatus)}
                onClick={() => void onTemplateDraft()}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-sky-400 bg-sky-50 px-3 text-xs font-black uppercase tracking-wide text-sky-950 disabled:opacity-50 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100"
              >
                {busy === 'template' ? '…' : 'Use template'}
              </button>
            </div>
          ) : null}
          <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-end gap-2 lg:max-w-none">
          {viewer === 'provider' ? (
            <>
              <button
                type="button"
                disabled={!!busy || ['draft', 'cancelled'].includes(orderStatus)}
                onClick={() => void onAiDraft()}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-violet-50 px-4 text-sm font-bold text-violet-900 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100 md:flex-none"
              >
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                {busy === 'ai' ? '…' : 'Generate draft with AI'}
              </button>
              <button
                type="button"
                disabled={!canEditSelected || !!busy}
                onClick={() => setEditing((e) => !e)}
                className="min-h-[48px] flex-1 rounded-2xl border border-app-border px-4 text-sm font-bold text-app-text disabled:opacity-50 md:flex-none"
              >
                {editing && canEditSelected ? 'Preview' : 'Edit draft'}
              </button>
              <button
                type="button"
                disabled={!selected || selected.status !== 'draft' || !!busy}
                onClick={() => void onSend()}
                className="min-h-[48px] flex-1 rounded-2xl bg-neutral-900 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900 md:flex-none"
              >
                {busy === 'send' ? '…' : 'Send to customer'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={!heroSent || !!busy}
                onClick={() => void onApprove()}
                className="min-h-[48px] flex-1 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50 md:flex-none"
              >
                {busy === 'approve' ? '…' : 'Approve'}
              </button>
              <button
                type="button"
                disabled={!heroSent || !!busy}
                onClick={() => {
                  setModal('reject');
                  setNote('');
                }}
                className="min-h-[48px] flex-1 rounded-2xl border border-red-300 px-4 text-sm font-bold text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-300 md:flex-none"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={!heroSent || !!busy}
                onClick={() => {
                  setModal('request_edit');
                  setNote('');
                }}
                className="min-h-[48px] flex-1 rounded-2xl border border-app-border px-4 text-sm font-bold text-app-text disabled:opacity-50 md:flex-none"
              >
                Request edit
              </button>
            </>
          )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modal ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            <motion.button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="relative w-full max-w-md rounded-3xl border border-app-border bg-app-card p-6 shadow-2xl"
            >
              <h3 className="text-lg font-black text-app-text">
                {modal === 'request_edit' ? 'Request changes' : 'Reject contract'}
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Explain what needs to change (minimum 10 characters). The provider will be notified.
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="mt-3 w-full rounded-2xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                placeholder="Your note…"
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="min-h-[48px] flex-1 rounded-2xl border border-app-border font-bold"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={note.trim().length < 10 || busy === 'reject'}
                  onClick={() => void submitRejectModal()}
                  className="min-h-[48px] flex-1 rounded-2xl bg-neutral-900 font-bold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
                >
                  {busy === 'reject' ? '…' : 'Submit'}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {reviewSheetOpen && viewer === 'customer' && heroSent ? (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
            <motion.button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewSheetOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-app-border bg-app-card p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="contract-review-title"
            >
              <h3 id="contract-review-title" className="text-lg font-black text-app-text">
                Review contract
              </h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Version v{heroSent.versionNumber} · Read-only
              </p>
              <div className="mt-4 rounded-2xl border border-app-border bg-app-card p-4">
                <ContractViewer
                  title={heroSent.title}
                  termsMarkdown={heroSent.termsMarkdown}
                  policiesMarkdown={heroSent.policiesMarkdown}
                  scopeSummary={heroSent.scopeSummary}
                  amount={heroSent.amount}
                  currency={heroSent.currency}
                  startDate={heroSent.startDate}
                  endDate={heroSent.endDate}
                />
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={!!busy}
                  className="min-h-[48px] flex-1 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => {
                    void run('approve', async () => {
                      if (!heroSent) return;
                      await postApproveContract(orderId, heroSent.id);
                      setApprovedBanner(true);
                      await reload();
                      onContractApproved?.();
                      showToast('Contract approved');
                      setReviewSheetOpen(false);
                    });
                  }}
                >
                  {busy === 'approve' ? '…' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  className="min-h-[48px] flex-1 rounded-2xl border border-app-border px-4 text-sm font-bold text-app-text disabled:opacity-50"
                  onClick={() => {
                    setReviewSheetOpen(false);
                    setModal('request_edit');
                    setNote('');
                  }}
                >
                  Request changes
                </button>
                <button
                  type="button"
                  className="min-h-[48px] flex-1 rounded-2xl border border-app-border px-4 text-sm font-bold text-app-text"
                  onClick={() => setReviewSheetOpen(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
