import type { ScheduleChoice } from '../components/orders/Step2When';

export function formatScheduleLabel(flex: ScheduleChoice, scheduledAt: string | null): string {
  if (flex === 'asap') return 'As soon as possible';
  if (flex === 'this_week') return 'This week';
  if (flex === 'specific' && scheduledAt) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(scheduledAt));
  }
  return 'Specific time (pick date)';
}
