import React, { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { isAdminPanelPort, isStaffPlatformRole } from '../lib/adminPort';
import {
  LogOut,
  Home,
  User as UserIcon,
  Bell,
  Building2,
  BriefcaseBusiness,
  ClipboardList,
  MessageSquare,
  Users,
  Menu,
  X,
  DollarSign,
  Search,
  History,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useCmsProps } from '../ThemeContext';
import { AccountAvatarBadge } from './AccountAvatarBadge';

interface LayoutProps {
  children: ReactNode;
  role: string | null;
  companyId?: string | null;
}

export default function Layout({ children, role, companyId }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navProps = useCmsProps('navbar', 'Global Navbar');

  const isAdmin = isStaffPlatformRole(role);
  const isPanel = isAdminPanelPort();

  /** Dedicated admin port: no main site header/footer/nav; only page content + a tiny sign-out. */
  if (isPanel) {
    return (
      <div className="min-h-screen bg-app-bg font-sans text-app-text">
        {user && (
          <>
            <div className="fixed top-4 end-4 z-[200] flex items-center gap-3">
              <AccountAvatarBadge user={user} role={role} size="sm" />
            </div>
            <button
              type="button"
              onClick={() => logout().then(() => navigate('/auth'))}
              className="fixed bottom-4 end-4 z-[200] p-3 rounded-2xl bg-neutral-900 text-white shadow-lg hover:bg-neutral-800"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        )}
        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1">{children}</main>
      </div>
    );
  }
  
  const customerNav = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Explore', icon: Search, path: '/services' },
    { label: 'Orders', icon: History, path: '/orders' },
    { label: 'Business', icon: BriefcaseBusiness, path: '/dashboard', isBusiness: true },
  ];

  const guestNav = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Explore', icon: Search, path: '/services' },
    { label: 'Orders', icon: History, path: '/orders' },
  ];

  const providerNav = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Explorer', icon: Search, path: '/services' },
  ];

  /** Admins: no top tabs / slide menu — real access is email login + dashboard only */
  const currentNav = isAdmin ? [] : (role === 'provider' ? providerNav : (user ? customerNav : guestNav));

  const eventItems = [
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Tickets', icon: MessageSquare, path: '/tickets' },
  ];

  if (role === 'provider') {
    eventItems.push({ label: 'Schedule', icon: ClipboardList, path: '/dashboard?tab=schedule' });
  }

  const profileItems: { label: string; icon: typeof UserIcon; path: string }[] = [
    {
      label: 'My Profile',
      icon: UserIcon,
      path: role === 'customer' ? '/account?section=account' : '/profile',
    },
  ];

  if (role === 'customer') {
    profileItems.unshift({ label: 'Account', icon: UserIcon, path: '/account' });
    profileItems.push(
      { label: 'My Requests', icon: ClipboardList, path: '/dashboard?tab=requests' },
      { label: 'Spending', icon: DollarSign, path: '/dashboard?tab=finance' },
    );
  }

  if (role === 'provider') {
    if (companyId) {
      profileItems.push(
        { label: 'Company', icon: Building2, path: '/dashboard?tab=overview' },
        { label: 'Members', icon: Users, path: '/dashboard?tab=staff' },
        { label: 'Finance', icon: DollarSign, path: '/dashboard?tab=finance' }
      );
    } else {
      profileItems.push(
        { label: 'Company', icon: Building2, path: '/dashboard?tab=company' },
        { label: 'Members', icon: Users, path: '/dashboard?tab=members' },
        { label: 'Finance', icon: DollarSign, path: '/dashboard?tab=finance' }
      );
    }
  }

  const isClientHome = !isAdmin && location.pathname === '/';

  return (
    <div className="client-shell min-h-screen bg-[#0d0f1a] font-sans text-app-text">
      <header 
        className="sticky top-0 z-50 border-b border-app-border bg-[#0d0f1a]/95 backdrop-blur-xl"
        style={{
          ...navProps.styles,
          borderBottomWidth: navProps.styles?.borderWidth || '1px',
          display: navProps.styles?.display || 'flex'
        }}
      >
        <div className="w-full px-3 sm:px-5 lg:px-6 h-16 flex items-center">
          <Link to={isAdmin && !isPanel ? '/' : isAdmin ? '/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
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

            {isAdmin && user?.email && (
              <span className="hidden md:inline max-w-[220px] truncate text-xs text-neutral-500 font-medium" title={user.email}>
                {user.email}
              </span>
            )}

            <div className="flex items-center gap-3 sm:gap-4">
              {user && !isAdmin && (
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
              {user && !isAdmin ? (
                <AccountAvatarBadge user={user} role={role} />
              ) : !user && !isAdmin ? (
                <Link
                  to="/auth"
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#2b6eff] bg-[#1a3f99] text-[#9fbdff] transition hover:bg-[#245be0] hover:text-white"
                  aria-label="Sign in"
                  title="Sign in"
                >
                  <UserIcon className="h-5 w-5" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && !isAdmin && (
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
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Menu</h2>
                <button onClick={() => setIsMenuOpen(false)} className="rounded-full border border-[#2a2f4a] bg-[#1e2235] p-2 text-app-text transition-colors hover:border-[#2b6eff]">
                  <X className="w-6 h-6 text-app-text" />
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

                <div className="my-8 border-t border-app-border pt-8">
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

                <div className="my-8 border-t border-app-border pt-8">
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
                  onClick={() => logout().then(() => { setIsMenuOpen(false); navigate('/auth'); })}
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

      <main className={cn(
        "flex-1 bg-[#0d0f1a]",
        isClientHome ? "mx-auto w-full max-w-2xl px-0 pb-24 pt-0" : "mx-auto w-full max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8",
      )}>
        {children}
      </main>

      {/* Mobile Bottom Navigation for Customers & Guests (never on admin-only port) */}
      {!isPanel && (role === 'customer' || !user) && (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around border-t border-[#2a2f4a] bg-[#0d0f1a] px-0 pb-[max(22px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl md:hidden">
          {(!user ? guestNav : customerNav).map((item) => {
            const isActive = location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1]);
            const isBusiness = 'isBusiness' in item && item.isBusiness;

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
            );
          })}
        </nav>
      )}

    </div>
  );
}
