import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import type { BulkActionItem } from './types.js';

type Props = {
  count: number;
  selectedIds: string[];
  onClear: () => void;
  actions: BulkActionItem[];
  className?: string;
};

export function BulkActionBar({ count, selectedIds, onClear, actions, className }: Props) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-app-border bg-app-card px-4 py-3 text-app-text shadow-lg',
            className
          )}
          role="status"
          aria-live="polite"
        >
          <span className="text-sm font-medium tabular-nums">{count} selected</span>
          <div className="h-4 w-px bg-app-border" aria-hidden />
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                onClick={async (e) => {
                  e.stopPropagation();
                  await a.onRun(selectedIds);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  a.variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
                  a.variant === 'primary' &&
                    'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900',
                  a.variant === 'default' &&
                    'bg-neutral-100 text-app-text hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700'
                )}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-app-text dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
