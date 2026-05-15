import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Search,
  MapPin,
  User,
  Camera,
  Sun,
  AlertTriangle,
  Building2,
  Heart,
  Newspaper,
  Calendar,
} from 'lucide-react'

const CATEGORIES = [
  { icon: '🏗️', label: 'Building' },
  { icon: '🚗', label: 'Auto' },
  { icon: '💅', label: 'Beauty' },
  { icon: '🚚', label: 'Transport' },
  { icon: '🏥', label: 'Health' },
]

const PUBLIC_SERVICES = [
  '🏦 TD Bank',
  '🏦 RBC',
  '📊 Credit Score',
  '🛡️ Insurance',
  '🏛️ ServiceOntario',
  '🏥 OHIP',
]

const NEWS_ITEMS = [
  { text: 'Construction rates up 12% this week in Vaughan', time: '2h', dot: 'default' as const },
  { text: 'Police alert: Traffic delay on Major Mackenzie Dr', time: '45m', dot: 'warn' as const },
  { text: 'Music Festival announced at Vaughan Mills — May 14', time: '5h', dot: 'green' as const },
  { text: 'Auto Expo: New dealerships joining Vaughan corridor', time: '1d', dot: 'default' as const },
]

const EVENTS = [
  { name: 'Craft Festival', date: 'May 10 · Vaughan Mills', bg: 'from-amber-600/40 to-amber-900/40' },
  { name: 'Concert Night', date: 'May 14 · Club district', bg: 'from-purple-600/40 to-purple-900/40' },
  { name: 'Auto Expo', date: 'May 18 · Convention Ctr', bg: 'from-blue-600/40 to-blue-900/40' },
]

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-[#6b6f8a]">
            <MapPin className="h-3.5 w-3.5 text-[#2b6eff]" />
            Vaughan, ON
          </div>
          <h1 className="text-xl font-bold text-[#f0f2ff] mt-0.5">
            {user ? `Good ${getGreeting()}, ${user.displayName ?? user.firstName ?? 'there'} 👋` : 'Welcome to NeighborHub 👋'}
          </h1>
        </div>
        <Link
          to={user ? '/app/home' : '/auth/login'}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2a2f4a] bg-[#1e2235] text-[#8b90b0] transition hover:border-[#2b6eff] hover:text-white"
        >
          {user ? (
            <span className="text-sm font-bold text-[#2b6eff]">
              {user.displayName?.charAt(0).toUpperCase() ?? user.firstName?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          ) : (
            <User className="h-5 w-5" />
          )}
        </Link>
      </div>

      {/* Photo of the Week */}
      <div className="relative overflow-hidden rounded-2xl border border-[#2a2f4a] bg-gradient-to-br from-[#1a2a4a] to-[#0a1020] p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6b6f8a]">
          <Camera className="h-3.5 w-3.5" />
          Photo of the Week
        </div>
        <h3 className="mt-1 text-lg font-bold text-white">Central Park Vaughan</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            <Sun className="h-3 w-3" />
            13°C · Sunny
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Police Alert
          </span>
        </div>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[#2a2f4a] bg-[#131624] px-4 py-3 transition focus-within:border-[#2b6eff]">
          <Search className="h-5 w-5 text-[#6b6f8a]" />
          <span className="text-sm text-[#6b6f8a]">Search services in your area...</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={`/explore?category=${cat.label.toLowerCase()}`}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-[#2a2f4a] bg-[#1e2235] px-4 py-3 transition hover:border-[#2b6eff] hover:bg-[#1a3f99]/20"
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b90b0]">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Public & Government Services */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-[#2b6eff]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#8b90b0]">Public & Government Services</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {PUBLIC_SERVICES.map((svc) => (
            <span
              key={svc}
              className="inline-flex items-center gap-1 rounded-full border border-[#2a2f4a] bg-[#1e2235] px-3 py-1.5 text-xs font-medium text-[#c0c4e0] transition hover:border-[#2b6eff] hover:text-white cursor-pointer"
            >
              {svc}
            </span>
          ))}
        </div>
      </div>

      {/* Local News */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="h-4 w-4 text-[#2b6eff]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#8b90b0]">Local News</h2>
        </div>
        <div className="space-y-2">
          {NEWS_ITEMS.map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-[#2a2f4a] bg-[#131624] px-4 py-3 transition hover:border-[#2a2f4a]/80 cursor-pointer">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  item.dot === 'warn' ? 'bg-red-500' : item.dot === 'green' ? 'bg-green-500' : 'bg-[#2b6eff]'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#c0c4e0] truncate">{item.text}</p>
              </div>
              <span className="shrink-0 text-xs text-[#6b6f8a]">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Local Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#2b6eff]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8b90b0]">Local Events</h2>
          </div>
          <Link to="/explore" className="text-xs font-medium text-[#2b6eff] hover:text-[#4a8eff]">
            View all
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {EVENTS.map((event, i) => (
            <div
              key={i}
              className={`relative flex shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${event.bg} p-4 w-44 h-28 border border-[#2a2f4a]`}
            >
              <div className="relative z-10">
                <div className="text-sm font-bold text-white">{event.name}</div>
                <div className="text-xs text-white/60 mt-0.5">{event.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interaction Score */}
      <div className="rounded-2xl border border-[#2a2f4a] bg-gradient-to-br from-[#1a2a4a]/60 to-[#0a1020]/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6b6f8a]">
              <Heart className="h-3.5 w-3.5 text-[#ff4d6a]" />
              Your Interaction Score
            </div>
            <div className="text-2xl font-black text-white mt-1">2,840 pts</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#2b6eff]">3.2 km</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6f8a]">Your Reach</div>
          </div>
        </div>
        <div className="h-2 rounded-full bg-[#1e2235] overflow-hidden">
          <div className="h-full w-[56%] rounded-full bg-gradient-to-r from-[#2b6eff] to-[#6366f1]" />
        </div>
        <p className="mt-2 text-xs text-[#6b6f8a]">
          Keep engaging to expand your neighborhood radius!
        </p>
      </div>

    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}
