import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../../lib/AuthContext.js';
import { cn } from '../../../../lib/utils.js';
import { isServiceQuestionnaireV1 } from '../../../../../lib/serviceDefinitionTypes';
import { getServiceDefinition, createServiceDefinition } from '../../../../services/adminServiceDefinitions.js';
import {
  fetchTree,
  reorderCategory,
  reorderService,
  archiveCategory,
  unarchiveCategory,
  archiveService,
  unarchiveService,
  createChildCategory,
  createLeafService,
  renameCategory,
  renameService,
  type CategoryTreeItem,
  type ServiceCatalogLite,
} from '../../../../services/adminCategoryTree.js';
import { deepCloneForm } from '../schemaHelpers.js';
import { TreeToolbar } from './TreeToolbar.js';
import { TreeRow, INDENT } from './TreeRow.js';
import { NodeKebabMenu } from './NodeKebabMenu.js';
import {
  buildParentMap,
  filterTreeByQuery,
  isCategoryUnder,
  willExceedDepthOnMove,
  findCategory,
} from './treeModel.js';

const DND = 'application/x-neighborly-tree';

const ADMIN_TAXONOMY = new Set(['owner', 'platform_admin', 'support', 'finance']);
const TAXONOMY_ARCHIVE = new Set(['owner', 'platform_admin']);

type DragPl = { kind: 'category' | 'service'; id: string };

export type FlatRow = {
  kind: 'category' | 'service';
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
  node?: CategoryTreeItem;
  sc?: ServiceCatalogLite;
  sibIndex: number;
};

type DropMode = 'before' | 'after' | 'child';

function getExpandedKey(userId: string) {
  return `tree.expanded.${userId}`;
}

function useDebounced<T>(v: T, ms: number): T {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return x;
}

export function useMediaMax900() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const go = () => setNarrow(mq.matches);
    go();
    mq.addEventListener('change', go);
    return () => mq.removeEventListener('change', go);
  }, []);
  return narrow;
}

function countFieldsInSchema(s: unknown): number {
  if (!isServiceQuestionnaireV1(s)) return 0;
  return s.fields.length;
}

/** Pre-order: category row, then if expanded: child categories (same order) then services. */
function toFlat(
  list: CategoryTreeItem[],
  expanded: Set<string>,
  showArchived: boolean,
  out: FlatRow[] = []
): FlatRow[] {
  list.forEach((n, sib) => {
    if (!showArchived && n.archivedAt) return;
    out.push({
      kind: 'category',
      id: n.id,
      name: n.name,
      depth: n.depth,
      parentId: n.parentId,
      node: n,
      sibIndex: sib,
    });
    if (expanded.has(n.id)) {
      const kids = n.children.filter((c) => showArchived || !c.archivedAt);
      toFlat(kids, expanded, showArchived, out);
      const servs = n.services.filter((s) => showArchived || !s.archivedAt);
      servs.forEach((s, i) => {
        out.push({
          kind: 'service',
          id: s.id,
          name: s.name,
          depth: n.depth + 1,
          parentId: n.id,
          sc: s,
          sibIndex: kids.length + i,
        });
      });
    }
  });
  return out;
}

