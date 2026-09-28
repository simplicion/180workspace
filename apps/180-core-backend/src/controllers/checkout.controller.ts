'use strict';

import { Request, Response } from 'express';
import { CheckoutService } from '@workspace/identity-provider';

export class CheckoutApiController {
  /**
   * POST /api/v1/checkout/sessions
   * 3rd-Party Developer API to initiate checkout
   */
  static async createCheckoutSession(req: Request, res: Response) {
    try {
      const {
        clientId,
        clientSecret,
        amount,
        currency,
        title,
        description,
        returnUrl,
        cancelUrl,
        metadata,
      } = req.body;

      if (!clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          error: 'clientId and clientSecret are required',
        });
      }

      const session = await CheckoutService.createSession({
        clientId,
        clientSecret,
        amount: Number(amount),
        currency,
        title,
        description,
        returnUrl,
        cancelUrl,
        metadata,
      });

      return res.status(201).json({ success: true, data: session });
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
      return res.json({ success: true, data: session });
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
}
