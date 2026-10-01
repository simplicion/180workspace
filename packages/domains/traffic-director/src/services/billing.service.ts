import crypto from 'crypto';
import axios from 'axios';
import { prisma as db } from '@workspace/db';

export type TrafficDirectorTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface PlanDefinition {
  tier: TrafficDirectorTier;
  name: string;
  price: number;
  currency: string;
  interval: string;
  maxLinks: number;
  features: string[];
  basePriceUsd?: number;
  currencySymbol?: string;
  exchangeRate?: number;
}

// ─── Live Currency Conversion Cache (1-Hour TTL) ───────────────────────────
let cachedRates: Record<string, number> | null = null;
let lastRatesFetchTime = 0;

export async function fetchLiveExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (!cachedRates || now - lastRatesFetchTime > 3600000) {
    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 });
      if (response.data?.rates) {
        cachedRates = response.data.rates;
        lastRatesFetchTime = now;
      }
    } catch (error) {
      console.warn('[TrafficDirectorBilling] Live exchange rate fetch failed, using fallback rates:', error);
    }
  }

  return (
    cachedRates || {
      USD: 1.0,
      INR: 85.5,
      EUR: 0.92,
      GBP: 0.79,
      CAD: 1.36,
      AUD: 1.53,
      AED: 3.67,
      SGD: 1.34,
      JPY: 152.0,
    }
  );
}

