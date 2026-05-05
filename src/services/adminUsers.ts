import { api } from '../lib/api';
import type { AdminUserRow, AdminUsersResponse } from '../../lib/adminUsersTypes';

export type AdminUserFullPayload = {
  user: AdminUserRow;
  kycRecord: { id: string; type: string; status: string; createdAt: string } | null;
  auditLogs: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId: string;
    timestamp: string;
    metadata: unknown;
    actor: { id: string; email: string; displayName: string | null } | null;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    timestamp: string;
    category: string | null;
    description: string | null;
    customer: { id: string; displayName: string | null; email: string } | null;
    company: { id: string; name: string } | null;
  }>;
  contracts: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    customerId: string;
    providerId: string;
  }>;
  requests: Array<{
    id: string;
    status: string;
    createdAt: string;
    details: string | null;
    service: { id: string; title: string; price: number };
    customer: { id: string; displayName: string | null; email: string };
    provider: { id: string; displayName: string | null; email: string };
  }>;
  ordersSummary: {
    total: number;
    asCustomer: number;
    asMatchedProvider: number;
    byStatus: Record<string, number>;
    recent: Array<{
      id: string;
      status: string;
      phase: string | null;
      createdAt: string;
      updatedAt: string;
      relation: 'customer' | 'provider';
      serviceCatalogId: string;
      serviceName: string;
      workspaceId: string | null;
      workspaceName: string | null;
    }>;
  };
};

/** Build query string from flat key/value (repeated keys for arrays as `key` multiple times). */
export function buildAdminUsersQueryString(q: Record<string, string | number | string[] | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== undefined && item !== null && item !== '') usp.append(k, String(item));
      }
    } else {
      usp.set(k, String(v));
    }
  }
  return usp.toString();
}

export async function fetchAdminUsers(
  q: Record<string, string | number | string[] | undefined | null>
): Promise<AdminUsersResponse> {
  const qs = buildAdminUsersQueryString(q);
  return api.get<AdminUsersResponse>(`/api/admin/users?${qs}`);
}

export async function fetchAdminUserIds(
  q: Record<string, string | number | string[] | undefined | null>
): Promise<{ ids: string[] }> {
  const { page: _p, pageSize: _ps, ...rest } = q;
  const qs = buildAdminUsersQueryString(rest);
  return api.get<{ ids: string[] }>(`/api/admin/users/ids?${qs}`);
}

export async function fetchAdminUserFull(id: string): Promise<AdminUserFullPayload> {
  return api.get<AdminUserFullPayload>(`/api/admin/users/${id}/full`);
}

export async function bulkUserAction(
  ids: string[],
  action: 'activate' | 'suspend' | 'verify' | 'unverify' | 'delete'
): Promise<{ success: boolean; affected: number }> {
  return api.post<{ success: boolean; affected: number }>('/api/admin/users/bulk', { ids, action });
}
