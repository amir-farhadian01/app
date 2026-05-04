import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  MapPin,
  LogOut,
  Loader2,
  ShieldCheck,
  LayoutGrid,
  Lock,
  ChevronRight,
  Bell,
  HelpCircle,
  Settings,
} from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { StatusBanner, type KycBannerModel } from '../components/kyc/personal/StatusBanner';
import { HistoryCollapsible } from '../components/kyc/personal/HistoryCollapsible';
import { PersonalKycWizard } from '../components/kyc/personal/PersonalKycWizard';

type ProfileTabId = 'details' | 'identity' | 'hub' | 'security';

const TAB_IDS: ProfileTabId[] = ['details', 'identity', 'hub', 'security'];

const TABS: { id: ProfileTabId; label: string; icon: React.ElementType }[] = [
  { id: 'details', label: 'Profile', icon: User },
  { id: 'identity', label: 'Verification', icon: ShieldCheck },
  { id: 'hub', label: 'My hub', icon: LayoutGrid },
  { id: 'security', label: 'Security', icon: Lock },
];

const focusRing = 'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

function tabFromSearch(raw: string | null): ProfileTabId {
  if (raw && TAB_IDS.includes(raw as ProfileTabId)) return raw as ProfileTabId;
  return 'details';
}

/** Providers/admins: profile + KYC. Customers use `/account` (same flows moved there). */
export default function Profile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo(() => tabFromSearch(searchParams.get('tab')), [searchParams]);
  const { user, logout, refreshUser } = useAuth();

  useEffect(() => {
    if (user?.role === 'customer') {
      navigate('/account?section=account', { replace: true });
    }
  }, [user, navigate]);

  const [me, setMe] = useState<{
    role?: string;
    displayName?: string | null;
    phone?: string | null;
    bio?: string | null;
    location?: string | null;
  } | null>(null);
  const [profileLoadErr, setProfileLoadErr] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [bannerModel, setBannerModel] = useState<KycBannerModel>({ submissionStatus: 'none' });
  const [resubmitNonce, setResubmitNonce] = useState(0);

  const setTab = useCallback(
    (id: ProfileTabId) => {
      setSearchParams({ tab: id }, { replace: true });
    },
    [setSearchParams],
  );

  const onRequestResubmit = useCallback(() => {
    setResubmitNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileLoadErr(null);
    api
      .me()
      .then((m) => {
        setMe(m);
        setDisplayName(m.displayName || '');
        setPhone(m.phone || '');
        setBio(m.bio || '');
        setLocation(m.location || '');
      })
      .catch(() => {
        setProfileLoadErr('Could not load your profile from the server. Check your connection and try again.');
      });
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.put<typeof me>('/api/users/me', { displayName, phone, bio, location });
      setMe(updated);
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (user.role === 'customer') {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-neutral-500 text-sm">Opening account…</div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 px-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-app-text">Profile</h1>
        <p className="text-neutral-500 text-sm">{user.email}</p>
      </header>

      <div className="sticky top-0 z-30 -mx-1 px-1 py-2 bg-app-bg/90 backdrop-blur-sm border-b border-app-border/60">
        <div
          className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
          role="tablist"
          aria-label="Profile sections"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 shrink-0 px-3.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all',
                  on
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg'
                    : 'bg-app-card border border-app-border text-neutral-500 hover:text-app-text',
                  focusRing,
                )}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="space-y-6"
        >
          {activeTab === 'details' && (
            <div className="space-y-4">
              {profileLoadErr ? (
                <p className="text-sm text-amber-800 dark:text-amber-200 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                  {profileLoadErr}
                </p>
              ) : null}
              <motion.div layout className="bg-app-card border border-app-border rounded-[2rem] p-8 space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Edit your public profile
                </p>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Display name
                  </label>
                  <div className="relative">
                    <User className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full ps-11 pe-4 py-3 rounded-xl border border-app-border bg-app-input"
                      aria-label="Display name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Phone</label>
                  <PhoneInput country={'ca'} value={phone} onChange={setPhone} containerClass="!w-full" inputClass="!w-full !rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-app-border bg-app-input p-3"
                    aria-label="Bio"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Location</label>
                  <div className="relative">
                    <MapPin className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full ps-11 pe-4 py-3 rounded-xl border border-app-border bg-app-input"
                      aria-label="Location"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  className={cn(
                    'w-full py-3 rounded-2xl bg-neutral-900 text-white font-bold flex items-center justify-center gap-2 dark:bg-white dark:text-neutral-900',
                    focusRing,
                  )}
                  aria-label="Save profile"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
                  Save
                </button>
                {me?.role && (
                  <p className="text-xs text-neutral-500">
                    Role: <strong>{me.role}</strong>
                  </p>
                )}
              </motion.div>
            </div>
          )}

          {activeTab === 'identity' && (
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

          {activeTab === 'hub' && (
            <div className="bg-app-card border border-app-border rounded-[2rem] p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Shortcuts</p>
              <p className="text-sm text-neutral-500">Provider tools are on your dashboard and company pages.</p>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/dashboard"
                    className={cn(
                      'flex items-center justify-between gap-3 min-h-[48px] p-4 rounded-2xl border border-app-border hover:border-neutral-900 dark:hover:border-white transition-colors',
                      focusRing,
                    )}
                  >
                    <span className="text-sm font-bold text-app-text">Provider dashboard</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" aria-hidden />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard?tab=kyc"
                    className={cn(
                      'flex items-center justify-between gap-3 min-h-[48px] p-4 rounded-2xl border border-app-border hover:border-neutral-900 dark:hover:border-white transition-colors',
                      focusRing,
                    )}
                  >
                    <span className="text-sm font-bold text-app-text">Business KYC</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" aria-hidden />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/notifications"
                    className={cn(
                      'flex items-center justify-between gap-3 min-h-[48px] p-4 rounded-2xl border border-app-border hover:border-neutral-900 dark:hover:border-white transition-colors',
                      focusRing,
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-app-text">
                      <Bell className="w-4 h-4 text-neutral-400" aria-hidden />
                      Notifications
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" aria-hidden />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/profile?tab=security"
                    className={cn(
                      'flex items-center justify-between gap-3 min-h-[48px] p-4 rounded-2xl border border-app-border hover:border-neutral-900 dark:hover:border-white transition-colors',
                      focusRing,
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-app-text">
                      <Settings className="w-4 h-4 text-neutral-400" aria-hidden />
                      Settings
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" aria-hidden />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/tickets"
                    className={cn(
                      'flex items-center justify-between gap-3 min-h-[48px] p-4 rounded-2xl border border-app-border hover:border-neutral-900 dark:hover:border-white transition-colors',
                      focusRing,
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-app-text">
                      <HelpCircle className="w-4 h-4 text-neutral-400" aria-hidden />
                      Help &amp; support
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" aria-hidden />
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-app-card border border-app-border rounded-[2rem] p-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Session</p>
              <p className="text-sm text-neutral-500">
                Sign out on this device. For password changes, use the flow from your account email when available.
              </p>
              <button
                type="button"
                onClick={() => logout().then(() => navigate('/'))}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-app-border text-red-600 font-bold',
                  focusRing,
                )}
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" aria-hidden />
                Sign out
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
