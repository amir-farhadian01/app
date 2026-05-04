import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import {
  User,
  ClipboardList,
  Calendar,
  MessageSquare,
  FileText,
  CreditCard,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  MapPin,
  Lock,
  Link2,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { handleApiError, OperationType } from '../lib/errors';
import { cn } from '../lib/utils';
import { StatusBanner, type KycBannerModel } from '../components/kyc/personal/StatusBanner';
import { HistoryCollapsible } from '../components/kyc/personal/HistoryCollapsible';
import { PersonalKycWizard } from '../components/kyc/personal/PersonalKycWizard';

type SectionId =
  | 'account'
  | 'google'
  | 'password'
  | 'identity'
  | 'orders'
  | 'appointments'
  | 'messages'
  | 'contracts'
  | 'payments'
  | 'notifications'
  | 'help'
  | 'settings';

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType; hint: string }[] = [
  { id: 'account', label: 'Account', icon: User, hint: 'Name, phone, address' },
  { id: 'google', label: 'Google', icon: Link2, hint: 'Link Google sign-in' },
  { id: 'password', label: 'Password', icon: Lock, hint: 'Change password' },
  { id: 'identity', label: 'KYC', icon: ShieldCheck, hint: 'Identity verification' },
  { id: 'orders', label: 'My orders', icon: ClipboardList, hint: 'Active · Past · Cancelled' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, hint: 'Upcoming · Past' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, hint: 'Chats & tickets' },
  { id: 'contracts', label: 'Contracts', icon: FileText, hint: 'Read & sign' },
  { id: 'payments', label: 'Payments', icon: CreditCard, hint: 'Receipts' },
  { id: 'notifications', label: 'Notifications', icon: Bell, hint: 'Alerts' },
  { id: 'help', label: 'Help', icon: HelpCircle, hint: 'Support' },
  { id: 'settings', label: 'Settings', icon: Settings, hint: 'Preferences' },
];

