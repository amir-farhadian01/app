import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  FileText,
  Send,
  Plus,
  X,
} from 'lucide-react'
import { getFinance, getInvoices, createInvoice, sendInvoice, type Invoice, type CreateInvoicePayload } from '../../services/business'

type Tab = 'transactions' | 'invoices' | 'payment-gateway'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const STATUS_COLORS: Record<string, string> = {
  PAID: 'text-green-400 bg-green-500/10 border-green-500/30',
  SENT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DRAFT: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  OVERDUE: 'text-red-400 bg-red-500/10 border-red-500/30',
  CANCELLED: 'text-gray-500 bg-gray-500/5 border-gray-500/20',
}

// ─── Invoice Form Modal ───────────────────────────────────────────────────────

function InvoiceFormModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }])
  const [tax, setTax] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const total = subtotal + tax

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])
  }

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const updated = [...lineItems]
    ;(updated[index] as Record<string, unknown>)[field] = value
    setLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!customerId.trim()) {
      setError('Customer ID is required')
      return
    }
    if (lineItems.some((item) => !item.description.trim())) {
      setError('All line items must have a description')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const payload: CreateInvoicePayload = {
        customerId: customerId.trim(),
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        tax,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      }
      await createInvoice(workspaceId, payload)
      onCreated()
      onClose()
    } catch (err) {
      setError('Failed to create invoice. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#f0f2ff]">Create Invoice</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#6a6e88] hover:bg-[#2a2f4a] hover:text-[#f0f2ff]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[#8a8ea8] mb-4">Create a new invoice for a client.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#f0f2ff] mb-1">Customer ID *</label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter customer user ID..."
              className="w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none transition-colors focus:border-[#2b6eff]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[#f0f2ff]">Line Items *</label>
              <button
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-xs text-[#2b6eff] hover:text-[#2458cc]"
              >
                <Plus className="h-3 w-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none focus:border-[#2b6eff]"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    min={1}
                    className="w-16 rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-2 py-2 text-sm text-[#f0f2ff] text-center outline-none focus:border-[#2b6eff]"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-24 rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-2 py-2 text-sm text-[#f0f2ff] text-right outline-none focus:border-[#2b6eff]"
                  />
                  {lineItems.length > 1 && (
                    <button
                      onClick={() => removeLineItem(index)}
                      className="rounded-lg p-2 text-[#6a6e88] hover:bg-[#2a2f4a] hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#f0f2ff] mb-1">Tax (cents)</label>
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-[#f0f2ff] outline-none focus:border-[#2b6eff]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f2ff] mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-[#f0f2ff] outline-none focus:border-[#2b6eff]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f0f2ff] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none focus:border-[#2b6eff]"
            />
          </div>

          <div className="rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] p-3">
            <div className="flex justify-between text-sm text-[#8a8ea8]">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#8a8ea8] mt-1">
              <span>Tax</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#f0f2ff] mt-2 pt-2 border-t border-[#2a2f4a]">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#3a3f5a] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-[#2b6eff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2458cc] disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Finance Page ────────────────────────────────────────────────────────

export default function Finance() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('transactions')
  const [searchQuery, setSearchQuery] = useState('')
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)

  const { data: financeData, isLoading: financeLoading, error: financeError, refetch: refetchFinance } = useQuery({
    queryKey: ['finance', workspaceId],
    queryFn: () => getFinance(workspaceId!),
    enabled: !!workspaceId && activeTab === 'transactions',
  })

  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices', workspaceId],
    queryFn: () => getInvoices(workspaceId!),
    enabled: !!workspaceId && activeTab === 'invoices',
  })

  const sendInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => sendInvoice(workspaceId!, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', workspaceId] })
    },
  })

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'transactions', label: 'Transactions', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'invoices', label: 'Invoices', icon: <FileText className="h-4 w-4" /> },
    { key: 'payment-gateway', label: 'Payment Gateway', icon: <CreditCard className="h-4 w-4" /> },
  ]

  const isLoading = activeTab === 'transactions' ? financeLoading : invoicesLoading
  const error = activeTab === 'transactions' ? financeError : invoicesError

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f2ff]">Finance</h1>
          <p className="text-sm text-[#8a8ea8]">Track earnings, invoices, and payment settings</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'invoices' && (
            <button
              onClick={() => setShowInvoiceForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2b6eff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2458cc]"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </button>
          )}
          <button
            onClick={() => {
              if (activeTab === 'transactions') refetchFinance()
              else refetchInvoices()
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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
          <p className="text-sm text-red-300">Failed to load finance data. Please try again.</p>
          <button
            onClick={() => {
              if (activeTab === 'transactions') refetchFinance()
              else refetchInvoices()
            }}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── TRANSACTIONS TAB ──────────────────────────────────────────────── */}
      {!isLoading && !error && activeTab === 'transactions' && financeData && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
              <div className="flex items-center gap-2 text-xs text-[#6a6e88]">
                <DollarSign className="h-4 w-4 text-green-400" />
                Total Revenue
              </div>
              <p className="mt-1 text-2xl font-bold text-[#f0f2ff]">
                {formatCurrency(financeData.totals?.amount || 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
              <div className="flex items-center gap-2 text-xs text-[#6a6e88]">
                <TrendingDown className="h-4 w-4 text-red-400" />
                Platform Commission
              </div>
              <p className="mt-1 text-2xl font-bold text-[#f0f2ff]">
                {formatCurrency(financeData.totals?.commission || 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
              <div className="flex items-center gap-2 text-xs text-[#6a6e88]">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Net Earnings
              </div>
              <p className="mt-1 text-2xl font-bold text-[#f0f2ff]">
                {formatCurrency(financeData.totals?.netAmount || 0)}
              </p>
            </div>
          </div>

          {/* Transactions table */}
          <div className="overflow-x-auto rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#2a2f4a] text-xs font-medium uppercase tracking-wider text-[#6a6e88]">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Service / Package</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {financeData.transactions?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#6a6e88]">
                      No transactions yet
                    </td>
                  </tr>
                )}
                {financeData.transactions?.map((tx) => (
                  <tr key={tx.id} className="border-b border-[#2a2f4a] transition-colors hover:bg-[#1a1d2e]/50">
                    <td className="px-4 py-3 text-sm text-[#8a8ea8]">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3 text-sm text-[#f0f2ff]">{tx.serviceOrPackage}</td>
                    <td className="px-4 py-3 text-sm text-[#f0f2ff]">{tx.client}</td>
                    <td className="px-4 py-3 text-sm text-[#8a8ea8]">{tx.staff || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#f0f2ff] text-right">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-400 text-right">
                      -{formatCurrency(tx.commission)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-400 text-right">
                      {formatCurrency(tx.netAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                        tx.status === 'completed' || tx.status === 'PAID'
                          ? 'text-green-400 border-green-500/30 bg-green-500/10'
                          : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── INVOICES TAB ──────────────────────────────────────────────────── */}
      {!isLoading && !error && activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6a6e88]" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] py-2.5 pl-10 pr-4 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none transition-colors focus:border-[#2b6eff]"
            />
          </div>

          {/* Invoices list */}
          <div className="space-y-2">
            {(!invoicesData?.data || invoicesData.data.length === 0) && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-12 text-center">
                <FileText className="h-12 w-12 text-[#3a3f5a]" />
                <h3 className="text-lg font-semibold text-[#f0f2ff]">No invoices yet</h3>
                <p className="text-sm text-[#8a8ea8]">Create your first invoice to get started.</p>
                <button
                  onClick={() => setShowInvoiceForm(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2b6eff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2458cc]"
                >
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </button>
              </div>
            )}
            {invoicesData?.data?.map((invoice: Invoice) => (
              <div
                key={invoice.id}
                className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4 transition-all hover:border-[#3a3f5a]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#f0f2ff]">
                        Invoice #{invoice.id.slice(0, 8)}
                      </h3>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[invoice.status] || ''}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#8a8ea8]">
                      {formatDate(invoice.createdAt)} · {invoice.lineItems?.length || 0} item(s)
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-[#f0f2ff]">
                      {formatCurrency(invoice.total)}
                    </p>
                    {invoice.status === 'DRAFT' && (
                      <button
                        onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                        disabled={sendInvoiceMutation.isPending}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-[#2b6eff] hover:text-[#2458cc]"
                      >
                        <Send className="h-3 w-3" />
                        {sendInvoiceMutation.isPending ? 'Sending...' : 'Send'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PAYMENT GATEWAY TAB ───────────────────────────────────────────── */}
      {!isLoading && !error && activeTab === 'payment-gateway' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2b6eff]/20">
                <CreditCard className="h-5 w-5 text-[#2b6eff]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f0f2ff]">Payment Gateway Setup</h3>
                <p className="text-sm text-[#8a8ea8]">Configure how you receive payments from clients.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-[#6a6e88]" />
                    <div>
                      <p className="text-sm font-medium text-[#f0f2ff]">Stripe Connect</p>
                      <p className="text-xs text-[#6a6e88]">Accept credit card payments directly</p>
                    </div>
                  </div>
                  <button className="rounded-lg bg-[#2b6eff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2458cc]">
                    Connect
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-[#6a6e88]" />
                    <div>
                      <p className="text-sm font-medium text-[#f0f2ff]">Bank Transfer (EFT)</p>
                      <p className="text-xs text-[#6a6e88]">Receive payments via direct bank transfer</p>
                    </div>
                  </div>
                  <button className="rounded-lg border border-[#3a3f5a] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]">
                    Configure
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-[#6a6e88]" />
                    <div>
                      <p className="text-sm font-medium text-[#f0f2ff]">Platform Wallet</p>
                      <p className="text-xs text-[#6a6e88]">Hold balance on Neighborly platform</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Form Modal */}
      {showInvoiceForm && workspaceId && (
        <InvoiceFormModal
          workspaceId={workspaceId}
          onClose={() => setShowInvoiceForm(false)}
          onCreated={() => refetchInvoices()}
        />
      )}
    </div>
  )
}
