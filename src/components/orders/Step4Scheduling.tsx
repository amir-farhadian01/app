import { useEffect } from 'react';
import { useWizardStore } from '../../lib/wizardStore';

const PREFS = ['AS_SOON_AS_POSSIBLE', 'THIS_WEEK', 'NEXT_WEEK', 'FLEXIBLE'] as const;
const LABELS: Record<(typeof PREFS)[number], string> = {
  AS_SOON_AS_POSSIBLE: 'As soon as possible',
  THIS_WEEK: 'This week',
  NEXT_WEEK: 'Next week',
  FLEXIBLE: 'Flexible',
};

export type Step4SchedulingProps = {
  bookingMode: string | undefined;
};

export function Step4Scheduling({ bookingMode }: Step4SchedulingProps) {
  const date = useWizardStore((s) => s.wizardScheduledDate ?? '');
  const slot = useWizardStore((s) => s.wizardTimeSlot ?? '');
  const pref = useWizardStore((s) => s.wizardTimePreference ?? 'AS_SOON_AS_POSSIBLE');
  const setBookingForm = useWizardStore((s) => s.setBookingForm);

  const isNegotiation = bookingMode === 'negotiation';

  useEffect(() => {
    if (!isNegotiation) return;
    const raw = useWizardStore.getState().wizardTimePreference;
    if (raw == null || String(raw).trim() === '') {
      setBookingForm({ wizardTimePreference: 'AS_SOON_AS_POSSIBLE' });
    }
  }, [isNegotiation, setBookingForm]);

  if (isNegotiation) {
    return (
      <div className="space-y-4">
        <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
          When do you need this? Pick the closest option — we&apos;ll confirm timing with your provider.
        </p>
        <div className="grid gap-2">
          {PREFS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setBookingForm({ wizardTimePreference: k })}
              className={`min-h-[48px] rounded-2xl border px-4 text-left font-bold text-[15px] transition-colors ${
                pref === k
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                  : 'border-app-border bg-app-card text-app-text'
              }`}
            >
              {LABELS[k]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
        Pick a preferred date and time window. Both are required before you continue — slots are a simple placeholder
        until live scheduling is connected.
      </p>
      <div className="space-y-2">
        <label className="text-xs font-bold text-app-text" htmlFor="wiz-date">
          Preferred date
        </label>
        <input
          id="wiz-date"
          type="date"
          value={date}
          onChange={(e) => setBookingForm({ wizardScheduledDate: e.target.value })}
          className="w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-app-text" htmlFor="wiz-slot">
          Preferred time (placeholder)
        </label>
        <select
          id="wiz-slot"
          value={slot}
          onChange={(e) => setBookingForm({ wizardTimeSlot: e.target.value })}
          className="w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
        >
          <option value="">Select a window</option>
          <option value="morning">Morning (8am–12pm)</option>
          <option value="afternoon">Afternoon (12pm–5pm)</option>
          <option value="evening">Evening (5pm–8pm)</option>
        </select>
      </div>
    </div>
  );
}