function getSiblingCategoryIds(
  tree: CategoryTreeItem[],
  parentId: string | null
): string[] {
  const list = parentId == null ? tree : findCategory(tree, parentId)?.children ?? [];
  return list
    .filter((c) => c.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((c) => c.id);
}

function getServiceIdsUnder(tree: CategoryTreeItem[], categoryId: string): string[] {
  const c = findCategory(tree, categoryId);
  if (!c) return [];
  return c.services
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((s) => s.id);
}

export type ServiceTreeProps = {
  onSelectService: (id: string) => void;
  onSelectCategory: (id: string | null, node: CategoryTreeItem | null) => void;
  selectedServiceId: string | null;
  selectedCategoryId: string | null;
  onToast: (message: string, type: 'success' | 'error') => void;
};

export function ServiceTree({
  onSelectService,
  onSelectCategory,
  selectedServiceId,
  selectedCategoryId,
  onToast,
}: ServiceTreeProps) {
  const { user } = useAuth();
  const userId = user?.id ?? 'anon';
  const canTaxonomyArchive = TAXONOMY_ARCHIVE.has(user?.role ?? '');
  const canIncludeArchived = ADMIN_TAXONOMY.has(user?.role ?? '');

  const [rawTree, setRawTree] = useState<CategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const debSearch = useDebounced(search, 250);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<{ kind: 'c' | 's'; id: string } | null>(null);
  const [serviceMeta, setServiceMeta] = useState<
    Record<string, { fieldCount: number; lockedBookingMode: string | null }>
  >({});
  const [drag, setDrag] = useState<DragPl | null>(null);
  const [over, setOver] = useState<{ id: string; mode: DropMode; invalid?: string } | null>(null);
  const [line, setLine] = useState<{ top: number; left: number; width: number; bad: boolean } | null>(null);
  const [namePrompt, setNamePrompt] = useState<{
    t: 'root' | 'child' | 'service';
    parentId: string | null;
  } | null>(null);
  const [promptName, setPromptName] = useState('');

  const treeRef = useRef<HTMLDivElement | null>(null);
  const rowEls = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const focusIdx = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await fetchTree(showArchived && canIncludeArchived);
      setRawTree(t);
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed to load tree', 'error');
    } finally {
      setLoading(false);
    }
  }, [showArchived, canIncludeArchived, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  // localStorage expand
  useEffect(() => {
    try {
      const raw = localStorage.getItem(getExpandedKey(userId));
      if (raw) {
        const a = JSON.parse(raw) as string[];
        if (Array.isArray(a)) setExpanded(new Set(a));
      }
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(getExpandedKey(userId), JSON.stringify([...expanded]));
    } catch {
      /* ignore */
    }
  }, [expanded, userId]);

  // expand paths when search active
  const { displayTree, searchExpand } = useMemo(() => {
    if (!debSearch.trim()) {
      return { displayTree: rawTree, searchExpand: new Set<string>() };
    }
    const { filtered, expandAll } = filterTreeByQuery(rawTree, debSearch, showArchived);
    return { displayTree: filtered, searchExpand: expandAll };
  }, [rawTree, debSearch, showArchived]);

  useEffect(() => {
    if (searchExpand.size) {
      setExpanded((prev) => new Set([...prev, ...searchExpand]));
    }
  }, [searchExpand]);

  const flat = useMemo(
    () => toFlat(displayTree, expanded, showArchived),
    [displayTree, expanded, showArchived]
  );

  const fieldLoadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const f of flat) {
      if (f.kind !== 'service') continue;
      const id = f.id;
      if (fieldLoadedRef.current.has(id)) continue;
      fieldLoadedRef.current.add(id);
      void getServiceDefinition(id)
        .then((row) => {
          setServiceMeta((p) => ({
            ...p,
            [id]: {
              fieldCount: countFieldsInSchema(row.dynamicFieldsSchema),
              lockedBookingMode: row.lockedBookingMode ?? null,
            },
          }));
        })
        .catch(() => {
          setServiceMeta((p) => ({
            ...p,
            [id]: { fieldCount: 0, lockedBookingMode: null },
          }));
        });
    }
  }, [flat]);

  const setRowRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) rowEls.current.set(id, el);
    else rowEls.current.delete(id);
  };

  const onToggleExpand = (id: string) => {
    setExpanded((e) => {
      const n = new Set(e);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const onDragOverRow = (e: React.DragEvent, row: FlatRow) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const pl = drag;
    if (!pl?.id) return;
    const byId = buildParentMap(rawTree);
    const treeL = treeRef.current?.getBoundingClientRect().left ?? 0;
    const rowEl = rowEls.current.get(row.id);
    if (!rowEl) return;
    const rr = rowEl.getBoundingClientRect();
    const x = e.clientX - treeL;
    const childZone = row.kind === 'category' && x > rr.left - treeL + row.depth * INDENT + 40;
    const mode: DropMode = childZone
      ? 'child'
      : e.clientY < rr.top + rr.height / 2
        ? 'before'
        : 'after';
    setOver({ id: row.id, mode });
    // red invalid
    let invalid: string | undefined;
    if (pl.kind === 'service' && row.kind === 'service' && mode === 'child') {
      invalid = 'Services cannot be parents';
    } else if (pl.kind === 'category') {
      const mov = findCategory(rawTree, pl.id);
      if (mov) {
        let newP: string | null = null;
        if (row.kind === 'category' && mode === 'child') newP = row.id;
        else if (row.kind === 'category' && (mode === 'before' || mode === 'after')) newP = row.parentId;
        else if (row.kind === 'service') newP = row.parentId;
        if (newP && (newP === pl.id || isCategoryUnder(byId, pl.id, newP)))
          invalid = 'Cycle not allowed';
        if (!invalid && willExceedDepthOnMove(byId, mov, newP)) invalid = 'Max depth 5';
      }
    } else if (pl.kind === 'service' && row.kind === 'service' && (mode === 'before' || mode === 'after')) {
      /* allow reorder */
    } else if (pl.kind === 'service' && row.kind === 'category' && (mode === 'before' || mode === 'after')) {
      if (!row.parentId) invalid = 'Drop into category (indented) or on a service';
    }
    setOver({ id: row.id, mode, invalid });
    const trc = treeRef.current;
    if (trc) {
      const tr = trc.getBoundingClientRect();
      const relTop = (mode === 'before' ? rr.top - 1 : mode === 'after' ? rr.bottom - 1 : rr.top + 4) - tr.top + trc.scrollTop;
      setLine({
        top: relTop,
        left: INDENT,
        width: Math.max(40, trc.clientWidth - INDENT * 2),
        bad: Boolean(invalid),
      });
    }
  };

  const onDropRow = (e: React.DragEvent, row: FlatRow) => {
    e.preventDefault();
    setOver(null);
    setLine(null);
    let pl: DragPl;
    try {
      pl = JSON.parse(e.dataTransfer.getData(DND) || e.dataTransfer.getData('text/plain') || '{}');
    } catch {
      return;
    }
    if (!pl?.id) return;
    const byId = buildParentMap(rawTree);
    const treeL = treeRef.current?.getBoundingClientRect().left ?? 0;
    const rowEl = rowEls.current.get(row.id);
    if (!rowEl) return;
    const rr = rowEl.getBoundingClientRect();
    const x = e.clientX - treeL;
    const childZone = row.kind === 'category' && x > rr.left - treeL + row.depth * INDENT + 40;
    const mode: DropMode = childZone
      ? 'child'
      : e.clientY < rr.top + rr.height / 2
        ? 'before'
        : 'after';

    const run = async (fn: () => Promise<unknown>, errMsg: string) => {
      try {
        await fn();
        await load();
      } catch (er) {
        onToast(er instanceof Error ? er.message : errMsg, 'error');
        await load();
      }
    };

    if (pl.kind === 'service') {
      if (row.kind === 'service' && (mode === 'before' || mode === 'after') && row.parentId) {
        const cat = row.parentId;
        const sibs = getServiceIdsUnder(rawTree, cat);
        const tIdx = sibs.indexOf(row.id);
        if (tIdx < 0) return;
        const without = sibs.filter((s) => s !== pl.id);
        const tPos = without.indexOf(row.id);
        if (tPos < 0) {
          onToast('Invalid target', 'error');
          return;
        }
        const ins = mode === 'before' ? tPos : tPos + 1;
        const next = without.slice(0, ins).concat([pl.id], without.slice(ins));
        const newIdx = next.indexOf(pl.id);
        void run(() => reorderService(pl.id, cat, newIdx), 'Move failed');
        return;
      }
      if (row.kind === 'category' && mode === 'child') {
        const at = 0;
        void run(() => reorderService(pl.id, row.id, at), 'Move failed');
        return;
      }
      if (row.kind === 'category' && (mode === 'before' || mode === 'after')) {
        onToast('Drop on the category margin (indented) to nest, or on a service row', 'error');
        return;
      }
      return;
    }

    if (pl.kind === 'category') {
      const mov = findCategory(rawTree, pl.id);
      if (!mov) return;
      if (row.kind === 'category' && mode === 'child') {
        const newP = row.id;
        if (newP === pl.id || isCategoryUnder(byId, pl.id, newP) || willExceedDepthOnMove(byId, mov, newP)) {
          onToast('Cannot move here', 'error');
          return;
        }
        void run(() => reorderCategory(pl.id, newP, 0), 'Move failed');
        return;
      }
      if (row.kind === 'category' && (mode === 'before' || mode === 'after')) {
        const newP = row.parentId;
        const sibs = getSiblingCategoryIds(rawTree, newP);
        const i = sibs.indexOf(row.id);
        if (i < 0) return;
        if (newP && (isCategoryUnder(byId, pl.id, newP) || newP === pl.id)) {
          onToast('Cycle not allowed', 'error');
          return;
        }
        if (willExceedDepthOnMove(byId, mov, newP)) {
          onToast('Max depth 5', 'error');
          return;
        }
        if (pl.id === row.id) return;
        const without = sibs.filter((c) => c !== pl.id);
        const tPos = without.indexOf(row.id);
        if (tPos < 0) return;
        const ins = mode === 'before' ? tPos : tPos + 1;
        const next = without.slice(0, ins).concat([pl.id], without.slice(ins));
        const newIdx = next.indexOf(pl.id);
        void run(() => reorderCategory(pl.id, newP, newIdx), 'Move failed');
        return;
      }
      if (row.kind === 'service' && (mode === 'before' || mode === 'after') && row.parentId) {
        const newP = row.parentId;
        if (isCategoryUnder(byId, pl.id, newP) || newP === pl.id || willExceedDepthOnMove(byId, mov, newP)) {
          onToast('Cannot move here', 'error');
          return;
        }
        const sibs = getSiblingCategoryIds(rawTree, newP);
        const newIdx = sibs.filter((c) => c !== pl.id).length;
        void run(() => reorderCategory(pl.id, newP, newIdx), 'Move failed');
        return;
      }
    }
  };

  const onDragStart = (e: React.DragEvent, pl: DragPl) => {
    e.dataTransfer.setData(DND, JSON.stringify(pl));
    e.dataTransfer.setData('text/plain', JSON.stringify(pl));
    e.dataTransfer.effectAllowed = 'move';
    setDrag(pl);
  };
  const onDragEnd = () => {
    setDrag(null);
    setOver(null);
    setLine(null);
  };

  if (loading && rawTree.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-app-text/60">Loading…</div>;
  }

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-r border-app-border"
      onDragOver={(e) => e.preventDefault()}
    >
      {namePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog">
          <form
            className="w-full max-w-sm rounded-2xl border border-app-border bg-app-bg p-4 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              const n = promptName.trim();
              if (!n) return;
              const act = namePrompt;
              setNamePrompt(null);
              setPromptName('');
              void (async () => {
                try {
                  if (act.t === 'root' || act.t === 'child') {
                    const created = await createChildCategory(act.parentId, n);
                    onToast('Category created', 'success');
                    setExpanded((s) => new Set(s).add(created.id));
                  } else if (act.t === 'service' && act.parentId) {
                    const s = await createLeafService(act.parentId, n);
                    onToast('Service created', 'success');
                    onSelectService(s.id);
                    setExpanded((e2) => new Set(e2).add(act.parentId!));
                  }
                  await load();
                } catch (er) {
                  onToast(er instanceof Error ? er.message : 'Failed', 'error');
                }
              })();
            }}
          >
            <label className="text-xs font-bold text-app-text">Name</label>
            <input
              className="mt-1 w-full rounded border border-app-border p-2"
              autoFocus
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="px-2 text-sm" onClick={() => setNamePrompt(null)}>
                Cancel
              </button>
              <button type="submit" className="rounded bg-app-text px-3 py-1 text-sm text-app-bg">
                Create
              </button>
            </div>
          </form>
        </div>
      )}
      <TreeToolbar
        search={search}
        onSearchChange={setSearch}
        showArchived={showArchived}
        onShowArchived={setShowArchived}
        onAddTopLevel={() => {
          setNamePrompt({ t: 'root', parentId: null });
          setPromptName('');
        }}
        canToggleArchived={canIncludeArchived}
      />
      <div
        ref={treeRef}
        className="relative min-h-0 flex-1 overflow-y-auto"
        role="tree"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (!flat.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusIdx.current = Math.min(flat.length - 1, focusIdx.current + 1);
            rowEls.current.get(flat[focusIdx.current]!.id)?.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusIdx.current = Math.max(0, focusIdx.current - 1);
            rowEls.current.get(flat[focusIdx.current]!.id)?.focus();
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const f = flat[focusIdx.current];
            if (f?.kind === 'category' && f.node && expanded.has(f.id)) onToggleExpand(f.id);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const f = flat[focusIdx.current];
            if (f?.kind === 'category' && f.node && !expanded.has(f.id) && f.node.children.length + f.node.services.length) {
              onToggleExpand(f.id);
            }
          } else if (e.key === 'Enter') {
            const f = flat[focusIdx.current];
            if (f?.kind === 'service') onSelectService(f.id);
            else if (f?.kind === 'category' && f.node) onSelectCategory(f.id, f.node);
          }
        }}
      >
        {line && (
          <div
            className={cn('pointer-events-none absolute z-30 h-[3px]', line.bad ? 'bg-red-500' : 'bg-sky-500')}
            style={{ top: line.top, left: line.left, width: line.width }}
          />
        )}
        {flat.map((r, i) => {
          const n = r.node;
          const hasK =
            n &&
            (n.children.some((c) => showArchived || !c.archivedAt) || n.services.some((s) => showArchived || !s.archivedAt));
          return (
            <div
              key={r.id}
              ref={setRowRef(r.id)}
              data-node-id={r.id}
              className="outline-none"
              tabIndex={-1}
            >
              <TreeRow
                kind={r.kind}
                id={r.id}
                name={r.name}
                depth={r.depth}
                rowIndex={i}
                isArchived={Boolean(r.sc?.archivedAt ?? n?.archivedAt)}
                isSelected={r.kind === 'service' ? r.id === selectedServiceId : r.id === selectedCategoryId}
                onActivate={() => {
                  focusIdx.current = i;
                  if (r.kind === 'service') onSelectService(r.id);
                  else onSelectCategory(r.id, n ?? null);
                }}
                searchQuery={debSearch}
                childCategoryCount={n ? n.children.length : 0}
                serviceCount={n ? n.services.length : 0}
                expanded={r.kind === 'category' && n ? expanded.has(n.id) : false}
                hasChildren={Boolean(hasK && r.kind === 'category')}
                onToggleExpand={r.kind === 'category' && n ? () => onToggleExpand(n.id) : undefined}
                isActive={r.sc?.isActive}
                fieldCount={r.kind === 'service' ? serviceMeta[r.id]?.fieldCount : undefined}
                lockedBookingMode={r.kind === 'service' ? serviceMeta[r.id]?.lockedBookingMode : undefined}
                editing={editing?.id === r.id}
                onStartEdit={() => setEditing(r.kind === 'category' ? { kind: 'c', id: r.id } : { kind: 's', id: r.id })}
                onSaveName={async (s) => {
                  setEditing(null);
                  try {
                    if (r.kind === 'category') await renameCategory(r.id, s);
                    else await renameService(r.id, s);
                    onToast('Saved', 'success');
                    await load();
                  } catch (er) {
                    onToast(er instanceof Error ? er.message : 'Save failed', 'error');
                    await load();
                  }
                }}
                onCancelEdit={() => setEditing(null)}
                onRowDragStart={(e) => onDragStart(e, { kind: r.kind, id: r.id })}
                onRowDragEnd={onDragEnd}
                onRowDragOver={(e) => onDragOverRow(e, r)}
                onRowDrop={(e) => onDropRow(e, r)}
                onRowDragEnter={() => {}}
                onRowDragLeave={() => {}}
                dropInvalid={Boolean(over?.id === r.id && over?.invalid)}
                dropInvalidTitle={over?.id === r.id ? over?.invalid : undefined}
                showQuickAdds={r.kind === 'category'}
                onQuickSub={() => {
                  setNamePrompt({ t: 'child', parentId: r.id });
                  setPromptName('');
                }}
                onQuickService={() => {
                  setNamePrompt({ t: 'service', parentId: r.id });
                  setPromptName('');
                }}
                kebab={
                  <NodeKebabMenu
                    kind={r.kind}
                    isArchived={Boolean(r.sc?.archivedAt ?? n?.archivedAt)}
                    isActive={r.sc?.isActive}
                    canArchive={canTaxonomyArchive}
                    onRename={() => setEditing(r.kind === 'category' ? { kind: 'c', id: r.id } : { kind: 's', id: r.id })}
                    onAddChildCategory={() => {
                      setNamePrompt({ t: 'child', parentId: r.id });
                      setPromptName('');
                    }}
                    onAddService={() => {
                      setNamePrompt({ t: 'service', parentId: r.id });
                      setPromptName('');
                    }}
                    onDuplicate={async () => {
                      if (r.kind === 'category' && n) {
                        void (async () => {
                          try {
                            const created = await createChildCategory(n.parentId ?? null, `${n.name} (copy)`);
                            onToast('Category duplicated (shallow)', 'success');
                            setExpanded((s) => new Set(s).add(created.id));
                            await load();
                          } catch (er) {
                            onToast(er instanceof Error ? er.message : 'Duplicate failed', 'error');
                          }
                        })();
                        return;
                      }
                      if (r.kind === 'service') {
                        void (async () => {
                          try {
                            const row = await getServiceDefinition(r.id);
                            if (!isServiceQuestionnaireV1(row.dynamicFieldsSchema)) {
                              onToast('No schema to copy', 'error');
                              return;
                            }
                            await createServiceDefinition({
                              name: `${row.name} (copy)`,
                              category: row.category,
                              subcategory: row.subcategory,
                              complianceTags: row.complianceTags,
                              categoryId: row.categoryId,
                              dynamicFieldsSchema: deepCloneForm(row.dynamicFieldsSchema),
                              isActive: false,
                              defaultMatchingMode: row.defaultMatchingMode,
                              description: row.description,
                              slug: null,
                            });
                            onToast('Duplicate created', 'success');
                            await load();
                          } catch (er) {
                            onToast(er instanceof Error ? er.message : 'Duplicate failed', 'error');
                          }
                        })();
                      }
                    }}
                    onArchive={async () => {
                      if (r.kind === 'category') {
                        void archiveCategory(r.id, false)
                          .then(() => onToast('Archived', 'success'))
                          .then(() => load())
                          .catch((er) => onToast(er instanceof Error ? er.message : 'Failed', 'error'));
                      } else
                        void archiveService(r.id)
                          .then(() => onToast('Archived', 'success'))
                          .then(() => load())
                          .catch((er) => onToast(er instanceof Error ? er.message : 'Failed', 'error'));
                    }}
                    onUnarchive={async () => {
                      if (r.kind === 'category') {
                        void unarchiveCategory(r.id, false)
                          .then(() => onToast('Unarchived', 'success'))
                          .then(() => load())
                          .catch((er) => onToast(er instanceof Error ? er.message : 'Failed', 'error'));
                      } else
                        void unarchiveService(r.id)
                          .then(() => onToast('Unarchived', 'success'))
                          .then(() => load())
                          .catch((er) => onToast(er instanceof Error ? er.message : 'Failed', 'error'));
                    }}
                    onOpenEditor={r.kind === 'service' ? () => onSelectService(r.id) : undefined}
                  />
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
