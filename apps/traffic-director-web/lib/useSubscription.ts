'use client';

export function useSubscription() {
  return {
    subscription: { status: 'active', plan: 'ENTERPRISE' },
    currentSubscription: { status: 'active', plan: 'ENTERPRISE' },
    plan: { id: 'traffic-director-full', name: 'Traffic Director Unlimited' },
    companyConfig: { enabledApps: ['traffic-director', 'marketing', 'advertising'] },
    enabledApps: ['traffic-director', 'marketing', 'advertising'],
    isPaidPlan: true,
    hasApp: (appId: string) => true,
    daysLeft: 9999,
    isExpired: false,
    isWarning: false,
    isTrialing: false,
    status: 'active',
    paymentsEnabled: false,
    currency: 'USD',
    dataDeletionDate: null,
    mandateStatus: 'authorized',
    autopayEnabled: true,
    autopayFailCount: 0,
    nextChargeDate: null,
    loading: false,
    refresh: () => {},
  };
}
