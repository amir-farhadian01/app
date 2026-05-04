import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { CategoryTreeNode } from '../../../services/adminServiceDefinitions';

type Props = {
  tree: CategoryTreeNode[];
  value: string | null;
  onChange: (categoryId: string, breadcrumbLabels: string[]) => void;
  className?: string;
};

function flatten(
  nodes: CategoryTreeNode[],
  depth = 0,
  acc: { id: string; label: string; depth: number }[] = []
) {
  for (const n of nodes) {
    if (depth >= 5) continue;
    acc.push({ id: n.id, label: n.name, depth });
    if (n.children?.length) flatten(n.children, depth + 1, acc);
  }
  return acc;
}

function findPath(
  id: string,
  tree: CategoryTreeNode[],
  path: string[] = []
): string[] | null {
  for (const n of tree) {
    if (n.id === id) return [...path, n.name];
    if (n.children?.length) {
      const p = findPath(id, n.children, [...path, n.name]);
      if (p) return p;
    }
  }
  return null;
}

export function buildBreadcrumbFromTree(categoryId: string | null, tree: CategoryTreeNode[]): string {
  if (!categoryId) return '—';
  const p = findPath(categoryId, tree);
  return p?.join(' › ') ?? '—';
}

export function CategoryPicker({ tree, value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const flat = useMemo(() => flatten(tree), [tree]);
  const display = useMemo(() => (value ? findPath(value, tree)?.join(' › ') : 'Select category…'), [value, tree]);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-2xl border border-app-border bg-app-input px-4 py-3 text-left text-sm font-bold text-app-text',
          'hover:border-neutral-400 dark:hover:border-neutral-500'
        )}
      >
        <span className="min-w-0 flex-1 break-words text-left">{display}</span>
        <ChevronsUpDown className="w-4 h-4 shrink-0 text-neutral-400" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-app-border bg-app-card p-2 shadow-lg"
            >
              {flat.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    onChange(
                      row.id,
                      findPath(row.id, tree) ?? [row.label]
                    );
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-1 rounded-xl px-3 py-2 text-left text-sm font-bold text-app-text',
                    'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                    value === row.id && 'bg-neutral-200/80 dark:bg-neutral-800'
                  )}
                  style={{ paddingLeft: 12 + row.depth * 16 }}
                >
                  {row.depth > 0 && <ChevronRight className="h-3 w-3 text-neutral-400" />}
                  <span className="min-w-0 flex-1 break-words text-left">{row.label}</span>
                  {value === row.id && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                </button>
              ))}
              {flat.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-neutral-500">No categories</p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
