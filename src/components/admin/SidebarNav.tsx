import { useCallback, useEffect, useId, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/utils.js';
import type { AdminTab } from '../../lib/adminTab.js';

export type SidebarGroupId = 'people' | 'services' | 'finance' | 'platform' | 'legal';

const EASE_OUT_CUBIC: [number, number, number, number] = [0.33, 1, 0.68, 1];

const GROUPS: {
  id: SidebarGroupId;
  name: string;
  Icon: ComponentType<{ className?: string }>;
  items: { tab: AdminTab; label: string }[];
}[] = [
  {
    id: 'people',
    name: 'People',
    Icon: LucideIcons.Users,
    items: [
      { tab: 'overview', label: 'Overview' },
      { tab: 'users', label: 'Users' },
      { tab: 'kyc', label: 'KYC' },
    ],
  },
  {
    id: 'services',
    name: 'Services',
    Icon: LucideIcons.Wrench,
    items: [
      { tab: 'service-definitions', label: 'Service Definitions' },
      { tab: 'service-packages', label: 'Provider Packages' },
      { tab: 'inventory', label: 'Inventory' },
      { tab: 'orders', label: 'Orders' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    Icon: LucideIcons.DollarSign,
    items: [
      { tab: 'finance', label: 'Finance & Tax' },
      { tab: 'payments', label: 'Payments' },
    ],
  },
  {
    id: 'platform',
    name: 'Platform',
    Icon: LucideIcons.Settings,
    items: [
      { tab: 'teams', label: 'Teams' },
      { tab: 'settings', label: 'Settings' },
      { tab: 'content', label: 'Pages & Content' },
      { tab: 'integrations', label: 'Integrations' },
      { tab: 'monitoring', label: 'Monitoring' },
      { tab: 'chat-moderation', label: 'Chat Moderation' },
      { tab: 'contracts', label: 'Contracts' },
    ],
  },
  {
    id: 'legal',
    name: 'Legal',
    Icon: LucideIcons.Scale,
    items: [{ tab: 'legal', label: 'Legal & Terms' }],
  },
];

function groupContainingTab(tab: AdminTab): SidebarGroupId | null {
  const g = GROUPS.find((x) => x.items.some((i) => i.tab === tab));
  return g?.id ?? null;
}

type FlyOutState = { t: 'collapsed' } | { t: 'open'; groupId: SidebarGroupId };

function flyOutCollapsed(s: FlyOutState): s is { t: 'collapsed' } {
  return s.t === 'collapsed';
}

type SidebarNavProps = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
};

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const iconRefs = useRef<Partial<Record<SidebarGroupId, HTMLButtonElement | null>>>({});
  const [flyOut, setFlyOut] = useState<FlyOutState>({ t: 'collapsed' });
  const [tooltipGroup, setTooltipGroup] = useState<SidebarGroupId | null>(null);
  const menuId = useId();
  const openGroupId = flyOutCollapsed(flyOut) ? null : flyOut.groupId;
  const openGroupIndex = openGroupId ? GROUPS.findIndex((x) => x.id === openGroupId) : 0;
  const flyoutTopPx = openGroupIndex >= 0 ? openGroupIndex * 56 : 0;

  const setCollapsed = useCallback(() => {
    setFlyOut({ t: 'collapsed' });
  }, []);

  const activeGroup = groupContainingTab(activeTab);

  // Open the fly-out for the group that contains the current tab once on mount
  // (e.g. deep link `?tab=users`) so the user sees which section is active.
  useEffect(() => {
    const g = groupContainingTab(activeTab);
    if (g) {
      setFlyOut({ t: 'open', groupId: g });
    }
    // Only initial URL/context — not when switching tabs from main content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!openGroupId) return;
    const onDown = (e: MouseEvent) => {
      const el = shellRef.current;
      if (el && !el.contains(e.target as Node)) {
        setCollapsed();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openGroupId, setCollapsed]);

  useEffect(() => {
    if (!openGroupId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setCollapsed();
        const btn = iconRefs.current[openGroupId];
        btn?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openGroupId, setCollapsed]);

  return (
    <div ref={shellRef} className="relative z-20 flex w-16 shrink-0 flex-col border-r border-app-border bg-app-bg">
      <nav className="flex flex-1 flex-col" aria-label="Admin sections">
        {GROUPS.map((g) => {
          const isGroupActive = activeGroup === g.id;
          const isOpen = openGroupId === g.id;
          const Icon = g.Icon;

          return (
            <div key={g.id} className="relative flex h-14 w-16 items-center justify-center">
              {isGroupActive && (
                <div
                  className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-sm bg-app-text"
                  aria-hidden
                />
              )}
              <div className="relative flex h-7 w-7 items-center justify-center">
                <button
                  type="button"
                  ref={(el) => {
                    iconRefs.current[g.id] = el;
                  }}
                  id={`${menuId}-trigger-${g.id}`}
                  aria-label={g.name}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? `${menuId}-menu` : undefined}
                  onClick={() => {
                    if (isOpen) {
                      setCollapsed();
                    } else {
                      setFlyOut({ t: 'open', groupId: g.id });
                    }
                  }}
                  onMouseEnter={() => setTooltipGroup(g.id)}
                  onMouseLeave={() => setTooltipGroup((x) => (x === g.id ? null : x))}
                  onFocus={() => setTooltipGroup(g.id)}
                  onBlur={() => setTooltipGroup((x) => (x === g.id ? null : x))}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg text-app-text transition-colors',
                    isGroupActive ? 'text-app-text' : 'text-app-text/70',
                    'hover:bg-app-card hover:text-app-text',
                    isOpen && 'bg-app-card'
                  )}
                >
                  <Icon className="h-7 w-7 shrink-0" />
                </button>
                {tooltipGroup === g.id && !isOpen && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-full z-30 ml-2 whitespace-nowrap rounded-full border border-app-border bg-app-card px-3 py-1 text-xs font-bold text-app-text shadow-sm"
                  >
                    {g.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      <AnimatePresence>
        {openGroupId && (
          <motion.div
            key={openGroupId}
            id={`${menuId}-menu`}
            role="menu"
            aria-labelledby={`${menuId}-trigger-${openGroupId}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18, ease: EASE_OUT_CUBIC }}
            className="absolute z-40 w-[240px] overflow-hidden rounded-2xl border border-app-border bg-app-bg py-1 shadow-lg"
            style={{ left: 'calc(100% + 1rem)', top: flyoutTopPx }}
          >
            {GROUPS.filter((x) => x.id === openGroupId).map((g) => (
              <div key={g.id} className="flex flex-col">
                {g.items.map((item) => {
                  const selected = activeTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      role="menuitem"
                      className={cn(
                        'w-full border-l-4 border-transparent px-4 py-3 text-left text-sm font-bold text-app-text',
                        'hover:bg-app-card/80',
                        selected && 'bg-app-card border-l-4 border-app-text'
                      )}
                      onClick={() => {
                        onTabChange(item.tab);
                        setCollapsed();
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
