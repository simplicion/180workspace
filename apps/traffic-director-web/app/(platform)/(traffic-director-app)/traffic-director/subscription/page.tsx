'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Check, Sparkles, CreditCard, ArrowRight, 
  AlertCircle, RefreshCw, Zap, Tag, CheckCircle2, Lock,
  ExternalLink, Layers, Clock, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { OneEightyPay } from '@workspace/identity-sdk';

interface SubscriptionData {
  id: string;
  companyId: string;
  planTier: 'STARTER' | 'PRO' | 'ENTERPRISE';
  planName: string;
  price: number;
  currency: string;
  status: string;
  oneEightySubId?: string;
  amountCharged: number;
  couponApplied?: string;
  discountAmount?: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextBillingDate?: string;
  autoRenew: boolean;
  maxLinks: number;
  isUnlimited: boolean;
  currentLinksCount: number;
  activeLinksCount: number;
  quotaUsedPercent: number;
  canCreateMoreLinks: boolean;
}

interface PlanTierItem {
  tier: 'STARTER' | 'PRO' | 'ENTERPRISE';
  name: string;
  price: number;
  currency: string;
  interval: string;
  maxLinks: number;
  features: string[];
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<PlanTierItem[]>([]);
  const [selectedTier, setSelectedTier] = useState<'STARTER' | 'PRO' | 'ENTERPRISE'>('PRO');
  
  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  // Checkout trigger state
  const [initiatingPay, setInitiatingPay] = useState(false);

