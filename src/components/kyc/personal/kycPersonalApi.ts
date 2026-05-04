import { api } from '../../../lib/api';
import type { KycAiAnalysis } from '../../../services/geminiService';

export type Level0Me = {
  emailVerified: boolean;
  phoneVerified: boolean;
  address: string | null;
  addressCapturedAt: string | null;
  complete: boolean;
};

export type KycPersonalSubmissionDto = {
  id: string;
  declaredAddress: string | null;
  declaredLegalName: string;
  idDocumentType: string;
  idDocumentNumber: string | null;
  idFrontUrl: string;
  idBackUrl: string | null;
  selfieUrl: string;
  aiAnalysis: unknown;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  reviewedById: string | null;
};

export type PersonalMeResponse = {
  submission: KycPersonalSubmissionDto | null;
  canSubmit: boolean;
};

export type PersonalHistoryRow = KycPersonalSubmissionDto & {
  reviewerName: string | null;
};

export type PersonalSubmitBody = {
  declaredLegalName: string;
  idDocumentType: 'national_id' | 'passport' | 'drivers_license';
  idDocumentNumber?: string;
  idFrontUrl: string;
  idBackUrl?: string;
  selfieUrl: string;
  aiAnalysis?: KycAiAnalysis;
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

async function rawPost(path: string, body: unknown, retry = true): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res = await fetch(path, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (res.status === 401 && retry) {
    const t = await refreshAccessToken();
    if (t) return rawPost(path, body, false);
  }
  return res;
}

export async function postPersonalSubmit(
  body: PersonalSubmitBody,
  resubmit: boolean,
): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string; errors?: Record<string, string> }> {
  const path = resubmit ? '/api/kyc/v2/personal/resubmit' : '/api/kyc/v2/personal/submit';
  const res = await rawPost(path, body);
  const json = await res.json().catch(() => ({}));
  if (res.status === 201) {
    const id = (json as { id?: string }).id;
    if (id) return { ok: true as const, id };
    return { ok: false as const, status: res.status, error: 'Invalid response' };
  }
  if (res.status === 400 && json && typeof json === 'object' && 'errors' in json) {
    return {
      ok: false as const,
      status: 400,
      error: (json as { error?: string }).error || 'Validation failed',
      errors: (json as { errors?: Record<string, string> }).errors,
    };
  }
  return {
    ok: false as const,
    status: res.status,
    error: typeof (json as { error?: string }).error === 'string' ? (json as { error: string }).error : 'Request failed',
  };
}

export const kycPersonalApi = {
  getLevel0Me: () => api.get<Level0Me>('/api/kyc/v2/level0/me'),
  postLevel0Address: (address: string) => api.post<{ ok?: boolean }>('/api/kyc/v2/level0/address', { address }),
  startEmailVerify: () =>
    api.post<{ success?: boolean; token?: string; alreadyVerified?: boolean }>(
      '/api/kyc/v2/level0/verify-email/start',
      {},
    ),
  confirmEmailVerify: (token: string) =>
    api.post<{ success?: boolean }>('/api/kyc/v2/level0/verify-email/confirm', { token }),
  startPhoneVerify: () =>
    api.post<{ success?: boolean; debugCode?: string }>('/api/kyc/v2/level0/verify-phone/start', {}),
  confirmPhoneVerify: (code: string) =>
    api.post<{ success?: boolean }>('/api/kyc/v2/level0/verify-phone/confirm', { code }),

  getPersonalMe: () => api.get<PersonalMeResponse>('/api/kyc/v2/personal/me'),
  getPersonalHistory: () => api.get<PersonalHistoryRow[]>('/api/kyc/v2/personal/history'),
};
