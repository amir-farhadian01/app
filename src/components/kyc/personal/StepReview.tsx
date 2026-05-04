import React, { useState } from 'react';
import { Loader2, Pencil, Send } from 'lucide-react';
import type { KycAiAnalysis } from '../../../services/geminiService';
import type { IdDocType } from './StepLevel1Identity';
import { cn } from '../../../lib/utils';

type Props = {
  declaredLegalName: string;
  idDocumentType: IdDocType;
  idFrontUrl: string;
  idBackUrl: string;
  selfieUrl: string;
  showBack: boolean;
  aiAnalysis: KycAiAnalysis | null;
  submitting: boolean;
  error: string | null;
  onEditLevel0: () => void;
  onEditLevel1: () => void;
  onSubmit: () => void;
};

function Thumb({
  src,
  label,
  onOpen,
}: {
  src: string;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative rounded-xl overflow-hidden border border-app-border aspect-[4/3] w-full max-w-[120px]"
      aria-label={`Enlarge ${label}`}
    >
      <img src={src} alt="" className="w-full h-full object-cover" />
      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white py-0.5 text-center font-bold">
        {label}
      </span>
    </button>
  );
}

export function StepReview({
  declaredLegalName,
  idDocumentType,
  idFrontUrl,
  idBackUrl,
  selfieUrl,
  showBack,
  aiAnalysis,
  submitting,
  error,
  onEditLevel0,
  onEditLevel1,
  onSubmit,
}: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Step 3 · Review</p>

      <div className="flex flex-wrap gap-2 items-start">
        <Thumb src={idFrontUrl} label="ID front" onOpen={() => setLightbox(idFrontUrl)} />
        {showBack && idBackUrl ? (
          <Thumb src={idBackUrl} label="ID back" onOpen={() => setLightbox(idBackUrl)} />
        ) : null}
        <Thumb src={selfieUrl} label="Selfie" onOpen={() => setLightbox(selfieUrl)} />
      </div>

      <div className="rounded-xl border border-app-border p-3 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">Declared name</span>
          <button type="button" onClick={onEditLevel1} className="text-xs font-bold text-blue-600 flex items-center gap-1" aria-label="Edit identity step">
            <Pencil className="w-3 h-3" aria-hidden />
            Edit
          </button>
        </div>
        <p className="font-bold text-app-text">{declaredLegalName}</p>
        {aiAnalysis?.ocrName ? (
          <div className="pt-2 border-t border-app-border">
            <span className="text-neutral-500 text-xs">AI OCR name</span>
            <p className="font-medium text-app-text">{aiAnalysis.ocrName}</p>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 pt-2 border-t border-app-border">
          <span className="text-neutral-500">Document type</span>
          <span className="font-medium text-app-text">{idDocumentType.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">Address & verifications</span>
          <button type="button" onClick={onEditLevel0} className="text-xs font-bold text-blue-600 flex items-center gap-1" aria-label="Edit contact step">
            <Pencil className="w-3 h-3" aria-hidden />
            Edit
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        aria-label="Submit for verification"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Send className="w-5 h-5" aria-hidden />}
        Submit for verification
      </button>

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          aria-label="Close image preview"
        >
          <img
            src={lightbox}
            alt="Enlarged document"
            className={cn('max-w-full max-h-[90vh] object-contain rounded-lg')}
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}
    </div>
  );
}
