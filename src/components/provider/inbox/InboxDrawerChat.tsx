import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { useSoftToast } from '../../../lib/SoftToastContext';
import {
  getOrderChatThread,
  sendOrderChatMessage,
  type OrderChatMessage,
} from '../../../services/orderChat';
import { resolveMediaUrl } from '../../../lib/resolveMediaUrl';
import { MessageBubble } from '../../orders/chat/MessageBubble';
import { MessageComposer } from '../../orders/chat/MessageComposer';
import type { ProviderInboxItem } from '../../../services/providerInbox';
import { cn } from '../../../lib/utils';

type Props = {
  orderId: string;
  customer: ProviderInboxItem['customer'];
};

/**
 * Polls the order thread while the drawer chat is mounted. The API persists messages
 * and publishes `chat.message.created` on NATS; the browser syncs via this lightweight poll.
 */
const POLL_MS = 2000;

function senderLabel(
  message: OrderChatMessage,
  opts: { userId: string | undefined; customer: ProviderInboxItem['customer'] },
): string {
  if (opts.userId && message.senderId === opts.userId) return 'You';
  if (message.senderId === opts.customer.id) {
    const n = [opts.customer.firstName, opts.customer.lastName].filter(Boolean).join(' ');
    return n || opts.customer.displayName || 'Customer';
  }
  if (message.senderRole === 'admin') return 'Support';
  return message.senderRole === 'customer' ? 'Customer' : 'Provider';
}

function initialsFor(message: OrderChatMessage, customer: ProviderInboxItem['customer'], userId: string | undefined): string {
  if (userId && message.senderId === userId) return 'Y';
  if (message.senderId === customer.id) {
    const n = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.displayName || 'C';
    return n.slice(0, 1).toUpperCase();
  }
  return message.senderRole === 'admin' ? 'S' : 'P';
}

function showAiTranslationBadge(message: OrderChatMessage, preferredLanguage: string): boolean {
  const t = message.translatedText?.trim();
  if (!t) return false;
  const src = (message.sourceLang ?? '').toLowerCase();
  const pref = preferredLanguage.toLowerCase();
  return src.length > 0 && src !== pref;
}

export function InboxDrawerChat({ orderId, customer }: Props) {
  const { user } = useAuth();
  const { showToast } = useSoftToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<OrderChatMessage[]>([]);
  const [sendBusy, setSendBusy] = useState(false);
  const [blockedWarning, setBlockedWarning] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const preferredLanguage = useMemo(() => (navigator.language?.slice(0, 2) || 'en').toLowerCase(), []);

  const hasFlagged = useMemo(() => messages.some((m) => m.moderationStatus === 'flagged'), [messages]);

  const refresh = useMemo(
    () => async () => {
      try {
        const data = await getOrderChatThread(orderId);
        setMessages(data.messages);
        setReadOnly(Boolean(data.readOnly));
      } catch (e: unknown) {
        const err = e as Error & { status?: number };
        if (err.status === 403 || err.status === 400) {
          setMessages([]);
          setReadOnly(true);
        }
      }
    },
    [orderId],
  );

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    }
    void boot();
    const id = window.setInterval(() => {
      void refresh().catch(() => {
        /* keep last messages */
      });
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refresh]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <section className="flex min-h-[280px] flex-1 flex-col gap-3 rounded-2xl border border-app-border bg-app-input/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Chat</h3>
        {readOnly ? (
          <span className="rounded-full border border-amber-400/60 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-950 dark:bg-amber-900/30 dark:text-amber-100">
            Read-only until matched
          </span>
        ) : null}
      </div>
      {hasFlagged ? (
        <div className="rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-50">
          Message under review — our safety checks flagged content in this thread. You can keep messaging; a moderator may
          follow up.
        </div>
      ) : null}
      <div
        ref={listRef}
        className="max-h-[320px] min-h-[120px] flex-1 space-y-3 overflow-y-auto rounded-xl border border-app-border bg-app-card/80 p-3"
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {readOnly
              ? 'No messages in this thread yet. Sending is disabled until your workspace is the matched provider.'
              : 'No messages yet. Start the conversation with your customer.'}
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = Boolean(user?.id && message.senderId === user.id);
            const label = senderLabel(message, { userId: user?.id, customer });
            const avatarUrl =
              isOwn && user?.avatarUrl
                ? user.avatarUrl
                : !isOwn && message.senderId === customer.id
                  ? customer.avatarUrl
                  : null;
            return (
              <div key={message.id} className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-black',
                    isOwn
                      ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                      : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100',
                  )}
                >
                  {avatarUrl ? (
                    <img src={resolveMediaUrl(avatarUrl)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsFor(message, customer, user?.id)
                  )}
                </div>
                <div className={cn('min-w-0 max-w-[88%]', isOwn && 'flex flex-col items-end')}>
                  <div className={cn('mb-0.5 flex flex-wrap items-center gap-2', isOwn && 'justify-end')}>
                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">{label}</span>
                    {showAiTranslationBadge(message, preferredLanguage) ? (
                      <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-900 dark:border-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-100">
                        AI translated
                      </span>
                    ) : null}
                  </div>
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    preferredLanguage={preferredLanguage}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      <MessageComposer
        disabled={readOnly}
        defaultLanguage={preferredLanguage}
        busy={sendBusy}
        blockedWarning={blockedWarning}
        onSend={async ({ text, sourceLang }) => {
          if (readOnly) return;
          setSendBusy(true);
          setBlockedWarning(null);
          try {
            const created = await sendOrderChatMessage({ orderId, text, sourceLang });
            setMessages((prev) => {
              if (prev.some((m) => m.id === created.id)) return prev;
              return [...prev, created];
            });
          } catch (err: unknown) {
            const e = err as Error & { status?: number; message?: string };
            showToast(e.message || 'Could not send message');
            if (e.status === 400) {
              setBlockedWarning(e.message || null);
            }
          } finally {
            setSendBusy(false);
          }
        }}
      />
    </section>
  );
}
