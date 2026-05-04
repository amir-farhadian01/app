import { api } from '../lib/api';

export type InboxStatus = 'invited' | 'matched' | 'accepted' | 'declined' | 'expired' | 'superseded';

export type ProviderInboxItem = {
  id: string;
  providerId?: string;
  workspaceId?: string;
  status: InboxStatus;
  score: number;
  distanceKm: number | null;
  invitedAt: string;
  matchedAt: string | null;
  respondedAt: string | null;
  declineReason: string | null;
  expiresAt?: string | null;
  supersededAt?: string | null;
  lostReason?: string | null;
  lostFeedback?: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  package: {
    id: string;
    name: string;
    finalPrice: number;
    currency: string;
    bookingMode?: string;
    durationMinutes?: number | null;
    serviceCatalogId?: string;
    serviceCatalog?: { id: string; name: string; category?: string; lockedBookingMode?: string | null };
  };
  order: {
    id: string;
    customerId: string;
    serviceCatalogId: string;
    schemaSnapshot?: unknown;
    answers: Record<string, unknown>;
    photos: unknown;
    description: string;
    descriptionAiAssisted?: boolean;
    address: string;
    scheduledAt: string | null;
    scheduleFlexibility: string;
    phase: string | null;
    status: string;
    matchedProviderId?: string | null;
    matchedWorkspaceId?: string | null;
    locationLat: number | null;
    locationLng: number | null;
    entryPoint?: string;
    submittedAt: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  customer: {
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    email?: string | null;
    phone?: string | null;
    maskedEmailLabel?: string;
    maskedPhoneLabel?: string;
  };
  serviceCatalog?: { id: string; name: string; category?: string; slug?: string | null };
};

function normalizeItem(raw: unknown): ProviderInboxItem {
  const r = raw as Record<string, unknown>;
  const customerRaw = (r.customer ?? {}) as Record<string, unknown>;
  const orderRaw = (r.order ?? {}) as Record<string, unknown>;
  const packageRaw = (r.package ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    providerId: typeof r.providerId === 'string' ? r.providerId : undefined,
    workspaceId: typeof r.workspaceId === 'string' ? r.workspaceId : undefined,
    status: String(r.status ?? 'matched') as InboxStatus,
    score: typeof r.score === 'number' ? r.score : 0,
    distanceKm: typeof r.distanceKm === 'number' ? r.distanceKm : null,
    invitedAt: String(r.invitedAt ?? ''),
    matchedAt: typeof r.matchedAt === 'string' ? r.matchedAt : null,
    respondedAt: typeof r.respondedAt === 'string' ? r.respondedAt : null,
    declineReason: typeof r.declineReason === 'string' ? r.declineReason : null,
    expiresAt: typeof r.expiresAt === 'string' ? r.expiresAt : null,
    supersededAt: typeof r.supersededAt === 'string' ? r.supersededAt : null,
    lostReason: typeof r.lostReason === 'string' ? r.lostReason : null,
    lostFeedback:
      r.lostFeedback && typeof r.lostFeedback === 'object' && !Array.isArray(r.lostFeedback)
        ? (r.lostFeedback as Record<string, unknown>)
        : null,
    metadata: r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata)
      ? (r.metadata as Record<string, unknown>)
      : null,
    package: {
      id: String(packageRaw.id ?? ''),
      name: typeof packageRaw.name === 'string' ? packageRaw.name : 'Package',
      finalPrice: typeof packageRaw.finalPrice === 'number' ? packageRaw.finalPrice : 0,
      currency: typeof packageRaw.currency === 'string' ? packageRaw.currency : 'CAD',
      bookingMode: typeof packageRaw.bookingMode === 'string' ? packageRaw.bookingMode : undefined,
      durationMinutes: typeof packageRaw.durationMinutes === 'number' ? packageRaw.durationMinutes : null,
      serviceCatalogId: typeof packageRaw.serviceCatalogId === 'string' ? packageRaw.serviceCatalogId : undefined,
      serviceCatalog:
        packageRaw.serviceCatalog && typeof packageRaw.serviceCatalog === 'object'
          ? (packageRaw.serviceCatalog as ProviderInboxItem['package']['serviceCatalog'])
          : undefined,
    },
    order: {
      id: String(orderRaw.id ?? ''),
      customerId: String(orderRaw.customerId ?? ''),
      serviceCatalogId: String(orderRaw.serviceCatalogId ?? ''),
      schemaSnapshot: orderRaw.schemaSnapshot,
      answers:
        orderRaw.answers && typeof orderRaw.answers === 'object' && !Array.isArray(orderRaw.answers)
          ? (orderRaw.answers as Record<string, unknown>)
          : {},
      photos: orderRaw.photos,
      description: typeof orderRaw.description === 'string' ? orderRaw.description : '',
      descriptionAiAssisted: Boolean(orderRaw.descriptionAiAssisted),
      address: typeof orderRaw.address === 'string' ? orderRaw.address : '',
      scheduledAt: typeof orderRaw.scheduledAt === 'string' ? orderRaw.scheduledAt : null,
      scheduleFlexibility: typeof orderRaw.scheduleFlexibility === 'string' ? orderRaw.scheduleFlexibility : 'asap',
      phase: typeof orderRaw.phase === 'string' ? orderRaw.phase : null,
      status: typeof orderRaw.status === 'string' ? orderRaw.status : 'submitted',
      matchedProviderId: typeof orderRaw.matchedProviderId === 'string' ? orderRaw.matchedProviderId : null,
      matchedWorkspaceId: typeof orderRaw.matchedWorkspaceId === 'string' ? orderRaw.matchedWorkspaceId : null,
      locationLat: typeof orderRaw.locationLat === 'number' ? orderRaw.locationLat : null,
      locationLng: typeof orderRaw.locationLng === 'number' ? orderRaw.locationLng : null,
      entryPoint: typeof orderRaw.entryPoint === 'string' ? orderRaw.entryPoint : undefined,
      submittedAt: typeof orderRaw.submittedAt === 'string' ? orderRaw.submittedAt : null,
      createdAt: typeof orderRaw.createdAt === 'string' ? orderRaw.createdAt : undefined,
      updatedAt: typeof orderRaw.updatedAt === 'string' ? orderRaw.updatedAt : undefined,
    },
    customer: {
      id: String(customerRaw.id ?? ''),
      displayName: typeof customerRaw.displayName === 'string' ? customerRaw.displayName : null,
      firstName: typeof customerRaw.firstName === 'string' ? customerRaw.firstName : null,
      lastName: typeof customerRaw.lastName === 'string' ? customerRaw.lastName : null,
      avatarUrl: typeof customerRaw.avatarUrl === 'string' ? customerRaw.avatarUrl : null,
      email: typeof customerRaw.email === 'string' ? customerRaw.email : null,
      phone: typeof customerRaw.phone === 'string' ? customerRaw.phone : null,
      maskedEmailLabel: 'Available after acknowledgment',
      maskedPhoneLabel: 'Available after acknowledgment',
    },
    serviceCatalog:
      r.serviceCatalog && typeof r.serviceCatalog === 'object'
        ? (r.serviceCatalog as ProviderInboxItem['serviceCatalog'])
        : undefined,
  };
}

