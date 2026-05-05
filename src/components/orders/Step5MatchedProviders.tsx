import { useEffect, useState } from 'react';
import { Loader2, MapPin, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getOrderMatchedProviders, type MatchedProviderPreview } from '../../services/orders';
import { useWizardStore } from '../../lib/wizardStore';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';

export type Step5MatchedProvidersProps = {
  /** Null when the draft is not saved yet (e.g. guest) — show a non-blocking explanation instead of a blank step. */
  orderId: string | null;
};

export function Step5MatchedProviders({ orderId }: Step5MatchedProvidersProps) {
  const selected = useWizardStore((s) => s.selectedProviderId);
  const setBookingForm = useWizardStore((s) => s.setBookingForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoMatch, setAutoMatch] = useState(false);
  const [manual, setManual] = useState(false);
  const [providers, setProviders] = useState<MatchedProviderPreview[]>([]);
  const [previewBlocked, setPreviewBlocked] = useState(false);

  useEffect(() => {
    if (!orderId?.trim()) {
      setLoading(false);
      setError(null);
      setPreviewBlocked(false);
      setAutoMatch(false);
      setManual(false);
      setProviders([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreviewBlocked(false);
    void (async () => {
      try {
        const r = await getOrderMatchedProviders(orderId.trim());
        if (cancelled) return;
        setAutoMatch(r.autoMatchEnabled);
        setManual(r.manualSelectionAvailable);
        setProviders(r.providers);
      } catch (e: unknown) {
        if (!cancelled) {
          const code =
            e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
          if (code === 'UNAUTHORIZED') {
            setPreviewBlocked(true);
            setError(null);
            setProviders([]);
            setAutoMatch(false);
            setManual(false);
          } else {
            setError(e instanceof Error ? e.message : 'Could not load providers');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!orderId?.trim() || previewBlocked) {
    return (
      <div className="rounded-2xl border border-dashed border-app-border bg-app-card p-6 space-y-3 text-center sm:text-left">
        <p className="font-bold text-app-text">Matching preview</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {!orderId?.trim()
            ? 'Save a signed-in draft to preview eligible workspaces for your package and address. You can keep going — the platform will still run matching when you submit.'
            : 'Sign in to preview eligible workspaces for this draft. You can keep going — matching still runs after you submit.'}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Final providers depend on availability, your location, and the service&apos;s matching mode.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-neutral-500">
        <Loader2 className="w-8 h-8 animate-spin" aria-hidden />
        <p className="text-sm font-bold text-center">Finding nearby providers…</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (autoMatch) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-card p-6 text-center space-y-2">
        <p className="font-bold text-app-text">We&apos;ll match you with the best provider nearby</p>
        <p className="text-sm text-neutral-500">
          Your request uses automatic matching. Sit tight — eligible workspaces will be notified after you submit.
        </p>
      </div>
    );
  }

  if (!manual || providers.length === 0) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-card p-6 space-y-2">
        <p className="font-bold text-app-text">No preview list yet</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          We couldn&apos;t surface optional provider picks for this draft (location, package, or availability).
          You can still submit — the platform will keep searching or notify you when someone becomes available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
        Optional: tap a provider to bias your request. Leave unselected to use platform ranking.
      </p>
      <div className="space-y-3">
        {providers.map((p) => {
          const isSel = selected === p.providerId;
          return (
            <button
              key={p.providerId}
              type="button"
              onClick={() =>
                setBookingForm({ selectedProviderId: isSel ? null : p.providerId })
              }
              className={cn(
                'w-full text-left rounded-2xl border p-4 flex gap-3 items-start min-h-[48px]',
                isSel
                  ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900/40'
                  : 'border-app-border bg-app-card',
              )}
            >
              <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden shrink-0">
                {p.avatarUrl ? (
                  <img
                    src={resolveMediaUrl(p.avatarUrl)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-app-text">{p.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{p.workspaceName}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                  {p.rating != null && Number.isFinite(p.rating) ? (
                    <span className="inline-flex items-center gap-1 font-bold text-app-text">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      {p.rating.toFixed(1)}
                      <span className="text-neutral-500 font-normal">({p.reviewsCount} reviews)</span>
                    </span>
                  ) : (
                    <span className="text-neutral-500">New on Neighborly</span>
                  )}
                  {p.distanceKm != null ? (
                    <span className="inline-flex items-center gap-1 text-neutral-500">
                      <MapPin className="w-4 h-4" />
                      {p.distanceKm.toFixed(1)} km
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
