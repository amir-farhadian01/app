/** Typed client for `/api/orders` (F5 wizard). */

import type { ServiceQuestionnaireV1 } from '@/lib/serviceDefinitionTypes';
import { isServiceQuestionnaireV1 } from '@/lib/serviceDefinitionTypes';

export type OrderEntryPoint = 'explorer' | 'ai_suggestion' | 'direct';

export type OrderPhotoRow = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fieldId?: string;
};

export type OrderPhaseFacetCounts = {
  offer: number;
  order: number;
  job: number;
  cancelledOffer: number;
  cancelledOrder: number;
  cancelledJob: number;
};

export type OrderRecord = {
  id: string;
  customerId: string;
  serviceCatalogId: string;
  schemaSnapshot: unknown;
  answers: Record<string, unknown>;
  photos: unknown;
  description: string;
  descriptionAiAssisted: boolean;
  scheduledAt: string | null;
  scheduleFlexibility: string;
  address: string;
  locationLat: number | null;
  locationLng: number | null;
  entryPoint: OrderEntryPoint;
  status: string;
  phase: string | null;
  matchedPackageId?: string | null;
  matchedProviderId?: string | null;
  matchedWorkspaceId?: string | null;
  autoMatchExhausted?: boolean;
  matchingExpiresAt?: string | null;
  customerPicks?: Record<string, unknown> | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderCustomerReview = {
  rating: number;
  reviewText: string | null;
  createdAt: string;
};

export type OrderCustomerContractSummary = {
  id: string;
  currentVersion: { id: string; status: string } | null;
};

export type OrderWithSchema = OrderRecord & {
  schema?: unknown;
  staleSnapshot?: boolean;
  customerReview?: OrderCustomerReview | null;
  customerContract?: OrderCustomerContractSummary | null;
  matchedSummary?: {
    provider: {
      id: string;
      displayName: string | null;
      firstName?: string | null;
      lastName?: string | null;
      avatarUrl?: string | null;
    };
    workspace: { id: string; name: string };
    package: { id: string; name: string; finalPrice: number; currency: string; durationMinutes: number | null };
  } | null;
  payment?: {
    status: 'none' | 'session_created' | 'paid';
    lastTransactionId: string | null;
    lastAmount: number | null;
    currency: string | null;
    lastCreatedAt: string | null;
  };
};

export type CategorySearchHit = {
  id: string;
  name: string;
  parentId: string | null;
  breadcrumb: string[];
  pathIds: string[];
};

export type ServiceCatalogSearchHit = {
  id: string;
  name: string;
  slug: string | null;
  categoryId: string | null;
  description: string | null;
  breadcrumb: string[];
};

export type CategorySearchResponse = {
  categories: CategorySearchHit[];
  serviceCatalogs: ServiceCatalogSearchHit[];
};

export type MyOrderListItem = OrderRecord & {
  matchedSummary?: OrderWithSchema['matchedSummary'];
  matchedProviderRating?: number | null;
  serviceCatalog: { id: string; name: string; breadcrumb: { id: string; name: string; parentId: string | null }[] };
};

export type MyOrdersResponse = {
  items: MyOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  facets?: { phase: OrderPhaseFacetCounts };
};

function authHeaders(): HeadersInit {
  const t = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function normalizePhotos(raw: unknown): OrderPhotoRow[] {
  if (!Array.isArray(raw)) return [];
  const out: OrderPhotoRow[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    const url = typeof o.url === 'string' ? o.url : '';
    if (!url) continue;
    out.push({
      url,
      fileName: typeof o.fileName === 'string' ? o.fileName : '',
      mimeType: typeof o.mimeType === 'string' ? o.mimeType : 'application/octet-stream',
      sizeBytes: typeof o.sizeBytes === 'number' && Number.isFinite(o.sizeBytes) ? o.sizeBytes : 0,
      ...(typeof o.fieldId === 'string' ? { fieldId: o.fieldId } : {}),
    });
  }
  return out;
}

function normalizeOrder(raw: unknown): OrderRecord {
  const o = raw as Record<string, unknown>;
  return {
    id: String(o.id ?? ''),
    customerId: String(o.customerId ?? ''),
    serviceCatalogId: String(o.serviceCatalogId ?? ''),
    schemaSnapshot: o.schemaSnapshot,
    answers:
      o.answers && typeof o.answers === 'object' && !Array.isArray(o.answers)
        ? (o.answers as Record<string, unknown>)
        : {},
    photos: o.photos,
    description: typeof o.description === 'string' ? o.description : '',
    descriptionAiAssisted: Boolean(o.descriptionAiAssisted),
    scheduledAt: typeof o.scheduledAt === 'string' ? o.scheduledAt : null,
    scheduleFlexibility: typeof o.scheduleFlexibility === 'string' ? o.scheduleFlexibility : 'asap',
    address: typeof o.address === 'string' ? o.address : '',
    locationLat: typeof o.locationLat === 'number' ? o.locationLat : null,
    locationLng: typeof o.locationLng === 'number' ? o.locationLng : null,
    entryPoint: (o.entryPoint as OrderEntryPoint) || 'direct',
    status: String(o.status ?? 'draft'),
    phase: typeof o.phase === 'string' ? o.phase : null,
    matchedPackageId: typeof o.matchedPackageId === 'string' ? o.matchedPackageId : null,
    matchedProviderId: typeof o.matchedProviderId === 'string' ? o.matchedProviderId : null,
    matchedWorkspaceId: typeof o.matchedWorkspaceId === 'string' ? o.matchedWorkspaceId : null,
    autoMatchExhausted: Boolean(o.autoMatchExhausted),
    matchingExpiresAt: typeof o.matchingExpiresAt === 'string' ? o.matchingExpiresAt : null,
    customerPicks:
      o.customerPicks && typeof o.customerPicks === 'object' && !Array.isArray(o.customerPicks)
        ? (o.customerPicks as Record<string, unknown>)
        : null,
    cancelReason: typeof o.cancelReason === 'string' ? o.cancelReason : null,
    cancelledAt: typeof o.cancelledAt === 'string' ? o.cancelledAt : null,
    submittedAt: typeof o.submittedAt === 'string' ? o.submittedAt : null,
    createdAt: String(o.createdAt ?? ''),
    updatedAt: String(o.updatedAt ?? ''),
  };
}

export async function postOrderDraft(body: {
  serviceCatalogId: string;
  entryPoint: OrderEntryPoint;
  prefill?: Record<string, unknown>;
}): Promise<OrderRecord> {
  const res = await fetch('/api/orders/draft', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    throw Object.assign(new Error('Unauthorized'), { code: 'UNAUTHORIZED' as const });
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Draft failed');
  }
  return normalizeOrder(data);
}

export async function putOrderDraft(
  orderId: string,
  patch: Record<string, unknown>,
): Promise<OrderRecord> {
  const res = await fetch(`/api/orders/draft/${orderId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(patch),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    throw Object.assign(new Error('Unauthorized'), { code: 'UNAUTHORIZED' as const });
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Save failed');
  }
  return normalizeOrder(data);
}

export type SubmitOrderResult =
  | {
      ok: true;
      alreadySubmitted: boolean;
      order: OrderRecord;
      matchOutcome?: {
        mode: 'auto_matched' | 'round_robin_invited' | 'no_eligible_providers';
        attemptId?: string;
        invitedCount?: number;
        attemptIds?: string[];
        windowExpiresAt?: string | null;
        reason?: string;
      };
      matchedSummary?: OrderWithSchema['matchedSummary'];
    }
  | { ok: false; message: string; validationErrors?: Record<string, string> };

export type ServiceCatalogPackageRow = {
  id: string;
  name: string;
  price: number;
  duration: number | null;
  bookingMode: string;
  bomLines: Array<{ productName: string; quantity: number; unitPrice: number; currency: string }>;
  margin: number;
};

export async function getServiceCatalogPackages(serviceCatalogId: string): Promise<ServiceCatalogPackageRow[]> {
  const res = await fetch(`/api/service-catalog/${encodeURIComponent(serviceCatalogId)}/packages`, {
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to load packages');
  }
  if (!Array.isArray(data)) return [];
  return data as ServiceCatalogPackageRow[];
}

export type MatchedProviderPreview = {
  providerId: string;
  name: string;
  avatarUrl: string | null;
  rating: number | null;
  reviewsCount: number;
  distanceKm: number | null;
  packageId: string;
  packageName: string;
  workspaceName: string;
};

export async function getOrderMatchedProviders(orderId: string): Promise<{
  autoMatchEnabled: boolean;
  manualSelectionAvailable: boolean;
  providers: MatchedProviderPreview[];
}> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/matched-providers`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    throw Object.assign(new Error('Unauthorized'), { code: 'UNAUTHORIZED' as const });
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to load providers');
  }
  const d = data as Record<string, unknown>;
  return {
    autoMatchEnabled: Boolean(d.autoMatchEnabled),
    manualSelectionAvailable: Boolean(d.manualSelectionAvailable),
    providers: Array.isArray(d.providers) ? (d.providers as MatchedProviderPreview[]) : [],
  };
}

export type WizardSubmitBody = {
  categoryId?: string;
  serviceId?: string;
  packageId?: string;
  scheduledFor?: string | null;
  scheduleFlexibility?: string;
  timePreference?: string;
  address: string;
  scope: string;
  accessNotes?: string;
  photoIds?: string[];
  agreedToTerms: boolean;
  selectedProviderId?: string | null;
};

export async function submitWizardOrder(orderId: string, body: WizardSubmitBody): Promise<SubmitOrderResult> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/submit`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (res.status === 409) {
    const ord = data.order;
    if (ord && typeof ord === 'object') {
      return { ok: true, alreadySubmitted: true, order: normalizeOrder(ord) };
    }
    return { ok: true, alreadySubmitted: true, order: normalizeOrder(data) };
  }
  if (res.status === 400) {
    const errors = data.errors;
    return {
      ok: false,
      message: typeof data.error === 'string' ? data.error : 'Validation failed',
      validationErrors:
        errors && typeof errors === 'object' && !Array.isArray(errors)
          ? (errors as Record<string, string>)
          : undefined,
    };
  }
  if (res.status === 401) {
    return { ok: false, message: 'Unauthorized', validationErrors: { _auth: 'sign_in_required' } };
  }
  if (!res.ok) {
    return { ok: false, message: typeof data.error === 'string' ? data.error : 'Submit failed' };
  }
  return {
    ok: true,
    alreadySubmitted: false,
    order: normalizeOrder(data),
    matchOutcome:
      data.matchOutcome && typeof data.matchOutcome === 'object'
        ? (data.matchOutcome as {
            mode: 'auto_matched' | 'round_robin_invited' | 'no_eligible_providers';
            attemptId?: string;
            invitedCount?: number;
            attemptIds?: string[];
            windowExpiresAt?: string | null;
            reason?: string;
          })
        : undefined,
    matchedSummary:
      data.matchedSummary && typeof data.matchedSummary === 'object'
        ? (data.matchedSummary as OrderWithSchema['matchedSummary'])
        : null,
  };
}

export async function submitOrderDraft(
  orderId: string,
  patch?: Record<string, unknown>,
): Promise<SubmitOrderResult> {
  const res = await fetch(`/api/orders/draft/${orderId}/submit`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(patch ?? {}),
    credentials: 'include',
  });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (res.status === 409) {
    const ord = data.order;
    if (ord && typeof ord === 'object') {
      return { ok: true, alreadySubmitted: true, order: normalizeOrder(ord) };
    }
    return { ok: true, alreadySubmitted: true, order: normalizeOrder(data) };
  }
  if (res.status === 400) {
    const errors = data.errors;
    return {
      ok: false,
      message: typeof data.error === 'string' ? data.error : 'Validation failed',
      validationErrors:
        errors && typeof errors === 'object' && !Array.isArray(errors)
          ? (errors as Record<string, string>)
          : undefined,
    };
  }
  if (res.status === 401) {
    return { ok: false, message: 'Unauthorized', validationErrors: { _auth: 'sign_in_required' } };
  }
  if (!res.ok) {
    return { ok: false, message: typeof data.error === 'string' ? data.error : 'Submit failed' };
  }
  return {
    ok: true,
    alreadySubmitted: false,
    order: normalizeOrder(data),
    matchOutcome:
      data.matchOutcome && typeof data.matchOutcome === 'object'
        ? (data.matchOutcome as {
            mode: 'auto_matched' | 'round_robin_invited' | 'no_eligible_providers';
            attemptId?: string;
            invitedCount?: number;
            attemptIds?: string[];
            windowExpiresAt?: string | null;
            reason?: string;
          })
        : undefined,
    matchedSummary:
      data.matchedSummary && typeof data.matchedSummary === 'object'
        ? (data.matchedSummary as OrderWithSchema['matchedSummary'])
        : null,
  };
}

export async function submitOrderDispute(orderId: string, reason: string): Promise<OrderRecord> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/dispute`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Dispute submit failed');
  }
  return normalizeOrder(data);
}

