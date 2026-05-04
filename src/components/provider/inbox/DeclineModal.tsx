import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

const REASON_CHIPS = [
  'price',
  'response',
  'quality',
  'schedule',
  'distance',
  'other',
] as const;

export type DeclinePayload = {
  reason: string;
  reasons: Array<(typeof REASON_CHIPS)[number]>;
  otherText?: string;
};

export function DeclineModal({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (payload: DeclinePayload) => void;
}) {
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<Array<(typeof REASON_CHIPS)[number]>>([]);
  const [otherText, setOtherText] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setSelected([]);
      setOtherText('');
    }
  }, [open]);

  const toggleReason = (id: (typeof REASON_CHIPS)[number]) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const mergedReason = [selected.join(','), reason.trim()].filter(Boolean).join(' | ');

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[170] flex items-end justify-center p-4 sm:items-center">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative w-full max-w-md rounded-3xl border border-app-border bg-app-card p-6 shadow-2xl"
          >
            <h3 className="text-lg font-black text-app-text">Decline this offer</h3>
            <p className="mt-2 text-sm text-neutral-500">Please provide a reason (minimum 5 characters).</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REASON_CHIPS.map((chip) => {
                const on = selected.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleReason(chip)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                      on
                        ? 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                        : 'border-app-border text-neutral-600'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
            {selected.includes('other') ? (
              <input
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                placeholder="Other reason (optional)"
              />
            ) : null}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-2xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
              placeholder="Example: fully booked today"
            />
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="min-h-[46px] flex-1 rounded-2xl border border-app-border font-bold">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || mergedReason.length < 5}
                onClick={() =>
                  onConfirm({
                    reason: mergedReason,
                    reasons: selected,
                    ...(selected.includes('other') && otherText.trim()
                      ? { otherText: otherText.trim().slice(0, 200) }
                      : {}),
                  })
                }
                className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-600 font-bold text-white disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden /> : null}
                {busy ? 'Declining…' : 'Decline'}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
