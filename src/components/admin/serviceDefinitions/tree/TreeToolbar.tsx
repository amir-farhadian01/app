import { FolderPlus, Search } from 'lucide-react';
import { cn } from '../../../../lib/utils.js';

type Props = {
  search: string;
  onSearchChange: (q: string) => void;
  showArchived: boolean;
  onShowArchived: (v: boolean) => void;
  onAddTopLevel: () => void;
  canToggleArchived: boolean;
};

export function TreeToolbar({
  search,
  onSearchChange,
  showArchived,
  onShowArchived,
  onAddTopLevel,
  canToggleArchived,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-app-border p-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text/50"
          aria-hidden
        />
        <input
          type="search"
          className="w-full rounded-xl border border-app-border bg-app-bg py-2 pl-9 pr-3 text-sm text-app-text placeholder:text-app-text/40"
          placeholder="Filter tree…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search service tree"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddTopLevel}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border border-app-border bg-app-bg px-3 py-1.5 text-xs font-bold text-app-text',
            'hover:bg-app-card/80'
          )}
        >
          <FolderPlus className="h-4 w-4 shrink-0" aria-hidden />
          Add top-level category
        </button>
        {canToggleArchived && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-app-text/80">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => onShowArchived(e.target.checked)}
              className="rounded border-app-border"
            />
            Show archived
          </label>
        )}
      </div>
    </div>
  );
}
