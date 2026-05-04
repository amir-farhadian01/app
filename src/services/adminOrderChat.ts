import { api } from '../lib/api';

export type AdminOrderChatThreadMeta = {
  id: string;
  orderId: string;
  customerId: string;
  providerId: string;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderChatMessageRow = {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: string;
  type: string;
  originalText: string;
  displayText: string;
  moderationStatus: string;
  createdAt: string;
  editedAt: string | null;
};

export type AdminOrderChatThreadResponse = {
  thread: AdminOrderChatThreadMeta;
  messages: AdminOrderChatMessageRow[];
};

export async function fetchAdminOrderChatThread(orderId: string): Promise<AdminOrderChatThreadResponse> {
  return api.get<AdminOrderChatThreadResponse>(
    `/api/admin/chat/thread/${encodeURIComponent(orderId)}`,
  );
}