export async function cancelOrder(orderId: string, reason: string): Promise<OrderRecord> {
  const res = await fetch(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Cancel failed');
  }
  return normalizeOrder(data);
}

function normalizeMyItem(raw: unknown): MyOrderListItem {
  const o = raw as Record<string, unknown>;
  const base = normalizeOrder(raw);
  const matchedSummary =
    o.matchedSummary && typeof o.matchedSummary === 'object'
      ? (o.matchedSummary as OrderWithSchema['matchedSummary'])
      : null;
  const mr = o.matchedProviderRating;
  const matchedProviderRating =
    typeof mr === 'number' && Number.isFinite(mr) ? mr : mr === null ? null : undefined;
  const sc = o.serviceCatalog;
  if (sc && typeof sc === 'object' && !Array.isArray(sc)) {
    const s = sc as Record<string, unknown>;
    return {
      ...base,
      matchedSummary,
      ...(matchedProviderRating !== undefined ? { matchedProviderRating } : {}),
      serviceCatalog: {
        id: String(s.id ?? base.serviceCatalogId),
        name: String(s.name ?? 'Service'),
        breadcrumb: Array.isArray(s.breadcrumb)
          ? (s.breadcrumb as { id: string; name: string; parentId: string | null }[])
          : [],
      },
    };
  }
  return {
    ...base,
    matchedSummary,
    ...(matchedProviderRating !== undefined ? { matchedProviderRating } : {}),
    serviceCatalog: { id: base.serviceCatalogId, name: 'Service', breadcrumb: [] },
  };
}

