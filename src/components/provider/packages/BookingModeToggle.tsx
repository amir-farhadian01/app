import React from 'react';
import { cn } from '../../../lib/utils';
import type { BookingMode } from '../../../services/workspaces';

const OPTIONS: { value: BookingMode; label: string }[] = [
  { value: 'auto_appointment', label: 'Auto' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'inherit_from_catalog', label: 'Inherit' },
];

type Props = {
  value: BookingMode;
  onChange: (v: BookingMode) => void;
  lockedBookingMode: string | null;
  disabled?: boolean;
  id?: string;
};

export function BookingModeToggle({ value, onChange, lockedBookingMode, disabled, id }: Props) {
  const lock = lockedBookingMode;
  const disAuto = lock === 'negotiation';
  const disNeg = lock === 'auto_appointment';
  return (
    <div className="space-y-1.5" id={id}>
      <p className="text-xs font-semibold text-neutral-500">Booking mode</p>
      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-app-border bg-app-input p-1">
        {OPTIONS.map((o) => {
          const isOff = (o.value === 'auto_appointment' && disAuto) || (o.value === 'negotiation' && disNeg);
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled || isOff}
              onClick={() => onChange(o.value)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition',
                active
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-500 hover:text-app-text',
                (disabled || isOff) && 'cursor-not-allowed opacity-40'
              )}
            >
              {o.value === 'auto_appointment' ? 'Auto appt' : o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
