/**
 * firebase/auth shim
 * Implements the Firebase Auth API surface but routes all calls
 * to our Express JWT backend (/api/auth/*).
 *
 * AI Studio code imports from 'firebase/auth' — Vite aliases this
 * file so production never touches the real Firebase SDK.
 */

import api, { setToken, clearToken, ApiUser } from '../api';

// ─── Internal state ───────────────────────────────────────────────────────────

let _currentUser: ApiUser | null = null;
const _listeners: Array<(user: ApiUser | null) => void> = [];

function _notify(user: ApiUser | null) {
  _currentUser = user;
  _listeners.forEach(cb => cb(user));
}

// Boot: restore session from stored token
(async () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return _notify(null);
  try {
    const user = await api.me();
    _notify(user);
  } catch {
    clearToken();
    _notify(null);
  }
})();

// ─── Auth object (passed around by Firebase API calls) ───────────────────────

export function getAuth(_app?: any) {
  return {
    get currentUser() { return _currentUser; },
  };
}

// Default auth instance (used by AI Studio code via `auth` export)
export const auth = getAuth();

// ─── Providers ───────────────────────────────────────────────────────────────

export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
}
export const googleProvider = new GoogleAuthProvider();

// ─── Core auth functions ──────────────────────────────────────────────────────

export async function signInWithEmailAndPassword(
  _auth: any,
  email: string,
  password: string,
) {
  const { accessToken, user } = await api.login(email, password);
  setToken(accessToken);
  _notify(user);
  return { user };
}

export async function createUserWithEmailAndPassword(
  _auth: any,
  email: string,
  password: string,
) {
  // displayName will be set via updateProfile immediately after
  const { accessToken, user } = await api.register(email, password, '');
  setToken(accessToken);
  _notify(user);
  return { user };
}

export async function signOut(_auth: any) {
  try { await api.logout(); } catch { /* ignore */ }
  clearToken();
  _notify(null);
}

export async function updateProfile(_user: any, { displayName, photoURL }: { displayName?: string; photoURL?: string }) {
  const updated = await api.put<ApiUser>('/api/users/me', {
    displayName,
    avatarUrl: photoURL,
  });
  _notify(updated);
}

export async function signInWithPopup(_auth: any, _provider: any) {
  // Google OAuth popup — server handles the OAuth flow
  // AI Studio uses this for Google sign-in; in production redirect to /api/auth/google
  throw new Error('Google sign-in popup is not available in production. Use the Google OAuth redirect flow.');
}

export async function signInWithCustomToken(_auth: any, token: string) {
  setToken(token);
  const user = await api.me();
  _notify(user);
  return { user };
}

export function onAuthStateChanged(
  _auth: any,
  callback: (user: ApiUser | null) => void,
) {
  _listeners.push(callback);
  // Fire immediately with current state
  callback(_currentUser);
  return () => {
    const i = _listeners.indexOf(callback);
    if (i > -1) _listeners.splice(i, 1);
  };
}

// ─── Stubs (used by AI Studio but not needed in production) ──────────────────

export function getAdditionalUserInfo(_result: any) {
  return { isNewUser: false };
}

export function sendPasswordResetEmail(_auth: any, _email: string) {
  return api.post('/api/auth/forgot-password', { email: _email });
}
