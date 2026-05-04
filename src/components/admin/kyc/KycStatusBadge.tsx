import { cn } from '../../../lib/utils';

const STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  resubmit_requested: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
};

export function KycStatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
  return (
    <span
      className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide', cls)}
      aria-label={`Status ${status}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
