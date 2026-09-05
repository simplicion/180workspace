'use client';

import { useEffect, useState, useCallback } from 'react';
import api from './api';

export interface SubscriptionStatus {
    subscription: any | null;
    currentSubscription?: any | null;
    plan: any | null;
    companyConfig?: any | null;
    enabledApps: string[];
    isPaidPlan: boolean;
    hasApp: (appId: string) => boolean;
    daysLeft: number;
    isExpired: boolean;
    isWarning: boolean;
    isTrialing: boolean;
    status: 'trial' | 'active' | 'expired' | 'mandate_pending' | 'paused' | string;
    paymentsEnabled: boolean;
    currency: string;
    dataDeletionDate: string | null;
    mandateStatus: 'pending' | 'authorized' | 'failed' | string;
    autopayEnabled: boolean;
    autopayFailCount: number;
    nextChargeDate: string | null;
    usage?: any;
    loading: boolean;
    refresh: () => void;
}

const ALL_PLATFORM_APPS = [
    'system',
    'settings',
    'projects',
    'communications',
    'workspace-tools',
    'crm',
    'hr',
    'finance',
    'insights',
    'analytics',
    'advertising',
    'social-media',
    'traffic-director',
    'voiceforce',
    'ai',
    'storage',
    'database',
    'google-integrations'
];

let cachedSubscriptionData: any = null;
let cacheTimestamp: number = 0;
let fetchPromise: Promise<any> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useSubscription(): SubscriptionStatus {
    const [data, setData] = useState<any>(
        cachedSubscriptionData || {
            subscription: null,
            currentSubscription: null,
            plan: null,
            companyConfig: null,
            enabledApps: [],
            daysLeft: 999,
            isExpired: false,
            isWarning: false,
            isTrialing: false,
            status: 'trial',
            paymentsEnabled: false,
            currency: 'INR',
            dataDeletionDate: null,
            mandateStatus: 'pending',
            autopayEnabled: false,
            autopayFailCount: 0,
            nextChargeDate: null,
        }
    );
    const [loading, setLoading] = useState(!cachedSubscriptionData);

    const fetchStatus = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && cachedSubscriptionData && (now - cacheTimestamp < CACHE_TTL)) {
            setLoading(false);
            return;
        }

        try {
            if (!fetchPromise || force) {
                fetchPromise = api.get('/api/billing');
            }
            const { data: res } = await fetchPromise;
            setData(res);
            cachedSubscriptionData = res;
            cacheTimestamp = Date.now();
        } catch {
            // Network error or subscription expired — fail gracefully
        } finally {
            fetchPromise = null;
            setLoading(false);
        }
    }, []);

    useEffect(() => { 
        fetchStatus(); 
    }, [fetchStatus]);

    const plan = data?.plan || data?.currentSubscription?.plan || data?.subscription?.plan;
    const currentSub = data?.currentSubscription || data?.subscription;
    
    // Check if on any active paid plan (e.g. 180 Momentum, 180 Limitless, or any plan with price > 0 / ACTIVE sub)
    const isPaidPlan = Boolean(
        data?.isPaidPlan ||
        (plan && Number(plan.price) > 0) ||
        (plan && (plan.planName?.toLowerCase().includes('limitless') || plan.planName?.toLowerCase().includes('momentum'))) ||
        (currentSub && String(currentSub.status).toUpperCase() === 'ACTIVE' && plan && Number(plan.price) > 0) ||
        (data?.status === 'active' && plan && Number(plan.price) > 0)
    );

    const rawEnabledApps: string[] = Array.isArray(data?.enabledApps)
        ? data.enabledApps
        : (Array.isArray(data?.companyConfig?.enabledApps) ? data.companyConfig.enabledApps : []);

    // If on a paid plan, unlock all platform apps unconditionally
    const effectiveEnabledApps: string[] = isPaidPlan
        ? Array.from(new Set([...rawEnabledApps, ...ALL_PLATFORM_APPS]))
        : rawEnabledApps;

    const enrichedCompanyConfig = {
        ...(data?.companyConfig || {}),
        enabledApps: effectiveEnabledApps
    };

    const hasApp = useCallback((appId: string) => {
        if (!appId) return true;
        if (isPaidPlan) return true;
        const normalized = appId.toLowerCase().trim();
        return effectiveEnabledApps.some((a: string) => a.toLowerCase().trim() === normalized);
    }, [isPaidPlan, effectiveEnabledApps]);

    return {
        ...data,
        plan,
        subscription: currentSub || null,
        companyConfig: enrichedCompanyConfig,
        enabledApps: effectiveEnabledApps,
        isPaidPlan,
        hasApp,
        loading,
        refresh: () => fetchStatus(true)
    };
}
