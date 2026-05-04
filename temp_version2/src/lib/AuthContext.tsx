import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiUser, setToken, clearToken } from './api';

interface AuthContextType {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setUser(null);
      clearToken();
    }
  }, []);

  // Boot: restore session from localStorage token
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { accessToken, user: u } = await api.login(email, password);
    setToken(accessToken);
    setUser(u);
  };

  const register = async (email: string, password: string, displayName: string, role?: string) => {
    const { accessToken, user: u } = await api.register(email, password, displayName, role);
    setToken(accessToken);
    setUser(u);
  };

  const loginWithGoogle = async (idToken: string) => {
    const { accessToken, user: u } = await api.googleLogin(idToken);
    setToken(accessToken);
    setUser(u);
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
