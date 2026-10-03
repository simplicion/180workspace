'use strict';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check, Sparkles, Shield, ArrowRight, AlertCircle } from 'lucide-react';
import { Button, LogoLoader } from '@workspace/ui';

interface PlanCard {
  planCode: string;
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  interval?: string;
  isPopular?: boolean;
  features: string[];
  buttonText?: string;
}

interface PricingConfig {
  appId: string;
  appName?: string;
  appLogo?: string;
  clientId?: string;
  headline: string;
  subheadline?: string;
  theme?: string;
  accentColor?: string;
  billingIntervals?: string[];
  yearlyDiscountPct?: number;
  planCards: PlanCard[];
  customCss?: string;
}

export function PricingEmbedClient({ appId }: { appId: string }) {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003';
  };

  const getProfileBase = () => {
    return process.env.NEXT_PUBLIC_PROFILE_URL || 'http://localhost:3009';
  };

  const fetchConfig = useCallback(async () => {
    if (!appId || appId === 'default') {
      setLoading(false);
      setError('Please provide a valid application ID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/pricing-tables/${appId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load pricing table');
      }
      setConfig(data.config);
    } catch (err: any) {
      setError(err.message || 'Pricing table configuration could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSelectPlan = (plan: PlanCard) => {
    // Notify parent window if in an iframe
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: '180_PLAN_SELECTED',
          appId: config?.appId || appId,
          planCode: plan.planCode,
          name: plan.name,
          interval: selectedInterval,
          amount: plan.amount,
          currency: plan.currency || 'INR',
        },
        '*'
      );
    }

    // Direct checkout redirection
    const profileBase = getProfileBase();
    const checkoutUrl = `${profileBase}/checkout?appId=${encodeURIComponent(config?.clientId || config?.appId || appId)}&planCode=${encodeURIComponent(plan.planCode)}&interval=${selectedInterval}&amount=${plan.amount}&currency=${encodeURIComponent(plan.currency || 'INR')}&title=${encodeURIComponent(plan.name)}`;
    window.open(checkoutUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-zinc-950 text-white">
        <LogoLoader size={36} className="w-9 h-9 text-indigo-500" />
        <p className="text-xs text-zinc-400 font-medium mt-3">Loading pricing plans...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center p-8 bg-zinc-950 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
        <p className="text-sm font-semibold text-white">Pricing Unavailable</p>
        <p className="text-xs text-zinc-400 max-w-sm mt-1">{error || 'Could not load pricing tiers.'}</p>
      </div>
    );
  }

  const yearlyDiscount = config.yearlyDiscountPct || 20;
  const cards = config.planCards || [];

  return (
    <div className="w-full bg-zinc-950 text-white py-8 px-4 sm:px-6 font-sans">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{config.appName || '180 Workspace'} Membership</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{config.headline}</h1>
        {config.subheadline && (
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">{config.subheadline}</p>
        )}

        {/* Interval Switcher */}
        {config.billingIntervals?.includes('YEARLY') && (
          <div className="pt-2 flex items-center justify-center gap-3">
            <span
              className={`text-xs font-semibold cursor-pointer ${
                selectedInterval === 'MONTHLY' ? 'text-white' : 'text-zinc-500'
              }`}
              onClick={() => setSelectedInterval('MONTHLY')}
            >
              Monthly billing
            </span>
            <button
              type="button"
              onClick={() => setSelectedInterval(selectedInterval === 'MONTHLY' ? 'YEARLY' : 'MONTHLY')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                selectedInterval === 'YEARLY' ? 'bg-indigo-600' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  selectedInterval === 'YEARLY' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div
              className="flex items-center gap-1.5 cursor-pointer"
              onClick={() => setSelectedInterval('YEARLY')}
            >
              <span
                className={`text-xs font-semibold ${
                  selectedInterval === 'YEARLY' ? 'text-white' : 'text-zinc-500'
                }`}
              >
                Annual billing
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Save {yearlyDiscount}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div className={`max-w-5xl mx-auto grid gap-6 ${cards.length === 1 ? 'max-w-sm' : cards.length === 2 ? 'sm:grid-cols-2 max-w-2xl' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {cards.map((plan, index) => {
          const rawAmount = plan.amount;
          const finalAmount =
            selectedInterval === 'YEARLY'
              ? Math.round(rawAmount * 12 * (1 - yearlyDiscount / 100))
              : rawAmount;

          const currencySymbol = plan.currency === 'INR' ? '₹' : '$';

          return (
            <div
              key={plan.planCode || index}
              className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                plan.isPopular
                  ? 'border-2 border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 via-zinc-900/90 to-zinc-950 shadow-2xl shadow-indigo-500/10'
                  : 'border border-white/10 bg-zinc-900/70 hover:border-white/20'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/30">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{plan.description}</p>
                  )}
                </div>

                <div className="pt-2 pb-3 border-b border-white/5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white font-mono">
                      {currencySymbol}
                      {finalAmount}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">
                      /{selectedInterval === 'YEARLY' ? 'year' : 'month'}
                    </span>
                  </div>
                  {selectedInterval === 'YEARLY' && (
                    <p className="text-[11px] text-emerald-400 font-medium mt-1">
                      Billed annually ({currencySymbol}{Math.round(finalAmount / 12)}/mo)
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 pt-2">
                  {(plan.features || []).map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-xs text-zinc-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-auto">
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    plan.isPopular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  <span>{plan.buttonText || 'Get Started'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Trust Footer */}
      <div className="max-w-4xl mx-auto pt-8 text-center flex items-center justify-center gap-2 text-[11px] text-zinc-500">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span>Secure 256-bit encrypted checkout powered by 180 Pay</span>
      </div>
    </div>
  );
}
