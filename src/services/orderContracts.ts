/** Client for `/api/orders/:orderId/contracts` (Sprint L). */

export type ContractVersionDTO = {
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
  generatedByAi: boolean;
  generationPrompt: string | null;
  generationContext: unknown;
  mismatchWarnings: unknown;
  sentById: string | null;
  sentAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractEventDTO = {
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

export type OrderContractShellDTO = {
  id: string;
  orderId: string;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: ContractVersionDTO | null;
};

export type ContractBundleResponse = {
  contract: OrderContractShellDTO | null;
  versions: ContractVersionDTO[];
  events: ContractEventDTO[];
};

export type ContractContextResponse = {
  order: Record<string, unknown>;
  package: Record<string, unknown> | null;
  chatMessages: Array<{ id: string; displayText: string; senderRole: string; createdAt: string }>;
  orderSummary: string;
};

type ApiError = Error & { status?: number };

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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error((data as { error?: string })?.error || 'Request failed') as ApiError;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export function fetchContractBundle(orderId: string): Promise<ContractBundleResponse> {
  return req<ContractBundleResponse>(`/api/orders/${encodeURIComponent(orderId)}/contracts`, {
    method: 'GET',
    headers: headers(),
  });
}

export function fetchContractContext(orderId: string): Promise<ContractContextResponse> {
  return req<ContractContextResponse>(`/api/orders/${encodeURIComponent(orderId)}/contracts/context`, {
    method: 'GET',
    headers: headers(),
  });
}

export function fetchContractVersion(orderId: string, versionId: string): Promise<ContractVersionDTO> {
  return req<ContractVersionDTO>(`/api/orders/${encodeURIComponent(orderId)}/contracts/${encodeURIComponent(versionId)}`, {
    method: 'GET',
    headers: headers(),
  });
}

export function postDraftFromAi(orderId: string): Promise<{ shell: OrderContractShellDTO; version: ContractVersionDTO }> {
  return req(`/api/orders/${encodeURIComponent(orderId)}/contracts/draft-from-ai`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  });
}

export type ContractTemplateListItem = {
  id: string;
  version: number;
  title: string;
  description: string;
  placeholders: Array<{ key: string; label: string }>;
};

export function fetchContractTemplates(orderId: string): Promise<{ templates: ContractTemplateListItem[] }> {
  return req<{ templates: ContractTemplateListItem[] }>(
    `/api/orders/${encodeURIComponent(orderId)}/contracts/templates`,
    {
      method: 'GET',
      headers: headers(),
    },
  );
}

export function postDraftFromTemplate(
  orderId: string,
  templateId: string,
): Promise<{ shell: OrderContractShellDTO; version: ContractVersionDTO }> {
  return req(`/api/orders/${encodeURIComponent(orderId)}/contracts/draft-from-template`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ templateId }),
  });
}

export type ManualDraftBody = {
  title: string;
  termsMarkdown: string;
  policiesMarkdown?: string;
  scopeSummary?: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
  currency?: string;
};

export function postContractDraft(
  orderId: string,
  body: ManualDraftBody,
): Promise<{ shell: OrderContractShellDTO; version: ContractVersionDTO; created?: boolean }> {
  return req(`/api/orders/${encodeURIComponent(orderId)}/contracts/draft`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
}

export function postSendContract(orderId: string, versionId: string): Promise<{ version: ContractVersionDTO }> {
  return req(`/api/orders/${encodeURIComponent(orderId)}/contracts/${encodeURIComponent(versionId)}/send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  });
}

export function postApproveContract(
  orderId: string,
  versionId: string,
): Promise<{ version: ContractVersionDTO; order: { id: string; status: string; phase: string | null }; idempotent?: boolean }> {
  return req(`/api/orders/${encodeURIComponent(orderId)}/contracts/${encodeURIComponent(versionId)}/approve`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  });
}

export function postRejectContract(
  orderId: string,
  versionId: string,
  body: { note: string; requestEdit: boolean },
): Promise<{ version: ContractVersionDTO }> {
  return req(`/api/orders/${encodeURIComponent(orderId)}/contracts/${encodeURIComponent(versionId)}/reject`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
}

export function postSupersedeContract(orderId: string, versionId: string): Promise<{ version: ContractVersionDTO }> {
  return req(`/api/orders/${encodeURIComponent(orderId)}/contracts/${encodeURIComponent(versionId)}/supersede`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  });
}

export function parseMismatchWarnings(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  }
  return [];
}