function parsePhaseFacets(raw: unknown): { phase: OrderPhaseFacetCounts } | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const f = raw as Record<string, unknown>;
  const ph = f.phase;
  if (!ph || typeof ph !== 'object' || Array.isArray(ph)) return undefined;
  const p = ph as Record<string, unknown>;
  const n = (k: string) => (typeof p[k] === 'number' && Number.isFinite(p[k] as number) ? (p[k] as number) : 0);
  return {
    phase: {
      offer: n('offer'),
      order: n('order'),
      job: n('job'),
      cancelledOffer: n('cancelledOffer'),
      cancelledOrder: n('cancelledOrder'),
      cancelledJob: n('cancelledJob'),
    },
  };
}

export async function getMyOrders(params?: {
  page?: number;
  pageSize?: number;
  status?: string[];
  phase?: string[];
  includeDrafts?: boolean;
}): Promise<MyOrdersResponse> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.pageSize != null) sp.set('pageSize', String(params.pageSize));
  for (const s of params?.status ?? []) sp.append('status', s);
  for (const p of params?.phase ?? []) sp.append('phase', p);
  if (params?.includeDrafts === false) sp.set('includeDrafts', 'false');
  const q = sp.toString();
  const res = await fetch(`/api/orders/me${q ? `?${q}` : ''}`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'List failed');
  }
  const d = data as Record<string, unknown>;
  const items = Array.isArray(d.items) ? d.items.map((x) => normalizeMyItem(x)) : [];
  const facets = parsePhaseFacets(d.facets);
  return {
    items,
    total: typeof d.total === 'number' ? d.total : 0,
    page: typeof d.page === 'number' ? d.page : 1,
    pageSize: typeof d.pageSize === 'number' ? d.pageSize : 20,
    ...(facets ? { facets } : {}),
  };
}

