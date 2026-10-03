'use strict';

import React, { useState } from 'react';
import { use180GeoPricing } from '../hooks/useGeoPricing';

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  monthlyAmount: number;
  yearlyAmount: number;
  currency?: string;
  isPopular?: boolean;
  features: string[];
  ctaText?: string;
  metadata?: Record<string, any>;
}

export interface PricingTableProps {
  appId: string;
  plans: PricingPlan[];
  title?: string;
  subtitle?: string;
  theme?: 'obsidian' | 'dark' | 'light' | 'glass';
  defaultInterval?: 'monthly' | 'yearly';
  enableGeoPricing?: boolean;
  onSelectPlan?: (plan: PricingPlan, interval: 'monthly' | 'yearly') => void;
  className?: string;
}

export const OneEightyPricingTable: React.FC<PricingTableProps> = ({
  appId,
  plans,
  title = 'Flexible Sovereign Pricing',
  subtitle = 'Choose the subscription tier tailored for your scale.',
  theme = 'obsidian',
  defaultInterval = 'monthly',
  enableGeoPricing = true,
  onSelectPlan,
  className = '',
}) => {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>(defaultInterval);

  // Use base amount of popular plan for geo-pricing detection
  const baseReferenceAmount = plans.find((p) => p.isPopular)?.monthlyAmount || plans[0]?.monthlyAmount || 50;
  const { data: geoData, hasDiscount } = use180GeoPricing(appId, baseReferenceAmount, {
    enabled: enableGeoPricing,
  });

  const getThemeStyles = () => {
    switch (theme) {
      case 'light':
        return {
          bg: '#ffffff',
          cardBg: '#fafafa',
          cardBorder: '#e4e4e7',
          cardActiveBorder: '#18181b',
          text: '#09090b',
          mutedText: '#71717a',
          toggleBg: '#f4f4f5',
          ctaBg: '#18181b',
          ctaText: '#ffffff',
          badgeBg: '#18181b',
          badgeText: '#ffffff',
        };
      case 'glass':
        return {
          bg: 'transparent',
          cardBg: 'rgba(24, 24, 27, 0.65)',
          cardBorder: 'rgba(255, 255, 255, 0.1)',
          cardActiveBorder: '#6366f1',
          text: '#f8fafc',
          mutedText: '#94a3b8',
          toggleBg: 'rgba(255, 255, 255, 0.08)',
          ctaBg: '#6366f1',
          ctaText: '#ffffff',
          badgeBg: '#6366f1',
          badgeText: '#ffffff',
        };
      case 'dark':
      case 'obsidian':
      default:
        return {
          bg: '#09090b',
          cardBg: '#121214',
          cardBorder: '#27272a',
          cardActiveBorder: '#ffffff',
          text: '#fafafa',
          mutedText: '#a1a1aa',
          toggleBg: '#18181b',
          ctaBg: '#ffffff',
          ctaText: '#09090b',
          badgeBg: '#ffffff',
          badgeText: '#09090b',
        };
    }
  };

  const s = getThemeStyles();

  const calculateDisplayPrice = (plan: PricingPlan) => {
    const rawPrice = interval === 'monthly' ? plan.monthlyAmount : Math.round(plan.yearlyAmount / 12);
    if (enableGeoPricing && geoData?.hasRegionalDiscount && geoData.discountPercentage > 0) {
      const discounted = Math.round(rawPrice * (1 - geoData.discountPercentage / 100));
      return {
        amount: discounted,
        currencySymbol: geoData.symbol || '₹',
        originalPrice: rawPrice,
      };
    }
    return {
      amount: rawPrice,
      currencySymbol: plan.currency === 'INR' ? '₹' : '$',
      originalPrice: null,
    };
  };

  return (
    <section
      className={`one-eighty-pricing-table ${className}`}
      style={{
        padding: '32px 16px',
        color: s.text,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        {title && <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0' }}>{title}</h2>}
        {subtitle && <p style={{ fontSize: '15px', color: s.mutedText, margin: 0 }}>{subtitle}</p>}

        {hasDiscount && geoData?.banner && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
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
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              background: s.toggleBg,
              borderRadius: '10px',
              border: `1px solid ${s.cardBorder}`,
            }}
          >
            <button
              onClick={() => setInterval('monthly')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: interval === 'monthly' ? s.ctaBg : 'transparent',
                color: interval === 'monthly' ? s.ctaText : s.mutedText,
                transition: 'all 0.15s ease',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('yearly')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: interval === 'yearly' ? s.ctaBg : 'transparent',
                color: interval === 'yearly' ? s.ctaText : s.mutedText,
                transition: 'all 0.15s ease',
              }}
            >
              Yearly <span style={{ fontSize: '11px', color: '#10b981', marginLeft: '4px' }}>Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          maxWidth: '1080px',
          margin: '0 auto',
        }}
      >
        {plans.map((plan) => {
          const pricing = calculateDisplayPrice(plan);
          return (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                background: s.cardBg,
                borderRadius: '16px',
                padding: '32px 24px',
                border: `1px solid ${plan.isPopular ? s.cardActiveBorder : s.cardBorder}`,
                boxShadow: plan.isPopular ? '0 10px 30px rgba(0, 0, 0, 0.25)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {plan.isPopular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: s.badgeBg,
                    color: s.badgeText,
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    letterSpacing: '0.05em',
                  }}
                >
                  Most Popular
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>{plan.name}</h3>
                {plan.description && (
                  <p style={{ fontSize: '14px', color: s.mutedText, margin: '0 0 20px 0', minHeight: '40px' }}>
                    {plan.description}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '24px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 800 }}>
                    {pricing.currencySymbol}{pricing.amount}
                  </span>
                  <span style={{ fontSize: '14px', color: s.mutedText }}>/ month</span>
                  {pricing.originalPrice && (
                    <span
                      style={{
                        fontSize: '14px',
                        color: s.mutedText,
                        textDecoration: 'line-through',
                        marginLeft: '6px',
                      }}
                    >
                      {pricing.currencySymbol}{pricing.originalPrice}
                    </span>
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${s.cardBorder}`, paddingTop: '20px', marginBottom: '32px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {plan.features.map((feat, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => onSelectPlan && onSelectPlan(plan, interval)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: s.ctaBg,
                  color: s.ctaText,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.9')}
                onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              >
                {plan.ctaText || 'Get Started'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
