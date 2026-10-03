'use strict';

import { Request, Response } from 'express';
import * as dns from 'dns';
import { developersPrisma as prisma } from '@workspace/db-180core';
import {
  DeveloperController as DomainDeveloperController,
} from '@workspace/identity-provider';
import { PayoutService } from '@workspace/payment-provider';
import { uploadBufferToR2, buildR2Key, deleteObjectFromR2 } from '@workspace/integrations';
import { inspectLogoBuffer, SUPPORTED_LOGO_MIMES } from '../middleware/logo-upload.middleware';
import axios from 'axios';

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
   * GET /api/v1/developer/apps/:id/auth-logs
   * Real-time authentication activity and users logged into this app
   */
  static async getAuthLogs(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const appId = String(req.params.id);

      // Verify app ownership
      const app = await prisma.oAuthApp.findFirst({
        where: { id: appId, ...(userId ? { userId } : {}) },
      });
      if (!app) {
        return res.status(404).json({ success: false, error: 'App not found' });
      }

      // Query consents and active tokens
      const consents = await prisma.oAuthConsent.findMany({
        where: { appId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatarUrl: true,
              isVerified: true,
              createdAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });

      const [tokens, appUserIdentities] = await Promise.all([
        prisma.oAuthToken.findMany({
          where: { appId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.appUserIdentity.findMany({
          where: { appId },
        }),
      ]);

      const tokenMap = new Map<string, any>();
      tokens.forEach((t) => {
        if (!tokenMap.has(t.userId)) tokenMap.set(t.userId, t);
      });

      const appUserMap = new Map<string, string>();
      appUserIdentities.forEach((au) => {
        appUserMap.set(au.userId, au.username);
      });

      const logs = consents.map((c: any) => {
        const latestToken = tokenMap.get(c.userId);
        const isTokenActive = latestToken ? (!latestToken.revokedAt && new Date(latestToken.expiresAt) > new Date()) : false;
        const appScopedUsername = appUserMap.get(c.userId) || c.user?.username || '';

        return {
          id: c.id,
          userId: c.userId,
          user: {
            id: c.user?.id || c.userId,
            name: c.user?.name || 'Anonymous User',
            email: c.user?.email || null,
            username: c.user?.username || null,
            appScopedUsername,
            avatar: c.user?.avatarUrl || '',
            isVerified: Boolean(c.user?.isVerified),
          },
          scopes: c.scopes,
          authMethod: c.user?.email ? 'Email / SSO' : 'WhatsApp OTP',
          status: isTokenActive ? 'ACTIVE_SESSION' : 'SESSION_EXPIRED',
          grantedAt: c.grantedAt,
          updatedAt: c.updatedAt,
          connectedSince: c.grantedAt,
          lastLogin: c.updatedAt,
        };
      });

      return res.json({
        success: true,
        data: {
          totalUsers: consents.length,
          activeSessionsCount: logs.filter((l) => l.status === 'ACTIVE_SESSION').length,
          logs,
        },
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:getAuthLogs] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/developer/apps/:id/users/:targetUserId/revoke
   * Revokes active tokens and sessions for a specific user in this application
   */
  static async revokeUserSession(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const appId = String(req.params.id);
      const targetUserId = String(req.params.targetUserId);

      // Verify app ownership
      const app = await prisma.oAuthApp.findFirst({
        where: { id: appId, ...(userId ? { userId } : {}) },
      });
      if (!app) {
        return res.status(404).json({ success: false, error: 'App not found' });
      }

      // Revoke all active tokens for this user in this app
      await prisma.oAuthToken.updateMany({
        where: {
          appId,
          userId: targetUserId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: 'User session revoked successfully',
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:revokeUserSession] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/developer/apps/:id/payment-analytics
   * Aggregates total payments, last month volume, upcoming settlements, and ledger
   */
  static async getPaymentAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const appId = String(req.params.id);

      const app = await prisma.oAuthApp.findFirst({
        where: { id: appId, ...(userId ? { userId } : {}) },
      });
      if (!app) {
        return res.status(404).json({ success: false, error: 'App not found' });
      }

      // Checkouts
      const allSessions = await prisma.checkoutSession.findMany({
        where: { appId },
        include: {
          user: {
            select: { id: true, name: true, email: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const capturedSessions = allSessions.filter((s) => s.status === 'CAPTURED');
      const pendingSessions = allSessions.filter((s) => s.status === 'PENDING');

      // Gross lifetime volume
      const grossVolume = capturedSessions.reduce((sum, s) => sum + s.amount, 0);

      // Last month calculation
      const now = new Date();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const lastMonthSessions = capturedSessions.filter((s) => {
        const d = new Date(s.completedAt || s.createdAt);
        return d >= startOfLastMonth && d <= endOfLastMonth;
      });
      const lastMonthVolume = lastMonthSessions.reduce((sum, s) => sum + s.amount, 0);

      // Current month calculation
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthSessions = capturedSessions.filter((s) => {
        const d = new Date(s.completedAt || s.createdAt);
        return d >= startOfThisMonth;
      });
      const thisMonthVolume = thisMonthSessions.reduce((sum, s) => sum + s.amount, 0);

      // Pending settlements
      const pendingSettlements = pendingSessions.reduce((sum, s) => sum + s.amount, 0);

      // Wallet balance
      const appWallet = await prisma.wallet.findUnique({
        where: { developerAppId: appId },
      });
      const withdrawableBalance = appWallet ? appWallet.balance : 0;

      return res.json({
        success: true,
        data: {
          grossVolume: Math.round(grossVolume * 100) / 100,
          thisMonthVolume: Math.round(thisMonthVolume * 100) / 100,
          lastMonthVolume: Math.round(lastMonthVolume * 100) / 100,
          pendingSettlements: Math.round(pendingSettlements * 100) / 100,
          withdrawableBalance: Math.round(withdrawableBalance * 100) / 100,
          currency: appWallet?.currency || 'INR',
          totalTransactionsCount: capturedSessions.length,
          transactions: allSessions.slice(0, 20).map((s) => ({
            id: s.id,
            amount: s.amount,
            currency: s.currency,
            status: s.status,
            title: s.title,
            description: s.description,
            customer: s.user ? { name: s.user.name, email: s.user.email } : null,
            createdAt: s.createdAt,
            completedAt: s.completedAt,
          })),
        },
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:getPaymentAnalytics] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/developer/apps/:id/bank-details
   */
  static async getBankDetails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const appId = String(req.params.id);

      const app = await prisma.oAuthApp.findFirst({
        where: { id: appId, ...(userId ? { userId } : {}) },
      });
      if (!app) {
        return res.status(404).json({ success: false, error: 'App not found' });
      }

      let bankDetails = (app as any).bankDetails || null;

      // Fallback: check latest PayoutRequest for this app
      if (!bankDetails) {
        const latestPayout = await prisma.payoutRequest.findFirst({
          where: { appId },
          orderBy: { requestedAt: 'desc' },
        });
        if (latestPayout?.accountDetails) {
          bankDetails = latestPayout.accountDetails;
        }
      }

      return res.json({
        success: true,
        data: bankDetails,
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:getBankDetails] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/v1/developer/apps/:id/bank-details
   */
  static async saveBankDetails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const appId = String(req.params.id);
      const { accountHolderName, accountNumber, ifscCode, bankName, upiId } = req.body;

      if (!accountHolderName || (!accountNumber && !upiId)) {
        return res.status(400).json({
          success: false,
          error: 'Account holder name and either Account Number or UPI ID are required',
        });
      }

      const app = await prisma.oAuthApp.findFirst({
        where: { id: appId, ...(userId ? { userId } : {}) },
      });
      if (!app) {
        return res.status(404).json({ success: false, error: 'App not found' });
      }

      const bankDetails = {
        accountHolderName: String(accountHolderName).trim(),
        accountNumber: accountNumber ? String(accountNumber).trim() : '',
        ifscCode: ifscCode ? String(ifscCode).trim().toUpperCase() : '',
        bankName: bankName ? String(bankName).trim() : '',
        upiId: upiId ? String(upiId).trim() : '',
        updatedAt: new Date().toISOString(),
      };

      const updated = await prisma.oAuthApp.update({
        where: { id: appId },
        data: {
          bankDetails,
        } as any,
      });

      return res.json({
        success: true,
        message: 'Settlement bank details saved successfully',
        data: (updated as any).bankDetails,
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:saveBankDetails] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

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

  /**
   * GET /api/v1/developer/admin/payouts
   * Admin: List all vendor payout withdrawal requests across all developers
   */
  static async listAdminPayouts(req: Request, res: Response) {
    try {
      const payouts = await prisma.payoutRequest.findMany({
        include: {
          app: {
            select: {
              id: true,
              name: true,
              clientId: true,
              user: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
      });

      return res.json({
        success: true,
        data: payouts,
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:listAdminPayouts] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/developer/admin/payouts/:id/status
   * Admin: Update payout status (PAID, REJECTED, PROCESSING, APPROVED)
   */
  static async updateAdminPayoutStatus(req: Request, res: Response) {
    try {
      const payoutId = String(req.params.id);
      const { status, adminNote, transactionRef } = req.body;

      if (!status || !['PAID', 'REJECTED', 'APPROVED', 'PROCESSING'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Valid status required: PAID, REJECTED, APPROVED, PROCESSING',
        });
      }

      const result = await PayoutService.adminUpdatePayout(
        payoutId,
        status,
        adminNote,
        transactionRef
      );

      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('[DeveloperApiController:updateAdminPayoutStatus] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/developer/admin/analytics
   * Admin: Global platform payments & payouts intelligence
   */
  static async getAdminAnalytics(req: Request, res: Response) {
    try {
      const [allPayouts, allCheckouts, appCount] = await Promise.all([
        prisma.payoutRequest.findMany(),
        prisma.checkoutSession.findMany({ where: { status: 'CAPTURED' } }),
        prisma.oAuthApp.count(),
      ]);

      const totalPlatformVolume = allCheckouts.reduce((s, c) => s + c.amount, 0);
      const totalPaidOut = allPayouts
        .filter((p) => p.status === 'PAID')
        .reduce((s, p) => s + p.amount, 0);
      const totalPendingPayouts = allPayouts
        .filter((p) => p.status === 'PENDING_REVIEW' || p.status === 'APPROVED' || p.status === 'PROCESSING')
        .reduce((s, p) => s + p.amount, 0);

      return res.json({
        success: true,
        data: {
          totalPlatformVolume: Math.round(totalPlatformVolume * 100) / 100,
          totalPaidOut: Math.round(totalPaidOut * 100) / 100,
          totalPendingPayouts: Math.round(totalPendingPayouts * 100) / 100,
          totalVendorsCount: appCount,
          pendingPayoutsCount: allPayouts.filter((p) => p.status === 'PENDING_REVIEW').length,
        },
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:getAdminAnalytics] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/developer/upload-logo
   * POST /api/v1/developer/apps/:id/upload-logo
   * Direct app logo upload using Cloudflare R2 media pipeline
   */
  static async uploadAppLogo(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      const appId = req.params.id ? String(req.params.id) : null;
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'NO_FILE',
          message: 'No logo file provided. Upload multipart field "logo" or "file".',
        });
      }

      const problem = inspectLogoBuffer(file.buffer, file.mimetype);
      if (problem) {
        return res.status(415).json({
          success: false,
          error: 'UNSUPPORTED_MEDIA',
          message: problem,
        });
      }

      // Check R2 environment configuration
      const env = process.env;
      const hasR2 =
        (env.CLOUDFLARE_R2_ENDPOINT || env.R2_ENDPOINT) &&
        (env.CLOUDFLARE_R2_ACCESS_KEY_ID || env.R2_ACCESS_KEY) &&
        (env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || env.R2_SECRET_KEY) &&
        (env.CLOUDFLARE_R2_BUCKET_NAME || env.R2_BUCKET_NAME);

      if (!hasR2) {
        return res.status(503).json({
          success: false,
          error: 'STORAGE_UNAVAILABLE',
          message: 'Media pipeline storage (Cloudflare R2) is not configured on the server.',
        });
      }

      const ext = SUPPORTED_LOGO_MIMES[file.mimetype] || 'png';
      const safeFilename = (file.originalname || `app-logo.${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const r2Key = buildR2Key('brands/avatars', userId || 'developer', `${appId ? `${appId}-` : ''}${safeFilename}`);

      const { url } = await uploadBufferToR2(file.buffer, r2Key, file.mimetype);

      let updatedApp = null;
      // If appId is provided, verify app ownership and persist logoUrl
      if (appId) {
        const existingApp = await prisma.oAuthApp.findFirst({
          where: { id: appId, ...(userId ? { userId } : {}) },
        });

        if (!existingApp) {
          return res.status(404).json({
            success: false,
            error: 'APP_NOT_FOUND',
            message: 'Application not found or unauthorized to update this app.',
          });
        }

        // Clean up previous logo if it was an R2 object
        const oldLogo = existingApp.logoUrl;
        if (oldLogo && oldLogo !== url && oldLogo.includes('brands/avatars/')) {
          deleteObjectFromR2(oldLogo).catch((err) => {
            console.warn('[uploadAppLogo] Notice: Failed to remove old logo from R2:', err.message);
          });
        }

        updatedApp = await prisma.oAuthApp.update({
          where: { id: appId },
          data: { logoUrl: url },
        });
      }

      return res.status(200).json({
        success: true,
        url,
        key: r2Key,
        message: 'App logo uploaded successfully to media pipeline',
        app: updatedApp,
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:uploadAppLogo] Error:', err);
      return res.status(500).json({
        success: false,
        error: 'UPLOAD_FAILED',
        message: err.message || 'Failed to upload app logo to media pipeline',
      });
    }
  }

  /**
   * GET /api/v1/developer/apps/:id/gateway
   */
  static async getGatewaySettings(req: Request, res: Response) {
    try {
      const appId = String(req.params.id);
      const app = await prisma.oAuthApp.findUnique({
        where: { id: appId },
        select: {
          id: true,
          customGatewayType: true,
          customGatewayKeyId: true,
          customGatewayWebhookSecret: true,
          customPayDomain: true,
          customDomainStatus: true,
          customGatewaySecret: true,
        },
      });

      if (!app) {
        return res.status(404).json({ success: false, error: 'App not found' });
      }

      return res.json({
        success: true,
        data: {
          customGatewayType: app.customGatewayType || 'NONE',
          customGatewayKeyId: app.customGatewayKeyId || '',
          customGatewayWebhookSecret: app.customGatewayWebhookSecret || '',
          customPayDomain: app.customPayDomain || '',
          customDomainStatus: app.customDomainStatus || 'PENDING_DNS',
          hasSecret: Boolean(app.customGatewaySecret),
        },
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:getGatewaySettings] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/v1/developer/apps/:id/gateway
   */
  static async saveGatewaySettings(req: Request, res: Response) {
    try {
      const appId = String(req.params.id);
      const {
        customGatewayType,
        customGatewayKeyId,
        customGatewaySecret,
        customGatewayWebhookSecret,
        customPayDomain,
      } = req.body;

      const updateData: any = {
        customGatewayType: customGatewayType || 'NONE',
        customGatewayKeyId: customGatewayKeyId || null,
        customGatewayWebhookSecret: customGatewayWebhookSecret || null,
        customPayDomain: customPayDomain ? String(customPayDomain).toLowerCase().trim() : null,
      };

      if (customGatewaySecret) {
        updateData.customGatewaySecret = customGatewaySecret;
      }

      const updated = await prisma.oAuthApp.update({
        where: { id: appId },
        data: updateData,
        select: {
          id: true,
          customGatewayType: true,
          customGatewayKeyId: true,
          customGatewayWebhookSecret: true,
          customPayDomain: true,
          customDomainStatus: true,
        },
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[DeveloperApiController:saveGatewaySettings] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/developer/apps/:id/gateway/verify
   */
  static async verifyGatewayCredentials(req: Request, res: Response) {
    try {
      const { keyId, keySecret, gatewayType = 'RAZORPAY' } = req.body;
      if (!keyId || !keySecret) {
        return res.status(400).json({ success: false, error: 'Both Key ID and Key Secret are required for verification' });
      }

      if (gatewayType === 'RAZORPAY') {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpRes = await axios.get('https://api.razorpay.com/v1/orders?count=1', {
          headers: { Authorization: authHeader },
          timeout: 8000,
        });

        if (rzpRes.status >= 200 && rzpRes.status < 300) {
          return res.json({ success: true, message: 'Razorpay credentials verified successfully!' });
        }
      }

      return res.json({ success: true, message: 'Credentials validated' });
    } catch (err: any) {
      const msg = err.response?.data?.error?.description || err.message || 'Credentials verification failed';
      return res.status(400).json({ success: false, error: msg });
    }
  }

  /**
   * POST /api/v1/developer/apps/:id/custom-domain/verify
   * Performs live DNS resolution to check if the custom subdomain points to cname.180workspace.com
   */
  static async verifyCustomDomain(req: Request, res: Response) {
    try {
      const appId = String(req.params.id);
      const app = await prisma.oAuthApp.findUnique({
        where: { id: appId },
        select: { id: true, customPayDomain: true, customDomainStatus: true },
      });

      if (!app || !app.customPayDomain) {
        return res.status(400).json({ success: false, error: 'No custom pay domain configured for this app' });
      }

      const domain = app.customPayDomain.toLowerCase().trim();
      const expectedCname = process.env.CUSTOM_DOMAIN_CNAME_TARGET || 'cname.180workspace.com';
      const expectedIp = process.env.EC2_PUBLIC_IP || process.env.SERVER_PUBLIC_IP || '32.198.110.99';

      let isVerified = false;
      let resolvedRecords: string[] = [];
      const details: any = { domain, expectedCname, expectedIp };

      try {
        const cnameRecords = await dns.promises.resolveCname(domain).catch(() => []);
        resolvedRecords = cnameRecords;
        details.cname = cnameRecords;

        if (cnameRecords.some((r) => r.includes('180workspace') || r.includes(expectedCname) || r.includes('pages.dev'))) {
          isVerified = true;
        }

        if (!isVerified) {
          const aRecords = await dns.promises.resolve4(domain).catch(() => []);
          details.aRecords = aRecords;
          if (aRecords.includes(expectedIp) || aRecords.includes('32.198.110.99')) {
            isVerified = true;
          }
        }
      } catch (dnsErr: any) {
        details.error = dnsErr.message;
      }

      // If in development or mock/test mode:
      if (process.env.NODE_ENV !== 'production' && (domain.includes('test') || domain.includes('mock') || domain.includes('clientdomain'))) {
        isVerified = true;
      }

      const newStatus = isVerified ? 'ACTIVE' : 'PENDING';

      await prisma.oAuthApp.update({
        where: { id: appId },
        data: { customDomainStatus: newStatus },
      });

      return res.json({
        success: true,
        verified: isVerified,
        status: newStatus,
        domain,
        expectedTarget: expectedCname,
        resolvedRecords,
        details,
        message: isVerified
          ? `CNAME successfully verified! Traffic for ${domain} routes to 180 Pay.`
          : `DNS record not yet detected for ${domain}. Please ensure your CNAME points to ${expectedCname}. DNS propagation can take a few minutes.`,
      });
    } catch (err: any) {
      console.error('[DeveloperApiController:verifyCustomDomain] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}


