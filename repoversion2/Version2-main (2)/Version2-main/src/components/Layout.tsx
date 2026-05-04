import React, { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, Home, LayoutDashboard, User as UserIcon, Bell, Compass, Sparkles, Briefcase, Building2, ClipboardList, MessageSquare, Users, Menu, X, DollarSign, Sun, Moon, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme, useCmsProps } from '../ThemeContext';

interface LayoutProps {
  children: ReactNode;
  user: User | null | undefined;
  role: string | null;
  companyId?: string | null;
}

export default function Layout({ children, user, role, companyId }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { mode, toggleTheme } = useTheme();
  const navProps = useCmsProps('navbar', 'Global Navbar');
  const footerProps = useCmsProps('footer', 'Global Footer');

  const isAdmin = ['owner', 'platform_admin', 'support', 'finance'].includes(role || '');
  
  const customerNav = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Explorer', icon: Search, path: '/services' },
    { label: 'AI', icon: Sparkles, path: '/ai-consultant' },
  ];

  const guestNav = customerNav;

  const providerNav = customerNav;

  const adminNav = customerNav;

  const currentNav = isAdmin ? adminNav : (role === 'provider' ? providerNav : (user ? customerNav : guestNav));

  const eventItems = [
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Tickets', icon: MessageSquare, path: '/tickets' },
  ];

  if (role === 'provider') {
    eventItems.push({ label: 'Schedule', icon: ClipboardList, path: '/dashboard?tab=schedule' });
  }

  const profileItems = [
    { label: 'My Profile', icon: UserIcon, path: '/profile' },
  ];

  if (role === 'customer') {
    profileItems.push(
      { label: 'My Requests', icon: ClipboardList, path: '/dashboard?tab=requests' },
      { label: 'Spending', icon: DollarSign, path: '/dashboard?tab=finance' }
    );
  }

  if (role === 'provider') {
    profileItems.push(
      { label: 'Company', icon: Building2, path: '/dashboard?tab=company' },
      { label: 'Members', icon: Users, path: '/dashboard?tab=members' },
      { label: 'Finance', icon: DollarSign, path: '/dashboard?tab=finance' }
    );
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm rotate-45" />
            </div>
            <span className="font-bold text-xl tracking-tight italic uppercase text-app-text">Neighborly</span>
          </Link>

          <div className="flex items-center gap-8">
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

            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {mode === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              {user && (
                <button 
                  onClick={() => setIsMenuOpen(true)}
                  className="p-2 hover:bg-neutral-50 rounded-xl transition-all relative"
                >
                  <Menu className="w-5 h-5 text-app-text" />
                  <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </button>
              )}
              {user ? (
                <button 
                  onClick={() => auth.signOut()}
                  className="p-2 hover:bg-neutral-50 rounded-xl transition-all text-neutral-400 hover:text-red-500"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <Link 
                  to="/auth"
                  className="px-5 py-2 bg-neutral-900 text-white text-sm font-bold rounded-full hover:bg-neutral-800 transition-all shadow-sm"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

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
                      location.pathname === item.path ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl" : "hover:bg-app-bg text-app-text/70"
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
                          (location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1])) ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl" : "hover:bg-app-bg text-app-text/70"
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
                          (location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1])) ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl" : "hover:bg-app-bg text-app-text/70"
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
                  onClick={() => auth.signOut()}
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

      {/* Mobile Bottom Navigation for All Users */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-app-card/80 backdrop-blur-xl border-t border-app-border px-6 pb-6 pt-2 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        {currentNav.map((item) => {
          const isActive = location.pathname === item.path || (item.path.includes('?') && location.search === '?' + item.path.split('?')[1]);
          
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-lg" : "text-neutral-400 group-hover:text-neutral-600"
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

      <footer 
        className="bg-app-card border-t border-app-border py-12 mt-20 hidden md:block"
        style={{
          ...footerProps.styles,
          borderTopWidth: footerProps.styles?.borderWidth || '1px',
          display: footerProps.styles?.display || 'block'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-neutral-900 rounded flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-sm rotate-45" />
                </div>
                <span className="font-bold text-lg tracking-tight italic uppercase">Neighborly</span>
              </div>
              <p className="text-neutral-500 text-sm max-w-xs">
                Connecting neighbors with trusted local service providers. Building stronger communities, one task at a time.
              </p>
            </div>
          </div>
          <div className="border-t border-app-border mt-12 pt-8 flex justify-between items-center text-xs text-neutral-400">
            <p>© 2026 Neighborly Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
