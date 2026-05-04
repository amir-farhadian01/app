import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, Folder, Search } from 'lucide-react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';

type ServiceLite = { id: string; name: string; archivedAt: string | null; isActive: boolean };
type CatItem = {
  id: string;
  name: string;
  children: CatItem[];
  services: ServiceLite[];
};

type Props = {
  disabled?: boolean;
  selectedId: string | null;
  onSelect: (catalog: { id: string; name: string; categoryPath: string; lockedBookingMode: string | null }) => void;
};

function collectSearchHits(nodes: CatItem[], q: string, path: string[]): { id: string; name: string; path: string }[] {
  if (!q.trim()) return [];
  const ql = q.toLowerCase();
  const out: { id: string; name: string; path: string }[] = [];
  for (const n of nodes) {
    const p = [...path, n.name];
    for (const s of n.services) {
      if (s.archivedAt || s.isActive === false) continue;
      if (s.name.toLowerCase().includes(ql)) {
        out.push({ id: s.id, name: s.name, path: p.join(' › ') });
      }
    }
    out.push(...collectSearchHits(n.children || [], q, p));
  }
  return out;
}

export function CatalogPicker({ disabled, selectedId, onSelect }: Props) {
  const [tree, setTree] = useState<CatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await api.get<CatItem[]>('/api/categories/tree-with-services');
        setTree(Array.isArray(data) ? data : []);
      } catch {
        setTree([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hits = useMemo(() => collectSearchHits(tree, q, []), [tree, q]);

  const selectService = useCallback(
    async (id: string, name: string, pathLabel: string) => {
      try {
        const full = await api.get<{
          breadcrumbs?: { name: string }[];
          serviceCatalog: { id: string; name: string; lockedBookingMode?: string | null };
        }>(`/api/service-catalog/${id}/schema`);
        const path = full.breadcrumbs?.map((b) => b.name).join(' › ') || pathLabel;
        onSelect({
          id: full.serviceCatalog.id,
          name: full.serviceCatalog.name || name,
          categoryPath: path,
          lockedBookingMode: full.serviceCatalog.lockedBookingMode ?? null,
        });
      } catch {
        onSelect({ id, name, categoryPath: pathLabel, lockedBookingMode: null });
      }
    },
    [onSelect]
  );

  const renderNode = (nodes: CatItem[], path: string[]) => (
    <ul className="space-y-0.5" role="tree">
      {nodes.map((n) => {
        const pathLabel = [...path, n.name].join(' › ');
        const o = open[n.id] ?? true;
        return (
          <li key={n.id} className="text-sm">
            <button
              type="button"
              onClick={() => setOpen((p) => ({ ...p, [n.id]: !o }))}
              className="flex w-full items-center gap-1 rounded-lg px-1 py-0.5 text-left font-medium text-app-text hover:bg-app-input"
            >
              <ChevronRight
                className={cn('h-4 w-4 shrink-0 text-neutral-400 transition', o && 'rotate-90')}
                aria-hidden
              />
              <Folder className="h-3.5 w-3.5 text-amber-600" aria-hidden />
              <span className="truncate">{n.name}</span>
            </button>
            {o && (
              <div className="ms-4 border-s border-app-border/80 ps-2">
                {n.services
                  .filter((s) => !s.archivedAt && s.isActive)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => void selectService(s.id, s.name, pathLabel)}
                      className={cn(
                        'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-app-input',
                        selectedId === s.id && 'bg-neutral-200/80 dark:bg-neutral-700/80'
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                      <span className="truncate font-semibold">{s.name}</span>
                    </button>
                  ))}
                {n.children?.length ? renderNode(n.children, [...path, n.name]) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading service catalog…</p>;
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          className="w-full rounded-xl border border-app-border bg-app-input py-2 pl-8 pr-3 text-sm text-app-text"
          placeholder="Search services…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
        />
      </div>
      {q.trim() && hits.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-xl border border-app-border bg-app-card p-1">
          {hits.slice(0, 20).map((h) => (
            <li key={h.id}>
              <button
                type="button"
                disabled={disabled}
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-app-input"
                onClick={() => void selectService(h.id, h.name, h.path)}
              >
                <span className="font-semibold">{h.name}</span>
                <span className="block truncate text-[10px] text-neutral-500">{h.path}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className="max-h-64 overflow-y-auto rounded-xl border border-app-border bg-app-input/40 p-2"
        role="region"
        aria-label="Service catalog tree"
      >
        {tree.length ? renderNode(tree, []) : <p className="text-xs text-neutral-500">No categories.</p>}
      </div>
    </div>
  );
}
