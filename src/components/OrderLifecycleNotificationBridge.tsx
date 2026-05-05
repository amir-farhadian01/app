import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext.js';
import { useSoftToast } from '../lib/SoftToastContext.js';
import {
  fetchNotifications,
  isOrderLifecycleType,
  type AppNotification,
} from '../services/notifications.js';

const POLL_MS = 25_000;

function toastLine(n: AppNotification): string {
  const msg = n.message?.trim() || '';
  if (msg.length <= 140) return `${n.title}\n${msg}`.trim();
  return `${n.title}\n${msg.slice(0, 137)}…`;
}

/**
 * Polls persisted notifications (NATS → DB) for customers and surfaces new
 * order/contract lifecycle rows via {@link useSoftToast} without adding a second channel.
 */
export function OrderLifecycleNotificationBridge() {
  const { user } = useAuth();
  const { showToast } = useSoftToast();
  const seededRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    seededRef.current = false;
    knownIdsRef.current = new Set();
  }, [user?.id]);

  const poll = useCallback(async () => {
    if (!user?.id || user.role !== 'customer') return;
    try {
      const list = await fetchNotifications();
      if (!seededRef.current) {
        for (const n of list) knownIdsRef.current.add(n.id);
        seededRef.current = true;
        return;
      }
      const newLifecycle = list.filter(
        (n) => isOrderLifecycleType(n.type) && !knownIdsRef.current.has(n.id),
      );
      for (const n of newLifecycle) knownIdsRef.current.add(n.id);
      newLifecycle.forEach((n, i) => {
        window.setTimeout(() => {
          const href = n.link?.trim() || undefined;
          showToast(toastLine(n), {
            actionHref: href,
            actionLabel: href ? 'View order' : undefined,
            durationMs: href ? 9000 : 6000,
          });
        }, i * 450);
      });
    } catch {
      /* optional: NATS/DB may be unavailable */
    }
  }, [user?.id, user?.role, showToast]);

  useEffect(() => {
    if (!user?.id || user.role !== 'customer') return;
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    const onResume = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, [user?.id, user?.role, poll]);

  return null;
}
