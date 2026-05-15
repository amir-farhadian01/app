import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, FileText, Briefcase, XCircle, X } from 'lucide-react'
import { getMyOrders, cancelOrder } from '../../services/orders'
import type { OrderListItem, PhaseFacetCounts } from '../../services/orders'
import { OrderCard } from '../../components/orders/OrderCard'

// ── Types ──────────────────────────────────────────────────────────────────

type PhaseTab = 'offers' | 'orders' | 'jobs' | 'cancelled'

const TABS: { id: PhaseTab; label: string; icon: React.ReactNode }[] = [
  { id: 'offers',    label: 'Offers',         icon: <FileText className="h-4 w-4" /> },
  { id: 'orders',    label: 'Active Orders',  icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'jobs',      label: 'Completed',      icon: <Briefcase className="h-4 w-4" /> },
  { id: 'cancelled', label: 'Cancelled',      icon: <XCircle className="h-4 w-4" /> },
]

function tabCount(tab: PhaseTab, facets: PhaseFacetCounts | undefined): number {
  if (!facets) return 0
  if (tab === 'offers')    return facets.offer
  if (tab === 'orders')    return facets.order
  if (tab === 'jobs')      return facets.job
  if (tab === 'cancelled') return facets.cancelledOffer + facets.cancelledOrder + facets.cancelledJob
  return 0
}

// ── Empty states ───────────────────────────────────────────────────────────

const EMPTY: Record<PhaseTab, { icon: React.ReactNode; title: string; body: string }> = {
  offers: {
    icon: <FileText className="h-12 w-12 text-[#4a4f70]" />,
    title: 'No pending offers',
    body: 'Submit a service request and providers will respond here.',
  },
  orders: {
    icon: <ClipboardList className="h-12 w-12 text-[#4a4f70]" />,
    title: 'No active orders',
    body: 'Once matched with a provider your orders will appear here.',
  },
  jobs: {
    icon: <Briefcase className="h-12 w-12 text-[#4a4f70]" />,
    title: 'No completed jobs yet',
    body: 'Finished jobs will show up here so you can review them.',
  },
  cancelled: {
    icon: <XCircle className="h-12 w-12 text-[#4a4f70]" />,
    title: 'No cancelled orders',
    body: 'Orders you cancel will appear in this list.',
  },
}

function EmptyState({ tab }: { tab: PhaseTab }) {
  const { icon, title, body } = EMPTY[tab]
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#2a2f4a] bg-[#1a1d2e]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#f0f2ff]">{title}</h3>
      <p className="max-w-xs text-sm text-[#6a6e88]">{body}</p>
    </div>
  )
}

// ── Cancel modal ───────────────────────────────────────────────────────────

function CancelModal({
  order,
  onClose,
  onConfirmed,
}: {
  order: OrderListItem
  onClose: () => void
  onConfirmed: () => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await cancelOrder(order.id, reason.trim())
      onConfirmed()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#2a2f4a] bg-[#1e2235] p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#f0f2ff]">Cancel this order?</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#6a6e88] hover:text-[#f0f2ff]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[#6a6e88]">Please provide a reason (at least 5 characters).</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason…"
          className="w-full rounded-lg border border-[#2a2f4a] bg-[#1a1d2e] px-3 py-2 text-sm text-[#f0f2ff] placeholder-[#4a4f70] focus:outline-none focus:ring-2 focus:ring-[#2b6eff]"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#2a2f4a] py-2 text-sm font-semibold text-[#f0f2ff] hover:bg-[#1a1d2e]"
          >
            Keep order
          </button>
          <button
            type="button"
            disabled={reason.trim().length < 5 || busy}
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-[#ff4d4d] py-2 text-sm font-semibold text-white hover:bg-[#ff4d4d]/80 disabled:opacity-50"
          >
            {busy ? 'Cancelling…' : 'Confirm cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export default function MyOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('phase') as PhaseTab | null) ?? 'offers'

  const [items, setItems] = useState<OrderListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [facets, setFacets] = useState<PhaseFacetCounts | undefined>()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [cancelTarget, setCancelTarget] = useState<OrderListItem | null>(null)

  function setTab(tab: PhaseTab) {
    setSearchParams({ phase: tab }, { replace: true })
    setPage(1)
    setItems([])
    setSearch('')
  }

  useEffect(() => {
    setLoading(true)
    getMyOrders({ phase: activeTab, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]))
        setTotal(res.total)
        if (res.facets) setFacets(res.facets.phase)
      })
      .finally(() => setLoading(false))
  }, [activeTab, page])

  const displayed = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((o) => o.serviceCatalog.name.toLowerCase().includes(q))
  }, [items, search])

  const hasMore = items.length < total

  function handleCancelConfirmed() {
    setCancelTarget(null)
    // Refresh current tab
    setPage(1)
    setItems([])
    getMyOrders({ phase: activeTab, page: 1, pageSize: PAGE_SIZE }).then((res) => {
      setItems(res.items)
      setTotal(res.total)
      if (res.facets) setFacets(res.facets.phase)
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <h1 className="text-2xl font-bold text-[#f0f2ff]">My Orders</h1>

      {/* Phase tabs */}
      <div role="tablist" className="flex gap-1 border-b border-[#2a2f4a]">
        {TABS.map((t) => {
          const count = tabCount(t.id, facets)
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-[#2b6eff] text-[#2b6eff]'
                  : 'border-transparent text-[#6a6e88] hover:text-[#f0f2ff]'
              }`}
            >
              {t.icon}
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${active ? 'bg-[#2b6eff]/20 text-[#2b6eff]' : 'bg-[#1a1d2e] text-[#6a6e88]'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Filter by service name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-[#2a2f4a] bg-[#1a1d2e] px-3 py-2 text-sm text-[#f0f2ff] placeholder-[#4a4f70] focus:outline-none focus:ring-2 focus:ring-[#2b6eff]"
      />

      {/* List */}
      {loading && page === 1 ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2a2f4a] border-t-[#2b6eff]" />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <ul className="space-y-3">
          {displayed.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} onCancel={setCancelTarget} />
            </li>
          ))}
        </ul>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-[#2a2f4a] px-6 py-2 text-sm font-semibold text-[#f0f2ff] hover:bg-[#1a1d2e]"
          >
            Load more
          </button>
        </div>
      )}
      {loading && page > 1 && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2a2f4a] border-t-[#2b6eff]" />
        </div>
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelModal
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirmed={handleCancelConfirmed}
        />
      )}
    </div>
  )
}
