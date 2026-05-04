import { useState, useCallback } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { ServiceDefinitionEditor } from './ServiceDefinitionEditor';
import { ServiceTree, useMediaMax900 } from './tree/ServiceTree.js';
import { createChildCategory, createLeafService, type CategoryTreeItem } from '../../../services/adminCategoryTree.js';
import { countCategoryFieldsInSubtree } from './tree/treeModel.js';
import { cn } from '../../../lib/utils.js';

type Notif = { show: boolean; message: string; type: 'success' | 'error' } | null;

function CategorySummary({
  n,
  onAddChild,
  onAddService,
}: {
  n: CategoryTreeItem;
  onAddChild: () => void;
  onAddService: () => void;
}) {
  const { cats, services } = countCategoryFieldsInSubtree(n);
  return (
    <div className="space-y-3 rounded-2xl border border-app-border bg-app-bg/80 p-4">
      <h3 className="text-lg font-black text-app-text">{n.name}</h3>
      <p className="text-xs text-app-text/70">
        Depth {n.depth} · {cats} subcategories · {services} service definitions
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-bold text-app-text"
          onClick={onAddChild}
        >
          + Child category
        </button>
        <button
          type="button"
          className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-bold text-app-text"
          onClick={onAddService}
        >
          + Service
        </button>
      </div>
    </div>
  );
}

export function AdminServiceDefinitionsSection({
  showSuccess,
  setNotification,
  setShowConfirmModal: _setShowConfirmModal,
  onOpenProviderPackagesForCatalog,
}: {
  showSuccess: (m: string) => void;
  setNotification: (n: Notif) => void;
  setShowConfirmModal: (s: {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    type: 'danger' | 'warning' | 'info';
  }) => void;
  onOpenProviderPackagesForCatalog?: (serviceCatalogId: string) => void;
}) {
  void _setShowConfirmModal;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryTreeItem | null>(null);
  const narrow = useMediaMax900();

  const onToast = (message: string, type: 'success' | 'error') => {
    if (type === 'success') showSuccess(message);
    else {
      setNotification({ show: true, message, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const onSaved = useCallback((id: string) => {
    setEditingId(id);
    setIsNew(false);
    setSelectedServiceId(id);
  }, []);

  const onCloseEditor = useCallback(() => {
    setEditingId(null);
    setIsNew(false);
    setSelectedServiceId(null);
  }, []);

  const showEditor = isNew || selectedServiceId != null;
  const showTreeColumn = !narrow || !showEditor;
  const showBack = narrow && showEditor;

  const [nameDlg, setNameDlg] = useState<{ t: 'ch' | 'sv'; parentId: string } | null>(null);
  const [dlgName, setDlgName] = useState('');

  return (
    <div className="flex min-h-[min(60vh,560px)] min-w-0 flex-1 flex-col">
      {nameDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog">
          <form
            className="w-full max-w-sm rounded-2xl border border-app-border bg-app-bg p-4 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              const n = dlgName.trim();
              if (!n) return;
              const d = nameDlg;
              setNameDlg(null);
              setDlgName('');
              void (async () => {
                try {
                  if (d.t === 'ch') await createChildCategory(d.parentId, n);
                  else {
                    const s = await createLeafService(d.parentId, n);
                    setSelectedServiceId(s.id);
                    setEditingId(s.id);
                    setIsNew(false);
                    setSelectedCategory(null);
                  }
                  showSuccess(d.t === 'ch' ? 'Category created' : 'Service created');
                } catch (err) {
                  onToast(err instanceof Error ? err.message : 'Create failed', 'error');
                }
              })();
            }}
          >
            <label className="text-xs font-bold">Name</label>
            <input
              className="mt-1 w-full rounded border p-2"
              autoFocus
              value={dlgName}
              onChange={(e) => setDlgName(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setNameDlg(null)}>
                Cancel
              </button>
              <button type="submit" className="rounded bg-app-text px-3 py-1 text-sm text-app-bg">
                Create
              </button>
            </div>
          </form>
        </div>
      )}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col md:flex-row md:min-h-[560px]',
          'md:items-stretch'
        )}
      >
        {showTreeColumn && (
          <div
            className="flex h-[min(50vh,420px)] w-full min-w-0 flex-col border-app-border md:h-auto md:min-w-[400px] md:max-w-[44%] md:w-[44%] md:border-r"
            style={undefined}
          >
            <ServiceTree
              onSelectService={(id) => {
                setSelectedServiceId(id);
                setEditingId(id);
                setIsNew(false);
                setSelectedCategory(null);
              }}
              onSelectCategory={(_id, node) => {
                setSelectedCategory(node);
                if (node) {
                  setSelectedServiceId(null);
                  setEditingId(null);
                }
              }}
              selectedServiceId={selectedServiceId}
              selectedCategoryId={selectedCategory?.id ?? null}
              onToast={onToast}
            />
          </div>
        )}
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-2 md:min-w-0',
            'md:min-h-0'
          )}
        >
          {showBack && (
            <button
              type="button"
              className="mb-2 inline-flex max-w-xs items-center gap-2 rounded-lg border border-app-border px-2 py-1.5 text-sm font-bold"
              onClick={onCloseEditor}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to tree
            </button>
          )}
          {showEditor ? (
            <ServiceDefinitionEditor
              id={isNew ? null : selectedServiceId}
              isNew={isNew}
              onClose={onCloseEditor}
              onSaved={onSaved}
              showSuccess={showSuccess}
              setNotification={setNotification}
              onOpenProviderPackagesForCatalog={onOpenProviderPackagesForCatalog}
              onDuplicated={(newId) => {
                setSelectedServiceId(newId);
                setEditingId(newId);
                setIsNew(false);
              }}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-2">
              {selectedCategory ? (
                <CategorySummary
                  n={selectedCategory}
                  onAddChild={() => {
                    setNameDlg({ t: 'ch', parentId: selectedCategory.id });
                    setDlgName('');
                  }}
                  onAddService={() => {
                    setNameDlg({ t: 'sv', parentId: selectedCategory.id });
                    setDlgName('');
                  }}
                />
              ) : (
                <p className="text-sm text-app-text/70">Select a service to edit, or add one from the tree.</p>
              )}
              <button
                type="button"
                className="inline-flex w-fit items-center gap-2 rounded-2xl border border-app-border px-4 py-2 text-sm font-bold"
                onClick={() => {
                  setIsNew(true);
                  setEditingId(null);
                  setSelectedServiceId(null);
                  setSelectedCategory(null);
                }}
              >
                <Plus className="h-4 w-4" />
                Create new service (blank)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
