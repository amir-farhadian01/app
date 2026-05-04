import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ProductRow } from '../../../services/inventory';
import { createProduct, updateProduct } from '../../../services/inventory';
import { StockField } from './StockField';

const MAX_NAME = 120;
const MAX_SKU = 40;
const PRESET_UNITS = ['each', 'liter', 'kg', 'hour', 'flat'] as const;
const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceCurrency: string;
  initial: ProductRow | null;
  categorySuggestions: string[];
  onSaved: () => void;
  showToast: (msg: string) => void;
};

export function ProductEditorDrawer({
  open,
  onClose,
  workspaceId,
  workspaceCurrency,
  initial,
  categorySuggestions,
  onSaved,
  showToast,
}: Props) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [unitOther, setUnitOther] = useState('');
  const [unitSelect, setUnitSelect] = useState<string>('each');
  const [unitPrice, setUnitPrice] = useState('0');
  const [currency, setCurrency] = useState(workspaceCurrency || 'CAD');
  const [stockQty, setStockQty] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const effectiveUnit = useMemo(() => {
    if (unitSelect === '__other__') return unitOther.trim() || 'each';
    return unitSelect;
  }, [unitSelect, unitOther]);

  useEffect(() => {
    if (!open) return;
    setCurrency(workspaceCurrency || 'CAD');
    if (initial) {
      setName(initial.name);
      setSku(initial.sku ?? '');
      setCategory(initial.category ?? '');
      const u = initial.unit || 'each';
      if ((PRESET_UNITS as readonly string[]).includes(u)) {
        setUnitSelect(u);
        setUnitOther('');
      } else {
        setUnitSelect('__other__');
        setUnitOther(u);
      }
      setUnitPrice(String(initial.unitPrice));
      setCurrency(initial.currency || workspaceCurrency || 'CAD');
      setStockQty(initial.stockQuantity != null ? String(initial.stockQuantity) : '');
      setDescription(initial.description ?? '');
      setIsActive(initial.isActive);
    } else {
      setName('');
      setSku('');
      setCategory('');
      setUnitSelect('each');
      setUnitOther('');
      setUnitPrice('0');
      setCurrency(workspaceCurrency || 'CAD');
      setStockQty('');
      setDescription('');
      setIsActive(true);
    }
  }, [open, initial, workspaceCurrency]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || n.length > MAX_NAME) {
      showToast(`Name is required (max ${MAX_NAME} characters)`);
      return;
    }
    const skuTrim = sku.trim();
    if (skuTrim.length > MAX_SKU) {
      showToast(`SKU max ${MAX_SKU} characters`);
      return;
    }
    const up = parseFloat(unitPrice);
    if (Number.isNaN(up) || up < 0) {
      showToast('Unit price must be ≥ 0');
      return;
    }
    let stock: number | null = null;
    if (stockQty.trim()) {
      const s = parseFloat(stockQty);
      if (Number.isNaN(s) || s < 0) {
        showToast('Stock must be a number ≥ 0');
        return;
      }
      stock = s;
    }
    const u = effectiveUnit;
    if (!u) {
      showToast('Unit is required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && initial) {
        await updateProduct(workspaceId, initial.id, {
          name: n,
          sku: skuTrim.length ? skuTrim : null,
          category: category.trim() || null,
          unit: u,
          unitPrice: up,
          currency,
          stockQuantity: stock,
          description: description.trim() || null,
          isActive,
        });
      } else {
        await createProduct(workspaceId, {
          name: n,
          sku: skuTrim.length ? skuTrim : undefined,
          category: category.trim() || undefined,
          unit: u,
          unitPrice: up,
          currency,
          stockQuantity: stock,
          description: description.trim() || undefined,
        });
      }
      showToast(isEdit ? 'Product updated' : 'Product created');
      onSaved();
      onClose();
    } catch (er: unknown) {
      const err = er as Error & { status?: number };
      if (err.status === 409) {
        showToast('Duplicate SKU in this workspace');
      } else {
        showToast(err instanceof Error ? err.message : 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[300] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close"
          />
          <motion.aside
            className="fixed right-0 top-0 z-[310] flex h-full w-full max-w-full flex-col border-l border-app-border bg-app-bg sm:max-w-[min(100vw,480px)] sm:min-w-[min(100vw,480px)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prod-drawer-title"
          >
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <h2 id="prod-drawer-title" className="text-lg font-black text-app-text">
                {isEdit ? 'Edit product' : 'New product'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-neutral-500 hover:bg-app-input"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-500" htmlFor="p-name">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="p-name"
                    className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
                    maxLength={MAX_NAME}
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500" htmlFor="p-sku">
                    SKU (optional)
                  </label>
                  <input
                    id="p-sku"
                    className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.slice(0, MAX_SKU))}
                    maxLength={MAX_SKU}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500" htmlFor="p-cat">
                    Category
                  </label>
                  <input
                    id="p-cat"
                    className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    list="product-cat-suggestions"
                    disabled={saving}
                  />
                  <datalist id="product-cat-suggestions">
                    {categorySuggestions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500" htmlFor="p-unit">
                    Unit
                  </label>
                  <select
                    id="p-unit"
                    className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                    value={unitSelect}
                    onChange={(e) => setUnitSelect(e.target.value)}
                    disabled={saving}
                  >
                    {PRESET_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="__other__">Other…</option>
                  </select>
                  {unitSelect === '__other__' && (
                    <input
                      className="mt-2 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                      placeholder="Custom unit"
                      value={unitOther}
                      onChange={(e) => setUnitOther(e.target.value)}
                      disabled={saving}
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-neutral-500" htmlFor="p-price">
                      Unit price
                    </label>
                    <input
                      id="p-price"
                      type="number"
                      min={0}
                      step="0.01"
                      className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text tabular-nums"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-500" htmlFor="p-ccy">
                      Currency
                    </label>
                    <select
                      id="p-ccy"
                      className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={saving}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500" htmlFor="p-stock">
                    Stock quantity (optional)
                  </label>
                  <div className="mt-1">
                    <StockField
                      id="p-stock"
                      value={stockQty}
                      onChange={setStockQty}
                      unit={effectiveUnit}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500" htmlFor="p-desc">
                    Description
                  </label>
                  <textarea
                    id="p-desc"
                    className="mt-1 w-full min-h-[88px] rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={saving}
                  />
                </div>
                {isEdit && (
                  <label className="flex items-center gap-2 text-sm font-medium text-app-text">
                    <input
                      type="checkbox"
                      className="rounded border-app-border"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={saving}
                    />
                    Active
                  </label>
                )}
              </div>
              <div className="mt-auto flex gap-2 border-t border-app-border pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    'flex-1 rounded-2xl bg-neutral-900 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900',
                    saving && 'opacity-60',
                  )}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-app-border bg-app-card px-5 py-2.5 text-sm font-bold text-app-text"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
