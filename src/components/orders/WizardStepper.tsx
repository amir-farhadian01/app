import { cn } from '../../lib/utils';

export type WizardStepperProps = {
  current: number;
  total?: number;
  className?: string;
};

export function WizardStepper({ current, total = 6, className }: WizardStepperProps) {
  return (
    <div className={cn('text-center', className)}>
      <p className="text-[13px] font-bold uppercase tracking-widest text-neutral-500">
        Step {current} of {total}
      </p>
      <div className="flex gap-1.5 justify-center mt-3 max-w-xs mx-auto">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < current ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700',
            )}
          />
        ))}
      </div>
    </div>
  );
}
