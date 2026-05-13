import { http, HttpResponse } from 'msw';

const emptyPhaseFacets = {
  offer: 1,
  order: 1,
  job: 1,
  cancelledOffer: 0,
  cancelledOrder: 0,
  cancelledJob: 0,
};

const ordersMeEmpty = {
  items: [] as unknown[],
  total: 0,
  page: 1,
  pageSize: 20,
  facets: { phase: { ...emptyPhaseFacets } },
};

const defaultUser = {
  id: 'user-smoke-1',
  email: 'smoke@test.local',
  displayName: 'Smoke User',
  firstName: 'Smoke',
  lastName: 'User',
  role: 'customer',
  status: 'active',
  companyId: null,
  isVerified: true,
  avatarUrl: null,
  bio: null,
  location: null,
  phone: null,
  mfaEnabled: false,
  googleLinked: false,
  createdAt: new Date().toISOString(),
};

const workspaceRow = {
  id: 'ws-smoke-1',
  name: 'Smoke Workspace',
  logoUrl: null,
  slug: 'smoke-ws',
  role: 'owner',
  isOwner: true,
};

const companyPayload = {
  id: 'ws-smoke-1',
  name: 'Smoke Workspace',
  ownerId: 'user-smoke-1',
  members: [{ userId: 'user-smoke-1', role: 'owner' }],
};

const financePayload = {
  workspaceId: 'ws-smoke-1',
  disclaimers: {
    paymentGatewayConnected: false,
    payoutsProcessed: false,
    figuresAreFromOrdersAndInternalRecords: true,
  },
  summary: {
    estimatedEarnings: 1200,
    pendingAmount: 200,
    completedJobCount: 3,
    disputedJobCount: 0,
    displayCurrency: 'CAD',
    mixedCurrency: false,
  },
  ledger: [],
  payoutHistory: { available: false, items: [], placeholderMessage: '—' },
  invoices: [],
};

/** Baseline handlers for dashboard smoke tests (override per suite with server.use). */
export const smokeHandlers = [
  http.get('/api/auth/me', () => HttpResponse.json(defaultUser)),
  http.get('/api/requests', () => HttpResponse.json([])),
  http.get('/api/services', () => HttpResponse.json([])),
  http.get('/api/transactions', () => HttpResponse.json([])),
  http.get('/api/tickets', () => HttpResponse.json([])),
  http.get('/api/contracts', () => HttpResponse.json([])),
  http.get('/api/kyc/me', () => HttpResponse.json({})),
  http.get('/api/notifications', () => HttpResponse.json([])),
  http.get('/api/workspaces/me', () => HttpResponse.json([workspaceRow])),
  http.get('/api/companies/:companyId', () => HttpResponse.json(companyPayload)),
  http.get('/api/workspaces/:wsId/finance', () => HttpResponse.json(financePayload)),
  http.get('/api/orders/provider/me', () => HttpResponse.json(ordersMeEmpty)),
  http.get('/api/system/config', () => HttpResponse.json({ theme: {} })),
  http.get('/api/workspaces/:wsId/inbox-attempts', ({ request }) => {
    const raw = request.url;
    const hasInvited = raw.includes('invited');
    const matchedOnlyBadge = raw.includes('matched') && !hasInvited;
    if (matchedOnlyBadge) {
      return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 25 });
    }
    if (hasInvited) {
      return HttpResponse.json({
        items: [
          {
            id: 'att-smoke-1',
            status: 'invited',
            score: 1,
            distanceKm: 2,
            invitedAt: '2026-01-01T00:00:00.000Z',
            matchedAt: null,
            respondedAt: null,
            declineReason: null,
            expiresAt: '2099-12-31T23:59:59.000Z',
            package: {
              id: 'pkg-smoke-1',
              name: 'Smoke Package',
              finalPrice: 120,
              currency: 'CAD',
            },
            order: {
              id: 'ord-smoke-1',
              customerId: 'user-smoke-1',
              serviceCatalogId: 'sc-smoke-1',
              serviceCatalog: { id: 'sc-smoke-1', name: 'Lawn Care', category: 'Outdoor' },
              answers: {},
              photos: [],
              description: 'Test job',
              address: '100 Queen St, Toronto, ON',
              scheduledAt: null,
              scheduleFlexibility: 'asap',
              phase: 'offer',
              status: 'matching',
            },
            customer: {
              id: 'cust-smoke-1',
              displayName: 'Casey Customer',
              firstName: 'Casey',
              lastName: 'C',
              avatarUrl: null,
            },
            serviceCatalog: { id: 'sc-smoke-1', name: 'Lawn Care', category: 'Outdoor' },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      });
    }
    return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 25 });
  }),
  http.get('/api/orders/me', ({ request }) => {
    const url = new URL(request.url);
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    return HttpResponse.json({
      ...ordersMeEmpty,
      pageSize,
      total: pageSize === 1 ? 1 : ordersMeEmpty.total,
      facets: { phase: { ...emptyPhaseFacets } },
    });
  }),
];
