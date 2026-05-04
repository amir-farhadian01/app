export type WizardBookingMode = 'auto_appointment' | 'inherit_from_catalog' | 'negotiation';

export type CatalogBookingMeta = {
  name?: string | null;
  slug?: string | null;
  lockedBookingMode?: string | null;
};

/**
 * Maps catalog lock + slug/name heuristics to the wizard booking branch.
 * Public catalog tiles may omit a lock; known seed slugs still branch correctly.
 */
export function effectiveWizardBookingMode(meta: CatalogBookingMeta | null | undefined): WizardBookingMode {
  const lock = meta?.lockedBookingMode?.trim();
  if (lock === 'auto_appointment' || lock === 'negotiation') {
    return lock;
  }
  const slug = (meta?.slug ?? '').toLowerCase();
  const name = (meta?.name ?? '').toLowerCase();
  if (slug.includes('haircut') || name.includes('haircut')) return 'auto_appointment';
  if (
    slug.includes('oil') ||
    slug.includes('maintenance-bundle') ||
    name.includes('oil change') ||
    name.includes('maintenance bundle')
  ) {
    return 'negotiation';
  }
  return 'inherit_from_catalog';
}

export function wizardBookingModeLabel(mode: WizardBookingMode | undefined): string {
  switch (mode) {
    case 'auto_appointment':
      return 'Fixed appointment';
    case 'negotiation':
      return 'Quote and negotiate';
    case 'inherit_from_catalog':
    default:
      return 'On-site visit (catalog default)';
  }
}
