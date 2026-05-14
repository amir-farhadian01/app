import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  Users,
  Search,
  Mail,
  Phone,
  ShoppingBag,
  DollarSign,
  Loader2,
  AlertTriangle,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react'
import { getClients, getClientDetail, type WorkspaceClient } from '../../services/business'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Client Detail Drawer ─────────────────────────────────────────────────────

function ClientDetailDrawer({
  clientId,
  workspaceId,
  onClose,
}: {
  clientId: string
  workspaceId: string
  onClose: () => void
}) {
  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['client-detail', workspaceId, clientId],
    queryFn: () => getClientDetail(workspaceId, clientId),
    enabled: !!workspaceId && !!clientId,
  })

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="w-full max-w-lg border-l border-[#2a2f4a] bg-[#0d0f1a] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a2f4a] bg-[#0d0f1a]/95 p-4 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-[#f0f2ff]">Client Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#6a6e88] transition-colors hover:bg-[#2a2f4a] hover:text-[#f0f2ff]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#2b6eff]" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-300">Failed to load client details</p>
          </div>
        )}

        {detail && !isLoading && (
          <div className="p-4 space-y-6">
            {/* Client info */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2b6eff]/20 text-lg font-bold text-[#2b6eff]">
                {(detail.displayName || detail.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f0f2ff]">{detail.displayName || 'Unnamed'}</h3>
                <p className="text-sm text-[#8a8ea8]">{detail.email}</p>
                {detail.phone && (
                  <p className="text-sm text-[#8a8ea8]">{detail.phone}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-3">
                <div className="flex items-center gap-2 text-xs text-[#6a6e88]">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Total Orders
                </div>
                <p className="mt-1 text-xl font-bold text-[#f0f2ff]">{detail.orders?.length || 0}</p>
              </div>
              <div className="rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-3">
                <div className="flex items-center gap-2 text-xs text-[#6a6e88]">
                  <DollarSign className="h-3.5 w-3.5" />
                  Total Spent
                </div>
                <p className="mt-1 text-xl font-bold text-[#f0f2ff]">{formatCurrency(detail.totalSpent)}</p>
              </div>
            </div>

            {/* Order History */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-[#f0f2ff]">Order History</h4>
              {detail.orders && detail.orders.length > 0 ? (
                <div className="space-y-2">
                  {detail.orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#f0f2ff]">
                          {order.serviceCatalog?.name || 'Unknown Service'}
                        </p>
                        <span className="rounded-full border border-[#2a2f4a] bg-[#0d0f1a] px-2 py-0.5 text-[10px] font-medium text-[#6a6e88] capitalize">
                          {order.invoice?.status || 'N/A'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[#6a6e88]">
                        <span>{formatDate(order.createdAt?.toISOString?.() || null)}</span>
                        {order.invoice && (
                          <span>{formatCurrency(order.invoice.total)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6a6e88]">No orders yet</p>
              )}
            </div>

            {/* Invoices */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-[#f0f2ff]">Invoices</h4>
              {detail.orders?.some((o) => o.invoice) ? (
                <div className="space-y-2">
                  {detail.orders.filter((o) => o.invoice).map((order) => (
                    <div
                      key={order.invoice!.id}
                      className="flex items-center justify-between rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-3"
                    >
                      <div>
                        <p className="text-sm text-[#f0f2ff]">
                          Invoice #{order.invoice!.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-[#6a6e88]">
                          {formatDate(order.invoice!.createdAt?.toISOString?.() || null)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#f0f2ff]">
                          {formatCurrency(order.invoice!.total)}
                        </p>
                        <span className={`text-xs ${
                          order.invoice!.status === 'PAID' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {order.invoice!.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6a6e88]">No invoices yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Clients Page ────────────────────────────────────────────────────────

export default function Clients() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clients', workspaceId, searchQuery, page],
    queryFn: () =>
      getClients(workspaceId!, {
        search: searchQuery || undefined,
        page,
        pageSize: 20,
      }),
    enabled: !!workspaceId,
  })

  const clients = data?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f2ff]">Clients</h1>
          <p className="text-sm text-[#8a8ea8]">Manage your client relationships</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6a6e88]" />
        <input
          type="text"
          placeholder="Search clients by name or email..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
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
          <p className="text-sm text-red-300">Failed to load clients. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && clients.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-12 text-center">
          <Users className="h-12 w-12 text-[#3a3f5a]" />
          <h3 className="text-lg font-semibold text-[#f0f2ff]">No clients yet</h3>
          <p className="text-sm text-[#8a8ea8]">
            {searchQuery
              ? 'No clients match your search criteria.'
              : 'Clients will appear here once they place orders with your business.'}
          </p>
        </div>
      )}

      {/* Client list */}
      {!isLoading && !error && clients.length > 0 && (
        <div className="space-y-3">
          {clients.map((client: WorkspaceClient) => (
            <button
              key={client.id}
              onClick={() => setSelectedClientId(client.id)}
              className="w-full rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4 text-left transition-all hover:border-[#3a3f5a] hover:bg-[#1a1d2e]/80"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2b6eff]/20 text-base font-bold text-[#2b6eff]">
                  {(client.displayName || client.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#f0f2ff] truncate">
                      {client.displayName || 'Unnamed Client'}
                    </h3>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#6a6e88]" />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#6a6e88]">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </span>
                    {client.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[#f0f2ff]">
                    {formatCurrency(client.totalSpent)}
                  </p>
                  <p className="text-xs text-[#6a6e88]">
                    {client.orderCount} order{client.orderCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
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

      {/* Client Detail Drawer */}
      {selectedClientId && workspaceId && (
        <ClientDetailDrawer
          clientId={selectedClientId}
          workspaceId={workspaceId}
          onClose={() => setSelectedClientId(null)}
        />
      )}
    </div>
  )
}
