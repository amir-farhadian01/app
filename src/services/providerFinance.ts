import { api } from '../lib/api.js';

export type ProviderFinanceLedgerRow = {
  kind: 'transaction' | 'order';
  id: string;
  at: string;
  label: string;
  detail: string | null;
  amount: number;
  currency: string | null;
  flow: 'credit' | 'debit' | 'neutral';
};

export type ProviderFinanceInvoiceRow = {
  orderId: string;
  customerLabel: string;
  serviceName: string;
  amount: number;
  currency: string;
  orderStatus: string;
  contractVersionStatus: string | null;
  updatedAt: string;
};

export type ProviderWorkspaceFinanceResponse = {
  workspaceId: string;
  disclaimers: {
    paymentGatewayConnected: false;
    payoutsProcessed: false;
    figuresAreFromOrdersAndInternalRecords: true;
  };
  summary: {
    estimatedEarnings: number;
    pendingAmount: number;
    completedJobCount: number;
    disputedJobCount: number;
    displayCurrency: string;
    mixedCurrency: boolean;
  };
  ledger: ProviderFinanceLedgerRow[];
  payoutHistory: {
    available: false;
    items: [];
    placeholderMessage: string;
  };
  invoices: ProviderFinanceInvoiceRow[];
};

export async function fetchWorkspaceFinance(
  workspaceId: string,
): Promise<ProviderWorkspaceFinanceResponse> {
  return api.get<ProviderWorkspaceFinanceResponse>(`/api/workspaces/${workspaceId}/finance`);
}
