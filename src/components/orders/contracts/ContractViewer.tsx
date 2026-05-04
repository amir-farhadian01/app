import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  title: string;
  termsMarkdown: string;
  policiesMarkdown: string | null;
  scopeSummary: string | null;
  amount: number | null;
  currency: string | null;
  startDate: string | null;
  endDate: string | null;
  readOnly?: boolean;
};

function money(amount: number | null, currency: string | null) {
  if (amount == null || !Number.isFinite(amount)) return '—';
  const c = (currency || 'CAD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(amount);
  } catch {
    return `${c} ${amount.toFixed(2)}`;
  }
}

export function ContractViewer({
  title,
  termsMarkdown,
  policiesMarkdown,
  scopeSummary,
  amount,
  currency,
  startDate,
  endDate,
}: Props) {
  return (
    <div className="space-y-4 text-app-text">
      <header className="space-y-1">
        <h3 className="text-lg font-black leading-tight">{title}</h3>
        <dl className="grid grid-cols-1 gap-2 text-xs text-neutral-600 dark:text-neutral-400 sm:grid-cols-2">
          <div>
            <dt className="font-bold uppercase tracking-wide text-neutral-500">Amount</dt>
            <dd className="font-semibold text-app-text">{money(amount, currency)}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-neutral-500">Dates</dt>
            <dd className="font-semibold text-app-text">
              {startDate ? new Date(startDate).toLocaleString() : '—'} →{' '}
              {endDate ? new Date(endDate).toLocaleString() : '—'}
            </dd>
          </div>
        </dl>
      </header>
      {scopeSummary ? (
        <section>
          <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Scope summary</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
            {scopeSummary}
          </p>
        </section>
      ) : null}
      <section className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-p:leading-relaxed">
        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500 not-prose">Terms</h4>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{termsMarkdown || '_No terms._'}</ReactMarkdown>
      </section>
      {policiesMarkdown ? (
        <section className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold">
          <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500 not-prose">Policies</h4>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{policiesMarkdown}</ReactMarkdown>
        </section>
      ) : null}
    </div>
  );
}
