'use strict';

import React, { useState, useEffect, useCallback } from 'react';
import { use180GeoPricing } from '../hooks/useGeoPricing';

export interface PlanFeatureItem {
  text: string;
  included?: boolean;
  note?: string;
}

export interface PricingPlan {
  id?: string;
  planCode?: string;
  name: string;
  description?: string;
  monthlyAmount?: number;
  yearlyAmount?: number;
  amount?: number;
  currency?: string;
  isPopular?: boolean;
  badgeText?: string;
  badgeColor?: string;
  features: (string | PlanFeatureItem)[];
  buttonText?: string;
  ctaText?: string;
  buttonUrl?: string;
  isFree?: boolean;
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface PricingTableProps {
  appId: string;
  plans?: PricingPlan[];
  title?: string;
  subtitle?: string;
  theme?: 'obsidian' | 'dark' | 'light' | 'glass' | 'auto';
  accentColor?: string;
  apiBase?: string;
  defaultInterval?: 'monthly' | 'yearly';
  enableGeoPricing?: boolean;
  currentPlanId?: string;
  activePlanCode?: string;
  onSelectPlan?: (plan: PricingPlan, interval: 'monthly' | 'yearly') => void;
  className?: string;
}

export const OneEightyPricingTable: React.FC<PricingTableProps> = ({
  appId,
  plans: initialPlans,
  title,
  subtitle,
  theme = 'auto',
  accentColor: customAccent,
  apiBase,
  defaultInterval = 'monthly',
  enableGeoPricing = false,
  currentPlanId,
  activePlanCode,
  onSelectPlan,
  className = '',
}) => {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>(defaultInterval);
  const [fetchedPlans, setFetchedPlans] = useState<PricingPlan[]>([]);
  const [fetchedTitle, setFetchedTitle] = useState<string>('');
  const [fetchedSubtitle, setFetchedSubtitle] = useState<string>('');
  const [accentColor, setAccentColor] = useState<string>(customAccent || '#6366f1');
  const [yearlyDiscountPct, setYearlyDiscountPct] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(!initialPlans || initialPlans.length === 0);
  const [error, setError] = useState<string | null>(null);

  const getApiUrl = useCallback(() => {
    if (apiBase) return apiBase;
    if (typeof window !== 'undefined') {
      const globalUrl = (window as any).__180_CORE_API_URL || (window as any).__180_API_URL;
      if (globalUrl) return globalUrl;

      const envCore =
        (process.env.NEXT_PUBLIC_CORE_BACKEND_URL as string) ||
        (process.env.NEXT_PUBLIC_IDENTITY_SERVER_URL as string) ||
        (process.env.NEXT_PUBLIC_180_CORE_URL as string);
      if (envCore) return envCore;

      const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      if (isLocal) {
        return 'http://localhost:4003';
      }

      return 'https://services.180workspace.com';
    }
    return process.env.CORE_BACKEND_URL || 'http://localhost:4003';
  }, [apiBase]);

  // Fetch configuration if plans prop is not passed directly
  useEffect(() => {
    if (initialPlans && initialPlans.length > 0) {
      setLoading(false);
      return;
    }

    if (!appId) return;

    let isMounted = true;
    setLoading(true);

    const loadConfig = async () => {
      try {
        const url = `${getApiUrl()}/api/v1/pricing-tables/${appId}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success && data.config) {
          const cfg = data.config;
          setFetchedTitle(cfg.headline || 'Plans & Pricing');
          setFetchedSubtitle(cfg.subheadline || 'Choose the plan that fits your growth.');
          if (!customAccent && cfg.accentColor) {
            setAccentColor(cfg.accentColor);
          }
          if (cfg.yearlyDiscountPct !== undefined) {
            setYearlyDiscountPct(Number(cfg.yearlyDiscountPct));
          }

          if (Array.isArray(cfg.planCards) && cfg.planCards.length > 0) {
            const normalized: PricingPlan[] = cfg.planCards.map((card: any, idx: number) => ({
              id: card.planCode || `plan-${idx}`,
              planCode: card.planCode,
              name: card.name,
              description: card.description,
              monthlyAmount: Number(card.amount || 0),
              yearlyAmount: card.yearlyAmount ? Number(card.yearlyAmount) : Math.round(Number(card.amount || 0) * 12 * 0.8),
              currency: card.currency || 'USD',
              isPopular: Boolean(card.isPopular),
              badgeText: card.badgeText,
              badgeColor: card.badgeColor,
              features: Array.isArray(card.features) ? card.features : [],
              buttonText: card.buttonText,
              ctaText: card.buttonText,
              buttonUrl: card.buttonUrl,
              trialDays: card.trialDays,
              isFree: card.isFree || Number(card.amount || 0) === 0,
            }));
            setFetchedPlans(normalized);
          }
        } else {
          setError(data.error || 'Failed to load pricing table');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Network error fetching pricing');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, [appId, initialPlans, getApiUrl, customAccent]);

  // Dark mode detection for 'auto' theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
        document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkDark = () => {
      setIsDarkMode(
        document.documentElement.classList.contains('dark') || 
        document.documentElement.getAttribute('data-theme') === 'dark'
      );
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => {
      observer.disconnect();
    };
  }, []);

  const DEFAULT_FALLBACK_PLANS: PricingPlan[] = [
    {
      id: 'momentum',
      planCode: '180-momentum',
      name: '180 Momentum',
      description: 'High-growth platform suite with AI copilot, unified CRM, and multi-app orchestration.',
      monthlyAmount: 17,
      yearlyAmount: 163,
      currency: 'USD',
      isPopular: true,
      badgeText: 'Most Popular',
      features: [
        'Access to 8 Applications (Projects, CRM, Finance, Website Builder, Voice Force, etc.)',
        'Up to 5 Team Members Included',
        'Up to 5 Active Projects',
        '1 GB High-Speed Cloud Storage',
        'Priority 24/7 Platform Support',
        'Orbit AI Copilot Access',
        'Custom Email SMTP Integration'
      ],
      trialDays: 15,
      buttonText: 'Start 15-Day Free Trial'
    },
    {
      id: 'limitless',
      planCode: '180-limitless',
      name: '180 Limitless',
      description: 'Full unmetered enterprise sovereignty across the entire platform ecosystem.',
      monthlyAmount: 20,
      yearlyAmount: 192,
      currency: 'USD',
      features: [
        'Unlimited Access to All Platform Applications (including HR, Advertising & Traffic Director)',
        'Up to 20 Team Members Included',
        'Up to 20 Active Projects',
        '5 GB High-Speed Cloud Storage',
        'Sub-5ms Traffic Director & Bot Shield',
        'Dedicated Team & Priority Support',
        'Full AI Assistant & Agent Access'
      ],
      trialDays: 15,
      buttonText: 'Start 15-Day Free Trial'
    }
  ];

  const activePlans: PricingPlan[] = (initialPlans && initialPlans.length > 0)
    ? initialPlans
    : (fetchedPlans.length > 0 ? fetchedPlans : DEFAULT_FALLBACK_PLANS);
  const displayTitle = title || fetchedTitle || '';
  const displaySubtitle = subtitle || fetchedSubtitle || '';

  // Use base amount of popular plan for geo-pricing detection
  const baseReferenceAmount = activePlans.find((p) => p.isPopular)?.monthlyAmount || activePlans[0]?.monthlyAmount || 17;
  const { data: geoData, hasDiscount } = use180GeoPricing(appId, baseReferenceAmount, {
    enabled: enableGeoPricing,
    apiBaseUrl: getApiUrl(),
  });

  const getThemeStyles = () => {
    const isDark = theme === 'dark' || theme === 'obsidian' || (theme === 'auto' && isDarkMode);

    if (isDark) {
      return {
        isDark: true,
        bg: 'transparent',
        cardBg: '#121214',
        cardBorder: '#27272a',
        cardActiveBorder: accentColor || '#6366f1',
        text: '#f8fafc',
        mutedText: '#94a3b8',
        toggleBg: '#1e1e24',
        toggleActiveBg: '#27272a',
        toggleActiveText: '#ffffff',
        ctaBg: accentColor || '#6366f1',
        ctaText: '#ffffff',
        badgeBg: accentColor || '#6366f1',
        badgeText: '#ffffff',
      };
    }

    switch (theme) {
      case 'light':
      case 'auto':
      default:
        return {
          isDark: false,
          bg: 'transparent',
          cardBg: '#ffffff',
          cardBorder: '#e2e8f0',
          cardActiveBorder: accentColor || '#6366f1',
          text: '#0f172a',
          mutedText: '#64748b',
          toggleBg: '#f1f5f9',
          toggleActiveBg: '#ffffff',
          toggleActiveText: '#0f172a',
          ctaBg: accentColor || '#4f46e5',
          ctaText: '#ffffff',
          badgeBg: accentColor || '#4f46e5',
          badgeText: '#ffffff',
        };
      case 'glass':
        return {
          isDark,
          bg: 'transparent',
          cardBg: isDark ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.85)',
          cardBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          cardActiveBorder: accentColor || '#6366f1',
          text: isDark ? '#f8fafc' : '#0f172a',
          mutedText: isDark ? '#94a3b8' : '#64748b',
          toggleBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          toggleActiveBg: isDark ? '#27272a' : '#ffffff',
          toggleActiveText: isDark ? '#ffffff' : '#0f172a',
          ctaBg: accentColor || '#4f46e5',
          ctaText: '#ffffff',
          badgeBg: accentColor || '#4f46e5',
          badgeText: '#ffffff',
        };
    }
  };

  const s = getThemeStyles();

  const calculateDisplayPrice = (plan: PricingPlan) => {
    const rawMonthly = plan.monthlyAmount ?? plan.amount ?? 0;
    const rawYearly = plan.yearlyAmount ?? Math.round(rawMonthly * 12 * ((100 - yearlyDiscountPct) / 100));
    const effectivePrice = interval === 'monthly' ? rawMonthly : Math.round(rawYearly / 12);

    if (enableGeoPricing && geoData?.hasRegionalDiscount && geoData.discountPercentage > 0) {
      const discounted = Math.round(effectivePrice * (1 - geoData.discountPercentage / 100));
      return {
        amount: discounted,
        currencySymbol: geoData.symbol || '$',
        originalPrice: effectivePrice,
      };
    }

    const symbol = plan.currency === 'INR' ? '₹' : plan.currency === 'EUR' ? '€' : plan.currency === 'GBP' ? '£' : '$';
    return {
      amount: effectivePrice,
      currencySymbol: symbol,
      originalPrice: null,
    };
  };

  const handlePlanClick = (plan: PricingPlan) => {
    if (onSelectPlan) {
      onSelectPlan(plan, interval);
      return;
    }

    if (plan.buttonUrl && plan.buttonUrl.trim().length > 0) {
      window.open(plan.buttonUrl.trim(), '_blank');
      return;
    }

    if (typeof window !== 'undefined') {
      const isInternalDev =
        (window as any).__180_INTERNAL_DEV__ === true ||
        (window as any).__180_ENV__ === 'development';
      const profileBase =
        (window as any).__180_PROFILE_URL ||
        process.env.NEXT_PUBLIC_PROFILE_URL ||
        (isInternalDev ? 'http://localhost:3009' : 'https://profile.180workspace.com');
      const checkoutUrl = `${profileBase}/checkout?appId=${encodeURIComponent(appId)}&planCode=${encodeURIComponent(plan.planCode || plan.id || '')}&interval=${interval.toUpperCase()}&amount=${plan.monthlyAmount || plan.amount || 0}&currency=${encodeURIComponent(plan.currency || 'USD')}&title=${encodeURIComponent(plan.name)}`;
      window.open(checkoutUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className={`one-eighty-pricing-loading p-12 text-center flex flex-col items-center justify-center ${className}`}>
        <div
          style={{ borderColor: `${accentColor} transparent transparent transparent` }}
          className="w-8 h-8 rounded-full border-2 border-solid animate-spin mb-4"
        />
        <p className="text-xs font-semibold opacity-70">Loading 180 Pay subscriptions...</p>
      </div>
    );
  }

  if (error && activePlans.length === 0) {
    return (
      <div className={`one-eighty-pricing-error p-8 text-center rounded-2xl border border-red-500/20 bg-red-500/5 ${className}`}>
        <p className="text-sm font-semibold text-red-500">Subscription Table Unavailable</p>
        <p className="text-xs text-red-400/80 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <section
      className={`one-eighty-pricing-table ${className}`}
      style={{
        padding: '16px 8px 32px 8px',
        color: s.text,
        fontFamily: 'inherit',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: (displayTitle || displaySubtitle) ? '32px' : '28px' }}>
        {(displayTitle || displaySubtitle) && (
          <div style={{ marginBottom: '20px' }}>
            {displayTitle && (
              <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: s.text }}>
                {displayTitle}
              </h2>
            )}
            {displaySubtitle && (
              <p style={{ fontSize: '15px', color: s.mutedText, margin: 0, maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
                {displaySubtitle}
              </p>
            )}
          </div>
        )}

        {hasDiscount && geoData?.banner && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <span>{geoData.banner.flag}</span>
            <span>{geoData.discountPercentage}% Regional Discount Applied ({geoData.countryName})</span>
          </div>
        )}

        {/* Interval Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px',
              background: s.toggleBg,
              borderRadius: '14px',
              border: `1px solid ${s.cardBorder}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: interval === 'monthly' ? s.toggleActiveBg : 'transparent',
                color: interval === 'monthly' ? s.toggleActiveText : s.mutedText,
                boxShadow: interval === 'monthly' ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Monthly billing
            </button>
            <button
              type="button"
              onClick={() => setInterval('yearly')}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: interval === 'yearly' ? s.toggleActiveBg : 'transparent',
                color: interval === 'yearly' ? s.toggleActiveText : s.mutedText,
                boxShadow: interval === 'yearly' ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Annual billing</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#059669',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                }}
              >
                Save {yearlyDiscountPct}%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '24px',
          maxWidth: '1140px',
          margin: '0 auto',
          alignItems: 'stretch',
        }}
      >
        {activePlans.map((plan, index) => {
          const pricing = calculateDisplayPrice(plan);
          const isCurrentActive =
            (currentPlanId && (currentPlanId === plan.id || currentPlanId === plan.planCode)) ||
            (activePlanCode && (activePlanCode.toLowerCase() === plan.name.toLowerCase() || activePlanCode === plan.planCode));

          const badge = plan.badgeText || (plan.isPopular ? 'Most Popular' : undefined);

          return (
            <div
              key={plan.id || plan.planCode || `plan-${index}`}
              style={{
                position: 'relative',
                background: s.cardBg,
                borderRadius: '24px',
                padding: '36px 30px 30px 30px',
                border: `1.5px solid ${isCurrentActive || plan.isPopular ? s.cardActiveBorder : s.cardBorder}`,
                boxShadow: plan.isPopular
                  ? (s.isDark ? '0 20px 40px -15px rgba(99, 102, 241, 0.3)' : '0 20px 40px -15px rgba(99, 102, 241, 0.15)')
                  : (s.isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.04)'),
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {badge && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-13px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: plan.isPopular 
                      ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' 
                      : 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '5px 16px',
                    borderRadius: '9999px',
                    letterSpacing: '0.06em',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: s.text }}>
                    {plan.name}
                  </h3>
                  {isCurrentActive && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>

                {plan.description && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: s.mutedText,
                      margin: '10px 0 20px 0',
                      lineHeight: '1.5',
                      minHeight: '40px',
                    }}
                  >
                    {plan.description}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '20px 0 24px 0' }}>
                  <span style={{ fontSize: '44px', fontWeight: 900, fontFamily: 'inherit', letterSpacing: '-0.03em', color: s.text }}>
                    {pricing.currencySymbol}{pricing.amount}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: s.mutedText, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    / mo
                  </span>
                  {pricing.originalPrice && (
                    <span
                      style={{
                        fontSize: '14px',
                        color: s.mutedText,
                        textDecoration: 'line-through',
                        marginLeft: '8px',
                      }}
                    >
                      {pricing.currencySymbol}{pricing.originalPrice}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${s.cardBorder}`,
                    paddingTop: '20px',
                    marginBottom: '32px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: s.mutedText,
                      marginBottom: '16px',
                    }}
                  >
                    What's included:
                  </div>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '13px',
                    }}
                  >
                    {plan.features.map((feat, idx) => {
                      const text = typeof feat === 'string' ? feat : feat.text;
                      const included = typeof feat === 'string' ? true : feat.included !== false;
                      return (
                        <li
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '11px',
                            fontSize: '13px',
                            lineHeight: '1.45',
                            color: s.text,
                            opacity: included ? 1 : 0.45,
                          }}
                        >
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: included ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.15)',
                              color: included ? '#10b981' : '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '1px',
                            }}
                          >
                            {included ? (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )}
                          </div>
                          <span style={{ fontWeight: 500 }}>{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  disabled={Boolean(isCurrentActive)}
                  onClick={() => handlePlanClick(plan)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: isCurrentActive ? 'default' : 'pointer',
                    background: isCurrentActive 
                      ? s.toggleBg 
                      : (plan.isPopular 
                          ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' 
                          : 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)'),
                    color: isCurrentActive ? s.mutedText : s.ctaText,
                    transition: 'all 0.18s ease',
                    boxShadow: isCurrentActive ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.25)',
                    opacity: isCurrentActive ? 0.7 : 1,
                  }}
                  onMouseOver={(e) => {
                    if (!isCurrentActive) {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLElement).style.opacity = '0.96';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isCurrentActive) {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                    }
                  }}
                >
                  {isCurrentActive
                    ? 'Current Active Plan'
                    : plan.buttonText || (plan.trialDays && plan.trialDays > 0 ? `Start ${plan.trialDays}-Day Free Trial` : 'Get Started')}
                </button>
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: '11px',
                    color: s.mutedText,
                    marginTop: '10px',
                    marginBottom: '4px',
                    fontWeight: 500,
                  }}
                >
                  {plan.trialDays && plan.trialDays > 0
                    ? `${plan.trialDays}-day full access trial • Cancel anytime`
                    : 'Instant activation • Cancel anytime'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
