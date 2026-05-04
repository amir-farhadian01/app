import { type DragEvent } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ServiceFieldDef, ServiceFieldType } from '../../../../lib/serviceDefinitionTypes';
import { fieldAfterTypeChange, slugifyLabel } from './schemaHelpers';
import { SERVICE_FIELD_TYPES } from './serviceFieldTypeOptions';

type SectionOpt = { id: string; title: string; order: number };

export function defaultPropsForType(current: ServiceFieldDef, newType: ServiceFieldType): ServiceFieldDef {
  return fieldAfterTypeChange(current, newType);
}

const inputClass =
  'mt-1 w-full min-h-[44px] rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text ' +
  'focus:outline-none focus:ring-2 focus:ring-neutral-900';

const labelClass = 'text-[10px] font-black uppercase text-neutral-400';

type Props = {
  field: ServiceFieldDef;
  sections: SectionOpt[];
  allFieldIds: string[];
  onChange: (patch: Partial<ServiceFieldDef>) => void;
  onTypeChange: (newType: ServiceFieldType) => void;
  fieldError?: string;
};

function OptionsEditor({ field, onChange }: { field: ServiceFieldDef; onChange: (p: Partial<ServiceFieldDef>) => void }) {
  const opts = field.options ?? [];
  const setOpts = (next: { value: string; label: string }[]) => onChange({ options: next });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= opts.length) return;
    const next = [...opts];
    const [row] = next.splice(from, 1);
    if (!row) return;
    next.splice(to, 0, row);
    setOpts(next);
  };
  return (
    <div className="space-y-2">
      {opts.map((o, i) => (
        <div
          key={`${i}-${o.value}`}
          className="flex min-h-[44px] items-center gap-1 rounded-lg border border-app-border bg-app-input/50 p-1"
          draggable
          onDragStart={(e: DragEvent) => {
            e.dataTransfer.setData('text/plain', String(i));
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData('text/plain'));
            if (Number.isNaN(from)) return;
            move(from, i);
          }}
        >
          <span
            className="cursor-grab p-1 text-neutral-400"
            title="Drag to reorder"
            role="img"
            aria-label="Drag handle"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
            <div>
              <label className="sr-only" htmlFor={`optv-${field.id}-${i}`}>
                Option value
              </label>
              <input
                id={`optv-${field.id}-${i}`}
                className="w-full min-h-[40px] rounded border border-app-border bg-app-input px-2 py-1 text-xs"
                placeholder="value (unique)"
                value={o.value}
                onChange={(e) => {
                  const next = opts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x));
                  onChange({ options: next });
                }}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor={`optl-${field.id}-${i}`}>
                Option label
              </label>
              <input
                id={`optl-${field.id}-${i}`}
                className="w-full min-h-[40px] rounded border border-app-border bg-app-input px-2 py-1 text-xs"
                placeholder="label"
                value={o.label}
                onChange={(e) => {
                  const next = opts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x));
                  onChange({ options: next });
                }}
              />
            </div>
          </div>
          <button
            type="button"
            className="min-h-[40px] min-w-[40px] p-1 text-red-500"
            aria-label="Remove option"
            onClick={() => onChange({ options: opts.filter((_, j) => j !== i) })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="flex min-h-[44px] items-center gap-1 text-xs font-bold text-app-text"
        onClick={() => onChange({ options: [...opts, { value: `v${opts.length + 1}`, label: 'Option' }] })}
      >
        <Plus className="h-3.5 w-3.5" /> Add option
      </button>
    </div>
  );
}

