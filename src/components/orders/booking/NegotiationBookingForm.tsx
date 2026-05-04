import { useEffect, useLayoutEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useWizardStore } from '../../../lib/wizardStore';
import type { Urgency } from '../../../lib/wizardStore';
import type { ScheduleChoice } from '../Step2When';

export type NegotiationBookingFormProps = {
  catalogName?: string;
  providerName?: string;
  syncSchedule: (flex: ScheduleChoice, iso: string | null) => void;
};

const urgencies: { id: Urgency; title: string; hint: string }[] = [
  { id: 'immediate', title: 'Soon', hint: 'Start matching quickly' },
  { id: 'this_week', title: 'This week', hint: 'Flexible a few days out' },
  { id: 'no_rush', title: 'Flexible', hint: 'No tight deadline' },
];

export default function NegotiationBookingForm({
  catalogName,
  providerName,
  syncSchedule,
}: NegotiationBookingFormProps) {
  const urgency = useWizardStore((s) => s.urgency);
  const budgetMin = useWizardStore((s) => s.budgetMin);
  const budgetMax = useWizardStore((s) => s.budgetMax);
  const notes = useWizardStore((s) => s.notes);
  const accessNotes = useWizardStore((s) => s.accessNotes);
  const setBookingForm = useWizardStore((s) => s.setBookingForm);

  useLayoutEffect(() => {
    if (!useWizardStore.getState().urgency) setBookingForm({ urgency: 'this_week' });
  }, [setBookingForm]);

  useEffect(() => {
    const flex: ScheduleChoice = urgency === 'immediate' ? 'asap' : 'this_week';
    syncSchedule(flex, null);
  }, [urgency, syncSchedule]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-card p-4">
        <MessageCircle className="w-6 h-6 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Negotiated job</p>
          <p className="mt-1 font-bold text-app-text text-[15px]">{catalogName ?? 'Service'}</p>
          {providerName ? (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Requested provider: <span className="font-semibold text-app-text">{providerName}</span>
            </p>
          ) : null}
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Providers may message or adjust scope before you lock in. Share budget expectations and any vehicle or site
            details.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Timeline</p>
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-500" htmlFor="bud-min">
            Budget min (CAD, optional)
          </label>
          <input
            id="bud-min"
            type="number"
            min={0}
            step={1}
            value={budgetMin ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setBookingForm({ budgetMin: v === '' ? undefined : Number(v) });
            }}
            className="w-full min-h-[48px] rounded-xl border border-app-border bg-app-input px-3 text-[15px] text-app-text"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-500" htmlFor="bud-max">
            Budget max (CAD, optional)
          </label>
          <input
            id="bud-max"
            type="number"
            min={0}
            step={1}
            value={budgetMax ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setBookingForm({ budgetMax: v === '' ? undefined : Number(v) });
            }}
            className="w-full min-h-[48px] rounded-xl border border-app-border bg-app-input px-3 text-[15px] text-app-text"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-widest text-neutral-400" htmlFor="neg-notes">
          Scope & context
        </label>
        <textarea
          id="neg-notes"
          rows={4}
          value={notes ?? ''}
          onChange={(e) => setBookingForm({ notes: e.target.value || undefined })}
          placeholder="Vehicle model, package name, extras, or questions for providers (at least 10 characters to continue)."
          className="w-full rounded-xl border border-app-border bg-app-input p-3 text-[15px] text-app-text"
        />
        <p className="text-xs text-neutral-500">{notes?.trim().length ?? 0} / 10+ characters</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-widest text-neutral-400" htmlFor="neg-access">
          Access notes (optional)
        </label>
        <textarea
          id="neg-access"
          rows={2}
          value={accessNotes ?? ''}
          onChange={(e) => setBookingForm({ accessNotes: e.target.value || undefined })}
          placeholder="Shop location preferences, contact preferences…"
          className="w-full rounded-xl border border-app-border bg-app-input p-3 text-[15px] text-app-text"
        />
      </div>
    </div>
  );
}
