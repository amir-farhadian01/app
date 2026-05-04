import { AICoachButton } from './AICoachButton';
import type { CoachDescriptionInput } from '../../lib/orderDescriptionAi';

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
};

export function Step6Description({
  description,
  descriptionAiAssisted,
  onDescription,
  onAiAssisted,
  coachInput,
  errors,
  showErrors,
}: Step6DescriptionProps) {
  const len = description.length;

  return (
    <div className="space-y-5">
      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
        Add reference photos on the schedule step (up to five). This text is saved with your order.
      </p>
      <div className="space-y-2">
        <label htmlFor="wiz-desc" className="text-xs font-bold text-app-text">
          Describe your project in your own words{' '}
          {descriptionAiAssisted ? <span className="text-emerald-600">(AI-assisted)</span> : null}
        </label>
        <textarea
          id="wiz-desc"
          value={description}
          maxLength={MAX}
          onChange={(e) => onDescription(e.target.value.slice(0, MAX))}
          rows={6}
          className="w-full min-h-[160px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
          placeholder="Example: The kitchen faucet drips and the shutoff valve is stiff…"
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
    </div>
  );
}

export { MIN as DESCRIPTION_MIN_LENGTH, MAX as DESCRIPTION_MAX_LENGTH };
