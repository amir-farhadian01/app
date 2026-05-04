import type { BusinessKycFieldDef, BusinessKycFieldType, BusinessKycFormV1 } from '../../../../../lib/kycTypes';

const FIELD_TYPES: BusinessKycFieldType[] = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'url',
  'select',
  'multiselect',
  'boolean',
  'date',
  'address',
  'file',
];

const MIME_SUGGESTIONS = ['image/*', 'application/pdf', 'image/jpeg', 'image/png'];

type Sel = { kind: 'section'; id: string } | { kind: 'field'; id: string } | null;

export function FieldInspector({
  form,
  selection,
  idError,
  onUpdateSection,
  onUpdateField,
  readOnly,
}: {
  form: BusinessKycFormV1;
  selection: Sel;
  idError: string | null;
  onUpdateSection: (id: string, patch: Partial<BusinessKycFormV1['sections'][0]>) => void;
  onUpdateField: (id: string, patch: Partial<BusinessKycFieldDef>) => void;
  readOnly: boolean;
}) {
  if (!selection) {
    return <p className="text-sm text-neutral-500 p-4">Select a section or field to edit.</p>;
  }

  if (selection.kind === 'section') {
    const sec = form.sections.find((s) => s.id === selection.id);
    if (!sec) return null;
    return (
      <div className="space-y-4 p-4">
        <h3 className="text-xs font-black uppercase text-neutral-400">Section</h3>
        <div>
          <label htmlFor="insp-sec-id" className="block text-xs font-bold text-app-text mb-1">
            Section id
          </label>
          <input
            id="insp-sec-id"
            className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
            value={sec.id}
            onChange={(e) => onUpdateSection(sec.id, { id: e.target.value })}
            disabled={readOnly}
          />
        </div>
        <div>
          <label htmlFor="insp-sec-title" className="block text-xs font-bold text-app-text mb-1">
            Title
          </label>
          <input
            id="insp-sec-title"
            className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
            value={sec.title}
            onChange={(e) => onUpdateSection(sec.id, { title: e.target.value })}
            disabled={readOnly}
          />
        </div>
        <div>
          <label htmlFor="insp-sec-order" className="block text-xs font-bold text-app-text mb-1">
            Order
          </label>
          <input
            id="insp-sec-order"
            type="number"
            className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
            value={sec.order}
            onChange={(e) => onUpdateSection(sec.id, { order: Number(e.target.value) })}
            disabled={readOnly}
          />
        </div>
      </div>
    );
  }

  const field = form.fields.find((f) => f.id === selection.id);
  if (!field) return null;

  const resetTypeProps = (t: BusinessKycFieldType): Partial<BusinessKycFieldDef> => {
    const next: Partial<BusinessKycFieldDef> = { type: t };
    delete (next as { options?: unknown }).options;
    delete (next as { regex?: unknown }).regex;
    delete (next as { regexErrorMessage?: unknown }).regexErrorMessage;
    delete (next as { accept?: unknown }).accept;
    delete (next as { maxFileSizeMb?: unknown }).maxFileSizeMb;
    delete (next as { maxFiles?: unknown }).maxFiles;
    delete (next as { expiryMinMonths?: unknown }).expiryMinMonths;
    delete (next as { inquiry?: unknown }).inquiry;
    delete (next as { min?: unknown }).min;
    delete (next as { max?: unknown }).max;
    if (t === 'select' || t === 'multiselect') {
      next.options = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ];
    }
    if (t === 'file') {
      next.accept = ['application/pdf', 'image/*'];
      next.maxFiles = 1;
      next.maxFileSizeMb = 10;
    }
    return next;
  };

  const otherFieldIds = form.fields.filter((f) => f.id !== field.id).map((f) => f.id);

  return (
    <div className="space-y-3 p-4 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
      <h3 className="text-xs font-black uppercase text-neutral-400">Field</h3>
      <div>
        <label htmlFor="insp-label" className="block text-xs font-bold mb-1">
          Label
        </label>
        <input
          id="insp-label"
          className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
          value={field.label}
          onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
          disabled={readOnly}
        />
      </div>
      <div>
        <label htmlFor="insp-id" className="block text-xs font-bold mb-1">
          Id (slug)
        </label>
        <input
          id="insp-id"
          className={idError ? 'w-full rounded-lg border-2 border-red-500 bg-app-bg px-2 py-1.5 text-sm' : 'w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm'}
          value={field.id}
          onChange={(e) => onUpdateField(field.id, { id: e.target.value })}
          disabled={readOnly}
          aria-invalid={!!idError}
        />
        {idError ? <p className="text-xs text-red-600 mt-1">{idError}</p> : null}
      </div>
      <div>
        <label htmlFor="insp-help" className="block text-xs font-bold mb-1">
          Help text
        </label>
        <input
          id="insp-help"
          className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
          value={field.helpText ?? ''}
          onChange={(e) => onUpdateField(field.id, { helpText: e.target.value || undefined })}
          disabled={readOnly}
        />
      </div>
      <div>
        <label htmlFor="insp-ph" className="block text-xs font-bold mb-1">
          Placeholder
        </label>
        <input
          id="insp-ph"
          className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
          value={field.placeholder ?? ''}
          onChange={(e) => onUpdateField(field.id, { placeholder: e.target.value || undefined })}
          disabled={readOnly}
        />
      </div>
      <div>
        <label htmlFor="insp-type" className="block text-xs font-bold mb-1">
          Type
        </label>
        <select
          id="insp-type"
          className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
          value={field.type}
          onChange={(e) => onUpdateField(field.id, resetTypeProps(e.target.value as BusinessKycFieldType))}
          disabled={readOnly}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdateField(field.id, { required: e.target.checked })}
          disabled={readOnly}
        />
        Required
      </label>
      <div>
        <label htmlFor="insp-sec" className="block text-xs font-bold mb-1">
          Section
        </label>
        <select
          id="insp-sec"
          className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
          value={field.section ?? ''}
          onChange={(e) => onUpdateField(field.id, { section: e.target.value || undefined })}
          disabled={readOnly}
        >
          {form.sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {['text', 'textarea', 'email', 'phone', 'url'].includes(field.type) && (
        <>
          <div>
            <label htmlFor="insp-regex" className="block text-xs font-bold mb-1">
              Regex
            </label>
            <input
              id="insp-regex"
              className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm font-mono text-xs"
              value={field.regex ?? ''}
              onChange={(e) => onUpdateField(field.id, { regex: e.target.value || undefined })}
              disabled={readOnly}
            />
          </div>
          <div>
            <label htmlFor="insp-regex-err" className="block text-xs font-bold mb-1">
              Regex error message
            </label>
            <input
              id="insp-regex-err"
              className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
              value={field.regexErrorMessage ?? ''}
              onChange={(e) => onUpdateField(field.id, { regexErrorMessage: e.target.value || undefined })}
              disabled={readOnly}
            />
          </div>
        </>
      )}

      {(field.type === 'select' || field.type === 'multiselect') && (
        <div className="space-y-2">
          <span className="text-xs font-bold">Options</span>
          {(field.options ?? []).map((opt, i) => (
            <div key={i} className="flex gap-1">
              <input
                aria-label={`Option value ${i + 1}`}
                className="w-1/3 rounded border border-app-border bg-app-bg px-1 py-1 text-xs"
                value={opt.value}
                onChange={(e) => {
                  const o = [...(field.options ?? [])];
                  o[i] = { ...o[i], value: e.target.value };
                  onUpdateField(field.id, { options: o });
                }}
                disabled={readOnly}
              />
              <input
                aria-label={`Option label ${i + 1}`}
                className="flex-1 rounded border border-app-border bg-app-bg px-1 py-1 text-xs"
                value={opt.label}
                onChange={(e) => {
                  const o = [...(field.options ?? [])];
                  o[i] = { ...o[i], label: e.target.value };
                  onUpdateField(field.id, { options: o });
                }}
                disabled={readOnly}
              />
              <button
                type="button"
                aria-label={`Remove option ${i + 1}`}
                className="px-2 text-red-600 text-xs"
                disabled={readOnly}
                onClick={() => {
                  const o = (field.options ?? []).filter((_, j) => j !== i);
                  onUpdateField(field.id, { options: o });
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs font-bold text-blue-600"
            disabled={readOnly}
            onClick={() =>
              onUpdateField(field.id, {
                options: [...(field.options ?? []), { value: `v${Date.now()}`, label: 'New' }],
              })
            }
          >
            + Add option
          </button>
        </div>
      )}

      {field.type === 'number' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="insp-min" className="block text-xs font-bold mb-1">
              Min
            </label>
            <input
              id="insp-min"
              type="number"
              className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1 text-sm"
              value={field.min ?? ''}
              onChange={(e) =>
                onUpdateField(field.id, { min: e.target.value === '' ? undefined : Number(e.target.value) })
              }
              disabled={readOnly}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="insp-max" className="block text-xs font-bold mb-1">
              Max
            </label>
            <input
              id="insp-max"
              type="number"
              className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1 text-sm"
              value={field.max ?? ''}
              onChange={(e) =>
                onUpdateField(field.id, { max: e.target.value === '' ? undefined : Number(e.target.value) })
              }
              disabled={readOnly}
            />
          </div>
        </div>
      )}

      {field.type === 'file' && (
        <>
          <div>
            <label htmlFor="insp-accept" className="block text-xs font-bold mb-1">
              Accept (comma-separated MIME)
            </label>
            <input
              id="insp-accept"
              className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm font-mono text-xs"
              value={(field.accept ?? []).join(', ')}
              onChange={(e) =>
                onUpdateField(field.id, {
                  accept: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              disabled={readOnly}
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {MIME_SUGGESTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="text-[10px] px-1.5 py-0.5 rounded bg-app-bg border border-app-border"
                  disabled={readOnly}
                  onClick={() =>
                    onUpdateField(field.id, {
                      accept: [...new Set([...(field.accept ?? []), m])],
                    })
                  }
                >
                  +{m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="insp-maxmb" className="block text-xs font-bold mb-1">
                Max MB
              </label>
              <input
                id="insp-maxmb"
                type="number"
                className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1 text-sm"
                value={field.maxFileSizeMb ?? ''}
                onChange={(e) =>
                  onUpdateField(field.id, {
                    maxFileSizeMb: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                disabled={readOnly}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="insp-maxf" className="block text-xs font-bold mb-1">
                Max files
              </label>
              <input
                id="insp-maxf"
                type="number"
                className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1 text-sm"
                value={field.maxFiles ?? 1}
                onChange={(e) => onUpdateField(field.id, { maxFiles: Number(e.target.value) || 1 })}
                disabled={readOnly}
              />
            </div>
          </div>
        </>
      )}

      {field.type === 'date' && (
        <div>
          <label htmlFor="insp-expiry" className="block text-xs font-bold mb-1">
            Expiry min months
          </label>
          <input
            id="insp-expiry"
            type="number"
            className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1 text-sm"
            value={field.expiryMinMonths ?? ''}
            onChange={(e) =>
              onUpdateField(field.id, {
                expiryMinMonths: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            disabled={readOnly}
          />
        </div>
      )}

      <div className="border border-app-border rounded-lg p-2 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!field.inquiry}
            onChange={(e) =>
              onUpdateField(field.id, {
                inquiry: e.target.checked
                  ? { providerKey: 'mock-license-registry', payloadFields: [] }
                  : undefined,
              })
            }
            disabled={readOnly}
          />
          Inquiry
        </label>
        {field.inquiry && (
          <>
            <div>
              <label htmlFor="insp-inq-prov" className="block text-xs font-bold mb-1">
                Provider
              </label>
              <select
                id="insp-inq-prov"
                className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1 text-sm"
                value={field.inquiry.providerKey}
                onChange={(e) =>
                  onUpdateField(field.id, {
                    inquiry: { ...field.inquiry!, providerKey: e.target.value },
                  })
                }
                disabled={readOnly}
              >
                <option value="mock-license-registry">mock-license-registry</option>
              </select>
              <p className="text-[10px] text-neutral-500 mt-1">(more providers coming)</p>
            </div>
            <fieldset className="space-y-1">
              <legend className="text-xs font-bold">Payload fields</legend>
              {otherFieldIds.map((oid) => (
                <label key={oid} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={field.inquiry!.payloadFields.includes(oid)}
                    disabled={readOnly}
                    onChange={(e) => {
                      const set = new Set(field.inquiry!.payloadFields);
                      if (e.target.checked) set.add(oid);
                      else set.delete(oid);
                      onUpdateField(field.id, {
                        inquiry: { ...field.inquiry!, payloadFields: [...set] },
                      });
                    }}
                  />
                  {oid}
                </label>
              ))}
            </fieldset>
          </>
        )}
      </div>

      <div className="border border-app-border rounded-lg p-2 space-y-2">
        <span className="text-xs font-bold">showIf</span>
        <div>
          <label htmlFor="insp-sif-f" className="block text-xs mb-1">
            Field id
          </label>
          <select
            id="insp-sif-f"
            className="w-full rounded border border-app-border bg-app-bg px-2 py-1 text-xs"
            value={field.showIf?.fieldId ?? ''}
            onChange={(e) => {
              const fid = e.target.value;
              if (!fid) onUpdateField(field.id, { showIf: undefined });
              else
                onUpdateField(field.id, {
                  showIf: { fieldId: fid, equals: true },
                });
            }}
            disabled={readOnly}
          >
            <option value="">— none —</option>
            {otherFieldIds.map((oid) => (
              <option key={oid} value={oid}>
                {oid}
              </option>
            ))}
          </select>
        </div>
        {field.showIf && (
          <>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name={`sif-mode-${field.id}`}
                checked={'equals' in field.showIf}
                onChange={() => onUpdateField(field.id, { showIf: { fieldId: field.showIf!.fieldId, equals: true } })}
                disabled={readOnly}
              />
              equals
            </label>
            {'equals' in field.showIf && (
              <input
                aria-label="showIf equals value"
                className="w-full rounded border border-app-border bg-app-bg px-2 py-1 text-xs"
                value={String((field.showIf as { equals: unknown }).equals)}
                onChange={(e) => {
                  const raw = e.target.value;
                  let v: unknown = raw;
                  if (raw === 'true') v = true;
                  if (raw === 'false') v = false;
                  if (!Number.isNaN(Number(raw)) && raw !== '') v = Number(raw);
                  onUpdateField(field.id, { showIf: { fieldId: field.showIf!.fieldId, equals: v } });
                }}
                disabled={readOnly}
              />
            )}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name={`sif-mode-${field.id}`}
                checked={'in' in field.showIf}
                onChange={() =>
                  onUpdateField(field.id, { showIf: { fieldId: field.showIf!.fieldId, in: [] } })
                }
                disabled={readOnly}
              />
              in (comma list)
            </label>
            {'in' in field.showIf && (
              <input
                aria-label="showIf in values"
                className="w-full rounded border border-app-border bg-app-bg px-2 py-1 text-xs"
                value={(field.showIf as { in: unknown[] }).in.join(',')}
                onChange={(e) =>
                  onUpdateField(field.id, {
                    showIf: {
                      fieldId: field.showIf!.fieldId,
                      in: e.target.value.split(',').map((s) => s.trim()),
                    },
                  })
                }
                disabled={readOnly}
              />
            )}
          </>
        )}
      </div>

      <div>
        <label htmlFor="insp-cat" className="block text-xs font-bold mb-1">
          Required for categories (comma-separated)
        </label>
        <input
          id="insp-cat"
          className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-sm"
          value={(field.requiredForCategories ?? []).join(', ')}
          onChange={(e) =>
            onUpdateField(field.id, {
              requiredForCategories: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          disabled={readOnly}
        />
        {/* TODO(category-autocomplete): ServiceCatalog/API — FieldInspector.tsx */}
        <p className="text-[10px] text-neutral-500 mt-1">Plain strings for now; autocomplete later.</p>
      </div>
    </div>
  );
}
