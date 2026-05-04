import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../../lib/api';
import { useWorkspace } from '../../../lib/WorkspaceContext';
import { useSoftToast } from '../../../lib/SoftToastContext';
import { listPackages, type ProviderServicePackageRow } from '../../../services/workspaces';
import { PackagesTable, type EnrichedPackage } from './PackagesTable';
import { PackageEditorDrawer } from './PackageEditorDrawer';
import { cn } from '../../../lib/utils';

type TreeCat = {
  id: string;
  name: string;
  children: TreeCat[];
  services: { id: string; name: string; archivedAt: string | null; isActive: boolean }[];
};

function breadcrumbForCatalogId(tree: TreeCat[], catalogId: string, path: string[] = []): string | null {
  for (const n of tree) {
    if (n.services?.some((s) => s.id === catalogId)) {
      return [...path, n.name].join(' › ');
    }
    const sub = breadcrumbForCatalogId(n.children || [], catalogId, [...path, n.name]);
    if (sub) {
      return sub;
    }
  }
  return null;
}

export function ProviderPackagesSection() {
  const navigate = useNavigate();
  const { activeWorkspaceId, loading: wsLoad } = useWorkspace();
  const { showToast } = useSoftToast();
  const [tree, setTree] = useState<TreeCat[]>([]);
  const [rows, setRows] = useState<ProviderServicePackageRow[]>([]);
  const [load, setLoad] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [edit, setEdit] = useState<ProviderServicePackageRow | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const t = await api.get<TreeCat[]>('/api/categories/tree-with-services');
        setTree(Array.isArray(t) ? t : []);
      } catch {
        setTree([]);
      }
    })();
  }, []);

  const loadPackages = useCallback(async () => {
    if (!activeWorkspaceId) {
      setRows([]);
      setLoad(false);
      return;
    }
    setLoad(true);
    try {
      const p = await listPackages(activeWorkspaceId, { includeArchived });
      setRows(p);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load');
      setRows([]);
    } finally {
      setLoad(false);
    }
  }, [activeWorkspaceId, includeArchived, showToast]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const enriched: EnrichedPackage[] = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        catalogBreadcrumb: breadcrumbForCatalogId(tree, r.serviceCatalogId) || r.serviceCatalog.category,
        serviceCatalog: {
          ...r.serviceCatalog,
          lockedBookingMode: r.serviceCatalog.lockedBookingMode ?? null,
        },
      })),
    [rows, tree]
  );

  if (wsLoad) {
    return <p className="text-sm text-neutral-500">Loading workspace…</p>;
  }
  if (!activeWorkspaceId) {
    return <p className="text-sm text-amber-700 dark:text-amber-300">Select a workspace first.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            className="rounded border-app-border"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Show archived
        </label>
        <button
          type="button"
          onClick={() => {
            setEdit(null);
            setDrawerOpen(true);
          }}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900'
          )}
        >
          <Plus className="h-4 w-4" />
          Add package
        </button>
      </div>

      {load && enriched.length === 0 ? (
        <div className="rounded-2xl border border-app-border bg-app-card p-8 text-center text-sm text-neutral-500" aria-busy>
          Loading packages…
        </div>
      ) : !enriched.length ? (
        <div
          className="rounded-3xl border border-dashed border-app-border bg-app-card/60 p-10 text-center"
          role="region"
          aria-labelledby="pkg-empty-title"
        >
          <h2 id="pkg-empty-title" className="text-lg font-black text-app-text">
            No packages yet
          </h2>
          <p className="mt-2 text-sm text-neutral-500">Add your first package to set pricing and booking mode for a service.</p>
          <button
            type="button"
            onClick={() => {
              setEdit(null);
              setDrawerOpen(true);
            }}
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900"
          >
            Add your first one →
          </button>
        </div>
      ) : (
        <PackagesTable
          workspaceId={activeWorkspaceId}
          rows={enriched}
          loading={load}
          onEdit={(r) => {
            setEdit(r);
            setDrawerOpen(true);
          }}
          onRefresh={() => void loadPackages()}
          showToast={showToast}
        />
      )}

      <PackageEditorDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEdit(null);
        }}
        workspaceId={activeWorkspaceId}
        initial={edit}
        onSaved={() => void loadPackages()}
        showToast={showToast}
        onGoToInventory={() => {
          const p = new URLSearchParams();
          p.set('tab', 'inventory');
          navigate({ pathname: '/dashboard', search: p.toString() });
        }}
      />
    </div>
  );
}
