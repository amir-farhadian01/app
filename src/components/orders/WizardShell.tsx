import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';
import { WizardStepper } from './WizardStepper';
import { cn } from '../../lib/utils';

export type WizardShellProps = {
  title: string;
  step: number;
  totalSteps?: number;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
  savedIndicator?: boolean;
  /** Optional row under the title (e.g. marketing context chips). */
  headerSlot?: ReactNode;
};

export function WizardShell({
  title,
  step,
  totalSteps = 6,
  onBack,
  children,
  footer,
  savedIndicator,
  headerSlot,
}: WizardShellProps) {
  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col max-w-lg mx-auto w-full text-[15px]">
      <header className="sticky top-0 z-20 bg-app-bg/95 backdrop-blur border-b border-app-border pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border border-app-border bg-app-card text-app-text"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-app-text truncate">{title}</h1>
            {savedIndicator ? (
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-opacity">
                Saved ✓
              </p>
            ) : null}
          </div>
        </div>
        {headerSlot ? <div className="mb-3 space-y-2">{headerSlot}</div> : null}
        <WizardStepper current={step} total={totalSteps} />
      </header>

      <main className="flex-1 py-6 space-y-6">{children}</main>

      {footer ? (
        <footer
          className={cn(
            'sticky bottom-0 z-20 -mx-4 px-4 py-4 mt-auto bg-app-bg/95 backdrop-blur border-t border-app-border sm:static sm:border-0 sm:bg-transparent sm:px-0',
          )}
        >
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
