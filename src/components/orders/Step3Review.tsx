import { useEffect, useState } from 'react';

export interface Step3ReviewProps {
  readonly homeCategory?: string;
  readonly prefillCategoryPath?: string[];
  readonly serviceCatalogId?: string;
  readonly serviceCatalogName?: string;
  readonly prefillProviderId?: string;
  readonly prefillProviderName?: string;
  readonly bookingMode?: 'auto_appointment' | 'inherit_from_catalog' | 'negotiation';
  readonly description?: string;
  readonly serviceAddress?: string;
  readonly onBack: () => void;
  readonly onNext: () => void;
}

type CatalogBomLine = { item: string; qty: number; unitPrice: number };

type CatalogSummaryData = {
  price?: number;
  bom?: { lines: CatalogBomLine[] };
};

function Badge({
  children,
  className = '',
  variant = 'outline',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'outline' | 'secondary';
}) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border';
  const variants =
    variant === 'secondary'
      ? 'border-transparent bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100'
      : 'border-gray-300 bg-white text-gray-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200';
  return <span className={`${base} ${variants} ${className}`.trim()}>{children}</span>;
}

function getModeConfig(mode: string | undefined) {
  switch (mode) {
    case 'auto_appointment':
      return { label: 'Fast Match', color: 'bg-green-700 text-white' };
    case 'inherit_from_catalog':
      return { label: 'Appointment Booking', color: 'bg-blue-700 text-white' };
    case 'negotiation':
      return { label: 'Negotiation Request', color: 'bg-amber-700 text-white' };
    default:
      return { label: mode && mode !== 'unknown' ? mode : 'Unknown', color: 'bg-gray-600 text-white' };
  }
}

function parseCatalogJson(raw: unknown): CatalogSummaryData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const price = typeof o.price === 'number' && Number.isFinite(o.price) ? o.price : undefined;
  let bom: { lines: CatalogBomLine[] } | undefined;
  const bomRaw = o.bom;
  if (bomRaw && typeof bomRaw === 'object' && !Array.isArray(bomRaw)) {
    const linesIn = (bomRaw as Record<string, unknown>).lines;
    if (Array.isArray(linesIn)) {
      const lines: CatalogBomLine[] = [];
      for (const row of linesIn) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const r = row as Record<string, unknown>;
        const item = typeof r.item === 'string' ? r.item : '';
        const qty = typeof r.qty === 'number' && Number.isFinite(r.qty) ? r.qty : Number(r.qty);
        const unitPrice =
          typeof r.unitPrice === 'number' && Number.isFinite(r.unitPrice) ? r.unitPrice : Number(r.unitPrice);
        if (!item || !Number.isFinite(qty) || !Number.isFinite(unitPrice)) continue;
        lines.push({ item, qty, unitPrice });
      }
      if (lines.length > 0) bom = { lines };
    }
  }
  if (price === undefined && !bom) return {};
  return { ...(price !== undefined ? { price } : {}), ...(bom ? { bom } : {}) };
}

