import { useEffect, useLayoutEffect } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useWizardStore } from '../../../lib/wizardStore';
import type { DatePreference, TimeWindow, Urgency } from '../../../lib/wizardStore';
import type { ScheduleChoice } from '../Step2When';

export type AutoBookingFormProps = {
  catalogName?: string;
  syncSchedule: (flex: ScheduleChoice, iso: string | null) => void;
};

const datePrefs: { id: DatePreference; title: string; hint: string }[] = [
  { id: 'today', title: 'Today', hint: 'Fastest match window' },
  { id: 'tomorrow', title: 'Tomorrow', hint: 'Next-day availability' },
  { id: 'this_weekend', title: 'This weekend', hint: 'Sat–Sun friendly' },
];

const windows: { id: TimeWindow; title: string }[] = [
  { id: 'morning', title: 'Morning (8am–12pm)' },
  { id: 'afternoon', title: 'Afternoon (12pm–5pm)' },
  { id: 'evening', title: 'Evening (5pm–8pm)' },
];

const urgencies: { id: Urgency; title: string; hint: string }[] = [
  { id: 'immediate', title: 'ASAP', hint: 'Queue for immediate matching' },
  { id: 'this_week', title: 'This week', hint: 'Flexible in the next few days' },
  { id: 'no_rush', title: 'No rush', hint: 'Whenever works' },
];

export default function AutoBookingForm({ catalogName, syncSchedule }: AutoBookingFormProps) {
  const datePreference = useWizardStore((s) => s.datePreference);
  const timeWindow = useWizardStore((s) => s.timeWindow);
  const urgency = useWizardStore((s) => s.urgency);
  const accessNotes = useWizardStore((s) => s.accessNotes);
  const setBookingForm = useWizardStore((s) => s.setBookingForm);

  useLayoutEffect(() => {
    const st = useWizardStore.getState();
    const patch: Partial<{ datePreference: DatePreference; timeWindow: TimeWindow; urgency: Urgency }> = {};
    if (!st.datePreference) patch.datePreference = 'today';
    if (!st.timeWindow) patch.timeWindow = 'morning';
    if (!st.urgency) patch.urgency = 'immediate';
    if (Object.keys(patch).length) setBookingForm(patch);
  }, [setBookingForm]);

  useEffect(() => {
    const flex: ScheduleChoice =
      urgency === 'immediate' ? 'asap' : urgency === 'this_week' ? 'this_week' : 'this_week';
    syncSchedule(flex, null);
  }, [urgency, syncSchedule]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-card p-4">
        <Zap className="w-6 h-6 shrink-0 text-amber-500" aria-hidden />
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Quick booking</p>
          <p className="mt-1 font-bold text-app-text text-[15px]">{catalogName ?? 'Service'}</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Fast auto-match after you submit. Pick a rough window so we can align providers.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Preferred day</p>
        <div className="grid gap-2">
          {datePrefs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setBookingForm({ datePreference: d.id })}
              className={cn(
                'w-full min-h-[48px] text-left p-4 rounded-2xl border-2 transition-all',
                datePreference === d.id
                  ? 'border-neutral-900 dark:border-white bg-app-card'
                  : 'border-app-border bg-app-bg hover:border-neutral-400',
              )}
            >
              <p className="font-bold text-app-text">{d.title}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{d.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Time of day</p>
        <div className="flex flex-wrap gap-2">
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setBookingForm({ timeWindow: w.id })}
              className={cn(
                'min-h-[44px] px-4 rounded-full border text-sm font-bold transition-colors',
                timeWindow === w.id
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                  : 'border-app-border bg-app-card text-app-text hover:border-neutral-400',
              )}
            >
              {w.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Urgency</p>
        <div className="space-y-2">
          {urgencies.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setBookingForm({ urgency: u.id })}
              className={cn(
                'w-full min-h-[48px] text-left p-4 rounded-2xl border-2 transition-all',
                urgency === u.id
                  ? 'border-neutral-900 dark:border-white bg-app-card'
                  : 'border-app-border bg-app-bg hover:border-neutral-400',
              )}
            >
              <p className="font-bold text-app-text">{u.title}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{u.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-widest text-neutral-400" htmlFor="auto-access">
          Access notes (optional)
        </label>
        <textarea
          id="auto-access"
          rows={3}
          value={accessNotes ?? ''}
          onChange={(e) => setBookingForm({ accessNotes: e.target.value || undefined })}
          placeholder="Gate code, buzzer, parking, pets…"
          className="w-full rounded-xl border border-app-border bg-app-input p-3 text-[15px] text-app-text"
        />
      </div>
    </div>
  );
}
