'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const refresh = useCallback(async () => {
    try {
      // /api/auth/me renews the access token via refresh cookie when the access token is expired
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status === 401) {
        // No valid access + refresh (or refresh revoked)
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const retry = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
          if (retry.ok) {
            const data = await retry.json();
            setUser(data.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep access token fresh before the 15m expiry while the tab is open (refresh token remains valid 7d)
  useEffect(() => {
    if (!user) return;
    const intervalMs = 10 * 60 * 1000; // 10 minutes
    const id = window.setInterval(() => {
      void fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [user]);

  // After sleep or a long background tab, access token may be expired — refresh session via /me
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user, refresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: data.error || 'Login failed' };
        }
        setUser(data.user);
        return {};
      } catch (e) {
        return { error: 'Network error' };
      }
    },
    []
  );

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      confirmPassword: string
    ): Promise<{ error?: string }> => {
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, confirmPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: data.error || 'Signup failed' };
        }
        return {};
      } catch (e) {
        return { error: 'Network error' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      initialized,
      login,
      signup,
      logout,
      refresh,
      isAuthenticated: !!user,
    }),
    [user, loading, initialized, login, signup, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
