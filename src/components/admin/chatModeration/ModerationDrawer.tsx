import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import type { ChatFlagRow } from '../../../services/adminChatModeration.js';
import {
  addChatFlagInternalNote,
  escalateChatFlag,
  reviewChatFlag,
} from '../../../services/adminChatModeration.js';

type ModerationDrawerProps = {
  row: ChatFlagRow | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (row: ChatFlagRow) => void;
};

function formatReasons(raw: unknown): string {
  if (raw == null) return '—';
  if (Array.isArray(raw)) return raw.map(String).join('; ');
  if (typeof raw === 'object') return JSON.stringify(raw, null, 2);
  return String(raw);
}

export function ModerationDrawer({ row, open, onClose, onUpdated }: ModerationDrawerProps) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open || !row) return null;

  const meta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const review =
    meta.moderationReview && typeof meta.moderationReview === 'object' && !Array.isArray(meta.moderationReview)
      ? (meta.moderationReview as Record<string, unknown>)
      : {};

  const run = async (fn: () => Promise<ChatFlagRow>) => {
    setBusy(true);
    setErr(null);
    try {
      const next = await fn();
      onUpdated(next);
      setNote('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="mod-drawer-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative h-full w-full max-w-lg overflow-y-auto border-l border-app-border bg-app-card shadow-xl',
          'flex flex-col',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-card px-6 py-4">
          <h2 id="mod-drawer-title" className="text-sm font-black uppercase tracking-widest text-app-text">
            Message detail
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 p-6 text-sm">
          <div className="space-y-1 text-xs text-neutral-500">
            <p>
              <span className="font-bold uppercase tracking-wider text-neutral-400">Order</span>{' '}
              <span className="font-mono text-app-text">{row.thread.orderId}</span>
            </p>
            <p>
              <span className="font-bold uppercase tracking-wider text-neutral-400">Message</span>{' '}
              <span className="font-mono text-app-text">{row.id}</span>
            </p>
          </div>

          <section className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Original</h3>
            <pre className="whitespace-pre-wrap break-words rounded-2xl border border-app-border bg-neutral-50/80 p-4 text-xs dark:bg-neutral-900/50">
              {row.originalText}
            </pre>
          </section>

          <section className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Display (moderated)</h3>
            <pre className="whitespace-pre-wrap break-words rounded-2xl border border-app-border bg-neutral-50/80 p-4 text-xs dark:bg-neutral-900/50">
              {row.displayText}
            </pre>
          </section>

          <section className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Translation</h3>
            <pre className="whitespace-pre-wrap break-words rounded-2xl border border-app-border bg-neutral-50/80 p-4 text-xs dark:bg-neutral-900/50">
              {row.translatedText?.trim()
                ? row.translatedText
                : `— (${row.sourceLang ?? '?'} → ${row.targetLang ?? '?'})`}
            </pre>
          </section>

          <section className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Moderation reasons</h3>
            <pre className="whitespace-pre-wrap break-words rounded-2xl border border-app-border bg-amber-50/50 p-4 text-xs dark:bg-amber-950/20">
              {formatReasons(row.moderationReasons)}
            </pre>
          </section>

          <section className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Review / escalation</h3>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-app-border bg-neutral-50/80 p-4 text-xs dark:bg-neutral-900/50">
              {Object.keys(review).length ? JSON.stringify(review, null, 2) : '—'}
            </pre>
          </section>

          <section className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Full metadata</h3>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-app-border bg-neutral-50/80 p-4 text-[10px] font-mono dark:bg-neutral-900/50">
              {JSON.stringify(row.metadata ?? {}, null, 2)}
            </pre>
          </section>

          <label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Internal note (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-neutral-300"
              placeholder="Visible to admins only"
              aria-label="Internal note"
            />
          </label>

          {err && <p className="text-xs font-medium text-red-600">{err}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => reviewChatFlag(row.id, note.trim() ? { internalNote: note.trim() } : {}))}
              className="rounded-xl bg-app-text px-4 py-3 text-xs font-black uppercase tracking-widest text-app-bg disabled:opacity-50"
            >
              Mark reviewed
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => escalateChatFlag(row.id, note.trim() ? { internalNote: note.trim() } : {}))}
              className="rounded-xl border border-amber-600/40 bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 disabled:opacity-50"
            >
              Escalate to support
            </button>
            <button
              type="button"
              disabled={busy || !note.trim()}
              onClick={() => run(() => addChatFlagInternalNote(row.id, note.trim()))}
              className="rounded-xl border border-app-border px-4 py-3 text-xs font-black uppercase tracking-widest text-app-text disabled:opacity-50"
            >
              Add internal note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
