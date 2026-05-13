import React from 'react';
import { cn } from '../../../lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number | null | undefined;
  tone?: string;
  loading?: boolean;
  /** Shown as tooltip when value is unavailable */
  unavailableHint?: string;
}

export function KpiCard({ label, value, tone = 'text-white', loading = false, unavailableHint }: KpiCardProps) {
  const display = value == null || value === '' ? '—' : String(value);
  const isUnavailable = display === '—';

  return (
    <div className="rounded-[0.9rem] border border-[#2a2f4a] bg-[#1e2235] p-4">
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-20 animate-pulse rounded-md bg-[#2a2f4a]" />
          <div className="h-3 w-28 animate-pulse rounded-md bg-[#2a2f4a]" />
        </div>
      ) : (
        <>
          <p
            className={cn('text-2xl font-black tracking-tight', tone)}
            title={isUnavailable && unavailableHint ? unavailableHint : undefined}
          >
            {display}
          </p>
          <p className="mt-2 text-[11px] font-semibold text-[#4a4f70]">{label}</p>
        </>
      )}
    </div>
  );
}
