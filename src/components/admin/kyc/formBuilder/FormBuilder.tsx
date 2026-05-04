import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Copy,
  Rocket,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { DragEvent } from 'react';
import { cn } from '../../../../lib/utils';
import { useAuth } from '../../../../lib/AuthContext';
import {
  createFormSchemaDraft,
  deleteFormSchema,
  getActiveFormSchema,
  listBusiness,
  listFormSchemas,
  publishFormSchema,
  updateFormSchemaDraft,
  type FormSchemaRow,
} from '../../../../services/adminKyc';
import type { BusinessKycFieldDef, BusinessKycFieldType, BusinessKycFormV1 } from '../../../../../lib/kycTypes';
import { BusinessKycFormRenderer, validateBusinessKycAnswers } from '../../../kyc/BusinessKycFormRenderer';
import { FieldInspector } from './FieldInspector';
import {
  deepCloneForm,
  diffFields,
  emptyForm,
  slugifyLabel,
  validateSchemaStructure,
  defaultFieldForType,
} from './schemaHelpers';

type BuilderTab = 'schema' | 'preview' | 'json';
type Sel = { kind: 'section'; id: string } | { kind: 'field'; id: string } | null;

export function FormBuilder({
  showSuccess,
  setNotification,
}: {
  showSuccess: (m: string) => void;
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
}) {
  const { user } = useAuth();
  const canPublish = ['owner', 'platform_admin'].includes(user?.role ?? '');

  const [rows, setRows] = useState<FormSchemaRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState<BusinessKycFormV1>(emptyForm());
  const [selection, setSelection] = useState<Sel>(null);
  const [builderTab, setBuilderTab] = useState<BuilderTab>('schema');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [structErrors, setStructErrors] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [refByVersion, setRefByVersion] = useState<Map<number, number>>(new Map());
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});
  const [previewFiles, setPreviewFiles] = useState<Record<string, File[]>>({});
  const [previewCats, setPreviewCats] = useState<string[]>(['construction']);
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [kbGrab, setKbGrab] = useState<{ kind: 'field' | 'section'; id: string } | null>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const userDirty = useRef(false);
  const prevSelectedIdRef = useRef<string | null>(null);
  const lastHydratedKey = useRef('');

  const selectedRow = rows.find((r) => r.id === selectedId);
  const isDraftMode = !!selectedRow && !selectedRow.isActive;
  const activeRow = rows.find((r) => r.isActive);

  const loadAll = useCallback(async () => {
    try {
      const [list, biz] = await Promise.all([
        listFormSchemas(),
        listBusiness({ page: 1, pageSize: 500, status: ['pending', 'approved', 'rejected', 'resubmit_requested'] }),
      ]);
      setRows(list.rows);
      const m = new Map<number, number>();
      for (const r of biz.rows) {
        m.set(r.schemaVersion, (m.get(r.schemaVersion) ?? 0) + 1);
      }
      setRefByVersion(m);
      return list.rows;
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Load failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
      return [];
    }
  }, [setNotification]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!rows.length) return;
    setSelectedId((prev) => {
      if (prev && rows.some((r) => r.id === prev)) return prev;
      return (rows.find((x) => !x.isActive) ?? rows[0]).id;
    });
  }, [rows]);

  useEffect(() => {
    if (!selectedId) return;
    const row = rows.find((r) => r.id === selectedId);
    if (!row) return;
    const key = `${row.id}:${row.updatedAt}`;
    const selectionChanged = prevSelectedIdRef.current !== selectedId;
    prevSelectedIdRef.current = selectedId;
    if (!selectionChanged && key === lastHydratedKey.current) return;
    lastHydratedKey.current = key;
    userDirty.current = false;
    setWorking(deepCloneForm(row.schema));
    setJsonText(JSON.stringify(row.schema, null, 2));
    setSelection(null);
  }, [selectedId, rows]);

  const revalidate = useCallback((form: BusinessKycFormV1) => {
    setStructErrors(validateSchemaStructure(form));
  }, []);

  useEffect(() => {
    revalidate(working);
  }, [working, revalidate]);

  useEffect(() => {
    if (builderTab === 'preview') {
      const { errors } = validateBusinessKycAnswers(working, previewValues, previewFiles, previewCats);
      setPreviewErrors(errors);
    }
  }, [builderTab, working, previewValues, previewFiles, previewCats]);

  const idLiveError = useMemo(() => {
    if (selection?.kind !== 'field') return null;
    const f = working.fields.find((x) => x.id === selection.id);
    if (!f) return null;
    const dup = working.fields.filter((x) => x.id === f.id).length > 1;
    return dup ? 'Duplicate id' : null;
  }, [working.fields, selection]);

  useEffect(() => {
    if (!userDirty.current) return;
    if (!isDraftMode || !selectedId || structErrors.length) return;
    const t = setTimeout(async () => {
      if (!userDirty.current) return;
      setSaveState('saving');
      try {
        await updateFormSchemaDraft(selectedId, { schema: working });
        userDirty.current = false;
        setSaveState('saved');
        void loadAll();
        setTimeout(() => setSaveState('idle'), 2000);
      } catch (e) {
        setSaveState('idle');
        setNotification({ show: true, message: e instanceof Error ? e.message : 'Save failed', type: 'error' });
        setTimeout(() => setNotification(null), 4000);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [working, isDraftMode, selectedId, structErrors.length, loadAll, setNotification]);

  const setWorkingPatched = (fn: (w: BusinessKycFormV1) => BusinessKycFormV1) => {
    userDirty.current = true;
    setWorking((w) => fn(deepCloneForm(w)));
  };

  const onUpdateSection = (oldId: string, patch: Partial<BusinessKycFormV1['sections'][0]>) => {
    setWorkingPatched((w) => {
      const s = w.sections.find((x) => x.id === oldId);
      if (!s) return w;
      if (patch.id && patch.id !== oldId) {
        for (const f of w.fields) {
          if (f.section === oldId) f.section = patch.id;
        }
        s.id = patch.id;
        if (selection?.kind === 'section' && selection.id === oldId) {
          setSelection({ kind: 'section', id: patch.id });
        }
      }
      Object.assign(s, patch);
      return w;
    });
  };

  const onUpdateField = (oldId: string, patch: Partial<BusinessKycFieldDef>) => {
    setWorkingPatched((w) => {
      const idx = w.fields.findIndex((f) => f.id === oldId);
      if (idx < 0) return w;
      if (patch.id && patch.id !== oldId) {
        const nid = patch.id;
        for (const f of w.fields) {
          if (f.showIf?.fieldId === oldId) {
            f.showIf = { ...f.showIf, fieldId: nid };
          }
          if (f.inquiry?.payloadFields) {
            f.inquiry = {
              ...f.inquiry,
              payloadFields: f.inquiry.payloadFields.map((p) => (p === oldId ? nid : p)),
            };
          }
        }
        if (selection?.kind === 'field' && selection.id === oldId) {
          setSelection({ kind: 'field', id: nid });
        }
      }
      w.fields[idx] = { ...w.fields[idx], ...patch };
      return w;
    });
  };

  const addSection = () => {
    setWorkingPatched((w) => {
      const id = `sec_${Date.now()}`;
      const order = Math.max(-1, ...w.sections.map((s) => s.order)) + 1;
      w.sections.push({ id, title: 'New section', order });
      return w;
    });
  };

  const addField = (sectionId: string) => {
    setWorkingPatched((w) => {
      const inSec = w.fields.filter((f) => f.section === sectionId);
      const order = inSec.length ? Math.max(...inSec.map((f) => f.order)) + 1 : 0;
      const f = defaultFieldForType('text', sectionId, order);
      f.id = slugifyLabel(f.label) + '_' + Date.now().toString(36);
      w.fields.push(f);
      setSelection({ kind: 'field', id: f.id });
      return w;
    });
  };

  const removeField = (fid: string) => {
    setWorkingPatched((w) => {
      w.fields = w.fields.filter((f) => f.id !== fid);
      if (selection?.kind === 'field' && selection.id === fid) setSelection(null);
      return w;
    });
  };

  const removeSection = (sid: string) => {
    setWorkingPatched((w) => {
      w.sections = w.sections.filter((s) => s.id !== sid);
      w.fields = w.fields.filter((f) => f.section !== sid);
      if (selection?.kind === 'section' && selection.id === sid) setSelection(null);
      return w;
    });
  };

  const moveField = (fieldId: string, dir: -1 | 1) => {
    setWorkingPatched((w) => {
      const f = w.fields.find((x) => x.id === fieldId);
      if (!f || !f.section) return w;
      const group = w.fields
        .filter((x) => x.section === f.section)
        .sort((a, b) => a.order - b.order);
      const i = group.findIndex((x) => x.id === fieldId);
      const j = i + dir;
      if (j < 0 || j >= group.length) return w;
      const a = group[i];
      const b = group[j];
      const tmp = a.order;
      a.order = b.order;
      b.order = tmp;
      return w;
    });
  };

  const moveSection = (sectionId: string, dir: -1 | 1) => {
    setWorkingPatched((w) => {
      const sorted = [...w.sections].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((s) => s.id === sectionId);
      const j = i + dir;
      if (j < 0 || j >= sorted.length) return w;
      const tmp = sorted[i].order;
      sorted[i].order = sorted[j].order;
      sorted[j].order = tmp;
      w.sections = sorted;
      return w;
    });
  };

  const onDragStartField = (e: DragEvent, fieldId: string) => {
    e.dataTransfer.setData('kycField', fieldId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropField = (e: DragEvent, targetFieldId: string, sectionId: string) => {
    e.preventDefault();
    const src = e.dataTransfer.getData('kycField');
    if (!src || src === targetFieldId) return;
    setWorkingPatched((w) => {
      const sf = w.fields.find((x) => x.id === src);
      const tf = w.fields.find((x) => x.id === targetFieldId);
      if (!sf || !tf) return w;
      sf.section = sectionId;
      const group = w.fields.filter((x) => x.section === sectionId).sort((a, b) => a.order - b.order);
      const si = group.findIndex((x) => x.id === src);
      const ti = group.findIndex((x) => x.id === targetFieldId);
      if (si < 0 || ti < 0) return w;
      const a = group[si];
      const b = group[ti];
      const tmp = a.order;
      a.order = b.order;
      b.order = tmp;
      return w;
    });
  };

  const onDragStartSection = (e: DragEvent, sectionId: string) => {
    e.dataTransfer.setData('kycSection', sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropSection = (e: DragEvent, targetSectionId: string) => {
    e.preventDefault();
    const src = e.dataTransfer.getData('kycSection');
    if (!src || src === targetSectionId) return;
    setWorkingPatched((w) => {
      const sorted = [...w.sections].sort((a, b) => a.order - b.order);
      const si = sorted.findIndex((s) => s.id === src);
      const ti = sorted.findIndex((s) => s.id === targetSectionId);
      if (si < 0 || ti < 0) return w;
      const [removed] = sorted.splice(si, 1);
      sorted.splice(ti, 0, removed);
      sorted.forEach((s, idx) => {
        const sec = w.sections.find((x) => x.id === s.id);
        if (sec) sec.order = idx;
      });
      return w;
    });
  };

  const handleNewDraft = async () => {
    try {
      let schema: BusinessKycFormV1;
      if (activeRow) {
        schema = deepCloneForm(activeRow.schema);
      } else {
        try {
          const a = await getActiveFormSchema();
          schema = deepCloneForm(a.schema);
        } catch {
          schema = emptyForm();
        }
      }
      const baseTitle = schema.title.replace(/\s*\(draft\)\s*$/i, '').trim() || 'Business KYC';
      schema.title = `${baseTitle} (draft)`;
      const created = await createFormSchemaDraft({ schema, description: 'New draft' });
      await loadAll();
      setSelectedId(created.id);
      showSuccess(`Draft v${created.version} created`);
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Create failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedRow) return;
    try {
      const schema = deepCloneForm(working);
      schema.title = `${schema.title} (copy)`;
      const created = await createFormSchemaDraft({ schema, description: `Copy of v${selectedRow.version}` });
      await loadAll();
      setSelectedId(created.id);
      showSuccess(`Duplicated as v${created.version}`);
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Duplicate failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDelete = async () => {
    if (!selectedRow || selectedRow.isActive) return;
    const removedId = selectedRow.id;
    try {
      await deleteFormSchema(removedId);
      setDeleteOpen(false);
      const updated = await loadAll();
      const next = updated.find((r) => r.id !== removedId) ?? updated[0];
      setSelectedId(next?.id ?? null);
      showSuccess('Schema deleted');
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handlePublish = async () => {
    if (!selectedRow || !canPublish) return;
    try {
      await publishFormSchema(selectedRow.id);
      setPublishOpen(false);
      await loadAll();
      showSuccess('Published');
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Publish failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const applyJson = () => {
    if (!isDraftMode) return;
    try {
      const parsed = JSON.parse(jsonText) as BusinessKycFormV1;
      if (parsed.version !== 1) throw new Error('schema.version must be 1');
      userDirty.current = true;
      setWorking(parsed);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  useEffect(() => {
    if (builderTab !== 'json') return;
    try {
      JSON.parse(jsonText);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid');
    }
  }, [jsonText, builderTab]);

  const publishDiff = useMemo(() => diffFields(activeRow?.schema ?? null, working), [activeRow, working]);

  const refsForSelected = selectedRow ? (refByVersion.get(selectedRow.version) ?? 0) : 0;
  const deleteDisabled = !selectedRow || selectedRow.isActive || refsForSelected > 0;

  useEffect(() => {
    if (!publishOpen && !deleteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPublishOpen(false);
        setDeleteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [publishOpen, deleteOpen]);

  return (
    <div className="flex flex-col gap-4 min-h-[640px]">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-card px-4 py-3">
        <div>
          <p className="text-sm font-bold text-app-text">
            {isDraftMode
              ? `Editing draft v${selectedRow?.version} (not active)`
              : activeRow && selectedRow?.id === activeRow.id
                ? `Viewing active v${selectedRow?.version} — create a draft to edit`
                : `Viewing v${selectedRow?.version}`}
          </p>
          <p className="text-xs text-neutral-500 flex items-center gap-2 mt-1">
            {saveState === 'saving' && <span>Saving…</span>}
            {saveState === 'saved' && <span className="text-emerald-600">Saved ✓</span>}
            {structErrors.length > 0 && <span className="text-red-600">{structErrors.length} validation issue(s)</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['schema', 'preview', 'json'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-label={`Builder tab ${t}`}
              aria-current={builderTab === t ? 'true' : undefined}
              onClick={() => setBuilderTab(t)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black uppercase',
                builderTab === t
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'border border-app-border text-app-text',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {structErrors.length > 0 && builderTab === 'schema' && (
        <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 bg-red-50/50 dark:bg-red-950/20 rounded-xl p-3 border border-red-200 dark:border-red-900">
          {structErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-1 gap-4 min-h-[560px]">
        {/* LEFT */}
        <aside className="w-56 shrink-0 rounded-2xl border border-app-border bg-app-card p-3 space-y-3">
          <label htmlFor="fb-version" className="text-[10px] font-black uppercase text-neutral-400">
            Version
          </label>
          <select
            id="fb-version"
            className="w-full rounded-lg border border-app-border bg-app-bg text-sm py-2"
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
            aria-label="Select schema version"
          >
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                v{r.version}
                {r.isActive ? ' ● active' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="New draft"
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold"
            onClick={() => void handleNewDraft()}
          >
            <Plus className="w-4 h-4" />
            New draft
          </button>
          <button
            type="button"
            aria-label="Duplicate schema"
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-app-border text-xs font-bold"
            onClick={() => void handleDuplicate()}
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            type="button"
            aria-label="Delete schema"
            disabled={deleteDisabled}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-200 text-red-700 text-xs font-bold disabled:opacity-40"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          {canPublish && (
            <button
              type="button"
              aria-label="Publish schema"
              disabled={!isDraftMode || structErrors.length > 0}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-40"
              onClick={() => setPublishOpen(true)}
            >
              <Rocket className="w-4 h-4" />
              Publish
            </button>
          )}
          <p className="text-[10px] text-neutral-500">
            Refs: v{selectedRow?.version ?? '—'} → {refsForSelected} submission(s)
          </p>
        </aside>

        {builderTab === 'schema' && (
          <>
            <div className="flex-1 rounded-2xl border border-app-border bg-app-card overflow-hidden flex flex-col min-w-0">
              <div className="p-3 border-b border-app-border flex justify-between items-center">
                <input
                  aria-label="Form title"
                  className="font-bold text-app-text bg-transparent border-none focus:outline-none focus:ring-2 rounded px-2 flex-1 max-w-md"
                  value={working.title}
                  onChange={(e) => setWorkingPatched((w) => ({ ...w, title: e.target.value }))}
                  disabled={!isDraftMode}
                />
                <button
                  type="button"
                  aria-label="Add section"
                  className="text-xs font-bold px-3 py-1 rounded-lg border border-app-border"
                  onClick={addSection}
                  disabled={!isDraftMode}
                >
                  + Section
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                {[...working.sections]
                  .sort((a, b) => a.order - b.order)
                  .map((sec) => (
                    <div
                      key={sec.id}
                      className="rounded-xl border border-app-border bg-app-bg/50 p-2"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropSection(e, sec.id)}
                    >
                      <div className="flex items-center gap-2 px-2 py-1 border-b border-app-border mb-2">
                        <button
                          type="button"
                          draggable={isDraftMode}
                          aria-label={`Drag section ${sec.title}`}
                          className="p-1 rounded hover:bg-app-card cursor-grab"
                          onDragStart={(e) => onDragStartSection(e, sec.id)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setKbGrab((g) =>
                                g?.kind === 'section' && g.id === sec.id ? null : { kind: 'section', id: sec.id },
                              );
                            }
                            if (kbGrab?.kind === 'section' && kbGrab.id === sec.id) {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                moveSection(sec.id, 1);
                              }
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                moveSection(sec.id, -1);
                              }
                            }
                          }}
                        >
                          <GripVertical className="w-4 h-4 text-neutral-400" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move section up"
                          className="p-1"
                          disabled={!isDraftMode}
                          onClick={() => moveSection(sec.id, -1)}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move section down"
                          className="p-1"
                          disabled={!isDraftMode}
                          onClick={() => moveSection(sec.id, 1)}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="flex-1 text-left font-bold text-sm text-app-text"
                          onClick={() => setSelection({ kind: 'section', id: sec.id })}
                        >
                          {sec.title}
                          {kbGrab?.kind === 'section' && kbGrab.id === sec.id ? ' (grabbed)' : ''}
                        </button>
                        <button
                          type="button"
                          aria-label="Add field to section"
                          className="text-xs font-bold px-2 py-1 rounded bg-app-card border border-app-border"
                          disabled={!isDraftMode}
                          onClick={() => addField(sec.id)}
                        >
                          + Field
                        </button>
                        <button
                          type="button"
                          aria-label="Remove section"
                          className="p-1 text-red-600"
                          disabled={!isDraftMode}
                          onClick={() => removeSection(sec.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {working.fields
                          .filter((f) => f.section === sec.id)
                          .sort((a, b) => a.order - b.order)
                          .map((f) => (
                            <div
                              key={f.id}
                              draggable={isDraftMode}
                              onDragStart={(e) => onDragStartField(e, f.id)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => onDropField(e, f.id, sec.id)}
                              className={cn(
                                'flex items-center gap-2 px-2 py-2 rounded-lg border cursor-pointer',
                                selection?.kind === 'field' && selection.id === f.id
                                  ? 'border-neutral-900 dark:border-white bg-app-card'
                                  : 'border-transparent hover:bg-app-card/80',
                              )}
                              onClick={() => setSelection({ kind: 'field', id: f.id })}
                            >
                              <button
                                type="button"
                                aria-label={`Reorder field ${f.label}`}
                                className="p-1 cursor-grab"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault();
                                    setKbGrab((g) =>
                                      g?.kind === 'field' && g.id === f.id ? null : { kind: 'field', id: f.id },
                                    );
                                  }
                                  if (kbGrab?.kind === 'field' && kbGrab.id === f.id) {
                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      moveField(f.id, 1);
                                    }
                                    if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      moveField(f.id, -1);
                                    }
                                  }
                                }}
                              >
                                <GripVertical className="w-4 h-4 text-neutral-400" />
                              </button>
                              <span className="text-xs font-mono text-neutral-500 w-24 truncate">{f.id}</span>
                              <span className="text-sm font-semibold flex-1 truncate">{f.label}</span>
                              <span className="text-[10px] uppercase text-neutral-400">{f.type}</span>
                              <button
                                type="button"
                                aria-label="Delete field"
                                className="p-1 text-red-600"
                                disabled={!isDraftMode}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeField(f.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <aside className="w-80 shrink-0 rounded-2xl border border-app-border bg-app-card overflow-hidden">
              <FieldInspector
                form={working}
                selection={selection}
                idError={idLiveError}
                onUpdateSection={onUpdateSection}
                onUpdateField={onUpdateField}
                readOnly={!isDraftMode}
              />
            </aside>
          </>
        )}

        {builderTab === 'preview' && (
          <div className="flex-1 flex gap-4 min-w-0">
            <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
              <BusinessKycFormRenderer
                schema={working}
                values={previewValues}
                files={previewFiles}
                onChange={(fid, v) => setPreviewValues((p) => ({ ...p, [fid]: v }))}
                onFileChange={(fid, fl) => setPreviewFiles((p) => ({ ...p, [fid]: fl }))}
                errors={previewErrors}
                fakeCategories={previewCats}
              />
            </div>
            <aside className="w-52 shrink-0 rounded-2xl border border-app-border bg-app-card p-3 space-y-2 h-fit">
              <p className="text-xs font-bold text-app-text">Simulate provider category</p>
              <label htmlFor="fb-pcat" className="text-[10px] text-neutral-500">
                Categories (comma)
              </label>
              <input
                id="fb-pcat"
                className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1 text-xs"
                value={previewCats.join(', ')}
                onChange={(e) =>
                  setPreviewCats(
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
              <div className="flex flex-wrap gap-1">
                {['construction', 'plumbing', 'other'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="text-[10px] px-2 py-0.5 rounded-full border border-app-border"
                    onClick={() => setPreviewCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}

        {builderTab === 'json' && (
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <textarea
              aria-label="Raw schema JSON"
              className={cn(
                'flex-1 min-h-[400px] font-mono text-xs rounded-2xl border p-3 bg-app-bg text-app-text',
                jsonError ? 'border-red-500' : 'border-app-border',
              )}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              disabled={!isDraftMode}
              spellCheck={false}
            />
            {jsonError && <p className="text-xs text-red-600">{jsonError}</p>}
            <button
              type="button"
              aria-label="Apply JSON to draft"
              disabled={!isDraftMode || !!jsonError}
              className="self-start px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold disabled:opacity-40"
              onClick={applyJson}
            >
              Apply JSON to Draft
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {publishOpen && (
          <div
            className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pub-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-app-card border border-app-border rounded-2xl p-6 max-w-lg w-full space-y-4"
            >
              <h4 id="pub-title" className="font-bold text-lg text-app-text">
                Publish draft?
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                This will deactivate version {activeRow?.version ?? '—'} and make version {selectedRow?.version} the live
                form for new provider submissions. Existing submissions keep their historical{' '}
                <code className="text-xs">schemaVersion</code>.
              </p>
              <div className="text-xs space-y-1 font-mono bg-app-bg rounded-lg p-3 max-h-40 overflow-y-auto">
                <p>+ {publishDiff.added.join(', ') || '—'}</p>
                <p>− {publishDiff.removed.join(', ') || '—'}</p>
                <p>~ {publishDiff.changed.join(', ') || '—'}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-app-border text-sm font-bold"
                  onClick={() => setPublishOpen(false)}
                  aria-label="Cancel publish"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
                  onClick={() => void handlePublish()}
                  aria-label="Confirm publish"
                >
                  Publish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {deleteOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-app-card border border-app-border rounded-2xl p-6 max-w-md w-full space-y-4">
            <h4 className="font-bold">Delete draft v{selectedRow?.version}?</h4>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-xl border text-sm font-bold" onClick={() => setDeleteOpen(false)} aria-label="Cancel delete">
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold"
                onClick={() => void handleDelete()}
                aria-label="Confirm delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