/** Active pipeline orders for the matched provider / workspace (excludes completed/closed/cancelled by default). */
const PROVIDER_SCHEDULE_STATUSES = [
  'submitted',
  'matching',
  'matched',
  'contracted',
  'paid',
  'in_progress',
  'disputed',
];

export async function getProviderPipelineOrders(params?: {
  page?: number;
  pageSize?: number;
  status?: string[];
  phase?: string[];
}): Promise<MyOrdersResponse> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.pageSize != null) sp.set('pageSize', String(params.pageSize));
  const statuses = params?.status ?? PROVIDER_SCHEDULE_STATUSES;
  for (const s of statuses) sp.append('status', s);
  const phases = params?.phase ?? ['order', 'job'];
  for (const p of phases) sp.append('phase', p);
  const q = sp.toString();
  const res = await fetch(`/api/orders/provider/me?${q}`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'List failed');
  }
  const d = data as Record<string, unknown>;
  const items = Array.isArray(d.items) ? d.items.map((x) => normalizeMyItem(x)) : [];
  const facets = parsePhaseFacets(d.facets);
  return {
    items,
    total: typeof d.total === 'number' ? d.total : 0,
    page: typeof d.page === 'number' ? d.page : 1,
    pageSize: typeof d.pageSize === 'number' ? d.pageSize : 20,
    ...(facets ? { facets } : {}),
  };
}

