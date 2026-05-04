import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { PackageMargin } from '../../../lib/packageMargin';
import {
  addBomLine,
  deleteBomLine,
  getPackageBom,
  refreshAllBomSnapshots,
  refreshBomLineSnapshot,
  reorderBomLines,
  updateBomLine,
  type BomLine,
} from '../../../services/workspaces';
import { listProducts, type ProductRow } from '../../../services/inventory';
import { cn } from '../../../lib/utils';

type MarginFn = (
  pkg: { finalPrice: number; currency: string },
  bom: Array<{ quantity: number; snapshotUnitPrice: number; snapshotCurrency: string }>,
) => PackageMargin;

type Props = {
  workspaceId: string;
  packageId: string;
  packageCurrency: string;
  finalPrice: number;
  computeMargin: MarginFn;
  showToast: (msg: string) => void;
  onGoToInventory: () => void;
};

function fmtMoney(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy || 'CAD' }).format(n);
  } catch {
    return `${n.toFixed(2)} ${ccy}`;
  }
}

export function PackageBomSection({
  workspaceId,
  packageId,
  packageCurrency,
  finalPrice,
  computeMargin,
  showToast,
  onGoToInventory,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [lines, setLines] = useState<BomLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState('');
  const [pickerHits, setPickerHits] = useState<ProductRow[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [menuLineId, setMenuLineId] = useState<string | null>(null);
  const qtyDebounce = useRef<Record<string, number>>({});

  const loadBom = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getPackageBom(workspaceId, packageId);
      setLines(d.lines);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load BOM');
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, packageId, showToast]);

  useEffect(() => {
    void loadBom();
  }, [loadBom]);

  useEffect(() => {
    return () => {
      for (const t of Object.values(qtyDebounce.current)) {
        window.clearTimeout(t);
      }
    };
  }, []);

  const marginInput = useMemo(
    () =>
      lines.map((l) => ({
        quantity: l.quantity,
        snapshotUnitPrice: l.snapshotUnitPrice,
        snapshotCurrency: l.snapshotCurrency,
      })),
    [lines],
  );

  const displayMargin = useMemo(
    () => computeMargin({ finalPrice, currency: packageCurrency }, marginInput),
    [computeMargin, finalPrice, packageCurrency, marginInput],
  );

  useEffect(() => {
    const q = pickerQ.trim();
    if (!pickerOpen) return;
    let c = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setPickerLoading(true);
        try {
          const res = await listProducts(workspaceId, {
            page: 1,
            pageSize: 30,
            q: q || undefined,
            archived: 'false',
            sortBy: 'name',
            sortDir: 'asc',
          });
          if (!c) setPickerHits(res.items.filter((p) => !p.archivedAt));
        } catch {
          if (!c) setPickerHits([]);
        } finally {
          if (!c) setPickerLoading(false);
        }
      })();
    }, 250);
    return () => {
      c = true;
      window.clearTimeout(t);
    };
  }, [pickerOpen, pickerQ, workspaceId]);

  const scheduleQtySave = useCallback(
    (lineId: string, qty: number) => {
      const prev = qtyDebounce.current[lineId];
      if (prev) window.clearTimeout(prev);
      qtyDebounce.current[lineId] = window.setTimeout(() => {
        void (async () => {
          try {
            const updated = await updateBomLine(workspaceId, packageId, lineId, { quantity: qty });
            setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...updated } : l)));
          } catch (e) {
            showToast(e instanceof Error ? e.message : 'Update failed');
            void loadBom();
          }
        })();
      }, 450);
    },
    [workspaceId, packageId, showToast, loadBom],
  );

  const onQtyChange = (lineId: string, raw: string) => {
    const n = parseFloat(raw);
    if (Number.isNaN(n) || n <= 0) return;
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, quantity: n } : l)));
    scheduleQtySave(lineId, n);
  };

  const onAddProduct = async (product: ProductRow) => {
    try {
      const line = await addBomLine(workspaceId, packageId, { productId: product.id, quantity: 1 });
      setLines((prev) => [...prev, line]);
      setPickerOpen(false);
      setPickerQ('');
      showToast('Line added');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Add failed');
    }
  };

  const onRemoveLine = async (lineId: string) => {
    try {
      await deleteBomLine(workspaceId, packageId, lineId);
      setLines((prev) => prev.filter((l) => l.id !== lineId));
      setMenuLineId(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Remove failed');
    }
  };

  const onRefreshLine = async (lineId: string) => {
    try {
      const updated = await refreshBomLineSnapshot(workspaceId, packageId, lineId);
      setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...updated } : l)));
      setMenuLineId(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Refresh failed');
    }
  };

  const onRefreshAll = async () => {
    setRefreshing(true);
    try {
      const d = await refreshAllBomSnapshots(workspaceId, packageId);
      setLines(d.lines);
      showToast('Prices refreshed');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const onDragStart = (e: React.DragEvent, lineId: string) => {
    e.dataTransfer.setData('text/plain', lineId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropOn = async (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    const dragged = e.dataTransfer.getData('text/plain');
    if (!dragged || dragged === targetId) return;
    const order = [...lines.map((l) => l.id)];
    const from = order.indexOf(dragged);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, dragged);
    const reordered = order.map((id) => lines.find((l) => l.id === id)!).filter(Boolean);
    setLines(reordered);
    try {
      await reorderBomLines(workspaceId, packageId, order);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reorder failed');
      void loadBom();
    }
  };

  const mixed = displayMargin.crossCurrencyLines > 0;

  return (
    <div className="rounded-2xl border border-app-border bg-app-card/40 p-3 dark:bg-app-card/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 py-1 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-sm font-black text-app-text">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Bill of Materials
        </span>
        {mixed && (
          <span
            className="max-w-[55%] truncate rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
            title="Phase 1 does not convert currencies. Convert manually or update those products' currency to match the package."
          >
            Mixed currency — {displayMargin.crossCurrencyLines} line(s) excluded from cost
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-app-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-neutral-600 dark:text-neutral-400">
              Subtotal:{' '}
              <span className="tabular-nums text-app-text">{fmtMoney(displayMargin.bomCost, packageCurrency)}</span>
            </span>
            <span className="text-neutral-400">·</span>
            <span className="font-semibold text-neutral-600 dark:text-neutral-400">
              Margin:{' '}
              <span className="tabular-nums text-app-text">
                {fmtMoney(displayMargin.margin, packageCurrency)} ({displayMargin.marginPercent.toFixed(1)}%)
              </span>
            </span>
            <button
              type="button"
              onClick={() => void onRefreshAll()}
              disabled={refreshing || loading}
              className="ml-auto inline-flex items-center gap-1 rounded-xl border border-app-border bg-app-input px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-app-text hover:bg-app-card disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Refresh prices
            </button>
          </div>

          {loading ? (
            <p className="py-4 text-center text-sm text-neutral-500">Loading materials…</p>
          ) : (
            <ul className="space-y-1">
              {lines.map((line) => {
                const lineTotal = line.quantity * line.snapshotUnitPrice;
                return (
                  <li
                    key={line.id}
                    className="flex h-14 items-center gap-2 rounded-xl border border-app-border/80 bg-app-bg/80 px-2"
                    onDragOver={onDragOver}
                    onDrop={(e) => void onDropOn(line.id, e)}
                  >
                    <span
                      draggable
                      onDragStart={(e) => onDragStart(e, line.id)}
                      className="cursor-grab touch-none text-neutral-400 hover:text-app-text active:cursor-grabbing"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-app-text">{line.snapshotProductName}</div>
                      <div className="flex flex-wrap gap-1 text-[10px] text-neutral-500">
                        {line.product.sku && (
                          <span className="rounded bg-neutral-200/80 px-1 dark:bg-neutral-700">{line.product.sku}</span>
                        )}
                        <span className="rounded bg-neutral-200/80 px-1 dark:bg-neutral-700">{line.snapshotUnit}</span>
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      className="w-16 rounded-lg border border-app-border bg-app-input px-1 py-1 text-center text-sm tabular-nums"
                      value={line.quantity}
                      onChange={(e) => onQtyChange(line.id, e.target.value)}
                      aria-label="Quantity"
                    />
                    <div className="hidden w-20 text-right text-xs text-neutral-600 sm:block">
                      {fmtMoney(line.snapshotUnitPrice, line.snapshotCurrency)}
                    </div>
                    <div className="w-16 text-right text-xs font-semibold tabular-nums text-app-text">
                      {fmtMoney(lineTotal, line.snapshotCurrency)}
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-app-input"
                        aria-label="Line actions"
                        onClick={() => setMenuLineId((id) => (id === line.id ? null : line.id))}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuLineId === line.id && (
                        <ul className="absolute right-0 z-50 min-w-[9rem] rounded-xl border border-app-border bg-app-card py-1 text-xs shadow-lg">
                          <li>
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 px-3 py-1.5 hover:bg-app-input"
                              onClick={() => void onRefreshLine(line.id)}
                            >
                              <RefreshCw className="h-3 w-3" /> Refresh price
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-app-input"
                              onClick={() => void onRemoveLine(line.id)}
                            >
                              <Trash2 className="h-3 w-3" /> Remove
                            </button>
                          </li>
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div>
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-2xl border border-dashed border-app-border px-3 py-2 text-xs font-bold text-app-text hover:bg-app-input"
            >
              <Plus className="h-4 w-4" />
              Add line item
            </button>
            {pickerOpen && (
              <div className="mt-2 rounded-2xl border border-app-border bg-app-card p-3 shadow-inner">
                <input
                  className="mb-2 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
                  placeholder="Search products…"
                  value={pickerQ}
                  onChange={(e) => setPickerQ(e.target.value)}
                  autoFocus
                />
                {pickerLoading ? (
                  <p className="py-2 text-center text-xs text-neutral-500">Searching…</p>
                ) : pickerHits.length === 0 ? (
                  <div className="py-3 text-center text-xs text-neutral-500">
                    No products found.
                    <button
                      type="button"
                      className="mt-2 block w-full font-bold text-app-text underline"
                      onClick={() => {
                        setPickerOpen(false);
                        onGoToInventory();
                      }}
                    >
                      Go to Inventory →
                    </button>
                  </div>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-y-auto">
                    {pickerHits.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col rounded-lg px-2 py-2 text-left text-sm hover:bg-app-input"
                          onClick={() => void onAddProduct(p)}
                        >
                          <span className="font-semibold text-app-text">{p.name}</span>
                          <span className="text-[10px] text-neutral-500">
                            {[p.sku, p.category, fmtMoney(p.unitPrice, p.currency)].filter(Boolean).join(' · ')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
