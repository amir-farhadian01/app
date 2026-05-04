import { Pencil, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ServiceQuestionnaireV1 } from '@/lib/serviceDefinitionTypes';
import type { OrderPhotoRow } from '../../services/orders';
import type { WizardBookingMode } from '../../lib/bookingModeWizard';
import { wizardBookingModeLabel } from '../../lib/bookingModeWizard';

export type Step7ReviewProps = {
  serviceName: string;
  categoryTrail: string[];
  bookingMode: WizardBookingMode | undefined;
  scheduleLabel: string;
  address: string;
  schema: ServiceQuestionnaireV1 | null;
  answers: Record<string, unknown>;
  description: string;
  photos: OrderPhotoRow[];
  bookingPreferencesSummary?: string;
  /** Wizard: selected package */
  packageName?: string | null;
  packagePriceCad?: string | null;
  /** Wizard: Step 4 scheduling line */
  scheduleDetail?: string | null;
  /** Wizard: matched / selected provider */
  providerSummary?: string | null;
  accessNotes?: string | null;
  onEdit?: (step: number) => void;
  readOnly?: boolean;
  /** Wizard-only: primary submit and inline errors */
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  onBackFromReview?: () => void;
  agreedToTerms?: boolean;
  onAgreedTermsChange?: (v: boolean) => void;
};

function summarizeAnswers(schema: ServiceQuestionnaireV1 | null, answers: Record<string, unknown>): string {
  if (!schema) return '';
  const parts: string[] = [];
  for (const f of [...schema.fields].sort((a, b) => a.order - b.order)) {
    const v = answers[f.id];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'object') {
      parts.push(`${f.label}: ${JSON.stringify(v)}`);
    } else {
      parts.push(`${f.label}: ${String(v)}`);
    }
  }
  return parts.join(' · ') || '—';
}

const TEAL = '#01696f';

export function Step7Review({
  serviceName,
  categoryTrail,
  bookingMode,
  scheduleLabel,
  address,
  schema,
  answers,
  description,
  photos,
  bookingPreferencesSummary,
  packageName,
  packagePriceCad,
  scheduleDetail,
  providerSummary,
  accessNotes,
  onEdit,
  readOnly,
  onSubmit,
  isSubmitting,
  submitError,
  onBackFromReview,
  agreedToTerms,
  onAgreedTermsChange,
}: Step7ReviewProps) {
  const categoryLine = categoryTrail.filter(Boolean).join(' · ') || '—';
  const modeLabel = wizardBookingModeLabel(bookingMode);
  const bookingBody = [
    modeLabel,
    scheduleLabel,
    bookingPreferencesSummary?.trim() || null,
  ]
    .filter(Boolean)
    .join('\n');

  const q = summarizeAnswers(schema, answers);
  const cards: { title: string; body: string; step: number }[] = [
    { title: 'Service', body: `${serviceName}\n${categoryLine}`, step: 1 },
    { title: 'Booking preferences', body: bookingBody, step: 2 },
  ];
  if (packageName?.trim()) {
    cards.push({
      title: 'Package',
      body: `${packageName.trim()}${packagePriceCad ? `\n${packagePriceCad}` : ''}`,
      step: 3,
    });
  }
  cards.push({ title: 'Location', body: address || '—', step: 3 });
  if (scheduleDetail?.trim()) {
    cards.push({ title: 'Schedule', body: scheduleDetail.trim(), step: 4 });
  }
  if (providerSummary?.trim()) {
    cards.push({ title: 'Provider', body: providerSummary.trim(), step: 5 });
  }
  if (q !== '—') {
    cards.push({ title: 'Service questionnaire', body: q, step: 6 });
  }
  cards.push({
    title: 'Scope & access',
    body: [description.trim() || '—', accessNotes?.trim() ? `Access: ${accessNotes.trim()}` : null]
      .filter(Boolean)
      .join('\n\n'),
    step: 6,
  });

  return (
    <div className="space-y-4 pb-4">
      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
        {readOnly ? 'Order summary' : 'Review everything before you send. You can edit any section.'}
      </p>
      <div className="space-y-3">
        {cards.map((c) => (
          <div
            key={`${c.title}-${c.step}`}
            className="rounded-2xl border border-app-border bg-app-card p-4 flex gap-3 items-start"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-400">{c.title}</p>
              <p className="text-[15px] text-app-text mt-1 whitespace-pre-wrap break-words">{c.body}</p>
            </div>
            {!readOnly && onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(c.step)}
                aria-label={`Edit ${c.title}`}
                className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl font-bold text-sm shrink-0 gap-1"
                style={{ color: TEAL }}
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            ) : null}
          </div>
        ))}
        {photos.length > 0 ? (
          <div className="rounded-2xl border border-app-border bg-app-card p-4">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Photos</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <img
                  key={`${p.url}-${i}`}
                  src={p.url}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover border border-app-border"
                />
              ))}
            </div>
            {!readOnly && onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(6)}
                aria-label="Edit reference photos"
                className="mt-2 min-h-[48px] text-sm font-bold"
                style={{ color: TEAL }}
              >
                Edit photos
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!readOnly && onSubmit && onBackFromReview ? (
        <div className="space-y-3 pt-2">
          {onAgreedTermsChange ? (
            <label className="flex items-start gap-3 min-h-[48px] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(agreedToTerms)}
                onChange={(e) => onAgreedTermsChange(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-app-border"
              />
              <span className="text-sm text-app-text leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="font-bold underline text-teal-700 dark:text-teal-400">
                  Neighborly Terms of Service
                </Link>
                .
              </span>
            </label>
          ) : null}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={onBackFromReview}
              disabled={isSubmitting}
              className="w-full min-h-[48px] rounded-2xl border border-app-border bg-transparent font-bold text-[15px] text-app-text disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || (onAgreedTermsChange ? !agreedToTerms : false)}
              className="w-full min-h-[56px] rounded-2xl font-bold text-[15px] text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
              style={{ backgroundColor: TEAL }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : (
                'Submit order'
              )}
            </button>
          </div>
          {submitError ? (
            <p className="text-sm text-red-600 text-center sm:text-left" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
