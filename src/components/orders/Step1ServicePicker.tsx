import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { CategoryTreeBrowser } from './CategoryTreeBrowser';
import { getServiceCatalogSchema, searchCategoriesAndCatalogs, type CatalogSelectionMeta } from '../../services/orders';
import { cn } from '../../lib/utils';

export type Step1ServicePickerProps = {
  onSelectServiceCatalog: (catalogId: string, meta?: CatalogSelectionMeta) => void;
  initialPathIds?: string[];
  showOtherRow?: boolean;
  onOtherRequest?: () => void;
  newOfferHint?: boolean;
  onSuggestPath?: (pathIds: string[]) => void;
  /** When true, focus the category search field on mount (new offer entry). */
  autoFocusCategorySearch?: boolean;
};

function prefetchCatalogSchema(catalogId: string): void {
  void getServiceCatalogSchema(catalogId).catch(() => {
    /* warm path; OrderWizard applies fallback on failure */
  });
}

export function Step1ServicePicker({
  onSelectServiceCatalog,
  initialPathIds,
  showOtherRow,
  onOtherRequest,
  newOfferHint,
  onSuggestPath,
  autoFocusCategorySearch,
}: Step1ServicePickerProps) {
  const { user } = useAuth();
  const [needDesc, setNeedDesc] = useState('');
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestHits, setSuggestHits] = useState<{ id: string; name: string; pathIds: string[] }[]>([]);

  useEffect(() => {
    const q = needDesc.trim();
    if (q.length < 2) {
      setSuggestHits([]);
      setSuggestBusy(false);
      return;
    }
    setSuggestBusy(true);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const r = await searchCategoriesAndCatalogs(q.slice(0, 120), 20);
          const top = r.categories.slice(0, 3).map((c) => ({
            id: c.id,
            name: c.name,
            pathIds: c.pathIds ?? [],
          }));
          setSuggestHits(top);
        } catch {
          setSuggestHits([]);
        } finally {
          setSuggestBusy(false);
        }
      })();
    }, 400);
    return () => window.clearTimeout(t);
  }, [needDesc]);

  const applyChip = useCallback(
    (pathIds: string[]) => {
      if (pathIds.length) onSuggestPath?.(pathIds);
    },
    [onSuggestPath],
  );

  const treeKey = useMemo(
    () => `${initialPathIds?.join(',') ?? 'none'}:${newOfferHint ? '1' : '0'}`,
    [initialPathIds, newOfferHint],
  );

  return (
    <div className="space-y-4">
      {newOfferHint ? (
        <div className="rounded-2xl border border-dashed border-app-border bg-app-card/60 p-4 text-sm text-neutral-600 dark:text-neutral-400">
          <p className="font-bold text-app-text">New offer</p>
          <p className="mt-1 leading-relaxed">
            Browse all categories from the top, or describe what you need below — we will suggest matches. Choose{' '}
            <strong>Other</strong> if the marketplace does not list your service yet.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-3">
        <label className="text-xs font-black uppercase tracking-widest text-neutral-400" htmlFor="wizard-need-desc">
          Describe what you need
        </label>
        <input
          id="wizard-need-desc"
          type="text"
          value={needDesc}
          onChange={(e) => setNeedDesc(e.target.value)}
          placeholder="Describe what you need..."
          autoFocus={Boolean(autoFocusCategorySearch)}
          className="w-full min-h-[44px] rounded-xl border border-app-border bg-app-input px-3 text-[15px] text-app-text"
        />
        {suggestBusy ? <p className="text-sm text-neutral-500">Searching…</p> : null}
        {!suggestBusy && suggestHits.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestHits.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => applyChip(h.pathIds)}
                className="min-h-[44px] px-3 rounded-full border border-app-border bg-app-bg text-sm font-bold text-app-text hover:border-neutral-900 dark:hover:border-white transition-colors"
              >
                {h.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-neutral-600 dark:text-neutral-400 text-[15px] leading-relaxed">
        Pick the type of help you need. You can search or browse categories — up to five levels deep.
      </p>
      <CategoryTreeBrowser
        key={treeKey}
        onSelectServiceCatalog={onSelectServiceCatalog}
        onServiceCatalogPress={(id) => {
          if (user?.id) prefetchCatalogSchema(id);
        }}
        initialPathIds={initialPathIds}
        showOtherRow={showOtherRow}
        onOtherRequest={onOtherRequest}
        autoFocusSearch={Boolean(autoFocusCategorySearch)}
      />
    </div>
  );
}
