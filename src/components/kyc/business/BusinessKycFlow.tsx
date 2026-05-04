import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BusinessKycFormRenderer, type RemoteFileEntry } from '../BusinessKycFormRenderer';
import { validateBusinessKycAnswers, type BusinessKycUploadRow } from '../../../../lib/kycBusinessValidate';
import { isBusinessKycFormV1, type BusinessKycFormV1 } from '../../../../lib/kycTypes';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import {
  kycBusinessApi,
  postBusinessSubmit,
  type BusinessMeResponse,
  type BusinessSubmissionDto,
  type BusinessSubmitFail,
} from './kycBusinessApi';
import { BusinessKycGateway, MIN_BUSINESS_KYC_CATEGORIES } from './BusinessKycGateway';
import { BusinessKycStatusCard } from './BusinessKycStatusCard';
import { BusinessKycSubmittedView } from './BusinessKycSubmittedView';
import { uploadFileWithProgress } from './uploadWithProgress';

const focusRing = 'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

function parseRecord(x: unknown): Record<string, unknown> {
  if (x && typeof x === 'object' && !Array.isArray(x)) return x as Record<string, unknown>;
  return {};
}

function parseUploadsArray(x: unknown): BusinessKycUploadRow[] {
  if (!Array.isArray(x)) return [];
  const out: BusinessKycUploadRow[] = [];
  for (const u of x) {
    if (!u || typeof u !== 'object') continue;
    const r = u as Record<string, unknown>;
    if (typeof r.fieldId !== 'string' || typeof r.url !== 'string') continue;
    out.push({
      fieldId: r.fieldId,
      url: r.url,
      fileName: typeof r.fileName === 'string' ? r.fileName : '',
      mimeType: typeof r.mimeType === 'string' ? r.mimeType : 'application/octet-stream',
      sizeBytes: typeof r.sizeBytes === 'number' ? r.sizeBytes : 0,
    });
  }
  return out;
}

function lsKey(userId: string, companyId: string) {
  return `kyc.business.draft.${userId}.${companyId}`;
}

function canEditKyc(userId: string, company: { ownerId: string; members?: { userId: string; role: string }[] }): boolean {
  if (company.ownerId === userId) return true;
  const m = company.members?.find((x) => x.userId === userId);
  return m?.role === 'owner' || m?.role === 'admin';
}

type Props = {
  userId: string;
  companyId: string;
  company: { id: string; name: string; ownerId: string; members?: { userId: string; role: string }[] };
};

