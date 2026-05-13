import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import type { OrderListItem } from '../../services/orders'
import { OrderStatusBadge } from './OrderStatusBadge'

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.min(5, Math.round(rating))
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rounded ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          strokeWidth={1.5}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
    </span>
  )
}

type Props = {
  order: OrderListItem
  onCancel: (order: OrderListItem) => void
}

export function OrderCard({ order, onCancel }: Props) {
  const { id, status, createdAt, serviceCatalog, matchedSummary, review } = order

  const providerName = matchedSummary
    ? [matchedSummary.provider.firstName, matchedSummary.provider.lastName].filter(Boolean).join(' ') ||
      matchedSummary.provider.displayName ||
      'Provider'
    : null

  const breadcrumb = serviceCatalog.breadcrumb.map((b) => b.name).join(' › ')

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{serviceCatalog.name}</p>
          {breadcrumb && <p className="text-xs text-gray-500 mt-0.5">{breadcrumb}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <OrderStatusBadge status={status} />
          <span className="text-xs text-gray-400">{relativeDate(createdAt)}</span>
        </div>
      </div>

      {/* Provider */}
      {providerName && matchedSummary && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
          {matchedSummary.provider.avatarUrl ? (
            <img
              src={matchedSummary.provider.avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
              {providerName[0].toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-gray-800">{providerName}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {status === 'draft' && (
          <Link to={`/app/orders/${id}`} className="text-sm font-semibold text-blue-600 hover:underline">
            Continue
          </Link>
        )}

        {(status === 'submitted' || status === 'matching' || status === 'matched') && (
          <>
            <Link to={`/app/orders/${id}`} className="text-sm font-semibold text-blue-600 hover:underline">
              View details
            </Link>
            <button
              type="button"
              onClick={() => onCancel(order)}
              className="text-sm font-semibold text-red-600 hover:underline"
            >
              Cancel
            </button>
          </>
        )}

        {status === 'contracted' && (
          <Link to={`/app/orders/${id}?tab=contract`} className="text-sm font-semibold text-violet-700 hover:underline">
            View contract
          </Link>
        )}

        {status === 'closed' && review === null && (
          <Link to={`/app/orders/${id}?rate=1`} className="text-sm font-semibold text-amber-600 hover:underline">
            Rate provider
          </Link>
        )}

        {status === 'closed' && review !== null && review !== undefined && (
          <StarRating rating={review.rating} />
        )}
      </div>
    </div>
  )
}