function formatMsDate(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return '';
  return new Date(v).toISOString().slice(0, 10);
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

function msToDatetimeLocal(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function regexOk(rx: string | undefined): { ok: boolean; msg: string } {
  if (rx == null || rx === '') return { ok: true, msg: '—' };
  try {
    new RegExp(rx);
    return { ok: true, msg: 'OK' };
  } catch {
    return { ok: false, msg: 'Invalid' };
  }
}

function TypeSpecific({ field, onChange }: { field: ServiceFieldDef; onChange: (p: Partial<ServiceFieldDef>) => void }) {
  const t = field.type;
  if (t === 'text' || t === 'textarea') {
    const re = regexOk(field.regex);
    return (
      <div className="space-y-2">
        <div>
          <label className={labelClass} htmlFor="in-ph">
            Placeholder
          </label>
          <input
            id="in-ph"
            className={inputClass}
            value={field.placeholder ?? ''}
            onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="in-ml">
            Max length
          </label>
          <input
            id="in-ml"
            type="number"
            className={inputClass}
            min={0}
            value={field.maxLength ?? ''}
            onChange={(e) =>
              onChange({ maxLength: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })
            }
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="in-rx">
            Regex
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              id="in-rx"
              className={cn(inputClass, 'mt-0 flex-1 min-w-0 font-mono text-xs')}
              value={field.regex ?? ''}
              onChange={(e) => onChange({ regex: e.target.value || undefined })}
            />
            <span
              className={cn(
                'inline-flex min-h-8 min-w-12 items-center justify-center rounded-full border px-2.5 text-[10px] font-black',
                re.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                  : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200'
              )}
            >
              {re.msg}
            </span>
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="in-rxm">
            Regex error message
          </label>
          <input
            id="in-rxm"
            className={inputClass}
            value={field.regexErrorMessage ?? ''}
            onChange={(e) => onChange({ regexErrorMessage: e.target.value || undefined })}
          />
        </div>
      </div>
    );
  }
  if (t === 'address' || t === 'measurement_color') {
    return null;
  }
  if (t === 'number') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="in-min">
              Min
            </label>
            <input
              id="in-min"
              type="number"
              className={inputClass}
              value={field.min ?? ''}
              onChange={(e) =>
                onChange({ min: e.target.value === '' ? undefined : parseFloat(e.target.value) })
              }
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="in-max">
              Max
            </label>
            <input
              id="in-max"
              type="number"
              className={inputClass}
              value={field.max ?? ''}
              onChange={(e) =>
                onChange({ max: e.target.value === '' ? undefined : parseFloat(e.target.value) })
              }
            />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="in-nph">
            Placeholder
          </label>
          <input
            id="in-nph"
            className={inputClass}
            value={field.placeholder ?? ''}
            onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
          />
        </div>
        <label className="flex min-h-[44px] items-center gap-2 text-sm font-bold text-app-text" htmlFor="in-int">
          <input
            id="in-int"
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(field.integerOnly)}
            onChange={(e) => onChange({ integerOnly: e.target.checked || undefined })}
          />
          Integer only
        </label>
      </div>
    );
  }
  if (t === 'select' || t === 'multiselect') {
    return <OptionsEditor field={field} onChange={onChange} />;
  }
  if (t === 'boolean') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="in-tl">
            True label
          </label>
          <input id="in-tl" className={inputClass} value={field.trueLabel ?? ''} onChange={(e) => onChange({ trueLabel: e.target.value || undefined })} />
        </div>
        <div>
          <label className={labelClass} htmlFor="in-fl">
            False label
          </label>
          <input id="in-fl" className={inputClass} value={field.falseLabel ?? ''} onChange={(e) => onChange({ falseLabel: e.target.value || undefined })} />
        </div>
      </div>
    );
  }
  if (t === 'date') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`pi-dmin-${field.id}`}>
            Min
          </label>
          <input
            id={`pi-dmin-${field.id}`}
            type="date"
            className={inputClass}
            value={formatMsDate(field.min)}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ min: v ? new Date(v + 'T12:00:00').getTime() : undefined });
            }}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`pi-dmax-${field.id}`}>
            Max
          </label>
          <input
            id={`pi-dmax-${field.id}`}
            type="date"
            className={inputClass}
            value={formatMsDate(field.max)}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ max: v ? new Date(v + 'T12:00:00').getTime() : undefined });
            }}
          />
        </div>
      </div>
    );
  }
  if (t === 'time') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="in-tmin">
            Min
          </label>
          <input
            id="in-tmin"
            type="time"
            className={inputClass}
            value={minutesToTimeInput(field.min)}
            onChange={(e) => onChange({ min: timeInputToMinutes(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="in-tmax">
            Max
          </label>
          <input
            id="in-tmax"
            type="time"
            className={inputClass}
            value={minutesToTimeInput(field.max)}
            onChange={(e) => onChange({ max: timeInputToMinutes(e.target.value) })}
          />
        </div>
      </div>
    );
  }
  if (t === 'datetime') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="in-dtmin">
            Min
          </label>
          <input
            id="in-dtmin"
            type="datetime-local"
            className={inputClass}
            value={msToDatetimeLocal(field.min)}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ min: v ? new Date(v).getTime() : undefined });
            }}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="in-dtmax">
            Max
          </label>
          <input
            id="in-dtmax"
            type="datetime-local"
            className={inputClass}
            value={msToDatetimeLocal(field.max)}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ max: v ? new Date(v).getTime() : undefined });
            }}
          />
        </div>
      </div>
    );
  }
  if (t === 'photo') {
    return (
      <div className="space-y-2">
        <div>
          <label className={labelClass} htmlFor="in-acc">
            Accept
          </label>
          <input
            id="in-acc"
            className={inputClass}
            placeholder="image/*,application/pdf"
            value={(field.accept ?? ['image/*']).join(', ')}
            onChange={(e) =>
              onChange({
                accept: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="in-mb">
              Max file size (MB)
            </label>
            <input
              id="in-mb"
              type="number"
              className={inputClass}
              value={field.maxFileSizeMb ?? 10}
              onChange={(e) => onChange({ maxFileSizeMb: parseFloat(e.target.value) || 10 })}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="in-mf">
              Max files
            </label>
            <input
              id="in-mf"
              type="number"
              className={inputClass}
              value={field.maxFiles ?? 1}
              onChange={(e) => onChange({ maxFiles: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            />
          </div>
        </div>
      </div>
    );
  }
  if (t === 'measurement_weight') {
    return (
      <div className="space-y-2">
        <div>
          <label className={labelClass} htmlFor="in-wu">
            Unit
          </label>
          <select
            id="in-wu"
            className={inputClass}
            value={field.weightUnit ?? 'kg'}
            onChange={(e) => onChange({ weightUnit: e.target.value as 'kg' | 'lb' })}
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="in-wmin">
              Min
            </label>
            <input
              id="in-wmin"
              type="number"
              className={inputClass}
              value={field.min ?? ''}
              onChange={(e) =>
                onChange({ min: e.target.value === '' ? undefined : parseFloat(e.target.value) })
              }
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="in-wmax">
              Max
            </label>
            <input
              id="in-wmax"
              type="number"
              className={inputClass}
              value={field.max ?? ''}
              onChange={(e) =>
                onChange({ max: e.target.value === '' ? undefined : parseFloat(e.target.value) })
              }
            />
          </div>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 text-sm" htmlFor="in-wi">
          <input
            id="in-wi"
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(field.integerOnly)}
            onChange={(e) => onChange({ integerOnly: e.target.checked || undefined })}
          />
          Integer only
        </label>
      </div>
    );
  }
  if (t === 'measurement_dimensions') {
    return (
      <div className="space-y-2">
        <div>
          <label className={labelClass} htmlFor="in-du">
            Unit
          </label>
          <select
            id="in-du"
            className={inputClass}
            value={field.dimensionUnit ?? 'cm'}
            onChange={(e) => onChange({ dimensionUnit: e.target.value as 'cm' | 'in' })}
          >
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
        </div>
        <p className="text-xs text-neutral-500">Width, height, and depth are shown as three number inputs in preview.</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor={`pi-mdmin-${field.id}`}>
              Min (per side)
            </label>
            <input
              id={`pi-mdmin-${field.id}`}
              type="number"
              className={inputClass}
              value={field.min ?? ''}
              onChange={(e) =>
                onChange({ min: e.target.value === '' ? undefined : parseFloat(e.target.value) })
              }
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`pi-mdmax-${field.id}`}>
              Max (per side)
            </label>
            <input
              id={`pi-mdmax-${field.id}`}
              type="number"
              className={inputClass}
              value={field.max ?? ''}
              onChange={(e) =>
                onChange({ max: e.target.value === '' ? undefined : parseFloat(e.target.value) })
              }
            />
          </div>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 text-sm" htmlFor={`pi-mdi-${field.id}`}>
          <input
            id={`pi-mdi-${field.id}`}
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(field.integerOnly)}
            onChange={(e) => onChange({ integerOnly: e.target.checked || undefined })}
          />
          Integer only
        </label>
      </div>
    );
  }
  return null;
}

function parseShowIfEqualsRaw(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === '') return '';
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function ShowIfForm({
  field,
  allFieldIds,
  otherFieldIds,
  onChange,
}: {
  field: ServiceFieldDef;
  allFieldIds: string[];
  otherFieldIds: string[];
  onChange: (p: Partial<ServiceFieldDef>) => void;
}) {
  const s = field.showIf;
  const mode: 'equals' | 'in' = s && 'in' in s ? 'in' : 'equals';
  return (
    <div className="space-y-2 rounded-2xl border border-app-border p-3">
      <p className="text-[10px] font-black uppercase text-neutral-400">Show if</p>
      <label className="sr-only" htmlFor="sif-f">
        Controlling field
      </label>
      <select
        id="sif-f"
        className="w-full min-h-[44px] rounded-lg border border-app-border bg-app-input px-2 py-1.5 text-xs text-app-text"
        value={s?.fieldId ?? ''}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) onChange({ showIf: undefined });
          else onChange({ showIf: { fieldId: id, equals: '' } });
        }}
      >
        <option value="">Always</option>
        {otherFieldIds.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      {s && (
        <div className="space-y-2">
          <div>
            <label className={labelClass} htmlFor="sif-op">
              Operator
            </label>
            <select
              id="sif-op"
              className="mt-1 w-full min-h-[40px] rounded-lg border border-app-border bg-app-input px-2 py-1.5 text-xs"
              value={mode}
              onChange={(e) => {
                const m = e.target.value as 'equals' | 'in';
                const sh = field.showIf;
                if (!sh) return;
                if (m === 'equals') onChange({ showIf: { fieldId: sh.fieldId, equals: '' } });
                else onChange({ showIf: { fieldId: sh.fieldId, in: [] } });
              }}
            >
              <option value="equals">equals</option>
              <option value="in">in</option>
            </select>
          </div>
          <div>
            <label className="sr-only" htmlFor="sif-v">
              Value(s)
            </label>
            {mode === 'equals' && 'equals' in s && (
              <input
                id="sif-v"
                className="w-full min-h-[44px] rounded-lg border border-app-border bg-app-input px-2 py-2 text-xs"
                placeholder="value (JSON, true, false, or text)"
                value={(() => {
                  if (typeof s.equals === 'string') return s.equals;
                  return JSON.stringify(s.equals);
                })()}
                onChange={(e) => {
                  const v = parseShowIfEqualsRaw(e.target.value);
                  onChange({ showIf: { fieldId: s.fieldId, equals: v } });
                }}
              />
            )}
            {mode === 'in' && 'in' in s && (
              <input
                id="sif-v"
                className="w-full min-h-[44px] rounded-lg border border-app-border bg-app-input px-2 py-2 text-xs"
                placeholder="comma-separated values"
                value={Array.isArray(s.in) ? s.in.map((x) => String(x)).join(',') : ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange({ showIf: { fieldId: s.fieldId, in: raw.split(',').map((x) => x.trim()) } });
                }}
              />
            )}
          </div>
        </div>
      )}
      {s && !allFieldIds.includes(s.fieldId) && <p className="text-xs text-amber-600">Controlling id is not in this form</p>}
    </div>
  );
}