const focusRing = 'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function ClientAccount() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSection = searchParams.get('section');
  const section = ((rawSection === 'profile' ? 'account' : rawSection) as SectionId) || 'account';
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [apptTab, setApptTab] = useState<'upcoming' | 'past'>('upcoming');
  const [notifTab, setNotifTab] = useState<'chat' | 'orders' | 'system'>('chat');
  const [kycNeedsAttention, setKycNeedsAttention] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [googleLinked, setGoogleLinked] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountErr, setAccountErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  const [bannerModel, setBannerModel] = useState<KycBannerModel>({ submissionStatus: 'none' });
  const [resubmitNonce, setResubmitNonce] = useState(0);

  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleErr, setGoogleErr] = useState<string | null>(null);
  const [googleOk, setGoogleOk] = useState<string | null>(null);

  const onRequestResubmit = useCallback(() => {
    setResubmitNonce((n) => n + 1);
  }, []);

  const loadAccountFields = useCallback(async () => {
    if (!user) return;
    try {
      const me = await api.me();
      setFirstName(me.firstName || '');
      setLastName(me.lastName || '');
      setPhone(me.phone || '');
      setAddress(me.address || '');
      setGoogleLinked(!!me.googleLinked);
    } catch {
      /* ignore */
    }
  }, [user]);

  const setSection = useCallback(
    (id: SectionId) => {
      setSearchParams({ section: id }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const me = await api.me();
        if (me.role && me.role !== 'customer') {
          navigate('/profile', { replace: true });
          return;
        }
        setRole(me.role);
      } catch {
        setRole('customer');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  useEffect(() => {
    loadAccountFields();
  }, [loadAccountFields]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [reqList, cList, txList, tkList] = await Promise.all([
        api.get<any[]>('/api/requests'),
        api.get<any[]>('/api/contracts'),
        api.get<any[]>('/api/transactions'),
        api.get<any[]>('/api/tickets'),
      ]);
      setRequests(reqList || []);
      setContracts(cList || []);
      setTransactions(txList || []);
      setTickets(tkList || []);
    } catch (e) {
      try {
        await handleApiError(e, OperationType.LIST, 'client-account');
      } catch {
        /* noop */
      }
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ identityVerified?: boolean }>('/api/kyc/me')
      .then((k) => setKycNeedsAttention(k.identityVerified !== true))
      .catch(() => setKycNeedsAttention(false));
  }, [user]);

  useEffect(() => {
    if (rawSection === 'profile') {
      setSearchParams({ section: 'account' }, { replace: true });
    }
  }, [rawSection, setSearchParams]);

  useEffect(() => {
    const valid = SECTIONS.some((s) => s.id === section);
    if (!valid) setSection('account');
  }, [section, setSection]);

  const saveAccount = async () => {
    setAccountErr(null);
    setAccountSaving(true);
    try {
      await api.put('/api/users/me', {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      await refreshUser();
      await loadAccountFields();
    } catch (e: unknown) {
      setAccountErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setAccountSaving(false);
    }
  };

  const submitPasswordChange = async () => {
    setPasswordErr(null);
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordErr('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('New password and confirmation do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      await api.post('/api/users/me/change-password', {
        currentPassword: currentPassword,
        newPassword,
      });
      setPasswordMsg('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      setPasswordErr(e instanceof Error ? e.message : 'Could not change password');
    } finally {
      setPasswordBusy(false);
    }
  };

  const onGoogleLinkSuccess = async (cred: CredentialResponse) => {
    if (!cred.credential) return;
    setGoogleErr(null);
    setGoogleOk(null);
    setGoogleBusy(true);
    try {
      await api.post<{ success?: boolean }>('/api/auth/google/link', { idToken: cred.credential });
      setGoogleOk('Google account linked. You can sign in with Google next time.');
      await refreshUser();
      await loadAccountFields();
    } catch (e: unknown) {
      setGoogleErr(e instanceof Error ? e.message : 'Link failed');
    } finally {
      setGoogleBusy(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-app-border border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (role && role !== 'customer') {
    return null;
  }

  const totalSpent = transactions.filter((t) => t.type === 'outcome').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="max-w-lg mx-auto pb-28 space-y-4 px-1">
      <header className="flex items-start justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-app-text">Account</h1>
          <p className="text-sm text-neutral-500 font-medium mt-1">{user.email}</p>
        </div>
      </header>

      <div className="sticky top-0 z-30 -mx-1 px-1 py-2 bg-app-bg/90 backdrop-blur-sm border-b border-app-border/60">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const on = section === s.id;
            const kycDot = s.id === 'identity' && kycNeedsAttention;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  'relative flex items-center gap-1.5 shrink-0 px-3.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all',
                  on
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg'
                    : 'bg-app-card border border-app-border text-neutral-500 hover:text-app-text',
                  focusRing,
                )}
                title={s.hint}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
                {kycDot ? (
                  <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-red-500" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="space-y-4 px-1"
        >
          {section === 'account' && (
            <div className="bg-app-card border border-app-border rounded-[1.75rem] p-6 space-y-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Your details</p>
              {accountErr ? (
                <p className="text-sm text-red-600" role="alert">
                  {accountErr}
                </p>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">First name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-app-border bg-app-input text-app-text"
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Last name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-app-border bg-app-input text-app-text"
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Phone</label>
                <PhoneInput country={'ca'} value={phone} onChange={setPhone} containerClass="!w-full" inputClass="!w-full !rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Address</label>
                <div className="relative">
                  <MapPin className="absolute start-3 top-3 w-4 h-4 text-neutral-400 pointer-events-none" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full ps-10 pe-3 py-3 rounded-xl border border-app-border bg-app-input text-app-text resize-y"
                    placeholder="Street, city, postal code"
                    autoComplete="street-address"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={accountSaving}
                onClick={() => void saveAccount()}
                className={cn(
                  'w-full py-3 rounded-2xl bg-neutral-900 text-white font-bold dark:bg-white dark:text-neutral-900 flex items-center justify-center gap-2 disabled:opacity-50',
                  focusRing,
                )}
              >
                {accountSaving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
                Save
              </button>
            </div>
          )}

          {section === 'google' && (
            <div className="bg-app-card border border-app-border rounded-[1.75rem] p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Google</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {googleLinked
                  ? 'Your Neighborly account is linked with Google. You can sign in with Google on the login page.'
                  : 'Link your Google account to sign in faster. Your email should match this account.'}
              </p>
              {googleOk ? <p className="text-sm text-emerald-600">{googleOk}</p> : null}
              {googleErr ? (
                <p className="text-sm text-red-600" role="alert">
                  {googleErr}
                </p>
              ) : null}
              {!googleClientId ? (
                <p className="text-xs text-amber-700 dark:text-amber-300 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  Google sign-in is not configured. Set <code className="text-[10px]">VITE_GOOGLE_CLIENT_ID</code> and{' '}
                  <code className="text-[10px]">GOOGLE_CLIENT_ID</code> in <code className="text-[10px]">.env</code>.
                </p>
              ) : googleLinked ? null : (
                <div className="flex flex-wrap items-center gap-3">
                  {googleBusy ? <Loader2 className="w-5 h-5 animate-spin text-neutral-500" aria-hidden /> : null}
                  <GoogleLogin
                    onSuccess={(c) => void onGoogleLinkSuccess(c)}
                    onError={() => setGoogleErr('Google popup failed or was closed.')}
                    text="continue_with"
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    width="100%"
                  />
                </div>
              )}
            </div>
          )}

          {section === 'password' && (
            <div className="bg-app-card border border-app-border rounded-[1.75rem] p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Change password</p>
              <p className="text-xs text-neutral-500">
                If you registered with Google only and have no password, use Google sign-in or contact support.
              </p>
              {passwordMsg ? <p className="text-sm text-emerald-600">{passwordMsg}</p> : null}
              {passwordErr ? (
                <p className="text-sm text-red-600" role="alert">
                  {passwordErr}
                </p>
              ) : null}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-app-border bg-app-input"
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-app-border bg-app-input"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Confirm new</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-app-border bg-app-input"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="button"
                disabled={passwordBusy}
                onClick={() => void submitPasswordChange()}
                className={cn(
                  'w-full py-3 rounded-2xl bg-neutral-900 text-white font-bold dark:bg-white dark:text-neutral-900 disabled:opacity-50',
                  focusRing,
                )}
              >
                {passwordBusy ? <Loader2 className="w-4 h-4 animate-spin inline" aria-hidden /> : null} Update password
              </button>
            </div>
          )}

          {section === 'identity' && user && (
            <div className="space-y-6">
              <StatusBanner model={bannerModel} />
              <HistoryCollapsible />
              <PersonalKycWizard
                userId={user.id}
                displayName={user.displayName}
                onBannerChange={setBannerModel}
                onRequestResubmit={onRequestResubmit}
                resubmitNonce={resubmitNonce}
              />
            </div>
          )}

          {section === 'orders' && (
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">My orders</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Active, past, and cancelled bookings from the order wizard are listed together.
              </p>
              <Link
                to="/orders"
                className={cn(
                  'flex w-full min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-card px-4 py-3 font-bold text-app-text transition-colors hover:border-neutral-400 dark:hover:border-neutral-600',
                  focusRing,
                )}
              >
                <span>Open order history</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
              </Link>
            </div>
          )}

          {section === 'appointments' && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Appointments</p>
              <div className="flex rounded-2xl bg-app-card border border-app-border p-1 gap-1">
                {(
                  [
                    { id: 'upcoming' as const, label: 'Upcoming' },
                    { id: 'past' as const, label: 'Past' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setApptTab(t.id)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                      apptTab === t.id
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'text-neutral-500',
                      focusRing,
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-neutral-500 p-4 bg-amber-50/80 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                When scheduling is connected, your bookings will appear here.
              </p>
            </div>
          )}

          {section === 'messages' && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Messages</p>
              {tickets.length === 0 ? (
                <p className="text-sm text-neutral-500 p-6 text-center bg-app-card border border-dashed border-app-border rounded-2xl">
                  No messages yet. Support tickets will show here.
                </p>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/tickets?id=${t.id}`)}
                    className="w-full p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between"
                  >
                    <span className="font-bold text-sm text-left">{t.subject}</span>
                    <ChevronRight className="w-4 h-4 text-neutral-300" />
                  </button>
                ))
              )}
              <Link to="/tickets" className="inline-flex items-center gap-1 text-sm font-bold text-blue-600">
                Open support
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {section === 'contracts' && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Contracts</p>
              {contracts.length === 0 ? (
                <p className="text-sm text-neutral-500 p-6 text-center bg-app-card border border-dashed border-app-border rounded-2xl">
                  No contracts yet.
                </p>
              ) : (
                contracts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/contract/${c.id}`)}
                    className="w-full p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between"
                  >
                    <span className="font-bold text-sm">Contract {String(c.id).slice(0, 8)}</span>
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg',
                        c.status === 'signed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                      )}
                    >
                      {c.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {section === 'payments' && (
            <div className="space-y-4">
              <div className="p-5 rounded-[1.5rem] bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 dark:text-neutral-500">Total spent</p>
                <p className="text-3xl font-black mt-1">${totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-app-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">History</p>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-app-border">
                  {transactions.length === 0 ? (
                    <p className="p-6 text-sm text-neutral-500 text-center">No transactions.</p>
                  ) : (
                    transactions.map((t) => (
                      <div key={t.id} className="p-4 flex justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-400 truncate pr-2">{t.description || '—'}</span>
                        <span className="font-bold shrink-0">${t.amount}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Notification center</p>
              <div className="flex rounded-2xl bg-app-card border border-app-border p-1 gap-1">
                {(
                  [
                    { id: 'chat' as const, label: 'Chat' },
                    { id: 'orders' as const, label: 'Orders' },
                    { id: 'system' as const, label: 'System' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNotifTab(t.id)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                      notifTab === t.id
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'text-neutral-500',
                      focusRing,
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Link
                to="/notifications"
                className="flex items-center justify-between p-4 bg-app-card border border-app-border rounded-2xl font-bold text-sm"
              >
                Open all alerts
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {section === 'help' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className={cn(
                  'w-full p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between font-bold',
                  focusRing,
                )}
              >
                Support & tickets
                <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-sm text-neutral-500 p-4 bg-app-card border border-dashed border-app-border rounded-2xl">
                FAQ and policies can be linked here from CMS later.
              </p>
            </div>
          )}

          {section === 'settings' && (
            <div className="space-y-4">
              <div className="p-4 bg-app-card border border-app-border rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Push (placeholder)</p>
                <div className="space-y-3 text-sm">
                  <label className="flex items-center justify-between">
                    <span>Order updates</span>
                    <input type="checkbox" defaultChecked className="rounded" readOnly />
                  </label>
                  <label className="flex items-center justify-between">
                    <span>Chat</span>
                    <input type="checkbox" defaultChecked className="rounded" readOnly />
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout().then(() => navigate('/'))}
                className={cn(
                  'w-full py-4 rounded-2xl bg-red-50 text-red-600 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2',
                  focusRing,
                )}
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
