import { api } from '../lib/api';
import type { BusinessKycFormV1 } from '../../lib/kycTypes';
import type { KycAiAnalysis } from './geminiService';

export type KycStatusUi = 'pending' | 'approved' | 'rejected' | 'resubmit_requested';

export type Level0Row = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: string;
    isVerified: boolean;
    address: string | null;
    createdAt: string;
    updatedAt: string;
  };
  emailVerified: boolean;
  phoneVerified: boolean;
  address: string | null;
  addressVerified: boolean;
  addressCapturedAt: string | null;
  adminAcknowledgedAt: string | null;
  lastUpdated: string;
};

export type Level0ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  rows: Level0Row[];
};

export type PersonalSubmissionRow = {
  id: string;
  userId: string;
  declaredLegalName: string;
  idDocumentType: string;
  idDocumentNumber: string | null;
  idFrontUrl: string;
  idBackUrl: string | null;
  selfieUrl: string;
  aiAnalysis: KycAiAnalysis | null;
  status: KycStatusUi;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    phone: string | null;
    isVerified: boolean;
  };
};

export type PersonalListResponse = {
  page: number;
  pageSize: number;
  total: number;
  rows: PersonalSubmissionRow[];
};

export type BusinessSubmissionRow = {
  id: string;
  userId: string;
  companyId: string | null;
  schemaVersion: number;
  answers: Record<string, unknown>;
  uploads: unknown;
  inquiryResults: Record<string, unknown> | null;
  expiryFlags: Record<string, { expiresAt: string; monthsRemaining: number; passesThreshold: boolean }> | null;
  status: KycStatusUi;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; displayName: string | null; phone: string | null };
  company: { id: string; name: string; kycStatus: string } | null;
};

export type BusinessListResponse = {
  page: number;
  pageSize: number;
  total: number;
  rows: BusinessSubmissionRow[];
};

export type KycAuditRow = {
  id: string;
  submissionType: 'level0' | 'personal' | 'business';
  submissionId: string;
  actorId: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  metadata: unknown;
  createdAt: string;
};

export type AuditListResponse = {
  page: number;
  pageSize: number;
  total: number;
  rows: KycAuditRow[];
};

export type PersonalDetail = PersonalSubmissionRow & {
  user: PersonalSubmissionRow['user'] & {
    firstName?: string | null;
    lastName?: string | null;
    address?: string | null;
    createdAt?: string;
  };
  auditHistory: KycAuditRow[];
};

export type BusinessDetail = BusinessSubmissionRow & {
  user: BusinessSubmissionRow['user'] & {
    firstName?: string | null;
    lastName?: string | null;
    address?: string | null;
    isVerified?: boolean;
  };
  company: BusinessSubmissionRow['company'] | null;
  resolvedSchema: BusinessKycFormV1 | null;
  auditHistory: KycAuditRow[];
};

function encodeQuery(params: Record<string, string | number | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length) q.set(k, v.join(','));
    } else {
      q.set(k, String(v));
    }
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export type Level0Query = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  q?: string;
  filter?: 'emailMissing' | 'phoneMissing' | 'addressMissing' | 'complete';
};

export async function listLevel0(query: Level0Query): Promise<Level0ListResponse> {
  const qs = encodeQuery({
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    q: query.q,
    filter: query.filter,
  });
  return api.get<Level0ListResponse>(`/api/admin/kyc/level0${qs}`);
}

export async function acknowledgeLevel0(userId: string, note?: string): Promise<void> {
  await api.post(`/api/admin/kyc/level0/${encodeURIComponent(userId)}/acknowledge`, { note: note?.trim() || undefined });
}

export type PersonalListQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  q?: string;
  userId?: string;
  status?: KycStatusUi[];
  aiRecommendation?: string[];
};

export async function listPersonal(query: PersonalListQuery): Promise<PersonalListResponse> {
  const qs = encodeQuery({
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    q: query.q,
    userId: query.userId,
    status: query.status,
    aiRecommendation: query.aiRecommendation,
  });
  return api.get<PersonalListResponse>(`/api/admin/kyc/personal${qs}`);
}

export async function getPersonal(id: string): Promise<PersonalDetail> {
  return api.get<PersonalDetail>(`/api/admin/kyc/personal/${encodeURIComponent(id)}`);
}

export type ReviewAction = 'approve' | 'reject' | 'request_resubmit';