export function BusinessKycFlow({ userId, companyId, company }: Props) {
  const canEdit = canEditKyc(userId, company);

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [schema, setSchema] = useState<BusinessKycFormV1 | null>(null);
  const [schemaVersion, setSchemaVersion] = useState<number | null>(null);
  const [submission, setSubmission] = useState<BusinessSubmissionDto | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [uploads, setUploads] = useState<BusinessKycUploadRow[]>([]);
  const [fieldProgress, setFieldProgress] = useState<Record<string, number | undefined>>({});
  const [files] = useState<Record<string, File[]>>({});

  const [gatewayOpen, setGatewayOpen] = useState(() => sessionStorage.getItem(`kyc.business.begin.${companyId}`) === '1');
  const [categoryTags, setCategoryTags] = useState<string[]>([]);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [resubmitBusy, setResubmitBusy] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);

  const fakeCategories = categoryTags;

  const remoteFiles = useMemo(() => {
    const m: Record<string, RemoteFileEntry[]> = {};
    for (const u of uploads) {
      if (!m[u.fieldId]) m[u.fieldId] = [];
      m[u.fieldId].push({
        url: u.url,
        fileName: u.fileName,
        mimeType: u.mimeType,
        sizeBytes: u.sizeBytes,
      });
    }
    for (const [fid, p] of Object.entries(fieldProgress)) {
      if (p != null && p < 100) {
        if (!m[fid]) m[fid] = [];
        m[fid].push({
          url: '#uploading',
          fileName: 'Uploading…',
          uploading: true,
          progress: p,
        });
      }
    }
    return m;
  }, [uploads, fieldProgress]);

  const validationErrors = useMemo(() => {
    if (!schema) return serverFieldErrors;
    const client =
      submitAttempted ? validateBusinessKycAnswers(schema, values, uploads, fakeCategories).errors : {};
    return { ...serverFieldErrors, ...client };
  }, [schema, values, uploads, fakeCategories, submitAttempted, serverFieldErrors]);

  const persistLocal = useCallback(() => {
    try {
      localStorage.setItem(
        lsKey(userId, companyId),
        JSON.stringify({ v: 1, answers: values, uploads, savedAt: Date.now() }),
      );
    } catch {
      /* quota */
    }
  }, [userId, companyId, values, uploads]);

  const flushSave = useCallback(
    async (attempt = 0) => {
      if (!canEdit || !schema) return;
      setSaveState('saving');
      setSaveToast(null);
      try {
        await kycBusinessApi.postDraft({ companyId, answers: values, uploads });
        setSaveState('saved');
        persistLocal();
        window.setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        if (attempt < 3) {
          setSaveState('error');
          setSaveToast('Save failed — retrying');
          const delay = 1000 * 2 ** attempt;
          window.setTimeout(() => void flushSave(attempt + 1), delay);
        } else {
          setSaveState('error');
          setSaveToast('Save failed — please check your connection');
        }
      }
    },
    [canEdit, schema, companyId, values, uploads, persistLocal],
  );

  const scheduleSave = useCallback(() => {
    if (!canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushSave(), 600);
  }, [canEdit, flushSave]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const [sch, me, svcList] = await Promise.all([
        kycBusinessApi.getSchemaActive(),
        kycBusinessApi.getMe(companyId),
        api.get<{ providerId?: string; category?: string | null }[]>('/api/services'),
      ]);
      if (!isBusinessKycFormV1(sch.schema)) {
        setLoadErr('Invalid schema from server');
        setLoading(false);
        return;
      }
      setSchema(sch.schema);
      setSchemaVersion(sch.version);

      const mine = (svcList || []).filter((s) => s.providerId === company.ownerId);
      const cats = [...new Set(mine.map((s) => s.category).filter(Boolean))] as string[];
      setCategoryTags(cats);

      const meBody = me as BusinessMeResponse;
      const sub = meBody.submission;
      setSubmission(sub);

      const localRaw = localStorage.getItem(lsKey(userId, companyId));
      let localMerge: { answers?: Record<string, unknown>; uploads?: BusinessKycUploadRow[] } = {};
      try {
        if (localRaw) {
          const p = JSON.parse(localRaw) as { v?: number; answers?: Record<string, unknown>; uploads?: BusinessKycUploadRow[] };
          if (p.v === 1) localMerge = { answers: p.answers ?? {}, uploads: p.uploads ?? [] };
        }
      } catch {
        /* ignore */
      }

      if (sub && (sub.status === 'draft' || sub.status === 'rejected' || sub.status === 'resubmit_requested')) {
        const sa = parseRecord(sub.answers);
        const su = parseUploadsArray(sub.uploads);
        setValues({ ...localMerge.answers, ...sa });
        if (su.length) setUploads(su);
        else if (localMerge.uploads?.length) setUploads(localMerge.uploads);
        else setUploads([]);
        setGatewayOpen(true);
        sessionStorage.setItem(`kyc.business.begin.${companyId}`, '1');
      } else if (!sub) {
        setValues({ ...localMerge.answers });
        setUploads(localMerge.uploads ?? []);
        if (localMerge.answers && Object.keys(localMerge.answers).length) {
          setGatewayOpen(true);
          sessionStorage.setItem(`kyc.business.begin.${companyId}`, '1');
        }
      } else if (sub.status === 'pending' || sub.status === 'approved') {
        setGatewayOpen(false);
        sessionStorage.removeItem(`kyc.business.begin.${companyId}`);
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId, company.ownerId, userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!canEdit || !schema) return;
    const st = submission?.status;
    if (st === 'pending' || st === 'approved') return;
    if (!gatewayOpen && !submission) return;
    scheduleSave();
  }, [values, uploads, canEdit, schema, submission, gatewayOpen, scheduleSave]);

  const onChange = (fieldId: string, value: unknown) => {
    if (!canEdit) return;
    setServerFieldErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const onFileChange = async (fieldId: string, fl: File[]) => {
    if (!canEdit || !fl.length) return;
    for (const file of fl) {
      setFieldProgress((p) => ({ ...p, [fieldId]: 0 }));
      try {
        const { url } = await uploadFileWithProgress(file, (pct) => {
          setFieldProgress((p) => ({ ...p, [fieldId]: pct }));
        });
        setUploads((prev) => [
          ...prev.filter((u) => !(u.fieldId === fieldId && u.url === url)),
          {
            fieldId,
            url,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
          },
        ]);
      } catch (err) {
        console.error(err);
        setSubmitErr(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setFieldProgress((p) => {
          const n = { ...p };
          delete n[fieldId];
          return n;
        });
      }
    }
  };

  const onBegin = () => {
    sessionStorage.setItem(`kyc.business.begin.${companyId}`, '1');
    setGatewayOpen(true);
  };

  const onSubmit = async () => {
    if (!schema || !canEdit) return;
    setSubmitErr(null);
    setServerFieldErrors({});
    const r = validateBusinessKycAnswers(schema, values, uploads, fakeCategories);
    if (!r.valid) {
      setSubmitAttempted(true);
      const first = Object.keys(r.errors)[0];
      if (first) document.getElementById(`bkyc-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitBusy(true);
    const needResubmit = submission?.status === 'rejected' || submission?.status === 'resubmit_requested';
    const res = await postBusinessSubmit({ companyId, answers: values, uploads }, needResubmit);
    setSubmitBusy(false);
    if (res.ok) {
      localStorage.removeItem(lsKey(userId, companyId));
      setSubmitAttempted(false);
      setServerFieldErrors({});
      await loadAll();
      return;
    }
    const fail = res as BusinessSubmitFail;
    if (fail.status === 409) {
      setSubmitErr('A submission is already pending. Showing current status.');
      await loadAll();
      return;
    }
    if (fail.errors && Object.keys(fail.errors).length) {
      setSubmitAttempted(true);
      setServerFieldErrors(fail.errors);
      setSubmitErr(Object.entries(fail.errors).map(([k, v]) => `${k}: ${v}`).join('; '));
    } else {
      setSubmitErr(fail.error);
    }
  };

  const onResubmitFromCard = async () => {
    if (!submission) return;
    setResubmitBusy(true);
    try {
      const answers = parseRecord(submission.answers);
      const ups = parseUploadsArray(submission.uploads);
      await kycBusinessApi.postDraft({ companyId, answers, uploads: ups });
      await loadAll();
      setGatewayOpen(true);
      setSubmitAttempted(false);
      setServerFieldErrors({});
    } finally {
      setResubmitBusy(false);
    }
  };

  const onUpdateFromApproved = async () => {
    if (!submission || submission.status !== 'approved') return;
    setUpdateBusy(true);
    try {
      const answers = parseRecord(submission.answers);
      const ups = parseUploadsArray(submission.uploads);
      await kycBusinessApi.postDraft({ companyId, answers, uploads: ups });
      localStorage.removeItem(lsKey(userId, companyId));
      await loadAll();
      setGatewayOpen(true);
      setSubmitAttempted(false);
      setServerFieldErrors({});
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Could not start update');
    } finally {
      setUpdateBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-card p-8 text-center text-neutral-500" aria-busy="true">
        Loading business KYC…
      </div>
    );
  }

  if (loadErr || !schema || schemaVersion == null) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-app-text" role="alert">
        {loadErr || 'No active schema. Ask an admin to publish one.'}
      </div>
    );
  }

  const st = submission?.status;
  const categoriesOk = categoryTags.length >= MIN_BUSINESS_KYC_CATEGORIES;
  const isLockedResult = st === 'pending' || st === 'approved';
  const showPrereqGateway =
    !isLockedResult &&
    (!categoriesOk || (categoriesOk && !gatewayOpen && (!submission || st === 'draft')));
  const showPendingView = st === 'pending';
  const showApprovedView = st === 'approved';
  const showEditor =
    !isLockedResult &&
    gatewayOpen &&
    categoriesOk &&
    (!submission || st === 'draft' || st === 'rejected' || st === 'resubmit_requested');

  return (
    <div className="space-y-6 max-w-4xl">
      {saveToast ? (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs font-medium text-app-text" role="status">
          {saveToast}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-app-text">Business KYC</h2>
        {canEdit ? (
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500" aria-live="polite">
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState === 'error' ? 'Save issue' : null}
          </div>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/40 px-2 py-1">
            Only owners and admins of this company can edit KYC.
          </p>
        )}
      </div>

      {submission ? (
        <BusinessKycStatusCard
          submission={submission}
          schemaVersionLabel={String(submission.schemaVersion)}
          expiryFlags={submission.expiryFlags as Record<string, unknown>}
          inquiryResults={submission.inquiryResults}
          onResubmit={st === 'rejected' || st === 'resubmit_requested' ? onResubmitFromCard : undefined}
          resubmitBusy={resubmitBusy}
        />
      ) : null}

      {showPrereqGateway ? <BusinessKycGateway companyName={company.name} categoryTags={categoryTags} onBegin={onBegin} /> : null}

      {!showPrereqGateway && showPendingView && submission ? (
        <BusinessKycSubmittedView
          mode="pending"
          schema={schema}
          submission={submission}
          fakeCategories={fakeCategories}
        />
      ) : null}

      {!showPrereqGateway && showApprovedView && submission ? (
        <BusinessKycSubmittedView
          mode="approved"
          schema={schema}
          submission={submission}
          fakeCategories={fakeCategories}
          onUpdateResubmit={canEdit ? onUpdateFromApproved : undefined}
          updateBusy={updateBusy}
        />
      ) : null}

      {showEditor ? (
        <div className="space-y-4">
          {submitErr ? (
            <p className="text-sm text-red-600" role="alert">
              {submitErr}
            </p>
          ) : null}
          <BusinessKycFormRenderer
            schema={schema}
            values={values}
            files={files}
            remoteFiles={remoteFiles}
            onChange={onChange}
            onFileChange={(fid, fl) => void onFileChange(fid, fl)}
            errors={validationErrors}
            readOnly={!canEdit}
            fakeCategories={fakeCategories}
          />
          {canEdit ? (
            <button
              type="button"
              disabled={submitBusy}
              onClick={() => void onSubmit()}
              className={cn(
                'w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-600 text-white font-bold disabled:opacity-50',
                focusRing,
              )}
              aria-label="Submit business KYC for review"
            >
              {submitBusy ? 'Submitting…' : 'Submit for review'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
