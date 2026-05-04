import { ChevronUp, ChevronsUpDown, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';

type Props = {
  active: 'asc' | 'desc' | null;
  className?: string;
};

/** RTL-safe: flips based on `document.documentElement.dir`. */
export function SortIndicator({ active, className }: Props) {
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  if (active === 'asc') {
    return (
      <span className={cn('inline-flex text-app-text', rtl && 'scale-x-[-1]', className)} aria-hidden>
        <ChevronUp className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (active === 'desc') {
    return (
      <span className={cn('inline-flex text-app-text', rtl && 'scale-x-[-1]', className)} aria-hidden>
        <ChevronDown className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span
      className={cn('inline-flex text-neutral-400 dark:text-neutral-500', rtl && 'scale-x-[-1]', className)}
      aria-hidden
    >
      <ChevronsUpDown className="h-3.5 w-3.5" />
    </span>
  );
}
