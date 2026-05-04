import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ReviewAction } from '../../../services/adminKyc';

type Props = {
  disabled?: boolean;
  onReview: (action: ReviewAction, note: string) => Promise<void>;
  className?: string;
};

export function ReviewActionBar({ disabled, onReview, className }: Props) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: ReviewAction) => {
    setError(null);
    if (action !== 'approve' && note.trim().length < 10) {
      setError('Note must be at least 10 characters for reject or resubmit.');
      return;
    }
    setBusy(true);
    try {
      await onReview(action, note.trim());
      setNote('');
      setConfirmApprove(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('border-t border-app-border bg-app-card/95 backdrop-blur p-4 space-y-3', className)}>
      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400">Review note</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Required for reject / resubmit (min 10 characters)"
        rows={3}
        className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-neutral-400"
        disabled={disabled || busy}
        aria-label="Review note"
      />
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => setConfirmApprove(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
          aria-label="Approve submission"
        >
          <Check className="w-4 h-4" />
          Approve
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => run('reject')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 text-xs font-bold hover:bg-red-200 dark:hover:bg-red-900/60 disabled:opacity-50"
          aria-label="Reject submission"
        >
          <X className="w-4 h-4" />
          Reject
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => run('request_resubmit')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200 text-xs font-bold hover:bg-violet-200 dark:hover:bg-violet-900/60 disabled:opacity-50"
          aria-label="Request resubmit"
        >
          <RefreshCw className="w-4 h-4" />
          Request resubmit
        </button>
      </div>

      <AnimatePresence>
        {confirmApprove && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="kyc-approve-title">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-app-card border border-app-border rounded-2xl p-6 max-w-md shadow-xl space-y-4"
            >
              <h4 id="kyc-approve-title" className="text-lg font-bold text-app-text">
                Confirm approval
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                This will grant the user verified status and mirror legacy KYC as verified.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-sm font-bold border border-app-border text-app-text hover:bg-app-bg"
                  onClick={() => setConfirmApprove(false)}
                  aria-label="Cancel approval"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => run('approve')}
                  aria-label="Confirm approve"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
