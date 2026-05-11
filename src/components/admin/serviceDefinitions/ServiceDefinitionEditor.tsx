import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Save, Loader2, Wrench } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import type { ServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes.js';
import { isServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes.js';
import {
  createServiceDefinition,
  getServiceDefinition,
  updateServiceDefinition,
  getCategoryTree,
  type CategoryTreeNode,
} from '../../../services/adminServiceDefinitions.js';
import { CategoryPicker, buildBreadcrumbFromTree } from './CategoryPicker.js';
import { deepCloneForm, emptyForm, migrateQuestionnaireToV1 } from './schemaHelpers.js';
import { validateBuilderSchema } from '../../../../lib/serviceQuestionnaireBuilderValidate.js';
import { ServiceFormBuilderModal } from './ServiceFormBuilderModal.js';

type LockedPick = 'auto_appointment' | 'negotiation' | null;

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
  initialOpenFormBuilder = false,
}: {
  id: string | null;
  isNew: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  showSuccess: (m: string) => void;
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
  initialOpenFormBuilder?: boolean;
}) {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [defaultMatchingMode, setDefaultMatchingMode] = useState('manual_review');
  const [isActive, setIsActive] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [icon, setIcon] = useState('');
  const [showInHomeClient, setShowInHomeClient] = useState(false);
  const [working, setWorking] = useState<ServiceQuestionnaireV1>(() => emptyForm());
  const [formBuilderOpen, setFormBuilderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(id);
  const userDirty = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [schemaMigrated, setSchemaMigrated] = useState(false);
  const [lockedBookingMode, setLockedBookingMode] = useState<LockedPick>(null);

  const { errors: structErrors } = useMemo(
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
    setTags(Array.isArray(row.complianceTags) ? row.complianceTags : []);
    setIcon(row.icon ?? '');
    setShowInHomeClient(Boolean(row.showInHomeClient));
    const lb = row.lockedBookingMode;
    setLockedBookingMode(lb === 'auto_appointment' || lb === 'negotiation' ? lb : null);
    const s = row.dynamicFieldsSchema;
    const { schema, migrated } = migrateQuestionnaireToV1(s, row.name);
    setSchemaMigrated(migrated);
    setWorking(deepCloneForm(schema));
  }, []);

  useEffect(() => {
    if (!isNew) return;
    const draft = emptyForm();
    setRowId(null);
    setName('');
    setCategoryId(null);
    setBreadcrumbs([]);
    setDefaultMatchingMode('manual_review');
    setIsActive(true);
    setTags([]);
    setIcon('');
    setShowInHomeClient(false);
    setSchemaMigrated(false);
    setLockedBookingMode(null);
    setWorking(draft);
  }, [isNew]);

  useEffect(() => {
    if (initialOpenFormBuilder) setFormBuilderOpen(true);
  }, [initialOpenFormBuilder]);

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

  const persist = useCallback(
    async (w: ServiceQuestionnaireV1) => {
      if (!isServiceQuestionnaireV1(w)) {
        setNotification({
          show: true,
          message: 'Cannot save: invalid questionnaire shape.',
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
        complianceTags: tags,
        icon: icon.trim() || null,
        showInHomeClient,
        dynamicFieldsSchema: w,
        defaultMatchingMode,
        isActive,
        lockedBookingMode,
      };
      if (rowId) {
        await updateServiceDefinition(rowId, payload);
      } else {
        const cr = await createServiceDefinition(payload);
        setRowId(cr.id);
        onSaved(cr.id);
        userDirty.current = false;
        showSuccess('Service definition created.');
        return;
      }
      onSaved(rowId!);
    },
    [breadcrumbs, categoryId, defaultMatchingMode, icon, isActive, lockedBookingMode, name, onSaved, rowId, setNotification, showInHomeClient, showSuccess, tags]
  );

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
          showSuccess('Saved');
        } catch (e) {
          setNotification({
            show: true,
            message: e instanceof Error ? e.message : 'Auto-save failed',
            type: 'error',
          });
          setTimeout(() => setNotification(null), 4000);
        } finally {
          setSaving(false);
        }
      })();
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [working, structErrors, persist, rowId, setNotification, showSuccess]);

  const onSaveClick = async () => {
    if (saveDisabled) return;
    try {
      setSaving(true);
      await persist(working);
      userDirty.current = false;
      showSuccess(rowId ? 'Saved.' : 'Created.');
    } catch (e) {
      setNotification({
        show: true,
        message: e instanceof Error ? e.message : 'Save failed',
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const tagsInput = tags.join(', ');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-app-border bg-app-card"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-black uppercase tracking-tight text-app-text">Service definition</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFormBuilderOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-app-border bg-app-card px-4 py-2 text-xs font-bold"
          >
            <Wrench className="h-4 w-4" />
            Form editor
          </button>
          <button
            type="button"
            disabled={saveDisabled}
            onClick={onSaveClick}
            className={cn(
              'flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold',
              saveDisabled
                ? 'cursor-not-allowed bg-neutral-200 text-neutral-500 dark:bg-neutral-800'
                : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-[10px] font-black uppercase text-neutral-400">Service name</label>
          <input
            className="mt-1 w-full rounded-2xl border border-app-border bg-app-input px-4 py-2.5 text-sm font-bold text-app-text"
            value={name}
            onChange={(e) => {
              userDirty.current = true;
              setName(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-neutral-400">Matching</label>
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
          <label className="text-[10px] font-black uppercase text-neutral-400">Parent / category</label>
          <div className="mt-1">
            <CategoryPicker
              tree={tree}
              value={categoryId}
              onChange={(cid, path) => {
                userDirty.current = true;
                setCategoryId(cid);
                setBreadcrumbs(path);
              }}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="text-[10px] font-black uppercase text-neutral-400">Tags / keywords</label>
          <input
            className="mt-1 w-full rounded-2xl border border-app-border bg-app-input px-4 py-2.5 text-sm text-app-text"
            value={tagsInput}
            placeholder="cleaning, eco, recurring"
            onChange={(e) => {
              userDirty.current = true;
              const normalized = e.target.value
                .split(',')
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean);
              setTags(Array.from(new Set(normalized)));
            }}
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-neutral-400">Icon</label>
          <input
            className="mt-1 w-full rounded-2xl border border-app-border bg-app-input px-4 py-2.5 text-sm text-app-text"
            value={icon}
            placeholder="wrench"
            onChange={(e) => {
              userDirty.current = true;
              setIcon(e.target.value);
            }}
          />
        </div>

        <div className="flex items-center gap-6 pt-6">
          <label className="inline-flex items-center gap-2 text-sm font-bold text-app-text">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => {
                userDirty.current = true;
                setIsActive(e.target.checked);
              }}
            />
            Active
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-bold text-app-text">
            <input
              type="checkbox"
              checked={showInHomeClient}
              onChange={(e) => {
                userDirty.current = true;
                setShowInHomeClient(e.target.checked);
              }}
            />
            Show in home client
          </label>
        </div>

        <div className="md:col-span-2 rounded-2xl border border-app-border bg-app-card p-4">
          <p className="text-[10px] font-black uppercase text-neutral-400">Booking mode lock</p>
          <div className="mt-2 space-y-2">
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
                  }}
                />
                {opt.l}
              </label>
            ))}
          </div>
        </div>
      </div>

      {schemaMigrated && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
          Existing schema was migrated to V1 shape in memory. Save to persist the normalized shape.
        </div>
      )}
      {structErrors.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {structErrors.map((e) => (
            <p key={e}>• {e}</p>
          ))}
        </div>
      )}

      <ServiceFormBuilderModal
        open={formBuilderOpen}
        schema={working}
        onChange={(next) => {
          userDirty.current = true;
          setWorking(next);
        }}
        onClose={() => setFormBuilderOpen(false)}
      />
    </div>
  );
}
