import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useWorkspace } from '../../lib/WorkspaceContext';
import { useSoftToast } from '../../lib/SoftToastContext';
import { cn } from '../../lib/utils';

const ADMIN_ROLES = new Set(['owner', 'platform_admin', 'support', 'finance']);

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

function shortName(s: string, max = 16) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function WorkspaceSwitcher() {
  const { user } = useAuth();
  const { workspaces, activeWorkspaceId, setActiveWorkspace, loading } = useWorkspace();
  const { showToast } = useSoftToast();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const hide = ADMIN_ROLES.has(user?.role || '') || workspaces.length === 0;

  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const onSelect = useCallback(
    (id: string, name: string) => {
      setActiveWorkspace(id);
      setOpen(false);
      showToast(`Switched to ${name}`);
    },
    [setActiveWorkspace, showToast]
  );

  if (hide || loading) {
    return null;
  }

  return (
    <div className="relative z-40 mb-1 max-h-[60px] shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 min-h-[44px] max-w-full items-center gap-2 rounded-full border border-app-border bg-app-card px-2.5 pr-2 text-left text-app-text shadow-sm transition hover:bg-app-input"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Switch workspace"
      >
        {active?.logoUrl ? (
          <img
            src={active.logoUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-lg object-cover"
            width={28}
            height={28}
          />
        ) : (
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-xs font-bold text-neutral-800 dark:bg-neutral-700 dark:text-white"
            aria-hidden
          >
            {active ? initials(active.name) : '?'}
          </div>
        )}
        <span className="min-w-0 max-w-[10rem] truncate text-sm font-semibold">
          {active ? shortName(active.name) : 'Workspace'}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-neutral-500 transition', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 top-[calc(100%+6px)] w-[280px] max-w-[min(100vw,280px)] overflow-hidden rounded-2xl border border-app-border bg-app-card text-app-text shadow-xl"
            role="listbox"
            aria-label="Workspaces"
          >
            <div className="max-h-[360px] overflow-y-auto">
              {workspaces.map((w) => {
                const isActive = w.id === activeWorkspaceId;
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => onSelect(w.id, w.name)}
                    className="flex h-14 w-full items-center gap-2 border-b border-app-border/60 px-3 text-left last:border-0 hover:bg-app-input/80"
                  >
                    {w.logoUrl ? (
                      <img
                        src={w.logoUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        width={36}
                        height={36}
                      />
                    ) : (
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-xs font-bold text-neutral-800 dark:bg-neutral-700 dark:text-white"
                        aria-hidden
                      >
                        {initials(w.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{w.name}</p>
                      <p className="text-[10px] uppercase tracking-wide text-neutral-500">
                        <span className="inline-block rounded-md bg-app-input px-1.5 py-0.5 text-[9px] font-bold text-app-text">
                          {w.role}
                        </span>
                      </p>
                    </div>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Active" />}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                showToast('Coming in a future sprint');
                setOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 border-t border-app-border py-2.5 text-sm font-medium text-neutral-500 hover:bg-app-input/60"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Create new workspace
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
