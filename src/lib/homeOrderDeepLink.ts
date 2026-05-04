/** Resolve marketing `homeCategory` slug/name to category path ids for the F5 tree browser. */

export type CategoryTreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  children?: CategoryTreeNode[];
};

function collectPaths(
  nodes: CategoryTreeNode[],
  prefix: CategoryTreeNode[],
  slug: string,
  out: CategoryTreeNode[][],
): void {
  const s = slug.trim().toLowerCase();
  if (!s) return;
  for (const n of nodes) {
    const chain = [...prefix, n];
    const nm = (n.name || '').toLowerCase();
    const match =
      nm === s ||
      nm.includes(s) ||
      s.includes(nm.split(/\s+/)[0] || '') ||
      (s.length >= 4 && nm.split(/\s+/).some((w) => w.startsWith(s) || s.startsWith(w)));
    if (match) {
      out.push(chain);
    }
    if (n.children?.length) {
      collectPaths(n.children, chain, slug, out);
    }
  }
}

/** Returns path ids from root → best-matching leaf, or null. */
export function resolveHomeCategoryPathIds(tree: CategoryTreeNode[], homeCategory: string): string[] | null {
  const buckets: CategoryTreeNode[][] = [];
  collectPaths(tree, [], homeCategory.trim(), buckets);
  if (!buckets.length) return null;
  buckets.sort((a, b) => b.length - a.length);
  return buckets[0]!.map((n) => n.id);
}
