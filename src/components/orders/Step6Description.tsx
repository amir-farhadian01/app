import type { ReactNode } from 'react';
import { AICoachButton } from './AICoachButton';
import { PhotoUploader } from './PhotoUploader';
import type { CoachDescriptionInput } from '../../lib/orderDescriptionAi';
import type { OrderPhotoRow } from '../../services/orders';

const MAX = 1000;
const MIN = 10;

export type Step6DescriptionProps = {
  description: string;
  descriptionAiAssisted: boolean;
  onDescription: (v: string) => void;
  onAiAssisted: (v: boolean) => void;
  coachInput: CoachDescriptionInput;
  errors: Record<string, string>;
  showErrors: boolean;
  accessNotes: string;
  onAccessNotes: (v: string) => void;
  galleryPhotos: OrderPhotoRow[];
  onGalleryChange: (rows: OrderPhotoRow[]) => void;
  questionnaireSlot?: ReactNode;
};

export function Step6Description({
  description,
  descriptionAiAssisted,
  onDescription,
  onAiAssisted,
  coachInput,
  errors,
  showErrors,
  accessNotes,
  onAccessNotes,
  galleryPhotos,
  onGalleryChange,
  questionnaireSlot,
}: Step6DescriptionProps) {
  const len = description.length;

  return (
    <div className="space-y-8">
      {questionnaireSlot ? (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Service questions</p>
          {questionnaireSlot}
        </div>
      ) : null}

      <div className="space-y-5">
        <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
          Add any final details, access notes, and reference photos for your provider.
        </p>
        <div className="space-y-2">
          <label htmlFor="wiz-desc" className="text-xs font-bold text-app-text">
            Scope & description{' '}
            {descriptionAiAssisted ? <span className="text-emerald-600">(AI-assisted)</span> : null}
          </label>
          <textarea
            id="wiz-desc"
            value={description}
            maxLength={MAX}
            onChange={(e) => onDescription(e.target.value.slice(0, MAX))}
            rows={6}
            className="w-full min-h-[160px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
            placeholder="Describe the work clearly (materials, vehicle model, problem symptoms…)…"
            aria-invalid={showErrors && !!errors.description}
          />
          <div className="flex justify-between text-xs text-neutral-500">
            <span>
              {len} / {MAX}
            </span>
            <span>Minimum {MIN} characters to continue</span>
          </div>
          {showErrors && errors.description ? (
            <p className="text-sm text-red-600" role="alert">
              {errors.description}
            </p>
          ) : null}
        </div>

        <AICoachButton
          input={coachInput}
          userText={description}
          onAccept={(improved) => {
            onDescription(improved.slice(0, MAX));
            onAiAssisted(true);
          }}
          disabled={description.trim().length < MIN}
        />

        <div className="space-y-2">
          <label htmlFor="wiz-access" className="text-xs font-bold text-app-text">
            Access notes (parking, gate codes, pets)
          </label>
          <textarea
            id="wiz-access"
            value={accessNotes}
            onChange={(e) => onAccessNotes(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            className="w-full rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
            placeholder="Optional — helps your provider arrive smoothly."
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-app-text">Reference photos (optional)</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Up to five images.</p>
          <PhotoUploader
            value={galleryPhotos}
            onChange={onGalleryChange}
            maxFiles={5}
            maxFileSizeMb={10}
          />
        </div>
      </div>
    </div>
  );
}

export { MIN as DESCRIPTION_MIN_LENGTH, MAX as DESCRIPTION_MAX_LENGTH };
