import { useState } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Home,
  User as UserIcon,
  Bell,
  Menu,
  X,
  Search,
  History,
  BriefcaseBusiness,
  LogOut,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { motion, AnimatePresence } from 'motion/react'
import { AccountAvatarBadge } from '../ui/AccountAvatarBadge'

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Explore', path: '/explore' },
]

export function PublicLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const guestNav = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Explore', icon: Search, path: '/explore' },
    { label: 'Orders', icon: History, path: '/app/orders' },
  ]

  const customerNav = [
    { label: 'Home', icon: Home, path: '/app/home' },
    { label: 'Explore', icon: Search, path: '/explore' },
    { label: 'Orders', icon: History, path: '/app/orders' },
    { label: 'Business', icon: BriefcaseBusiness, path: '/business', isBusiness: true },
  ]

  return (
    <div className="min-h-screen bg-[#0d0f1a] font-sans text-[#f0f2ff] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#2a2f4a] bg-[#0d0f1a]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2b6eff]/30 bg-[#2b6eff]/15 text-[#2b6eff]">
              <Home className="h-5 w-5 fill-current" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight text-white">NeighborHub</span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a4f70] sm:block">Canada local app</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                  location.pathname === link.path
                    ? "text-[#2b6eff]"
                    : "text-[#8b90b0] hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <>
                <Link
                  to="/notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#2a2f4a] bg-[#1e2235] text-[#8b90b0] transition hover:border-[#2b6eff] hover:text-white"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#ff4d4d] ring-2 ring-[#1e2235]" />
                </Link>
                <AccountAvatarBadge user={user} />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth/login"
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#2b6eff] bg-[#1a3f99] text-[#9fbdff] transition hover:bg-[#245be0] hover:text-white"
                  aria-label="Sign in"
                  title="Sign in"
                >
                  <UserIcon className="h-5 w-5" />
                </Link>
                <Link
                  to="/auth/register"
                  className="hidden sm:flex items-center gap-2 rounded-xl bg-[#2b6eff] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-[#245be0]"
                >
                  Get Started
                </Link>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2a2f4a] bg-[#1e2235] text-[#8b90b0] transition hover:border-[#2b6eff] hover:text-white md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 right-0 top-0 z-[110] flex w-72 flex-col border-l border-[#2a2f4a] bg-[#0d0f1a] p-6 shadow-2xl md:hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black italic uppercase tracking-tight text-[#f0f2ff]">Menu</h2>
                <button onClick={() => setMobileOpen(false)} className="rounded-full border border-[#2a2f4a] bg-[#1e2235] p-2 text-[#f0f2ff] transition-colors hover:border-[#2b6eff]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl border p-4 transition-all",
                      location.pathname === link.path
                        ? "border-[#2b6eff]/30 bg-[#2b6eff]/15 text-[#2b6eff]"
                        : "border-transparent text-[#8b90b0] hover:border-[#2a2f4a] hover:bg-[#1e2235] hover:text-white"
                    )}
                  >
                    <span className="font-bold">{link.label}</span>
                  </Link>
                ))}
              </nav>

              {user ? (
                <div className="mt-auto pt-4 border-t border-[#2a2f4a] space-y-2">
                  <Link
                    to="/app/home"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#8b90b0] transition-all hover:bg-[#1e2235] hover:text-white"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { setMobileOpen(false); logout(); navigate('/auth/login') }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#ff4d4d] transition-all hover:bg-red-500/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="mt-auto pt-4 border-t border-[#2a2f4a] space-y-2">
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center rounded-xl bg-[#2b6eff] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#245be0]"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center rounded-xl border border-[#2a2f4a] px-4 py-3 text-sm font-bold text-[#8b90b0] transition hover:bg-[#1e2235] hover:text-white"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 bg-[#0d0f1a]">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around border-t border-[#2a2f4a] bg-[#0d0f1a] px-0 pb-[max(22px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl md:hidden">
        {(!user ? guestNav : customerNav).map((item) => {
          const isActive = location.pathname === item.path
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
