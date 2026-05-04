import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import {
  getOrderChatThread,
  sendOrderChatMessage,
  translateOrderChatMessage,
  type OrderChatMessage,
} from '../../../services/orderChat';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { TranslateToggle } from './TranslateToggle';

type Props = {
  orderId: string;
  status: string;
  /** When true, participant may send messages (role-specific rules set by parent). */
  composeEnabled: boolean;
  /** Optional banner (e.g. pre-match customer notice). */
  notice?: string | null;
};

export function OrderChatPanel({ orderId, status, composeEnabled, notice }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<OrderChatMessage[]>([]);
  const [sendBusy, setSendBusy] = useState(false);
  const [blockedWarning, setBlockedWarning] = useState<string | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement | null>(null);
  const myLang = useMemo(() => (navigator.language?.slice(0, 2) || 'en').toLowerCase(), []);

  const shouldLoadThread = !['draft', 'cancelled'].includes(status);

  useEffect(() => {
    if (!shouldLoadThread) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getOrderChatThread(orderId);
        if (cancelled) return;
        setMessages(data.messages);
      } catch {
        if (cancelled) return;
        setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => {
      void getOrderChatThread(orderId)
        .then((data) => {
          if (!cancelled) {
            setMessages(data.messages);
          }
        })
        .catch(() => {
          /* keep last state */
        });
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [shouldLoadThread, orderId]);

  useEffect(() => {
    if (!shouldLoadThread || !autoTranslate) return;
    const incoming = messages.filter((m) => m.senderId !== user?.id);
    for (const msg of incoming) {
      const cacheKey = `${msg.id}:${myLang}`;
      if (translationCache[cacheKey]) continue;
      if ((msg.targetLang ?? '').toLowerCase() === myLang && msg.translatedText) {
        setTranslationCache((prev) => ({ ...prev, [cacheKey]: msg.translatedText as string }));
        continue;
      }
      void translateOrderChatMessage({ orderId, messageId: msg.id, targetLang: myLang })
        .then((res) => {
          setTranslationCache((prev) => ({ ...prev, [cacheKey]: res.translatedText }));
        })
        .catch(() => {
          /* best effort */
        });
    }
  }, [autoTranslate, shouldLoadThread, messages, myLang, orderId, translationCache, user?.id]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  if (!shouldLoadThread) {
    return (
      <section className="rounded-2xl border border-app-border bg-app-card p-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-app-text">Order chat</h3>
        <p className="mt-2 text-sm text-neutral-500">Chat is available after you submit this request.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-app-border bg-app-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wide text-app-text">Order chat</h3>
      </div>
      {notice ? (
        <div className="rounded-xl border border-sky-300/50 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
          {notice}
        </div>
      ) : null}
      <TranslateToggle enabled={autoTranslate} language={myLang} onToggle={setAutoTranslate} />
      <div ref={listRef} className="max-h-[360px] space-y-2 overflow-y-auto rounded-xl border border-app-border bg-app-input/40 p-3">
        {loading ? (
          <p className="text-sm text-neutral-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-neutral-500">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const cacheKey = `${message.id}:${myLang}`;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === user?.id}
                preferredLanguage={myLang}
                translatedOverride={translationCache[cacheKey]}
              />
            );
          })
        )}
      </div>
      <MessageComposer
        defaultLanguage={myLang}
        busy={sendBusy}
        blockedWarning={blockedWarning}
        disabled={!composeEnabled}
        onSend={async ({ text, sourceLang }) => {
          setSendBusy(true);
          setBlockedWarning(null);
          try {
            const created = await sendOrderChatMessage({
              orderId,
              text,
              sourceLang,
              ...(autoTranslate ? { translateTo: myLang } : {}),
            });
            setMessages((prev) => [...prev, created]);
          } catch (err: unknown) {
            const e = err as Error & { status?: number };
            if (e.status === 400) {
              setBlockedWarning(e.message);
            }
          } finally {
            setSendBusy(false);
          }
        }}
      />
    </section>
  );
}
