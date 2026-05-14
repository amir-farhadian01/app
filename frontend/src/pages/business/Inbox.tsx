import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  InboxIcon,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  FileText,
  Send,
  ThumbsUp,
  Loader2,
} from 'lucide-react'
import { getOffers, acceptOffer, acknowledgeOffer, declineOffer, submitLostFeedback, type OfferMatchAttempt } from '../../services/business'

type Tab = 'active' | 'history' | 'completed'

const STATUS_LABELS: Record<string, string> = {
  invited: 'Invited',
  matched: 'Matched',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  superseded: 'Superseded',
  lost: 'Lost',
  acknowledged: 'Acknowledged',
}

const STATUS_COLORS: Record<string, string> = {
  invited: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  matched: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  accepted: 'text-green-400 bg-green-500/10 border-green-500/30',
  declined: 'text-red-400 bg-red-500/10 border-red-500/30',
  expired: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  superseded: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  lost: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  acknowledged: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
}

function formatCurrency(cents: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff < 24 * 60 * 60 * 1000
}

// ─── Offer Card ───────────────────────────────────────────────────────────────

function OfferCard({
  offer,
  onAccept,
  onAcknowledge,
  onDecline,
  onLostFeedback,
  isPending,
}: {
  offer: OfferMatchAttempt
  onAccept: () => void
  onAcknowledge: () => void
  onDecline: () => void
  onLostFeedback: () => void
  isPending: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const expiring = isExpiringSoon(offer.expiresAt)

  return (
    <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4 transition-all hover:border-[#3a3f5a]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[#f0f2ff] truncate">
              {offer.customer.displayName || offer.customer.email}
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[offer.status] || 'text-gray-400'}`}>
              {STATUS_LABELS[offer.status] || offer.status}
            </span>
            {expiring && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                <Clock className="h-3 w-3" />
                Expiring
              </span>
            )}
          </div>
          <p className="text-sm text-[#8a8ea8]">
            {offer.serviceCatalog.name} · {offer.package.name}
          </p>
          <p className="text-xs text-[#6a6e88] mt-0.5">
            {timeAgo(offer.invitedAt)} · {offer.order.address}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-[#f0f2ff]">
            {formatCurrency(offer.package.finalPrice, offer.package.currency)}
          </p>
          <p className="text-xs text-[#6a6e88]">
            {offer.package.durationMinutes ? `${offer.package.durationMinutes} min` : 'Flexible'}
          </p>
        </div>
      </div>

      {/* Action buttons for active offers */}
      {(offer.status === 'invited' || offer.status === 'matched') && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#2a2f4a] pt-3">
          {offer.status === 'invited' && (
            <button
              onClick={onAccept}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2b6eff] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2458cc] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
              Accept
            </button>
          )}
          {offer.status === 'matched' && (
            <button
              onClick={onAcknowledge}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2b6eff] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2458cc] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Acknowledge & Start
            </button>
          )}
          <button
            onClick={onDecline}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#3a3f5a] px-3 py-1.5 text-xs font-medium text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a] disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Decline
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#3a3f5a] px-3 py-1.5 text-xs font-medium text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto inline-flex items-center gap-1 text-xs text-[#6a6e88] hover:text-[#f0f2ff]"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Details
          </button>
        </div>
      )}

      {/* Lost deal feedback prompt */}
      {offer.status === 'lost' && !offer.lostFeedback && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/5 p-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400" />
          <p className="flex-1 text-xs text-orange-300">Help us improve — tell us why this deal was lost.</p>
          <button
            onClick={onLostFeedback}
            className="rounded-lg bg-orange-500/20 px-2.5 py-1 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-500/30"
          >
            Give Feedback
          </button>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-[#2a2f4a] pt-3 text-sm text-[#8a8ea8]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-[#6a6e88]">Description</span>
              <p className="text-[#f0f2ff]">{offer.order.description}</p>
            </div>
            <div>
              <span className="text-xs text-[#6a6e88]">Address</span>
              <p className="text-[#f0f2ff]">{offer.order.address}</p>
            </div>
          </div>
          {offer.order.scheduledAt && (
            <div>
              <span className="text-xs text-[#6a6e88]">Scheduled</span>
              <p className="text-[#f0f2ff]">{new Date(offer.order.scheduledAt).toLocaleString()}</p>
            </div>
          )}
          {offer.declineReason && (
            <div>
              <span className="text-xs text-[#6a6e88]">Decline Reason</span>
              <p className="text-red-400">{offer.declineReason}</p>
            </div>
          )}
          {offer.lostReason && (
            <div>
              <span className="text-xs text-[#6a6e88]">Lost Reason</span>
              <p className="text-orange-400">{offer.lostReason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Completed Order Row ──────────────────────────────────────────────────────

function CompletedOrderRow({ offer }: { offer: OfferMatchAttempt }) {
  return (
    <tr className="border-b border-[#2a2f4a] transition-colors hover:bg-[#1a1d2e]/50">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-[#f0f2ff]">{offer.customer.displayName || offer.customer.email}</p>
        <p className="text-xs text-[#6a6e88]">{offer.customer.email}</p>
      </td>
      <td className="px-4 py-3 text-sm text-[#f0f2ff]">{offer.package.name}</td>
      <td className="px-4 py-3 text-sm text-[#f0f2ff]">—</td>
      <td className="px-4 py-3 text-sm font-medium text-[#f0f2ff]">
        {formatCurrency(offer.package.finalPrice, offer.package.currency)}
      </td>
      <td className="px-4 py-3 text-sm text-[#8a8ea8]">
        {new Date(offer.invitedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button className="rounded-lg border border-[#3a3f5a] p-1.5 text-[#6a6e88] transition-colors hover:bg-[#2a2f4a] hover:text-[#f0f2ff]">
            <FileText className="h-3.5 w-3.5" />
          </button>
          <button className="rounded-lg border border-[#3a3f5a] p-1.5 text-[#6a6e88] transition-colors hover:bg-[#2a2f4a] hover:text-[#f0f2ff]">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main Inbox Page ─────────────────────────────────────────────────────────

export default function Inbox() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [declineModal, setDeclineModal] = useState<{ attemptId: string } | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [lostFeedbackModal, setLostFeedbackModal] = useState<{ attemptId: string } | null>(null)
  const [lostReasons, setLostReasons] = useState<string[]>([])
  const [lostComment, setLostComment] = useState('')

  // Determine status filter based on tab
  const statusParam = (() => {
    switch (activeTab) {
      case 'active':
        return ['invited', 'matched']
      case 'history':
        return ['declined', 'expired', 'superseded', 'lost']
      case 'completed':
        return ['accepted', 'acknowledged']
      default:
        return undefined
    }
  })()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inbox', workspaceId, activeTab, page],
    queryFn: () =>
      getOffers(workspaceId!, {
        status: statusParam,
        page,
        pageSize: 20,
      }),
    enabled: !!workspaceId,
  })

  const acceptMutation = useMutation({
    mutationFn: (attemptId: string) => acceptOffer(workspaceId!, attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', workspaceId] })
    },
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (attemptId: string) => acknowledgeOffer(workspaceId!, attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', workspaceId] })
    },
  })

  const declineMutation = useMutation({
    mutationFn: ({ attemptId, reason }: { attemptId: string; reason: string }) =>
      declineOffer(workspaceId!, attemptId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', workspaceId] })
      setDeclineModal(null)
      setDeclineReason('')
    },
  })

  const lostFeedbackMutation = useMutation({
    mutationFn: ({ attemptId, reasons, comment }: { attemptId: string; reasons: string[]; comment: string }) =>
      submitLostFeedback(workspaceId!, attemptId, {
        reasons,
        otherText: comment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', workspaceId] })
      setLostFeedbackModal(null)
      setLostReasons([])
      setLostComment('')
    },
  })

  const filteredOffers = data?.items?.filter((offer) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      offer.customer.displayName?.toLowerCase().includes(q) ||
      offer.customer.email.toLowerCase().includes(q) ||
      offer.serviceCatalog.name.toLowerCase().includes(q) ||
      offer.package.name.toLowerCase().includes(q)
    )
  }) ?? []

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'active', label: 'Active', icon: <InboxIcon className="h-4 w-4" /> },
    { key: 'history', label: 'History', icon: <Clock className="h-4 w-4" /> },
    { key: 'completed', label: 'Completed Orders', icon: <CheckCircle className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f2ff]">Inbox</h1>
          <p className="text-sm text-[#8a8ea8]">Manage incoming offers and orders</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1) }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[#2b6eff] text-white'
                : 'text-[#8a8ea8] hover:text-[#f0f2ff]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6a6e88]" />
        <input
          type="text"
          placeholder="Search by client, service, or package..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] py-2.5 pl-10 pr-4 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none transition-colors focus:border-[#2b6eff]"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2b6eff]" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-300">Failed to load inbox. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredOffers.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-12 text-center">
          <InboxIcon className="h-12 w-12 text-[#3a3f5a]" />
          <h3 className="text-lg font-semibold text-[#f0f2ff]">No {activeTab === 'active' ? 'active' : activeTab === 'history' ? 'historical' : 'completed'} offers</h3>
          <p className="text-sm text-[#8a8ea8]">
            {activeTab === 'active'
              ? 'When customers send service requests, they will appear here.'
              : activeTab === 'history'
              ? 'Declined, expired, or lost deals will appear here.'
              : 'Accepted and completed orders will appear here.'}
          </p>
        </div>
      )}

      {/* Active / History offer cards */}
      {!isLoading && !error && activeTab !== 'completed' && filteredOffers.length > 0 && (
        <div className="space-y-3">
          {filteredOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onAccept={() => acceptMutation.mutate(offer.id)}
              onAcknowledge={() => acknowledgeMutation.mutate(offer.id)}
              onDecline={() => setDeclineModal({ attemptId: offer.id })}
              onLostFeedback={() => setLostFeedbackModal({ attemptId: offer.id })}
              isPending={acceptMutation.isPending || acknowledgeMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Completed orders table */}
      {!isLoading && !error && activeTab === 'completed' && filteredOffers.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2a2f4a] text-xs font-medium uppercase tracking-wider text-[#6a6e88]">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Package Sold</th>
                <th className="px-4 py-3">Staff Assigned</th>
                <th className="px-4 py-3">Amount Charged</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.map((offer) => (
                <CompletedOrderRow key={offer.id} offer={offer} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#6a6e88]">
            Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-[#2a2f4a] px-3 py-1.5 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(data.total / data.pageSize)}
              className="rounded-lg border border-[#2a2f4a] px-3 py-1.5 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {declineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-6">
            <h3 className="text-lg font-semibold text-[#f0f2ff]">Decline Offer</h3>
            <p className="mt-1 text-sm text-[#8a8ea8]">Please provide a reason for declining this offer.</p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., Schedule conflict, out of service area..."
              rows={3}
              className="mt-4 w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] p-3 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none transition-colors focus:border-[#2b6eff]"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setDeclineModal(null); setDeclineReason('') }}
                className="rounded-lg border border-[#3a3f5a] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
              >
                Cancel
              </button>
              <button
                onClick={() => declineMutation.mutate({ attemptId: declineModal.attemptId, reason: declineReason })}
                disabled={!declineReason.trim() || declineMutation.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {declineMutation.isPending ? 'Declining...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Feedback Modal */}
      {lostFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-6">
            <h3 className="text-lg font-semibold text-[#f0f2ff]">Lost Deal Feedback</h3>
            <p className="mt-1 text-sm text-[#8a8ea8]">What caused this deal to be lost?</p>
            <div className="mt-4 space-y-2">
              {['price', 'schedule_mismatch', 'distance', 'quality_concern', 'customer_unresponsive', 'other'].map((reason) => (
                <label key={reason} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={lostReasons.includes(reason)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLostReasons([...lostReasons, reason])
                      } else {
                        setLostReasons(lostReasons.filter((r) => r !== reason))
                      }
                    }}
                    className="rounded border-[#3a3f5a] bg-[#0d0f1a] text-[#2b6eff] outline-none"
                  />
                  <span className="text-sm text-[#f0f2ff] capitalize">{reason.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
            <textarea
              value={lostComment}
              onChange={(e) => setLostComment(e.target.value)}
              placeholder="Additional comments..."
              rows={2}
              className="mt-4 w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] p-3 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none transition-colors focus:border-[#2b6eff]"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setLostFeedbackModal(null); setLostReasons([]); setLostComment('') }}
                className="rounded-lg border border-[#3a3f5a] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
              >
                Cancel
              </button>
              <button
                onClick={() => lostFeedbackMutation.mutate({ attemptId: lostFeedbackModal.attemptId, reasons: lostReasons, comment: lostComment })}
                disabled={lostReasons.length === 0 || lostFeedbackMutation.isPending}
                className="rounded-lg bg-[#2b6eff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2458cc] disabled:opacity-50"
              >
                {lostFeedbackMutation.isPending ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
