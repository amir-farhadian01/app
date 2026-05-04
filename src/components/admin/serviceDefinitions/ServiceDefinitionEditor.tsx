import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Save, GripVertical, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ServiceFieldType, ServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes';
import { isServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes';
import {
  createServiceDefinition,
  getServiceDefinition,
  updateServiceDefinition,
  getCategoryTree,
  type CategoryTreeNode,
} from '../../../services/adminServiceDefinitions';
import { listByCatalog, type AdminPackageListItem } from '../../../services/adminServicePackages';
import { effectiveBookingModeLabel } from '../../provider/packages/bookingModeUtils';
import { CategoryPicker, buildBreadcrumbFromTree } from './CategoryPicker';
import { PreviewAsCustomer } from './PreviewAsCustomer';
import { PropertyInspector, defaultPropsForType } from './PropertyInspector';
import {
  deepCloneForm,
  defaultFieldForType,
  emptyForm,
  migrateQuestionnaireToV1,
  newSectionId,
} from './schemaHelpers';
import { validateBuilderSchema } from '../../../../lib/serviceQuestionnaireBuilderValidate.js';

type Sel = { kind: 'section' | 'field'; id: string } | null;
type EditorTab = 'schema' | 'preview' | 'json';

type LockedPick = 'auto_appointment' | 'negotiation' | null;

function packagesConflictingWithLock(
  nextLock: LockedPick,
  pkgs: AdminPackageListItem[]
): AdminPackageListItem[] {
  if (nextLock == null) return [];
  if (nextLock === 'auto_appointment') {
    return pkgs.filter((p) => p.bookingMode === 'negotiation');
  }
  return pkgs.filter((p) => p.bookingMode === 'auto_appointment');
}

const MATCHING: { v: string; l: string }[] = [
  { v: 'manual_review', l: 'Manual review' },
  { v: 'auto_book', l: 'Auto book' },
  { v: 'round_robin_5', l: 'Round robin 5' },
];

export function ServiceDefinitionEditor({
  id,
  isNew,
  onClose,
  onSaved,
  showSuccess,
  setNotification,
  onDuplicated,
  onOpenProviderPackagesForCatalog,
}: {
  id: string | null;
  isNew: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  showSuccess: (m: string) => void;
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
  onDuplicated?: (newId: string) => void;
  onOpenProviderPackagesForCatalog?: (serviceCatalogId: string) => void;
}) {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  /** Legacy `subcategory` from API; shown when tree path is only one segment. */
  const [catalogSubcategory, setCatalogSubcategory] = useState<string | null>(null);
  const [defaultMatchingMode, setDefaultMatchingMode] = useState('manual_review');
  const [isActive, setIsActive] = useState(true);
  const [working, setWorking] = useState<ServiceQuestionnaireV1>(() => emptyForm());
  const [selection, setSelection] = useState<Sel>(null);
  const [tab, setTab] = useState<EditorTab>('schema');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(id);
  const userDirty = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTabRef = useRef<EditorTab>('schema');
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});
  const [previewFiles, setPreviewFiles] = useState<Record<string, File[]>>({});
  const [schemaMigrated, setSchemaMigrated] = useState(false);
  const [lockedBookingMode, setLockedBookingMode] = useState<LockedPick>(null);
  const [catalogPackages, setCatalogPackages] = useState<AdminPackageListItem[] | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [lockSaveConflict, setLockSaveConflict] = useState<{
    message: string;
    count: number;
    packageIds: string[];
  } | null>(null);

  const { errors: structErrors, fieldErrors } = useMemo(
    () => validateBuilderSchema(name.trim(), categoryId, working),
    [name, categoryId, working]
  );
  const canSave = structErrors.length === 0;
  const saveDisabled = !canSave || saving;

  useEffect(() => {
    void (async () => {
      try {
        const t = await getCategoryTree();
        setTree(t);
      } catch {
        setNotification({ show: true, message: 'Failed to load categories', type: 'error' });
        setTimeout(() => setNotification(null), 4000);
      }
    })();
  }, [setNotification]);

  const treeRef = useRef(tree);
  treeRef.current = tree;

  const hydrate = useCallback((row: Awaited<ReturnType<typeof getServiceDefinition>>) => {
    setName(row.name);
    setCategoryId(row.categoryId);
    if (row.categoryId) {
      const p = buildBreadcrumbFromTree(row.categoryId, treeRef.current);
      setBreadcrumbs(p === '—' ? [] : p.split(' › '));
    } else {
      setBreadcrumbs([]);
    }
    setDefaultMatchingMode(row.defaultMatchingMode);
    setIsActive(row.isActive);
    setCatalogSubcategory(row.subcategory?.trim() ? row.subcategory : null);
    {
      const lb = row.lockedBookingMode;
      setLockedBookingMode(lb === 'auto_appointment' || lb === 'negotiation' ? lb : null);
    }
    const s = row.dynamicFieldsSchema;
    const { schema, migrated } = migrateQuestionnaireToV1(s, row.name);
    setSchemaMigrated(migrated);
    setWorking(deepCloneForm(schema));
    setJsonText(JSON.stringify(schema, null, 2));
  }, []);

  /** New draft: run only when `isNew` toggles, not when category tree (or hydrate) updates — that was resetting the form and wiping added fields. */
  useEffect(() => {
    if (!isNew) return;
    const draft = emptyForm();
    setRowId(null);
    setName('New service definition');
    setCategoryId(null);
    setBreadcrumbs([]);
    setCatalogSubcategory(null);
    setSchemaMigrated(false);
    setLockedBookingMode(null);
    setCatalogPackages(null);
    setLockSaveConflict(null);
    setWorking(draft);
    setJsonText(JSON.stringify(draft, null, 2));
    setSelection(null);
  }, [isNew]);

  useEffect(() => {
    if (isNew || !id) return;
    void (async () => {
      try {
        const row = await getServiceDefinition(id);
        setRowId(row.id);
        hydrate(row);
      } catch (e) {
        setNotification({
          show: true,
          message: e instanceof Error ? e.message : 'Load failed',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 4000);
      }
    })();
  }, [isNew, id, hydrate, setNotification]);

  useEffect(() => {
    if (categoryId) {
      const p = buildBreadcrumbFromTree(categoryId, tree);
      setBreadcrumbs(p === '—' ? [] : p.split(' › '));
    } else {
      setBreadcrumbs([]);
    }
  }, [categoryId, tree]);

  useEffect(() => {
    if (isNew || !rowId) {
      setCatalogPackages(null);
      return;
    }
    let cancelled = false;
    setPackagesLoading(true);
    void listByCatalog(rowId)
      .then((rows) => {
        if (!cancelled) setCatalogPackages(rows);
      })
      .catch(() => {
        if (!cancelled) setCatalogPackages([]);
      })
      .finally(() => {
        if (!cancelled) setPackagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isNew, rowId]);

  const setWorkingPatched = (fn: (w: ServiceQuestionnaireV1) => ServiceQuestionnaireV1) => {
    userDirty.current = true;
    setWorking((w) => fn(deepCloneForm(w)));
  };

  const parse409 = useCallback((e: unknown) => {
    const ex = e as Error & { status?: number; body?: { conflictCount?: number; error?: string; packageIds?: string[] } };
    if (ex.status !== 409 || !ex.body) return null;
    return {
      message: ex.body.error || ex.message,
      count: ex.body.conflictCount ?? 0,
      packageIds: ex.body.packageIds ?? [],
    };
  }, []);

  const persist = useCallback(
    async (w: ServiceQuestionnaireV1) => {
      if (!isServiceQuestionnaireV1(w)) {
        setNotification({
          show: true,
          message: 'Cannot save: duplicate field ids or invalid questionnaire. Rename fields so every id is unique.',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 5000);
        return;
      }
      const payload = {
        name: name.trim(),
        category: breadcrumbs[0] || 'uncategorized',
        subcategory: null as string | null,
        categoryId: categoryId || null,
        complianceTags: [] as string[],
        dynamicFieldsSchema: w,
        defaultMatchingMode,
        isActive,
        lockedBookingMode,
      };
      if (rowId) {
        await updateServiceDefinition(rowId, payload);
        setLockSaveConflict(null);
      } else {
        const cr = await createServiceDefinition({ ...payload, isActive: true });
        setRowId(cr.id);
        onSaved(cr.id);
        userDirty.current = false;
        setLockSaveConflict(null);
        showSuccess('Service definition created.');
        return;
      }
      onSaved(rowId!);
    },
    [breadcrumbs, categoryId, defaultMatchingMode, isActive, lockedBookingMode, name, onSaved, rowId, setNotification, showSuccess]
  );

  useEffect(() => {
    if (tab === 'json' && prevTabRef.current !== 'json') {
      setJsonText(JSON.stringify(working, null, 2));
    }
    prevTabRef.current = tab;
  }, [tab, working]);

  useEffect(() => {
    if (!userDirty.current || !rowId) return;
    if (structErrors.length) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!userDirty.current || !rowId) return;
      void (async () => {
        try {
          setSaving(true);
          await persist(working);
          userDirty.current = false;
          showSuccess('Saved ✓');
        } catch (e) {
          const c = parse409(e);
          if (c && rowId) {
            setLockSaveConflict({ message: c.message, count: c.count, packageIds: c.packageIds });
          } else {
            setNotification({
              show: true,
              message: e instanceof Error ? e.message : 'Auto-save failed',
              type: 'error',
            });
            setTimeout(() => setNotification(null), 4000);
          }
        } finally {
          setSaving(false);
        }
      })();
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [working, name, categoryId, defaultMatchingMode, isActive, lockedBookingMode, structErrors, persist, rowId, setNotification, showSuccess, parse409]);

  const onSaveClick = async () => {
    if (saveDisabled) return;
    try {
      setSaving(true);
      if (!isServiceQuestionnaireV1(working)) {
        setNotification({ show: true, message: 'Invalid schema', type: 'error' });
        return;
      }
      await persist(working);
      userDirty.current = false;
      showSuccess(rowId ? 'Saved.' : 'Created.');
    } catch (e) {
      const c = parse409(e);
      if (c && rowId) {
        setLockSaveConflict({ message: c.message, count: c.count, packageIds: c.packageIds });
      } else {
        setNotification({
          show: true,
          message: e instanceof Error ? e.message : 'Save failed',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 4000);
      }
    } finally {
      setSaving(false);
    }
  };

  const onCategoryPick = (cid: string, path: string[]) => {
    userDirty.current = true;
    setCategoryId(cid);
    setBreadcrumbs(path);
    setCatalogSubcategory(null);
  };

  const onUpdateField = (oldId: string, patch: Partial<import('../../../../lib/serviceDefinitionTypes').ServiceFieldDef>) => {
    setWorkingPatched((w) => {
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
        const next = defaultPropsForType(f, patch.type);
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

  const onAddSection = () => {
    setWorkingPatched((w) => {
      const sid = newSectionId();
      w.sections.push({ id: sid, title: 'Section', order: w.sections.length });
      return w;
    });
  };

  const onAddField = (sectionId: string) => {
    setWorkingPatched((w) => {
      const order = w.fields.filter((f) => f.section === sectionId).length;
      w.fields.push(defaultFieldForType('text', sectionId, order));
      return w;
    });
  };

  const onDeleteField = (fid: string) => {
    setWorkingPatched((w) => {
      w.fields = w.fields.filter((f) => f.id !== fid);
      if (selection?.id === fid) setSelection(null);
      return w;
    });
  };

  const selectedField = selection?.kind === 'field' ? working.fields.find((f) => f.id === selection.id) ?? null : null;

  const jsonLive = useMemo(() => {
    try {
      const data = JSON.parse(jsonText) as unknown;
      return { parseErr: null as string | null, data };
    } catch (e) {
      return { parseErr: e instanceof Error ? e.message : 'Invalid JSON', data: null as unknown };
    }
  }, [jsonText]);

  const jsonAppliesToDraft =
    jsonLive.parseErr == null &&
    jsonLive.data != null &&
    isServiceQuestionnaireV1(jsonLive.data);

  const onJsonApply = () => {
    if (jsonLive.parseErr) {
      setJsonError(jsonLive.parseErr);
      return;
    }
    const p = jsonLive.data;
    if (!p || !isServiceQuestionnaireV1(p)) {
      setJsonError('Not a valid ServiceQuestionnaireV1');
      return;
    }
    setJsonError(null);
    userDirty.current = true;
    setWorking(deepCloneForm(p));
  };

  const lockConflictPkgs = useMemo(() => {
    if (lockedBookingMode == null) return [];
    return packagesConflictingWithLock(lockedBookingMode, catalogPackages ?? []);
  }, [lockedBookingMode, catalogPackages]);

  const packagePreview5 = useMemo(() => {
    if (!catalogPackages?.length) return [];
    return [...catalogPackages]
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, 5);
  }, [catalogPackages]);

  const conflictOtherModeLabel =
    lockedBookingMode === 'auto_appointment' ? 'Negotiation' : lockedBookingMode === 'negotiation' ? 'Auto appointment' : 'conflicting mode';

  const lockedBookingSummary =
    lockedBookingMode == null
      ? 'Free choice (not locked)'
      : lockedBookingMode === 'auto_appointment'
        ? 'Auto appointment'
        : 'Negotiation';

  const catalogPrimary = breadcrumbs[0] ?? null;
  const catalogSecondary =
    breadcrumbs.length > 1
      ? breadcrumbs.slice(1).join(' › ')
      : breadcrumbs.length === 1 && catalogSubcategory
        ? catalogSubcategory
        : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-app-border bg-app-card"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-black uppercase tracking-tight text-app-text">Service definition</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-app-text">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => {
                const v = e.target.checked;
                userDirty.current = true;
                setIsActive(v);
                if (rowId) {
                  void updateServiceDefinition(rowId, { isActive: v }).then(() => showSuccess('Status updated.'));
                }
              }}
            />
            Active
          </label>
          {rowId && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const row = await getServiceDefinition(rowId);
                  const s = row.dynamicFieldsSchema;
                  if (!s || !isServiceQuestionnaireV1(s)) {
                    setNotification({ show: true, message: 'No valid schema to copy', type: 'error' });
                    return;
                  }
                  const cr = await createServiceDefinition({
                    name: `${row.name} (copy)`,
                    category: row.category,
                    subcategory: row.subcategory,
                    complianceTags: row.complianceTags,
                    categoryId: row.categoryId,
                    dynamicFieldsSchema: deepCloneForm(s),
                    isActive: false,
                    defaultMatchingMode: row.defaultMatchingMode,
                    description: row.description,
                    slug: null,
                    lockedBookingMode: row.lockedBookingMode,
                  });
                  onDuplicated?.(cr.id);
                  showSuccess('Duplicate saved as draft.');
                } catch (e) {
                  setNotification({
                    show: true,
                    message: e instanceof Error ? e.message : 'Duplicate failed',
                    type: 'error',
                  });
                  setTimeout(() => setNotification(null), 4000);
                }
              }}
              className="rounded-2xl border border-app-border bg-app-card px-4 py-2 text-xs font-bold"
            >
              Duplicate as draft
            </button>
          )}
          <button
            type="button"
            disabled={saveDisabled}
            onClick={onSaveClick}
            className={cn(
              'flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold',
              saveDisabled
                ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed dark:bg-neutral-800'
                : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl border border-app-border bg-app-card px-4 py-3"
        aria-label="Catalog placement"
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Category</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-bold leading-snug text-app-text">
          {catalogPrimary ? (
            <>
              <span className="min-w-0 break-words">{catalogPrimary}</span>
              {catalogSecondary ? (
                <>
                  <span className="shrink-0 text-neutral-400" aria-hidden>
                    ›
                  </span>
                  <span className="min-w-0 break-words font-semibold text-app-text/90">{catalogSecondary}</span>
                </>
              ) : null}
            </>
          ) : (
            <span className="font-normal text-neutral-500">No category selected — pick one under Name below.</span>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-[10px] font-black uppercase text-neutral-400">Name</label>
          <input
            className="mt-1 w-full rounded-2xl border border-app-border bg-app-input px-4 py-2.5 text-sm font-bold text-app-text"
            value={name}
            onChange={(e) => {
              userDirty.current = true;
              setName(e.target.value);
            }}
            onBlur={() => {
              const t = name.trim() || 'Untitled';
              setWorkingPatched((w) => ({ ...w, title: t }));
            }}
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-neutral-400">Default matching</label>
          <select
            className="mt-1 w-full rounded-2xl border border-app-border bg-app-input px-4 py-2.5 text-sm text-app-text"
            value={defaultMatchingMode}
            onChange={(e) => {
              userDirty.current = true;
              setDefaultMatchingMode(e.target.value);
            }}
          >
            {MATCHING.map((m) => (
              <option key={m.v} value={m.v}>
                {m.l}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-black uppercase text-neutral-400">Category</label>
          <div className="mt-1">
            <CategoryPicker tree={tree} value={categoryId} onChange={onCategoryPick} />
          </div>
        </div>
        {rowId && (
          <div className="md:col-span-2 rounded-2xl border border-app-border bg-app-card p-4">
            <p className="text-[10px] font-black uppercase text-neutral-400">Booking mode lock</p>
            <p className="mt-1 text-xs text-neutral-500">
              When set, provider packages for this service must use the locked mode.
            </p>
            <p
              className="mt-2 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm font-bold text-app-text"
              role="status"
            >
              Selected: {lockedBookingSummary}
            </p>
            <div className="mt-3 space-y-2">
              {(
                [
                  { v: null as LockedPick, l: 'Free choice (not locked)' },
                  { v: 'auto_appointment' as const, l: 'Auto appointment' },
                  { v: 'negotiation' as const, l: 'Negotiation' },
                ] as const
              ).map((opt) => (
                <label key={String(opt.v)} className="flex cursor-pointer items-center gap-2 text-sm text-app-text">
                  <input
                    type="radio"
                    className="border-app-border"
                    checked={lockedBookingMode === opt.v}
                    onChange={() => {
                      userDirty.current = true;
                      setLockedBookingMode(opt.v);
                      setLockSaveConflict(null);
                    }}
                  />
                  {opt.l}
                </label>
              ))}
            </div>
            {lockedBookingMode != null && lockConflictPkgs.length > 0 && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-bold">
                  {lockConflictPkgs.length} package{lockConflictPkgs.length === 1 ? '' : 's'} currently use &apos;{conflictOtherModeLabel}
                  &apos;. Locking will reject this change. Ask providers to change mode in their dashboards first.
                </p>
              </div>
            )}
            {lockSaveConflict && (
              <div className="mt-3 space-y-2 rounded-2xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
                <p className="font-bold">{lockSaveConflict.message}</p>
                {lockSaveConflict.count > 0 && (
                  <p>
                    Conflicting package IDs: {lockSaveConflict.packageIds.slice(0, 8).join(', ')}
                    {lockSaveConflict.packageIds.length > 8 ? '…' : ''}
                  </p>
                )}
                {onOpenProviderPackagesForCatalog && (
                  <button
                    type="button"
                    onClick={() => onOpenProviderPackagesForCatalog(rowId)}
                    className="text-left font-bold text-amber-900 underline dark:text-amber-200"
                  >
                    Open Provider Packages tab with this catalog →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {schemaMigrated && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
          Schema was migrated in memory to the current V1 shape. Review fields, then save.
        </div>
      )}

      {structErrors.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {structErrors.map((e) => (
            <p key={e}>• {e}</p>
          ))}
        </div>
      )}

      {working.fields.length === 0 && isActive && (
        <div
          className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
          role="status"
        >
          This service has no questionnaire yet. Add fields below.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12 min-h-[520px]">
        <div className="lg:col-span-3 rounded-[2rem] border border-app-border bg-app-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase text-neutral-400">Structure</span>
            <button type="button" onClick={onAddSection} className="text-xs font-bold text-app-text">
              + Section
            </button>
          </div>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {working.sections
              .sort((a, b) => a.order - b.order)
              .map((sec) => (
                <div key={sec.id} className="rounded-2xl border border-app-border p-2">
                  <button
                    type="button"
                    className={cn(
                      'w-full text-left font-bold text-sm text-app-text rounded-xl px-2 py-1',
                      selection?.kind === 'section' && selection.id === sec.id && 'bg-neutral-100 dark:bg-neutral-800'
                    )}
                    onClick={() => setSelection({ kind: 'section', id: sec.id })}
                  >
                    {sec.title}
                  </button>
                  <div className="mt-1 space-y-0.5 pl-2">
                    {working.fields
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
                      className="w-full text-left text-[10px] font-bold text-neutral-500 pl-2 py-1"
                    >
                      + Field
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col rounded-[2rem] border border-app-border bg-app-card overflow-hidden min-h-0">
          <div className="flex border-b border-app-border">
            {(['schema', 'preview', 'json'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-3 text-xs font-black uppercase tracking-widest',
                  tab === t
                    ? 'text-app-text border-b-2 border-neutral-900 dark:border-white'
                    : 'text-neutral-500'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="p-4 flex-1 overflow-y-auto min-h-0 max-h-[60vh]">
            {tab === 'schema' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-400">Schema title</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
                    value={working.title}
                    onChange={(e) => {
                      userDirty.current = true;
                      setWorkingPatched((w) => ({ ...w, title: e.target.value }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-400">AI assist prompt (F5)</label>
                  <textarea
                    className="mt-1 w-full min-h-[64px] rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
                    value={working.aiAssistPrompt ?? ''}
                    onChange={(e) => {
                      userDirty.current = true;
                      setWorkingPatched((w) => ({ ...w, aiAssistPrompt: e.target.value || undefined }));
                    }}
                    placeholder="Optional instructions for the customer-facing AI coach…"
                  />
                </div>
                <p className="text-xs text-neutral-500">Select a field in the left list, then edit in the inspector →</p>
              </div>
            )}
            {tab === 'preview' && isServiceQuestionnaireV1(working) && (
              <PreviewAsCustomer
                schema={working}
                values={previewValues}
                files={previewFiles}
                onChange={(fieldId, v) =>
                  setPreviewValues((p) => {
                    const n = { ...p, [fieldId]: v };
                    return n;
                  })
                }
                onFilesChange={(fieldId, list) =>
                  setPreviewFiles((prev) => ({ ...prev, [fieldId]: list }))
                }
                errors={fieldErrors}
              />
            )}
            {tab === 'json' && (
              <div className="space-y-2">
                <label htmlFor="sf-json" className="text-[10px] font-black uppercase text-neutral-400">
                  Questionnaire JSON
                </label>
                <textarea
                  id="sf-json"
                  className="w-full min-h-[320px] rounded-xl border border-app-border bg-app-input p-3 font-mono text-xs text-app-text"
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setJsonError(null);
                  }}
                />
                {jsonLive.parseErr && (
                  <p className="inline-flex min-h-8 items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                    {jsonLive.parseErr}
                  </p>
                )}
                {!jsonLive.parseErr && !jsonAppliesToDraft && (
                  <p className="inline-flex min-h-8 items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                    JSON does not match ServiceQuestionnaireV1
                  </p>
                )}
                {jsonError && <p className="text-xs text-red-600">{jsonError}</p>}
                <button
                  type="button"
                  disabled={!jsonAppliesToDraft}
                  onClick={onJsonApply}
                  className={cn(
                    'min-h-[44px] rounded-xl border border-app-border px-4 py-2 text-xs font-bold',
                    !jsonAppliesToDraft && 'cursor-not-allowed opacity-50'
                  )}
                >
                  Apply JSON to draft
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 rounded-[2rem] border border-app-border bg-app-card min-h-0">
          {selection?.kind === 'section' && (
            <div className="p-4">
              <label className="text-[10px] font-black uppercase text-neutral-400">Section title</label>
              <input
                className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
                value={working.sections.find((s) => s.id === selection.id)?.title ?? ''}
                onChange={(e) => {
                  const sid = selection.id;
                  setWorkingPatched((w) => {
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
                sections={working.sections}
                allFieldIds={working.fields.map((f) => f.id)}
                onChange={(patch) => onUpdateField(selectedField.id, patch)}
                onTypeChange={(t) => onUpdateField(selectedField.id, { type: t })}
                fieldError={fieldErrors[selectedField.id]}
              />
              <div className="shrink-0 border-t border-app-border p-4">
                <button
                  type="button"
                  onClick={() => onDeleteField(selectedField.id)}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-200 py-2 text-sm font-bold text-red-600 dark:border-red-800"
                >
                  Delete field
                </button>
              </div>
            </div>
          )}
          {!selection && <div className="p-6 text-sm text-neutral-500 text-center">Select section or field</div>}
        </div>
      </div>

      {rowId && (
        <div className="rounded-[2rem] border border-app-border bg-app-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase text-neutral-400">Providers offering this service</p>
            {onOpenProviderPackagesForCatalog && (
              <button
                type="button"
                onClick={() => onOpenProviderPackagesForCatalog(rowId)}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                View all →
              </button>
            )}
          </div>
          {packagesLoading && <p className="mt-2 text-sm text-neutral-500">Loading packages…</p>}
          {!packagesLoading && (!catalogPackages || catalogPackages.length === 0) && (
            <p className="mt-2 text-sm text-neutral-500">No providers offer this service yet.</p>
          )}
          {!packagesLoading && packagePreview5.length > 0 && (
            <ul className="mt-2 divide-y divide-app-border text-sm">
              {packagePreview5.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-semibold text-app-text">{p.workspace.name}</span>
                  <span className="text-neutral-500">
                    {p.provider.displayName || p.provider.email || p.provider.id}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {
                      effectiveBookingModeLabel(
                        p.serviceCatalog.lockedBookingMode,
                        p.bookingMode as 'auto_appointment' | 'negotiation' | 'inherit_from_catalog'
                      ).label
                    }{' '}
                    · {p.isActive ? 'active' : 'inactive'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
