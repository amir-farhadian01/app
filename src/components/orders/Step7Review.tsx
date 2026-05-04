import { Pencil } from 'lucide-react';
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
  onEdit?: (step: number) => void;
  readOnly?: boolean;
  /** Wizard-only: primary submit and inline errors */
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  onBackFromReview?: () => void;
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
  onEdit,
  readOnly,
  onSubmit,
  isSubmitting,
  submitError,
  onBackFromReview,
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

  const cards: { title: string; body: string; step: number }[] = [
    { title: 'Service and category', body: `${serviceName}\n${categoryLine}`, step: 1 },
    { title: 'Booking and schedule', body: bookingBody, step: 2 },
    { title: 'Service location', body: address || '—', step: 3 },
    { title: 'Questionnaire', body: summarizeAnswers(schema, answers), step: 5 },
    { title: 'Your description', body: description.trim() || '—', step: 6 },
  ];

  return (
    <div className="space-y-4 pb-4">
      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
        Review everything before you send. You can edit any section.
      </p>
      <div className="space-y-3">
        {cards.map((c) => (
          <div
            key={c.title}
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
                onClick={() => onEdit(2)}
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
              disabled={isSubmitting}
              className="w-full min-h-[56px] rounded-2xl font-bold text-[15px] text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
            >
              {isSubmitting ? 'Submitting…' : 'Submit Order'}
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
