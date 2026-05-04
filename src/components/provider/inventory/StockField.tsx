import React from 'react';
import { cn } from '../../../lib/utils';

type Props = {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
};

/** Optional stock quantity with unit pill (read-only unit from product). */
export function StockField({ value, onChange, unit, disabled, id, 'aria-label': ariaLabel }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        id={id}
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        disabled={disabled}
        aria-label={ariaLabel ?? 'Stock quantity'}
        className={cn(
          'min-w-0 flex-1 rounded-lg border border-app-border bg-app-input px-2 py-1.5 text-sm text-app-text tabular-nums',
          disabled && 'opacity-60',
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
      <span
        className="shrink-0 rounded-md bg-neutral-200/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
        title="Unit of measure"
      >
        {unit || '—'}
      </span>
    </div>
  );
}
