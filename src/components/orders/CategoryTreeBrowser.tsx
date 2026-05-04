import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronRight, FolderOpen, Wrench } from 'lucide-react';
import {
  searchCategoriesAndCatalogs,
  getServiceCatalogsInCategory,
  type CatalogInCategoryRow,
  type CatalogSelectionMeta,
  type CategorySearchHit,
  type ServiceCatalogSearchHit,
} from '../../services/orders';
import { cn } from '../../lib/utils';

type TreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  icon: string | null;
  children: TreeNode[];
};

function findNode(tree: TreeNode[], id: string): TreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    const c = findNode(n.children, id);
    if (c) return c;
  }
  return null;
}

export type CategoryTreeBrowserProps = {
  onSelectServiceCatalog: (catalogId: string, meta?: CatalogSelectionMeta) => void;
  /** Fires immediately before `onSelectServiceCatalog` (e.g. prefetch schema). */
  onServiceCatalogPress?: (catalogId: string) => void;
  /** Navigate into this path after tree loads (from search). */
  initialPathIds?: string[];
  showOtherRow?: boolean;
  onOtherRequest?: () => void;
  /** Focus the in-tree search field after mount (e.g. new offer entry). */
  autoFocusSearch?: boolean;
};

export function CategoryTreeBrowser({
  onSelectServiceCatalog,
  onServiceCatalogPress,
  initialPathIds,
  showOtherRow,
  onOtherRequest,
  autoFocusSearch,
}: CategoryTreeBrowserProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [path, setPath] = useState<TreeNode[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogInCategoryRow[]>([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [catHits, setCatHits] = useState<CategorySearchHit[]>([]);
  const [scHits, setScHits] = useState<ServiceCatalogSearchHit[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/categories/tree');
        const data = (await res.json()) as TreeNode[];
        setTree(Array.isArray(data) ? data : []);
      } catch {
        setTree([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!autoFocusSearch) return;
    const id = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [autoFocusSearch]);

  const current = path[path.length - 1] ?? null;
  const children = current ? current.children : tree;

  const loadCatalogs = useCallback(async (categoryId: string) => {
    setLoadingCat(true);
    try {
      const items = await getServiceCatalogsInCategory(categoryId);
      setCatalogs(items);
    } catch {
      setCatalogs([]);
    } finally {
      setLoadingCat(false);
    }
  }, []);

  useEffect(() => {
    if (!tree.length || !initialPathIds?.length) return;
    const stack: TreeNode[] = [];
    for (const id of initialPathIds) {
      const n = findNode(tree, id);
      if (n) stack.push(n);
    }
    if (stack.length) {
      setPath(stack);
      const leaf = stack[stack.length - 1];
      if (leaf && (!leaf.children || leaf.children.length === 0)) {
        void loadCatalogs(leaf.id);
      } else {
        setCatalogs([]);
      }
    }
  }, [tree, initialPathIds, loadCatalogs]);

  useEffect(() => {
    if (!current) {
      setCatalogs([]);
      return;
    }
    if (!current.children?.length) {
      void loadCatalogs(current.id);
    } else {
      setCatalogs([]);
    }
  }, [current?.id, current?.children?.length, loadCatalogs]);

  useEffect(() => {
    const t = setTimeout(() => {
      const term = q.trim();
      if (!term) {
        setCatHits([]);
        setScHits([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      void (async () => {
        try {
          const r = await searchCategoriesAndCatalogs(term, 20);
          setCatHits(r.categories);
          setScHits(r.serviceCatalogs);
        } catch {
          setCatHits([]);
          setScHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const enterCategory = (node: TreeNode) => {
    setPath((p) => [...p, node]);
    setQ('');
    setCatHits([]);
    setScHits([]);
  };

  const crumbClick = (idx: number) => {
    setPath((p) => p.slice(0, idx + 1));
  };

  const showSearch = q.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search categories or services…"
          className="w-full min-h-[52px] pl-12 pr-4 rounded-2xl border border-app-border bg-app-input text-[15px] text-app-text"
          aria-label="Search"
        />
      </div>

      {showSearch ? (
        <div className="space-y-3 rounded-2xl border border-app-border bg-app-card p-4 max-h-[50vh] overflow-y-auto">
          {searching ? <p className="text-sm text-neutral-500">Searching…</p> : null}
          {!searching && !catHits.length && !scHits.length ? (
            <p className="text-sm text-neutral-500">No matches.</p>
          ) : null}
          {catHits.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                const stack: TreeNode[] = [];
                for (const id of c.pathIds) {
                  const n = findNode(tree, id);
                  if (n) stack.push(n);
                }
                setPath(stack);
                setQ('');
                setCatHits([]);
                setScHits([]);
                const leaf = stack[stack.length - 1];
                if (leaf && (!leaf.children || leaf.children.length === 0)) {
                  void loadCatalogs(leaf.id);
                }
              }}
              className="w-full min-h-[48px] flex items-center gap-3 p-3 rounded-xl bg-app-bg border border-app-border text-left"
            >
              <FolderOpen className="w-5 h-5 shrink-0 text-neutral-400" />
              <div>
                <p className="font-bold text-app-text">{c.name}</p>
                <p className="text-xs text-neutral-500">{c.breadcrumb.join(' › ')}</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-neutral-300" />
            </button>
          ))}
          {scHits.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onServiceCatalogPress?.(s.id);
                onSelectServiceCatalog(s.id, {
                  name: s.name,
                  slug: s.slug,
                  lockedBookingMode: null,
                });
              }}
              className="w-full min-h-[48px] flex items-center gap-3 p-3 rounded-xl bg-app-bg border border-app-border text-left"
            >
              <Wrench className="w-5 h-5 shrink-0 text-neutral-400" />
              <div>
                <p className="font-bold text-app-text">{s.name}</p>
                <p className="text-xs text-neutral-500">{s.breadcrumb.join(' › ')}</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-neutral-300" />
            </button>
          ))}
        </div>
      ) : (
        <>
          <nav className="flex flex-wrap items-center gap-1 text-xs font-bold text-neutral-500">
            <button type="button" className="min-h-[40px] px-2 rounded-lg hover:bg-app-card" onClick={() => setPath([])}>
              All
            </button>
            {path.map((n, i) => (
              <span key={n.id} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                <button
                  type="button"
                  className="min-h-[40px] px-2 rounded-lg hover:bg-app-card text-app-text"
                  onClick={() => crumbClick(i)}
                >
                  {n.name}
                </button>
              </span>
            ))}
          </nav>

          <AnimatePresence mode="wait">
            <motion.div
              key={current?.id ?? 'root'}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-3 md:grid-cols-4 gap-2"
            >
              {children.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => enterCategory(node)}
                  className="min-h-[48px] aspect-square sm:aspect-auto sm:min-h-[72px] flex flex-col items-center justify-center p-3 rounded-2xl border border-app-border bg-app-card hover:border-neutral-900 dark:hover:border-white transition-colors text-center"
                >
                  <span className="text-[13px] font-bold text-app-text leading-tight line-clamp-3">{node.name}</span>
                </button>
              ))}
            </motion.div>
          </AnimatePresence>

          {current && !children.length && loadingCat ? (
            <p className="text-sm text-neutral-500 py-4">Loading services…</p>
          ) : null}

          {current && !children.length && !loadingCat && catalogs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Choose a service type</p>
              <div className="grid grid-cols-1 gap-2">
                {catalogs.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onServiceCatalogPress?.(c.id);
                      onSelectServiceCatalog(c.id, {
                        name: c.name,
                        slug: c.slug,
                        lockedBookingMode: c.lockedBookingMode ?? null,
                      });
                    }}
                    className="min-h-[48px] w-full text-left p-4 rounded-2xl border border-app-border bg-app-card hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <span className="font-bold text-app-text text-[15px]">{c.name}</span>
                    {c.description ? (
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{c.description}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {current && !children.length && !loadingCat && catalogs.length === 0 ? (
            <p className="text-sm text-neutral-500 py-6 text-center">No service types in this category yet.</p>
          ) : null}

          {showOtherRow && onOtherRequest ? (
            <button
              type="button"
              onClick={onOtherRequest}
              className="mt-4 w-full min-h-[52px] rounded-2xl border-2 border-dashed border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/20 px-4 py-3 text-left text-sm font-bold text-app-text transition hover:border-amber-600"
            >
              Other — Request a new service type
              <span className="mt-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Pick the closest category if you can, then describe your request in the next steps. Our team reviews Other
                submissions.
              </span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
