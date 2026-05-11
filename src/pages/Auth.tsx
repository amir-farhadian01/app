import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { getAdminPanelOrigin, isAdminPanelPort, isStaffPlatformRole } from '../lib/adminPort';

function safeAppReturnPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return null;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

export default function Auth() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = useMemo(() => {
    const fromState = safeAppReturnPath((location.state as { returnTo?: unknown } | null)?.returnTo);
    const fromQuery = safeAppReturnPath(searchParams.get('returnTo'));
    return fromState ?? fromQuery;
  }, [location.state, searchParams]);

  const getLoginErrorMessage = (err: any): string => {
    const code = err?.body?.code;
    if (code === 'EMAIL_NOT_FOUND') return 'This email does not exist.';
    if (code === 'INVALID_PASSWORD') return 'Password is incorrect.';
    return err?.message || 'Authentication failed';
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const me = await login(email, password);
      if (returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }
      if (isStaffPlatformRole(me.role) && !isAdminPanelPort()) {
        window.location.replace(`${getAdminPanelOrigin()}/dashboard`);
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (resetPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setError('Password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      await api.resetPassword(email.trim(), resetPassword);
      setResetMessage('Password was reset. You can now sign in with your new password.');
      setResetPassword('');
      setResetPasswordConfirm('');
      setShowForgotPassword(false);
    } catch (err: any) {
      if (err?.body?.code === 'EMAIL_NOT_FOUND') {
        setError('This email does not exist.');
      } else {
        setError(err?.message || 'Could not reset password.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="mx-auto max-w-md py-12">
        <div className="space-y-8 rounded-[3rem] border border-[#2a2f4a] bg-[#1e2235] p-10 shadow-2xl shadow-black/30">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-[#2b6eff] text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tight text-white">Reset Password</h2>
            <p className="text-neutral-500 text-xs font-medium uppercase tracking-widest">
              Self-service reset is not enabled for the self-hosted stack
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-app-input border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-app-input border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                  aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-app-input border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            {error && (
              <p className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-bold">{error}</p>
            )}
            {resetMessage && (
              <p className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl text-xs font-bold">{resetMessage}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-neutral-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-neutral-900/10"
            >
              OK
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <button
            onClick={() => {
              setShowForgotPassword(false);
              setError('');
            }}
            className="w-full py-4 border border-app-border text-neutral-500 font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all text-[10px]"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 rounded-[2.5rem] border border-[#2a2f4a] bg-[#1e2235] p-8 shadow-2xl shadow-black/30"
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-white">Sign in</h2>
          <p className="text-sm text-[#8b90b0]">Use your admin or account email and password</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-12 pr-4 py-3.5 bg-app-input border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-text transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Password</label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-12 pr-12 py-3.5 bg-app-input border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-text transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold rounded-2xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg shadow-neutral-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
