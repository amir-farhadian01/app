import { useMemo, useState } from 'react';
import type { OrderChatMessage } from '../../../services/orderChat';

type Props = {
  message: OrderChatMessage;
  isOwn: boolean;
  preferredLanguage: string;
  translatedOverride?: string;
};

function moderationLabel(status: OrderChatMessage['moderationStatus']): string | null {
  if (status === 'masked') return 'PII masked';
  if (status === 'flagged') return 'Flagged';
  if (status === 'blocked') return 'Blocked';
  return null;
}

export function MessageBubble({ message, isOwn, preferredLanguage, translatedOverride }: Props) {
  const [showTranslated, setShowTranslated] = useState(true);
  const moderation = moderationLabel(message.moderationStatus);
  const translatedText = translatedOverride ?? message.translatedText;
  const hasTranslated = Boolean(translatedText && translatedText.trim());
  const text = hasTranslated && showTranslated ? translatedText : message.displayText;
  const canToggle = hasTranslated && (message.sourceLang ?? '').toLowerCase() !== preferredLanguage.toLowerCase();
  const timeLabel = useMemo(() => new Date(message.createdAt).toLocaleTimeString(), [message.createdAt]);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
          isOwn
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'border border-app-border bg-app-card text-app-text'
        }`}
      >
        {moderation ? (
          <div className="mb-1 inline-flex rounded-full border border-amber-400/70 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-500/60 dark:bg-amber-900/30 dark:text-amber-200">
            {moderation}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-5">{text}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-[10px] ${isOwn ? 'text-white/70 dark:text-neutral-500' : 'text-neutral-500'}`}>
            {timeLabel}
          </span>
          {canToggle ? (
            <button
              type="button"
              aria-label="Toggle translated message"
              onClick={() => setShowTranslated((v) => !v)}
              className={`text-[10px] font-semibold underline ${
                isOwn ? 'text-white/90 dark:text-neutral-700' : 'text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {showTranslated ? 'Show original' : 'Show translated'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

