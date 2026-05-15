import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import { motion, AnimatePresence } from 'motion/react'
import {
  CheckCircle2, AlertCircle, Briefcase, ChevronRight,
  LayoutDashboard, ClipboardList, MessageSquare, DollarSign, Plus, CalendarClock,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { QuickActionCard } from '../../components/customer/home/QuickActionCard'
import { ActiveOrdersStrip } from '../../components/customer/home/ActiveOrdersStrip'

export default function CustomerDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'home'
  const [requests, setRequests] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [kycData, setKycData] = useState<any>(null)
  const [showBecomeProvider, setShowBecomeProvider] = useState(false)
  const [requestFilter, setRequestFilter] = useState({ category: 'All', status: 'All', search: '' })
  const [unreadCount] = useState(0)

  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    const tick = async () => {
      try {
        const [reqList, svcList, txList, tkList, cList, kycRow] = await Promise.all([
          api.get<any[]>('/api/requests'),
          api.get<any[]>('/api/services'),
          api.get<any[]>('/api/transactions'),
          api.get<any[]>('/api/tickets'),
          api.get<any[]>('/api/contracts'),
          api.get<any>('/api/kyc/me').catch(() => null),
        ])
        if (cancelled) return
        setRequests(
          (reqList.data || []).map((r: any) => ({
            ...r,
            providerName: r.provider?.displayName,
            category: r.service?.category,
          })),
        )
        setServices(svcList.data || [])
        setTransactions(
          (txList.data || []).map((t: any) => ({
            ...t,
            timestamp: typeof t.timestamp === 'string' ? t.timestamp : t.timestamp,
          })),
        )
        setTickets(tkList.data || [])
        setContracts(
          (cList.data || []).map((c: any) => ({
            ...c,
            createdAt: c.createdAt,
          })),
        )
        setKycData(kycRow?.data && Object.keys(kycRow.data).length ? kycRow.data : null)
        setLoading(false)
      } catch (e) {
        console.error('Dashboard data fetch error:', e)
      }
    }

    tick()
    const id = setInterval(tick, 6000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [user?.id])

  const totalSpent = transactions
    .filter(t => t.type === 'outcome')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const handleBecomeProvider = async () => {
    if (!user?.id) return

    const personalKyc = kycData?.type === 'personal' ? kycData : null

    if (!personalKyc || personalKyc.status !== 'verified') {
      showNotification("You must complete Personal Identity Verification (KYC Level 1) before becoming a provider.", "error")
      setTimeout(() => navigate('/account?section=identity'), 2000)
      return
    }

    try {
      await api.post('/api/users/me/become-provider', {})
      showNotification("Application successful! You are now a Provider. Please complete Business KYC on the Profile page.", "success")
      setTimeout(() => navigate('/account?section=identity'), 1500)
    } catch (error) {
      console.error('Become provider error:', error)
    }
  }

  const renderTabContent = () => {
    if (activeTab === 'requests') {
      const filteredRequests = requests.filter(r => {
        const matchesCategory = requestFilter.category === 'All' || r.category === requestFilter.category
        const matchesStatus = requestFilter.status === 'All' || r.status === requestFilter.status
        const matchesSearch = !requestFilter.search || 
          r.id.toLowerCase().includes(requestFilter.search.toLowerCase()) ||
          r.providerName?.toLowerCase().includes(requestFilter.search.toLowerCase())
        return matchesCategory && matchesStatus && matchesSearch
      })

      return (
        <div className="space-y-12 pb-20">
          <header className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-[#f0f2ff]">My Requests</h1>
            <p className="text-[#6a6e88] font-medium">Track your active jobs and service history.</p>
          </header>

          {/* Filters */}
          <div className="rounded-[2.5rem] border border-[#2a2f4a] bg-[#1e2235] p-6 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6a6e88] ml-2">Category</label>
                <select 
                  value={requestFilter.category}
                  onChange={e => setRequestFilter({...requestFilter, category: e.target.value})}
                  className="w-full rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-3 text-sm font-bold text-[#f0f2ff]"
                >
                  <option value="All">All Categories</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Gardening">Gardening</option>
                  <option value="Repairs">Repairs</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6a6e88] ml-2">Status</label>
                <select 
                  value={requestFilter.status}
                  onChange={e => setRequestFilter({...requestFilter, status: e.target.value})}
                  className="w-full rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-3 text-sm font-bold text-[#f0f2ff]"
                >
                  <option value="All">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="started">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#6a6e88] ml-2">Search Provider / ID</label>
                <input 
                  type="text"
                  placeholder="Search..."
                  value={requestFilter.search}
                  onChange={e => setRequestFilter({...requestFilter, search: e.target.value})}
                  className="w-full rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-3 text-sm font-bold text-[#f0f2ff] placeholder-[#4a4f70]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
                <div className="rounded-[3rem] border border-[#2a2f4a] bg-[#1e2235] p-20 text-center space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#1a1d2e]">
                    <AlertCircle className="h-10 w-10 text-[#4a4f70]" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-[#f0f2ff]">No matching requests</p>
                    <p className="mx-auto max-w-xs text-sm text-[#6a6e88]">Try adjusting your filters or find a new service.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/services')}
                    className="rounded-2xl bg-[#2b6eff] px-8 py-3 text-sm font-bold text-white"
                  >
                    Explore Services
                  </button>
                </div>
            ) : (
              filteredRequests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6 rounded-[2.5rem] border border-[#2a2f4a] bg-[#1e2235] p-8 shadow-sm transition-all hover:shadow-xl group md:flex-row md:items-center justify-between"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black italic",
                      req.status === 'pending' ? "bg-[#1a1d2e] text-[#ffb800]" : "bg-[#2b6eff] text-white"
                    )}>
                      {req.status[0].toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black uppercase tracking-tight text-[#f0f2ff]">Job #{req.id.slice(0, 8).toUpperCase()}</h4>
                        <span className={cn(
                          "rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                          req.status === 'pending' ? "bg-[#ffb800]/20 text-[#ffb800]" :
                          req.status === 'accepted' ? "bg-[#2b6eff]/20 text-[#2b6eff]" :
                          req.status === 'started' ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" :
                          "bg-[#0fc98a]/20 text-[#0fc98a]"
                        )}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#6a6e88]">Provider: {req.providerName || 'Neighbor'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#4a4f70]">Requested {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => navigate(`/service/${req.serviceId}`)}
                      className="rounded-2xl border border-[#2a2f4a] px-6 py-3 text-sm font-bold text-[#f0f2ff] transition-all hover:bg-[#1a1d2e]"
                    >
                      View Service
                    </button>
                    <button className="rounded-2xl bg-[#2b6eff] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105">
                      Track Status
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )
    }

    if (activeTab === 'finance') {
      return (
        <div className="space-y-12 pb-20">
          <header className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-[#f0f2ff]">Spending</h1>
            <p className="font-medium text-[#6a6e88]">Manage your payments and transaction history.</p>
          </header>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-[3rem] bg-[#2b6eff] p-8 space-y-2 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Total Spent</p>
              <h3 className="text-4xl font-black">${totalSpent.toLocaleString()}</h3>
            </div>
            <div className="rounded-[3rem] border border-[#2a2f4a] bg-[#1e2235] p-8 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#6a6e88]">Active Subscriptions</p>
              <h3 className="text-4xl font-black text-[#f0f2ff]">0</h3>
            </div>
            <div className="rounded-[3rem] border border-[#2a2f4a] bg-[#1e2235] p-8 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#6a6e88]">Reward Points</p>
              <h3 className="text-4xl font-black text-[#f0f2ff]">450</h3>
            </div>
          </div>

          <div className="overflow-hidden rounded-[3rem] border border-[#2a2f4a] bg-[#1e2235] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#2a2f4a] p-8">
              <h3 className="font-black uppercase italic tracking-tight text-[#f0f2ff]">Transaction History</h3>
              <button className="text-xs font-black uppercase tracking-widest text-[#6a6e88]">Download PDF</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1a1d2e]">
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#6a6e88]">Date</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#6a6e88]">Service</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#6a6e88]">Status</th>
                    <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-[#6a6e88]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2f4a]">
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="transition-colors hover:bg-[#1a1d2e]/50">
                      <td className="p-6 text-sm font-medium text-[#f0f2ff]">{new Date(t.timestamp).toLocaleDateString()}</td>
                      <td className="p-6 text-sm font-bold text-[#f0f2ff]">{t.description}</td>
                      <td className="p-6">
                        <span className="rounded bg-[#0fc98a]/20 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-[#0fc98a]">
                          Completed
                        </span>
                      </td>
                      <td className="p-6 text-right text-sm font-black text-[#f0f2ff]">
                        ${t.amount}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center text-xs font-bold uppercase tracking-widest text-[#6a6e88]">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'tickets') {
      return (
        <div className="space-y-12 pb-20">
          <header className="flex items-end justify-between">
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tighter uppercase italic text-[#f0f2ff]">Support</h1>
              <p className="font-medium text-[#6a6e88]">Manage your tickets and disputes.</p>
            </div>
            <button 
              onClick={() => navigate('/tickets')}
              className="rounded-2xl bg-[#2b6eff] px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
            >
              New Ticket
            </button>
          </header>

          <div className="grid gap-4">
            {tickets.map((ticket: any) => (
              <div 
                key={ticket.id}
                onClick={() => navigate(`/tickets?id=${ticket.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-[2.5rem] border border-[#2a2f4a] bg-[#1e2235] p-8 transition-all hover:border-[#2b6eff] group"
              >
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    ticket.status === 'open' ? "bg-[#2b6eff]/20 text-[#2b6eff]" : "bg-[#1a1d2e] text-[#6a6e88]"
                  )}>
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-tight text-[#f0f2ff]">{ticket.subject}</h4>
                    <p className="text-xs text-[#6a6e88]">Last message {new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                    ticket.status === 'open' ? "bg-[#2b6eff]/20 text-[#2b6eff]" : "bg-[#1a1d2e] text-[#6a6e88]"
                  )}>
                    {ticket.status}
                  </span>
                  <ChevronRight className="h-5 w-5 text-[#4a4f70] transition-all group-hover:translate-x-1 group-hover:text-[#f0f2ff]" />
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="rounded-[3rem] border border-[#2a2f4a] bg-[#1e2235] p-20 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-[#6a6e88]">No active tickets.</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // ── Home tab ──────────────────────────────────────────────────────────────
    const firstName = user?.firstName || 'there'
    const initials = [
      (user?.firstName?.[0] ?? ''),
      (user?.lastName?.[0] ?? ''),
    ].join('').toUpperCase() || (user?.firstName?.[0]?.toUpperCase() ?? '?')

    return (
      <div className="space-y-8 pb-20">
        {/* Greeting header */}
        <header className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2b6eff]/20 text-lg font-black text-[#2b6eff]">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              : initials}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#4a4f70]">Welcome back</p>
            <h1 className="text-2xl font-black text-white">Hello, {firstName}</h1>
          </div>
          <button
            onClick={() => setShowBecomeProvider(true)}
            className="ml-auto flex items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1e2235] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-[#8b90b0] transition hover:border-[#2b6eff] hover:text-white"
          >
            <Briefcase className="h-4 w-4" />
            Become a Provider
          </button>
        </header>

        {/* Quick action cards */}
        <section>
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#4a4f70]">Quick Actions</p>
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <QuickActionCard
              label="Book a Service"
              path="/orders/new"
              icon={<Plus className="h-5 w-5" />}
            />
            <QuickActionCard
              label="My Active Orders"
              path="/app/orders?tab=active"
              icon={<ClipboardList className="h-5 w-5" />}
            />
            <QuickActionCard
              label="Messages"
              path="/app/messages"
              icon={<MessageSquare className="h-5 w-5" />}
              badge={unreadCount}
            />
            <QuickActionCard
              label="Schedule"
              path="/app/home?tab=schedule"
              icon={<CalendarClock className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* Active orders strip */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4a4f70]">Active Orders</p>
          </div>
          <ActiveOrdersStrip />
        </section>
      </div>
    )
  }

  const tabs = [
    { id: 'home', label: 'Overview', icon: LayoutDashboard },
    { id: 'requests', label: 'My Requests', icon: ClipboardList },
    { id: 'finance', label: 'Spending', icon: DollarSign },
    { id: 'tickets', label: 'Support', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen space-y-8">
      <div className="sticky top-16 z-40 -mx-4 border-b border-[#2a2f4a] bg-[#0d0f1a] px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(`/app/home?tab=${tab.id}`)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 py-4 transition-all",
                activeTab === tab.id 
                  ? "border-[#2b6eff] text-[#f0f2ff]" 
                  : "border-transparent text-[#6a6e88] hover:text-[#f0f2ff]"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        {renderTabContent()}
      </div>

      {/* Become Provider Modal */}
      <AnimatePresence>
        {showBecomeProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBecomeProvider(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg overflow-y-auto rounded-[3rem] border border-[#2a2f4a] bg-[#1e2235] p-12 shadow-2xl space-y-8 max-h-[90vh] custom-scrollbar"
            >
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#2b6eff] text-white">
                  <Briefcase className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tight text-[#f0f2ff]">Start Earning</h2>
                <p className="text-[#6a6e88]">Transform your skills into a business. Join our network of professional neighbors.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[#0fc98a]" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#f0f2ff]">Set Your Own Rates</p>
                    <p className="text-xs text-[#6a6e88]">You control how much you earn per hour or project.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[#0fc98a]" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#f0f2ff]">Flexible Schedule</p>
                    <p className="text-xs text-[#6a6e88]">Work whenever you want, as much as you want.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleBecomeProvider}
                  className="w-full rounded-2xl bg-[#2b6eff] py-4 text-sm font-bold text-white transition-all hover:scale-[1.02]"
                >
                  Apply Now
                </button>
                <button 
                  onClick={() => setShowBecomeProvider(false)}
                  className="w-full rounded-2xl border border-[#2a2f4a] py-4 text-sm font-bold text-[#6a6e88] transition-all hover:text-[#f0f2ff]"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[300]"
          >
            <div className={cn(
              "flex items-center gap-3 rounded-2xl border px-6 py-4 shadow-2xl",
              notification.type === 'success' ? "border-[#0fc98a] bg-[#0fc98a] text-white" : "border-[#ff4d4d] bg-[#ff4d4d] text-white"
            )}>
              {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span className="text-sm font-bold">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
