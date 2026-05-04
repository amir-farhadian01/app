import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import type { CrmColumnDef } from './types.js';

type Props<TRow> = {
  open: boolean;
  columns: CrmColumnDef<TRow>[];
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  onSave: (visibility: Record<string, boolean>, order: string[]) => void;
  onReset: () => void;
  onClose: () => void;
};

export function ColumnManager<TRow>({
  open,
  columns,
  columnOrder,
  columnVisibility,
  onSave,
  onReset,
  onClose,
}: Props<TRow>) {
  const [draftOrder, setDraftOrder] = useState<string[]>(columnOrder);
  const [draftVis, setDraftVis] = useState<Record<string, boolean>>(columnVisibility);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraftOrder([...columnOrder]);
      setDraftVis({ ...columnVisibility });
    }
  }, [open, columnOrder, columnVisibility]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const idToCol = new Map(columns.map((c) => [c.id, c] as const));

  const orderedIds = draftOrder.filter((id) => idToCol.has(id));
  if (orderedIds.length !== draftOrder.length) {
    /* column set changed */
  }

  const move = (fromId: string, toIndex: number) => {
    const idx = draftOrder.indexOf(fromId);
    if (idx < 0) return;
    const next = draftOrder.filter((id) => id !== fromId);
    next.splice(toIndex, 0, fromId);
    setDraftOrder(next);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close column manager"
            className="fixed inset-0 z-[70] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Manage columns"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 z-[71] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-app-border bg-app-card p-6 text-app-text shadow-2xl"
          >
            <h2 className="text-lg font-semibold">Columns</h2>
            <p className="mt-1 text-sm text-neutral-500">Show, hide, and reorder. Save applies to this table only.</p>
            <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto">
              {draftOrder
                .filter((id) => idToCol.has(id))
                .map((id, i) => {
                  const c = idToCol.get(id)!;
                  return (
                    <li
                      key={id}
                      draggable
                      onDragStart={() => {
                        setDragId(id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={() => {
                        if (!dragId) return;
                        move(dragId, i);
                        setDragId(null);
                      }}
                      onDragEnd={() => setDragId(null)}
                      className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-app-border"
                    >
                      <span
                        className="cursor-grab text-neutral-400"
                        aria-hidden
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <label
                        className={cn(
                          'flex flex-1 items-center gap-2',
                          c.hideable === false ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-app-border disabled:opacity-50"
                          disabled={c.hideable === false}
                          checked={draftVis[id] !== false}
                          onChange={(e) => setDraftVis((v) => ({ ...v, [id]: e.target.checked }))}
                        />
                        <span className="text-sm">{c.header}</span>
                        {c.hideable === false && (
                          <span className="ml-auto text-[10px] text-neutral-400">Required</span>
                        )}
                      </label>
                    </li>
                  );
                })}
            </ul>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                aria-label="Reset columns to default"
                className="rounded-lg border border-app-border px-3 py-2 text-sm text-app-text hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => {
                  onReset();
                  onClose();
                }}
              >
                Reset to default
              </button>
              <button
                type="button"
                aria-label="Cancel"
                className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                aria-label="Save columns"
                className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
                onClick={() => {
                  onSave(draftVis, draftOrder);
                  onClose();
                }}
              >
                Save
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
