import { useMemo, useState } from 'react';

type Props = {
  disabled?: boolean;
  busy?: boolean;
  defaultLanguage: string;
  blockedWarning: string | null;
  onSend: (input: { text: string; sourceLang: string }) => Promise<void>;
};

const LANGS = ['en', 'fa', 'fr', 'es', 'de'];

export function MessageComposer({
  disabled = false,
  busy = false,
  defaultLanguage,
  blockedWarning,
  onSend,
}: Props) {
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState(defaultLanguage);
  const canSend = useMemo(() => !disabled && !busy && text.trim().length > 0, [disabled, busy, text]);

  async function submit() {
    if (!canSend) return;
    const payload = { text: text.trim(), sourceLang };
    await onSend(payload);
    setText('');
  }

  return (
    <div className="space-y-2 rounded-2xl border border-app-border bg-app-card p-3">
      {blockedWarning ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          For safety, direct contact sharing isn&apos;t allowed here.
        </div>
      ) : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        aria-label="Chat message"
        placeholder={disabled ? 'Chat is read-only' : 'Write a message...'}
        disabled={disabled || busy}
        className="min-h-[64px] w-full resize-y rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs text-neutral-500">
          Language
          <select
            aria-label="Message language"
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="ml-2 rounded-lg border border-app-border bg-app-input px-2 py-1 text-xs text-app-text"
          >
            {LANGS.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-label="Send message"
          disabled={!canSend}
          onClick={() => {
            void submit();
          }}
          className="min-h-[40px] rounded-xl bg-neutral-900 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {busy ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

