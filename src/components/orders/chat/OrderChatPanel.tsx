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
  enabled: boolean;
  matchedProviderId: string | null | undefined;
  status: string;
};

function canUseChat(status: string, matchedProviderId: string | null | undefined): boolean {
  if (!matchedProviderId) return false;
  return ['matched', 'contracted', 'paid', 'in_progress', 'completed'].includes(status);
}

export function OrderChatPanel({ orderId, enabled, matchedProviderId, status }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<OrderChatMessage[]>([]);
  const [sendBusy, setSendBusy] = useState(false);
  const [blockedWarning, setBlockedWarning] = useState<string | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement | null>(null);
  const myLang = useMemo(() => (navigator.language?.slice(0, 2) || 'en').toLowerCase(), []);
  const chatEnabled = enabled && canUseChat(status, matchedProviderId);

  useEffect(() => {
    if (!chatEnabled) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getOrderChatThread(orderId);
        if (cancelled) return;
        setMessages(data.messages);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => {
      void getOrderChatThread(orderId)
        .then((data) => {
          if (!cancelled) setMessages(data.messages);
        })
        .catch(() => {
          /* keep last state */
        });
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [chatEnabled, orderId]);

  useEffect(() => {
    if (!chatEnabled || !autoTranslate) return;
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
  }, [autoTranslate, chatEnabled, messages, myLang, orderId, translationCache, user?.id]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  if (!chatEnabled) {
    return (
      <section className="rounded-2xl border border-app-border bg-app-card p-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-app-text">Order chat</h3>
        <p className="mt-2 text-sm text-neutral-500">Chat unlocks after provider selection.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-app-border bg-app-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wide text-app-text">Order chat</h3>
      </div>
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