export async function listInbox(
  workspaceId: string,
  statuses: InboxStatus[] = [],
  page = 1,
  pageSize = 25,
): Promise<{ items: ProviderInboxItem[]; total: number; page: number; pageSize: number }> {
  const q = new URLSearchParams();
  for (const s of statuses) q.append('status[]', s);
  q.set('page', String(page));
  q.set('pageSize', String(pageSize));
  const res = await api.get<{ items: unknown[]; total: number; page: number; pageSize: number }>(
    `/api/workspaces/${workspaceId}/inbox-attempts?${q.toString()}`,
  );
  return {
    items: Array.isArray(res.items) ? res.items.map((i) => normalizeItem(i)) : [],
    total: typeof res.total === 'number' ? res.total : 0,
    page: typeof res.page === 'number' ? res.page : page,
    pageSize: typeof res.pageSize === 'number' ? res.pageSize : pageSize,
  };
}

export async function getInboxItem(workspaceId: string, attemptId: string): Promise<ProviderInboxItem> {
  const row = await api.get<unknown>(`/api/workspaces/${workspaceId}/inbox/${attemptId}`);
  return normalizeItem(row);
}

export async function acknowledge(workspaceId: string, attemptId: string): Promise<{ success: boolean; orderId: string }> {
  return api.post<{ success: boolean; orderId: string }>(`/api/workspaces/${workspaceId}/inbox/${attemptId}/acknowledge`, {});
}

/** @deprecated Prefer {@link acknowledge}; server routes invited + matched through acknowledge. */
export async function accept(workspaceId: string, attemptId: string): Promise<ProviderInboxItem> {
  return normalizeItem(await api.post<unknown>(`/api/workspaces/${workspaceId}/inbox/${attemptId}/accept`, {}));
}

export async function completeOrder(orderId: string): Promise<{ success: boolean; order: unknown }> {
  return api.post<{ success: boolean; order: unknown }>(`/api/orders/${encodeURIComponent(orderId)}/complete`, {});
}

export async function decline(
  workspaceId: string,
  attemptId: string,
  reason: string,
): Promise<{ reMatched: boolean; newAttemptId?: string; reason?: string }> {
  return api.post<{ reMatched: boolean; newAttemptId?: string; reason?: string }>(
    `/api/workspaces/${workspaceId}/inbox/${attemptId}/decline`,
    { reason },
  );
}

export type LostFeedbackReason =
  | 'price_too_high'
  | 'response_too_slow'
  | 'quality_concern'
  | 'schedule_mismatch'
  | 'distance'
  | 'unclear_brief'
  | 'other';

export async function submitLostFeedback(
  workspaceId: string,
  attemptId: string,
  body: {
    reasons: LostFeedbackReason[];
    otherText?: string;
    providerComment?: string;
  },
): Promise<ProviderInboxItem> {
  return normalizeItem(
    await api.post<unknown>(`/api/workspaces/${workspaceId}/inbox/${attemptId}/lost-feedback`, body),
  );
}
