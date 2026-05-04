import type { ReactNode } from 'react';
import type { ServiceFieldDef } from '@/lib/serviceDefinitionTypes';
import { PhotoUploader } from './PhotoUploader';
import type { OrderPhotoRow } from '../../services/orders';
import { cn } from '../../lib/utils';

function evalShowIf(
  showIf: ServiceFieldDef['showIf'],
  answers: Record<string, unknown>,
): boolean {
  if (!showIf) return true;
  const v = answers[showIf.fieldId];
  if ('equals' in showIf) return v === showIf.equals;
  if ('in' in showIf && Array.isArray(showIf.in)) return showIf.in.some((x) => x === v);
  return true;
}

const ring =
  'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2 focus:ring-offset-app-card';

export type DynamicFieldRendererProps = {
  field: ServiceFieldDef;
  values: Record<string, unknown>;
  allPhotos: OrderPhotoRow[];
  onChange: (fieldId: string, value: unknown) => void;
  onPhotosForField: (fieldId: string, rows: OrderPhotoRow[]) => void;
  errors: Record<string, string>;
  showErrors: boolean;
};

export function DynamicFieldRenderer({
  field,
  values,
  allPhotos,
  onChange,
  onPhotosForField,
  errors,
  showErrors,
}: DynamicFieldRendererProps) {
  if (!evalShowIf(field.showIf, values)) return null;

  const err = errors[field.id];
  const showErr = showErrors && !!err;
  const v = values[field.id];
  const fid = `ord-f-${field.id}`;

  const label = (
    <label htmlFor={fid} className="block text-[15px] font-bold text-app-text mb-2">
      {field.label}
      {field.required ? (
        <span className="text-red-500 ml-0.5" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );

  let control: ReactNode = null;

  switch (field.type) {
    case 'text':
    case 'address':
      control = (
        <input
          id={fid}
          type="text"
          className={cn(
            'w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text',
            ring,
          )}
          value={v != null ? String(v) : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          aria-invalid={showErr}
        />
      );
      break;
    case 'textarea':
      control = (
        <textarea
          id={fid}
          className={cn(
            'w-full min-h-[120px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text',
            ring,
          )}
          value={v != null ? String(v) : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          aria-invalid={showErr}
        />
      );
      break;
    case 'number':
    case 'measurement_dimensions':
    case 'measurement_weight':
      control = (
        <input
          id={fid}
          type="number"
          className={cn(
            'w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text',
            ring,
          )}
          value={v != null && v !== '' ? String(v) : ''}
          onChange={(e) => onChange(field.id, e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          aria-invalid={showErr}
        />
      );
      break;
    case 'boolean':
      control = (
        <button
          type="button"
          id={fid}
          onClick={() => onChange(field.id, !Boolean(v))}
          className={cn(
            'min-h-[48px] px-6 rounded-2xl font-bold text-[15px] border border-app-border transition-colors',
            v ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-app-input text-app-text',
          )}
          aria-pressed={Boolean(v)}
        >
          {v ? field.trueLabel || 'Yes' : field.falseLabel || 'No'}
        </button>
      );
      break;
    case 'select':
      control = (
        <select
          id={fid}
          className={cn(
            'w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text',
            ring,
          )}
          value={v != null ? String(v) : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-invalid={showErr}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'multiselect': {
      const arr = Array.isArray(v) ? (v as unknown[]).map(String) : [];
      control = (
        <div id={fid} className="space-y-2" role="group">
          {(field.options ?? []).map((o) => {
            const checked = arr.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex items-center gap-3 min-h-[48px] cursor-pointer text-[15px] text-app-text"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? arr.filter((x) => x !== o.value) : [...arr, o.value];
                    onChange(field.id, next);
                  }}
                  className="w-5 h-5 rounded border-app-border"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      );
      break;
    }
    case 'date':
      control = (
        <input
          id={fid}
          type="date"
          className={cn(
            'w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text',
            ring,
          )}
          value={v != null ? String(v).slice(0, 10) : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-invalid={showErr}
        />
      );
      break;
    case 'time':
      control = (
        <input
          id={fid}
          type="time"
          className={cn(
            'w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text',
            ring,
          )}
          value={v != null ? String(v) : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-invalid={showErr}
        />
      );
      break;
    case 'datetime':
      control = (
        <input
          id={fid}
          type="datetime-local"
          className={cn(
            'w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text',
            ring,
          )}
          value={v != null ? String(v) : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-invalid={showErr}
        />
      );
      break;
    case 'measurement_color':
      control = (
        <input
          id={fid}
          type="text"
          className={cn(
            'w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text',
            ring,
          )}
          value={v != null && typeof v === 'object' ? JSON.stringify(v) : v != null ? String(v) : ''}
          onChange={(e) => {
            try {
              onChange(field.id, JSON.parse(e.target.value) as unknown);
            } catch {
              onChange(field.id, e.target.value);
            }
          }}
          placeholder={field.placeholder || '{"hex":"#000000"}'}
          aria-invalid={showErr}
        />
      );
      break;
    case 'photo': {
      const fieldPhotos = allPhotos.filter((p) => p.fieldId === field.id);
      control = (
        <PhotoUploader
          value={fieldPhotos}
          onChange={(rows) => onPhotosForField(field.id, rows)}
          maxFiles={field.maxFiles ?? 4}
          maxFileSizeMb={field.maxFileSizeMb ?? 10}
          accept={field.accept?.length ? field.accept : ['image/*']}
          fieldId={field.id}
        />
      );
      break;
    }
    default:
      control = (
        <input
          id={fid}
          type="text"
          className={cn(
            'w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text',
            ring,
          )}
          value={v != null ? String(v) : ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      );
  }

  return (
    <div className="space-y-1">
      {label}
      {field.helpText ? <p className="text-xs text-neutral-500 mb-2">{field.helpText}</p> : null}
      {control}
      {showErr ? (
        <p id={`${fid}-err`} className="text-sm text-red-600 mt-1" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
