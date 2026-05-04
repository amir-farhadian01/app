import { useEffect, useLayoutEffect, useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { useWizardStore } from '../../../lib/wizardStore';
import type { ScheduleChoice } from '../Step2When';

export type AppointmentBookingFormProps = {
  catalogName?: string;
  providerName?: string;
  syncSchedule: (flex: ScheduleChoice, iso: string | null) => void;
  syncAddress: (addr: string) => void;
};

function combineLocalDateTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  const iso = new Date(`${date}T${time}:00`);
  if (Number.isNaN(iso.getTime())) return null;
  return iso.toISOString();
}

function minDatetimeLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppointmentBookingForm({
  catalogName,
  providerName,
  syncSchedule,
  syncAddress,
}: AppointmentBookingFormProps) {
  const appointmentDate = useWizardStore((s) => s.appointmentDate);
  const appointmentTime = useWizardStore((s) => s.appointmentTime);
  const serviceAddress = useWizardStore((s) => s.serviceAddress);
  const accessNotes = useWizardStore((s) => s.accessNotes);
  const setBookingForm = useWizardStore((s) => s.setBookingForm);

  const defaultDate = useMemo(() => {
    const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  useLayoutEffect(() => {
    const st = useWizardStore.getState();
    const patch: Partial<{ appointmentDate: string; appointmentTime: string }> = {};
    if (!st.appointmentDate) patch.appointmentDate = defaultDate;
    if (!st.appointmentTime) patch.appointmentTime = '09:00';
    if (Object.keys(patch).length) setBookingForm(patch);
  }, [defaultDate, setBookingForm]);

  const iso = combineLocalDateTime(appointmentDate ?? '', appointmentTime ?? '');

  useEffect(() => {
    if (iso) {
      const min = new Date(minDatetimeLocal().slice(0, 16)).getTime();
      if (new Date(iso).getTime() >= min) {
        syncSchedule('specific', iso);
        return;
      }
    }
    syncSchedule('specific', new Date(minDatetimeLocal()).toISOString());
  }, [iso, appointmentDate, appointmentTime, syncSchedule]);

  useEffect(() => {
    const t = serviceAddress?.trim();
    if (t && t.length >= 5) syncAddress(t);
  }, [serviceAddress, syncAddress]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Scheduled visit</p>
        <p className="font-bold text-app-text text-[15px]">{catalogName ?? 'Service'}</p>
        {providerName ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Requested provider: <span className="font-semibold text-app-text">{providerName}</span>
          </p>
        ) : null}
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Choose a preferred on-site window. Final timing may be confirmed after a provider accepts.
        </p>
      </div>

      <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-app-text font-bold text-sm">
          <CalendarClock className="w-5 h-5" />
          Preferred appointment
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500" htmlFor="appt-date">
              Date
            </label>
            <input
              id="appt-date"
              type="date"
              value={appointmentDate ?? ''}
              onChange={(e) => setBookingForm({ appointmentDate: e.target.value })}
              className="w-full min-h-[48px] rounded-xl border border-app-border bg-app-input px-3 text-[15px] text-app-text"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500" htmlFor="appt-time">
              Time
            </label>
            <input
              id="appt-time"
              type="time"
              value={appointmentTime ?? ''}
              onChange={(e) => setBookingForm({ appointmentTime: e.target.value })}
              className="w-full min-h-[48px] rounded-xl border border-app-border bg-app-input px-3 text-[15px] text-app-text"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-widest text-neutral-400" htmlFor="svc-addr">
          Service address
        </label>
        <textarea
          id="svc-addr"
          rows={3}
          value={serviceAddress ?? ''}
          onChange={(e) => setBookingForm({ serviceAddress: e.target.value || undefined })}
          placeholder="Street, unit, city (used for matching)"
          className="w-full rounded-xl border border-app-border bg-app-input p-3 text-[15px] text-app-text"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-widest text-neutral-400" htmlFor="appt-access">
          Access notes (optional)
        </label>
        <textarea
          id="appt-access"
          rows={2}
          value={accessNotes ?? ''}
          onChange={(e) => setBookingForm({ accessNotes: e.target.value || undefined })}
          placeholder="Gate, buzzer, parking instructions…"
          className="w-full rounded-xl border border-app-border bg-app-input p-3 text-[15px] text-app-text"
        />
      </div>
    </div>
  );
}
