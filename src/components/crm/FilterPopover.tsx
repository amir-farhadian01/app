import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import type { CrmColumnDef, FilterValue } from './types.js';

type Props<TRow> = {
  open: boolean;
  column: CrmColumnDef<TRow>;
  value: FilterValue | undefined;
  onChange: (next: FilterValue) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
};

export function FilterPopover<TRow>({ open, column, value, onChange, onClose, anchorRect }: Props<TRow>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [opts, setOpts] = useState<{ value: string; label: string }[]>([]);
  const [optLoading, setOptLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => firstInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !column.filter) return;
    if (column.filter.kind !== 'checkbox') return;
    const o = column.filter.options;
    if (typeof o === 'function') {
      setOptLoading(true);
      o()
        .then(setOpts)
        .finally(() => setOptLoading(false));
    } else {
      setOpts(o);
    }
  }, [open, column]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const f = column.filter;
  if (!f) return null;

  const style: CSSProperties =
    anchorRect == null
      ? { visibility: 'hidden' as const }
      : {
          position: 'fixed',
          top: anchorRect.bottom + 4,
          left: Math.min(anchorRect.left, window.innerWidth - 320),
          width: 300,
          maxHeight: 360,
          zIndex: 60,
        };

  const filteredOpts =
    f.kind === 'checkbox'
      ? opts.filter(
          (x) =>
            !search.trim() ||
            x.label.toLowerCase().includes(search.toLowerCase()) ||
            x.value.toLowerCase().includes(search.toLowerCase())
        )
      : [];

  const checkboxValues = value?.type === 'checkbox' ? value.values : [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close filter"
            className="fixed inset-0 z-[55] cursor-default bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label={`Filter: ${column.header}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col overflow-hidden rounded-xl border border-app-border bg-app-card text-app-text shadow-xl"
            style={style}
          >
            {f.kind === 'checkbox' && (
              <>
                <div className="border-b border-app-border p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                    <input
                      ref={firstInputRef}
                      type="search"
                      className="w-full rounded-lg border border-app-border bg-app-input py-1.5 pl-8 pr-2 text-sm text-app-text"
                      placeholder="Search options"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto p-2">
                  {optLoading ? (
                    <p className="px-2 py-2 text-sm text-neutral-500">Loading…</p>
                  ) : (
                    filteredOpts.map((o) => {
                      const checked = checkboxValues.includes(o.value);
                      return (
                        <label
                          key={o.value}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-app-border"
                            checked={checked}
                            onChange={() => {
                              const next = new Set(checkboxValues);
                              if (checked) next.delete(o.value);
                              else next.add(o.value);
                              onChange({ type: 'checkbox', values: [...next] });
                            }}
                          />
                          <span className="text-sm">{o.label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </>
            )}
            {f.kind === 'boolean' && (
              <div className="space-y-2 p-3">
                <p className="text-xs font-medium text-neutral-500">Filter by {column.header}</p>
                <div className="flex flex-col gap-2">
                  {[
                    { b: null as boolean | null, label: 'Any' },
                    { b: true, label: f.trueLabel },
                    { b: false, label: f.falseLabel },
                  ].map((x) => (
                    <label
                      key={String(x.b)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <input
                        ref={!search ? firstInputRef : undefined}
                        type="radio"
                        name={`bool-${column.id}`}
                        checked={
                          (value?.type === 'boolean' && value.value === x.b) ||
                          (x.b === null && (value == null || value.type !== 'boolean'))
                        }
                        onChange={() => onChange({ type: 'boolean', value: x.b })}
                      />
                      <span className="text-sm">{x.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {f.kind === 'dateRange' && (
              <div className="space-y-2 p-3">
                <p className="text-xs text-neutral-500">From / To (ISO date)</p>
                <input
                  ref={firstInputRef}
                  type="date"
                  className="w-full rounded-lg border border-app-border bg-app-input px-2 py-1.5 text-sm"
                  value={value?.type === 'dateRange' ? value.from?.slice(0, 10) ?? '' : ''}
                  onChange={(e) => {
                    const from = e.target.value || undefined;
                    const cur = value?.type === 'dateRange' ? value : { type: 'dateRange' as const };
                    onChange({ type: 'dateRange', from, to: cur.type === 'dateRange' ? cur.to : undefined });
                  }}
                />
                <input
                  type="date"
                  className="w-full rounded-lg border border-app-border bg-app-input px-2 py-1.5 text-sm"
                  value={value?.type === 'dateRange' ? value.to?.slice(0, 10) ?? '' : ''}
                  onChange={(e) => {
                    const to = e.target.value || undefined;
                    const cur = value?.type === 'dateRange' ? value : { type: 'dateRange' as const };
                    onChange({ type: 'dateRange', to, from: cur.type === 'dateRange' ? cur.from : undefined });
                  }}
                />
              </div>
            )}
            {f.kind === 'text' && (
              <div className="p-3">
                <input
                  ref={firstInputRef}
                  type="text"
                  className="w-full rounded-lg border border-app-border bg-app-input px-2 py-1.5 text-sm"
                  placeholder="Contains…"
                  value={value?.type === 'text' ? value.value : ''}
                  onChange={(e) => onChange({ type: 'text', value: e.target.value })}
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
