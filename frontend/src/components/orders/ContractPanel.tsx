import { useEffect, useState } from 'react'
import { FileText, Clock } from 'lucide-react'
import { fetchContractBundle, approveContract, rejectContract } from '../../services/orderContracts'
import type { ContractBundle, ContractVersion } from '../../services/orderContracts'

type Props = {
  orderId: string
  onApproved?: () => void
}

function VersionBadge({ status }: { status: ContractVersion['status'] }) {
  const cls: Record<ContractVersion['status'], string> = {
    draft:      'bg-gray-100 text-gray-700',
    sent:       'bg-blue-100 text-blue-800',
    approved:   'bg-green-100 text-green-800',
    rejected:   'bg-red-100 text-red-800',
    superseded: 'bg-gray-100 text-gray-400',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls[status]}`}>
      {status}
    </span>
  )
}

export function ContractPanel({ orderId, onApproved }: Props) {
  const [bundle, setBundle] = useState<ContractBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchContractBundle(orderId)
      .then(setBundle)
      .catch(() => setError('Failed to load contract.'))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-5 w-1/3 rounded bg-gray-200" />
        <div className="h-32 rounded bg-gray-100" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!bundle?.contract) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Clock className="h-8 w-8 text-gray-400" />
        </div>
        <p className="font-semibold text-gray-700">Waiting for provider to send a contract</p>
        <p className="text-sm text-gray-500">You'll be notified when a contract is ready for review.</p>
      </div>
    )
  }

  const current = bundle.contract.currentVersion
  const sentVersion = bundle.versions.find((v) => v.status === 'sent')
  const actionable = sentVersion ?? (current?.status === 'sent' ? current : null)

  async function handleApprove() {
    if (!actionable) return
    setBusy(true)
    try {
      await approveContract(orderId, actionable.id)
      const updated = await fetchContractBundle(orderId)
      setBundle(updated)
      onApproved?.()
    } catch {
      setError('Approval failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!actionable || rejectNote.trim().length < 5) return
    setBusy(true)
    try {
      await rejectContract(orderId, actionable.id, rejectNote.trim(), true)
      const updated = await fetchContractBundle(orderId)
      setBundle(updated)
      setShowReject(false)
      setRejectNote('')
    } catch {
      setError('Rejection failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const display = current ?? bundle.versions[0]

  return (
    <div className="space-y-4">
      {/* Current version */}
      {display && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-gray-900">{display.title}</span>
            </div>
            <VersionBadge status={display.status} />
          </div>

          {display.scopeSummary && (
            <p className="text-sm text-gray-600">{display.scopeSummary}</p>
          )}

          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {display.termsMarkdown}
          </div>

          {display.amount != null && (
            <p className="text-sm font-medium text-gray-800">
              Amount: {display.currency ?? ''} {display.amount.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* Approve / reject actions for the sent version */}
      {actionable && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleApprove}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {busy ? 'Processing…' : 'Approve contract'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowReject((v) => !v)}
            className="rounded-lg border border-red-300 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Request changes
          </button>
        </div>
      )}

      {showReject && (
        <div className="space-y-2">
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            placeholder="Describe what needs to change (min 5 chars)…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            disabled={rejectNote.trim().length < 5 || busy}
            onClick={handleReject}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Submit rejection
          </button>
        </div>
      )}

      {/* Version history */}
      {bundle.versions.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            Version history ({bundle.versions.length})
          </summary>
          <ul className="mt-2 space-y-1 pl-2">
            {bundle.versions.map((v) => (
              <li key={v.id} className="flex items-center gap-2 text-gray-600">
                <span>v{v.versionNumber}</span>
                <VersionBadge status={v.status} />
                <span className="text-xs text-gray-400">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
