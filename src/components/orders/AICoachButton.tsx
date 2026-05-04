import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { coachDescription, type CoachDescriptionInput } from '../../lib/orderDescriptionAi';
import { cn } from '../../lib/utils';

export type AICoachButtonProps = {
  input: CoachDescriptionInput;
  userText: string;
  onAccept: (improved: string) => void;
  disabled?: boolean;
};

export function AICoachButton({ input, userText, onAccept, disabled }: AICoachButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [improved, setImproved] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState('');

  const run = async () => {
    setLoading(true);
    try {
      const r = await coachDescription({ ...input, userDescription: userText });
      setImproved(r.improved);
      setMissing(r.missingDetails);
      setReasoning(r.reasoning);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || userText.trim().length < 10 || loading}
        onClick={() => void run()}
        className={cn(
          'w-full min-h-[48px] rounded-2xl border-2 border-app-border bg-app-card font-bold text-[15px] text-app-text flex items-center justify-center gap-2',
          'hover:border-neutral-900 dark:hover:border-white disabled:opacity-50 disabled:pointer-events-none',
        )}
      >
        <Sparkles className="w-5 h-5" />
        {loading ? 'Thinking…' : 'AI Coach'}
      </button>
      <p className="text-xs text-neutral-500">Optional — improves clarity for providers.</p>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl border border-app-border bg-app-card p-4 space-y-4"
          >
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-black text-app-text">Suggested description</h4>
              <button
                type="button"
                className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl text-neutral-500"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[15px] text-app-text whitespace-pre-wrap rounded-xl bg-app-bg p-3 border border-app-border">
              {improved}
            </p>
            {missing.length > 0 ? (
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
                  Things you might want to add
                </p>
                <ul className="list-disc pl-5 text-sm text-app-text space-y-1">
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {reasoning ? (
              <p className="text-xs text-neutral-500">
                <span className="font-bold">Why: </span>
                {reasoning}
              </p>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                className="flex-1 min-h-[48px] rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-[15px]"
                onClick={() => {
                  onAccept(improved);
                  setOpen(false);
                }}
              >
                Use this version
              </button>
              <button
                type="button"
                className="flex-1 min-h-[48px] rounded-2xl border border-app-border font-bold text-[15px] text-app-text"
                onClick={() => setOpen(false)}
              >
                Keep mine
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