function normalizeCustomerReview(raw: unknown): OrderCustomerReview | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const rating = typeof r.rating === 'number' ? r.rating : Number(r.rating);
  if (!Number.isFinite(rating)) return null;
  return {
    rating,
    reviewText: typeof r.reviewText === 'string' ? r.reviewText : null,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
  };
}

function normalizeCustomerContract(raw: unknown): OrderCustomerContractSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  if (!id) return null;
  const cv = o.currentVersion;
  let currentVersion: { id: string; status: string } | null = null;
  if (cv && typeof cv === 'object' && !Array.isArray(cv)) {
    const c = cv as Record<string, unknown>;
    if (typeof c.id === 'string' && typeof c.status === 'string') {
      currentVersion = { id: c.id, status: c.status };
    }
  }
  return { id, currentVersion };
}

export async function getOrder(orderId: string): Promise<OrderWithSchema> {
  const res = await fetch(`/api/orders/${orderId}`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Not found');
  }
  const o = data as Record<string, unknown>;
  const base = normalizeOrder(o);
  return {
    ...base,
    schema: o.schema,
    staleSnapshot: Boolean(o.staleSnapshot),
    customerReview: normalizeCustomerReview(o.customerReview),
    customerContract: normalizeCustomerContract(o.customerContract),
    matchedSummary:
      o.matchedSummary && typeof o.matchedSummary === 'object'
        ? (o.matchedSummary as OrderWithSchema['matchedSummary'])
        : null,
    payment:
      o.payment && typeof o.payment === 'object'
        ? (o.payment as OrderWithSchema['payment'])
        : { status: 'none', lastTransactionId: null, lastAmount: null, currency: null, lastCreatedAt: null },
  };
}

