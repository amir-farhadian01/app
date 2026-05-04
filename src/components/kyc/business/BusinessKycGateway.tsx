import React from 'react';
import { CheckCircle2, Circle, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

const focusRing = 'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

/** Minimum distinct service categories required before Business KYC (schema has no company.categoryTags yet). */
export const MIN_BUSINESS_KYC_CATEGORIES = 1;

type Props = {
  companyName: string;
  categoryTags: string[];
  onBegin: () => void;
};

export function BusinessKycGateway({ companyName, categoryTags, onBegin }: Props) {
  const hasCompany = true;
  const categoriesOk = categoryTags.length >= MIN_BUSINESS_KYC_CATEGORIES;
  const ready = hasCompany && categoriesOk;

  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-6 space-y-6 max-w-2xl">
      <div className="flex items-start gap-3">
        <Building2 className="w-8 h-8 text-app-text shrink-0" aria-hidden />
        <div>
          <h2 className="text-lg font-black text-app-text">Business verification</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Complete the form for <strong className="text-app-text">{companyName}</strong> using the schema published by Neighborly admins.
          </p>
        </div>
      </div>

      <ul className="space-y-3 text-sm">
        <li className="flex items-center gap-2">
          {hasCompany ? <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden /> : <Circle className="w-5 h-5 text-neutral-400" aria-hidden />}
          <span className="text-app-text">Company exists and you have access</span>
        </li>
        <li className="flex items-center gap-2">
          {categoriesOk ? <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden /> : <Circle className="w-5 h-5 text-amber-500" aria-hidden />}
          <span className="text-app-text">
            At least {MIN_BUSINESS_KYC_CATEGORIES} service categor{MIN_BUSINESS_KYC_CATEGORIES === 1 ? 'y' : 'ies'} on your listings
            {categoriesOk ? ` (${categoryTags.join(', ')})` : ''}
          </span>
        </li>
      </ul>

      {!categoriesOk ? (
        <p className="text-xs text-amber-700 dark:text-amber-300 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          Add categories to your services first (owner’s services drive category tags until{' '}
          <code className="text-[10px]">Company.categoryTags</code> exists — see{' '}
          <span className="font-mono text-[10px]">routes/kycUser.ts</span> TODO).
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!ready}
          onClick={onBegin}
          className={cn(
            'px-6 py-3 rounded-2xl font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 disabled:opacity-40',
            focusRing,
          )}
          aria-label="Begin business KYC form"
        >
          Begin
        </button>
        <Link
          to="/dashboard?tab=overview"
          className={cn('px-6 py-3 rounded-2xl font-bold border border-app-border text-app-text', focusRing)}
          aria-label="Back to company overview"
        >
          Company overview
        </Link>
      </div>
    </div>
  );
}
