import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import {
  Users, FileText, DollarSign, Shield, Activity, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, ArrowUpRight,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type AdminStats = {
  totalUsers: number
  totalProviders: number
  totalOrders: number
  totalRevenue: number
  pendingKyc: number
  activeDisputes: number
  ordersToday: number
  newUsersToday: number
}

type RecentActivity = {
  id: string
  type: 'user_joined' | 'kyc_submitted' | 'order_placed' | 'dispute_opened' | 'payment_received'
  description: string
  timestamp: string
  userId?: string
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
  trend,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  accent: string
  trend?: { value: string; positive: boolean }
}) {
  return (
    <div className="rounded-2xl border border-[#2a2f4a] bg-[#1e2235] p-5 transition-all hover:border-[#2b6eff]/50">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend.positive ? 'text-[#0fc98a]' : 'text-[#ff4d4d]'}`}>
            <TrendingUp className={`h-3 w-3 ${trend.positive ? '' : 'rotate-180'}`} />
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-black text-[#f0f2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#6a6e88]">{label}</p>
      </div>
    </div>
  )
}

// ── Activity Item ──────────────────────────────────────────────────────────

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const iconMap = {
    user_joined: <Users className="h-4 w-4 text-[#2b6eff]" />,
    kyc_submitted: <Shield className="h-4 w-4 text-[#ffb800]" />,
    order_placed: <FileText className="h-4 w-4 text-[#0fc98a]" />,
    dispute_opened: <AlertTriangle className="h-4 w-4 text-[#ff4d4d]" />,
    payment_received: <DollarSign className="h-4 w-4 text-[#0fc98a]" />,
  }

  const bgMap = {
    user_joined: 'bg-[#2b6eff]/10',
    kyc_submitted: 'bg-[#ffb800]/10',
    order_placed: 'bg-[#0fc98a]/10',
    dispute_opened: 'bg-[#ff4d4d]/10',
    payment_received: 'bg-[#0fc98a]/10',
  }

  return (
    <div className="flex items-center gap-3 border-b border-[#2a2f4a] px-4 py-3 last:border-0">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgMap[activity.type]}`}>
        {iconMap[activity.type]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#f0f2ff]">{activity.description}</p>
        <p className="text-[11px] text-[#6a6e88]">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

// ── Quick Action ───────────────────────────────────────────────────────────

function QuickAction({
  label,
  description,
  icon,
  onClick,
}: {
  label: string
  description: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl border border-[#2a2f4a] bg-[#1e2235] p-4 text-left transition-all hover:border-[#2b6eff] hover:bg-[#1a1d2e]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2b6eff]/10 text-[#2b6eff]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#f0f2ff]">{label}</p>
        <p className="text-xs text-[#6a6e88]">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-[#4a4f70]" />
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProviders: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingKyc: 0,
    activeDisputes: 0,
    ordersToday: 0,
    newUsersToday: 0,
  })
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<AdminStats>('/api/admin/stats').catch(() => null),
      api.get<RecentActivity[]>('/api/admin/activity').catch(() => null),
    ])
      .then(([statsRes, activityRes]) => {
        if (statsRes?.data) setStats(statsRes.data)
        if (activityRes?.data) setActivities(activityRes.data.slice(0, 10))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const quickActions = [
    {
      label: 'Manage Users',
      description: 'View, verify, and manage all platform users',
      icon: <Users className="h-5 w-5" />,
      onClick: () => navigate('/admin/users'),
    },
    {
      label: 'KYC Reviews',
      description: `${stats.pendingKyc} pending identity verifications`,
      icon: <Shield className="h-5 w-5" />,
      onClick: () => navigate('/admin/kyc'),
    },
    {
      label: 'Orders',
      description: 'Monitor and manage all platform orders',
      icon: <FileText className="h-5 w-5" />,
      onClick: () => navigate('/admin/orders'),
    },
    {
      label: 'Disputes',
      description: `${stats.activeDisputes} active disputes requiring attention`,
      icon: <AlertTriangle className="h-5 w-5" />,
      onClick: () => navigate('/admin/disputes'),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#f0f2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-[#6a6e88]">
          Platform overview and management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-5 w-5 text-white" />}
          accent="bg-[#2b6eff]"
          trend={{ value: `+${stats.newUsersToday} today`, positive: true }}
        />
        <StatCard
          label="Providers"
          value={stats.totalProviders}
          icon={<CheckCircle2 className="h-5 w-5 text-white" />}
          accent="bg-[#0fc98a]"
        />
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          icon={<FileText className="h-5 w-5 text-white" />}
          accent="bg-[#8b5cf6]"
          trend={{ value: `+${stats.ordersToday} today`, positive: true }}
        />
        <StatCard
          label="Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-white" />}
          accent="bg-[#ff7a2b]"
        />
        <StatCard
          label="Pending KYC"
          value={stats.pendingKyc}
          icon={<Shield className="h-5 w-5 text-white" />}
          accent="bg-[#ffb800]"
          trend={{ value: `${stats.pendingKyc} pending`, positive: stats.pendingKyc === 0 }}
        />
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#f0f2ff]">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <QuickAction key={action.label} {...action} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#f0f2ff]">Recent Activity</h2>
          <div className="overflow-hidden rounded-2xl border border-[#2a2f4a] bg-[#1e2235]">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2a2f4a] border-t-[#2b6eff]" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Activity className="h-10 w-10 text-[#4a4f70]" />
                <p className="text-sm text-[#6a6e88]">No recent activity</p>
              </div>
            ) : (
              activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="rounded-2xl border border-[#2a2f4a] bg-[#1e2235] p-6">
        <h2 className="mb-4 text-lg font-bold text-[#f0f2ff]">System Status</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0fc98a]/10">
              <CheckCircle2 className="h-5 w-5 text-[#0fc98a]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f0f2ff]">API Status</p>
              <p className="text-xs text-[#0fc98a]">All systems operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ffb800]/10">
              <Clock className="h-5 w-5 text-[#ffb800]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f0f2ff]">Active Disputes</p>
              <p className="text-xs text-[#ffb800]">{stats.activeDisputes} open cases</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b6eff]/10">
              <TrendingUp className="h-5 w-5 text-[#2b6eff]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f0f2ff]">Orders Today</p>
              <p className="text-xs text-[#2b6eff]">{stats.ordersToday} new orders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
