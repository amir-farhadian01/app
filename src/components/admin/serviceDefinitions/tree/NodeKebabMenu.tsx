import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../../../lib/utils.js';

type Kind = 'category' | 'service';

type Item = {
  id: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
};

type Props = {
  kind: Kind;
  isArchived: boolean;
  isActive?: boolean;
  canArchive: boolean;
  onRename: () => void;
  onAddChildCategory: () => void;
  onAddService: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onOpenEditor?: () => void;
  menuButtonLabel?: string;
};

export function NodeKebabMenu({
  kind,
  isArchived,
  isActive: _isActive,
  canArchive,
  onRename,
  onAddChildCategory,
  onAddService,
  onDuplicate,
  onArchive,
  onUnarchive,
  onOpenEditor,
  menuButtonLabel = 'Row actions',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const items: Item[] = [
    { id: 'rename', label: 'Rename', onSelect: () => { onRename(); setOpen(false); } },
    ...(kind === 'category'
      ? [
          { id: 'add-child', label: 'Add child category', onSelect: () => { onAddChildCategory(); setOpen(false); } } satisfies Item,
          { id: 'add-svc', label: 'Add service', onSelect: () => { onAddService(); setOpen(false); } } satisfies Item,
        ]
      : []),
    { id: 'dup', label: 'Duplicate', onSelect: () => { onDuplicate(); setOpen(false); } },
    ...(canArchive
      ? isArchived
        ? [
            { id: 'unarchive', label: 'Unarchive', onSelect: () => { onUnarchive(); setOpen(false); } } satisfies Item,
          ]
        : [{ id: 'archive', label: 'Archive', onSelect: () => { onArchive(); setOpen(false); }, danger: true } satisfies Item]
      : []),
    ...(kind === 'service' && onOpenEditor
      ? [{ id: 'editor', label: 'Open editor', onSelect: () => { onOpenEditor(); setOpen(false); } } satisfies Item]
      : []),
  ];

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          'rounded p-1.5 text-app-text/60 opacity-0 transition hover:bg-app-card/80 hover:opacity-100',
          'group-hover:opacity-100 focus:opacity-100',
          open && 'opacity-100'
        )}
        aria-label={menuButtonLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 z-50 min-w-[200px] rounded-xl border border-app-border bg-app-bg py-1 text-sm shadow-lg"
        >
          {items.map((it) => (
            <li key={it.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'w-full px-3 py-2 text-left text-xs font-bold',
                  it.danger
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-app-text hover:bg-app-card/80',
                  it.disabled && 'pointer-events-none opacity-40'
                )}
                onClick={it.onSelect}
                disabled={it.disabled}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
