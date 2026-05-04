import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { uploadBinary } from '../../../lib/api';
import { compressImageToJpeg } from '../../../lib/imageCompress';
import { analyzeKycDocuments, type KycAiAnalysis } from '../../../services/geminiService';
import { kycPersonalApi, postPersonalSubmit, type Level0Me, type PersonalMeResponse } from './kycPersonalApi';
import type { KycBannerModel } from './StatusBanner';
import { StepLevel0 } from './StepLevel0';
import { StepLevel1Identity, type IdDocType } from './StepLevel1Identity';
import { StepReview } from './StepReview';

export type WizardStage =
  | 'loading'
  | 'idle'
  | 'level0'
  | 'level1'
  | 'review'
  | 'submitting'
  | 'submitted'
  | 'history';

type DraftV1 = {
  v: 1;
  declaredLegalName?: string;
  idDocumentType?: IdDocType;
  idFrontUrl?: string;
  idBackUrl?: string;
  selfieUrl?: string;
  aiAnalysis?: KycAiAnalysis | null;
};

const draftKey = (userId: string) => `kyc.personal.draft.${userId}`;

function loadDraft(userId: string): DraftV1 | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const d = JSON.parse(raw) as DraftV1;
    return d?.v === 1 ? d : null;
  } catch {
    return null;
  }
}

function saveDraft(userId: string, d: DraftV1) {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(d));
  } catch {
    /* quota */
  }
}

function clearDraft(userId: string) {
  localStorage.removeItem(draftKey(userId));
}

async function blobUrlToGeminiPart(url: string): Promise<{ mimeType: string; data: string }> {
  const abs = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const res = await fetch(abs);
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return { mimeType: blob.type || 'image/jpeg', data: dataUrl };
}

type Props = {
  userId: string;
  displayName: string | null;
  onBannerChange: (model: KycBannerModel) => void;
  onRequestResubmit: () => void;
  resubmitNonce: number;
};

