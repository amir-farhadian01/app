import { Info } from 'lucide-react'
import type { OrderStatus } from '../../services/orders'

const MESSAGES: Partial<Record<OrderStatus, string>> = {
  matched: 'Your provider has been assigned. Review their profile.',
  contracted: 'A contract has been sent. Please review and approve.',
  closed: "Order complete. Don't forget to leave a review.",
}

// The API transitions to 'contracted' after approval; we surface the payment
// prompt via the payment button rather than a separate status value.
// 'approved_contract' is not a real DB status — map it from contract data in the parent.

type Props = {
  status: OrderStatus
  contractApproved?: boolean
}

export function NextStepBanner({ status, contractApproved }: Props) {
  const message =
    contractApproved && status === 'contracted'
      ? 'Contract approved! Proceed to payment.'
      : MESSAGES[status]

  if (!message) return null

  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  )
}
