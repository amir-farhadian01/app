import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export function AcknowledgeModal({
  open,
  busy,
  onClose,
  onConfirm,
  title = 'Take this job?',
  message = 'Acknowledging moves this order to Job. Customer contact is still protected in this sprint.',
  confirmLabel = 'Acknowledge & take this job',
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}) {
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
            <h3 className="text-lg font-black text-app-text">{title}</h3>
            <p className="mt-2 text-sm text-neutral-500">{message}</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="min-h-[46px] flex-1 rounded-2xl border border-app-border font-bold">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-900 font-bold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
              >
                {busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden /> : null}
                {busy ? 'Confirming…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