export function resolveCurrencySymbol(currencyCode: string): string {
  try {
    const code = (currencyCode || 'USD').toString().trim().toUpperCase();
    return (
      (0)
        .toLocaleString('en-US', {
          style: 'currency',
          currency: code,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        .replace(/\d/g, '')
        .trim() || (code === 'INR' ? '₹' : '$')
    );
  } catch {
    return currencyCode === 'INR' ? '₹' : '$';
  }
}

export const TRAFFIC_DIRECTOR_PLANS: Record<TrafficDirectorTier, PlanDefinition> = {
  FREE: {
    tier: 'FREE',
    name: '7-Day Free Trial',
    price: 0,
    currency: 'USD',
    interval: '7_days',
    maxLinks: 2,
    features: [
      '7-Day Full Platform Trial',
      'Up to 2 Active Smart Links',
      'Zero-Latency Anycast Routing',
      'Basic Bot & Spider Shields',
      'Standard Traffic Analytics',
    ],
  },
  STARTER: {
    tier: 'STARTER',
    name: 'Starter Edge',
    price: 25,
    currency: 'USD',
    interval: 'monthly',
    maxLinks: 2,
    features: [
      'Up to 2 Active Smart Links',
      'Zero-Latency Anycast Routing',
      'Official Tor Exit Node Blacklist',
      'Basic Bot & Spider Shields',
      'Basic Traffic Analytics & Logs',
      '1 Custom Domain Allocation',
    ],
  },
  PRO: {
    tier: 'PRO',
    name: 'Pro Armor',
    price: 50,
    currency: 'USD',
    interval: 'monthly',
    maxLinks: 5,
    features: [
      'Up to 5 Active Smart Links',
      'Dynamic Client-Side Shield Injection',
      'Meta, Google & TikTok AdBot Cloaking',
      'Subpath Media Proxy & Live Asset Cloaking',
      'Automated Ramp-Up Traffic Warmer',
      '5 Custom Domain Allocations',
      'Priority Anycast Edge Routing',
      'Advanced Geo & Device Telemetry',
    ],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Enterprise Sovereign',
    price: 75,
    currency: 'USD',
    interval: 'monthly',
    maxLinks: -1, // Unlimited
    features: [
      'Unlimited Smart Links (Full Allocation)',
      'Sub-Millisecond Zero-Database Tor RAM Sets',
      'Comprehensive Spy-Tool & Competitor Shields',
      'Sovereign Dedicated Edge Shield Generation',
      'Unlimited Custom Domains & Safe Pages',
      'AI White Page Builder Integration',
      '24/7 Dedicated Account Operations Support',
      'Real-Time Live Edge Telemetry Stream',
    ],
  },
};

export class TrafficDirectorBillingService {
  private static activeSubCache = new Map<string, { isActive: boolean; expiresAt: number }>();

  static invalidateSubscriptionCache(companyId: string) {
    if (companyId) {
      this.activeSubCache.delete(companyId);
    }
  }

  /**
   * Fast edge check if tenant has an active subscription or unexpired 7-day free trial.
   * Cached for 30 seconds for high throughput, invalidated on billing webhooks.
   */
  static async isCompanySubscriptionActive(companyId: string): Promise<boolean> {
    if (!companyId) return true;
    const now = Date.now();
    const cached = this.activeSubCache.get(companyId);
    if (cached && cached.expiresAt > now) {
      return cached.isActive;
    }

    try {
      const statusRes = await this.getSubscriptionStatus(companyId);
      const isActive = Boolean(statusRes?.subscription?.isSubscriptionActive);
      this.activeSubCache.set(companyId, { isActive, expiresAt: now + 30000 });
      return isActive;
    } catch {
      return true; // Fail open if error
    }
  }

  private static get180PayBaseUrl(): string {
    return (
      process.env.ONE_EIGHTY_PAY_CORE_URL ||
      process.env.CORE_BACKEND_URL ||
      'http://localhost:4003'
    );
  }

  private static getClientCredentials(): { clientId: string; clientSecret: string } {
    return {
      clientId: process.env.TRAFFIC_DIRECTOR_CLIENT_ID || '180-traffic-director',
      clientSecret:
        process.env.TRAFFIC_DIRECTOR_CLIENT_SECRET ||
        '180_secret_traffic_director_prod_key_771829',
    };
  }

  private static async getSubscriptionRecord(companyId: string): Promise<any> {
    try {
      if ((db as any).trafficDirectorSubscription?.findUnique) {
        return await (db as any).trafficDirectorSubscription.findUnique({
          where: { companyId },
        });
      }
      const rows: any = await (db as any).$queryRawUnsafe(
        `SELECT * FROM "TrafficDirectorSubscription" WHERE "companyId" = $1 LIMIT 1`,
        companyId
      );
      return rows?.[0] || null;
    } catch (err) {
      return null;
    }
  }

  private static async createSubscriptionRecord(data: any): Promise<any> {
    try {
      if ((db as any).trafficDirectorSubscription?.create) {
        try {
          return await (db as any).trafficDirectorSubscription.create({ data });
        } catch (prismaErr) {
          // Fall through to raw query fallback
        }
      }
      const rows: any = await (db as any).$queryRawUnsafe(
        `INSERT INTO "TrafficDirectorSubscription" 
         ("id", "companyId", "planTier", "maxLinks", "status", "oneEightySubId", "amountCharged", "currency", "couponApplied", "discountAmount", "trialStartedAt", "trialEndsAt", "currentPeriodStart", "currentPeriodEnd", "nextBillingDate", "autoRenew", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
         RETURNING *`,
        data.companyId,
        data.planTier || 'FREE',
        data.maxLinks !== undefined ? data.maxLinks : 2,
        data.status || 'TRIALING',
        data.oneEightySubId || null,
        data.amountCharged || 0,
        data.currency || 'USD',
        data.couponApplied || null,
        data.discountAmount || 0,
        data.trialStartedAt || new Date(),
        data.trialEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        data.currentPeriodStart || new Date(),
        data.currentPeriodEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        data.nextBillingDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        data.autoRenew !== undefined ? data.autoRenew : false
      );
      return rows?.[0] || null;
    } catch (err) {
      return null;
    }
  }

  private static async upsertSubscriptionRecord(companyId: string, updateData: any, createData: any): Promise<any> {
    this.invalidateSubscriptionCache(companyId);
    try {
      if ((db as any).trafficDirectorSubscription?.upsert) {
        try {
          return await (db as any).trafficDirectorSubscription.upsert({
            where: { companyId },
            update: updateData,
            create: createData,
          });
        } catch (upsertErr: any) {
          // If unique constraint or concurrency collision occurred, update existing record
          try {
            return await (db as any).trafficDirectorSubscription.update({
              where: { companyId },
              data: updateData,
            });
          } catch (_) {
            // fall through to raw query fallback
          }
        }
      }
      const rows: any = await (db as any).$queryRawUnsafe(
        `INSERT INTO "TrafficDirectorSubscription"
         ("id", "companyId", "planTier", "maxLinks", "status", "oneEightySubId", "amountCharged", "currency", "couponApplied", "discountAmount", "trialStartedAt", "trialEndsAt", "currentPeriodStart", "currentPeriodEnd", "nextBillingDate", "autoRenew", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
         ON CONFLICT ("companyId") DO UPDATE SET
           "planTier" = EXCLUDED."planTier",
           "maxLinks" = EXCLUDED."maxLinks",
           "status" = EXCLUDED."status",
           "oneEightySubId" = EXCLUDED."oneEightySubId",
           "amountCharged" = EXCLUDED."amountCharged",
           "currency" = EXCLUDED."currency",
           "couponApplied" = EXCLUDED."couponApplied",
           "discountAmount" = EXCLUDED."discountAmount",
           "trialStartedAt" = COALESCE(EXCLUDED."trialStartedAt", "TrafficDirectorSubscription"."trialStartedAt"),
           "trialEndsAt" = COALESCE(EXCLUDED."trialEndsAt", "TrafficDirectorSubscription"."trialEndsAt"),
           "currentPeriodStart" = EXCLUDED."currentPeriodStart",
           "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
           "nextBillingDate" = EXCLUDED."nextBillingDate",
           "autoRenew" = EXCLUDED."autoRenew",
           "updatedAt" = NOW()
         RETURNING *`,
        companyId,
        createData.planTier || 'STARTER',
        createData.maxLinks !== undefined ? createData.maxLinks : 2,
        createData.status || 'ACTIVE',
        createData.oneEightySubId || null,
        createData.amountCharged || 25.0,
        createData.currency || 'USD',
        createData.couponApplied || null,
        createData.discountAmount || 0,
        createData.trialStartedAt || null,
        createData.trialEndsAt || null,
        createData.currentPeriodStart || new Date(),
        createData.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createData.nextBillingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createData.autoRenew !== undefined ? createData.autoRenew : true
      );
      return rows?.[0] || null;
    } catch (err) {
      return null;
    }
  }

  private static async updateSubscriptionStatusRecord(companyId: string, status: string, autoRenew?: boolean): Promise<any> {
    this.invalidateSubscriptionCache(companyId);
    try {
      if ((db as any).trafficDirectorSubscription?.updateMany) {
        return await (db as any).trafficDirectorSubscription.updateMany({
          where: { companyId },
          data: autoRenew !== undefined ? { status, autoRenew } : { status },
        });
      }
      if (autoRenew !== undefined) {
        return await (db as any).$executeRawUnsafe(
          `UPDATE "TrafficDirectorSubscription" SET "status" = $1, "autoRenew" = $2, "updatedAt" = NOW() WHERE "companyId" = $3`,
          status,
          autoRenew,
          companyId
        );
      }
      return await (db as any).$executeRawUnsafe(
        `UPDATE "TrafficDirectorSubscription" SET "status" = $1, "updatedAt" = NOW() WHERE "companyId" = $2`,
        status,
        companyId
      );
    } catch (err) {
      return null;
    }
  }

  /**
   * Resolve company currency and live FX rate from USD to requested country payment currency
   */
  static async getCompanyCurrencyInfo(companyId?: string): Promise<{ currency: string; rate: number; country: string; symbol: string }> {
    let currency = 'INR';
    let country = 'IN';

    if (companyId) {
      try {
        const company = await (db as any).company.findUnique({
          where: { id: companyId },
          select: { currency: true, country: true },
        });
        if (company?.currency) {
          currency = company.currency.toUpperCase();
        }
        if (company?.country) {
          country = company.country.toUpperCase();
          if (!company?.currency && (country === 'IN' || country === 'INDIA')) {
            currency = 'INR';
          }
        }
      } catch (err) {
        console.warn('[TrafficDirectorBilling] Could not resolve company currency:', err);
      }
    }

    const rates = await fetchLiveExchangeRates();
    const rate = rates[currency] || (currency === 'INR' ? 85.5 : 1);
    const symbol = resolveCurrencySymbol(currency);

    return { currency, rate, country, symbol };
  }

  /**
   * 1. Get current tenant subscription status & link quota usage
   */
  static async getSubscriptionStatus(companyId: string) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const { currency, rate, country, symbol } = await this.getCompanyCurrencyInfo(companyId);

    let sub = await this.getSubscriptionRecord(companyId);

    if (!sub) {
      // Auto-provision 7-Day Free Trial for first-time login
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      sub = await this.createSubscriptionRecord({
        companyId,
        planTier: 'FREE',
        maxLinks: 2,
        status: 'TRIALING',
        amountCharged: 0,
        currency: 'USD',
        trialStartedAt: now,
        trialEndsAt: trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        nextBillingDate: trialEndsAt,
        autoRenew: false,
      });

      if (!sub) {
        sub = {
          companyId,
          planTier: 'FREE',
          maxLinks: 2,
          status: 'TRIALING',
          amountCharged: 0,
          currency: 'USD',
          trialStartedAt: now,
          trialEndsAt: trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          nextBillingDate: trialEndsAt,
          autoRenew: false,
        };
      }
    }

    // Determine trial validity
    const now = new Date();
    let isTrialing = sub.status === 'TRIALING';
    let isTrialExpired = false;
    let trialDaysLeft = 0;

    if (isTrialing) {
      const trialEnds = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
      if (trialEnds && trialEnds.getTime() <= now.getTime()) {
        isTrialExpired = true;
        isTrialing = false;
        if (sub.status !== 'EXPIRED') {
          await this.updateSubscriptionStatusRecord(companyId, 'EXPIRED');
          sub.status = 'EXPIRED';
        }
      } else if (trialEnds) {
        const msLeft = trialEnds.getTime() - now.getTime();
        trialDaysLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      }
    } else if (sub.status === 'EXPIRED') {
      isTrialExpired = true;
    }

    const isSubscriptionActive = sub.status === 'ACTIVE' || (sub.status === 'TRIALING' && !isTrialExpired);

    const currentLinksCount = await (db as any).trafficLink.count({
      where: { companyId },
    });

    const activeLinksCount = await (db as any).trafficLink.count({
      where: { companyId, isActive: true },
    });

    const planTier = (sub.planTier?.toUpperCase() as TrafficDirectorTier) || 'FREE';
    const planMeta = TRAFFIC_DIRECTOR_PLANS[planTier] || TRAFFIC_DIRECTOR_PLANS.STARTER;
    const maxLinks = sub.maxLinks !== undefined ? sub.maxLinks : planMeta.maxLinks;

    const isUnlimited = maxLinks === -1;
    const quotaUsedPercent = isUnlimited ? 0 : Math.min(100, Math.round((currentLinksCount / maxLinks) * 100));

    // canCreateMoreLinks: active subscription or trial AND quota available
    const canCreateMoreLinks = isSubscriptionActive && (isUnlimited || currentLinksCount < maxLinks);

    // Advanced analytics unlocked only for PRO and ENTERPRISE when subscription is active
    const hasAdvancedAnalytics = isSubscriptionActive && (planTier === 'PRO' || planTier === 'ENTERPRISE');

    const availablePlans = Object.values(TRAFFIC_DIRECTOR_PLANS)
      .filter((p) => p.tier !== 'FREE')
      .map((p) => {
        const localizedPrice = currency === 'INR' ? Math.round(p.price * rate) : Number((p.price * rate).toFixed(2));
        return {
          ...p,
          basePriceUsd: p.price,
          price: localizedPrice,
          currency,
          currencySymbol: symbol,
          exchangeRate: rate,
        };
      });

    return {
      success: true,
      subscription: {
        id: sub.id,
        companyId: sub.companyId,
        planTier,
        planName: planMeta.name,
        price: planMeta.price,
        currency: sub.currency || currency,
        currencySymbol: symbol,
        status: sub.status,
        oneEightySubId: sub.oneEightySubId,
        amountCharged: sub.amountCharged,
        couponApplied: sub.couponApplied,
        discountAmount: sub.discountAmount,
        trialStartedAt: sub.trialStartedAt,
        trialEndsAt: sub.trialEndsAt,
        isTrialing,
        trialDaysLeft,
        isTrialExpired,
        isSubscriptionActive,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        nextBillingDate: sub.nextBillingDate,
        autoRenew: sub.autoRenew,
        maxLinks,
        isUnlimited,
        currentLinksCount,
        activeLinksCount,
        quotaUsedPercent,
        canCreateMoreLinks,
        hasAdvancedAnalytics,
        cloakingEnabled: isSubscriptionActive,
      },
      availablePlans,
      currency,
      currencySymbol: symbol,
      exchangeRate: rate,
      country,
    };
  }

  /**
   * 2. Validate discount coupon using existing platform coupon engine
   */
  static async validateCoupon(couponCode: string, targetTier: TrafficDirectorTier = 'PRO') {
    if (!couponCode || !couponCode.trim()) {
      throw new Error('Please enter a coupon code');
    }

    const code = couponCode.trim().toUpperCase();
    const coupon = await (db as any).coupon.findUnique({
      where: { couponCode: code },
    });

    if (!coupon || !coupon.isActive) {
      throw new Error('Invalid or inactive coupon code');
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new Error('This coupon code has expired');
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new Error('This coupon code has reached its maximum usage limit');
    }

    const tierMeta = TRAFFIC_DIRECTOR_PLANS[targetTier] || TRAFFIC_DIRECTOR_PLANS.PRO;
    const originalPrice = tierMeta.price;

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((originalPrice * (coupon.discountValue / 100)) * 100) / 100;
    } else {
      discountAmount = Math.min(originalPrice, coupon.discountValue);
    }

    const finalPrice = Math.max(0, Math.round((originalPrice - discountAmount) * 100) / 100);

    return {
      valid: true,
      couponCode: coupon.couponCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      originalPrice,
      discountAmount,
      finalPrice,
      currency: 'USD',
      message: `Coupon "${coupon.couponCode}" applied successfully! You save $${discountAmount.toFixed(2)}.`,
    };
  }

  /**
   * 3. Create a 180 Pay Subscription Checkout Session via REST API with live currency conversion
   * Automatically converts USD base price into the requested country payment currency.
   */
  static async createSubscriptionCheckout(options: {
    companyId: string;
    planTier: TrafficDirectorTier;
    couponCode?: string;
    returnUrl?: string;
    cancelUrl?: string;
  }) {
    const { companyId, planTier, couponCode, returnUrl, cancelUrl } = options;

    const planMeta = TRAFFIC_DIRECTOR_PLANS[planTier];
    if (!planMeta) {
      throw new Error(`Invalid subscription plan tier: ${planTier}`);
    }

    let finalAmountUsd = planMeta.price;
    let appliedCoupon: string | null = null;
    let discountAmount = 0;

    if (couponCode) {
      try {
        const couponResult = await this.validateCoupon(couponCode, planTier);
        finalAmountUsd = couponResult.finalPrice;
        appliedCoupon = couponResult.couponCode;
        discountAmount = couponResult.discountAmount;
      } catch (err: any) {
        throw new Error(`Coupon error: ${err.message}`);
      }
    }

    // ─── Live Currency Conversion: Convert USD to Requested Country Payment Currency ───
    const { currency, rate, country, symbol } = await this.getCompanyCurrencyInfo(companyId);
    const convertedAmount = currency === 'INR'
      ? Math.round(finalAmountUsd * rate)
      : Number((finalAmountUsd * rate).toFixed(2));

    const { clientId, clientSecret } = this.getClientCredentials();
    const payBaseUrl = this.get180PayBaseUrl();

    // Call 180 Pay to create the subscription checkout session in localized currency
    const payload = {
      clientId,
      clientSecret,
      planCode: `traffic-${planTier.toLowerCase()}`,
      amount: convertedAmount,
      currency: currency,
      title: `180 Traffic Director ${planMeta.name}`,
      description: `Recurring monthly subscription for ${planMeta.maxLinks === -1 ? 'Unlimited' : planMeta.maxLinks} Smart Links and sovereign bot cloaking.`,
      mode: 'subscription',
      returnUrl: returnUrl || 'http://localhost:3006/traffic-director/subscription?status=success',
      cancelUrl: cancelUrl || 'http://localhost:3006/traffic-director/subscription?status=cancelled',
      metadata: {
        companyId,
        planTier,
        couponCode: appliedCoupon,
        discountAmount,
        originalPriceUsd: planMeta.price,
        finalPriceUsd: finalAmountUsd,
        exchangeRate: rate,
        baseCurrency: 'USD',
        convertedCurrency: currency,
        country,
        isTrafficDirectorSubscription: true,
      },
    };

    let sessionResponse;
    try {
      sessionResponse = await axios.post(`${payBaseUrl}/api/v1/subscriptions/sessions`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
    } catch (apiErr: any) {
      // Fallback to standard checkout sessions endpoint if subscriptions endpoint is routing
      try {
        sessionResponse = await axios.post(`${payBaseUrl}/api/v1/checkout/sessions`, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });
      } catch (fallbackErr: any) {
        const msg = fallbackErr.response?.data?.error || fallbackErr.message;
        throw new Error(`180 Pay Gateway Error: ${msg}`);
      }
    }

    const data = sessionResponse.data;
    if (!data.success && !data.sessionId) {
      throw new Error(data.error || 'Failed to initiate 180 Pay checkout session');
    }

    return {
      success: true,
      sessionId: data.sessionId,
      checkoutUrl: data.checkoutUrl,
      amount: convertedAmount,
      currency: currency,
      currencySymbol: symbol,
      basePriceUsd: finalAmountUsd,
      exchangeRate: rate,
      planTier,
      planName: planMeta.name,
      appliedCoupon,
      discountAmount,
    };
  }

  /**
   * Verify HMAC-SHA256 signature from 180 Pay webhook dispatcher
   */
  static verifyWebhookSignature(payloadString: string, signatureHeader: string, secret?: string): boolean {
    const webhookSecret = secret || process.env.TRAFFIC_DIRECTOR_WEBHOOK_SECRET || process.env.TRAFFIC_DIRECTOR_CLIENT_SECRET;
    if (!webhookSecret || !signatureHeader) return true;

    try {
      const parts = signatureHeader.split(',');
      const tPart = parts.find((p) => p.startsWith('t='))?.replace('t=', '');
      const v1Part = parts.find((p) => p.startsWith('v1='))?.replace('v1=', '');
      if (!tPart || !v1Part) return false;

      const signPayload = `${tPart}.${payloadString}`;
      const expected = crypto.createHmac('sha256', webhookSecret).update(signPayload).digest('hex');
      if (expected.length !== v1Part.length) return false;
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1Part));
    } catch {
      return false;
    }
  }

  /**
   * 4. Process incoming signed webhook from 180 Pay
   */
  static async handleWebhookEvent(payload: any, signatureHeader?: string, rawBody?: string, secret?: string) {
    if (signatureHeader && rawBody) {
      const isValid = this.verifyWebhookSignature(rawBody, signatureHeader, secret);
      if (!isValid) {
        throw new Error('Invalid HMAC-SHA256 webhook signature from 180 Pay');
      }
    }

    const { event, data } = payload;
    if (!event || !data) return { received: false, error: 'Malformed payload' };

    const metadata = data.metadata || {};
    const companyId = metadata.companyId;

    if (!companyId) {
      return { received: true, ignored: true, reason: 'No companyId in metadata' };
    }

    this.invalidateSubscriptionCache(companyId);

    if (event === 'subscription.activated' || event === 'subscription.renewed' || event === 'payment.succeeded') {
      let planTier: TrafficDirectorTier = 'STARTER';
      const rawTier = metadata.planTier || metadata.tier;
      const rawCode = data.planCode || metadata.planCode || '';

      if (rawTier) {
        planTier = String(rawTier).toUpperCase() as TrafficDirectorTier;
      } else if (rawCode) {
        const codeLower = String(rawCode).toLowerCase();
        if (codeLower.includes('enterprise')) planTier = 'ENTERPRISE';
        else if (codeLower.includes('pro')) planTier = 'PRO';
        else if (codeLower.includes('starter')) planTier = 'STARTER';
      } else if (data.amount) {
        if (data.amount >= 75) planTier = 'ENTERPRISE';
        else if (data.amount >= 50) planTier = 'PRO';
        else planTier = 'STARTER';
      }

      const planMeta = TRAFFIC_DIRECTOR_PLANS[planTier] || TRAFFIC_DIRECTOR_PLANS.STARTER;

      // Ensure company exists before creating foreign key relation
      try {
        await (db as any).$executeRawUnsafe(
          `INSERT INTO "Company" ("id", "name", "createdAt", "updatedAt") 
           VALUES ($1, 'Enterprise Subscriber Organization', NOW(), NOW()) 
           ON CONFLICT ("id") DO NOTHING`,
          companyId
        );
      } catch (_) {}

      const startDate = data.currentPeriodStart ? new Date(data.currentPeriodStart) : new Date();
      const endDate = data.currentPeriodEnd
        ? new Date(data.currentPeriodEnd)
        : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const nextBilling = data.nextBillingDate ? new Date(data.nextBillingDate) : endDate;

      const updateFields = {
        planTier,
        maxLinks: planMeta.maxLinks,
        status: 'ACTIVE',
        oneEightySubId: data.subscriptionId || data.sessionId,
        amountCharged: data.amount || planMeta.price,
        currency: data.currency || 'USD',
        couponApplied: metadata.couponCode || null,
        discountAmount: metadata.discountAmount || 0,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        nextBillingDate: nextBilling,
        autoRenew: true,
      };

      const createFields = {
        companyId,
        ...updateFields,
      };

      await this.upsertSubscriptionRecord(companyId, updateFields, createFields);

      return { received: true, updated: true, companyId, planTier };
    }

    if (event === 'subscription.payment_failed') {
      await this.updateSubscriptionStatusRecord(companyId, 'PAST_DUE');
      return { received: true, updated: true, companyId, status: 'PAST_DUE' };
    }

    if (event === 'subscription.cancelled') {
      await this.updateSubscriptionStatusRecord(companyId, 'CANCELLED', false);
      return { received: true, updated: true, companyId, status: 'CANCELLED' };
    }

    return { received: true, unhandled: true, event };
  }
}
