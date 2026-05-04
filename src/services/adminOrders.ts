import { api } from '../lib/api';
import type { AdminOrdersListResponse } from '../../lib/adminOrdersList';
import type { ServiceQuestionnaireV1 } from '../../lib/serviceDefinitionTypes';

export type AdminOrdersStats = {
  totalOrders: number;
  ordersThisWeek: number;
  draftCount: number;
  submittedCount: number;
  cancelledCount: number;
  offers: number;
  orders: number;
  jobs: number;
  offersThisWeek: number;
  orderPhaseThisWeek: number;
  jobsThisWeek: number;
  cancelledOffers: number;
  cancelledOrders: number;
  cancelledJobs: number;
  matchedAutoToday: number;
  matchedAutoThisWeek: number;
  autoMatchExhaustedThisWeek: number;
  declinedAttemptsThisWeek: number;
};

export type AdminOrderListQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  q?: string;
  status?: string[];
  entryPoint?: string[];
  phase?: string[];
  includeDrafts?: boolean;
  serviceCatalogId?: string;
  createdFrom?: string;
  createdTo?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
};

function appendRepeated(p: URLSearchParams, key: string, values: string[] | undefined) {
  if (!values?.length) return;
  for (const v of values) p.append(key, v);
}

export function buildAdminOrdersQueryString(q: AdminOrderListQuery): string {
  const p = new URLSearchParams();
  if (q.page != null) p.set('page', String(q.page));
  if (q.pageSize != null) p.set('pageSize', String(q.pageSize));
  if (q.sortBy) p.set('sortBy', q.sortBy);
  if (q.sortDir) p.set('sortDir', q.sortDir);
  if (q.q?.trim()) p.set('q', q.q.trim());
  appendRepeated(p, 'status', q.status);
  appendRepeated(p, 'entryPoint', q.entryPoint);
  appendRepeated(p, 'phase', q.phase);
  if (q.includeDrafts === true) p.set('includeDrafts', 'true');
  if (q.serviceCatalogId) p.set('serviceCatalogId', q.serviceCatalogId);
  if (q.createdFrom) p.set('createdFrom', q.createdFrom);
  if (q.createdTo) p.set('createdTo', q.createdTo);
  if (q.scheduledFrom) p.set('scheduledFrom', q.scheduledFrom);
  if (q.scheduledTo) p.set('scheduledTo', q.scheduledTo);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function fetchAdminOrdersList(query: AdminOrderListQuery): Promise<AdminOrdersListResponse> {
  return api.get<AdminOrdersListResponse>(`/api/admin/orders${buildAdminOrdersQueryString(query)}`);
}

export type AdminOrderDetailCustomer = {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  phone: string | null;
};

export type AdminOrderDetailAuditEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorId: string;
  actor: { id: string; email: string; displayName: string | null };
  timestamp: string;
  metadata: unknown;
};

export type AdminOrderDetailResponse = {
  order: {
    id: string;
    customerId: string;
    serviceCatalogId: string;
    schemaSnapshot: unknown;
    answers: unknown;
    photos: unknown;
    description: string;
    descriptionAiAssisted: boolean;
    scheduledAt: string | null;
    scheduleFlexibility: string;
    address: string;
    locationLat: number | null;
    locationLng: number | null;
    entryPoint: string;
    status: string;
    phase: string | null;
    cancelReason: string | null;
    cancelledAt: string | null;
    submittedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  customer: AdminOrderDetailCustomer;
  serviceCatalog: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    breadcrumb: Array<{ id: string; name: string }>;
  };
  schema: ServiceQuestionnaireV1 | null;
  staleSnapshot: boolean;
  auditLog: AdminOrderDetailAuditEntry[];
};

export type AdminOrderEligibilityResponse = {
  orderId: string;
  eligible: Array<{
    score: number;
    distanceKm: number | null;
    breakdown: Record<string, number>;
    package: {
      id: string;
      name: string;
      finalPrice: number;
      currency: string;
      bookingMode: string;
    };
    workspace: { id: string; name: string; kycStatus: string };
    provider: { id: string; email: string; isVerified: boolean; status: string };
  }>;
  attempts: Array<{
    id: string;
    status: string;
    score: number;
    invitedAt: string;
    matchedAt: string | null;
    respondedAt: string | null;
    declineReason: string | null;
    package: { id: string; name: string; finalPrice: number; currency: string; bookingMode: string };
    provider: { id: string; email: string; displayName: string | null; isVerified: boolean; status: string };
    workspace: { id: string; name: string; kycStatus: string };
  }>;
};

export type AdminRoundRobinState = {
  orderId: string;
  status: string;
  phase: string | null;
  matchingExpiresAt: string | null;
  secondsRemaining: number | null;
  attempts: Array<{
    id: string;
    status: string;
    score: number;
    respondedAt: string | null;
    expiresAt: string | null;
    lostReason?: string | null;
    lostFeedback?: unknown;
    provider: { id: string; displayName: string | null; firstName?: string | null; lastName?: string | null; email?: string };
    workspace: { id: string; name: string };
    package: { id: string; name: string };
  }>;
  eligibleNotInvited: Array<{ packageId: string; providerName: string; score: number }>;
};

export async function fetchAdminOrderDetail(id: string): Promise<AdminOrderDetailResponse> {
  return api.get<AdminOrderDetailResponse>(`/api/admin/orders/${encodeURIComponent(id)}`);
}

export async function fetchAdminOrdersStats(): Promise<AdminOrdersStats> {
  return api.get<AdminOrdersStats>('/api/admin/orders/stats');
}

export type AdminCancelOrderResponse = {
  id: string;
  status: string;
  phase: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
};

export async function cancelAdminOrder(id: string, reason: string): Promise<AdminCancelOrderResponse> {
  return api.post<AdminCancelOrderResponse>(`/api/admin/orders/${encodeURIComponent(id)}/cancel`, {
    reason,
  });
}

export async function fetchAdminOrderEligibility(id: string): Promise<AdminOrderEligibilityResponse> {
  return api.get<AdminOrderEligibilityResponse>(`/api/admin/orders/${encodeURIComponent(id)}/eligibility`);
}

export async function forceAdminOrderMatch(id: string, packageId: string): Promise<{ attemptId: string }> {
  return api.post<{ attemptId: string }>(`/api/admin/orders/${encodeURIComponent(id)}/match-override`, {
    packageId,
  });
}

export async function fetchRoundRobinState(id: string): Promise<AdminRoundRobinState> {
  return api.get<AdminRoundRobinState>(`/api/admin/orders/${encodeURIComponent(id)}/round-robin-state`);
}

export async function startRoundRobin(id: string): Promise<{
  invitedCount: number;
  attemptIds: string[];
  windowExpiresAt?: string | null;
}> {
  return api.post(`/api/admin/orders/${encodeURIComponent(id)}/start-round-robin`, {});
}

export async function extendRoundRobinWindow(id: string, hours: number): Promise<{ matchingExpiresAt: string }> {
  return api.post(`/api/admin/orders/${encodeURIComponent(id)}/extend-window`, { hours });
}
