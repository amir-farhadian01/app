import { api } from '../lib/api';

export type ChatModerationStatus = 'clean' | 'masked' | 'flagged' | 'blocked';

export type ChatFlagThread = {
  id: string;
  orderId: string;
  customerId: string;
  providerId: string;
  order: {
    matchedWorkspaceId: string | null;
    matchedWorkspace: { id: string; name: string } | null;
    matchedPackageId: string | null;
    serviceCatalogId: string | null;
    status: string;
  };
};

export type ChatFlagRow = {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: string;
  type: string;
  originalText: string;
  displayText: string;
  moderationStatus: ChatModerationStatus;
  moderationReasons: unknown;
  sourceLang: string | null;
  targetLang: string | null;
  translatedText: string | null;
  createdAt: string;
  editedAt: string | null;
  metadata: unknown;
  thread: ChatFlagThread;
};

export type ListChatFlagsParams = {
  from?: string;
  to?: string;
  workspaceId?: string;
  providerId?: string;
  customerId?: string;
  participantId?: string;
  senderId?: string;
  status?: ChatModerationStatus[];
  limit?: number;
};

function buildQuery(p: ListChatFlagsParams): string {
  const q = new URLSearchParams();
  if (p.from) q.set('from', p.from);
  if (p.to) q.set('to', p.to);
  if (p.workspaceId?.trim()) q.set('workspaceId', p.workspaceId.trim());
  if (p.providerId?.trim()) q.set('providerId', p.providerId.trim());
  if (p.customerId?.trim()) q.set('customerId', p.customerId.trim());
  if (p.participantId?.trim()) q.set('participantId', p.participantId.trim());
  if (p.senderId?.trim()) q.set('senderId', p.senderId.trim());
  if (p.status?.length) q.set('status', p.status.join(','));
  if (p.limit != null) q.set('limit', String(p.limit));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function listChatFlags(
  params: ListChatFlagsParams,
): Promise<{ items: ChatFlagRow[]; total: number; truncated?: boolean }> {
  return api.get(`/api/admin/chat/flags${buildQuery(params)}`);
}

export async function reviewChatFlag(
  messageId: string,
  body?: { internalNote?: string },
): Promise<ChatFlagRow> {
  return api.post(`/api/admin/chat/flags/${encodeURIComponent(messageId)}/review`, body ?? {});
}

export async function escalateChatFlag(
  messageId: string,
  body?: { internalNote?: string },
): Promise<ChatFlagRow> {
  return api.post(`/api/admin/chat/flags/${encodeURIComponent(messageId)}/escalate`, body ?? {});
}

export async function addChatFlagInternalNote(
  messageId: string,
  internalNote: string,
): Promise<ChatFlagRow> {
  return api.post(`/api/admin/chat/flags/${encodeURIComponent(messageId)}/note`, { internalNote });
}