export function PersonalKycWizard({
  userId,
  displayName,
  onBannerChange,
  onRequestResubmit,
  resubmitNonce,
}: Props) {
  const [stage, setStage] = useState<WizardStage>('loading');
  const [level0, setLevel0] = useState<Level0Me | null>(null);
  const [personal, setPersonal] = useState<PersonalMeResponse | null>(null);

  const [declaredLegalName, setDeclaredLegalName] = useState('');
  const [idDocumentType, setIdDocumentType] = useState<IdDocType>('passport');
  const [idFrontUrl, setIdFrontUrl] = useState('');
  const [idBackUrl, setIdBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<KycAiAnalysis | null>(null);
  const [compressing, setCompressing] = useState({ front: false, back: false, selfie: false });
  const [aiLoading, setAiLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isResubmit, setIsResubmit] = useState(false);

  const lastResubmit = useRef(0);

  const showBack = idDocumentType === 'national_id' || idDocumentType === 'drivers_license';

  const imagesComplete = useMemo(() => {
    const nameOk = declaredLegalName.trim().length >= 2;
    const front = !!idFrontUrl;
    const backOk = !showBack || !!idBackUrl;
    const selfie = !!selfieUrl;
    return nameOk && front && backOk && selfie;
  }, [declaredLegalName, idFrontUrl, idBackUrl, selfieUrl, showBack]);

  const showAiRiskWarning = useMemo(() => {
    if (!aiAnalysis) return false;
    return (
      aiAnalysis.recommendation === 'reject' ||
      (aiAnalysis.recommendation === 'manual_review' && aiAnalysis.confidence < 0.5)
    );
  }, [aiAnalysis]);

  const persistDraftPartial = useCallback(() => {
    saveDraft(userId, {
      v: 1,
      declaredLegalName,
      idDocumentType,
      idFrontUrl,
      idBackUrl,
      selfieUrl,
      aiAnalysis,
    });
  }, [userId, declaredLegalName, idDocumentType, idFrontUrl, idBackUrl, selfieUrl, aiAnalysis]);

  useEffect(() => {
    persistDraftPartial();
  }, [persistDraftPartial]);

  const pushBanner = useCallback(
    (l0: Level0Me | null, p: PersonalMeResponse | null) => {
      const sub = p?.submission;
      if (!sub) {
        onBannerChange({ submissionStatus: 'none' });
        return;
      }
      if (sub.status === 'approved') {
        onBannerChange({
          submissionStatus: 'approved',
          reviewedAt: sub.reviewedAt,
          submittedAt: sub.submittedAt,
        });
        return;
      }
      if (sub.status === 'pending') {
        onBannerChange({ submissionStatus: 'pending' });
        return;
      }
      if (sub.status === 'rejected' || sub.status === 'resubmit_requested') {
        onBannerChange({
          submissionStatus: sub.status === 'rejected' ? 'rejected' : 'resubmit_requested',
          reviewNote: sub.reviewNote,
          onResubmit: onRequestResubmit,
        });
        return;
      }
      onBannerChange({ submissionStatus: 'none' });
    },
    [onBannerChange, onRequestResubmit],
  );

  const reload = useCallback(async () => {
    const [l0, p] = await Promise.all([kycPersonalApi.getLevel0Me(), kycPersonalApi.getPersonalMe()]);
    setLevel0(l0);
    setPersonal(p);
    return { l0, p };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStage('loading');
      try {
        const { l0, p } = await reload();
        if (cancelled) return;

        const sub = p.submission;
        const draft = loadDraft(userId);

        if (sub?.status === 'pending') {
          setStage('submitted');
          pushBanner(l0, p);
          return;
        }
        if (sub?.status === 'approved') {
          setStage('history');
          pushBanner(l0, p);
          return;
        }

        if (sub?.status === 'rejected' || sub?.status === 'resubmit_requested') {
          clearDraft(userId);
          setDeclaredLegalName(sub.declaredLegalName || displayName?.trim() || '');
          setStage('idle');
          pushBanner(l0, p);
          return;
        }

        if (draft) {
          if (draft.declaredLegalName) setDeclaredLegalName(draft.declaredLegalName);
          if (draft.idDocumentType) setIdDocumentType(draft.idDocumentType);
          if (draft.idFrontUrl) setIdFrontUrl(draft.idFrontUrl);
          if (draft.idBackUrl) setIdBackUrl(draft.idBackUrl);
          if (draft.selfieUrl) setSelfieUrl(draft.selfieUrl);
          if (draft.aiAnalysis !== undefined) setAiAnalysis(draft.aiAnalysis);
        } else if (!sub) {
          setDeclaredLegalName(displayName?.trim() || '');
        }

        if (!l0.complete) {
          setStage('level0');
        } else {
          setStage('level1');
        }
        pushBanner(l0, p);
      } catch {
        if (!cancelled) setStage('level0');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reload, pushBanner, displayName]);

  useEffect(() => {
    if (resubmitNonce <= 0 || resubmitNonce === lastResubmit.current) return;
    lastResubmit.current = resubmitNonce;
    const nameKeep =
      personal?.submission?.declaredLegalName || displayName?.trim() || declaredLegalName;
    setIdFrontUrl('');
    setIdBackUrl('');
    setSelfieUrl('');
    setAiAnalysis(null);
    setDeclaredLegalName(nameKeep);
    setIsResubmit(true);
    setStage('level1');
    setSubmitError(null);
    clearDraft(userId);
    void reload().then(({ l0, p }) => pushBanner(l0, p));
  }, [resubmitNonce, userId, personal, displayName, declaredLegalName, reload, pushBanner]);

  const handleUpload = async (slot: 'front' | 'back' | 'selfie', blob: Blob) => {
    setAiAnalysis(null);
    setCompressing((c) => ({ ...c, [slot]: true }));
    try {
      const jpeg = await compressImageToJpeg(blob);
      const url = await uploadBinary(jpeg, `kyc-${slot}-${Date.now()}.jpg`);
      if (slot === 'front') setIdFrontUrl(url);
      else if (slot === 'back') setIdBackUrl(url);
      else setSelfieUrl(url);
    } finally {
      setCompressing((c) => ({ ...c, [slot]: false }));
    }
  };

  const runAi = async () => {
    if (!imagesComplete) return;
    setSubmitError(null);
    setAiLoading(true);
    try {
      const parts: { mimeType: string; data: string }[] = [];
      parts.push(await blobUrlToGeminiPart(idFrontUrl));
      if (showBack && idBackUrl) parts.push(await blobUrlToGeminiPart(idBackUrl));
      parts.push(await blobUrlToGeminiPart(selfieUrl));
      const result = await analyzeKycDocuments(parts, declaredLegalName.trim());
      setAiAnalysis(result);
    } catch (e) {
      console.error(e);
      setSubmitError(e instanceof Error ? e.message : 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async () => {
    setSubmitError(null);
    setStage('submitting');
    const body = {
      declaredLegalName: declaredLegalName.trim(),
      idDocumentType,
      idFrontUrl,
      idBackUrl: showBack ? idBackUrl : undefined,
      selfieUrl,
      aiAnalysis: aiAnalysis ?? undefined,
    };
    const res = await postPersonalSubmit(body, isResubmit);
    if (res.ok) {
      clearDraft(userId);
      setIsResubmit(false);
      setStage('submitted');
      const { l0, p } = await reload();
      pushBanner(l0, p);
    } else {
      const fail = res as {
        ok: false;
        status: number;
        error: string;
        errors?: Record<string, string>;
      };
      setStage('review');
      if (fail.status === 409) {
        setSubmitError('You already have a submission under review. We loaded your latest status.');
        const { l0, p } = await reload();
        pushBanner(l0, p);
        setStage('submitted');
      } else if (fail.errors && Object.keys(fail.errors).length) {
        setSubmitError(
          Object.entries(fail.errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; '),
        );
      } else {
        setSubmitError(fail.error);
      }
    }
  };

  const step0Done = !!level0?.complete;
  const step1Done = imagesComplete;
  const step2Reached = stage === 'review' || stage === 'submitting';

  const goStep = (i: 0 | 1 | 2) => {
    if (i === 0) {
      setStage('level0');
      return;
    }
    if (i === 1) {
      if (!step0Done) return;
      setStage('level1');
      return;
    }
    if (i === 2) {
      if (!step1Done) return;
      setStage('review');
    }
  };

  const submission = personal?.submission;

  if (stage === 'loading') {
    return (
      <div className="rounded-2xl border border-app-border bg-app-card p-8 text-center text-sm text-neutral-500" aria-busy="true">
        Loading verification…
      </div>
    );
  }

  const showStepper =
    stage !== 'submitted' && stage !== 'history' && stage !== 'idle' && stage !== 'submitting';

  return (
    <div className="space-y-4">
      {showStepper ? (
      <div className="flex justify-center gap-2" role="navigation" aria-label="KYC steps">
        {(
          [
            { i: 0 as const, label: 'Level 0' },
            { i: 1 as const, label: 'Identity' },
            { i: 2 as const, label: 'Review' },
          ] as const
        ).map(({ i, label }) => {
          const done = i === 0 ? step0Done : i === 1 ? step1Done : step2Reached;
          const active =
            (i === 0 && stage === 'level0') ||
            (i === 1 && stage === 'level1') ||
            (i === 2 && stage === 'review');
          const canClick = i === 0 || (i === 1 && step0Done) || (i === 2 && step0Done && step1Done);
          return (
            <button
              key={i}
              type="button"
              disabled={!canClick}
              onClick={() => goStep(i)}
              className="flex flex-col items-center gap-1 disabled:opacity-40"
              aria-label={`Go to ${label}`}
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={`w-3 h-3 rounded-full ${
                  active ? 'bg-emerald-500 scale-125' : done ? 'bg-emerald-500/50' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
              />
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500">{label}</span>
            </button>
          );
        })}
      </div>
      ) : null}

      <AnimatePresence mode="wait">
        {stage === 'idle' ? (
          <motion.p
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-neutral-500 text-center py-6"
          >
            When you’re ready, tap <strong>Resubmit now</strong> in the banner above to upload new documents.
          </motion.p>
        ) : null}

        {stage === 'submitted' || stage === 'history' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-app-border bg-app-card p-6 text-center space-y-2"
          >
            {submission?.status === 'approved' ? (
              <>
                <p className="font-black text-emerald-600">You’re verified</p>
                <p className="text-sm text-neutral-500">Thanks — your identity is on file.</p>
              </>
            ) : (
              <>
                <p className="font-black text-app-text">Submission received</p>
                <p className="text-sm text-neutral-500">We’ll notify you when review is complete.</p>
              </>
            )}
          </motion.div>
        ) : null}

        {stage === 'level0' ? (
          <motion.div
            key="l0"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="rounded-2xl border border-app-border bg-app-card p-6"
          >
            <StepLevel0
              level0={level0}
              onUpdated={(me) => {
                setLevel0(me);
                void reload().then(({ l0, p }) => pushBanner(l0, p));
              }}
              canContinue={!!level0?.complete}
              onContinue={() => setStage('level1')}
            />
          </motion.div>
        ) : null}

        {stage === 'level1' ? (
          <motion.div
            key="l1"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="rounded-2xl border border-app-border bg-app-card p-6"
          >
            <StepLevel1Identity
              displayName={displayName}
              declaredLegalName={declaredLegalName}
              setDeclaredLegalName={setDeclaredLegalName}
              idDocumentType={idDocumentType}
              setIdDocumentType={(t) => {
                setIdDocumentType(t);
                if (t === 'passport') setIdBackUrl('');
              }}
              idFrontUrl={idFrontUrl}
              idBackUrl={idBackUrl}
              selfieUrl={selfieUrl}
              onFrontBlob={(b) => void handleUpload('front', b)}
              onBackBlob={(b) => void handleUpload('back', b)}
              onSelfieBlob={(b) => void handleUpload('selfie', b)}
              compressing={compressing}
              aiAnalysis={aiAnalysis}
              aiLoading={aiLoading}
              onRunAi={() => void runAi()}
              showAiRiskWarning={showAiRiskWarning}
              onNext={() => setStage('review')}
              imagesComplete={imagesComplete}
            />
          </motion.div>
        ) : null}

        {stage === 'review' ? (
          <motion.div
            key="rev"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="rounded-2xl border border-app-border bg-app-card p-6"
          >
            <StepReview
              declaredLegalName={declaredLegalName}
              idDocumentType={idDocumentType}
              idFrontUrl={idFrontUrl}
              idBackUrl={idBackUrl}
              selfieUrl={selfieUrl}
              showBack={showBack}
              aiAnalysis={aiAnalysis}
              submitting={false}
              error={submitError}
              onEditLevel0={() => setStage('level0')}
              onEditLevel1={() => setStage('level1')}
              onSubmit={() => void submit()}
            />
          </motion.div>
        ) : null}

        {stage === 'submitting' ? (
          <motion.div
            key="sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-app-border bg-app-card p-8 text-center text-sm text-neutral-500"
            aria-busy="true"
          >
            Submitting…
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
