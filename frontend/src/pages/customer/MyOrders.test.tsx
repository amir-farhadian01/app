import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MyOrders from './MyOrders'
import * as ordersService from '../../services/orders'
import type { MyOrdersResponse, OrderListItem } from '../../services/orders'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: 'ord-1',
    status: 'submitted',
    phase: 'offer',
    createdAt: new Date().toISOString(),
    serviceCatalog: {
      id: 'sc-1',
      name: 'House Cleaning',
      breadcrumb: [{ id: 'c1', name: 'Home', parentId: null }],
    },
    matchedProviderId: null,
    matchedSummary: null,
    review: null,
    ...overrides,
  }
}

function makeResponse(items: OrderListItem[], total = items.length): MyOrdersResponse {
  return {
    items,
    total,
    page: 1,
    pageSize: 10,
    facets: {
      phase: { offer: 2, order: 1, job: 3, cancelledOffer: 1, cancelledOrder: 0, cancelledJob: 0 },
    },
  }
}

function renderPage(initialSearch = '?phase=offers') {
  return render(
    <MemoryRouter initialEntries={[`/app/orders${initialSearch}`]}>
      <Routes>
        <Route path="/app/orders" element={<MyOrders />} />
        <Route path="/app/orders/:id" element={<div>OrderDetail</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('MyOrders', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('AC3 — clicking each tab fires GET /api/orders/me?phase=<correct_phase>', async () => {
    const spy = vi.spyOn(ordersService, 'getMyOrders').mockResolvedValue(makeResponse([]))

    renderPage()

    // Default tab (offers) fires on mount
    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ phase: 'offers' })))

    // Click Active Orders tab
    fireEvent.click(screen.getByRole('tab', { name: /active orders/i }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ phase: 'orders' })))

    // Click Completed tab
    fireEvent.click(screen.getByRole('tab', { name: /completed/i }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ phase: 'jobs' })))

    // Click Cancelled tab
    fireEvent.click(screen.getByRole('tab', { name: /cancelled/i }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ phase: 'cancelled' })))
  })

  it('AC4 — Cancel button is absent on closed and cancelled orders', async () => {
    const closedOrder = makeOrder({ id: 'ord-closed', status: 'closed', phase: 'job' })
    const cancelledOrder = makeOrder({ id: 'ord-cancelled', status: 'cancelled', phase: 'offer' })

    vi.spyOn(ordersService, 'getMyOrders').mockResolvedValue(makeResponse([closedOrder, cancelledOrder]))

    renderPage()

    await waitFor(() => expect(screen.queryAllByRole('button', { name: /cancel/i })).toHaveLength(0))
  })

  it('AC5 — "Rate provider" only appears when review===null && status===closed', async () => {
    const closedNoReview = makeOrder({ id: 'ord-a', status: 'closed', review: null })
    const closedWithReview = makeOrder({
      id: 'ord-b',
      status: 'closed',
      review: { rating: 4, reviewText: 'Great!', createdAt: new Date().toISOString() },
    })
    const submittedNoReview = makeOrder({ id: 'ord-c', status: 'submitted', review: null })

    vi.spyOn(ordersService, 'getMyOrders').mockResolvedValue(
      makeResponse([closedNoReview, closedWithReview, submittedNoReview]),
    )

    renderPage()

    await waitFor(() => {
      const rateLinks = screen.queryAllByRole('link', { name: /rate provider/i })
      // Only the closed+no-review order should show "Rate provider"
      expect(rateLinks).toHaveLength(1)
    })
  })

  it('shows facet counts from API response on tab badges', async () => {
    vi.spyOn(ordersService, 'getMyOrders').mockResolvedValue(makeResponse([]))

    renderPage()

    await waitFor(() => {
      // offer count = 2 from facets
      expect(screen.getByRole('tab', { name: /offers/i }).textContent).toContain('2')
      // order count = 1
      expect(screen.getByRole('tab', { name: /active orders/i }).textContent).toContain('1')
      // job count = 3
      expect(screen.getByRole('tab', { name: /completed/i }).textContent).toContain('3')
      // cancelled = 1+0+0 = 1
      expect(screen.getByRole('tab', { name: /cancelled/i }).textContent).toContain('1')
    })
  })

  it('shows empty state when no orders returned', async () => {
    vi.spyOn(ordersService, 'getMyOrders').mockResolvedValue(makeResponse([]))

    renderPage()

    await waitFor(() => expect(screen.getByText(/no pending offers/i)).toBeInTheDocument())
  })

  it('client-side search filters by service name without new API call', async () => {
    const spy = vi.spyOn(ordersService, 'getMyOrders').mockResolvedValue(
      makeResponse([
        makeOrder({ id: 'ord-1', serviceCatalog: { id: 'sc-1', name: 'House Cleaning', breadcrumb: [] } }),
        makeOrder({ id: 'ord-2', serviceCatalog: { id: 'sc-2', name: 'Lawn Mowing', breadcrumb: [] } }),
      ]),
    )

    renderPage()

    await waitFor(() => expect(screen.getByText('House Cleaning')).toBeInTheDocument())

    const callsBefore = spy.mock.calls.length

    fireEvent.change(screen.getByPlaceholderText(/filter by service name/i), {
      target: { value: 'lawn' },
    })

    expect(screen.queryByText('House Cleaning')).not.toBeInTheDocument()
    expect(screen.getByText('Lawn Mowing')).toBeInTheDocument()
    // No additional API call
    expect(spy.mock.calls.length).toBe(callsBefore)
  })

  it('shows load-more button when total > loaded items', async () => {
    vi.spyOn(ordersService, 'getMyOrders').mockResolvedValue(
      makeResponse([makeOrder()], 25), // total=25, items=1
    )

    renderPage()

    await waitFor(() => expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument())
  })
})
