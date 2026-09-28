'use strict';

import { Request, Response } from 'express';
import {
  DeveloperController as DomainDeveloperController,
  PayoutService,
} from '@workspace/identity-provider';

export class DeveloperApiController {
  static listApps = DomainDeveloperController.listApps;
  static getApp = DomainDeveloperController.getApp;
  static createApp = DomainDeveloperController.createApp;
  static updateApp = DomainDeveloperController.updateApp;
  static rotateSecret = DomainDeveloperController.rotateSecret;
  static rotateWebhookSecret = DomainDeveloperController.rotateWebhookSecret;
  static testWebhook = DomainDeveloperController.testWebhook;
  static deleteApp = DomainDeveloperController.deleteApp;

  /**
   * POST /api/v1/developer/apps/:appId/payouts
   */
  static async requestPayout(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const appId = String(req.params.appId);
      const { amount, payoutMethod, accountDetails } = req.body;

      const result = await PayoutService.requestPayout({
        userId,
        appId,
        amount: Number(amount),
        payoutMethod,
        accountDetails,
      });

      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      console.error('[DeveloperApiController:requestPayout] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/developer/apps/:appId/payouts
   */
  static async listPayouts(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const appId = String(req.params.appId);
      const result = await PayoutService.listPayouts(appId, userId);

      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('[DeveloperApiController:listPayouts] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
