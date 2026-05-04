import { api } from '../lib/api';

export type AdminPaymentLedgerItem = {
  id: string;
  timestamp: string;
  category: string | null;
  amount: number;
  type: string;
  description: string | null;
  customer: {
    id: string;
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  company: { id: string; name: string } | null;
  order: {
    id: string;
    status: string;
    phase: string | null;
    orderContract: {
      currentVersionId: string | null;
      currentVersion: { status: string; amount: number | null; currency: string | null } | null;
    } | null;
  } | null;
};

export type AdminPaymentLedgerDetail = {
  transaction: {
    id: string;
    timestamp: string;
    category: string | null;
    amount: number;
    type: string;
    description: string | null;
    customer: {
      id: string;
      email: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
    } | null;
    company: { id: string; name: string } | null;
  };
  order: unknown;
  audit: Array<{
    id: string;
    action: string;
    timestamp: string;
    metadata: unknown;
    actor: { id: string; email: string; displayName: string | null } | null;
  }>;
};

export type AdminPaymentRowStatus = 'PENDING' | 'CAPTURED' | 'REFUNDED' | 'FAILED';

export type AdminPaymentListItem = {
  orderId: string;
  customerName: string;
  providerName: string;
  amount: number;
  currency: string;
  status: AdminPaymentRowStatus;
  date: string;
  lastTransactionId: string;
};

export type AdminPaymentsPage = {
  items: AdminPaymentListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminPaymentOrderDetail = {
  orderId: string;
  customerName: string;
  providerName: string;
  serviceName: string;
  currency: string;
  status: AdminPaymentRowStatus;
  breakdown: {
    subtotal: number;
    platformFeePercent: number;
    platformFeeAmount: number;
    providerPayout: number;
  };
  timeline: {
    sessionCreatedAt: string | null;
    capturedAt: string | null;
    settledAt: string | null;
  };
  audit: Array<{
    id: string;
    action: string;
    timestamp: string;
    metadata: unknown;
    actor: { id: string; email: string; displayName: string | null } | null;
  }>;
};

export async function fetchAdminPaymentLedger(orderId?: string): Promise<{ items: AdminPaymentLedgerItem[] }> {
  const q = orderId?.trim() ? `?orderId=${encodeURIComponent(orderId.trim())}` : '';
  return api.get<{ items: AdminPaymentLedgerItem[] }>(`/api/admin/payments/ledger${q}`);
}

export async function fetchAdminPaymentLedgerDetail(transactionId: string): Promise<AdminPaymentLedgerDetail> {
  return api.get<AdminPaymentLedgerDetail>(`/api/admin/payments/ledger/${encodeURIComponent(transactionId)}`);
}

export async function fetchAdminPaymentsPage(page: number, pageSize: number): Promise<AdminPaymentsPage> {
  const p = Math.max(1, page);
  const ps = Math.min(100, Math.max(1, pageSize));
  try {
    return await api.get<AdminPaymentsPage>(`/api/admin/payments?page=${p}&pageSize=${ps}`);
  } catch (e: unknown) {
    const st = (e as Error & { status?: number }).status;
    if (st === 404) {
      return { items: [], page: 1, pageSize: ps, total: 0 };
    }
    throw e;
  }
}

export async function fetchAdminPaymentOrderDetail(orderId: string): Promise<AdminPaymentOrderDetail> {
  return api.get<AdminPaymentOrderDetail>(`/api/admin/payments/orders/${encodeURIComponent(orderId)}`);
}
