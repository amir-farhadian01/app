import api from '../lib/api'

export const getOrders = () => api.get('/orders').then((r) => r.data)
export const getOrder = (id: string) => api.get(`/orders/${id}`).then((r) => r.data)
export const createOrder = (payload: unknown) => api.post('/orders', payload).then((r) => r.data)

// ── My Orders pipeline types ──────────────────────────────────────────────

export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'matching'
  | 'matched'
  | 'contracted'
  | 'paid'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled'

export type OrderPhase = 'offer' | 'order' | 'job'

export type OrderReview = {
  rating: number
  reviewText: string | null
  createdAt: string
}

export type ProviderSummary = {
  id: string
  displayName: string | null
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
}

export type OrderListItem = {
  id: string
  status: OrderStatus
  phase: OrderPhase | null
  createdAt: string
  serviceCatalog: {
    id: string
    name: string
    breadcrumb: { id: string; name: string; parentId: string | null }[]
  }
  matchedProviderId: string | null
  matchedSummary?: {
    provider: ProviderSummary
    workspace: { id: string; name: string }
    package: { id: string; name: string; finalPrice: number; currency: string }
  } | null
  review: OrderReview | null
}

export type PhaseFacetCounts = {
  offer: number
  order: number
  job: number
  cancelledOffer: number
  cancelledOrder: number
  cancelledJob: number
}

export type MyOrdersResponse = {
  items: OrderListItem[]
  total: number
  page: number
  pageSize: number
  facets?: { phase: PhaseFacetCounts }
}

export type MyOrdersParams = {
  phase?: string
  page?: number
  pageSize?: number
}

export async function getMyOrders(params: MyOrdersParams = {}): Promise<MyOrdersResponse> {
  const res = await api.get<MyOrdersResponse>('/orders/me', { params })
  return res.data
}

export async function cancelOrder(orderId: string, reason: string): Promise<void> {
  await api.post(`/orders/${orderId}/cancel`, { reason })
}
