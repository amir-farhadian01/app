import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ServiceFieldDef, ServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes';
import { validateServiceAnswers } from '../../../../lib/serviceQuestionnaireValidate';
import type { ServiceUploadRow } from '../../../../lib/serviceQuestionnaireValidate';

const inputClass =
  'w-full min-h-[44px] rounded-xl border border-app-border bg-app-input px-3 py-2.5 text-sm text-app-text ' +
  'focus:outline-none focus:ring-2 focus:ring-neutral-900';

function evalShowIf(
  showIf: ServiceFieldDef['showIf'],
  answers: Record<string, unknown>
): boolean {
  if (!showIf) return true;
  const v = answers[showIf.fieldId];
  if ('equals' in showIf) return v === showIf.equals;
  if ('in' in showIf && Array.isArray(showIf.in)) return showIf.in.some((x) => x === v);
  return true;
}

function isFieldVisibleInPreview(
  field: ServiceFieldDef,
  schema: ServiceQuestionnaireV1,
  answers: Record<string, unknown>
): boolean {
  const byId = new Map(schema.fields.map((f) => [f.id, f]));
  const visiting = new Set<string>();
  function walk(f: ServiceFieldDef): boolean {
    if (visiting.has(f.id)) return false;
    if (!f.showIf) return true;
    visiting.add(f.id);
    const parent = byId.get(f.showIf.fieldId);
    if (!parent) {
      visiting.delete(f.id);
      return false;
    }
    const ok = walk(parent) && evalShowIf(f.showIf, answers);
    visiting.delete(f.id);
    return ok;
  }
  return walk(field);
}

type Props = {
  schema: ServiceQuestionnaireV1;
  values: Record<string, unknown>;
  files: Record<string, File[]>;
  errors: Record<string, string>;
  onChange: (fieldId: string, value: unknown) => void;
  onFilesChange: (fieldId: string, files: File[]) => void;
  fakeCategoryTags?: string[];
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileLocalThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [file]);
  if (!url) {
    return <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-app-border" />;
  }
  return <img src={url} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-app-border object-cover" />;
}

