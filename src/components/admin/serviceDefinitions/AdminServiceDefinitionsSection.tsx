import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { ServiceDefinitionEditor } from './ServiceDefinitionEditor';
import { ServiceList } from './ServiceList.js';

type Notif = { show: boolean; message: string; type: 'success' | 'error' } | null;

export function AdminServiceDefinitionsSection({
  showSuccess,
  setNotification,
  setShowConfirmModal,
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
  void onOpenProviderPackagesForCatalog;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [openBuilderOnStart, setOpenBuilderOnStart] = useState(false);

  const onSaved = useCallback((id: string) => {
    setActiveId(id);
    setIsNew(false);
    setRefreshKey((x) => x + 1);
  }, []);

  const onCloseEditor = useCallback(() => {
    setActiveId(null);
    setIsNew(false);
    setEditorOpen(false);
    setOpenBuilderOnStart(false);
  }, []);

  const showEditor = editorOpen && (isNew || activeId != null);

  return (
    <div className="flex min-h-[min(60vh,560px)] min-w-0 flex-1 flex-col">
      <ServiceList
        refreshKey={refreshKey}
        onEdit={(id) => {
          setActiveId(id);
          setIsNew(false);
          setOpenBuilderOnStart(false);
          setEditorOpen(true);
        }}
        onOpenFormEditor={(id) => {
          setActiveId(id);
          setIsNew(false);
          setOpenBuilderOnStart(true);
          setEditorOpen(true);
        }}
        onNew={() => {
          setIsNew(true);
          setActiveId(null);
          setOpenBuilderOnStart(false);
          setEditorOpen(true);
        }}
        onDuplicate={(id) => {
          setActiveId(id);
          setIsNew(false);
          setOpenBuilderOnStart(false);
          setEditorOpen(true);
        }}
        setNotification={setNotification}
        setShowConfirm={setShowConfirmModal}
      />

      {showEditor && (
        <div className="fixed inset-0 z-[210] bg-black/60">
          <div className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto border-l border-app-border bg-app-bg p-4 shadow-2xl">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={onCloseEditor}
                className="rounded-lg border border-app-border p-2 text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Close editor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ServiceDefinitionEditor
              id={isNew ? null : activeId}
              isNew={isNew}
              onClose={onCloseEditor}
              onSaved={onSaved}
              showSuccess={showSuccess}
              setNotification={setNotification}
              initialOpenFormBuilder={openBuilderOnStart}
            />
          </div>
        </div>
      )}
    </div>
  );
}
