'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { useSubscription } from '@/lib/useSubscription';

export function TrialBanner() {
  const pathname = usePathname();
  const { 
    isTrialing, 
    trialDaysLeft, 
    isTrialExpired, 
    isSubscriptionActive, 
    planTier,
    loading 
  } = useSubscription();

  // Don't show banner on subscription or profile page
  if (loading || pathname === '/traffic-director/subscription' || pathname === '/traffic-director/profile') {
    return null;
  }

  // If user has paid active plan (STARTER, PRO, ENTERPRISE), don't show trial/expired banner
  if (isSubscriptionActive && (planTier === 'STARTER' || planTier === 'PRO' || planTier === 'ENTERPRISE')) {
    return null;
  }

  // Trial Expired or Inactive Subscription
  if (isTrialExpired || !isSubscriptionActive) {
    return (
      <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white px-4 py-2.5 text-xs font-medium shadow-sm transition-all animate-in fade-in duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/20">
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            </span>
            <span>
              <strong>Free Trial Expired:</strong> New link creation and cloaking power routing are paused. Select a plan to restore full traffic routing.
            </span>
          </div>
          <Link
            href="/traffic-director/subscription"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs shadow-xs active:scale-95 transition shrink-0"
          >
            <span>Upgrade Subscription</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  // Active 7-Day Free Trial
  if (isTrialing) {
    return (
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-2 text-xs font-medium shadow-sm transition-all animate-in fade-in duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </span>
            <span>
              <strong>7-Day Free Trial Active:</strong> You have <strong>{trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'}</strong> remaining. Create up to 2 Smart Links with live edge routing.
            </span>
          </div>
          <Link
            href="/traffic-director/subscription"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 font-semibold text-xs active:scale-95 transition shrink-0"
          >
            <span>View Plans ($25, $50, $75)</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