function formatDateFromMs(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '';
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function msToDatetimeLocal(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function minutesToTimeInput(m: number | undefined): string {
  if (m == null || !Number.isFinite(m)) return '';
  const h = Math.floor(m / 60) % 24;
  const min = Math.floor(m) % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function timeInputToMinutes(s: string): number | undefined {
  if (!s) return undefined;
  const p = s.split(':').map((x) => parseInt(x, 10));
  const h = p[0];
  const m = p[1];
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
  return h * 60 + m;
}

function parseDim(
  v: unknown
): { w?: number; h?: number; d?: number; unit?: 'cm' | 'in' } {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as { w?: number; h?: number; d?: number; unit?: 'cm' | 'in' };
  }
  return {};
}

export function PreviewAsCustomer({
  schema,
  values,
  files,
  errors,
  onChange,
  onFilesChange,
  fakeCategoryTags,
}: Props) {
  const sorted = useMemo(
    () => [...schema.fields].sort((a, b) => a.order - b.order),
    [schema.fields]
  );

  const uploadRows: ServiceUploadRow[] = useMemo(() => {
    const out: ServiceUploadRow[] = [];
    for (const [fieldId, list] of Object.entries(files)) {
      for (const file of list) {
        out.push({
          fieldId,
          url: '',
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        });
      }
    }
    return out;
  }, [files]);

  const validation = useMemo(
    () => validateServiceAnswers(schema, values, uploadRows, new Date()),
    [schema, values, uploadRows]
  );
  const mergedErrors = { ...errors, ...validation.errors };

  return (
    <div className="mx-auto max-w-xl space-y-6 text-app-text">
      {schema.aiAssistPrompt && (
        <div
          className={cn(
            'flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950',
            'dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100'
          )}
        >
          <Sparkles className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-200">AI coach</p>
            <p className="mt-1 font-medium">{schema.aiAssistPrompt}</p>
            <p className="mt-2 text-xs text-amber-700/90 dark:text-amber-300/90">AI assist will run in production — preview only.</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-black text-app-text">{schema.title}</h3>
        {schema.description && <p className="mt-1 text-sm text-neutral-500">{schema.description}</p>}
      </div>

      {fakeCategoryTags && fakeCategoryTags.length > 0 && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Category tags: {fakeCategoryTags.join(', ')}
        </p>
      )}

      {schema.sections
        .sort((a, b) => a.order - b.order)
        .map((sec) => {
          const secFields = sorted.filter(
            (f) => f.section === sec.id && isFieldVisibleInPreview(f, schema, values)
          );
          if (secFields.length === 0) return null;
          return (
            <div key={sec.id} className="space-y-4">
              <h4 className="border-b border-app-border pb-2 text-xs font-black uppercase tracking-widest text-neutral-400">
                {sec.title}
              </h4>
              {secFields.map((f) => (
                <FieldBlock
                  key={f.id}
                  field={f}
                  value={values[f.id]}
                  fileList={files[f.id] ?? []}
                  err={mergedErrors[f.id]}
                  onValue={(v) => onChange(f.id, v)}
                  onFiles={(fl) => onFilesChange(f.id, fl ? Array.from(fl) : [])}
                />
              ))}
            </div>
          );
        })}
    </div>
  );
}

function FieldBlock({
  field,
  value,
  fileList,
  err,
  onValue,
  onFiles,
}: {
  field: ServiceFieldDef;
  value: unknown;
  fileList: File[];
  err?: string;
  onValue: (v: unknown) => void;
  onFiles: (f: FileList | null) => void;
}) {
  const fid = `pv-${field.id}`;
  const helpClass = 'text-xs text-neutral-500';
  const errClass = 'text-xs font-bold text-red-600';

  const labelId = `${fid}-l`;
  const labelBlock = (
    <p
      className="mb-1 min-h-[22px] text-xs font-black uppercase tracking-widest text-app-text"
      id={labelId}
    >
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
    </p>
  );

  const renderSwitch = () => {
    const t = field.type;
    switch (t) {
      case 'text':
        return (
          <input
            id={fid}
            type="text"
            maxLength={field.maxLength ?? undefined}
            placeholder={field.placeholder}
            className={inputClass}
            value={String(value ?? '')}
            onChange={(e) => onValue(e.target.value)}
            autoComplete="on"
          />
        );
      case 'textarea':
        return (
          <textarea
            id={fid}
            rows={4}
            maxLength={field.maxLength ?? undefined}
            placeholder={field.placeholder}
            className={inputClass + ' min-h-[120px] resize-y py-2'}
            value={String(value ?? '')}
            onChange={(e) => onValue(e.target.value)}
          />
        );
      case 'number':
        return (
          <input
            id={fid}
            type="number"
            min={field.min}
            max={field.max}
            step={field.integerOnly ? 1 : 'any'}
            placeholder={field.placeholder}
            className={inputClass}
            value={value === undefined || value === null || value === '' ? '' : String(value)}
            onChange={(e) => {
              const raw = e.target.value === '' ? undefined : parseFloat(e.target.value);
              if (raw === undefined) {
                onValue(undefined);
                return;
              }
              onValue(field.integerOnly ? Math.trunc(raw) : raw);
            }}
          />
        );
      case 'select':
        return (
          <select
            id={fid}
            className={inputClass}
            value={String(value ?? '')}
            onChange={(e) => onValue(e.target.value)}
          >
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case 'multiselect':
        return (
          <div role="group" className="space-y-2" aria-labelledby={`${fid}-l`}>
            {(field.options ?? []).map((o) => {
              const arr = (Array.isArray(value) ? value : []) as string[];
              const on = arr.includes(o.value);
              const cb = `${fid}-opt-${o.value}`;
              return (
                <label key={o.value} htmlFor={cb} className="flex min-h-[44px] items-center gap-2 text-sm text-app-text">
                  <input
                    id={cb}
                    type="checkbox"
                    className="h-4 w-4"
                    checked={on}
                    onChange={() => {
                      onValue(on ? arr.filter((x) => x !== o.value) : [...arr, o.value]);
                    }}
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        );
      case 'boolean':
        return (
          <div className="flex min-h-[44px] items-center gap-2" aria-labelledby={labelId}>
            <input
              id={fid}
              type="checkbox"
              className="h-4 w-4"
              checked={value === true}
              onChange={(e) => onValue(e.target.checked)}
              aria-label={`${field.label} — ${value === true ? field.trueLabel ?? 'Yes' : field.falseLabel ?? 'No'}`}
            />
            <label htmlFor={fid} className="text-sm font-bold text-app-text">
              {value === true ? field.trueLabel ?? 'Yes' : field.falseLabel ?? 'No'}
            </label>
          </div>
        );
      case 'date':
        return (
          <input
            id={fid}
            type="date"
            min={field.min != null ? formatDateFromMs(field.min) : undefined}
            max={field.max != null ? formatDateFromMs(field.max) : undefined}
            className={inputClass}
            value={String(value ?? '')}
            onChange={(e) => onValue(e.target.value)}
          />
        );
      case 'time':
        return (
          <input
            id={fid}
            type="time"
            min={field.min != null ? minutesToTimeInput(field.min) : undefined}
            max={field.max != null ? minutesToTimeInput(field.max) : undefined}
            className={inputClass}
            value={String(value ?? '')}
            onChange={(e) => onValue(e.target.value)}
          />
        );
      case 'datetime':
        return (
          <input
            id={fid}
            type="datetime-local"
            min={field.min != null ? msToDatetimeLocal(field.min) : undefined}
            max={field.max != null ? msToDatetimeLocal(field.max) : undefined}
            className={inputClass}
            value={String(value ?? '')}
            onChange={(e) => onValue(e.target.value)}
          />
        );
      case 'address':
        return (
          <input
            id={fid}
            type="text"
            autoComplete="street-address"
            className={inputClass}
            value={String(value ?? '')}
            onChange={(e) => onValue(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength ?? undefined}
          />
        );
      case 'photo': {
        const acc = (field.accept?.length ? field.accept.join(',') : undefined) || 'image/*';
        const maxF = field.maxFiles ?? 1;
        return (
          <div className="space-y-2">
            <input
              id={fid}
              type="file"
              accept={acc}
              multiple={maxF > 1}
              className={cn(
                'min-h-[44px] w-full text-sm text-app-text file:mr-3 file:rounded-lg file:border-0',
                'file:bg-app-border file:px-3 file:py-2.5 file:text-app-text'
              )}
              onChange={(e) => onFiles(e.target.files)}
            />
            {fileList.length > 0 && (
              <ul className="space-y-2">
                {fileList.map((f, i) => (
                  <li
                    key={f.name + f.size + i}
                    className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card p-2"
                  >
                    <FileLocalThumb file={f} />
                    <div className="min-w-0 flex-1 text-xs text-app-text">
                      <p className="truncate font-bold">{f.name}</p>
                      <p className="text-neutral-500">{formatBytes(f.size)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-neutral-500">Preview only — not uploaded from this screen.</p>
          </div>
        );
      }
      case 'measurement_dimensions': {
        const o = parseDim(value);
        const u = o.unit ?? field.dimensionUnit ?? 'cm';
        const setN = (k: 'w' | 'h' | 'd', s: string) => {
          const n = s === '' ? undefined : parseFloat(s);
          onValue({ w: o.w, h: o.h, d: o.d, [k]: n, unit: u });
        };
        return (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              {(
                [
                  { k: 'w' as const, L: 'Width' },
                  { k: 'h' as const, L: 'Height' },
                  { k: 'd' as const, L: 'Depth' },
                ]
              ).map(({ k, L }) => {
                const idk = `${fid}-${k}`;
                return (
                  <div key={k} className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-neutral-500">{L}</span>
                    <input
                      id={idk}
                      type="number"
                      className={cn(inputClass, 'mt-0.5')}
                      value={o[k] == null || Number.isNaN(o[k] as number) ? '' : String(o[k])}
                      onChange={(e) => setN(k, e.target.value)}
                      min={field.min}
                      max={field.max}
                      step={field.integerOnly ? 1 : 'any'}
                    />
                  </div>
                );
              })}
              <span
                className="inline-flex min-h-[44px] min-w-[48px] shrink-0 items-center justify-center self-end rounded-full border border-app-border bg-app-input px-3 text-xs font-black text-app-text"
                title="Unit"
              >
                {u}
              </span>
            </div>
          </div>
        );
      }
      case 'measurement_weight': {
        const wv =
          value && typeof value === 'object' && !Array.isArray(value)
            ? (value as { weight?: number; unit?: 'kg' | 'lb' })
            : {};
        const unit = wv.unit ?? field.weightUnit ?? 'kg';
        const wNum = wv.weight;
        return (
          <div className="flex min-h-[44px] flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <input
                id={fid}
                type="number"
                className={inputClass}
                value={wNum == null || Number.isNaN(wNum) ? '' : String(wNum)}
                onChange={(e) => {
                  const raw = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  onValue({ weight: raw, unit });
                }}
                min={field.min}
                max={field.max}
                step={field.integerOnly ? 1 : 'any'}
              />
            </div>
            <select
              className={cn(inputClass, 'max-w-[120px] shrink-0')}
              aria-label="Weight unit"
              value={unit}
              onChange={(e) => {
                const u = e.target.value as 'kg' | 'lb';
                onValue({ weight: wv.weight, unit: u });
              }}
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
        );
      }
      case 'measurement_color': {
        const str = typeof value === 'string' ? value : '#000000';
        const hex = /^#([0-9a-f]{6})$/i.test(str) ? str : '#000000';
        return (
          <div className="flex min-h-[44px] items-center gap-3">
            <input
              id={fid}
              type="color"
              className="h-11 w-14 cursor-pointer rounded border border-app-border bg-transparent p-0.5"
              value={hex}
              onChange={(e) => onValue(e.target.value.toLowerCase())}
            />
            <span className="select-all font-mono text-sm text-app-text" aria-label="Hex value (readonly)">
              {str.startsWith('#') ? str : hex}
            </span>
          </div>
        );
      }
      default:
        return <p className="text-sm text-amber-600">Unsupported type: {String(t)}</p>;
    }
  };

  return (
    <div className="space-y-1.5">
      {labelBlock}
      {field.helpText && <p className={helpClass}>{field.helpText}</p>}
      {renderSwitch()}
      {err && <p className={errClass}>{err}</p>}
    </div>
  );
}
