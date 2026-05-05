import { useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getServiceCatalogPackages, type ServiceCatalogPackageRow } from '../../services/orders';
import { useWizardStore } from '../../lib/wizardStore';

export type Step3PackageAndLocationProps = {
  serviceCatalogId: string;
  savedProfileAddress?: string | null;
  onUseSavedAddress: () => void;
  onPackagesCount?: (n: number) => void;
};

function bookingModeBadge(mode: string): string {
  if (mode === 'auto_appointment') return 'Auto appointment';
  if (mode === 'negotiation') return 'Negotiation';
  if (mode === 'inherit_from_catalog') return 'Appointment';
  return mode;
}

export function Step3PackageAndLocation({
  serviceCatalogId,
  savedProfileAddress,
  onUseSavedAddress,
  onPackagesCount,
}: Step3PackageAndLocationProps) {
  const street = useWizardStore((s) => s.addressStreet ?? '');
  const city = useWizardStore((s) => s.addressCity ?? '');
  const postal = useWizardStore((s) => s.addressPostal ?? '');
  const selectedId = useWizardStore((s) => s.selectedPackageId);
  const setBookingForm = useWizardStore((s) => s.setBookingForm);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<ServiceCatalogPackageRow[]>([]);

  useEffect(() => {
    if (!serviceCatalogId.trim()) {
      setPackages([]);
      setLoading(false);
      onPackagesCount?.(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const rows = await getServiceCatalogPackages(serviceCatalogId.trim());
        if (cancelled) return;
        const valid = rows.filter((r) => r.id?.trim() && r.name?.trim());
        setPackages(valid);
        onPackagesCount?.(valid.length);
        const currentSel = useWizardStore.getState().selectedPackageId;
        if (valid.length === 1) {
          const p = valid[0]!;
          const pref = useWizardStore.getState().wizardTimePreference?.trim();
          setBookingForm({
            selectedPackageId: p.id,
            selectedPackageName: p.name,
            selectedPackagePrice: p.price,
            selectedPackageDuration: p.duration,
            selectedPackageBookingMode: p.bookingMode,
            ...(p.bookingMode === 'negotiation' && !pref
              ? { wizardTimePreference: 'AS_SOON_AS_POSSIBLE' as const }
              : {}),
          });
        } else if (currentSel && !valid.some((r) => r.id === currentSel)) {
          setBookingForm({
            selectedPackageId: undefined,
            selectedPackageName: undefined,
            selectedPackagePrice: undefined,
            selectedPackageDuration: undefined,
            selectedPackageBookingMode: undefined,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load packages');
          setPackages([]);
          onPackagesCount?.(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceCatalogId, setBookingForm, onPackagesCount]);

  const selectPackage = (p: ServiceCatalogPackageRow) => {
    const pref = useWizardStore.getState().wizardTimePreference?.trim();
    setBookingForm({
      selectedPackageId: p.id,
      selectedPackageName: p.name,
      selectedPackagePrice: p.price,
      selectedPackageDuration: p.duration,
      selectedPackageBookingMode: p.bookingMode,
      ...(p.bookingMode === 'negotiation' && !pref ? { wizardTimePreference: 'AS_SOON_AS_POSSIBLE' as const } : {}),
    });
  };

  const cad = (n: number) =>
    n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 });

  function scopeSummary(p: ServiceCatalogPackageRow): string | null {
    const lines = p.bomLines ?? [];
    if (!lines.length) return null;
    const maxShow = 4;
    const parts = lines.slice(0, maxShow).map((b) => {
      const q = b.quantity > 1 ? `${b.quantity}× ` : '';
      return `${q}${b.productName}`;
    });
    const more = lines.length > maxShow ? ` · +${lines.length - maxShow} more line items` : '';
    return parts.join(' · ') + more;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Package & pricing</p>
        <p className="text-neutral-600 dark:text-neutral-400 text-[15px] mt-1">
          Choose the package that fits your job. Pricing is shown in Canadian dollars.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500" aria-busy="true">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading packages…</span>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && packages.length === 0 && !error ? (
        <p className="text-sm text-neutral-500">No published packages for this service yet. You can still continue.</p>
      ) : null}

      <div className="space-y-3">
        {packages.map((p) => {
          const selected = selectedId === p.id;
          const scopeLine = scopeSummary(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPackage(p)}
              className={cn(
                'w-full text-left rounded-2xl border p-4 transition-colors min-h-[48px]',
                selected
                  ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900/40'
                  : 'border-app-border bg-app-card hover:border-neutral-400',
              )}
            >
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 shrink-0 mt-0.5 text-neutral-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-app-text">{p.name}</p>
                  <p className="text-lg font-black text-app-text mt-1">{cad(p.price)}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {p.duration != null ? (
                      <span className="text-xs font-bold rounded-full bg-neutral-200 dark:bg-neutral-700 px-2 py-1">
                        {p.duration} min
                      </span>
                    ) : null}
                    <span className="text-xs font-bold rounded-full border border-app-border px-2 py-1">
                      {bookingModeBadge(p.bookingMode)}
                    </span>
                  </div>
                  {scopeLine ? (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-snug">
                      <span className="font-semibold text-app-text">Includes: </span>
                      {scopeLine}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 italic">
                      Scope details will follow in your job description.
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-app-border pt-6 space-y-4">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Service location</p>
        <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
          Confirm where the provider should meet you. Street, city, and postal code are required before you can
          continue.
        </p>
        {savedProfileAddress ? (
          <button
            type="button"
            className="w-full min-h-[48px] text-left text-sm font-bold text-blue-600 dark:text-blue-400 py-2"
            onClick={onUseSavedAddress}
          >
            Use my saved profile address
          </button>
        ) : null}
        <div className="space-y-2">
          <label className="text-xs font-bold text-app-text" htmlFor="wiz-street">
            Street address
          </label>
          <input
            id="wiz-street"
            value={street}
            onChange={(e) => setBookingForm({ addressStreet: e.target.value })}
            className="w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
            placeholder="123 Main Street"
            autoComplete="street-address"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-app-text" htmlFor="wiz-city">
            City
          </label>
          <input
            id="wiz-city"
            value={city}
            onChange={(e) => setBookingForm({ addressCity: e.target.value })}
            className="w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
            placeholder="City, Province"
            autoComplete="address-level2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-app-text" htmlFor="wiz-postal">
            Postal code
          </label>
          <input
            id="wiz-postal"
            value={postal}
            onChange={(e) => setBookingForm({ addressPostal: e.target.value })}
            className="w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
            placeholder="L4K 0K8"
            autoComplete="postal-code"
          />
        </div>
      </div>
    </div>
  );
}

export function composeWizardAddress(street: string, city: string, postal: string): string {
  return [street.trim(), city.trim(), postal.trim()].filter(Boolean).join(', ');
}
