import { useMemo, useState } from 'react';
import type { LostFeedbackReason } from '../../../services/providerInbox';

const FEEDBACK_OPTIONS: Array<{ id: LostFeedbackReason; label: string }> = [
  { id: 'price_too_high', label: 'Price too high' },
  { id: 'response_too_slow', label: 'Response too slow' },
  { id: 'quality_concern', label: 'Quality concern' },
  { id: 'schedule_mismatch', label: 'Schedule mismatch' },
  { id: 'distance', label: 'Distance' },
  { id: 'other', label: 'Other' },
];

export function LostFeedbackPanel({
  submitting,
  done,
  onSubmit,
  onMaybeLater,
}: {
  submitting: boolean;
  done: boolean;
  onSubmit: (body: {
    reasons: LostFeedbackReason[];
    otherText?: string;
    providerComment?: string;
  }) => void;
  onMaybeLater: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LostFeedbackReason[]>([]);
  const [otherText, setOtherText] = useState('');
  const [comment, setComment] = useState('');

  const canSubmit = useMemo(
    () => selected.length > 0 && comment.trim().length <= 400,
    [selected, comment],
  );

  const toggle = (id: LostFeedbackReason) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (done) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200">
        Thanks — your feedback helps us match you better next time.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-app-border p-3">
      <button
        type="button"
        className="w-full text-left text-sm font-bold text-app-text"
        onClick={() => setOpen((v) => !v)}
      >
        Help us improve {open ? '▲' : '▼'}
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_OPTIONS.map((opt) => {
              const on = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    on
                      ? 'border-violet-500 bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200'
                      : 'border-app-border text-neutral-600'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {selected.includes('other') ? (
            <input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
              placeholder="Other reason"
            />
          ) : null}
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 400))}
              rows={4}
              className="w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
              placeholder="Anything else you want to share?"
            />
            <div className="mt-1 text-right text-xs text-neutral-500">{comment.length}/400</div>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-neutral-500 underline"
              onClick={() => {
                setOpen(false);
                onMaybeLater();
              }}
            >
              Maybe later
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() =>
                onSubmit({
                  reasons: selected,
                  ...(selected.includes('other') && otherText.trim()
                    ? { otherText: otherText.trim().slice(0, 200) }
                    : {}),
                  ...(comment.trim() ? { providerComment: comment.trim() } : {}),
                })
              }
              className="min-h-[40px] rounded-xl bg-neutral-900 px-4 text-sm font-bold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
