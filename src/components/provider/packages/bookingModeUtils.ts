import type { BookingMode } from '../../../services/workspaces';

/** ADR-0028: lock wins, else explicit package mode, else inherit → negotiation. */
export function effectiveBookingModeLabel(
  catalogLocked: string | null | undefined,
  pkgMode: BookingMode
): { label: string; tone: 'locked' | 'inherit' | 'explicit' } {
  if (catalogLocked === 'auto_appointment') {
    return { label: 'Auto appointment', tone: 'locked' };
  }
  if (catalogLocked === 'negotiation') {
    return { label: 'Negotiation', tone: 'locked' };
  }
  if (pkgMode === 'inherit_from_catalog') {
    return { label: 'Negotiation (inherit)', tone: 'inherit' };
  }
  if (pkgMode === 'auto_appointment') {
    return { label: 'Auto appointment', tone: 'explicit' };
  }
  return { label: 'Negotiation', tone: 'explicit' };
}
