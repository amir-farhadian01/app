import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Shield, Briefcase, ShoppingBag, Fingerprint, Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { startAuthentication } from '@simplewebauthn/browser';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { api, setToken } from '../lib/api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register, loginWithGoogle } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        // Exchange Google access token for ID token via userinfo endpoint
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then((r) => r.json());

        // Send access token to backend — backend will call Google tokeninfo
        const { accessToken, user } = await api.post<any>('/api/auth/google', {
          idToken: tokenResponse.access_token,
          accessToken: tokenResponse.access_token,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        });
        setToken(accessToken);
        window.location.href = '/dashboard';
      } catch (err: any) {
        setError(err.message || 'Google login failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google sign-in failed'),
  });

  const handleBiometricSignIn = async () => {
    if (!email) {
      setError('Please enter your email first to use biometric login.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const optionsRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      if (!optionsRes.ok) throw new Error((await optionsRes.json()).error || 'Failed to get login options');
      const options = await optionsRes.json();

      const authResponse = await startAuthentication(options);

      const verifyRes = await fetch('/api/auth/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: authResponse }),
      });
      if (!verifyRes.ok) throw new Error((await verifyRes.json()).error || 'Biometric verification failed');

      const { verified, accessToken } = await verifyRes.json();
      if (verified && accessToken) {
        setToken(accessToken);
        window.location.href = '/dashboard';
      } else {
        throw new Error('Biometric verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Biometric login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-app-card p-8 rounded-[2.5rem] shadow-xl shadow-neutral-200/50 dark:shadow-none border border-app-border space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-app-text">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-neutral-500 text-sm">
            {isLogin ? 'Enter your details to access your account' : 'Join our community of neighbors today'}
          </p>
        </div>

        {!isLogin && (
          <div className="grid grid-cols-2 gap-3 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
            <button
              onClick={() => setRole('customer')}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all',
                role === 'customer' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500',
              )}
            >
              <ShoppingBag className="w-4 h-4" /> Customer
            </button>
            <button
              onClick={() => setRole('provider')}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all',
                role === 'provider' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500',
              )}
            >
              <Briefcase className="w-4 h-4" /> Provider
            </button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                placeholder="••••••••"
              />
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
            className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold rounded-2xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-app-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-app-card px-4 text-neutral-400 font-bold tracking-widest">Or continue with</span>
          </div>
        </div>

        <button
          onClick={() => handleGoogleLogin()}
          disabled={loading}
          className="w-full py-3.5 bg-app-card border border-app-border text-app-text font-bold rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>

        {isLogin && (
          <button
            onClick={handleBiometricSignIn}
            disabled={loading}
            className="w-full py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border border-app-border text-neutral-600 dark:text-neutral-400 font-bold rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
            Sign in with Biometrics
          </button>
        )}

        <p className="text-center text-sm text-neutral-500">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-app-text font-bold hover:underline">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
