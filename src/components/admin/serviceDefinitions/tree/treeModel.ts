import type { CategoryTreeItem, ServiceCatalogLite } from '../../../../services/adminCategoryTree.js';

export const MAX_RELATIVE_DEPTH = 4; // depth 0..4 per server (5 levels)

type Kind = 'category' | 'service';

export function countCategoryFieldsInSubtree(n: CategoryTreeItem): { cats: number; services: number } {
  return {
    cats: n.children.length,
    services: n.services.length,
  };
}

/** `startId` (must be a category) is in the subtree under `rootAncestorId` (not equal). */
export function isCategoryUnder(
  byId: Map<string, { parentId: string | null; kind: Kind }>,
  rootAncestorId: string,
  startId: string
): boolean {
  let p: string | null = startId;
  const seen = new Set<string>();
  while (p) {
    if (p === rootAncestorId) return true;
    if (seen.has(p)) return true;
    seen.add(p);
    p = byId.get(p)?.parentId ?? null;
  }
  return false;
}

/** For cycle / depth checks. Includes categories and service catalog nodes. */
export function buildParentMap(tree: CategoryTreeItem[]): Map<string, { parentId: string | null; kind: Kind }> {
  const m = new Map<string, { parentId: string | null; kind: Kind }>();
  const walk = (n: CategoryTreeItem, p: string | null) => {
    m.set(n.id, { parentId: p, kind: 'category' });
    n.children.forEach((c) => walk(c, n.id));
    n.services.forEach((s) => m.set(s.id, { parentId: n.id, kind: 'service' }));
  };
  for (const r of tree) walk(r, null);
  return m;
}

function getDepthInTree(byId: Map<string, { parentId: string | null; kind: Kind }>, id: string): number {
  let d = 0;
  let cur: string | null = id;
  const s = new Set<string>();
  while (cur) {
    if (s.has(cur)) return 999;
    s.add(cur);
    const p = byId.get(cur)?.parentId;
    if (p == null) return d;
    d += 1;
    cur = p;
  }
  return d;
}

/** Longest path of category child edges under `root` (not counting `root` itself as height). */
export function categorySubtreeMaxChain(root: CategoryTreeItem): number {
  if (root.children.length === 0) return 0;
  return 1 + Math.max(...root.children.map(categorySubtreeMaxChain));
}

function findNode(tree: CategoryTreeItem[], id: string): CategoryTreeItem | null {
  for (const t of tree) {
    if (t.id === id) return t;
    const c = findNode(t.children, id);
    if (c) return c;
  }
  return null;
}

export function willExceedDepthOnMove(
  byId: Map<string, { parentId: string | null; kind: Kind }>,
  moving: CategoryTreeItem,
  newParentId: string | null
): boolean {
  const newBase =
    newParentId == null ? 0 : getDepthInTree(byId, newParentId) + 1;
  const h = categorySubtreeMaxChain(moving);
  return newBase + h > MAX_RELATIVE_DEPTH;
}

export function deepCloneTree(nodes: CategoryTreeItem[]): CategoryTreeItem[] {
  return nodes.map((n) => ({
    ...n,
    children: deepCloneTree(n.children),
    services: n.services.map((s) => ({ ...s })),
  }));
}

function pullCategory(
  list: CategoryTreeItem[],
  id: string
): { next: CategoryTreeItem[]; removed: CategoryTreeItem | null } {
  for (let i = 0; i < list.length; i += 1) {
    if (list[i]!.id === id) {
      const removed = list[i]!;
      const next = list.slice(0, i).concat(list.slice(i + 1));
      return { next, removed };
    }
    const sub = pullCategory(list[i]!.children, id);
    if (sub.removed) {
      const u = { ...list[i]!, children: sub.next };
      return { next: list.map((n, j) => (j === i ? u : n)), removed: sub.removed };
    }
  }
  return { next: list, removed: null };
}

function insertAtParent(
  list: CategoryTreeItem[],
  newParentId: string | null,
  node: CategoryTreeItem,
  sortIndex: number
): CategoryTreeItem[] {
  if (newParentId == null) {
    const a = list.slice(0, sortIndex);
    const b = list.slice(sortIndex);
    return [...a, node, ...b];
  }
  return list.map((n) => {
    if (n.id === newParentId) {
      const ch = n.children.slice(0, sortIndex).concat([node], n.children.slice(sortIndex));
      return { ...n, children: ch, depth: n.depth };
    }
    return { ...n, children: insertAtParent(n.children, newParentId, node, sortIndex) };
  });
}