export default function Step3Review(props: Step3ReviewProps) {
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogData, setCatalogData] = useState<CatalogSummaryData | null>(null);
  const [catalogFetchFailed, setCatalogFetchFailed] = useState(false);

  useEffect(() => {
    if (!props.serviceCatalogId?.trim()) {
      setCatalogData(null);
      setCatalogFetchFailed(false);
      setCatalogLoading(false);
      return;
    }
    const id = props.serviceCatalogId.trim();
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogFetchFailed(false);
    setCatalogData(null);
    void (async () => {
      try {
        const res = await fetch(`/api/service-catalog/${encodeURIComponent(id)}`);
        const raw: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setCatalogFetchFailed(true);
          setCatalogData(null);
          return;
        }
        setCatalogData(parseCatalogJson(raw));
      } catch {
        if (!cancelled) {
          setCatalogFetchFailed(true);
          setCatalogData(null);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.serviceCatalogId]);

  const mode = getModeConfig(props.bookingMode);
  const categoryPath = props.prefillCategoryPath ?? [];
  const hasPricingContent =
    catalogData != null &&
    !catalogFetchFailed &&
    (typeof catalogData.price === 'number' || (catalogData.bom?.lines?.length ?? 0) > 0);

  return (
    <div className="space-y-3">
      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
        Review your selections before answering service-specific questions.
      </p>

      <div className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm dark:border-app-border dark:bg-app-card">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Service</Badge>
          <h3 className="font-medium text-lg text-gray-900 dark:text-app-text">
            {props.serviceCatalogName ?? 'No service selected'}
          </h3>
        </div>
        {categoryPath.length > 0 ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{categoryPath.join(' › ')}</p>
        ) : null}
        {props.homeCategory?.trim() && categoryPath.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Home category: {props.homeCategory}</p>
        ) : null}
      </div>

      {props.prefillProviderName ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/40 dark:bg-sky-950/30">
          <Badge variant="secondary" className="!bg-sky-700 !text-white !border-transparent">
            Provider
          </Badge>
          <p className="text-gray-900 dark:text-app-text font-medium mt-1">{props.prefillProviderName}</p>
          <p className="text-sm text-gray-600 dark:text-neutral-400">
            Requested provider (copied from banner or home hero)
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm dark:border-app-border dark:bg-app-card">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Booking</Badge>
          <span className={`px-3 py-1.5 min-h-[44px] inline-flex items-center rounded-full text-sm font-medium ${mode.color}`}>
            {mode.label}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mt-2">
          {props.bookingMode === 'auto_appointment' && 'Quick services. Auto-match picks best provider.'}
          {props.bookingMode === 'inherit_from_catalog' && 'Scheduled appointment. Date/time picker needed.'}
          {props.bookingMode === 'negotiation' && 'Custom request. Enter quote and negotiate.'}
          {!props.bookingMode && 'Booking mode will follow the service catalog defaults.'}
        </p>
      </div>

      {props.serviceAddress ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-app-border dark:bg-app-bg/80">
          <Badge variant="outline">Location</Badge>
          <p className="text-gray-900 dark:text-app-text mt-1 font-medium">{props.serviceAddress}</p>
          <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
            Used by matching engine to suggest nearby providers
          </p>
        </div>
      ) : null}

      {props.description ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-app-border dark:bg-app-bg/80">
          <Badge variant="outline">Request</Badge>
          <p className="text-gray-900 dark:text-app-text mt-1 text-sm leading-relaxed">
            &ldquo;
            {props.description.slice(0, 150)}
            {props.description.length > 150 ? '…' : ''}
            &rdquo;
          </p>
        </div>
      ) : null}

      {props.serviceCatalogId ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/25">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-900 text-white border border-emerald-950">
            Pricing
          </span>
          {catalogLoading ? (
            <div className="mt-3 space-y-2 animate-pulse" aria-busy="true" aria-live="polite">
              <div className="h-4 bg-emerald-200/80 dark:bg-emerald-900/40 rounded w-3/4" />
              <div className="h-4 bg-emerald-200/60 dark:bg-emerald-900/30 rounded w-1/2" />
            </div>
          ) : catalogFetchFailed ? (
            <p className="text-emerald-950 dark:text-emerald-100 mt-2 text-sm">
              Pricing information not available for this service
            </p>
          ) : !hasPricingContent ? (
            <p className="text-emerald-950 dark:text-emerald-100 mt-2 text-sm">Estimate not available</p>
          ) : (
            <>
              {typeof catalogData?.price === 'number' ? (
                <p className="text-emerald-950 dark:text-emerald-100 mt-2 text-sm">
                  Catalog estimate: <strong>${catalogData.price.toFixed(2)} CAD</strong>
                </p>
              ) : null}
              {catalogData?.bom && catalogData.bom.lines.length > 0 ? (
                <table className="w-full mt-2 text-sm text-emerald-950 dark:text-emerald-50">
                  <thead>
                    <tr className="text-gray-600 dark:text-emerald-200/80 border-b border-emerald-200 dark:border-emerald-800">
                      <td className="py-2 text-left">Item</td>
                      <td className="py-2 text-right">Qty</td>
                      <td className="py-2 text-right">Unit Price</td>
                      <td className="py-2 text-right">Line Total</td>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogData.bom.lines.map((li, idx) => (
                      <tr key={`${li.item}-${idx}`} className={idx % 2 === 1 ? 'bg-white/60 dark:bg-black/20' : ''}>
                        <td className="py-2 text-left pr-4">{li.item}</td>
                        <td className="py-2 text-right pr-4">{li.qty}</td>
                        <td className="py-2 text-right pr-4">${li.unitPrice.toFixed(2)}</td>
                        <td className="py-2 text-right font-medium">${(li.qty * li.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-emerald-300 dark:border-emerald-700">
                      <td colSpan={3} className="py-2 text-right font-bold text-gray-900 dark:text-white">
                        Estimated Total:
                      </td>
                      <td className="py-2 text-right font-bold text-emerald-900 dark:text-emerald-200">
                        $
                        {catalogData.bom.lines
                          .reduce((sum, li) => sum + li.qty * li.unitPrice, 0)
                          .toFixed(2)}{' '}
                        CAD
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={props.onBack}
          aria-label="Go back to previous step"
          className="min-h-[44px] min-w-[44px] px-5 rounded-xl border border-gray-300 bg-white font-semibold text-gray-900 shadow-sm dark:border-app-border dark:bg-app-card dark:text-app-text"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={props.onNext}
          disabled={!props.serviceCatalogId}
          aria-label="Continue to service details questionnaire"
          className="min-h-[44px] min-w-[44px] px-5 rounded-xl bg-neutral-900 text-white font-semibold dark:bg-white dark:text-neutral-900 disabled:opacity-50 disabled:pointer-events-none"
        >
          Next: Details →
        </button>
      </div>
    </div>
  );
}
