import type { OrderStatus } from '../../services/orders'

const CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  draft:       { label: 'Draft',       className: 'bg-amber-100 text-amber-800' },
  submitted:   { label: 'Submitted',   className: 'bg-blue-100 text-blue-800' },
  matching:    { label: 'Matching',    className: 'bg-yellow-100 text-yellow-900' },
  matched:     { label: 'Matched',     className: 'bg-emerald-100 text-emerald-900' },
  contracted:  { label: 'Contracted',  className: 'bg-sky-100 text-sky-900' },
  paid:        { label: 'Paid',        className: 'bg-sky-100 text-sky-900' },
  in_progress: { label: 'In Progress', className: 'bg-sky-100 text-sky-900' },
  completed:   { label: 'Completed',   className: 'bg-purple-100 text-purple-900' },
  closed:      { label: 'Closed',      className: 'bg-slate-200 text-slate-800' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-100 text-red-800' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