function fixDepths(node: CategoryTreeItem, d: number): CategoryTreeItem {
  return {
    ...node,
    depth: d,
    children: node.children.map((c) => fixDepths(c, d + 1)),
  };
}

/**
 * Recompute depth fields from structure (0 for roots in array).
 */
export function reindexDepths(tree: CategoryTreeItem[]): CategoryTreeItem[] {
  return tree.map((n) => fixDepths(n, 0));
}

export function moveCategory(
  tree: CategoryTreeItem[],
  id: string,
  newParentId: string | null,
  sortIndex: number
): CategoryTreeItem[] {
  const t = deepCloneTree(tree);
  const { next: t2, removed } = pullCategory(t, id);
  if (!removed) return t;
  const reinsert = insertAtParent(t2, newParentId, fixDepths(removed, 0), sortIndex);
  return reindexDepths(reinsert);
}

type PullSvc = { serv: ServiceCatalogLite | null; tree: CategoryTreeItem[] };
function pullService(list: CategoryTreeItem[], id: string): PullSvc {
  for (let j = 0; j < list.length; j += 1) {
    const n = list[j]!;
    const i = n.services.findIndex((s) => s.id === id);
    if (i >= 0) {
      const serv = n.services[i]!;
      const nextN = { ...n, services: n.services.filter((s) => s.id !== id) };
      return { serv, tree: list.map((x, k) => (k === j ? nextN : x)) };
    }
    const sub = pullService(n.children, id);
    if (sub.serv) {
      return { serv: sub.serv, tree: list.map((x, k) => (k === j ? { ...n, children: sub.tree } : x)) };
    }
  }
  return { serv: null, tree: list };
}

function insertService(
  list: CategoryTreeItem[],
  categoryId: string,
  serv: ServiceCatalogLite,
  sortIndex: number
): CategoryTreeItem[] {
  return list.map((n) => {
    if (n.id === categoryId) {
      const s = n.services.filter((x) => x.id !== serv.id);
      const next = s.slice(0, sortIndex).concat([serv], s.slice(sortIndex));
      return { ...n, services: next };
    }
    if (n.children.length) {
      return { ...n, children: insertService(n.children, categoryId, serv, sortIndex) };
    }
    return n;
  });
}

export function moveServiceInTree(
  tree: CategoryTreeItem[],
  serviceId: string,
  newCategoryId: string,
  sortIndex: number
): CategoryTreeItem[] {
  const t = deepCloneTree(tree);
  const { serv, tree: t2 } = pullService(t, serviceId);
  if (!serv) return t;
  return reindexDepths(insertService(t2, newCategoryId, serv, sortIndex));
}

export function findCategory(tree: CategoryTreeItem[], id: string): CategoryTreeItem | null {
  return findNode(tree, id);
}

export { findNode };

export function filterTreeByQuery(
  nodes: CategoryTreeItem[],
  q: string,
  showArchived: boolean
): { filtered: CategoryTreeItem[]; expandAll: Set<string> } {
  const qq = q.trim().toLowerCase();
  if (!qq) return { filtered: nodes, expandAll: new Set() };
  const expandAll = new Set<string>();

  const filterNode = (n: CategoryTreeItem): CategoryTreeItem | null => {
    if (!showArchived && n.archivedAt) return null;
    const selfMatch = n.name.toLowerCase().includes(qq);
    const fChildren = n.children
      .map((c) => filterNode(c))
      .filter((x): x is CategoryTreeItem => x != null);
    const fServices = n.services.filter(
      (s) => (showArchived || s.archivedAt == null) && s.name.toLowerCase().includes(qq)
    );
    fChildren.forEach(() => expandAll.add(n.id));
    if (fServices.length) expandAll.add(n.id);
    if (selfMatch) return n;
    if (fChildren.length) return { ...n, children: fChildren };
    if (fServices.length) return { ...n, children: [], services: fServices };
    return null;
  };

  return {
    filtered: nodes
      .map((n) => filterNode(n))
      .filter((x): x is CategoryTreeItem => x != null),
    expandAll,
  };
}
