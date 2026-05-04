export type ChatModerationStatus = 'clean' | 'masked' | 'blocked' | 'flagged';
export type ChatMessageType = 'text' | 'system';

export type OrderChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: string;
  type: ChatMessageType;
  originalText: string;
  displayText: string;
  moderationStatus: ChatModerationStatus;
  moderationReasons: string[] | null;
  sourceLang: string | null;
  targetLang: string | null;
  translatedText: string | null;
  createdAt: string;
  editedAt: string | null;
};

export type OrderChatThread = {
  id: string;
  orderId: string;
  customerId: string;
  providerId: string;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderChatThreadResponse = {
  thread: OrderChatThread;
  messages: OrderChatMessage[];
  role: 'customer' | 'provider' | 'admin' | 'invited_provider';
  readOnly?: boolean;
};

export function isOrderChatEnabled(input: {
  status: string;
  matchedProviderId: string | null | undefined;
}): boolean {
  if (!input.matchedProviderId) return false;
  return ['matched', 'contracted', 'paid', 'in_progress', 'completed'].includes(input.status);
}

/** Customer can send order-scoped chat messages (read-only in chat tab until matched). */
export function canCustomerComposeOrderChat(status: string): boolean {
  return ['matched', 'contracted', 'paid', 'in_progress', 'completed'].includes(status);
}

type ApiError = Error & { status?: number; body?: unknown };

function headers(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(
      (data as { error?: string })?.error || 'Request failed',
    ) as ApiError;
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data as T;
}

export function getOrderChatThread(orderId: string): Promise<OrderChatThreadResponse> {
  return req<OrderChatThreadResponse>(`/api/orders/${orderId}/chat/thread`, {
    headers: headers(),
  });
}

export function sendOrderChatMessage(input: {
  orderId: string;
  text: string;
  sourceLang?: string;
  translateTo?: string;
}): Promise<OrderChatMessage> {
  return req<OrderChatMessage>(`/api/orders/${input.orderId}/chat/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text: input.text,
      ...(input.sourceLang ? { sourceLang: input.sourceLang } : {}),
      ...(input.translateTo ? { translateTo: input.translateTo } : {}),
    }),
  });
}

export function translateOrderChatMessage(input: {
  orderId: string;
  messageId: string;
  targetLang: string;
}): Promise<{ messageId: string; translatedText: string; detectedSourceLang: string | null; cached: boolean }> {
  return req(`/api/orders/${input.orderId}/chat/messages/${input.messageId}/translate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ targetLang: input.targetLang }),
  });
}

