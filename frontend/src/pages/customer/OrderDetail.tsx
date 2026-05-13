import { lazy, Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge'
import { NextStepBanner } from '../../components/orders/NextStepBanner'
import { ContractPanel } from '../../components/orders/ContractPanel'
import { createPaymentSession, submitDispute } from '../../services/orderPayments'
import type { OrderStatus } from '../../services/orders'

// Chat is loaded lazily — not fetched until the Chat tab is clicked
const OrderChatPanel = lazy(() =>
  import('../../components/orders/OrderChatPanel').then((m) => ({ default: m.OrderChatPanel })),
)

// ── Types ──────────────────────────────────────────────────────────────────

type OrderDetail = {
  id: string
  status: OrderStatus
  phase: string | null
  createdAt: string
  address: string
  description: string
  matchedProviderId: string | null
  matchedSummary?: {
    provider: { id: string; displayName: string | null; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null }
    workspace: { id: string; name: string }
    package: { id: string; name: string; finalPrice: number; currency: string }
  } | null
  customerReview?: { rating: number; reviewText: string | null; createdAt: string } | null
  customerContract?: { id: string; currentVersion: { id: string; status: string } | null } | null
  payment?: { status: string; lastAmount: number | null; currency: string | null } | null
}

type Tab = 'details' | 'contract' | 'chat'

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-1/2 rounded bg-gray-200" />
      <div className="h-4 w-1/4 rounded bg-gray-100" />
      <div className="h-20 rounded-xl bg-gray-100" />
      <div className="h-12 rounded-xl bg-gray-100" />
      <div className="h-40 rounded-xl bg-gray-100" />
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3 text-sm text-white shadow-xl"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="ml-2 text-gray-400 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Dispute modal ──────────────────────────────────────────────────────────

function DisputeModal({
  orderId,
  onClose,
  onSubmitted,
}: {
  orderId: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (reason.trim().length < 20) return
    setBusy(true)
    try {
      await submitDispute(orderId, reason.trim())
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dispute submission failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Open a dispute</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Please describe the issue in detail (at least 20 characters). Our team will review it.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Describe the issue…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={reason.trim().length < 20 || busy}
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit dispute'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab | null) ?? 'details'
  const user = useAuthStore((s) => s.user)

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [contractApproved, setContractApproved] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<OrderDetail>(`/orders/${id}`)
      .then((res) => {
        setOrder(res.data)
        const cvStatus = res.data.customerContract?.currentVersion?.status
        setContractApproved(cvStatus === 'approved')
      })
      .catch(() => setToast('Failed to load order.'))
      .finally(() => setLoading(false))
  }, [id])

  function setTab(tab: Tab) {
    setSearchParams({ tab }, { replace: true })
  }

  async function handlePayment() {
    if (!id) return
    if (!contractApproved) {
      setToast('Contract approval is required before payment.')
      return
    }
    setPaymentBusy(true)
    try {
      const session = await createPaymentSession(id)
      window.location.href = session.paymentUrl
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('CONTRACT_APPROVAL_REQUIRED') || msg.includes('409')) {
        setToast('Contract must be approved before you can pay.')
      } else {
        setToast(msg || 'Payment session could not be created.')
      }
    } finally {
      setPaymentBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Skeleton />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-500">Order not found.</p>
      </div>
    )
  }

  const providerName = order.matchedSummary
    ? [order.matchedSummary.provider.firstName, order.matchedSummary.provider.lastName]
        .filter(Boolean)
        .join(' ') || order.matchedSummary.provider.displayName || 'Provider'
    : null

  const canDispute = order.status === 'contracted' || order.status === 'closed'
  const showPayment = contractApproved && order.status === 'contracted'

  const TABS: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'contract', label: 'Contract' },
    { id: 'chat', label: 'Chat' },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Order #{order.id.slice(-6).toUpperCase()}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Next-step banner */}
      <NextStepBanner status={order.status} contractApproved={contractApproved} />

      {/* Payment button */}
      {showPayment && (
        <button
          type="button"
          disabled={paymentBusy}
          onClick={() => void handlePayment()}
          data-testid="payment-button"
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {paymentBusy ? 'Redirecting…' : 'Proceed to payment'}
        </button>
      )}

      {/* Tabs */}
      <div role="tablist" className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Description</p>
            <p className="text-sm text-gray-600">{order.description || '—'}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
            <p className="text-sm font-semibold text-gray-700">Address</p>
            <p className="text-sm text-gray-600">{order.address || '—'}</p>
          </div>

          {providerName && order.matchedSummary && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
              {order.matchedSummary.provider.avatarUrl ? (
                <img
                  src={order.matchedSummary.provider.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                  {providerName[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Provider</p>
                <p className="font-semibold text-gray-900">{providerName}</p>
                <p className="text-xs text-gray-500">{order.matchedSummary.workspace.name}</p>
              </div>
            </div>
          )}

          {/* Dispute button */}
          {canDispute && (
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              data-testid="dispute-button"
              className="text-sm font-semibold text-red-600 hover:underline"
            >
              Open a dispute
            </button>
          )}
        </div>
      )}

      {activeTab === 'contract' && id && (
        <ContractPanel
          orderId={id}
          onApproved={() => {
            setContractApproved(true)
            // Refresh order to pick up status change
            api.get<OrderDetail>(`/orders/${id}`).then((res) => setOrder(res.data)).catch(() => null)
          }}
        />
      )}

      {activeTab === 'chat' && id && user && (
        <Suspense
          fallback={
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((n) => <div key={n} className="h-10 rounded-lg bg-gray-100" />)}
            </div>
          }
        >
          <OrderChatPanel orderId={id} currentUserId={user.id} />
        </Suspense>
      )}

      {/* Dispute modal */}
      {showDispute && id && (
        <DisputeModal
          orderId={id}
          onClose={() => setShowDispute(false)}
          onSubmitted={() => {
            setShowDispute(false)
            setToast('Dispute submitted. Our team will review it shortly.')
            api.get<OrderDetail>(`/orders/${id}`).then((res) => setOrder(res.data)).catch(() => null)
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