  const fetchBillingStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/traffic-director/billing/status');
      if (res.data?.success) {
        setSubData(res.data.subscription);
        if (res.data.availablePlans) {
          setPlans(res.data.availablePlans);
        }
        if (res.data.subscription?.planTier) {
          setSelectedTier(res.data.subscription.planTier);
        }
      }
    } catch (err: any) {
      console.error('Failed to load subscription status:', err);
      toast.error(err.message || 'Failed to load billing status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingStatus();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      setValidatingCoupon(true);
      const res = await api.post('/api/v1/traffic-director/billing/validate-coupon', {
        couponCode: couponInput.trim(),
        planTier: selectedTier,
      });

      if (res.data?.success && res.data.valid) {
        setAppliedCoupon(res.data);
        toast.success(res.data.message || 'Coupon applied successfully!');
      } else {
        toast.error(res.data?.error || 'Invalid coupon code');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply coupon');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
  };

  const handleSubscribe = async (tier: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    try {
      setInitiatingPay(true);
      const toastId = toast.loading('Initializing 180 Pay Sovereign Checkout...');

      const res = await api.post('/api/v1/traffic-director/billing/create-checkout', {
        planTier: tier,
        couponCode: appliedCoupon?.couponCode || undefined,
        returnUrl: window.location.href,
        cancelUrl: window.location.href,
      });

      toast.dismiss(toastId);

      if (!res.data?.success || !res.data.sessionId) {
        throw new Error(res.data?.error || 'Failed to initialize payment session');
      }

      const { sessionId, amount, currency } = res.data;

      // Open 180 Pay Drawer / Popup via Universal SDK
      await OneEightyPay.checkout({
        sessionId,
        amount,
        currency,
        title: `180 Traffic Director ${tier} Plan`,
        onSuccess: (paymentResult) => {
          toast.success('Subscription authorized successfully via 180 Pay!');
          // Refresh status
          setTimeout(() => {
            fetchBillingStatus();
          }, 1200);
        },
        onError: (err) => {
          toast.error(err.message || 'Payment cancelled or failed');
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed to launch');
    } finally {
      setInitiatingPay(false);
    }
  };

  const handleManageSubscription = () => {
    const subId = subData?.oneEightySubId || subData?.id;
    if (!subId) {
      toast.error('No active subscription found');
      return;
    }
    (OneEightyPay as any).openSubscriptionManager?.({
      subscriptionId: subId,
      onCancelled: () => {
        toast.success('Subscription and recurring mandate cancelled in 180 Pay');
        fetchBillingStatus();
      },
      onClose: () => {
        fetchBillingStatus();
      },
    }) || toast('Subscription manager: Visit 180 Pay to manage mandates');
  };

  if (loading && !subData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-zinc-500 font-medium">Loading sovereign subscription status...</p>
      </div>
    );
  }

  const currentTier = subData?.planTier || 'STARTER';
  const targetPlan = plans.find((p) => p.tier === selectedTier) || plans[0] || {
    price: selectedTier === 'STARTER' ? 25 : selectedTier === 'PRO' ? 50 : 75,
    name: selectedTier,
  };

  const discountedPrice = appliedCoupon ? appliedCoupon.finalPrice : targetPlan.price;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
              Sovereign Subscriptions
            </span>
            <span className="text-xs text-zinc-400">· Powered by 180 Pay</span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight mt-1">
            Subscription & Link Quota Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Manage your high-performance Anycast edge subscription, expand smart link allocations, and configure automated 180 Pay renewals.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {subData?.status === 'ACTIVE' && (
            <button
              onClick={handleManageSubscription}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-sm cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Manage / Cancel in 180 Pay</span>
            </button>
          )}

          <button
            onClick={fetchBillingStatus}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Active Subscription Status Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
          {/* Current Tier */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Current Plan</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {subData?.planName || 'Starter Edge'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                subData?.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {subData?.status || 'ACTIVE'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {subData?.planTier === 'ENTERPRISE' ? 'Unlimited Allocation' : `${subData?.maxLinks} Smart Links Allocation`}
            </p>
          </div>

          {/* Pricing & Auto-Renew */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Billed Amount</span>
            <div className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              ${subData?.amountCharged?.toFixed(2) || '25.00'}
              <span className="text-xs text-zinc-400 font-normal"> / month</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Lock className="w-3 h-3" />
              <span>180 Pay Auto-Renew Active</span>
            </div>
          </div>

          {/* Renewal Date */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Next Billing Date</span>
            <div className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>
                {subData?.nextBillingDate
                  ? new Date(subData.nextBillingDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '30 Days From Activation'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">Automatic renewal from sovereign wallet</p>
          </div>

          {/* Smart Link Usage Quota */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Links Quota Usage</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {subData?.isUnlimited
                  ? `${subData.currentLinksCount} (Unlimited)`
                  : `${subData?.currentLinksCount || 0} / ${subData?.maxLinks || 2} Links`}
              </span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  (subData?.quotaUsedPercent || 0) >= 100 
                    ? 'bg-rose-500' 
                    : (subData?.quotaUsedPercent || 0) >= 80 
                    ? 'bg-amber-500' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`}
                style={{ width: subData?.isUnlimited ? '15%' : `${subData?.quotaUsedPercent || 0}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 block">
              {subData?.canCreateMoreLinks
                ? 'Link quota healthy. You can create additional links.'
                : 'Quota reached. Upgrade tier to launch more smart links.'}
            </span>
          </div>
        </div>
      </div>

      {/* 3-Tier Pricing Plan Matrix */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8 space-y-1">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
            Choose Your Edge Routing Tier
          </h2>
          <p className="text-xs text-zinc-500">
            Scale your sovereign bot shields and high-throughput link allocation with zero downtime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* STARTER TIER */}
          <div className={`p-6 rounded-3xl border transition-all relative flex flex-col justify-between ${
            selectedTier === 'STARTER'
              ? 'border-blue-600 bg-white dark:bg-zinc-900 shadow-xl shadow-blue-500/10'
              : 'border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-950/60 hover:border-zinc-300 dark:hover:border-white/20'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  Starter Edge
                </span>
                {currentTier === 'STARTER' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    Active Plan
                  </span>
                )}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">$25</span>
                <span className="text-xs text-zinc-400 font-medium"> / month</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Ideal for single campaign arbitrage & lightweight safe page testing.
                </p>
              </div>

              {/* Quota highlight */}
              <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40 mb-5">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Max 2 Smart Links
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>2 Active Smart Links</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Zero-Latency Anycast Routing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Official Tor Exit Node Blacklist</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Basic Bot & Spider Shields</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Live Traffic Logs & Inspector</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  setSelectedTier('STARTER');
                  handleSubscribe('STARTER');
                }}
                disabled={initiatingPay || currentTier === 'STARTER'}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  currentTier === 'STARTER'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-sm'
                }`}
              >
                <span>{currentTier === 'STARTER' ? 'Current Active Tier' : 'Select Starter ($25/mo)'}</span>
              </button>
            </div>
          </div>

          {/* PRO TIER (Featured) */}
          <div className={`p-6 rounded-3xl border transition-all relative flex flex-col justify-between ${
            selectedTier === 'PRO'
              ? 'border-indigo-500 bg-white dark:bg-zinc-900 shadow-2xl shadow-indigo-500/15 ring-2 ring-indigo-500/20'
              : 'border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-950/60 hover:border-zinc-300 dark:hover:border-white/20'
          }`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[9px] uppercase tracking-wider shadow-md">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                  Pro Armor
                </span>
                {currentTier === 'PRO' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    Active Plan
                  </span>
                )}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">$50</span>
                <span className="text-xs text-zinc-400 font-medium"> / month</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Engineered for high-volume advertisers requiring multi-ad network cloaking.
                </p>
              </div>

              {/* Quota highlight */}
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 mb-5">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Max 5 Smart Links
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-semibold text-zinc-900 dark:text-white">Up to 5 Smart Links</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Dynamic Client-Side Shield Injection</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Meta, Google & TikTok AdBot Cloaker</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Subpath Media & Live Asset Proxy</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Automated Traffic Ramp-Up Warmer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>5 Custom Domain Allocations</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  setSelectedTier('PRO');
                  handleSubscribe('PRO');
                }}
                disabled={initiatingPay || currentTier === 'PRO'}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  currentTier === 'PRO'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 active:scale-95'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{currentTier === 'PRO' ? 'Current Active Tier' : 'Upgrade to Pro ($50/mo)'}</span>
              </button>
            </div>
          </div>

          {/* ENTERPRISE TIER */}
          <div className={`p-6 rounded-3xl border transition-all relative flex flex-col justify-between ${
            selectedTier === 'ENTERPRISE'
              ? 'border-purple-600 bg-white dark:bg-zinc-900 shadow-xl shadow-purple-500/10'
              : 'border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-950/60 hover:border-zinc-300 dark:hover:border-white/20'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                  Enterprise Sovereign
                </span>
                {currentTier === 'ENTERPRISE' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    Active Plan
                  </span>
                )}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">$75</span>
                <span className="text-xs text-zinc-400 font-medium"> / month</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Full sovereign allocation with unlimited links, dedicated RAM blacklists and safe pages.
                </p>
              </div>

              {/* Quota highlight */}
              <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/40 mb-5">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Unlimited Smart Links
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span className="font-semibold text-zinc-900 dark:text-white">Unlimited Smart Links</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>Sub-Millisecond Zero-DB Tor RAM Sets</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>Full Spy-Tool & Competitor Shields</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>Unlimited Custom Domains</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>AI White Page Builder Integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>Dedicated Traffic Architect Support</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  setSelectedTier('ENTERPRISE');
                  handleSubscribe('ENTERPRISE');
                }}
                disabled={initiatingPay || currentTier === 'ENTERPRISE'}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  currentTier === 'ENTERPRISE'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/25 active:scale-95'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentTier === 'ENTERPRISE' ? 'Current Active Tier' : 'Upgrade to Enterprise ($75/mo)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Promotional Discount Coupon Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Promotional Discount Coupon</h3>
          </div>
          <span className="text-[11px] text-zinc-400">Uses 180 Workspace Coupon Engine</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 max-w-xl">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="Enter promo coupon (e.g. LAUNCH20)"
            disabled={validatingCoupon || Boolean(appliedCoupon)}
            className="flex-1 w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {appliedCoupon ? (
            <button
              onClick={handleRemoveCoupon}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer shrink-0"
            >
              Remove Coupon
            </button>
          ) : (
            <button
              onClick={handleApplyCoupon}
              disabled={validatingCoupon || !couponInput.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {validatingCoupon ? 'Validating...' : 'Apply Coupon'}
            </button>
          )}
        </div>

        {appliedCoupon && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-between text-xs max-w-xl">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                <strong>{appliedCoupon.couponCode}</strong> applied: You get{' '}
                {appliedCoupon.discountType === 'percentage'
                  ? `${appliedCoupon.discountValue}% off`
                  : `$${appliedCoupon.discountValue} off`}
                !
              </span>
            </div>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
              -${appliedCoupon.discountAmount?.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Security & 180 Sovereign Guarantee Card */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-200">Sovereign 180 Pay Guarantee</p>
            <p className="text-[11px] text-zinc-400">
              Payments are verified with double-entry accounting. 1-click checkout with zero chargebacks.
            </p>
          </div>
        </div>

        <a
          href="https://profile.180workspace.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
        >
          <span>Manage Sovereign Wallet</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
