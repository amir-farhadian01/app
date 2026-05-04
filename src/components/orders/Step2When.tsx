import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarClock } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ScheduleChoice = 'asap' | 'this_week' | 'specific';

export type Step2WhenProps = {
  value: ScheduleChoice;
  scheduledAt: string | null;
  onChange: (flex: ScheduleChoice, iso: string | null) => void;
};

function minDatetimeLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatPreview(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function Step2When({ value, scheduledAt, onChange }: Step2WhenProps) {
  const [showPicker, setShowPicker] = useState(value === 'specific');

  const cards: { id: ScheduleChoice; title: string; hint: string }[] = [
    { id: 'asap', title: 'As soon as possible', hint: 'We’ll prioritize fast matching.' },
    { id: 'this_week', title: 'This week', hint: 'Flexible within the next few days.' },
    { id: 'specific', title: 'Pick a specific date and time', hint: 'Choose an exact slot after this step.' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
        When do you need this done? We’ll match you with available providers.
      </p>
      <div className="space-y-3">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              if (c.id === 'specific') {
                setShowPicker(true);
                onChange('specific', scheduledAt || minDatetimeLocal());
              } else {
                setShowPicker(false);
                onChange(c.id, null);
              }
            }}
            className={cn(
              'w-full min-h-[48px] text-left p-5 rounded-3xl border-2 transition-all',
              value === c.id
                ? 'border-neutral-900 dark:border-white bg-app-card'
                : 'border-app-border bg-app-bg hover:border-neutral-400',
            )}
          >
            <p className="font-black text-[15px] text-app-text">{c.title}</p>
            <p className="text-xs text-neutral-500 mt-1">{c.hint}</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showPicker && value === 'specific' ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-app-border bg-app-card p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-app-text font-bold text-sm">
              <CalendarClock className="w-5 h-5" />
              Date & time
            </div>
            <input
              type="datetime-local"
              min={minDatetimeLocal()}
              value={scheduledAt ? scheduledAt.slice(0, 16) : minDatetimeLocal()}
              onChange={(e) => {
                const v = e.target.value;
                const iso = v ? new Date(v).toISOString() : null;
                onChange('specific', iso);
              }}
              className="w-full min-h-[48px] rounded-xl border border-app-border bg-app-input px-3 py-2 text-[15px] text-app-text"
            />
            {scheduledAt ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{formatPreview(scheduledAt)}</p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <p className="text-xs text-neutral-500">We’ll match you with available providers.</p>
    </div>
  );
}
