'use strict';

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { SubscriptionService, RecurringBillingEngine, RazorpaySubscriptionService } from '@workspace/payment-provider';
import { developersPrisma as prisma } from '@workspace/db-180core';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || '180-identity-jwt-secret-key-prod-super-secure';

function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if ((req as any).cookies?.platform_auth_token) {
    token = (req as any).cookies.platform_auth_token;
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.id || decoded.sub || decoded.userId || null;
  } catch {
    return null;
  }
}

export class SubscriptionApiController {
  /**
   * POST /api/v1/subscriptions/plans
   * Create or update a reusable subscription plan (Open API for any developer)
   */
  static async createPlan(req: Request, res: Response) {
    try {
      const {
        clientId,
        clientSecret,
        planCode,
        name,
        description,
        amount,
        currency,
        interval,
        intervalCount,
        trialDays,
        metadata,
      } = req.body;

      if (!clientId || !clientSecret) {
        return res.status(401).json({
          success: false,
          error: 'clientId and clientSecret are required to manage subscription plans',
        });
      }

      const result = await SubscriptionService.createOrUpdatePlan({
        clientId,
        clientSecret,
        planCode,
        name,
        description,
        amount: Number(amount),
        currency,
        interval,
        intervalCount: intervalCount ? Number(intervalCount) : 1,
        trialDays: trialDays ? Number(trialDays) : 0,
        metadata,
      });

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[SubscriptionApiController:createPlan] Error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to create subscription plan',
      });
    }
  }

  /**
   * GET /api/v1/subscriptions/plans
   * Lists all public plans for a client application
   */
  static async listPlans(req: Request, res: Response) {
    try {
      const clientId = (req.query.clientId as string) || req.headers['x-client-id'] as string;
      if (!clientId) {
        return res.status(400).json({
          success: false,
          error: 'clientId query parameter or x-client-id header is required',
        });
      }

      const result = await SubscriptionService.listPlans(clientId);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[SubscriptionApiController:listPlans] Error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to list subscription plans',
      });
    }
  }

  /**
   * POST /api/v1/subscriptions/sessions
   * Creates a recurring subscription checkout session
   */
  static async createSubscriptionSession(req: Request, res: Response) {
    try {
      const {
        clientId,
        clientSecret,
        planCode,
        amount,
        currency,
        title,
        description,
        returnUrl,
        cancelUrl,
        metadata,
      } = req.body;

      if (!clientId || !clientSecret || !planCode) {
        return res.status(400).json({
          success: false,
          error: 'clientId, clientSecret, and planCode are required',
        });
      }

      const session = await SubscriptionService.createSubscriptionSession({
        clientId,
        clientSecret,
        planCode,
        amount: amount ? Number(amount) : undefined,
        currency,
        title,
        description,
        returnUrl,
        cancelUrl,
        metadata,
      });

      return res.status(200).json(session);
    } catch (err: any) {
      console.error('[SubscriptionApiController:createSubscriptionSession] Error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to create subscription session',
      });
    }
  }

  /**
   * GET /api/v1/subscriptions/:id
   * Get details of a subscription for user portal or client app
   */
  static async getSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = extractUserIdFromRequest(req);
      const clientId = (req.query.clientId as string) || (req.headers['x-client-id'] as string);
      const clientSecret = (req.query.clientSecret as string) || (req.headers['x-client-secret'] as string);

      let appId: string | undefined;
      if (clientId && clientSecret) {
        const app = await prisma.oAuthApp.findUnique({ where: { clientId } });
        if (!app || !timingSafeCompare(hashSecret(clientSecret), app.clientSecretHash)) {
          return res.status(401).json({ success: false, error: 'Invalid client credentials' });
        }
        appId = app.id;
      }

      const result = await SubscriptionService.getSubscriptionDetails(id, appId, userId || undefined);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[SubscriptionApiController:getSubscription] Error:', err);
      return res.status(404).json({
        success: false,
        error: err.message || 'Subscription not found',
      });
    }
  }

  /**
   * POST /api/v1/subscriptions/:id/cancel
   * Cancel an active subscription (From 180 Pay user modal or via Client API)
   */
  static async cancelSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { clientId, clientSecret, reason } = req.body || {};
      const userId = extractUserIdFromRequest(req);

      let appId: string | undefined;
      if (clientId && clientSecret) {
        const app = await prisma.oAuthApp.findUnique({ where: { clientId } });
        if (!app || !timingSafeCompare(hashSecret(clientSecret), app.clientSecretHash)) {
          return res.status(401).json({ success: false, error: 'Invalid client credentials' });
        }
        appId = app.id;
      } else if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required: provide Bearer token or clientId/clientSecret',
        });
      }

      const result = await SubscriptionService.cancelSubscription(
        id,
        appId,
        reason || 'Subscriber cancelled via 180 Pay bottom sheet',
        userId || undefined
      );
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[SubscriptionApiController:cancelSubscription] Error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to cancel subscription',
      });
    }
  }

  /**
   * POST /api/v1/subscriptions/run-billing-cycle
   * Trigger recurring billing cycle (Internal Worker or Cron)
   */
  static async runBillingCycle(req: Request, res: Response) {
    try {
      const cronSecret = process.env.CRON_SECRET || process.env.BILLING_CRON_SECRET;
      if (cronSecret) {
        const authHeader = req.headers['authorization'];
        const cronKey = (req.headers['x-cron-key'] || req.headers['x-cron-secret']) as string;
        const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        const token = bearer || cronKey;
        if (token !== cronSecret) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized: Invalid cron secret (pass Authorization: Bearer <secret> or x-cron-key: <secret>)',
          });
        }
      }

      const result = await RecurringBillingEngine.runRecurringBillingCycle();
      return res.status(200).json({
        success: true,
        message: 'Recurring billing cycle executed successfully',
        data: result,
      });
    } catch (err: any) {
      console.error('[SubscriptionApiController:runBillingCycle] Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Recurring billing cycle failed',
      });
    }
  }

  /**
   * POST /api/v1/subscriptions/razorpay-webhook
   * Razorpay server-to-server webhook endpoint for recurring subscription events
   */
  static async handleRazorpayWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      // Verify Razorpay signature
      if (signature) {
        const isValid = RazorpaySubscriptionService.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.warn('[SubscriptionApiController:handleRazorpayWebhook] Invalid webhook signature');
          return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
        }
      }

      const result = await RazorpaySubscriptionService.handleRazorpaySubscriptionWebhook(req.body);
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      console.error('[SubscriptionApiController:handleRazorpayWebhook] Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Webhook processing failed',
      });
    }
  }
}

