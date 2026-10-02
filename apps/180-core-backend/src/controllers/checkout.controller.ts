'use strict';

import { Request, Response } from 'express';
import { CheckoutService } from '@workspace/payment-provider';
import { developersPrisma as prisma } from '@workspace/db-180core';

export class CheckoutApiController {
  /**
   * POST /api/v1/checkout/sessions
   * 3rd-Party Developer API or Authenticated User checkout initiation
   */
  static async createCheckoutSession(req: Request, res: Response) {
    try {
      const {
        amount,
        currency = 'INR',
        title,
        description,
        returnUrl,
        cancelUrl,
        metadata,
      } = req.body;

      const clientId = req.body.clientId;
      const clientSecret = req.body.clientSecret;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Payment amount must be greater than zero',
        });
      }

      // If client credentials provided, use standard 3rd-party developer flow
      if (clientId && clientSecret) {
        const session = await CheckoutService.createSession({
          clientId,
          clientSecret,
          amount: Number(amount),
          currency,
          title: title || '180 Pay Sovereign Checkout',
          description,
          returnUrl,
          cancelUrl,
          metadata,
        });

        return res.status(200).json({
          success: true,
          sessionId: session.sessionId,
          session: {
            id: session.sessionId,
            amount: session.amount,
            currency: session.currency,
            expiresAt: session.expiresAt,
          },
          data: session,
          checkoutUrl: session.checkoutUrl,
        });
      }

      // Otherwise, create session under first-party / authenticated app context
      const userId = (req as any).user?.id || null;
      let app = await prisma.oAuthApp.findFirst({
        where: { clientId: clientId || '180-workspace-platform' },
      }) || await prisma.oAuthApp.findFirst({
        where: { isActive: true },
      });

      if (!app) {
        const sysUser = await prisma.user.findFirst();
        if (sysUser) {
          app = await prisma.oAuthApp.create({
            data: {
              clientId: '180-workspace-platform',
              clientSecretHash: 'first_party_app_hash',
              clientSecretHint: 'hash',
              name: '180 Workspace',
              description: '180 Workspace Platform App',
              redirectUris: ['http://localhost:3008/oauth/callback', 'http://localhost:3009/oauth/callback'],
              allowedOrigins: ['http://localhost:3008', 'http://localhost:3009'],
              allowedScopes: ['openid', 'identity:read'],
              isVerified: true,
              isActive: true,
              userId: sysUser.id,
            },
          });
        }
      }

      if (!app) {
        throw new Error('No active OAuth application found to associate with checkout session');
      }

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const checkoutSession = await prisma.checkoutSession.create({
        data: {
          appId: app.id,
          amount: Math.round(Number(amount) * 100) / 100,
          currency: (currency || 'INR').toUpperCase(),
          status: 'PENDING',
          title: title || '180 Pay Sovereign Checkout',
          description: description || '',
          returnUrl: returnUrl || '',
          cancelUrl: cancelUrl || '',
          metadata: metadata || {},
          expiresAt,
          userId,
        },
        include: {
          app: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              isVerified: true,
            },
          },
        },
      });

      const sessionData = {
        success: true,
        sessionId: checkoutSession.id,
        amount: checkoutSession.amount,
        currency: checkoutSession.currency,
        expiresAt: checkoutSession.expiresAt,
        checkoutUrl: `${process.env.PROFILE_FRONTEND_URL || 'http://localhost:3009'}/checkout/${checkoutSession.id}`,
      };

      return res.status(200).json({
        success: true,
        sessionId: checkoutSession.id,
        session: checkoutSession,
        data: sessionData,
        checkoutUrl: sessionData.checkoutUrl,
      });
    } catch (err: any) {
      console.error('[CheckoutApiController:createCheckoutSession] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/checkout/sessions/:id
   * Public endpoint for the popup checkout UI
   */
  static async getCheckoutSession(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const session = await CheckoutService.getSession(id);
      return res.json({ success: true, session, data: session });
    } catch (err: any) {
      console.error('[CheckoutApiController:getCheckoutSession] Error:', err);
      return res.status(404).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/checkout/sessions/:id/pay
   * Authenticated user authorizes and completes 1-click payment
   */
  static async payCheckoutSession(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const id = String(req.params.id);
      const result = await CheckoutService.processPayment(id, userId);

      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('[CheckoutApiController:payCheckoutSession] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/checkout/sessions/:id/direct-order
   * Generate gateway order for direct guest/card/UPI checkout without requiring wallet login
   */
  static async createDirectOrder(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const order = await CheckoutService.createDirectOrder(id);
      return res.json({ success: true, ...order, data: order });
    } catch (err: any) {
      console.error('[CheckoutApiController:createDirectOrder] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/checkout/sessions/:id/direct-verify
   * Cryptographically verify gateway signature and capture payment
   */
  static async verifyDirectPayment(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { orderId, paymentId, signature } = req.body;
      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing payment verification credentials (orderId, paymentId, signature)',
        });
      }

      const result = await CheckoutService.verifyDirectPayment({
        sessionId: id,
        orderId,
        paymentId,
        signature,
      });

      return res.json({ success: true, ...result, data: result });
    } catch (err: any) {
      console.error('[CheckoutApiController:verifyDirectPayment] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

