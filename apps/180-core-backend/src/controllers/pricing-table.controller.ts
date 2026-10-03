'use strict';

import { Request, Response } from 'express';
import { developersPrisma as prisma } from '@workspace/db-180core';

export class PricingTableApiController {
  /**
   * GET /api/v1/pricing-tables/:appId
   * Public / SDK endpoint to retrieve the visual pricing table configuration.
   * Auto-generates fallback plan cards from SubscriptionPlan records if not customized.
   */
  static async getPricingTableConfig(req: Request, res: Response) {
    try {
      const appId = String(req.params.appId);

      // Verify app exists
      const app = await prisma.oAuthApp.findFirst({
        where: {
          OR: [{ id: appId }, { clientId: appId }],
        },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          clientId: true,
        },
      });

      if (!app) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }

      // Check for custom config
      const existingConfig = await (prisma as any).pricingTableConfig.findUnique({
        where: { appId: app.id },
      });

      if (existingConfig) {
        return res.status(200).json({
          success: true,
          config: {
            ...existingConfig,
            appName: app.name,
            appLogo: app.logoUrl,
            clientId: app.clientId,
          },
        });
      }

      // Auto-generate fallback from active subscription plans
      const plans = await (prisma as any).subscriptionPlan.findMany({
        where: { appId: app.id, isActive: true },
        orderBy: { amount: 'asc' },
      });

      let planCards: any[] = [];
      if (plans && plans.length > 0) {
        planCards = plans.map((p: any, idx: number) => ({
          planCode: p.planCode,
          name: p.name,
          description: p.description || 'Standard access tier',
          amount: p.amount,
          currency: p.currency,
          interval: p.interval,
          isPopular: idx === 1 || plans.length === 1,
          features: [
            'Instant 1-Click Access',
            'Full Platform Privileges',
            '24/7 Developer Support',
            'Cancel Anytime',
          ],
          buttonText: 'Get Started',
        }));
      } else {
        planCards = [
          {
            planCode: 'starter',
            name: 'Starter Plan',
            description: 'Perfect for small teams & indie builders',
            amount: 499,
            currency: 'INR',
            interval: 'MONTHLY',
            isPopular: false,
            features: ['Up to 5,000 monthly operations', 'Basic analytics dashboard', 'Community support'],
            buttonText: 'Choose Starter',
          },
          {
            planCode: 'pro',
            name: 'Pro Sovereign',
            description: 'For scaling products and high-volume systems',
            amount: 1499,
            currency: 'INR',
            interval: 'MONTHLY',
            isPopular: true,
            features: [
              'Unlimited monthly operations',
              'Advanced analytics & audit logs',
              'Custom webhook endpoints',
              'Priority 24/7 dedicated support',
            ],
            buttonText: 'Upgrade to Pro',
          },
        ];
      }

      const defaultConfig = {
        appId: app.id,
        appName: app.name,
        appLogo: app.logoUrl,
        clientId: app.clientId,
        headline: 'Simple, transparent pricing',
        subheadline: `Choose the plan that fits your growth on ${app.name}`,
        theme: 'auto',
        accentColor: '#6366f1',
        billingIntervals: ['MONTHLY', 'YEARLY'],
        yearlyDiscountPct: 20,
        planCards,
        customCss: '',
      };

      return res.status(200).json({
        success: true,
        config: defaultConfig,
      });
    } catch (err: any) {
      console.error('[PricingTableApiController:getPricingTableConfig] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/v1/pricing-tables/:appId
   * Developer endpoint to save / customize the pricing table.
   */
  static async updatePricingTableConfig(req: Request, res: Response) {
    try {
      const appId = String(req.params.appId);
      const {
        headline,
        subheadline,
        theme,
        accentColor,
        billingIntervals,
        yearlyDiscountPct,
        planCards,
        customCss,
      } = req.body;

      const app = await prisma.oAuthApp.findFirst({
        where: {
          OR: [{ id: appId }, { clientId: appId }],
        },
      });

      if (!app) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }

      const updated = await (prisma as any).pricingTableConfig.upsert({
        where: { appId: app.id },
        create: {
          appId: app.id,
          headline: headline || 'Simple, transparent pricing',
          subheadline: subheadline || 'Choose the plan that fits your growth',
          theme: theme || 'auto',
          accentColor: accentColor || '#6366f1',
          billingIntervals: Array.isArray(billingIntervals) ? billingIntervals : ['MONTHLY', 'YEARLY'],
          yearlyDiscountPct: yearlyDiscountPct !== undefined ? Number(yearlyDiscountPct) : 20,
          planCards: Array.isArray(planCards) ? planCards : [],
          customCss: customCss || '',
        },
        update: {
          headline: headline !== undefined ? headline : undefined,
          subheadline: subheadline !== undefined ? subheadline : undefined,
          theme: theme !== undefined ? theme : undefined,
          accentColor: accentColor !== undefined ? accentColor : undefined,
          billingIntervals: Array.isArray(billingIntervals) ? billingIntervals : undefined,
          yearlyDiscountPct: yearlyDiscountPct !== undefined ? Number(yearlyDiscountPct) : undefined,
          planCards: Array.isArray(planCards) ? planCards : undefined,
          customCss: customCss !== undefined ? customCss : undefined,
        },
      });

      return res.status(200).json({
        success: true,
        data: updated,
        config: updated,
      });
    } catch (err: any) {
      console.error('[PricingTableApiController:updatePricingTableConfig] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
