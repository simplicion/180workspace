'use strict';

import { Request, Response } from 'express';
import { CheckoutService, CouponService, WebhookDispatcherService } from '@workspace/payment-provider';
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
        couponCode,
        displayMode,
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

        // If couponCode was passed, attempt application
        if (couponCode) {
          try {
            const rawOrigin = req.headers.origin || req.headers.referer || '';
            const app = await prisma.oAuthApp.findUnique({ where: { clientId } });
            if (app) {
              const validation = await CouponService.validateCoupon({
                appId: app.id,
                code: String(couponCode),
                orderAmount: Number(amount),
                origin: typeof rawOrigin === 'string' ? rawOrigin : '',
              });
              if (validation.valid) {
                await prisma.checkoutSession.update({
                  where: { id: session.sessionId },
                  data: {
                    originalAmount: Number(amount),
                    amount: validation.finalAmount,
                    couponId: validation.couponId || null,
                    couponCode: validation.code,
                    discountAmount: validation.discountAmount,
                    displayMode: displayMode || 'bottom_sheet',
                  },
                });
                session.amount = validation.finalAmount;
              }
            }
          } catch (couponErr: any) {
            console.warn('[createCheckoutSession] Coupon validation warning:', couponErr.message);
          }
        }

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

      // Otherwise, create session under first-party / authenticated app context or custom domain host
      const userId = (req as any).user?.id || null;
      const reqHost = (req.headers.host || '').toLowerCase().split(':')[0];
      
      let app = null;
      if (reqHost && !reqHost.includes('180workspace.com') && !reqHost.includes('localhost') && !reqHost.includes('127.0.0.1')) {
        app = await prisma.oAuthApp.findFirst({
          where: { customPayDomain: reqHost, isActive: true },
        });
      }

      const requestedAppId = req.body.appId || req.body.clientId;
      if (!app && requestedAppId) {
        app = await prisma.oAuthApp.findFirst({
          where: {
            OR: [
              { id: String(requestedAppId) },
              { clientId: String(requestedAppId) },
            ],
            isActive: true,
          },
        });
      }

      if (!app) {
        app = await prisma.oAuthApp.findFirst({
          where: { clientId: clientId || '180-workspace-platform' },
        }) || await prisma.oAuthApp.findFirst({
          where: { isActive: true },
        });
      }

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

      let finalAmount = Math.round(Number(amount) * 100) / 100;
      let appliedCouponId: string | null = null;
      let appliedCouponCode: string | null = null;
      let discountAmount = 0;

      if (couponCode) {
        const rawOrigin = req.headers.origin || req.headers.referer || '';
        const validation = await CouponService.validateCoupon({
          appId: app.id,
          code: String(couponCode),
          orderAmount: Number(amount),
          origin: typeof rawOrigin === 'string' ? rawOrigin : '',
        });
        if (validation.valid) {
          finalAmount = validation.finalAmount;
          appliedCouponId = validation.couponId || null;
          appliedCouponCode = validation.code;
          discountAmount = validation.discountAmount;
        }
      }

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const checkoutSession = await prisma.checkoutSession.create({
        data: {
          appId: app.id,
          amount: finalAmount,
          originalAmount: Math.round(Number(amount) * 100) / 100,
          discountAmount,
          couponId: appliedCouponId,
          couponCode: appliedCouponCode,
          displayMode: displayMode || 'bottom_sheet',
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
        originalAmount: checkoutSession.originalAmount,
        discountAmount: checkoutSession.discountAmount,
        couponCode: checkoutSession.couponCode,
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
   * POST /api/v1/checkout/sessions/:id/apply-coupon
   * Public endpoint called by 180 Pay modal to apply a coupon code
   */
  static async applyCoupon(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { code, customerEmail } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: 'Coupon code is required' });
      }

      const session = await prisma.checkoutSession.findUnique({
        where: { id },
      });

      if (!session) {
        return res.status(404).json({ success: false, error: 'Checkout session not found' });
      }

      if (session.status !== 'PENDING') {
        return res.status(400).json({ success: false, error: 'Checkout session is not active' });
      }

      if (session.expiresAt < new Date()) {
        return res.status(400).json({ success: false, error: 'Checkout session has expired' });
      }

      const rawOrigin = req.headers.origin || req.headers.referer || '';
      const origin = typeof rawOrigin === 'string' ? rawOrigin : '';
      const baseAmount = session.originalAmount && session.originalAmount > 0 ? session.originalAmount : session.amount;

      const validation = await CouponService.validateCoupon({
        appId: session.appId,
        code: String(code),
        orderAmount: baseAmount,
        customerEmail: customerEmail ? String(customerEmail) : undefined,
        origin,
        planId: session.planId || undefined,
      });

      if (!validation.valid) {
        return res.status(200).json({
          success: false,
          error: validation.error,
          reasonCode: validation.reasonCode,
        });
      }

      const updated = await prisma.checkoutSession.update({
        where: { id: session.id },
        data: {
          originalAmount: baseAmount,
          amount: validation.finalAmount,
          couponId: validation.couponId || null,
          couponCode: validation.code,
          discountAmount: validation.discountAmount,
        },
      });

      return res.status(200).json({
        success: true,
        session: updated,
        discountAmount: validation.discountAmount,
        finalAmount: validation.finalAmount,
        code: validation.code,
      });
    } catch (err: any) {
      console.error('[CheckoutApiController:applyCoupon] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/checkout/sessions/:id/remove-coupon
   * Remove any applied coupon from session
   */
  static async removeCoupon(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const session = await prisma.checkoutSession.findUnique({
        where: { id },
      });

      if (!session) {
        return res.status(404).json({ success: false, error: 'Checkout session not found' });
      }

      if (session.status !== 'PENDING') {
        return res.status(400).json({ success: false, error: 'Checkout session is not active' });
      }

      const revertedAmount = session.originalAmount && session.originalAmount > 0 ? session.originalAmount : session.amount;

      const updated = await prisma.checkoutSession.update({
        where: { id: session.id },
        data: {
          amount: revertedAmount,
          couponId: null,
          couponCode: null,
          discountAmount: 0,
        },
      });

      return res.status(200).json({
        success: true,
        session: updated,
      });
    } catch (err: any) {
      console.error('[CheckoutApiController:removeCoupon] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
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

      // Redeem coupon if attached
      const session = await prisma.checkoutSession.findUnique({ where: { id } });
      if (session && session.couponId) {
        try {
          const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
          await CouponService.redeemCouponAtomic({
            couponId: session.couponId,
            sessionId: session.id,
            customerEmail: user?.email || userId,
            discountApplied: session.discountAmount || 0,
          });

          WebhookDispatcherService.dispatchEvent(session.appId, {
            event: 'coupon.redeemed',
            data: {
              couponId: session.couponId,
              code: session.couponCode,
              discountAmount: session.discountAmount,
              sessionId: session.id,
              customerEmail: user?.email || userId,
            },
          }).catch((err) => console.warn('[CheckoutApiController] Webhook dispatch error:', err.message));
        } catch (couponErr: any) {
          console.warn('[CheckoutApiController:payCheckoutSession] Coupon redemption warning:', couponErr.message);
        }
      }

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

      // Redeem coupon if attached
      const session = await prisma.checkoutSession.findUnique({ where: { id } });
      if (session && session.couponId) {
        try {
          const customerEmail = (session.metadata as any)?.customerEmail || (session.metadata as any)?.email || session.id;
          await CouponService.redeemCouponAtomic({
            couponId: session.couponId,
            sessionId: session.id,
            customerEmail: String(customerEmail),
            discountApplied: session.discountAmount || 0,
          });

          WebhookDispatcherService.dispatchEvent(session.appId, {
            event: 'coupon.redeemed',
            data: {
              couponId: session.couponId,
              code: session.couponCode,
              discountAmount: session.discountAmount,
              sessionId: session.id,
              customerEmail: String(customerEmail),
            },
          }).catch((err) => console.warn('[CheckoutApiController] Webhook dispatch error:', err.message));
        } catch (couponErr: any) {
          console.warn('[CheckoutApiController:verifyDirectPayment] Coupon redemption warning:', couponErr.message);
        }
      }

      return res.json({ success: true, ...result, data: result });
    } catch (err: any) {
      console.error('[CheckoutApiController:verifyDirectPayment] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

