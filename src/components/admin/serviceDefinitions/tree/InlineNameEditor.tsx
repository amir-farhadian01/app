import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../lib/utils.js';

type Props = {
  value: string;
  className?: string;
  onSave: (v: string) => void;
  onCancel: () => void;
};

/**
 * Double-click to rename: Enter saves, Esc cancels. Caller owns closing edit mode.
 */
export function InlineNameEditor({ value, className, onSave, onCancel }: Props) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setV(value);
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      className={cn(
        'min-w-0 flex-1 rounded border border-app-border bg-app-bg px-2 py-0.5 text-sm font-bold text-app-text',
        'focus:outline-none focus:ring-2 focus:ring-app-text/20',
        className
      )}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const t = v.trim();
          if (t) onSave(t);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => {
        const t = v.trim();
        if (t && t !== value) onSave(t);
        else onCancel();
      }}
    />
  );
}
