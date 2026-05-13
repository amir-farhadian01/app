import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

import { ThemeProvider } from '../../ThemeContext';
import { AuthProvider } from '../../lib/AuthContext';
import { SoftToastProvider } from '../../lib/SoftToastContext';
import { WorkspaceProvider } from '../../lib/WorkspaceContext';
import CustomerDashboard from '../../pages/CustomerDashboard';
import MyOrders from '../../pages/MyOrders';
import OrderDetail from '../../pages/OrderDetail';
import CompanyDashboard from '../../pages/CompanyDashboard';
import * as orders from '../../services/orders';
import { server } from '../../test/server';

function setSessionToken() {
  localStorage.setItem('accessToken', 'smoke-test-token');
}

function Shell({
  children,
  initialEntries,
}: {
  children: React.ReactNode;
  initialEntries: string[];
}) {
  return (
    <ThemeProvider>
      <SoftToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </AuthProvider>
        </MemoryRouter>
      </SoftToastProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  setSessionToken();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('QA-1 smoke: customer + company dashboards', () => {
  it('CustomerDashboard shows greeting and quick actions (orders/me mocked via MSW)', async () => {
    render(
      <Shell initialEntries={['/dashboard?tab=home']}>
        <Routes>
          <Route path="/dashboard" element={<CustomerDashboard />} />
        </Routes>
      </Shell>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Hello, Smoke/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Book a Service/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My Active Orders/i })).toBeInTheDocument();
  });

  it('MyOrders shows four tabs and getMyOrders receives correct phase filters', async () => {
    const spy = vi.spyOn(orders, 'getMyOrders').mockImplementation(async (params) => {
      const facets = {
        phase: {
          offer: 2,
          order: 1,
          job: 1,
          cancelledOffer: 0,
          cancelledOrder: 0,
          cancelledJob: 0,
        },
      };
      if (params?.pageSize === 1) {
        return { items: [], total: 3, page: 1, pageSize: 1, facets };
      }
      return { items: [], total: 0, page: 1, pageSize: params?.pageSize ?? 50, facets };
    });

    const listCalls = () =>
      spy.mock.calls
        .map((c) => c[0] as Parameters<typeof orders.getMyOrders>[0] | undefined)
        .filter((p) => p?.pageSize === 50);

    const mountAt = (path: string) =>
      render(
        <Shell initialEntries={[path]}>
          <Routes>
            <Route path="/orders" element={<MyOrders />} />
          </Routes>
        </Shell>,
      );

    mountAt('/orders?tab=active');
    const tablist = await screen.findByRole('tablist', { name: /order segments/i });
    expect(within(tablist).getAllByRole('tab')).toHaveLength(4);

    await waitFor(() => {
      const ph = listCalls().find((p) => (p?.phase?.length ?? 0) === 3)?.phase ?? [];
      expect(ph.includes('offer') && ph.includes('order') && ph.includes('job')).toBe(true);
    });

    cleanup();
    mountAt('/orders?tab=offers');
    await waitFor(() => {
      expect(listCalls().some((p) => p?.phase?.length === 1 && p.phase![0] === 'offer')).toBe(true);
    });

    cleanup();
    mountAt('/orders?tab=jobs');
    await waitFor(() => {
      expect(listCalls().some((p) => p?.phase?.length === 1 && p.phase![0] === 'job')).toBe(true);
    });

    cleanup();
    mountAt('/orders?tab=cancelled');
    await waitFor(() => {
      expect(listCalls().some((p) => p?.status?.length === 1 && p.status![0] === 'cancelled')).toBe(true);
    });
  });

  it('OrderDetail shows Details / Contract / Chat; payment CTA hidden when contract is not approved', async () => {
    server.use(
      http.get('/api/orders/ord-smoke-1', () =>
        HttpResponse.json({
          id: 'ord-smoke-1',
          offerId: 'offer-smoke-1',
          orderId: 'ord-smoke-1',
          jobId: null,
          customerId: 'user-smoke-1',
          serviceCatalogId: 'sc-smoke-1',
          answers: {},
          photos: [],
          description: 'Smoke order',
          address: '1 Test Rd',
          scheduledAt: null,
          scheduleFlexibility: 'asap',
          status: 'contracted',
          phase: 'order',
          matchedProviderId: 'prov-1',
          matchedWorkspaceId: 'ws-smoke-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
          customerContract: {
            id: 'cc-1',
            currentVersion: { id: 'cv-1', status: 'sent' },
          },
          matchedSummary: {
            provider: {
              id: 'prov-1',
              displayName: 'Pat Provider',
              firstName: 'Pat',
              lastName: 'Provider',
              avatarUrl: null,
            },
            workspace: { id: 'ws-smoke-1', name: 'Smoke WS' },
            package: {
              id: 'pkg-1',
              name: 'Package A',
              finalPrice: 99,
              currency: 'CAD',
              durationMinutes: 60,
            },
          },
        }),
      ),
      http.get('/api/service-catalog/sc-smoke-1/schema', () =>
        HttpResponse.json({
          schema: null,
          breadcrumbs: [],
          serviceCatalog: { id: 'sc-smoke-1', name: 'Smoke Service', slug: null, description: null },
        }),
      ),
      http.get('/api/orders/ord-smoke-1/payments/status', () =>
        HttpResponse.json({
          orderId: 'ord-smoke-1',
          orderStatus: 'contracted',
          approvedContractVersionId: null,
          payment: null,
        }),
      ),
      http.get('/api/orders/ord-smoke-1/chat/thread', () =>
        HttpResponse.json({ messages: [], readOnly: false }),
      ),
    );

    render(
      <Shell initialEntries={['/orders/ord-smoke-1']}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetail />} />
        </Routes>
      </Shell>,
    );

    await waitFor(() => {
      expect(screen.getByRole('tablist', { name: /order views/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: /^Details$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Contract$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Chat$/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Approve the contract in the Contract tab to enable payment/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Create payment session/i })).not.toBeInTheDocument();
  });

  it('CompanyDashboard Overview shows KPI cards (finance API mocked)', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          id: 'prov-smoke-1',
          email: 'provider@test.local',
          displayName: 'Provider User',
          firstName: 'Provider',
          lastName: 'User',
          role: 'provider',
          status: 'active',
          companyId: 'ws-smoke-1',
          isVerified: true,
          avatarUrl: null,
          bio: null,
          location: null,
          phone: null,
          mfaEnabled: false,
          googleLinked: false,
          createdAt: new Date().toISOString(),
        }),
      ),
    );

    render(
      <Shell initialEntries={['/dashboard?tab=overview&workspaceId=ws-smoke-1']}>
        <Routes>
          <Route path="/dashboard" element={<CompanyDashboard />} />
        </Routes>
      </Shell>,
    );

    await waitFor(() => {
      expect(screen.getByText('Active Orders')).toBeInTheDocument();
    });
    expect(screen.getByText('Pending Inbox')).toBeInTheDocument();
    expect(screen.getByText('Est. Earnings')).toBeInTheDocument();
  });

  it('Provider inbox shows segment controls and offer cards', async () => {
    const inboxApiRow = {
      id: 'att-smoke-1',
      status: 'invited',
      score: 0,
      distanceKm: 1,
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
        customerId: 'cust-1',
        serviceCatalogId: 'sc-smoke-1',
        serviceCatalog: { id: 'sc-smoke-1', name: 'Lawn Care', category: 'Outdoor' },
        answers: {},
        photos: [],
        description: 'Test',
        address: '100 Queen St, Toronto, ON',
        scheduledAt: null,
        scheduleFlexibility: 'asap',
        phase: 'offer',
        status: 'matching',
      },
      customer: {
        id: 'cust-1',
        displayName: 'Casey Customer',
        firstName: 'Casey',
        lastName: 'C',
        avatarUrl: null,
      },
      serviceCatalog: { id: 'sc-smoke-1', name: 'Lawn Care', category: 'Outdoor' },
    };

    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          id: 'prov-smoke-1',
          email: 'provider@test.local',
          displayName: 'Provider User',
          firstName: 'Provider',
          lastName: 'User',
          role: 'provider',
          status: 'active',
          companyId: 'ws-smoke-1',
          isVerified: true,
          avatarUrl: null,
          bio: null,
          location: null,
          phone: null,
          mfaEnabled: false,
          googleLinked: false,
          createdAt: new Date().toISOString(),
        }),
      ),
      http.get('/api/workspaces/:wsId/inbox-attempts', () =>
        HttpResponse.json({
          items: [inboxApiRow],
          total: 1,
          page: 1,
          pageSize: 25,
        }),
      ),
    );

    render(
      <Shell initialEntries={['/dashboard?tab=inbox&workspaceId=ws-smoke-1']}>
        <Routes>
          <Route path="/dashboard" element={<CompanyDashboard />} />
        </Routes>
      </Shell>,
    );

    await waitFor(() => {
      expect(screen.getByText('Provider Inbox')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Awaiting/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Acknowledged/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Lawn Care')).toBeInTheDocument();
    });
  });
});
