import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type Ctx = { showToast: (message: string) => void };
const SoftToastCtx = createContext<Ctx | null>(null);

export function SoftToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setMsg(message);
    window.setTimeout(() => setMsg(null), 3000);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return (
    <SoftToastCtx.Provider value={value}>
      {children}
      <AnimatePresence>
        {msg ? (
          <motion.div
            key={msg}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none fixed bottom-6 left-1/2 z-[500] -translate-x-1/2 rounded-2xl border border-app-border bg-app-card px-4 py-2.5 text-sm font-medium text-app-text shadow-lg"
            role="status"
          >
            {msg}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </SoftToastCtx.Provider>
  );
}

export function useSoftToast() {
  const c = useContext(SoftToastCtx);
  if (!c) {
    return { showToast: (_: string) => { /* no provider */ } };
  }
  return c;
}
