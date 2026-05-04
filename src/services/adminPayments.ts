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

export async function fetchAdminPaymentLedger(orderId?: string): Promise<{ items: AdminPaymentLedgerItem[] }> {
  const q = orderId?.trim() ? `?orderId=${encodeURIComponent(orderId.trim())}` : '';
  return api.get<{ items: AdminPaymentLedgerItem[] }>(`/api/admin/payments/ledger${q}`);
}

export async function fetchAdminPaymentLedgerDetail(transactionId: string): Promise<AdminPaymentLedgerDetail> {
  return api.get<AdminPaymentLedgerDetail>(`/api/admin/payments/ledger/${encodeURIComponent(transactionId)}`);
}
