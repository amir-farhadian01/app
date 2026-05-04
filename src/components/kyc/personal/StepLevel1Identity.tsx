import React from 'react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { DocumentCamera } from './DocumentCamera';
import type { KycAiAnalysis } from '../../../services/geminiService';
import { cn } from '../../../lib/utils';

export type IdDocType = 'national_id' | 'passport' | 'drivers_license';

type Props = {
  displayName: string | null;
  declaredLegalName: string;
  setDeclaredLegalName: (v: string) => void;
  idDocumentType: IdDocType;
  setIdDocumentType: (v: IdDocType) => void;
  idFrontUrl: string;
  idBackUrl: string;
  selfieUrl: string;
  onFrontBlob: (blob: Blob) => void;
  onBackBlob: (blob: Blob) => void;
  onSelfieBlob: (blob: Blob) => void;
  compressing: { front: boolean; back: boolean; selfie: boolean };
  aiAnalysis: KycAiAnalysis | null;
  aiLoading: boolean;
  onRunAi: () => void;
  showAiRiskWarning: boolean;
  onNext: () => void;
  /** All required photos uploaded — unlocks Review and AI. */
  imagesComplete: boolean;
};

function DocDiagram({ type }: { type: IdDocType }) {
  const cap =
    type === 'national_id'
      ? 'Photograph both sides of your national ID — text and photo clearly visible.'
      : type === 'passport'
        ? 'Open passport to the photo page; capture the full spread in one frame if possible.'
        : 'Photograph front and back of your driver’s license.';

  return (
    <div className="rounded-xl border border-dashed border-app-border bg-app-bg p-3 text-center space-y-2" aria-hidden>
      <div className="mx-auto w-24 h-16 rounded-lg bg-neutral-300 dark:bg-neutral-600 relative overflow-hidden">
        <div className="absolute inset-2 rounded bg-white/30" />
        {type === 'passport' ? (
          <div className="absolute bottom-1 start-1 end-1 h-8 rounded bg-neutral-800/40" />
        ) : (
          <div className="absolute top-2 start-2 w-8 h-8 rounded-full bg-neutral-800/30" />
        )}
      </div>
      <p className="text-[10px] text-neutral-500 leading-snug">{cap}</p>
    </div>
  );
}

export function StepLevel1Identity({
  displayName,
  declaredLegalName,
  setDeclaredLegalName,
  idDocumentType,
  setIdDocumentType,
  idFrontUrl,
  idBackUrl,
  selfieUrl,
  onFrontBlob,
  onBackBlob,
  onSelfieBlob,
  compressing,
  aiAnalysis,
  aiLoading,
  onRunAi,
  showAiRiskWarning,
  onNext,
  imagesComplete,
}: Props) {
  const showBack = idDocumentType === 'national_id' || idDocumentType === 'drivers_license';
  const nameWarn =
    displayName &&
    declaredLegalName.trim().length >= 2 &&
    declaredLegalName.trim().toLowerCase() !== displayName.trim().toLowerCase();

  const types: { id: IdDocType; label: string }[] = [
    { id: 'national_id', label: 'National ID' },
    { id: 'passport', label: 'Passport' },
    { id: 'drivers_license', label: 'Driver’s license' },
  ];

  return (
    <div className="space-y-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Step 2 · Identity</p>

      <div className="space-y-2">
        <label className="text-xs font-bold text-app-text">Legal name (as on ID)</label>
        <input
          value={declaredLegalName}
          onChange={(e) => setDeclaredLegalName(e.target.value)}
          className="w-full rounded-xl border border-app-border bg-app-input px-3 py-3 text-sm"
          minLength={2}
          aria-label="Declared legal name"
        />
        {nameWarn ? (
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
            This differs from your profile display name ({displayName}). That’s OK if your ID uses another spelling.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-app-text">ID type</span>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="ID document type">
          {types.map((t) => (
            <label
              key={t.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer',
                idDocumentType === t.id ? 'border-emerald-500 bg-emerald-500/5' : 'border-app-border',
              )}
            >
              <input
                type="radio"
                name="idtype"
                checked={idDocumentType === t.id}
                onChange={() => setIdDocumentType(t.id)}
                className="sr-only"
                aria-label={t.label}
              />
              <span className="text-sm font-medium text-app-text">{t.label}</span>
            </label>
          ))}
        </div>
        <DocDiagram type={idDocumentType} />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-app-text">ID — front</span>
        {idFrontUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-app-border">
            <img src={idFrontUrl} alt="ID front preview" className="w-full max-h-40 object-cover" />
            {compressing.front ? (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold gap-2">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Compressing…
              </div>
            ) : null}
          </div>
        ) : null}
        <DocumentCamera variant="id" onCapture={onFrontBlob} disabled={compressing.front} />
      </div>

      {showBack ? (
        <div className="space-y-2">
          <span className="text-xs font-bold text-app-text">ID — back</span>
          {idBackUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-app-border">
              <img src={idBackUrl} alt="ID back preview" className="w-full max-h-40 object-cover" />
              {compressing.back ? (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Compressing…
                </div>
              ) : null}
            </div>
          ) : null}
          <DocumentCamera variant="id" onCapture={onBackBlob} disabled={compressing.back} />
        </div>
      ) : null}

      <div className="space-y-2">
        <span className="text-xs font-bold text-app-text">Selfie</span>
        <p className="text-[10px] text-neutral-500">Use live capture when possible.</p>
        {selfieUrl ? (
          <div className="relative rounded-full overflow-hidden border-2 border-emerald-500/50 w-32 h-32 mx-auto">
            <img src={selfieUrl} alt="Selfie preview" className="w-full h-full object-cover" />
            {compressing.selfie ? (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-bold gap-1">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Compressing…
              </div>
            ) : null}
          </div>
        ) : null}
        <DocumentCamera variant="selfie" onCapture={onSelfieBlob} disabled={compressing.selfie} />
      </div>

      <div className="rounded-2xl border border-app-border overflow-hidden">
        {aiLoading ? (
          <div className="p-8 space-y-3 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 animate-pulse">
            <div className="h-3 rounded bg-neutral-300 dark:bg-neutral-600 w-3/4" />
            <div className="h-3 rounded bg-neutral-300 dark:bg-neutral-600 w-1/2" />
            <p className="text-sm font-medium text-app-text pt-2">Scanning your ID… almost there.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRunAi}
            disabled={!imagesComplete}
            className="w-full py-3 flex items-center justify-center gap-2 font-bold text-sm bg-app-bg text-app-text border-t border-app-border disabled:opacity-50"
            aria-label="Analyze documents with AI"
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            Analyze with AI
          </button>
        )}
      </div>

      {showAiRiskWarning && aiAnalysis ? (
        <div
          className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-app-text space-y-2"
          role="status"
          aria-label="AI review warning"
        >
          <p className="font-bold">Our AI suggests this may not pass review.</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            You can still submit. Summary: {aiAnalysis.dataMismatchDetails || aiAnalysis.fraudReasoning}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onNext}
        disabled={!imagesComplete}
        className="w-full py-3 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold disabled:opacity-50"
        aria-label="Go to review step"
      >
        Next: Review
      </button>
    </div>
  );
}
