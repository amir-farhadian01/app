import type { ContractVersionDTO } from '../../../services/orderContracts';

export type DraftFormState = {
  title: string;
  termsMarkdown: string;
  policiesMarkdown: string;
  scopeSummary: string;
  startDate: string;
  endDate: string;
  amount: string;
  currency: string;
};

export function versionToForm(v: ContractVersionDTO): DraftFormState {
  return {
    title: v.title,
    termsMarkdown: v.termsMarkdown,
    policiesMarkdown: v.policiesMarkdown ?? '',
    scopeSummary: v.scopeSummary ?? '',
    startDate: v.startDate ? isoToDatetimeLocal(v.startDate) : '',
    endDate: v.endDate ? isoToDatetimeLocal(v.endDate) : '',
    amount: v.amount != null && Number.isFinite(v.amount) ? String(v.amount) : '',
    currency: (v.currency || 'CAD').toUpperCase(),
  };
}

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(s: string): string | undefined {
  if (!s.trim()) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function formToDraftBody(f: DraftFormState): {
  title: string;
  termsMarkdown: string;
  policiesMarkdown?: string;
  scopeSummary?: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
  currency?: string;
} {
  const amountNum = f.amount.trim() === '' ? undefined : Number.parseFloat(f.amount);
  return {
    title: f.title.trim(),
    termsMarkdown: f.termsMarkdown,
    ...(f.policiesMarkdown.trim() ? { policiesMarkdown: f.policiesMarkdown } : {}),
    ...(f.scopeSummary.trim() ? { scopeSummary: f.scopeSummary } : {}),
    ...(f.startDate.trim() ? { startDate: datetimeLocalToIso(f.startDate) } : {}),
    ...(f.endDate.trim() ? { endDate: datetimeLocalToIso(f.endDate) } : {}),
    ...(amountNum != null && Number.isFinite(amountNum) ? { amount: amountNum } : {}),
    currency: f.currency.trim() || 'CAD',
  };
}

type Props = {
  form: DraftFormState;
  onChange: (next: DraftFormState) => void;
  disabled?: boolean;
};

export function ContractEditor({ form, onChange, disabled }: Props) {
  const patch = (partial: Partial<DraftFormState>) => onChange({ ...form, ...partial });
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Title</span>
        <input
          type="text"
          value={form.title}
          disabled={disabled}
          onChange={(e) => patch({ title: e.target.value })}
          className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm font-semibold text-app-text"
        />
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Scope summary</span>
        <textarea
          value={form.scopeSummary}
          disabled={disabled}
          onChange={(e) => patch({ scopeSummary: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Amount</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.amount}
            disabled={disabled}
            onChange={(e) => patch({ amount: e.target.value })}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Currency</span>
          <input
            type="text"
            value={form.currency}
            disabled={disabled}
            onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Start</span>
          <input
            type="datetime-local"
            value={form.startDate}
            disabled={disabled}
            onChange={(e) => patch({ startDate: e.target.value })}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-xs font-black uppercase tracking-widest text-neutral-500">End</span>
          <input
            type="datetime-local"
            value={form.endDate}
            disabled={disabled}
            onChange={(e) => patch({ endDate: e.target.value })}
            className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Terms (Markdown)</span>
        <textarea
          value={form.termsMarkdown}
          disabled={disabled}
          onChange={(e) => patch({ termsMarkdown: e.target.value })}
          rows={12}
          className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 font-mono text-[13px] leading-relaxed text-app-text"
        />
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Policies (Markdown)</span>
        <textarea
          value={form.policiesMarkdown}
          disabled={disabled}
          onChange={(e) => patch({ policiesMarkdown: e.target.value })}
          rows={5}
          className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 font-mono text-[13px] leading-relaxed text-app-text"
        />
      </label>
    </div>
  );
}