export function PropertyInspector({ field, sections, allFieldIds, onChange, onTypeChange, fieldError }: Props) {
  const dup = allFieldIds.filter((id) => id === field.id).length > 1;
  const otherFieldIds = allFieldIds.filter((id) => id !== field.id);
  const sectionOpts = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="max-h-[min(80vh,900px)] space-y-4 overflow-y-auto p-4">
      <div>
        <label className={labelClass} htmlFor="pi-id">
          Field id
        </label>
        <input
          id="pi-id"
          className={cn(inputClass, 'mt-1 font-mono text-xs')}
          value={field.id}
          onChange={(e) => onChange({ id: e.target.value.trim() })}
          onBlur={() => {
            if (!field.id.trim() && field.label.trim()) onChange({ id: slugifyLabel(field.label) });
          }}
        />
        {(fieldError || dup) && <p className="mt-1 text-xs text-red-600">{fieldError || 'Duplicate id'}</p>}
      </div>
      <div>
        <label className={labelClass} htmlFor="pi-lbl">
          Label
        </label>
        <input
          id="pi-lbl"
          className={inputClass}
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          onBlur={() => {
            if (!field.id.trim() && field.label.trim()) onChange({ id: slugifyLabel(field.label) });
          }}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="pi-help">
          Help text
        </label>
        <textarea
          id="pi-help"
          rows={2}
          className={inputClass + ' min-h-[72px] resize-y py-2'}
          value={field.helpText ?? ''}
          onChange={(e) => onChange({ helpText: e.target.value || undefined })}
        />
      </div>
      <label className="flex min-h-[44px] items-center gap-2 text-sm font-bold text-app-text" htmlFor="pi-req">
        <input
          id="pi-req"
          type="checkbox"
          className="h-4 w-4"
          checked={field.required}
          onChange={(e) => onChange({ required: e.target.checked })}
        />
        Required
      </label>
      <div>
        <label className={labelClass} htmlFor="pi-sec">
          Section
        </label>
        <select
          id="pi-sec"
          className={inputClass}
          value={field.section ?? ''}
          onChange={(e) => onChange({ section: e.target.value || undefined })}
        >
          {sectionOpts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="pi-typ">
          Type
        </label>
        <select
          id="pi-typ"
          className={inputClass}
          value={field.type}
          onChange={(e) => onTypeChange(e.target.value as ServiceFieldType)}
        >
          {SERVICE_FIELD_TYPES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>

      <TypeSpecific field={field} onChange={onChange} />
      <ShowIfForm
        field={field}
        allFieldIds={allFieldIds}
        otherFieldIds={otherFieldIds}
        onChange={onChange}
      />
    </div>
  );
}
