'use client';

import { useEffect, useState, useCallback } from 'react';
import api from './api';

export interface SubscriptionStatus {
    subscription: any | null;
    plan: any | null;
    daysLeft: number;
    isExpired: boolean;
    isWarning: boolean;
    isTrialing: boolean;
    status: 'trial' | 'active' | 'expired' | 'mandate_pending' | 'paused';
    paymentsEnabled: boolean;
    currency: string;
    dataDeletionDate: string | null;
    mandateStatus: 'pending' | 'authorized' | 'failed';
    autopayEnabled: boolean;
    autopayFailCount: number;
    nextChargeDate: string | null;
    usage?: any;
    loading: boolean;
    refresh: () => void;
}

let cachedSubscriptionData: any = null;
let cacheTimestamp: number = 0;
let fetchPromise: Promise<any> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useSubscription(): SubscriptionStatus {
    const [data, setData] = useState<Omit<SubscriptionStatus, 'loading' | 'refresh'>>(
        cachedSubscriptionData || {
            subscription: null,
            plan: null,
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

    return { ...data, loading, refresh: () => fetchStatus(true) };
}
