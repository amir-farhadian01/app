import { AlertTriangle } from 'lucide-react';

type Props = {
  warnings: string[];
};

export function MismatchWarnings({ warnings }: Props) {
  if (!warnings.length) return null;
  return (
    <div
      className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
    >
      <div className="flex items-start gap-2 font-semibold">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>Heads up — chat vs contract</span>
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] font-medium leading-snug">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
