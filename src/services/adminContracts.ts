import { api } from '../lib/api';

export type AdminContractParty = {
  id: string;
  email: string;
  displayName: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type AdminContractVersionRow = {
  id: string;
  contractId: string;
  versionNumber: number;
  status: string;
  title: string;
  termsMarkdown: string;
  policiesMarkdown: string | null;
  scopeSummary: string | null;
  startDate: string | null;
  endDate: string | null;
  amount: number | null;
  currency: string | null;
  mismatchWarnings: unknown;
  reviewNote: string | null;
  sentById?: string | null;
  sentAt?: string | null;
  sentBy?: AdminContractParty | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminContractEventRow = {
  id: string;
  contractId: string;
  versionId: string | null;
  actorId: string;
  actorRole: string;
  actionType: string;
  note: string | null;
  metadata: unknown;
  createdAt: string;
};

export type AdminContractQueueItem = {
  id: string;
  orderId: string;
  currentVersionId: string | null;
  adminLastReviewAt: string | null;
  adminLastReviewById: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: AdminContractVersionRow | null;
  versions: AdminContractVersionRow[];
  order: {
    id: string;
    status: string;
    phase: string | null;
    matchedWorkspaceId: string | null;
    matchedProviderId: string | null;
    customer: AdminContractParty;
    matchedProvider: AdminContractParty | null;
    matchedWorkspace: { id: string; name: string } | null;
    matchedPackage: {
      id: string;
      name: string;
      finalPrice: number;
      currency: string;
    } | null;
  };
};

export type AdminContractDetail = AdminContractQueueItem & {
  events: AdminContractEventRow[];
};

export type ContractQueueQuery = {
  attention?: boolean;
  workspaceId?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  versionStatus?: string;
};

function buildQueueQueryString(q: ContractQueueQuery): string {
  const p = new URLSearchParams();
  if (q.attention) p.set('attention', '1');
  if (q.workspaceId?.trim()) p.set('workspaceId', q.workspaceId.trim());
  if (q.q?.trim()) p.set('q', q.q.trim());
  if (q.dateFrom?.trim()) p.set('dateFrom', q.dateFrom.trim());
  if (q.dateTo?.trim()) p.set('dateTo', q.dateTo.trim());
  if (q.versionStatus?.trim()) p.set('versionStatus', q.versionStatus.trim());
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function fetchContractQueue(
  query: ContractQueueQuery = {},
): Promise<{ items: AdminContractQueueItem[] }> {
  return api.get<{ items: AdminContractQueueItem[] }>(`/api/admin/contracts/queue${buildQueueQueryString(query)}`);
}

export type AdminContractByOrderRow = {
  id: string;
  orderId: string;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminContractVersionByOrderRow = {
  id: string;
  contractId: string;
  versionNumber: number;
  status: string;
  title: string;
  termsMarkdown: string;
  policiesMarkdown: string | null;
  scopeSummary: string | null;
  startDate: string | null;
  endDate: string | null;
  amount: number | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchAdminContractsByOrderId(orderId: string): Promise<{
  contract: AdminContractByOrderRow | null;
  versions: AdminContractVersionByOrderRow[];
}> {
  const p = new URLSearchParams();
  p.set('orderId', orderId);
  return api.get<{ contract: AdminContractByOrderRow | null; versions: AdminContractVersionByOrderRow[] }>(
    `/api/admin/contracts?${p.toString()}`,
  );
}

export async function fetchAdminContractDetail(contractId: string): Promise<AdminContractDetail> {
  return api.get<AdminContractDetail>(`/api/admin/contracts/${encodeURIComponent(contractId)}`);
}

export async function markContractReviewed(contractId: string): Promise<{ contract: AdminContractQueueItem | null }> {
  return api.post(`/api/admin/contracts/${encodeURIComponent(contractId)}/reviewed`, {});
}

export async function overrideSupersedeVersion(
  contractId: string,
  versionId: string,
): Promise<{ version: AdminContractVersionRow }> {
  return api.post(`/api/admin/contracts/${encodeURIComponent(contractId)}/override-supersede`, { versionId });
}

export async function addContractInternalNote(
  contractId: string,
  note: string,
): Promise<{ events: AdminContractEventRow[] }> {
  return api.post(`/api/admin/contracts/${encodeURIComponent(contractId)}/note`, { note });
}
