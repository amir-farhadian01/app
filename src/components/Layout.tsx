import React, { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { isAdminPanelPort, isStaffPlatformRole } from '../lib/adminPort';
import {
  LogOut,
  Home,
  User as UserIcon,
  Bell,
  Sparkles,
  Building2,
  ClipboardList,
  MessageSquare,
  Users,
  Menu,
  X,
  DollarSign,
  Sun,
  Moon,
  Search,
  History,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme, useCmsProps } from '../ThemeContext';
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
  const { mode, toggleTheme } = useTheme();
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
    { label: 'Chat AI', icon: Sparkles, path: '/ai-consultant' },
    { label: 'Explore', icon: Search, path: '/services', isMiddle: true },
    { label: 'Orders', icon: History, path: '/orders' },
    { label: 'Account', icon: UserIcon, path: '/account' },
    { label: 'My Hub', icon: ClipboardList, path: '/dashboard' },
  ];

  const guestNav = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Chat AI', icon: Sparkles, path: '/ai-consultant' },
    { label: 'Explore', icon: Search, path: '/services', isMiddle: true },
    { label: 'Orders', icon: History, path: '/orders' },
    { label: 'Account', icon: UserIcon, path: '/account' },
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

  return (
    <div className="min-h-screen bg-app-bg font-sans text-app-text">
      <header 
        className="sticky top-0 z-50 bg-app-card/80 backdrop-blur-md border-b border-app-border"
        style={{
          ...navProps.styles,
          borderBottomWidth: navProps.styles?.borderWidth || '1px',
          display: navProps.styles?.display || 'flex'
        }}
      >
        <div className="w-full px-3 sm:px-5 lg:px-6 h-16 flex items-center">
          <Link to={isAdmin && !isPanel ? '/' : isAdmin ? '/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-xl tracking-tight italic uppercase text-app-text">Neighborly</span>
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
                      location.pathname === item.path ? "text-app-text" : "text-neutral-400 hover:text-neutral-600"
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
              <button 
                onClick={toggleTheme}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {mode === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              {user && !isAdmin && (
                <button 
                  onClick={() => setIsMenuOpen(true)}
                  className="p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all relative"
                >
                  <Menu className="w-5 h-5 text-app-text" />
                  <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </button>
              )}
              {user ? (
                <button 
                  onClick={() => logout().then(() => navigate('/auth'))}
                  className="p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all text-neutral-400 hover:text-red-500"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : location.pathname !== '/' ? (
                <Link 
                  to="/auth"
                  className="px-5 py-2 bg-neutral-900 text-white text-sm font-bold rounded-full hover:bg-neutral-800 transition-all shadow-sm"
                >
                  Get Started
                </Link>
              ) : null}
              {user && <AccountAvatarBadge user={user} role={role} />}
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
              className="fixed top-0 right-0 bottom-0 w-80 bg-app-card z-[110] shadow-2xl p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Menu</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-app-input rounded-full transition-colors text-app-text">
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
                      "flex items-center gap-4 p-4 rounded-2xl transition-all",
                      location.pathname === item.path ? "bg-neutral-900 text-white shadow-xl" : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
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
                          "flex items-center gap-4 p-4 rounded-2xl transition-all",
                          location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1]) ? "bg-neutral-900 text-white shadow-xl" : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
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
                          "flex items-center gap-4 p-4 rounded-2xl transition-all",
                          location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1]) ? "bg-neutral-900 text-white shadow-xl" : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {children}
      </main>

      {/* Mobile Bottom Navigation for Customers & Guests (never on admin-only port) */}
      {!isPanel && (role === 'customer' || !user) && (
        <nav className="md:hidden fixed bottom-2 left-1/2 -translate-x-1/2 z-[100] w-[70vw] max-w-[420px] min-w-[260px] rounded-3xl border border-[#BCCCDC] bg-[#BCCCDC]/90 backdrop-blur-xl px-2 py-1.5 flex items-center justify-between shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
          {(!user ? guestNav : customerNav).map((item) => {
            const isActive = location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1]);
            
            if (item.isMiddle) {
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="relative -mt-10 group"
                >
                  <div className={cn(
                    "w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-2xl",
                    isActive 
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 scale-110 rotate-12" 
                      : "bg-neutral-900/90 dark:bg-white/90 text-white dark:text-neutral-900"
                  )}>
                    <item.icon className="w-8 h-8" />
                  </div>
                  <div className="absolute inset-x-0 -bottom-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-black uppercase tracking-widest text-app-text">{item.label}</span>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest transition-all",
                  isActive ? "text-app-text opacity-100" : "text-neutral-400 opacity-60"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="mobileNavDot"
                    className="w-1 h-1 bg-neutral-900 dark:bg-white rounded-full mt-0.5"
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
