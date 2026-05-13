import { api } from '../lib/api.js';

export const ORDER_LIFECYCLE_TYPES = ['order_matched', 'order_completed', 'contract_approved'] as const;
export type OrderLifecycleNotificationType = (typeof ORDER_LIFECYCLE_TYPES)[number];

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
  category?: string;
}

export function isOrderLifecycleType(t: string): t is OrderLifecycleNotificationType {
  return (ORDER_LIFECYCLE_TYPES as readonly string[]).includes(t);
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const list = await api.get<AppNotification[]>('/api/notifications');
  return Array.isArray(list) ? list : [];
}

export async function getUnreadCount(): Promise<number> {
  const list = await fetchNotifications();
  return list.filter((n) => !n.read).length;
}
