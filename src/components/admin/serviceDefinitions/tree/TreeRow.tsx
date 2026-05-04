import { useRef } from 'react';
import { ChevronRight, Folder, Wrench, GripVertical } from 'lucide-react';
import { cn } from '../../../../lib/utils.js';
import { InlineNameEditor } from './InlineNameEditor.js';

const INDENT = 20;

function BookingLockBadge({ mode }: { mode: string | null | undefined }) {
  if (mode === 'auto_appointment') {
    return (
      <span className="shrink-0 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-sky-900 dark:bg-sky-900/40 dark:text-sky-100">
        Auto
      </span>
    );
  }
  if (mode === 'negotiation') {
    return (
      <span className="shrink-0 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-950 dark:bg-orange-900/40 dark:text-orange-100">
        Negotiation
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-md bg-neutral-200 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
      Free
    </span>
  );
}

function highlightName(name: string, q: string) {
  if (!q.trim()) return <>{name}</>;
  const s = name;
  const lower = s.toLowerCase();
  const qi = q.trim().toLowerCase();
  const i = lower.indexOf(qi);
  if (i < 0) return <>{name}</>;
  const a = s.slice(0, i);
  const b = s.slice(i, i + q.trim().length);
  const c = s.slice(i + q.trim().length);
  return (
    <>
      {a}
      <mark className="bg-amber-200/80 text-app-text dark:bg-amber-500/30">{b}</mark>
      {c}
    </>
  );
}

export type TreeRowProps = {
  kind: 'category' | 'service';
  id: string;
  name: string;
  depth: number;
  rowIndex: number;
  isArchived: boolean;
  isSelected: boolean;
  onActivate: () => void;
  searchQuery: string;
  /** Category */
  childCategoryCount?: number;
  serviceCount?: number;
  expanded?: boolean;
  hasChildren?: boolean;
  onToggleExpand?: () => void;
  /** Service */
  isActive?: boolean;
  fieldCount?: number;
  /** From `getServiceDefinition` (same fetch as field counts); tree API does not include lock. */
  lockedBookingMode?: string | null;
  /** Inline rename */
  editing: boolean;
  onStartEdit: () => void;
  onSaveName: (s: string) => void;
  onCancelEdit: () => void;
  /** DnD */
  onRowDragStart: (e: React.DragEvent) => void;
  onRowDragOver: (e: React.DragEvent) => void;
  onRowDragEnd: (e: React.DragEvent) => void;
  onRowDrop: (e: React.DragEvent) => void;
  onRowDragEnter?: (e: React.DragEvent) => void;
  onRowDragLeave?: (e: React.DragEvent) => void;
  dropInvalid: boolean;
  dropInvalidTitle?: string;
  /** Category quick actions */
  showQuickAdds: boolean;
  onQuickSub?: () => void;
  onQuickService?: () => void;
  kebab: React.ReactNode;
};

export function TreeRow(p: TreeRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const pad = p.depth * INDENT;
  const canExpand = p.kind === 'category' && p.hasChildren;
  return (
    <div
      ref={rowRef}
      data-node-id={p.id}
      role="treeitem"
      aria-expanded={p.kind === 'category' ? (p.hasChildren ? p.expanded : false) : undefined}
      aria-level={p.depth + 1}
      aria-selected={p.isSelected}
      className={cn(
        'group relative flex w-full min-w-0 cursor-pointer select-none border-b border-app-border/40',
        'min-h-[44px] items-center py-1 pr-1',
        p.rowIndex % 2 === 1 ? 'bg-app-text/[0.03] dark:bg-white/[0.04]' : 'bg-transparent',
        p.isArchived && 'opacity-50',
        p.isSelected && 'ring-1 ring-inset ring-app-text/20',
        p.dropInvalid && 'ring-1 ring-inset ring-red-500/60'
      )}
      style={{ paddingLeft: pad }}
      tabIndex={-1}
      onClick={() => p.onActivate()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          p.onActivate();
        }
        if (e.key === ' ' && p.kind === 'category' && canExpand && p.onToggleExpand) {
          e.preventDefault();
          p.onToggleExpand();
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        p.onStartEdit();
      }}
      onDragOver={p.onRowDragOver}
      onDrop={p.onRowDrop}
      onDragEnter={p.onRowDragEnter}
      onDragLeave={p.onRowDragLeave}
    >
      {p.kind === 'category' ? (
        <span className="inline-flex w-5 shrink-0 items-center justify-center" aria-hidden>
          {canExpand ? (
            <button
              type="button"
              className="rounded p-0.5 text-app-text/70 hover:bg-app-card/80"
              onClick={(e) => {
                e.stopPropagation();
                p.onToggleExpand?.();
              }}
              tabIndex={-1}
            >
              <ChevronRight
                className={cn('h-4 w-4 transition-transform duration-[180ms] ease-out', p.expanded && 'rotate-90')}
              />
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
        </span>
      ) : (
        <span className="inline-block w-5 shrink-0" aria-hidden />
      )}

      <span
        className="inline-flex shrink-0 items-center"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span
          draggable
          onDragStart={p.onRowDragStart}
          onDragEnd={p.onRowDragEnd}
          className="inline-flex h-7 w-5 cursor-grab items-center justify-center text-app-text/30 opacity-0 transition hover:text-app-text/60 group-hover:opacity-100 active:cursor-grabbing"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </span>
      </span>

      {p.kind === 'category' ? (
        <Folder className="mx-0.5 h-4 w-4 shrink-0 text-amber-600/80 dark:text-amber-400/90" aria-hidden />
      ) : (
        <Wrench className="mx-0.5 h-4 w-4 shrink-0 text-sky-600/80 dark:text-sky-400/80" aria-hidden />
      )}

      <div className="ml-0.5 min-w-0 flex-1 text-left">
        {p.editing ? (
          <div className="pr-1" onClick={(e) => e.stopPropagation()}>
            <InlineNameEditor
              value={p.name}
              onSave={p.onSaveName}
              onCancel={p.onCancelEdit}
            />
          </div>
        ) : p.kind === 'category' ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pr-1">
            <span
              className="min-w-0 break-words text-sm font-bold text-app-text"
              title={p.name}
            >
              {highlightName(p.name, p.searchQuery)}
            </span>
            <span className="shrink-0 rounded-full border border-app-border/80 bg-app-bg px-1.5 py-0.5 text-[10px] font-bold text-app-text/60">
              {p.childCategoryCount ?? 0} categories · {p.serviceCount ?? 0} services
            </span>
            {p.isArchived && (
              <span className="shrink-0 rounded bg-neutral-200 px-1.5 text-[9px] font-bold uppercase text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                Archived
              </span>
            )}
          </div>
        ) : (
          <div
            className="flex min-w-0 flex-1 items-center overflow-x-auto pr-1 [scrollbar-width:thin]"
            title={p.name}
          >
            <span className="inline-flex min-h-[28px] shrink-0 items-center gap-1.5 whitespace-nowrap">
              <span className="text-sm font-bold text-app-text">{highlightName(p.name, p.searchQuery)}</span>
              <span className="text-neutral-400" aria-hidden>
                ·
              </span>
              <BookingLockBadge mode={p.lockedBookingMode} />
              <span className="text-neutral-400" aria-hidden>
                ·
              </span>
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                  p.isActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                )}
              >
                {p.isActive ? 'active' : 'inactive'}
              </span>
              {typeof p.fieldCount === 'number' && (
                <>
                  <span className="text-neutral-400" aria-hidden>
                    ·
                  </span>
                  <span className="shrink-0 rounded border border-dashed border-app-border px-1.5 text-[10px] font-bold text-app-text/50">
                    {p.fieldCount} fields
                  </span>
                </>
              )}
              {p.isArchived && (
                <>
                  <span className="text-neutral-400" aria-hidden>
                    ·
                  </span>
                  <span className="shrink-0 rounded bg-neutral-200 px-1.5 text-[9px] font-bold uppercase text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                    Archived
                  </span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {p.showQuickAdds && p.kind === 'category' && !p.editing && (
        <div className="hidden items-center gap-1 pr-1 sm:flex" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[10px] font-bold text-app-text/70 hover:bg-app-card/80"
            onClick={p.onQuickSub}
          >
            + Sub
          </button>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[10px] font-bold text-app-text/70 hover:bg-app-card/80"
            onClick={p.onQuickService}
          >
            + Service
          </button>
        </div>
      )}

      {p.dropInvalid && p.dropInvalidTitle && (
        <span
          className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-full rounded bg-red-800 px-2 py-0.5 text-[10px] text-white"
          role="tooltip"
        >
          {p.dropInvalidTitle}
        </span>
      )}

      {p.kebab}
    </div>
  );
}

export { INDENT };
