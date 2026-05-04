import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  acknowledgeLevel0,
  getBusiness,
  getPersonal,
  listAudit,
  reviewBusiness,
  reviewPersonal,
  runBusinessInquiries,
  type BusinessDetail,
  type KycAuditRow,
  type Level0Row,
  type PersonalDetail,
} from '../../../services/adminKyc';
import type { ReviewAction } from '../../../services/adminKyc';
import { analyzeKycDocuments } from '../../../services/geminiService';
import { imageUrlToBase64DataUrl } from '../../../lib/imageToBase64';
import { resolveMediaUrl } from '../../../lib/resolveMediaUrl';
import type { BusinessKycFieldDef, BusinessKycFormV1 } from '../../../../lib/kycTypes';
import { KycStatusBadge } from './KycStatusBadge';
import { AiVerdictCard } from './AiVerdictCard';
import { ReviewActionBar } from './ReviewActionBar';
import { ImageLightbox } from './ImageLightbox';

export type DrawerPayload =
  | { kind: 'level0'; userId: string; snapshot: Level0Row }
  | { kind: 'personal'; id: string }
  | { kind: 'business'; id: string };

type InnerTab = 'overview' | 'documents' | 'analysis' | 'inquiries' | 'audit';

/** @deprecated use resolveMediaUrl — kept name for minimal diff in links */
function toAbsUrl(url: string): string {
  return resolveMediaUrl(url);
}

function KycDocThumb({
  src,
  alt,
  onOpen,
  className,
  compact,
}: {
  src: string;
  alt: string;
  onOpen: () => void;
  className?: string;
  /** Small thumbnail (e.g. business answer grid) */
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const href = resolveMediaUrl(src);
  if (!href) {
    return <p className="text-xs text-neutral-500">No file URL</p>;
  }
  return (
    <div className={cn('rounded-xl border border-app-border bg-app-bg overflow-hidden', className)}>
      {failed ? (
        <div className={cn('text-center space-y-2', compact ? 'p-2' : 'p-4')}>
          <p className="text-[10px] text-amber-700 dark:text-amber-300">Unavailable</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 justify-center"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </a>
        </div>
      ) : (
        <button type="button" className="block w-full" onClick={onOpen} aria-label={`Open preview ${alt}`}>
          <img
            src={href}
            alt=""
            className={cn(
              'w-full bg-neutral-100 dark:bg-neutral-900',
              compact ? 'h-20 object-cover' : 'max-h-64 object-contain',
            )}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </button>
      )}
    </div>
  );
}

function parseUploads(raw: unknown): Array<{ fieldId: string; url: string; fileName?: string; mimeType?: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === 'object' && 'fieldId' in x && 'url' in x) as Array<{
    fieldId: string;
    url: string;
    fileName?: string;
    mimeType?: string;
  }>;
}

