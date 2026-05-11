import { useMemo, useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import type { ServiceQuestionnaireV1, ServiceFieldType, ServiceFieldDef } from '../../../../lib/serviceDefinitionTypes.js';
import { PropertyInspector, defaultPropsForType } from './PropertyInspector.js';
import { defaultFieldForType, deepCloneForm, newSectionId } from './schemaHelpers.js';

type Sel = { kind: 'section' | 'field'; id: string } | null;

export function ServiceFormBuilderModal({
  open,
  schema,
  onChange,
  onClose,
}: {
  open: boolean;
  schema: ServiceQuestionnaireV1;
  onChange: (schema: ServiceQuestionnaireV1) => void;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState<Sel>(null);

  const setSchemaPatched = (fn: (w: ServiceQuestionnaireV1) => ServiceQuestionnaireV1) => {
    onChange(fn(deepCloneForm(schema)));
  };

  const onAddSection = () => {
    setSchemaPatched((w) => {
      const sid = newSectionId();
      w.sections.push({ id: sid, title: 'Section', order: w.sections.length });
      return w;
    });
  };

  const onAddField = (sectionId: string) => {
    setSchemaPatched((w) => {
      const order = w.fields.filter((f) => f.section === sectionId).length;
      w.fields.push(defaultFieldForType('text', sectionId, order));
      return w;
    });
  };

  const onDeleteField = (fid: string) => {
    setSchemaPatched((w) => {
      w.fields = w.fields.filter((f) => f.id !== fid);
      if (selection?.id === fid) setSelection(null);
      return w;
    });
  };

  const onUpdateField = (oldId: string, patch: Partial<ServiceFieldDef>) => {
    setSchemaPatched((w) => {
      const idx = w.fields.findIndex((f) => f.id === oldId);
      if (idx < 0) return w;
      if (patch.id && patch.id !== oldId) {
        const nid = patch.id;
        for (const f of w.fields) {
          if (f.showIf?.fieldId === oldId) {
            f.showIf = { ...f.showIf, fieldId: nid };
          }
        }
      }
      const f = w.fields[idx];
      if (!f) return w;
      if (patch.type != null && patch.type !== f.type) {
        const next = defaultPropsForType(f, patch.type as ServiceFieldType);
        w.fields[idx] = next;
        if (patch.id && patch.id !== oldId) {
          w.fields[idx] = { ...next, id: patch.id };
          if (selection?.kind === 'field' && selection.id === oldId) {
            setSelection({ kind: 'field', id: patch.id });
          }
        }
        return w;
      }
      Object.assign(f, patch);
      if (patch.id) {
        w.fields[idx] = { ...f, id: patch.id };
        if (selection?.kind === 'field' && selection.id === oldId) {
          setSelection({ kind: 'field', id: patch.id! });
        }
      }
      return w;
    });
  };

  const selectedField = useMemo(
    () => (selection?.kind === 'field' ? schema.fields.find((f) => f.id === selection.id) ?? null : null),
    [schema.fields, selection]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-app-border bg-app-card">
        <div className="flex items-center justify-between border-b border-app-border px-5 py-3">
          <h3 className="text-base font-black uppercase tracking-tight text-app-text">Form editor</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-app-border p-2 text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close form editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-12">
          <div className="lg:col-span-3 rounded-2xl border border-app-border bg-app-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-neutral-400">Structure</span>
              <button type="button" onClick={onAddSection} className="text-xs font-bold text-app-text">
                + Section
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1">
              {schema.sections
                .sort((a, b) => a.order - b.order)
                .map((sec) => (
                  <div key={sec.id} className="rounded-xl border border-app-border p-2">
                    <button
                      type="button"
                      className={cn(
                        'w-full rounded-lg px-2 py-1 text-left text-sm font-bold text-app-text',
                        selection?.kind === 'section' && selection.id === sec.id && 'bg-neutral-100 dark:bg-neutral-800'
                      )}
                      onClick={() => setSelection({ kind: 'section', id: sec.id })}
                    >
                      {sec.title}
                    </button>
                    <div className="mt-1 space-y-0.5 pl-2">
                      {schema.fields
                        .filter((f) => f.section === sec.id)
                        .sort((a, b) => a.order - b.order)
                        .map((f) => (
                          <button
                            key={`${f.id}__${f.order}`}
                            type="button"
                            onClick={() => setSelection({ kind: 'field', id: f.id })}
                            className={cn(
                              'flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-xs',
                              selection?.id === f.id && selection.kind === 'field'
                                ? 'bg-neutral-200 dark:bg-neutral-700'
                                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            )}
                          >
                            <GripVertical className="h-3 w-3 shrink-0 text-neutral-400" />
                            <span className="truncate">{f.label}</span>
                          </button>
                        ))}
                      <button
                        type="button"
                        onClick={() => onAddField(sec.id)}
                        className="w-full py-1 pl-2 text-left text-[10px] font-bold text-neutral-500"
                      >
                        + Field
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="lg:col-span-6 min-h-0 rounded-2xl border border-app-border bg-app-card p-4">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-400">Schema title</label>
                <input
                  className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
                  value={schema.title}
                  onChange={(e) => setSchemaPatched((w) => ({ ...w, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-400">AI assist prompt</label>
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
                  value={schema.aiAssistPrompt ?? ''}
                  onChange={(e) =>
                    setSchemaPatched((w) => ({ ...w, aiAssistPrompt: e.target.value || undefined }))
                  }
                  placeholder="Optional instructions for the customer-facing AI coach…"
                />
              </div>
              <p className="text-xs text-neutral-500">Select a field in the left column to edit its settings.</p>
            </div>
          </div>

          <div className="lg:col-span-3 min-h-0 rounded-2xl border border-app-border bg-app-card">
            {selection?.kind === 'section' && (
              <div className="p-4">
                <label className="text-[10px] font-black uppercase text-neutral-400">Section title</label>
                <input
                  className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
                  value={schema.sections.find((s) => s.id === selection.id)?.title ?? ''}
                  onChange={(e) => {
                    const sid = selection.id;
                    setSchemaPatched((w) => {
                      const s = w.sections.find((x) => x.id === sid);
                      if (s) s.title = e.target.value;
                      return w;
                    });
                  }}
                />
              </div>
            )}
            {selection?.kind === 'field' && selectedField && (
              <div className="flex h-full min-h-0 flex-col">
                <PropertyInspector
                  field={selectedField}
                  sections={schema.sections}
                  allFieldIds={schema.fields.map((f) => f.id)}
                  onChange={(patch) => onUpdateField(selectedField.id, patch)}
                  onTypeChange={(t) => onUpdateField(selectedField.id, { type: t })}
                  fieldError={undefined}
                />
                <div className="shrink-0 border-t border-app-border p-4">
                  <button
                    type="button"
                    onClick={() => onDeleteField(selectedField.id)}
                    className="flex w-full min-h-[44px] items-center justify-center rounded-xl border border-red-200 py-2 text-sm font-bold text-red-600 dark:border-red-800"
                  >
                    Delete field
                  </button>
                </div>
              </div>
            )}
            {!selection && <div className="p-6 text-center text-sm text-neutral-500">Select section or field</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
