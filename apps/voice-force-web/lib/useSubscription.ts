'use client';

import { useEffect, useState } from 'react';
import api from './api';

export interface SubscriptionStatus {
  subscription: any | null;
  companyConfig: any | null;
  enabledApps: string[];
  isPaidPlan: boolean;
  hasApp: (appId: string) => boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionStatus {
  const [loading, setLoading] = useState(false);
  const [enabledApps, setEnabledApps] = useState<string[]>(['voiceforce', 'operations']);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/api/v1/subscription/status').catch(() => null);
        if (res?.data?.data?.enabledApps) {
          setEnabledApps(res.data.data.enabledApps);
        }
      } catch (_) {}
    };

    fetchStatus();
  }, []);

  return {
    subscription: null,
    companyConfig: { enabledApps },
    enabledApps,
    isPaidPlan: true,
    hasApp: (appId: string) => enabledApps.includes(appId) || appId === 'voiceforce',
    loading,
  };
}

export default useSubscription;
