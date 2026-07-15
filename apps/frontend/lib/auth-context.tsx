'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import api from './api';
import { updateSocketAuth, disconnectSocket } from './socket';

interface User {
    id: string;
    _id?: string; // Support MongoDB _id
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string; // Standardize for usage
    role: string;
    roles?: string[]; // Support array of roles as used in layout
    photoUrl?: string; // Support avatar usage
    permissions?: string[];
    isFirstLogin?: boolean; // Support onboarding logic
    isModuleLead?: boolean; // Support work log review visibility
}

interface Company {
    id: string;
    _id?: string;
    name: string;
    slug: string;
    logoUrl?: string;   // Company branding logo, returned by /api/auth/me
    companyLogo?: string; // Alias for consistency with SettingsContext
    settings?: any;
    branding?: any;
}

interface AuthContextType {
    user: User | null;
    company: Company | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string, mfaToken?: string) => Promise<any>;
    loginWithGoogle: (tokenId: string) => Promise<any>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
    setCompany: (company: Company | null) => void;
    setToken: (token: string | null) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const getAuthToken = () => {
            const localToken = localStorage.getItem('platform_auth_token');
            if (localToken) return localToken;
            const matches = document.cookie.match(/(^| )platform_auth_token=([^;]+)/);
            return matches ? matches[2] : null;
        };

        const storedToken = getAuthToken();
        const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict${isProd ? '; Secure' : ''}`;

        if (storedToken) {
            setToken(storedToken);
            // Sync to cookie for middleware persistence
            if (!document.cookie.includes('platform_auth_token=')) {
                document.cookie = `platform_auth_token=${storedToken}${cookieFlags}`;
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            updateSocketAuth(storedToken);
            fetchMe().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    async function fetchMe() {
        try {
            const { data } = await api.get('/api/init');
            
            // Broadcast initialization data to other providers (Settings, Billing, etc.)
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('platform_init_data', JSON.stringify(data));
                window.dispatchEvent(new CustomEvent('platform_init_ready', { detail: data }));
            }
            
            setUser(data.user);
            setCompany(data.company);
        } catch (err: any) {
            // Only wipe credentials on confirmed 401 Auth errors. 
            // 500s or network errors shouldn't log the user out.
            if (err?.response?.status === 401) {
                localStorage.removeItem('platform_auth_token');
                localStorage.removeItem('platform_refresh_token');

                // Clear cookie
                document.cookie = `platform_auth_token=; path=/; max-age=0`;

                setToken(null);
                setUser(null);
                setCompany(null);
                disconnectSocket();
            }
            // For non-401s, we still clear the loading state but don't wipe tokens
        }
    }

    const login = async (email: string, password: string, mfaToken?: string) => {
        try {
            const { data } = await api.post('/api/auth/login', { email, password, mfaToken });
            if (data.mfaRequired) return { mfaRequired: true, userId: data.userId };

            localStorage.setItem('platform_auth_token', data.token);
            localStorage.setItem('platform_refresh_token', data.refreshToken);

            // Set cookie so Next.js middleware can read it
            const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
            const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict${isProd ? '; Secure' : ''}`;
            document.cookie = `platform_auth_token=${data.token}${cookieFlags}`;

            setToken(data.token);
            setUser(data.user);
            setCompany(data.company);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            return { user: data.user, company: data.company, token: data.token, refreshToken: data.refreshToken };
        } catch (err: any) {
            // Re-throw with the full response data so caller can inspect
            // setupToken, onboardingToken, onboardingRequired etc.
            const errData = err?.response?.data || {};
            const structured: any = new Error(errData.error || 'Login failed');
            structured.response = err?.response;
            structured.setupToken = errData.setupToken;
            structured.onboardingToken = errData.onboardingToken;
            structured.onboardingRequired = errData.onboardingRequired;
            throw structured;
        }
    };

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('platform_refresh_token');
            await api.post('/api/auth/logout', { refreshToken });
        } catch { }
        localStorage.removeItem('platform_auth_token');
        localStorage.removeItem('platform_refresh_token');

        // Clear cookie comprehensively
        const domains = [window.location.hostname, `.${window.location.hostname}`];
        const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
        if (mainDomain) {
            domains.push(mainDomain);
            domains.push(`.${mainDomain}`);
        }

        domains.forEach(domain => {
            document.cookie = `platform_auth_token=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
        });
        document.cookie = `platform_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;

        setToken(null);
        setUser(null);
        setCompany(null);
        delete api.defaults.headers.common['Authorization'];
        disconnectSocket();
    };

    const loginWithGoogle = async (tokenId: string) => {
        try {
            const { data } = await api.post('/api/auth/google', { tokenId });
            
            localStorage.setItem('platform_auth_token', data.token);
            localStorage.setItem('platform_refresh_token', data.refreshToken);
            
            const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
            const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict${isProd ? '; Secure' : ''}`;
            document.cookie = `platform_auth_token=${data.token}${cookieFlags}`;
            
            setToken(data.token);
            setUser(data.user);
            setCompany(data.company);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            return { user: data.user, company: data.company, token: data.token, refreshToken: data.refreshToken };
        } catch (err: any) {
            const structured: any = new Error(err?.response?.data?.error || 'Google login failed');
            throw structured;
        }
    };

    return (
        <AuthContext.Provider value={{ user, company, token, isLoading, login, loginWithGoogle, logout, setUser, setCompany, setToken, refreshUser: fetchMe }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
