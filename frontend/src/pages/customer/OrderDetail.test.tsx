import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OrderDetail from './OrderDetail'
import api from '../../lib/api'
import * as orderPayments from '../../services/orderPayments'
import { useAuthStore } from '../../store/authStore'

// Seed auth store with a test user so the Chat tab guard passes
beforeEach(() => {
  useAuthStore.setState({
    token: 'test-token',
    refreshToken: null,
    user: { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User', roles: ['CUSTOMER'] },
  })
})

// ── Helpers ────────────────────────────────────────────────────────────────

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ord-abc123',
    status: 'contracted',
    phase: 'job',
    createdAt: new Date().toISOString(),
    address: '123 Main St',
    description: 'Fix the roof',
    matchedProviderId: 'prov-1',
    matchedSummary: {
      provider: { id: 'prov-1', displayName: 'Jane Smith', firstName: 'Jane', lastName: 'Smith', avatarUrl: null },
      workspace: { id: 'ws-1', name: 'Smith Services' },
      package: { id: 'pkg-1', name: 'Basic', finalPrice: 200, currency: 'CAD' },
    },
    customerReview: null,
    customerContract: null,
    payment: null,
    ...overrides,
  }
}

function renderPage(orderId = 'ord-abc123', search = '') {
  return render(
    <MemoryRouter initialEntries={[`/app/orders/${orderId}${search}`]}>
      <Routes>
        <Route path="/app/orders/:id" element={<OrderDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('OrderDetail', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // AC2 — Payment button hidden when contractApproved !== true
  it('AC2 — payment button is hidden when contract is not approved', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: makeOrder({ status: 'contracted', customerContract: null }) })

    renderPage()

    await waitFor(() => expect(screen.queryByTestId('payment-button')).not.toBeInTheDocument())
  })

  it('AC2 — payment button is visible when contract is approved', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: makeOrder({
        status: 'contracted',
        customerContract: { id: 'c-1', currentVersion: { id: 'v-1', status: 'approved' } },
      }),
    })

    renderPage()

    await waitFor(() => expect(screen.getByTestId('payment-button')).toBeInTheDocument())
  })

  // AC3 — Clicking payment on non-contracted order renders a toast (not a crash)
  it('AC3 — payment button click without approval shows toast', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: makeOrder({
        status: 'contracted',
        customerContract: { id: 'c-1', currentVersion: { id: 'v-1', status: 'approved' } },
      }),
    })
    vi.spyOn(orderPayments, 'createPaymentSession').mockRejectedValue(
      new Error('409: CONTRACT_APPROVAL_REQUIRED'),
    )

    renderPage()

    await waitFor(() => expect(screen.getByTestId('payment-button')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('payment-button'))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    )
  })

  // AC4 — Dispute modal has a confirm step before calling the API
  it('AC4 — dispute modal requires confirmation before API call', async () => {
    const disputeSpy = vi.spyOn(orderPayments, 'submitDispute').mockResolvedValue(undefined)
    vi.spyOn(api, 'get').mockResolvedValue({ data: makeOrder({ status: 'contracted' }) })

    renderPage()

    await waitFor(() => expect(screen.getByTestId('dispute-button')).toBeInTheDocument())

    // Open modal
    fireEvent.click(screen.getByTestId('dispute-button'))
    expect(screen.getByRole('heading', { name: /open a dispute/i })).toBeInTheDocument()

    // API not called yet
    expect(disputeSpy).not.toHaveBeenCalled()

    // Fill reason and submit
    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: 'The provider did not show up at all for the job.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit dispute/i }))

    await waitFor(() => expect(disputeSpy).toHaveBeenCalledOnce())
  })

  // AC4 — Submit button is disabled until reason is long enough
  it('AC4 — dispute submit button disabled until reason >= 20 chars', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: makeOrder({ status: 'contracted' }) })

    renderPage()

    await waitFor(() => fireEvent.click(screen.getByTestId('dispute-button')))

    const submitBtn = screen.getByRole('button', { name: /submit dispute/i })
    expect(submitBtn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: 'Short' },
    })
    expect(submitBtn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: 'This is a long enough reason for a dispute.' },
    })
    expect(submitBtn).not.toBeDisabled()
  })

  // AC5 — Chat tab content is not fetched until the tab is clicked
  // The lazy() boundary doesn't create a real async split in jsdom, but the
  // conditional render (activeTab === 'chat') is the actual guard. We verify
  // that the chat panel is absent before the tab click and present after.
  it('AC5 — chat panel is not rendered until Chat tab is clicked', async () => {
    let chatFetchCount = 0
    vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/chat/')) {
        chatFetchCount++
        return Promise.resolve({ data: { thread: { id: 't-1', isClosed: false }, messages: [], role: 'customer' } })
      }
      return Promise.resolve({ data: makeOrder() })
    })

    renderPage() // starts on details tab

    // Wait for order to load
    await waitFor(() => expect(screen.getByText(/fix the roof/i)).toBeInTheDocument())

    // Chat fetch must not have happened yet
    expect(chatFetchCount).toBe(0)

    // Click Chat tab
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /chat/i }))
      await new Promise((r) => setTimeout(r, 100))
    })

    // After clicking, the chat panel mounts and fires its fetch
    await waitFor(() => expect(chatFetchCount).toBeGreaterThan(0), { timeout: 2000 })
  })

  // AC6 — tsc --noEmit passes (verified separately; this test guards runtime rendering)
  it('renders without crashing for a basic order', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: makeOrder() })
    renderPage()
    await waitFor(() => expect(screen.getByText(/fix the roof/i)).toBeInTheDocument())
  })
})