export async function submitOrderReview(
  orderId: string,
  body: { rating: number; review: string },
): Promise<OrderWithSchema> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/review`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Review submit failed');
  }
  const o = data as Record<string, unknown>;
  const base = normalizeOrder(o);
  return {
    ...base,
    schema: o.schema,
    staleSnapshot: Boolean(o.staleSnapshot),
    customerReview: normalizeCustomerReview(o.customerReview),
    customerContract: normalizeCustomerContract(o.customerContract),
    matchedSummary:
      o.matchedSummary && typeof o.matchedSummary === 'object'
        ? (o.matchedSummary as OrderWithSchema['matchedSummary'])
        : null,
    payment:
      o.payment && typeof o.payment === 'object'
        ? (o.payment as OrderWithSchema['payment'])
        : { status: 'none', lastTransactionId: null, lastAmount: null, currency: null, lastCreatedAt: null },
  };
}

export async function createOrderPaymentSession(orderId: string): Promise<{
  session: { id: string; status: 'pending' | string; amount: number; currency: string; paymentUrl: string; createdAt: string };
}> {
  const res = await fetch(`/api/orders/${orderId}/payments/session`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }
  if (res.status === 409) {
    const d = data as { error?: string; code?: string };
    throw new Error(`${d.code ?? 'PAYMENT_GATE'}: ${d.error ?? 'Payment is not available yet'}`);
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to create payment session');
  }
  return data as {
    session: { id: string; status: 'pending' | string; amount: number; currency: string; paymentUrl: string; createdAt: string };
  };
}

export async function searchCategoriesAndCatalogs(
  q: string,
  limit = 20,
): Promise<CategorySearchResponse> {
  const sp = new URLSearchParams({ q, limit: String(limit) });
  const res = await fetch(`/api/categories/search?${sp}`, { credentials: 'include' });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Search failed');
  }
  const d = data as CategorySearchResponse;
  return {
    categories: Array.isArray(d.categories) ? d.categories : [],
    serviceCatalogs: Array.isArray(d.serviceCatalogs) ? d.serviceCatalogs : [],
  };
}

export type CatalogInCategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categoryId: string | null;
  lockedBookingMode: string | null;
};

/** Metadata passed when picking a catalog from search or tree (for booking-mode branching). */
export type CatalogSelectionMeta = {
  name: string;
  slug: string | null;
  lockedBookingMode: string | null;
};

export async function getServiceCatalogsInCategory(
  categoryId: string,
  opts?: { deep?: boolean },
): Promise<CatalogInCategoryRow[]> {
  const q = opts?.deep ? '?deep=1' : '';
  const res = await fetch(`/api/service-catalog/by-category/${encodeURIComponent(categoryId)}${q}`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to load services');
  }
  const items = (data as { items?: CatalogInCategoryRow[] }).items;
  if (!Array.isArray(items)) return [];
  return items.map((row) => ({
    ...row,
    lockedBookingMode: row?.lockedBookingMode ?? null,
  }));
}

export type ServiceCatalogSchemaResponse = {
  schema: ServiceQuestionnaireV1 | null;
  breadcrumbs: { id: string; name: string; parentId: string | null }[];
  serviceCatalog: {
    id: string;
    name: string;
    slug: string | null;
    defaultMatchingMode?: string;
    description: string | null;
    category?: string | null;
    subcategory?: string | null;
    lockedBookingMode?: string | null;
  };
};

export async function getServiceCatalogSchema(catalogId: string): Promise<ServiceCatalogSchemaResponse> {
  const res = await fetch(`/api/service-catalog/${catalogId}/schema`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    throw Object.assign(new Error('Unauthorized'), { code: 'UNAUTHORIZED' as const });
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Schema failed');
  }
  const d = data as Record<string, unknown>;
  const rawSchema = d.schema;
  return {
    schema: rawSchema != null && isServiceQuestionnaireV1(rawSchema) ? rawSchema : null,
    breadcrumbs: Array.isArray(d.breadcrumbs)
      ? (d.breadcrumbs as { id: string; name: string; parentId: string | null }[])
      : [],
    serviceCatalog: (d.serviceCatalog as ServiceCatalogSchemaResponse['serviceCatalog']) ?? {
      id: catalogId,
      name: 'Service',
      slug: null,
      description: null,
    },
  };
}

export { normalizePhotos };

export type OrderCandidate = {
  attemptId: string;
  providerId: string;
  providerName: string;
  providerAvatarUrl: string | null;
  providerRating: number | null;
  workspaceId: string;
  workspaceName: string;
  workspaceLogoUrl: string | null;
  packageId: string;
  packageName: string;
  packageFinalPrice: number;
  packageCurrency: string;
  packageDuration: number | null;
  score: number;
  distanceKm: number | null;
  respondedAt: string | null;
};

export async function getOrderCandidates(orderId: string): Promise<{
  windowExpiresAt: string | null;
  secondsRemaining: number | null;
  candidates: OrderCandidate[];
}> {
  const res = await fetch(`/api/orders/${orderId}/candidates`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to load candidates');
  }
  const d = data as Record<string, unknown>;
  return {
    windowExpiresAt: typeof d.windowExpiresAt === 'string' ? d.windowExpiresAt : null,
    secondsRemaining: typeof d.secondsRemaining === 'number' ? d.secondsRemaining : null,
    candidates: Array.isArray(d.candidates) ? (d.candidates as OrderCandidate[]) : [],
  };
}

export async function selectOrderProvider(
  orderId: string,
  body: {
    attemptId: string;
    savePriorityTemplate?: boolean;
    priorityTemplate?: { weights: Record<string, number> };
  },
): Promise<{ order: OrderRecord; supersededCount: number }> {
  const res = await fetch(`/api/orders/${orderId}/select-provider`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Selection failed');
  }
  const d = data as Record<string, unknown>;
  return {
    order: normalizeOrder((d.order ?? {}) as Record<string, unknown>),
    supersededCount: typeof d.supersededCount === 'number' ? d.supersededCount : 0,
  };
}
