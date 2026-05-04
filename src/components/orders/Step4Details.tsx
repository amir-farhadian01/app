import type { ServiceQuestionnaireV1 } from '@/lib/serviceDefinitionTypes';
import { minimalFallbackQuestionnaire } from '@/lib/wizardFallbackQuestionnaire';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import type { OrderPhotoRow } from '../../services/orders';

export type Step4DetailsProps = {
  schema: ServiceQuestionnaireV1 | null;
  answers: Record<string, unknown>;
  photos: OrderPhotoRow[];
  onAnswer: (fieldId: string, value: unknown) => void;
  onPhotosForField: (fieldId: string, rows: OrderPhotoRow[]) => void;
  errors: Record<string, string>;
  showErrors: boolean;
  isSchemaLoading?: boolean;
  /** Shown when the catalog has no custom questionnaire or the schema request failed (non-blocking). */
  schemaFetchWarning?: string | null;
};

export function Step4Details({
  schema,
  answers,
  photos,
  onAnswer,
  onPhotosForField,
  errors,
  showErrors,
  isSchemaLoading,
  schemaFetchWarning,
}: Step4DetailsProps) {
  if (isSchemaLoading) {
    return <p className="text-neutral-500 text-[15px]">Loading questions…</p>;
  }

  const effectiveSchema = schema ?? minimalFallbackQuestionnaire();

  if (!schema) {
    const effectiveSchema = minimalFallbackQuestionnaire();
    return (
      <div className="space-y-4">
        {schemaFetchWarning ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
            <p className="text-sm leading-relaxed">{schemaFetchWarning}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-bold text-[15px]">No custom questions for this service.</p>
            <p className="text-sm mt-1 leading-relaxed opacity-90">
              Add your address and any notes, then continue. If questions fail to load, use the fields below and submit.
            </p>
          </div>
        )}
        <DetailsBody
          schema={effectiveSchema}
          answers={answers}
          photos={photos}
          onAnswer={onAnswer}
          onPhotosForField={onPhotosForField}
          errors={errors}
          showErrors={showErrors}
        />
      </div>
    );
  }

  if (schema.fields.length === 0) {
    return (
      <div className="space-y-3">
        {schemaFetchWarning ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
            <p className="text-sm leading-relaxed">{schemaFetchWarning}</p>
          </div>
        ) : null}
        <p className="text-neutral-600 dark:text-neutral-400 text-[15px] leading-relaxed">
          No extra questions for this service type. Continue to describe your job on the next step.
        </p>
        {/* TODO: Admin must add custom questionnaire fields to this catalog in admin panel */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {schemaFetchWarning ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
          <p className="text-sm leading-relaxed">{schemaFetchWarning}</p>
        </div>
      ) : null}
      <DetailsBody
        schema={schema}
        answers={answers}
        photos={photos}
        onAnswer={onAnswer}
        onPhotosForField={onPhotosForField}
        errors={errors}
        showErrors={showErrors}
      />
    </div>
  );
}

function DetailsBody({
  schema,
  answers,
  photos,
  onAnswer,
  onPhotosForField,
  errors,
  showErrors,
}: {
  schema: ServiceQuestionnaireV1;
  answers: Record<string, unknown>;
  photos: OrderPhotoRow[];
  onAnswer: (fieldId: string, value: unknown) => void;
  onPhotosForField: (fieldId: string, rows: OrderPhotoRow[]) => void;
  errors: Record<string, string>;
  showErrors: boolean;
}) {
  const effSections =
    schema.sections.length > 0
      ? [...schema.sections].sort((a, b) => a.order - b.order)
      : [{ id: '_all', title: 'Details', order: 0 }];

  const sectionIds = new Set(effSections.map((s) => s.id));
  const fieldsBySection = new Map<string, typeof schema.fields>();
  for (const s of effSections) {
    fieldsBySection.set(s.id, []);
  }
  for (const f of schema.fields) {
    const sid = f.section && sectionIds.has(f.section) ? f.section : effSections[0]!.id;
    const list = fieldsBySection.get(sid) ?? [];
    list.push(f);
    fieldsBySection.set(sid, list);
  }
  for (const s of effSections) {
    fieldsBySection.set(
      s.id,
      (fieldsBySection.get(s.id) ?? []).sort((a, b) => a.order - b.order),
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
        A few details help providers prepare the right tools and time for your job.
      </p>
      {effSections.map((sec) => {
        const fields = fieldsBySection.get(sec.id) ?? [];
        if (!fields.length) return null;
        return (
          <section key={sec.id} className="space-y-4">
            <h3 className="text-lg font-black text-app-text">{sec.title}</h3>
            <div className="space-y-5">
              {fields.map((field) => (
                <DynamicFieldRenderer
                  key={field.id}
                  field={field}
                  values={answers}
                  allPhotos={photos}
                  onChange={onAnswer}
                  onPhotosForField={onPhotosForField}
                  errors={errors}
                  showErrors={showErrors}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
