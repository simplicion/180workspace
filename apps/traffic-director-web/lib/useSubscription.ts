'use client';

import { useState, useEffect, useCallback } from 'react';
import api from './api';

export interface SubscriptionData {
  id?: string;
  companyId?: string;
  planTier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  planName: string;
  price: number;
  currency: string;
  status: string; // 'ACTIVE' | 'TRIALING' | 'EXPIRED' | 'CANCELLED'
  oneEightySubId?: string | null;
  amountCharged: number;
  couponApplied?: string | null;
  discountAmount?: number;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  isTrialing: boolean;
  trialDaysLeft: number;
  isTrialExpired: boolean;
  isSubscriptionActive: boolean;
  currentPeriodStart?: string;
  currentPeriodEnd?: string | null;
  nextBillingDate?: string | null;
  autoRenew: boolean;
  maxLinks: number;
  isUnlimited: boolean;
  currentLinksCount: number;
  activeLinksCount: number;
  quotaUsedPercent: number;
  canCreateMoreLinks: boolean;
  hasAdvancedAnalytics: boolean;
  cloakingEnabled: boolean;
}

let cachedSub: SubscriptionData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10s client cache

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(cachedSub);
  const [loading, setLoading] = useState<boolean>(!cachedSub);

  const fetchStatus = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedSub && now - lastFetchTime < CACHE_TTL_MS) {
      setSubscription(cachedSub);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/api/v1/traffic-director/billing/status');
      if (res.data?.success && res.data?.subscription) {
        const subData = res.data.subscription as SubscriptionData;
        cachedSub = subData;
        lastFetchTime = Date.now();
        setSubscription(subData);
      }
    } catch (err) {
      console.warn('[useSubscription] Failed to load subscription status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const planTier = subscription?.planTier || 'FREE';
  const status = subscription?.status || 'TRIALING';
  const isTrialing = Boolean(subscription?.isTrialing);
  const isTrialExpired = Boolean(subscription?.isTrialExpired);
  const isSubscriptionActive = Boolean(subscription?.isSubscriptionActive);
  const canCreateMoreLinks = Boolean(subscription?.canCreateMoreLinks);
  const hasAdvancedAnalytics = Boolean(subscription?.hasAdvancedAnalytics);
  const trialDaysLeft = subscription?.trialDaysLeft ?? 0;

  return {
    subscription,
    currentSubscription: subscription,
    planTier,
    planName: subscription?.planName || 'Free Trial',
    status,
    isSubscriptionActive,
    isTrialing,
    trialDaysLeft,
    isTrialExpired,
    canCreateMoreLinks,
    hasAdvancedAnalytics,
    cloakingEnabled: Boolean(subscription?.cloakingEnabled),
    maxLinks: subscription?.maxLinks ?? 2,
    isUnlimited: Boolean(subscription?.isUnlimited || subscription?.maxLinks === -1),
    currentLinksCount: subscription?.currentLinksCount ?? 0,
    activeLinksCount: subscription?.activeLinksCount ?? 0,
    quotaUsedPercent: subscription?.quotaUsedPercent ?? 0,
    isPaidPlan: planTier === 'STARTER' || planTier === 'PRO' || planTier === 'ENTERPRISE',
    daysLeft: trialDaysLeft,
    isExpired: isTrialExpired || status === 'EXPIRED',
    loading,
    refresh: () => fetchStatus(true),
    // Platform compatibility
    hasApp: (appId?: string) => true,
    enabledApps: ['traffic-director'],
    companyConfig: { enabledApps: ['traffic-director'] },
  };
}