export async function reviewPersonal(id: string, action: ReviewAction, note?: string): Promise<void> {
  await api.post(`/api/admin/kyc/personal/${encodeURIComponent(id)}/review`, {
    action: action === 'request_resubmit' ? 'request_resubmit' : action,
    note: note?.trim() || '',
  });
}

export async function bulkPersonal(ids: string[], action: ReviewAction, note?: string): Promise<void> {
  await api.post(`/api/admin/kyc/personal/bulk`, {
    ids,
    action: action === 'request_resubmit' ? 'request_resubmit' : action,
    note: note?.trim() || '',
  });
}

export type BusinessListQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  q?: string;
  userId?: string;
  status?: KycStatusUi[];
};

export async function listBusiness(query: BusinessListQuery): Promise<BusinessListResponse> {
  const qs = encodeQuery({
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    q: query.q,
    userId: query.userId,
    status: query.status,
  });
  return api.get<BusinessListResponse>(`/api/admin/kyc/business${qs}`);
}

export async function getBusiness(id: string): Promise<BusinessDetail> {
  return api.get<BusinessDetail>(`/api/admin/kyc/business/${encodeURIComponent(id)}`);
}

export async function reviewBusiness(id: string, action: ReviewAction, note?: string): Promise<void> {
  await api.post(`/api/admin/kyc/business/${encodeURIComponent(id)}/review`, {
    action: action === 'request_resubmit' ? 'request_resubmit' : action,
    note: note?.trim() || '',
  });
}

export async function runBusinessInquiries(id: string): Promise<unknown> {
  return api.post(`/api/admin/kyc/business/${encodeURIComponent(id)}/run-inquiries`, {});
}

export async function bulkBusiness(ids: string[], action: ReviewAction, note?: string): Promise<void> {
  await api.post(`/api/admin/kyc/business/bulk`, {
    ids,
    action: action === 'request_resubmit' ? 'request_resubmit' : action,
    note: note?.trim() || '',
  });
}

export type AuditQuery = {
  page?: number;
  pageSize?: number;
  submissionType?: string;
  submissionId?: string;
  actorId?: string;
  from?: string;
  to?: string;
};

export async function listAudit(params: AuditQuery): Promise<AuditListResponse> {
  const qs = encodeQuery({
    page: params.page,
    pageSize: params.pageSize,
    submissionType: params.submissionType,
    submissionId: params.submissionId,
    actorId: params.actorId,
    from: params.from,
    to: params.to,
  });
  return api.get<AuditListResponse>(`/api/admin/kyc/audit${qs}`);
}

export async function getFormSchemas(): Promise<{ rows: { id: string; version: number; isActive: boolean; schema: unknown }[] }> {
  return api.get(`/api/admin/kyc/form-schemas`);
}

export async function getActiveFormSchema(): Promise<{
  id: string;
  version: number;
  isActive: boolean;
  schema: BusinessKycFormV1;
}> {
  return api.get(`/api/admin/kyc/form-schemas/active`);
}

export type FormSchemaRow = {
  id: string;
  version: number;
  isActive: boolean;
  schema: BusinessKycFormV1;
  description: string | null;
  publishedAt: string | null;
  publishedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listFormSchemas(): Promise<{ rows: FormSchemaRow[] }> {
  return api.get<{ rows: FormSchemaRow[] }>('/api/admin/kyc/form-schemas');
}

export async function getFormSchema(id: string): Promise<FormSchemaRow | undefined> {
  const { rows } = await listFormSchemas();
  return rows.find((r) => r.id === id);
}

export async function createFormSchemaDraft(body: {
  schema: BusinessKycFormV1;
  description?: string | null;
}): Promise<FormSchemaRow> {
  return api.post<FormSchemaRow>('/api/admin/kyc/form-schemas', body);
}

export async function updateFormSchemaDraft(
  id: string,
  body: { schema?: BusinessKycFormV1; description?: string | null },
): Promise<FormSchemaRow> {
  return api.put<FormSchemaRow>(`/api/admin/kyc/form-schemas/${encodeURIComponent(id)}`, body);
}

export async function publishFormSchema(id: string): Promise<{ success: boolean; schema: FormSchemaRow | null }> {
  return api.post(`/api/admin/kyc/form-schemas/${encodeURIComponent(id)}/publish`, {});
}

export async function deleteFormSchema(id: string): Promise<void> {
  await api.delete(`/api/admin/kyc/form-schemas/${encodeURIComponent(id)}`);
}
