'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { getAuthToken, clearAuthTokens } from './api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface Company {
  id: string;
  name?: string;
  currency?: string;
  currencySymbol?: string;
  settings?: any;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  token: string | null;
  isLoading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  company: null,
  token: null,
  isLoading: true,
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    const activeToken = getAuthToken();
    setToken(activeToken);

    if (!activeToken) {
      setUser(null);
      setCompany(null);
      setIsLoading(false);
      return;
    }

    try {
      // Decode JWT payload for fast optimistic profile
      const parts = activeToken.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(json);
        setUser({
          id: payload.userId || payload.sub || payload.id || 'usr_voiceforce',
          email: payload.email || 'admin@180workspace.com',
          name: payload.name || payload.email?.split('@')[0] || 'Voiceforce Admin',
          role: payload.role || 'ADMIN',
        });
        if (payload.companyId) {
          setCompany({
            id: payload.companyId,
            name: payload.companyName || '180 Enterprise',
            currency: payload.currency || 'INR',
            currencySymbol: payload.currencySymbol || '₹',
          });
        }
      }

      // Fetch company profile from API
      const res = await api.get('/api/v1/company').catch(() => null);
      if (res?.data?.data) {
        const comp = res.data.data;
        setCompany((prev) => ({
          id: comp.id || prev?.id || 'comp_voiceforce',
          name: comp.name || prev?.name || '180 Enterprise',
          currency: comp.currency || prev?.currency || 'INR',
          currencySymbol: comp.currencySymbol || (comp.currency === 'USD' ? '$' : '₹'),
          settings: comp.settings,
        }));
      }
    } catch (e) {
      console.warn('[Voiceforce AuthContext] Failed to load session details:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const logout = () => {
    clearAuthTokens();
    setUser(null);
    setCompany(null);
    setToken(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        isLoading,
        logout,
        refreshUser: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
