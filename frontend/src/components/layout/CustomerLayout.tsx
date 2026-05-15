import { useState } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LogOut,
  Home,
  User as UserIcon,
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  MessageSquare,
  Menu,
  X,
  DollarSign,
  Search,
  History,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { motion, AnimatePresence } from 'motion/react'
import { AccountAvatarBadge } from '../ui/AccountAvatarBadge'

export function CustomerLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const customerNav = [
    { label: 'Home', icon: Home, path: '/app/home' },
    { label: 'Explore', icon: Search, path: '/explore' },
    { label: 'Orders', icon: History, path: '/app/orders' },
    { label: 'Business', icon: BriefcaseBusiness, path: '/business', isBusiness: true },
  ]

  const guestNav = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Explore', icon: Search, path: '/explore' },
    { label: 'Orders', icon: History, path: '/app/orders' },
  ]

  const currentNav = user ? customerNav : guestNav

  const eventItems = [
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Tickets', icon: MessageSquare, path: '/tickets' },
  ]

  const profileItems: { label: string; icon: typeof UserIcon; path: string }[] = [
    { label: 'My Profile', icon: UserIcon, path: '/account?section=settings' },
  ]

  if (user) {
    profileItems.unshift({ label: 'Account', icon: UserIcon, path: '/account' })
    profileItems.push(
      { label: 'My Requests', icon: ClipboardList, path: '/app/home?tab=requests' },
      { label: 'Spending', icon: DollarSign, path: '/app/home?tab=finance' },
    )
  }

  const isClientHome = location.pathname === '/app/home'

  return (
    <div className="min-h-screen bg-[#0d0f1a] font-sans text-[#f0f2ff]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-[#2a2f4a] bg-[#0d0f1a]/95 backdrop-blur-xl">
        <div className="w-full px-3 sm:px-5 lg:px-6 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2b6eff]/30 bg-[#2b6eff]/15 text-[#2b6eff]">
              <Home className="h-5 w-5 fill-current" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight text-white">NeighborHub</span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a4f70] sm:block">Canada local app</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-6 lg:gap-8">
            {currentNav.length > 0 && (
              <div className="hidden md:flex items-center gap-8">
                {currentNav.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                      'isBusiness' in item && item.isBusiness
                        ? "text-[#ff7a2b] hover:text-[#ff9a5f]"
                        : location.pathname === item.path
                          ? "text-[#2b6eff]"
                          : "text-[#8b90b0] hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              {user && (
                <Link
                  to="/notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#2a2f4a] bg-[#1e2235] text-[#8b90b0] transition hover:border-[#2b6eff] hover:text-white"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#ff4d4d] ring-2 ring-[#1e2235]" />
                </Link>
              )}
              {user ? (
                <AccountAvatarBadge user={user} />
              ) : (
                <Link
                  to="/auth/login"
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#2b6eff] bg-[#1a3f99] text-[#9fbdff] transition hover:bg-[#245be0] hover:text-white"
                  aria-label="Sign in"
                  title="Sign in"
                >
                  <UserIcon className="h-5 w-5" />
                </Link>
              )}
              {/* Hamburger menu toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2a2f4a] bg-[#1e2235] text-[#8b90b0] transition hover:border-[#2b6eff] hover:text-white md:hidden"
                aria-label="Menu"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-out Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 right-0 top-0 z-[110] flex w-80 flex-col border-l border-[#2a2f4a] bg-[#0d0f1a] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-[#f0f2ff]">Menu</h2>
                <button onClick={() => setIsMenuOpen(false)} className="rounded-full border border-[#2a2f4a] bg-[#1e2235] p-2 text-[#f0f2ff] transition-colors hover:border-[#2b6eff]">
                  <X className="w-6 h-6 text-[#f0f2ff]" />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">Navigation</p>
                {currentNav.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl border p-4 transition-all",
                      location.pathname === item.path ? "border-[#2b6eff]/30 bg-[#2b6eff]/15 text-[#2b6eff]" : "border-transparent text-[#8b90b0] hover:border-[#2a2f4a] hover:bg-[#1e2235] hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-bold">{item.label}</span>
                  </Link>
                ))}

                <div className="my-8 border-t border-[#2a2f4a] pt-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">Events Hub</p>
                  <div className="space-y-1">
                    {eventItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-4 rounded-2xl border p-4 transition-all",
                          location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1]) ? "border-[#2b6eff]/30 bg-[#2b6eff]/15 text-[#2b6eff]" : "border-transparent text-[#8b90b0] hover:border-[#2a2f4a] hover:bg-[#1e2235] hover:text-white"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-bold">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="my-8 border-t border-[#2a2f4a] pt-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">Profile & Business</p>
                  <div className="space-y-1">
                    {profileItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-4 rounded-2xl border p-4 transition-all",
                          location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1]) ? "border-[#2b6eff]/30 bg-[#2b6eff]/15 text-[#2b6eff]" : "border-transparent text-[#8b90b0] hover:border-[#2a2f4a] hover:bg-[#1e2235] hover:text-white"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-bold">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {user && (
                <button
                  onClick={() => { logout(); setIsMenuOpen(false); navigate('/auth/login') }}
                  className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-red-100 transition-all mt-auto"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 bg-[#0d0f1a]",
        isClientHome ? "mx-auto w-full max-w-2xl px-0 pb-24 pt-0" : "mx-auto w-full max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8",
      )}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around border-t border-[#2a2f4a] bg-[#0d0f1a] px-0 pb-[max(22px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl md:hidden">
        {(!user ? guestNav : customerNav).map((item) => {
          const isActive = location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1])
          const isBusiness = 'isBusiness' in item && item.isBusiness

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="group flex flex-1 cursor-pointer flex-col items-center gap-1 transition-all duration-200"
            >
              <div className={cn(
                "transition-all duration-200",
                isBusiness ? "text-[#ff7a2b]" : isActive ? "text-[#2b6eff]" : "text-[#4a4f70] group-hover:text-[#8b90b0]"
              )}>
                <item.icon className="h-[22px] w-[22px]" strokeWidth={2} />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none transition-all",
                isBusiness ? "text-[#ff7a2b]" : isActive ? "text-[#2b6eff]" : "text-[#4a4f70] opacity-90"
              )}>
                {item.label}
              </span>
              {isActive && !isBusiness && (
                <motion.div
                  layoutId="mobileNavDot"
                  className="mt-0.5 h-1 w-1 rounded-full bg-[#2b6eff]"
                />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
