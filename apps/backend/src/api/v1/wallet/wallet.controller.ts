import { Request, Response } from 'express';
import { 
  WalletService, 
  WalletGatewayService, 
  WalletLedgerService, 
  WalletIsolationGuard,
  WalletConstants 
} from '@workspace/wallet';

export class WalletController {
  /**
   * Helper to strictly extract companyId from authenticated request context
   */
  private static getCompanyId(req: Request): string {
    const rawId = (req as any).companyId || (req as any).user?.companyId;
    return WalletIsolationGuard.assertCompany(rawId, 'WalletController');
  }

  /**
   * GET /api/v1/wallet
   * Retrieves tenant wallet balance, threshold, lock state, and financial burn summary.
   */
  static async getWallet(req: Request, res: Response) {
    try {
      const companyId = WalletController.getCompanyId(req);
      const [wallet, summary] = await Promise.all([
        WalletService.getBalance(companyId),
        WalletLedgerService.getSummary(companyId)
      ]);

      return res.json({
        success: true,
        data: {
          ...wallet,
          summary,
          constants: {
            minThresholdInr: WalletConstants.MIN_WALLET_THRESHOLD_INR,
            recommendedInr: WalletConstants.RECOMMENDED_WALLET_INR,
            ratePerMinuteInr: WalletConstants.RATE_PER_MINUTE_INR,
            numberRentalInr: WalletConstants.NUMBER_MONTHLY_RENTAL_INR,
            graceDays: WalletConstants.AUTO_RELEASE_GRACE_DAYS
          }
        }
      });
    } catch (err: any) {
      console.error('[WalletController:getWallet] Error:', err);
      const statusCode = err.name === 'WalletTenantIsolationViolationError' ? 403 : 500;
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Failed to fetch wallet information'
      });
    }
  }

  /**
   * GET /api/v1/wallet/transactions
   * Retrieves paginated transaction ledger strictly for the authenticated tenant.
   */
  static async getTransactions(req: Request, res: Response) {
    try {
      const companyId = WalletController.getCompanyId(req);
      const { page, limit, type, search, startDate, endDate } = req.query;

      const ledger = await WalletLedgerService.getLedger(companyId, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        type: type as string,
        search: search as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      return res.json({
        success: true,
        data: ledger
      });
    } catch (err: any) {
      console.error('[WalletController:getTransactions] Error:', err);
      const statusCode = err.name === 'WalletTenantIsolationViolationError' ? 403 : 500;
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Failed to retrieve transactions'
      });
    }
  }

  /**
   * GET /api/v1/wallet/transactions/export
   * Exports tenant transactions to CSV for accounting/tax compliance.
   */
  static async exportTransactions(req: Request, res: Response) {
    try {
      const companyId = WalletController.getCompanyId(req);
      const csvData = await WalletLedgerService.exportLedgerCsv(companyId);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="wallet-ledger-${companyId}-${Date.now()}.csv"`);
      return res.status(200).send(csvData);
    } catch (err: any) {
      console.error('[WalletController:exportTransactions] Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to export transaction ledger'
      });
    }
  }

  /**
   * POST /api/v1/wallet/coupon/validate
   * Validates promotional coupon codes and returns discount & net payable breakdown.
   */
  static async validateCoupon(req: Request, res: Response) {
    try {
      const companyId = WalletController.getCompanyId(req);
      const { couponCode, amountInr } = req.body;

      if (!couponCode || typeof couponCode !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'couponCode is required'
        });
      }

      const amount = amountInr ? Number(amountInr) : 500;
      const result = await WalletGatewayService.validateCoupon(companyId, couponCode, amount);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Invalid coupon code'
        });
      }

      return res.json({
        success: true,
        data: result
      });
    } catch (err: any) {
      console.error('[WalletController:validateCoupon] Error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to validate coupon code'
      });
    }
  }

  /**
   * POST /api/v1/wallet/order
   * Initiates Razorpay prepaid top-up order (or credits directly if 100% free coupon) cryptographically bound to authenticated companyId.
   */
  static async createOrder(req: Request, res: Response) {
    try {
      const companyId = WalletController.getCompanyId(req);
      const { amountInr, couponCode } = req.body;

      if (!amountInr || Number(amountInr) <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Recharge amount must be a positive number greater than 0'
        });
      }

      const order = await WalletGatewayService.createOrder(
        companyId,
        Number(amountInr),
        couponCode ? String(couponCode) : undefined
      );

      return res.json({
        success: true,
        data: order
      });
    } catch (err: any) {
      console.error('[WalletController:createOrder] Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate payment order'
      });
    }
  }

  /**
   * POST /api/v1/wallet/verify
   * Cryptographically verifies Razorpay payment signature (HMAC SHA-256) and credits tenant wallet.
   */
  static async verifyPayment(req: Request, res: Response) {
    try {
      const companyId = WalletController.getCompanyId(req);
      const { orderId, paymentId, signature, amountInr, couponCode, creditedAmount } = req.body;

      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({
          success: false,
          error: 'orderId, paymentId, and signature are required for cryptographic verification'
        });
      }

      const result = await WalletGatewayService.verifyAndCreditPayment(
        companyId,
        orderId,
        paymentId,
        signature,
        amountInr ? Number(amountInr) : undefined,
        couponCode ? String(couponCode) : undefined,
        creditedAmount ? Number(creditedAmount) : undefined
      );

      return res.json({
        success: true,
        data: result
      });
    } catch (err: any) {
      console.error('[WalletController:verifyPayment] Error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Cryptographic payment verification failed'
      });
    }
  }

  /**
   * PUT /api/v1/wallet/settings
   * Configures tenant auto-recharge settings and low-balance warning threshold.
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const companyId = WalletController.getCompanyId(req);
      const { autoRecharge, thresholdInr, rechargeAmountInr } = req.body;

      const updated = await WalletService.updateSettings(companyId, {
        autoRecharge: typeof autoRecharge === 'boolean' ? autoRecharge : undefined,
        thresholdInr: thresholdInr !== undefined ? Number(thresholdInr) : undefined,
        rechargeAmountInr: rechargeAmountInr !== undefined ? Number(rechargeAmountInr) : undefined
      });

      return res.json({
        success: true,
        data: updated
      });
    } catch (err: any) {
      console.error('[WalletController:updateSettings] Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to update wallet settings'
      });
    }
  }

  /**
   * POST /api/v1/wallet/webhooks/razorpay
   * Public webhook endpoint for Razorpay asynchronous payment capture.
   * Cryptographically verifies signature and extracts companyId from notes.
   */
  static async handleRazorpayWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      if (!signature) {
        return res.status(400).json({ success: false, error: 'Missing x-razorpay-signature header' });
      }

      let rawBody = (req as any).rawBody;
      if (rawBody instanceof Buffer) {
        rawBody = rawBody.toString('utf8');
      } else if (typeof rawBody !== 'string') {
        rawBody = JSON.stringify(req.body);
      }

      const outcome = await WalletGatewayService.handleWebhook(rawBody, signature);

      return res.json({
        success: true,
        ...outcome
      });
    } catch (err: any) {
      console.error('[WalletController:handleRazorpayWebhook] Error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Webhook processing failed'
      });
    }
  }

  /**
   * GET /api/v1/wallet/transactions/:id/receipt
   * Retrieves Indian B2B GST tax invoice breakdown (HSN 9984 - 18% GST).
   * Strictly isolated to authenticated tenant.
   */
  static async getReceipt(req: Request, res: Response) {
    try {
      const companyId = WalletController.getCompanyId(req);
      const transactionId = req.params.id;

      if (!transactionId) {
        return res.status(400).json({ success: false, error: 'Transaction ID is required' });
      }

      const receipt = await WalletLedgerService.generateTaxReceipt(companyId, transactionId);
      return res.json({
        success: true,
        data: receipt
      });
    } catch (err: any) {
      console.error('[WalletController:getReceipt] Error:', err);
      const statusCode = err.message?.includes('unauthorized') || err.name === 'WalletTenantIsolationViolationError' ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Failed to generate tax receipt'
      });
    }
  }

  /**
   * GET /api/v1/wallet/platform/summary
   * Platform-wide superadmin liquidity monitor and health metrics.
   * Secured with superAdminAuth.
   */
  static async getPlatformSummary(req: Request, res: Response) {
    try {
      const summary = await WalletLedgerService.getPlatformSummary();
      return res.json({
        success: true,
        data: summary
      });
    } catch (err: any) {
      console.error('[WalletController:getPlatformSummary] Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate platform summary'
      });
    }
  }
}

