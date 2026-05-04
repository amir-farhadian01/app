import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import { useWorkspace } from '../../../lib/WorkspaceContext';
import { useSoftToast } from '../../../lib/SoftToastContext';
import {
  accept,
  acknowledge,
  decline,
  getInboxItem,
  listInbox,
  submitLostFeedback,
  type LostFeedbackReason,
  type InboxStatus,
  type ProviderInboxItem,
} from '../../../services/providerInbox';
import { InboxList } from './InboxList';
import { InboxDetailDrawer } from './InboxDetailDrawer';
import { AcknowledgeModal } from './AcknowledgeModal';
import { DeclineModal, type DeclinePayload } from './DeclineModal';

type SegmentId = 'awaiting' | 'accepted' | 'declined' | 'lost';

function statusForSegment(seg: SegmentId): InboxStatus[] {
  if (seg === 'awaiting') return ['invited', 'matched'];
  if (seg === 'accepted') return ['accepted'];
  if (seg === 'declined') return ['declined', 'expired'];
  return ['superseded'];
}

export function ProviderInboxSection() {
  const { activeWorkspaceId } = useWorkspace();
  const { showToast } = useSoftToast();
  const [segment, setSegment] = useState<SegmentId>('awaiting');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [items, setItems] = useState<ProviderInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProviderInboxItem | null>(null);
  const [ackOpen, setAckOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [target, setTarget] = useState<ProviderInboxItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [segmentCounts, setSegmentCounts] = useState<Record<SegmentId, number>>({
    awaiting: 0,
    accepted: 0,
    declined: 0,
    lost: 0,
  });
  const [lostFeedbackSubmitting, setLostFeedbackSubmitting] = useState(false);
  const [lostFeedbackDoneIds, setLostFeedbackDoneIds] = useState<Record<string, boolean>>({});

  const statuses = useMemo(() => statusForSegment(segment), [segment]);

  const patchItem = useCallback((attemptId: string, mutate: (x: ProviderInboxItem) => ProviderInboxItem) => {
    setItems((prev) => prev.map((x) => (x.id === attemptId ? mutate(x) : x)));
    setDetail((prev) => (prev && prev.id === attemptId ? mutate(prev) : prev));
  }, []);

  const loadCounts = useCallback(async () => {
    if (!activeWorkspaceId) return;
    const segments: SegmentId[] = ['awaiting', 'accepted', 'declined', 'lost'];
    const totals = await Promise.all(
      segments.map(async (seg) => {
        const res = await listInbox(activeWorkspaceId, statusForSegment(seg), 1, 1);
        return [seg, res.total] as const;
      }),
    );
    setSegmentCounts({
      awaiting: totals.find(([k]) => k === 'awaiting')?.[1] ?? 0,
      accepted: totals.find(([k]) => k === 'accepted')?.[1] ?? 0,
      declined: totals.find(([k]) => k === 'declined')?.[1] ?? 0,
      lost: totals.find(([k]) => k === 'lost')?.[1] ?? 0,
    });
  }, [activeWorkspaceId]);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    try {
      const res = await listInbox(activeWorkspaceId, statuses, page, pageSize);
      setItems(res.items);
      await loadCounts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, statuses, page, pageSize, showToast, loadCounts]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openId || !activeWorkspaceId) {
      setDetail(null);
      return;
    }
    void getInboxItem(activeWorkspaceId, openId)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [openId, activeWorkspaceId]);

  const openDetail = (row: ProviderInboxItem) => {
    setOpenId(row.id);
    setDetail(row);
  };

  const runAcknowledge = async () => {
    if (!activeWorkspaceId || !target) return;
    const prev = detail && detail.id === target.id ? detail : items.find((x) => x.id === target.id) ?? null;
    const optimisticStatus: InboxStatus = target.status === 'invited' ? 'accepted' : 'accepted';
    patchItem(target.id, (x) => ({ ...x, status: optimisticStatus, respondedAt: new Date().toISOString() }));
    setBusy(true);
    try {
      if (target.status === 'invited') {
        const updated = await accept(activeWorkspaceId, target.id);
        patchItem(target.id, () => updated);
        showToast("Accepted. We'll notify you when the customer decides.");
      } else {
        await acknowledge(activeWorkspaceId, target.id);
        const updated = await getInboxItem(activeWorkspaceId, target.id);
        patchItem(target.id, () => updated);
        showToast('Acknowledged. This order is now in your active jobs.');
      }
      setAckOpen(false);
      setTarget(null);
      await load();
      if (openId && openId !== target.id) {
        const d = await getInboxItem(activeWorkspaceId, openId);
        setDetail(d);
      }
    } catch (e) {
      if (prev) patchItem(target.id, () => prev);
      showToast(e instanceof Error ? e.message : 'Acknowledge failed');
    } finally {
      setBusy(false);
    }
  };

  const mapDeclineToLost = (reasons: DeclinePayload['reasons']): LostFeedbackReason[] => {
    const out: LostFeedbackReason[] = [];
    if (reasons.includes('price')) out.push('price_too_high');
    if (reasons.includes('response')) out.push('response_too_slow');
    if (reasons.includes('quality')) out.push('quality_concern');
    if (reasons.includes('schedule')) out.push('schedule_mismatch');
    if (reasons.includes('distance')) out.push('distance');
    if (reasons.includes('other')) out.push('other');
    return out;
  };

  const runDecline = async (payload: DeclinePayload) => {
    if (!activeWorkspaceId || !target) return;
    const prev = detail && detail.id === target.id ? detail : items.find((x) => x.id === target.id) ?? null;
    patchItem(target.id, (x) => ({ ...x, status: 'declined', declineReason: payload.reason, respondedAt: new Date().toISOString() }));
    setBusy(true);
    try {
      const result = await decline(activeWorkspaceId, target.id, payload.reason);
      const reasons = mapDeclineToLost(payload.reasons);
      if (reasons.length > 0) {
        try {
          await submitLostFeedback(activeWorkspaceId, target.id, {
            reasons,
            ...(payload.otherText ? { otherText: payload.otherText } : {}),
            providerComment: payload.reason,
          });
        } catch {
          // non-blocking hidden feedback
        }
      }
      setDeclineOpen(false);
      setTarget(null);
      showToast(
        result.reMatched
          ? 'Declined. Re-routing to next provider.'
          : 'Declined. No more providers available - admin notified.',
      );
      await load();
      if (openId && result.newAttemptId) {
        setOpenId(result.newAttemptId);
      } else if (openId) {
        const d = await getInboxItem(activeWorkspaceId, openId);
        setDetail(d);
      }
    } catch (e) {
      if (prev) patchItem(target.id, () => prev);
      showToast(e instanceof Error ? e.message : 'Decline failed');
    } finally {
      setBusy(false);
    }
  };

  const submitLost = async (
    attemptId: string,
    body: { reasons: LostFeedbackReason[]; otherText?: string; providerComment?: string },
  ) => {
    if (!activeWorkspaceId) return;
    setLostFeedbackSubmitting(true);
    try {
      const updated = await submitLostFeedback(activeWorkspaceId, attemptId, body);
      patchItem(attemptId, () => updated);
      setLostFeedbackDoneIds((prev) => ({ ...prev, [attemptId]: true }));
      showToast('Thanks — your feedback helps us match you better next time.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to submit feedback');
    } finally {
      setLostFeedbackSubmitting(false);
    }
  };

  if (!activeWorkspaceId) {
    return <p className="rounded-2xl border border-app-border bg-app-card p-6 text-sm text-neutral-500">Select a workspace to view Inbox.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-app-border bg-app-card p-4">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-app-text" />
          <h2 className="text-lg font-black text-app-text">Provider Inbox</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ['awaiting', `Awaiting (${segmentCounts.awaiting})`],
              ['accepted', 'Acknowledged'],
              ['declined', 'Declined'],
              ['lost', `Lost (${segmentCounts.lost})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`min-h-[42px] rounded-xl px-3 text-sm font-bold ${segment === id ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'border border-app-border text-app-text'}`}
              onClick={() => {
                setSegment(id);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <InboxList
        rows={items}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onOpen={openDetail}
        onAcknowledge={(row) => {
          setTarget(row);
          setAckOpen(true);
        }}
        onDecline={(row) => {
          setTarget(row);
          setDeclineOpen(true);
        }}
      />

      <InboxDetailDrawer
        open={openId != null}
        item={detail}
        onClose={() => {
          setOpenId(null);
          setDetail(null);
        }}
        onAcknowledge={(row) => {
          setTarget(row);
          setAckOpen(true);
        }}
        onDecline={(row) => {
          setTarget(row);
          setDeclineOpen(true);
        }}
        lostFeedbackSubmitting={lostFeedbackSubmitting}
        lostFeedbackDone={detail ? Boolean(lostFeedbackDoneIds[detail.id]) : false}
        onSubmitLostFeedback={(attemptId, body) => void submitLost(attemptId, body)}
        onMaybeLaterLostFeedback={(attemptId) =>
          setLostFeedbackDoneIds((prev) => ({ ...prev, [attemptId]: false }))
        }
      />

      <AcknowledgeModal
        open={ackOpen}
        busy={busy}
        onClose={() => setAckOpen(false)}
        onConfirm={() => void runAcknowledge()}
        title={
          target?.status === 'invited'
            ? 'Accept this invitation?'
            : 'Take this job?'
        }
        message={
          target?.status === 'invited'
            ? 'By accepting, you commit to this customer if they choose you. You may decline later if your situation changes, but it will affect your response score.'
            : 'Acknowledge and move this order to your active jobs.'
        }
        confirmLabel={
          target?.status === 'invited' ? 'Accept invitation' : 'Acknowledge & take this job'
        }
      />
      <DeclineModal
        open={declineOpen}
        busy={busy}
        onClose={() => setDeclineOpen(false)}
        onConfirm={(payload) => void runDecline(payload)}
      />
    </div>
  );
}
