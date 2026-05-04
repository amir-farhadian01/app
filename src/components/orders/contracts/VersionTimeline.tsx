import { cn } from '../../../lib/utils';

/** Minimal version shape for timeline + diff badges (customer API or admin API). */
export type ContractVersionTimelineFields = {
  id: string;
  versionNumber: number;
  status: string;
  title: string;
  termsMarkdown: string;
  policiesMarkdown: string | null;
  scopeSummary: string | null;
  startDate: string | null;
  endDate: string | null;
  amount: number | null;
  currency: string | null;
  reviewNote?: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100',
  sent: 'bg-sky-200 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
  approved: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  rejected: 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-100',
  superseded: 'bg-neutral-100 text-neutral-500 line-through dark:bg-neutral-800 dark:text-neutral-400',
};

export function diffVersionBadges(prev: ContractVersionTimelineFields | null, curr: ContractVersionTimelineFields): string[] {
  if (!prev) return [];
  const badges: string[] = [];
  if (prev.termsMarkdown !== curr.termsMarkdown) badges.push('Terms changed');
  if (prev.policiesMarkdown !== curr.policiesMarkdown) badges.push('Policies changed');
  if (prev.amount !== curr.amount || (prev.currency || '') !== (curr.currency || '')) badges.push('Amount changed');
  if (prev.startDate !== curr.startDate || prev.endDate !== curr.endDate) badges.push('Dates changed');
  if (prev.title !== curr.title || prev.scopeSummary !== curr.scopeSummary) badges.push('Scope/title changed');
  return badges;
}

type Props = {
  versionsAsc: ContractVersionTimelineFields[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function VersionTimeline({ versionsAsc, selectedId, onSelect }: Props) {
  const byNum = new Map<number, ContractVersionTimelineFields>();
  for (const v of versionsAsc) byNum.set(v.versionNumber, v);

  return (
    <nav aria-label="Contract versions" className="space-y-2">
      <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Versions</h4>
      <ol className="space-y-2">
        {versionsAsc.map((v) => {
          const prev = byNum.get(v.versionNumber - 1) ?? null;
          const badges = diffVersionBadges(prev, v);
          const active = v.id === selectedId;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onSelect(v.id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'border-app-text bg-app-card shadow-sm'
                    : 'border-app-border bg-app-card/60 hover:border-neutral-400',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-app-text">v{v.versionNumber}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
                      STATUS_STYLES[v.status] ?? 'bg-neutral-200 text-neutral-700',
                    )}
                  >
                    {v.status}
                  </span>
                </div>
                {badges.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {badges.map((b) => (
                      <span
                        key={b}
                        className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                ) : null}
                {v.reviewNote && v.status === 'rejected' ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-neutral-500">Note: {v.reviewNote}</p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
