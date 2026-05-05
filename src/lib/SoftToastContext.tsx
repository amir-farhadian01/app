import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

export type SoftToastOptions = {
  actionHref?: string;
  actionLabel?: string;
  durationMs?: number;
};

type ToastState = { message: string; actionHref?: string; actionLabel?: string; key: number } | null;

type Ctx = { showToast: (message: string, options?: SoftToastOptions) => void };
const SoftToastCtx = createContext<Ctx | null>(null);

export function SoftToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const seqRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, options?: SoftToastOptions) => {
      clearHideTimer();
      seqRef.current += 1;
      const key = seqRef.current;
      const actionHref = options?.actionHref?.trim() || undefined;
      const actionLabel = options?.actionLabel?.trim() || 'Open';
      setToast({
        message,
        actionHref,
        actionLabel: actionHref ? actionLabel : undefined,
        key,
      });
      const duration =
        options?.durationMs ?? (actionHref ? 8000 : 3000);
      hideTimerRef.current = window.setTimeout(() => {
        setToast((t) => (t?.key === key ? null : t));
        hideTimerRef.current = null;
      }, duration);
    },
    [clearHideTimer],
  );

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const interactive = Boolean(toast?.actionHref);

  return (
    <SoftToastCtx.Provider value={value}>
      {children}
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.1 }}
            className={
              interactive
                ? 'fixed bottom-6 left-1/2 z-[500] flex max-w-[min(92vw,28rem)] -translate-x-1/2 flex-col items-stretch gap-2 rounded-2xl border border-app-border bg-app-card px-4 py-3 text-sm text-app-text shadow-lg sm:flex-row sm:items-center sm:gap-3'
                : 'pointer-events-none fixed bottom-6 left-1/2 z-[500] max-w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-app-border bg-app-card px-4 py-2.5 text-sm font-medium text-app-text shadow-lg'
            }
            role="status"
          >
            <p className="whitespace-pre-line text-left font-medium leading-snug">{toast.message}</p>
            {toast.actionHref ? (
              <Link
                to={toast.actionHref}
                className="shrink-0 rounded-xl bg-neutral-900 px-3 py-2 text-center text-xs font-black uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                onClick={() => {
                  clearHideTimer();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </Link>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </SoftToastCtx.Provider>
  );
}

export function useSoftToast() {
  const c = useContext(SoftToastCtx);
  if (!c) {
    return { showToast: (_message: string, _options?: SoftToastOptions) => {} };
  }
  return c;
}