function formatFieldAnswer(field: BusinessKycFieldDef, value: unknown, uploads: ReturnType<typeof parseUploads>): React.ReactNode {
  if (value === undefined || value === null) return <span className="text-neutral-400">—</span>;
  if (field.type === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (field.type === 'select' && field.options) {
    const v = String(value);
    const opt = field.options.find((o) => o.value === v);
    return <span>{opt?.label ?? v}</span>;
  }
  if (field.type === 'multiselect' && field.options && Array.isArray(value)) {
    return (
      <span>
        {(value as string[])
          .map((v) => field.options!.find((o) => o.value === v)?.label ?? v)
          .join(', ')}
      </span>
    );
  }
  if (field.type === 'file') {
    const files = uploads.filter((u) => u.fieldId === field.id);
    if (!files.length) return <span className="text-neutral-400">No file</span>;
    return (
      <ul className="space-y-1">
        {files.map((f) => (
          <li key={f.url}>
            <a
              href={toAbsUrl(f.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 text-xs font-semibold inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {f.fileName || 'File'}
            </a>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') return <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(value, null, 2)}</pre>;
  return <span className="break-words">{String(value)}</span>;
}

export function KycReviewDrawer({
  open,
  onClose,
  onActionComplete,
}: {
  open: DrawerPayload | null;
  onClose: () => void;
  onActionComplete: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<InnerTab>('overview');
  const [auditRows, setAuditRows] = useState<KycAuditRow[]>([]);
  const [personal, setPersonal] = useState<PersonalDetail | null>(null);
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [localAi, setLocalAi] = useState<PersonalDetail['aiAnalysis'] | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [ackNote, setAckNote] = useState('');
  const [showAckModal, setShowAckModal] = useState(false);

  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  const load = useCallback(async () => {
    if (!open) return;
    setErr(null);
    setLoading(true);
    setLocalAi(null);
    try {
      if (open.kind === 'level0') {
        const res = await listAudit({ submissionType: 'level0', submissionId: open.userId, pageSize: 100 });
        setAuditRows(res.rows);
        setPersonal(null);
        setBusiness(null);
      } else if (open.kind === 'personal') {
        const p = await getPersonal(open.id);
        setPersonal(p);
        setLocalAi(p.aiAnalysis);
        setAuditRows([...p.auditHistory].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        setBusiness(null);
      } else {
        const b = await getBusiness(open.id);
        setBusiness(b);
        setPersonal(null);
        setAuditRows(
          [...b.auditHistory].sort((a, c) => new Date(a.createdAt).getTime() - new Date(c.createdAt).getTime()),
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTab('overview');
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const focusables = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusables[0]?.focus();
  }, [open, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const profileName = (u: { displayName?: string | null; firstName?: string | null; lastName?: string | null }) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ') || u.displayName || '';

  const aiForDisplay = personal ? localAi ?? personal.aiAnalysis : null;

  const runClientAnalysis = async () => {
    if (!personal) return;
    setAnalysisBusy(true);
    setErr(null);
    try {
      const parts: { mimeType: string; data: string }[] = [];
      const front = await imageUrlToBase64DataUrl(personal.idFrontUrl);
      parts.push({ mimeType: front.mimeType, data: front.data });
      if (personal.idBackUrl) {
        const back = await imageUrlToBase64DataUrl(personal.idBackUrl);
        parts.push({ mimeType: back.mimeType, data: back.data });
      }
      const selfie = await imageUrlToBase64DataUrl(personal.selfieUrl);
      parts.push({ mimeType: selfie.mimeType, data: selfie.data });
      const name = profileName(personal.user);
      const result = await analyzeKycDocuments(parts, name);
      setLocalAi(result);
      setTab('analysis');
      /* Persist: backend PATCH for aiAnalysis not in scope for this prompt — see PROMPT follow-up */
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalysisBusy(false);
    }
  };

  const onReviewPersonal = async (action: ReviewAction, note: string) => {
    if (!personal) return;
    await reviewPersonal(personal.id, action, note);
    onActionComplete();
    onClose();
  };

  const onReviewBusiness = async (action: ReviewAction, note: string) => {
    if (!business) return;
    await reviewBusiness(business.id, action, note);
    onActionComplete();
    onClose();
  };

  const onRunInquiries = async () => {
    if (!business) return;
    setInquiryBusy(true);
    setErr(null);
    try {
      await runBusinessInquiries(business.id);
      const b = await getBusiness(business.id);
      setBusiness(b);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Inquiries failed');
    } finally {
      setInquiryBusy(false);
    }
  };

  const renderBusinessAnswers = (b: BusinessDetail) => {
    const schema = b.resolvedSchema;
    if (!schema) return <p className="text-sm text-neutral-500">Schema not found for this version.</p>;
    const uploads = parseUploads(b.uploads);
    const answers = (b.answers && typeof b.answers === 'object' ? b.answers : {}) as Record<string, unknown>;
    const fields = [...schema.fields].sort((a, c) => a.order - c.order);
    return (
      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.id} className="rounded-xl border border-app-border p-3 bg-app-bg/50">
            <div className="flex justify-between gap-2">
              <span className="text-xs font-bold text-app-text">{f.label}</span>
              <span className="text-[10px] uppercase text-neutral-400">{f.type}</span>
            </div>
            <div className="mt-2 text-sm">{formatFieldAnswer(f, answers[f.id], uploads)}</div>
            {f.type === 'file' &&
            parseUploads(b.uploads).some((u) => u.fieldId === f.id && (u.mimeType || '').startsWith('image/')) ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {parseUploads(b.uploads)
                  .filter((u) => u.fieldId === f.id && (u.mimeType || '').startsWith('image/'))
                  .map((u) => (
                    <KycDocThumb
                      key={u.url}
                      src={u.url}
                      alt={f.label}
                      compact
                      className="inline-block w-auto max-w-[120px]"
                      onOpen={() => setLightbox({ src: resolveMediaUrl(u.url), alt: f.label })}
                    />
                  ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderInquiriesExpiry = (b: BusinessDetail, form: BusinessKycFormV1 | null) => {
    const flags = b.expiryFlags || {};
    const results = (b.inquiryResults && typeof b.inquiryResults === 'object' ? b.inquiryResults : {}) as Record<
      string,
      { success?: boolean; raw?: unknown; checkedAt?: string; expiresAt?: string }
    >;
    const inqFields = form?.fields.filter((f) => f.inquiry) ?? [];
    return (
      <div className="space-y-4">
        <button
          type="button"
          disabled={inquiryBusy}
          onClick={() => void onRunInquiries()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold disabled:opacity-50"
          aria-label="Run inquiries now"
        >
          {inquiryBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Run inquiries now
        </button>

        <div className="rounded-xl border border-app-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-app-bg">
              <tr>
                <th className="text-left p-2 font-black uppercase text-neutral-500">Field</th>
                <th className="text-left p-2 font-black uppercase text-neutral-500">Success</th>
                <th className="text-left p-2 font-black uppercase text-neutral-500">Checked</th>
                <th className="text-left p-2 font-black uppercase text-neutral-500">Raw</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {inqFields.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-neutral-500">
                    No inquiry fields in schema.
                  </td>
                </tr>
              ) : (
                inqFields.map((f) => {
                  const r = results[f.id];
                  return (
                    <tr key={f.id}>
                      <td className="p-2 font-semibold text-app-text">{f.label}</td>
                      <td className="p-2">{r ? (r.success ? '✓' : '✗') : '—'}</td>
                      <td className="p-2 text-neutral-500">{r?.checkedAt ? new Date(r.checkedAt).toLocaleString() : '—'}</td>
                      <td className="p-2 max-w-[200px]">
                        {r?.raw != null ? (
                          <details>
                            <summary className="cursor-pointer text-blue-600 dark:text-blue-400">JSON</summary>
                            <pre className="mt-1 text-[10px] overflow-auto max-h-24">{JSON.stringify(r.raw, null, 2)}</pre>
                          </details>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <h4 className="text-xs font-black uppercase text-neutral-400">Expiry checks</h4>
        <ul className="space-y-2">
          {Object.entries(flags).map(([fieldId, fl]) => {
            const ok = fl.passesThreshold;
            return (
              <li
                key={fieldId}
                className={cn(
                  'rounded-lg border p-2 text-xs',
                  ok ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800' : 'border-amber-300 bg-amber-50/80 dark:border-amber-700',
                )}
              >
                <span className="font-bold text-app-text">{fieldId}</span>
                <span className="text-neutral-600 dark:text-neutral-400 ml-2">
                  {fl.monthsRemaining} mo. remaining · {ok ? 'Passes threshold' : 'Below threshold'}
                </span>
              </li>
            );
          })}
          {Object.keys(flags).length === 0 ? <li className="text-neutral-500 text-xs">No computed expiry flags.</li> : null}
        </ul>
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="KYC review"
            initial={{ x: rtl ? -400 : 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: rtl ? -400 : 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'fixed top-0 z-[150] h-full w-full max-w-[560px] border-app-border bg-app-card shadow-2xl flex flex-col',
              rtl ? 'left-0 border-r' : 'right-0 border-l',
            )}
          >
            <div className="flex items-center justify-between p-4 border-b border-app-border shrink-0">
              <div>
                <h2 className="text-lg font-black text-app-text uppercase tracking-tight">
                  {open.kind === 'level0' && 'Level 0'}
                  {open.kind === 'personal' && 'Personal KYC'}
                  {open.kind === 'business' && 'Business KYC'}
                </h2>
                <p className="text-[10px] text-neutral-400 font-mono truncate max-w-[240px]">
                  {open.kind === 'level0' ? open.userId : open.id}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-app-bg text-app-text"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(open.kind === 'level0' || open.kind === 'personal' || open.kind === 'business') && (
              <div className="flex gap-1 px-2 pt-2 border-b border-app-border overflow-x-auto shrink-0">
                {(
                  open.kind === 'level0'
                    ? ([
                        ['overview', 'Overview'],
                        ['audit', 'Audit'],
                      ] as [InnerTab, string][])
                    : ([
                        ['overview', 'Overview'],
                        open.kind === 'personal' ? ['documents', 'Documents'] : null,
                        open.kind === 'personal' ? ['analysis', 'AI Analysis'] : null,
                        open.kind === 'business' ? ['documents', 'Answers'] : null,
                        open.kind === 'business' ? ['inquiries', 'Inquiries & Expiry'] : null,
                        ['audit', 'Audit'],
                      ].filter(Boolean) as [InnerTab, string][])
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      'px-3 py-2 text-xs font-bold rounded-t-lg whitespace-nowrap',
                      tab === id
                        ? 'bg-app-bg text-app-text border border-b-0 border-app-border'
                        : 'text-neutral-500 hover:text-app-text',
                    )}
                    aria-label={`Tab ${label}`}
                    aria-current={tab === id ? 'true' : undefined}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-neutral-400" aria-label="Loading" />
                </div>
              ) : err ? (
                <p className="text-red-600 text-sm">{err}</p>
              ) : open.kind === 'level0' ? (
                <>
                  {tab === 'overview' && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-app-border p-4 space-y-2">
                        <p className="text-xs font-black uppercase text-neutral-400">User</p>
                        <p className="font-bold text-app-text">{open.snapshot.user.displayName || open.snapshot.user.email}</p>
                        <p className="text-xs text-neutral-500">{open.snapshot.user.email}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span>Email: {open.snapshot.emailVerified ? '✓' : '✗'}</span>
                          <span>Phone: {open.snapshot.phoneVerified ? '✓' : '✗'}</span>
                          <span>Addr: {open.snapshot.address ? '✓' : '✗'}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAckModal(true)}
                        className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black uppercase"
                        aria-label="Acknowledge level 0"
                      >
                        Acknowledge
                      </button>
                    </div>
                  )}
                  {tab === 'audit' && (
                    <ul className="space-y-2 text-xs">
                      {auditRows.map((a) => (
                        <li key={a.id} className="border border-app-border rounded-lg p-2">
                          <span className="text-neutral-500">{new Date(a.createdAt).toLocaleString()}</span>
                          <span className="mx-2">{a.fromStatus ?? '∅'} → {a.toStatus}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : open.kind === 'personal' && personal ? (
                <>
                  {tab === 'overview' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <KycStatusBadge status={personal.status} />
                        <span className="text-xs text-neutral-500">{new Date(personal.submittedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm">
                        <span className="text-neutral-500">Declared: </span>
                        <span className="font-bold">{personal.declaredLegalName}</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg border border-app-border p-2">
                          <p className="text-[10px] text-neutral-400 uppercase">Email</p>
                          <p className="font-medium">{personal.user.email}</p>
                        </div>
                        <div className="rounded-lg border border-app-border p-2">
                          <p className="text-[10px] text-neutral-400 uppercase">Phone</p>
                          <p className="font-medium">{personal.user.phone || '—'}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-app-border p-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-neutral-400 uppercase">Declared ↔ OCR</p>
                          <p className="font-semibold">{personal.declaredLegalName}</p>
                          <p className="text-sm text-neutral-600">{aiForDisplay?.ocrName ?? '—'}</p>
                        </div>
                        {aiForDisplay ? (
                          <span
                            className={cn(
                              'text-xs font-bold px-2 py-1 rounded',
                              aiForDisplay.nameMatchesProfile
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800',
                            )}
                          >
                            {aiForDisplay.nameMatchesProfile ? 'Match' : 'Mismatch'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {tab === 'documents' && (
                    <div className="space-y-6">
                      {[
                        { label: 'ID front', url: personal.idFrontUrl },
                        personal.idBackUrl ? { label: 'ID back', url: personal.idBackUrl } : null,
                        { label: 'Selfie', url: personal.selfieUrl },
                      ]
                        .filter(Boolean)
                        .map((item) => (
                          <div key={item!.label} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{item!.label}</span>
                              <div className="flex items-center gap-2">
                                {aiForDisplay ? (
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                      aiForDisplay.isLikelyFraud || aiForDisplay.isEdited || aiForDisplay.isInternetDownloaded
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/50'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50',
                                    )}
                                  >
                                    {aiForDisplay.isLikelyFraud || aiForDisplay.isEdited || aiForDisplay.isInternetDownloaded
                                      ? 'AI flags'
                                      : 'AI clean'}
                                  </span>
                                ) : null}
                                <a
                                  href={toAbsUrl(item!.url)}
                                  download
                                  className="p-1 rounded hover:bg-app-bg"
                                  aria-label={`Download ${item!.label}`}
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                            <KycDocThumb
                              key={item!.url}
                              src={item!.url}
                              alt={item!.label}
                              onOpen={() => setLightbox({ src: resolveMediaUrl(item!.url), alt: item!.label })}
                            />
                          </div>
                        ))}
                    </div>
                  )}
                  {tab === 'analysis' && (
                    <div className="space-y-4">
                      {aiForDisplay ? (
                        <AiVerdictCard analysis={aiForDisplay} profileName={profileName(personal.user)} />
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-neutral-500">No AI analysis stored for this submission.</p>
                          <button
                            type="button"
                            disabled={analysisBusy}
                            onClick={() => void runClientAnalysis()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-app-border text-xs font-bold disabled:opacity-50"
                            aria-label="Run analysis now"
                          >
                            {analysisBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Run analysis now
                          </button>
                          <p className="text-[10px] text-amber-700 dark:text-amber-300">
                            TODO: Persist `aiAnalysis` via admin API when PATCH is available (currently UI-only).
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {tab === 'audit' && (
                    <ul className="space-y-2 text-xs">
                      {auditRows.map((a) => (
                        <li key={a.id} className="border border-app-border rounded-lg p-2">
                          <div className="text-neutral-500">{new Date(a.createdAt).toLocaleString()}</div>
                          <div>
                            {a.fromStatus ?? '∅'} → <strong>{a.toStatus}</strong>
                          </div>
                          {a.note ? <p className="text-neutral-600 mt-1">{a.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : open.kind === 'business' && business ? (
                <>
                  {tab === 'overview' && (
                    <div className="space-y-3">
                      <KycStatusBadge status={business.status} />
                      <p className="text-xs text-neutral-500">Submitted {new Date(business.submittedAt).toLocaleString()}</p>
                      <span className="inline-block text-[10px] font-bold px-2 py-1 rounded bg-app-bg border border-app-border">
                        Schema v{business.schemaVersion}
                      </span>
                      <div className="rounded-xl border border-app-border p-3 text-sm">
                        <p className="text-[10px] uppercase text-neutral-400">User</p>
                        <p className="font-semibold">{business.user.displayName || business.user.email}</p>
                        <p className="text-xs text-neutral-500">{business.user.email}</p>
                      </div>
                      {business.company ? (
                        <div className="rounded-xl border border-app-border p-3 text-sm">
                          <p className="text-[10px] uppercase text-neutral-400">Company</p>
                          <p className="font-semibold">{business.company.name}</p>
                          <p className="text-xs">KYC: {business.company.kycStatus}</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                  {tab === 'documents' && renderBusinessAnswers(business)}
                  {tab === 'inquiries' && renderInquiriesExpiry(business, business.resolvedSchema)}
                  {tab === 'audit' && (
                    <ul className="space-y-2 text-xs">
                      {auditRows.map((a) => (
                        <li key={a.id} className="border border-app-border rounded-lg p-2">
                          <div className="text-neutral-500">{new Date(a.createdAt).toLocaleString()}</div>
                          <div>
                            {a.fromStatus ?? '∅'} → <strong>{a.toStatus}</strong>
                          </div>
                          {a.note ? <p className="text-neutral-600 mt-1">{a.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
            </div>

            {open.kind === 'personal' && personal && (personal.status === 'pending' || personal.status === 'resubmit_requested') ? (
              <ReviewActionBar onReview={onReviewPersonal} />
            ) : null}
            {open.kind === 'business' && business && (business.status === 'pending' || business.status === 'resubmit_requested') ? (
              <ReviewActionBar onReview={onReviewBusiness} />
            ) : null}

            {showAckModal && open?.kind === 'level0' ? (
              <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
                <div className="bg-app-card border border-app-border rounded-2xl p-6 max-w-md w-full space-y-4">
                  <h4 className="font-bold text-app-text">Acknowledge Level 0</h4>
                  <textarea
                    value={ackNote}
                    onChange={(e) => setAckNote(e.target.value)}
                    className="w-full rounded-xl border border-app-border bg-app-bg p-2 text-sm"
                    rows={3}
                    placeholder="Optional note"
                    aria-label="Acknowledgement note"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl border border-app-border text-sm font-bold"
                      onClick={() => setShowAckModal(false)}
                      aria-label="Cancel acknowledge"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold"
                      onClick={async () => {
                        await acknowledgeLevel0(open.userId, ackNote);
                        setShowAckModal(false);
                        onActionComplete();
                        onClose();
                      }}
                      aria-label="Submit acknowledge"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <ImageLightbox
        open={!!lightbox}
        src={lightbox?.src ?? null}
        alt={lightbox?.alt ?? ''}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
