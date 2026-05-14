import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Briefcase,
  Clock,
  CheckCircle2,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Lightbulb,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { getWorkspaceStats, type DashboardFilters } from '../../services/business'

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  accent: string
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-5 transition hover:border-[#2b6eff]/40">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#8b90b0]">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-white">{value}</p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Performance Card ────────────────────────────────────────────────────────

interface PerformanceCardProps {
  label: string
  value: string | number
  trend: 'up' | 'down' | 'neutral'
  detail?: string
}

function PerformanceCard({ label, value, trend, detail }: PerformanceCardProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-[#8b90b0]',
  }
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : BarChart3

  return (
    <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-[#8b90b0]">{label}</p>
        <TrendIcon className={`h-5 w-5 ${trendColors[trend]}`} />
      </div>
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
      {detail && <p className="mt-1 text-xs text-[#6b70a0]">{detail}</p>}
    </div>
  )
}

// ─── AI Insight Card ─────────────────────────────────────────────────────────

interface AiInsightProps {
  title: string
  description: string
}

function AiInsightCard({ title, description }: AiInsightProps) {
  return (
    <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <p className="font-bold text-white">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#8b90b0]">{description}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Filter Bar ──────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
}

function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
      <Filter className="h-5 w-5 text-[#8b90b0]" />
      <input
        type="date"
        value={filters.dateFrom ?? ''}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
        className="rounded-lg border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-white placeholder-[#6b70a0] focus:border-[#2b6eff] focus:outline-none"
        placeholder="From"
      />
      <input
        type="date"
        value={filters.dateTo ?? ''}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
        className="rounded-lg border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-white placeholder-[#6b70a0] focus:border-[#2b6eff] focus:outline-none"
        placeholder="To"
      />
      <select
        value={filters.serviceType ?? ''}
        onChange={(e) => onChange({ ...filters, serviceType: e.target.value || undefined })}
        className="rounded-lg border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-white focus:border-[#2b6eff] focus:outline-none"
      >
        <option value="">All Services</option>
        <option value="cleaning">Cleaning</option>
        <option value="repair">Repair</option>
        <option value="beauty">Beauty</option>
        <option value="transport">Transport</option>
      </select>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BusinessDashboard() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [filters, setFilters] = useState<DashboardFilters>({})

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['workspace-stats', workspaceId, filters],
    queryFn: () => getWorkspaceStats(workspaceId!, filters),
    enabled: !!workspaceId,
  })

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#8b90b0]">No workspace selected.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-[#1a1d2e]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#1a1d2e]" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-400">Failed to load dashboard data.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 flex items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2a2f4a]"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Business Dashboard</h1>
        <p className="mt-1 text-sm text-[#8b90b0]">Overview of your workspace performance</p>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Active Services"
          value={stats?.pendingOrders ?? 0}
          icon={<Briefcase className="h-6 w-6" />}
          accent="#2b6eff"
        />
        <StatCard
          label="Pending"
          value={stats?.pendingOrders ?? 0}
          icon={<Clock className="h-6 w-6" />}
          accent="#f59e0b"
        />
        <StatCard
          label="Completed"
          value={stats?.completedOrders ?? 0}
          icon={<CheckCircle2 className="h-6 w-6" />}
          accent="#10b981"
        />
        <StatCard
          label="Revenue Received"
          value={`$${(stats?.totalEarnings ?? 0).toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
          accent="#10b981"
        />
        <StatCard
          label="Platform Commission"
          value={`$${((stats?.totalEarnings ?? 0) * 0.1).toLocaleString()}`}
          icon={<Percent className="h-6 w-6" />}
          accent="#8b5cf6"
        />
      </div>

      {/* Performance Cards */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-white">Performance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PerformanceCard
            label="Best-selling Service"
            value="—"
            trend="up"
            detail="Based on order volume"
          />
          <PerformanceCard
            label="Lowest-performing"
            value="—"
            trend="down"
            detail="Based on order volume"
          />
          <PerformanceCard
            label="Successful Orders"
            value={stats?.completedOrders ?? 0}
            trend="up"
          />
          <PerformanceCard
            label="Failed / Lost"
            value="0"
            trend="neutral"
            detail="Orders not converted"
          />
        </div>
      </div>

      {/* AI Insights Panel */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-white">AI Insights</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AiInsightCard
            title="Order Performance Analysis"
            description="Your workspace has {stats?.totalOrders ?? 0} total orders with {stats?.completedOrders ?? 0} completed. Focus on converting pending orders by responding to offers faster and optimizing your pricing strategy."
          />
          <AiInsightCard
            title="Competitor Comparison"
            description="Top providers in your category respond to offers within 2 hours on average. Consider enabling push notifications to improve your response time and win more deals."
          />
          <AiInsightCard
            title="Pricing Optimization"
            description="Review your package pricing against market rates. Packages with competitive pricing and clear BOM breakdowns have 40% higher conversion rates."
          />
          <AiInsightCard
            title="Availability Windows"
            description="Providers with flexible scheduling options receive 2.5x more order matches. Consider expanding your availability windows to capture more opportunities."
          />
        </div>
      </div>
    </div>
  )
}
