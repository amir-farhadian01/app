import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { CatalogPicker } from './CatalogPicker';
import { BookingModeToggle } from './BookingModeToggle';
import {
  type BookingMode,
  type ProviderServicePackageRow,
  createPackage,
  updatePackage,
} from '../../../services/workspaces';
import { computePackageMargin } from '../../../lib/packageMargin';
import { PackageBomSection } from './PackageBomSection';
import { cn } from '../../../lib/utils';

type Mode = { id: string; name: string; categoryPath: string; lockedBookingMode: string | null } | null;

type Props = {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  initial: ProviderServicePackageRow | null;
  onSaved: () => void;
  showToast: (msg: string) => void;
  onGoToInventory?: () => void;
};

const MAX_NAME = 80;
const MAX_DESC = 500;

export function PackageEditorDrawer({
  open,
  onClose,
  workspaceId,
  initial,
  onSaved,
  showToast,
  onGoToInventory,
}: Props) {
  const [catalog, setCatalog] = useState<Mode>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [finalPrice, setFinalPrice] = useState(0);
  const [currency, setCurrency] = useState('CAD');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [bookingMode, setBookingMode] = useState<BookingMode>('inherit_from_catalog');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCatalog({
        id: initial.serviceCatalogId,
        name: initial.serviceCatalog.name,
        categoryPath: initial.serviceCatalog.category,
        lockedBookingMode: initial.serviceCatalog.lockedBookingMode ?? null,
      });
      setName(initial.name);
      setDescription(initial.description || '');
      setFinalPrice(initial.finalPrice);
      setCurrency(initial.currency || 'CAD');
      setDurationMinutes(
        initial.durationMinutes != null ? String(initial.durationMinutes) : ''
      );
      setBookingMode(initial.bookingMode);
      setIsActive(initial.isActive);
    } else {
      setCatalog(null);
      setName('');
      setDescription('');
      setFinalPrice(0);
      setCurrency('CAD');
      setDurationMinutes('');
      setBookingMode('inherit_from_catalog');
      setIsActive(true);
    }
  }, [open, initial]);

  const lock = catalog?.lockedBookingMode ?? null;
  const isEdit = Boolean(initial);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalog) {
      showToast('Choose a service catalog');
      return;
    }
    const n = name.trim();
    if (!n || n.length > MAX_NAME) {
      showToast('Name is required (max 80 characters)');
      return;
    }
    if (description.length > MAX_DESC) {
      showToast('Description too long');
      return;
    }
    if (Number.isNaN(finalPrice) || finalPrice < 0) {
      showToast('Price must be ≥ 0');
      return;
    }
    let d: number | null = null;
    if (durationMinutes.trim()) {
      d = parseInt(durationMinutes, 10);
      if (Number.isNaN(d) || d < 1 || d > 1440) {
        showToast('Duration must be 1–1440 minutes');
        return;
      }
    }
    setSaving(true);
    try {
      if (isEdit && initial) {
        await updatePackage(workspaceId, initial.id, {
          name: n,
          description: description || null,
          finalPrice,
          durationMinutes: d,
          bookingMode,
          isActive,
          currency,
        });
      } else {
        await createPackage(workspaceId, {
          serviceCatalogId: catalog.id,
          name: n,
          description: description || undefined,
          finalPrice,
          durationMinutes: d,
          bookingMode,
          currency,
        });
      }
      showToast('Package saved');
      onSaved();
      onClose();
    } catch (er: unknown) {
      const msg = er instanceof Error ? er.message : 'Save failed';
      showToast(msg);
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
            className="fixed right-0 top-0 z-[310] flex h-full w-full max-w-full flex-col border-l border-app-border bg-app-bg sm:max-w-[min(100vw,560px)] sm:min-w-[min(100vw,560px)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pkg-drawer-title"
          >
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <h2 id="pkg-drawer-title" className="text-lg font-black text-app-text">
                {isEdit ? 'Edit package' : 'New package'}
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
                {lock && (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                    Admin has locked this service to{' '}
                    <span className="font-bold">
                      {lock === 'auto_appointment' ? 'Auto appointment' : 'Negotiation'}
                    </span>
                    . Your booking mode is fixed.
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-semibold text-neutral-500">Service (catalog)</p>
                  {isEdit && catalog ? (
                    <p className="rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text">
                      {catalog.name}
                      <span className="mt-0.5 block text-[10px] text-neutral-500">{catalog.categoryPath}</span>
                    </p>
                  ) : (
                    <CatalogPicker
                      disabled={saving}
                      selectedId={catalog?.id ?? null}
                      onSelect={(c) => setCatalog(c)}
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500" htmlFor="pkg-name">
                    Package name
                  </label>
                  <input
                    id="pkg-name"
                    className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
                    maxLength={MAX_NAME}
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500" htmlFor="pkg-desc">
                    Description
                  </label>
                  <textarea
                    id="pkg-desc"
                    className="mt-1 w-full min-h-[88px] rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
                    maxLength={MAX_DESC}
                    disabled={saving}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-neutral-500" htmlFor="pkg-price">
                      Price ({currency})
                    </label>
                    <input
                      id="pkg-price"
                      type="number"
                      min={0}
                      step="0.01"
                      className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                      value={finalPrice}
                      onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-500" htmlFor="pkg-ccy">
                      Package currency
                    </label>
                    <select
                      id="pkg-ccy"
                      className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={saving}
                    >
                      {['CAD', 'USD', 'EUR', 'GBP'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-500" htmlFor="pkg-dur">
                    Duration (minutes, optional)
                  </label>
                  <input
                    id="pkg-dur"
                    type="number"
                    min={1}
                    max={1440}
                    className="mt-1 w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <BookingModeToggle
                  value={bookingMode}
                  onChange={setBookingMode}
                  lockedBookingMode={lock}
                  disabled={saving}
                />
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
                {isEdit && initial && (
                  <div data-bom-snapshot-fields="snapshotUnitPrice,snapshotCurrency,snapshotProductName,snapshotUnit">
                    <PackageBomSection
                      workspaceId={workspaceId}
                      packageId={initial.id}
                      packageCurrency={currency}
                      finalPrice={finalPrice}
                      computeMargin={computePackageMargin}
                      showToast={showToast}
                      onGoToInventory={onGoToInventory ?? (() => {})}
                    />
                  </div>
                )}
              </div>
              <div className="mt-auto flex gap-2 border-t border-app-border pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    'flex-1 rounded-2xl bg-neutral-900 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900',
                    saving && 'opacity-60'
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
