import { cn } from '../../../lib/utils';
import type { KycAiAnalysis } from '../../../services/geminiService';

function toneForRecommendation(r: KycAiAnalysis['recommendation']) {
  if (r === 'approve') return 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40';
  if (r === 'reject') return 'border-red-200 bg-red-50/80 dark:border-red-800 dark:bg-red-950/40';
  return 'border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40';
}

export function AiVerdictCard({
  analysis,
  profileName,
}: {
  analysis: KycAiAnalysis;
  profileName: string;
}) {
  const rec = analysis.recommendation;
  const borderTone = toneForRecommendation(rec);

  return (
    <div
      className={cn('rounded-2xl border p-4 space-y-4', borderTone)}
      role="region"
      aria-label="AI verification verdict"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-widest text-app-text">Recommendation</span>
        <span
          className={cn(
            'text-xs font-bold px-2 py-1 rounded-lg',
            rec === 'approve' && 'bg-emerald-600 text-white',
            rec === 'reject' && 'bg-red-600 text-white',
            rec === 'manual_review' && 'bg-amber-600 text-white',
          )}
        >
          {rec.replace(/_/g, ' ')}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1">
          <span>Confidence</span>
          <span>
            {Math.round((analysis.confidence <= 1 ? analysis.confidence * 100 : analysis.confidence) * 100) / 100}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden" aria-hidden>
          <div
            className={cn(
              'h-full rounded-full transition-all',
              rec === 'approve' && 'bg-emerald-500',
              rec === 'reject' && 'bg-red-500',
              rec === 'manual_review' && 'bg-amber-500',
            )}
            style={{
              width: `${Math.min(100, Math.max(0, analysis.confidence <= 1 ? analysis.confidence * 100 : analysis.confidence))}%`,
            }}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-app-card/80 border border-app-border p-3">
          <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Profile name</p>
          <p className="font-semibold text-app-text">{profileName || '—'}</p>
        </div>
        <div className="rounded-xl bg-app-card/80 border border-app-border p-3">
          <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">OCR name</p>
          <p className="font-semibold text-app-text">{analysis.ocrName || '—'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span
          className={cn(
            'text-[10px] font-bold px-2 py-1 rounded-md',
            analysis.nameMatchesProfile
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50'
              : 'bg-red-100 text-red-800 dark:bg-red-900/50',
          )}
        >
          Name match: {analysis.nameMatchesProfile ? 'Yes' : 'No'}
        </span>
        <span
          className={cn(
            'text-[10px] font-bold px-2 py-1 rounded-md',
            analysis.isEdited
              ? 'bg-red-100 text-red-800 dark:bg-red-900/50'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800',
          )}
        >
          Edited / manipulated: {analysis.isEdited ? 'Flagged' : 'No'}
        </span>
        <span
          className={cn(
            'text-[10px] font-bold px-2 py-1 rounded-md',
            analysis.isInternetDownloaded
              ? 'bg-red-100 text-red-800 dark:bg-red-900/50'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800',
          )}
        >
          Internet sample: {analysis.isInternetDownloaded ? 'Suspected' : 'No'}
        </span>
        <span
          className={cn(
            'text-[10px] font-bold px-2 py-1 rounded-md',
            analysis.isLikelyFraud
              ? 'bg-red-100 text-red-800 dark:bg-red-900/50'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50',
          )}
        >
          Fraud risk: {analysis.isLikelyFraud ? 'Elevated' : 'Normal'}
        </span>
      </div>

      {analysis.dataMismatchDetails ? (
        <p className="text-xs text-app-text whitespace-pre-wrap border-t border-app-border pt-3">
          <span className="font-black uppercase text-[10px] text-neutral-400 block mb-1">Mismatch</span>
          {analysis.dataMismatchDetails}
        </p>
      ) : null}

      <p className="text-xs text-app-text whitespace-pre-wrap">
        <span className="font-black uppercase text-[10px] text-neutral-400 block mb-1">Reasoning</span>
        {analysis.fraudReasoning}
      </p>
    </div>
  );
}
