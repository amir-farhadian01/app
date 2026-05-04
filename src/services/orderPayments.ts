import { api } from '../lib/api';

export type OrderPaymentStatus = {
  orderId: string;
  orderStatus: string;
  approvedContractVersionId: string | null;
  payment: {
    id: string;
    amount: number;
    status: 'pending' | 'paid' | string;
    kind: 'session' | 'capture' | string;
    timestamp: string;
  } | null;
};

export type OrderPaymentSessionResponse = {
  session: {
    id: string;
    status: 'pending' | 'paid' | string;
    paymentUrl: string;
    amount: number;
    currency: string;
    createdAt: string;
  };
  idempotent?: boolean;
};

export async function fetchOrderPaymentStatus(orderId: string): Promise<OrderPaymentStatus> {
  return api.get<OrderPaymentStatus>(`/api/orders/${encodeURIComponent(orderId)}/payments/status`);
}

export async function createOrderPaymentSession(orderId: string): Promise<OrderPaymentSessionResponse> {
  return api.post<OrderPaymentSessionResponse>(`/api/orders/${encodeURIComponent(orderId)}/payments/session`, {});
}
