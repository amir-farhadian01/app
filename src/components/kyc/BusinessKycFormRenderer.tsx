import type { ReactNode } from 'react';
import type { BusinessKycFieldDef, BusinessKycFormV1 } from '../../../lib/kycTypes';

export { validateBusinessKycAnswers } from './businessKycValidation';

export type RemoteFileEntry = {
  url: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploading?: boolean;
  progress?: number;
};

export type BusinessKycFormRendererProps = {
  schema: BusinessKycFormV1;
  values: Record<string, unknown>;
  files: Record<string, File[]>;
  /** Server-backed uploads (and in-flight progress) shown alongside local `files`. */
  remoteFiles?: Record<string, RemoteFileEntry[]>;
  onChange: (fieldId: string, value: unknown) => void;
  onFileChange: (fieldId: string, files: File[]) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
  fakeCategories?: string[];
};

function evalShowIf(
  showIf: BusinessKycFieldDef['showIf'],
  answers: Record<string, unknown>,
): boolean {
  if (!showIf) return true;
  const v = answers[showIf.fieldId];
  if ('equals' in showIf) return v === showIf.equals;
  if ('in' in showIf && Array.isArray(showIf.in)) return showIf.in.some((x) => x === v);
  return true;
}

function wholeMonthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

function expiryWarning(field: BusinessKycFieldDef, value: unknown): string | null {
  if (field.type !== 'date' || field.expiryMinMonths == null || !value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  const mo = wholeMonthsBetween(new Date(), d);
  if (mo < field.expiryMinMonths) {
    return `Only ${mo} month(s) until expiry — minimum ${field.expiryMinMonths} required`;
  }
  return null;
}

/** Live months-until date vs today and whether it meets expiryMinMonths (for UX preview). */
function expiryLiveHint(field: BusinessKycFieldDef, value: unknown): string | null {
  if (field.type !== 'date' || field.expiryMinMonths == null || !value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  const mo = wholeMonthsBetween(new Date(), d);
  const ok = mo >= field.expiryMinMonths;
  return `${mo} month(s) from today — ${ok ? 'meets' : 'below'} the ${field.expiryMinMonths}-month threshold`;
}

const focusRing = 'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2 focus:ring-offset-app-card';

export function BusinessKycFormRenderer({
  schema,
  values,
  files,
  remoteFiles = {},
  onChange,
  onFileChange,
  errors,
  readOnly,
  fakeCategories = [],
}: BusinessKycFormRendererProps) {
  const sections = [...schema.sections].sort((a, b) => a.order - b.order);
  const fieldsBySection = new Map<string, BusinessKycFieldDef[]>();
  for (const s of sections) {
    fieldsBySection.set(
      s.id,
      schema.fields.filter((f) => f.section === s.id).sort((a, b) => a.order - b.order),
    );
  }

  const cats = fakeCategories;

  const renderField = (field: BusinessKycFieldDef) => {
    if (!evalShowIf(field.showIf, values)) return null;

    const err = errors[field.id];
    const v = values[field.id];
    const warn = expiryWarning(field, v);
    const liveHint = field.type === 'date' ? expiryLiveHint(field, v) : null;
    const fid = `bkyc-${field.id}`;

    const baseLabel = (
      <label htmlFor={fid} className="block text-xs font-bold text-app-text mb-1">
        {field.label}
        {(field.required ||
          (field.requiredForCategories?.length &&
            cats.some((c) => field.requiredForCategories!.includes(c)))) && (
          <span className="text-red-500 ml-0.5" aria-hidden>
            *
          </span>
        )}
      </label>
    );

    let control: ReactNode = null;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        control = (
          <input
            id={fid}
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            className={`w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text ${focusRing}`}
            value={v != null ? String(v) : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            readOnly={readOnly}
            disabled={readOnly}
            aria-invalid={!!err}
            aria-describedby={err ? `${fid}-err` : undefined}
          />
        );
        break;
      case 'textarea':
        control = (
          <textarea
            id={fid}
            className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text min-h-[88px]"
            value={v != null ? String(v) : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            readOnly={readOnly}
            disabled={readOnly}
            aria-invalid={!!err}
          />
        );
        break;
      case 'number':
        control = (
          <input
            id={fid}
            type="number"
            className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
            value={v === '' || v == null ? '' : String(v)}
            min={field.min}
            max={field.max}
            onChange={(e) => onChange(field.id, e.target.value === '' ? '' : Number(e.target.value))}
            readOnly={readOnly}
            disabled={readOnly}
            aria-invalid={!!err}
          />
        );
        break;
      case 'boolean':
        control = (
          <input
            id={fid}
            type="checkbox"
            className="h-4 w-4 rounded border-app-border"
            checked={Boolean(v)}
            onChange={(e) => onChange(field.id, e.target.checked)}
            disabled={readOnly}
            aria-invalid={!!err}
          />
        );
        break;
      case 'date':
        control = (
          <input
            id={fid}
            type="date"
            className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
            value={v != null ? String(v).slice(0, 10) : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
            aria-invalid={!!err}
          />
        );
        break;
      case 'address':
        control = (
          <textarea
            id={fid}
            className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text min-h-[72px]"
            value={v != null ? String(v) : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            readOnly={readOnly}
            disabled={readOnly}
          />
        );
        break;
      case 'select':
        control = (
          <select
            id={fid}
            className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
            value={v != null ? String(v) : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={readOnly}
            aria-invalid={!!err}
          >
            <option value="">—</option>
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
        break;
      case 'multiselect': {
        const arr = Array.isArray(v) ? (v as string[]) : [];
        control = (
          <fieldset className="space-y-2 border border-app-border rounded-xl p-3" disabled={readOnly}>
            <legend className="sr-only">{field.label}</legend>
            {(field.options ?? []).map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={arr.includes(o.value)}
                  onChange={() => {
                    const next = arr.includes(o.value) ? arr.filter((x) => x !== o.value) : [...arr, o.value];
                    onChange(field.id, next);
                  }}
                  disabled={readOnly}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
        );
        break;
      }
      case 'file': {
        const list = files[field.id] ?? [];
        const remote = remoteFiles[field.id] ?? [];
        control = (
          <div className="space-y-2">
            <input
              id={fid}
              type="file"
              multiple={(field.maxFiles ?? 1) > 1}
              accept={(field.accept ?? []).join(',')}
              className={`text-sm text-app-text file:me-2 ${focusRing}`}
              disabled={readOnly}
              onChange={(e) => {
                const fl = e.target.files ? Array.from(e.target.files) : [];
                onFileChange(field.id, fl);
                e.target.value = '';
              }}
              aria-invalid={!!err}
            />
            {remote.length > 0 ? (
              <ul className="text-xs space-y-2" aria-live="polite">
                {remote.map((r, i) => {
                  const href = r.url.startsWith('http') ? r.url : `${typeof window !== 'undefined' ? window.location.origin : ''}${r.url}`;
                  return (
                    <li key={`${r.url}-${i}`} className="rounded-lg border border-app-border bg-app-bg p-2 space-y-1">
                      <div className="flex justify-between gap-2 items-center">
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`truncate font-medium text-app-text underline ${focusRing} rounded`}
                        >
                          {r.fileName || 'File'}
                        </a>
                        {r.uploading ? <span className="shrink-0 tabular-nums text-neutral-500">{r.progress ?? 0}%</span> : null}
                      </div>
                      {r.uploading ? (
                        <div
                          className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
                          role="progressbar"
                          aria-valuenow={r.progress ?? 0}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full bg-emerald-500 transition-all duration-150"
                            style={{ width: `${Math.min(100, r.progress ?? 0)}%` }}
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {list.length > 0 ? (
              <ul className="text-xs text-neutral-500 space-y-1" aria-live="polite">
                {list.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    {f.name} ({Math.round(f.size / 1024)} KB)
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
        break;
      }
      default:
        control = <p className="text-xs text-neutral-500">Unsupported type</p>;
    }

    return (
      <div key={field.id} className="space-y-1 py-3 border-b border-app-border last:border-0">
        {field.type === 'boolean' ? (
          <div className="flex items-center gap-2">
            {control}
            <label htmlFor={fid} className="text-sm font-bold text-app-text cursor-pointer">
              {field.label}
            </label>
          </div>
        ) : (
          <>
            {baseLabel}
            {field.helpText ? <p className="text-[10px] text-neutral-500 mb-1">{field.helpText}</p> : null}
            {control}
          </>
        )}
        {warn && !err ? <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{warn}</p> : null}
        {field.type === 'date' && liveHint && !warn && !err ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{liveHint}</p>
        ) : null}
        {err ? (
          <p id={`${fid}-err`} className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-6">
      <div>
        <h3 className="text-lg font-black text-app-text">{schema.title}</h3>
        {schema.description ? <p className="text-sm text-neutral-500 mt-1">{schema.description}</p> : null}
      </div>
      {sections.map((sec) => {
        const flds = fieldsBySection.get(sec.id) ?? [];
        if (!flds.length) return null;
        const anyVisible = flds.some((f) => evalShowIf(f.showIf, values));
        if (!anyVisible) return null;
        return (
          <section key={sec.id} className="space-y-1" aria-labelledby={`sec-${sec.id}`}>
            <h4 id={`sec-${sec.id}`} className="text-sm font-black uppercase tracking-wide text-neutral-500 border-b border-app-border pb-2">
              {sec.title}
            </h4>
            <div className="pl-1">{flds.map((f) => renderField(f))}</div>
          </section>
        );
      })}
    </div>
  );
}
