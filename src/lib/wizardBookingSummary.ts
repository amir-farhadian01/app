import { useWizardStore } from './wizardStore';

/** Human-readable block appended to order description on submit. */
export function buildWizardBookingSummary(): string {
  const s = useWizardStore.getState();
  if (!s.bookingMode) return '';
  const lines: string[] = [];
  lines.push(`Booking mode: ${s.bookingMode.replace(/_/g, ' ')}`);
  if (s.datePreference) lines.push(`Day preference: ${s.datePreference}`);
  if (s.timeWindow) lines.push(`Time of day: ${s.timeWindow}`);
  if (s.urgency) lines.push(`Urgency: ${s.urgency}`);
  if (s.appointmentDate && s.appointmentTime) {
    lines.push(`Requested appointment (local): ${s.appointmentDate} ${s.appointmentTime}`);
  }
  if (s.serviceAddress?.trim()) lines.push(`Service address: ${s.serviceAddress.trim()}`);
  if (s.budgetMin != null || s.budgetMax != null) {
    lines.push(`Budget (CAD): ${s.budgetMin ?? '—'} – ${s.budgetMax ?? '—'}`);
  }
  if (s.notes?.trim()) lines.push(`Scope / negotiation notes: ${s.notes.trim()}`);
  if (s.accessNotes?.trim()) lines.push(`Access notes: ${s.accessNotes.trim()}`);
  return lines.join('\n');
}
