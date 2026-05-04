import type { BusinessKycFormV1 } from '../../../../lib/kycTypes';
import type { BusinessKycUploadRow } from '../../../../lib/kycBusinessValidate';

export type BusinessSchemaActive = { version: number; schema: BusinessKycFormV1 };

export type BusinessSubmissionDto = {
  id: string;
  status: string;
  answers: unknown;
  uploads: unknown;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  schemaVersion: number;
  expiryFlags: Record<string, unknown>;
  inquiryResults: unknown;
};

export type BusinessMeResponse = {
  companyId: string;
  submission: BusinessSubmissionDto | null;
};

export type BusinessHistoryRow = {
  id: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  schemaVersion: number;
  expiryFlags: Record<string, unknown>;
};

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

async function rawFetch(path: string, init: RequestInit, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  let token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  let res = await fetch(path, { ...init, headers, credentials: 'include' });
  if (res.status === 401 && retry) {
    const t = await refreshAccessToken();
    if (t) {
      headers.set('Authorization', `Bearer ${t}`);
      res = await fetch(path, { ...init, headers, credentials: 'include' });
    }
  }
  return res;
}

export const kycBusinessApi = {
  getSchemaActive: () => rawFetch('/api/kyc/v2/business/schema/active', { method: 'GET' }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Schema not found');
    return r.json() as Promise<BusinessSchemaActive>;
  }),

  getMe: (companyId: string) =>
    rawFetch(`/api/kyc/v2/business/me?companyId=${encodeURIComponent(companyId)}`, { method: 'GET' }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to load submission');
      return r.json() as Promise<BusinessMeResponse>;
    }),

  postDraft: (body: { companyId: string; answers: Record<string, unknown>; uploads: BusinessKycUploadRow[] }) =>
    rawFetch('/api/kyc/v2/business/draft', { method: 'POST', body: JSON.stringify(body) }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Draft save failed');
      return r.json() as Promise<Record<string, unknown>>;
    }),

  getHistory: (companyId: string) =>
    rawFetch(`/api/kyc/v2/business/history?companyId=${encodeURIComponent(companyId)}`, { method: 'GET' }).then(
      async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'History failed');
        return r.json() as Promise<BusinessHistoryRow[]>;
      },
    ),
};

export type BusinessSubmitFail = {
  ok: false;
  status: number;
  error: string;
  errors?: Record<string, string>;
};

export type BusinessSubmitOk = { ok: true };

export async function postBusinessSubmit(
  body: { companyId: string; answers: Record<string, unknown>; uploads: BusinessKycUploadRow[] },
  resubmit: boolean,
): Promise<BusinessSubmitOk | BusinessSubmitFail> {
  const path = resubmit ? '/api/kyc/v2/business/resubmit' : '/api/kyc/v2/business/submit';
  const res = await rawFetch(path, { method: 'POST', body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (res.status === 201) return { ok: true };
  if (res.status === 400 && json && typeof json === 'object' && 'errors' in json) {
    return {
      ok: false,
      status: 400,
      error: typeof (json as { error?: string }).error === 'string' ? (json as { error: string }).error : 'Invalid',
      errors: (json as { errors?: Record<string, string> }).errors,
    };
  }
  return {
    ok: false,
    status: res.status,
    error: typeof (json as { error?: string }).error === 'string' ? (json as { error: string }).error : 'Request failed',
  };
}
