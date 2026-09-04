'use client';

import { useState, createContext, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import saApi from './superadmin-api';

interface SuperAdmin {
    _id: string;
    name: string;
    email: string;
    role: string;
    lastLogin?: string;
}

interface SuperAdminContextType {
    superAdmin: SuperAdmin | null;
    loading: boolean;
    logout: () => void;
    login: (token: string, admin: SuperAdmin) => void;
    fetchSuperAdmin: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | null>(null);

export function SuperAdminProvider({ children }: { children: ReactNode }) {
    const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('superadmin_token');
        }
        setSuperAdmin(null);
        setLoading(false);
        router.push('/superadmin/login');
    }, [router]);

    const fetchSuperAdmin = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') : null;
        if (!token) {
            setSuperAdmin(null);
            setLoading(false);
            return;
        }
        try {
            const { data } = await saApi.get('/auth/me', { timeout: 6000 });
            if (data?.superAdmin) {
                setSuperAdmin(data.superAdmin);
            } else {
                setSuperAdmin(null);
            }
        } catch (err) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('superadmin_token');
            }
            setSuperAdmin(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuperAdmin();
        // Safety timeout: Never leave user in loading state for more than 4 seconds
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 4000);
        return () => clearTimeout(safetyTimer);
    }, [fetchSuperAdmin]);

    const login = (token: string, admin: SuperAdmin) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('superadmin_token', token);
        }
        setSuperAdmin(admin);
        setLoading(false);
        router.push('/superadmin');
    };

    return (
        <SuperAdminContext.Provider value={{ superAdmin, loading, logout, login, fetchSuperAdmin }}>
            {children}
        </SuperAdminContext.Provider>
    );
}

export function useSuperAdmin() {
    const ctx = useContext(SuperAdminContext);
    if (!ctx) throw new Error('useSuperAdmin must be used within SuperAdminProvider');
    return ctx;
}

