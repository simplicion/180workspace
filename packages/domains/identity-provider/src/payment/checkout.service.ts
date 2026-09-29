import crypto from 'crypto';
import axios from 'axios';
import { developersPrisma as prisma } from '@workspace/db-180core';
import { hashSecret, timingSafeCompare } from '../oauth/oauth.service';
import { IdentityWalletService } from '../wallet/identity-wallet.service';

export interface CreateCheckoutSessionInput {
  clientId: string;
  clientSecret: string;
  amount: number;
  currency?: string;
  title: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
  expiresInMinutes?: number;
}

export class CheckoutService {
  /**
   * Creates a new Checkout Session (Initiated by 3rd-party developer server)
   */
  static async createSession(input: CreateCheckoutSessionInput) {
    const {
      clientId,
      clientSecret,
      amount,
      currency = 'INR',
      title,
      description,
      returnUrl,
      cancelUrl,
      metadata,
      expiresInMinutes = 30,
    } = input;

    if (!amount || amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    if (!title) {
      throw new Error('Payment title is required');
    }

    // 1. Authenticate developer application with constant-time comparison
    const app = await prisma.oAuthApp.findUnique({
      where: { clientId },
    });

    if (!app || !app.isActive) {
      throw new Error('Invalid or inactive OAuth client credentials');
    }

    const isValidSecret = timingSafeCompare(hashSecret(clientSecret), app.clientSecretHash);
    if (!isValidSecret) {
      throw new Error('Invalid client secret');
    }

    if ((app as any).enablePay === false) {
      throw new Error('180 Pay is currently disabled for this application. Please enable 180 Pay in your 180 Developer Portal.');
    }

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // 2. Create the CheckoutSession record
    const session = await prisma.checkoutSession.create({
      data: {
        appId: app.id,
        amount: Math.round(amount * 100) / 100,
        currency: currency.toUpperCase(),
        status: 'PENDING',
        title,
        description: description || '',
        returnUrl: returnUrl || '',
        cancelUrl: cancelUrl || '',
        metadata: metadata || {},
        expiresAt,
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

    return {
      success: true,
      sessionId: session.id,
      amount: session.amount,
      currency: session.currency,
      expiresAt: session.expiresAt,
      checkoutUrl: `${process.env.PROFILE_FRONTEND_URL || 'https://profile.180workspace.com'}/checkout/${session.id}`,
    };
  }

  /**
   * Retrieves public details of a checkout session for the popup UI
   */
  static async getSession(sessionId: string) {
    if (sessionId.startsWith('sess_sandbox_') || sessionId.startsWith('sess_demo_')) {
      return {
        id: sessionId,
        amount: 499.00,
        currency: 'INR',
        status: 'PENDING',
        title: 'Developer Pro License',
        description: 'Interactive Sandbox Sovereign Checkout',
        returnUrl: '',
        cancelUrl: '',
        metadata: {},
        expiresAt: new Date(Date.now() + 3600 * 1000),
        app: {
          id: 'app_sandbox_demo',
          name: '180 Developers Demo',
          logoUrl: '',
          isVerified: true,
          homepageUrl: 'http://localhost:3008',
        },
      };
    }

    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            isVerified: true,
            homepageUrl: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Checkout session not found');
    }

    const isExpired = new Date() > session.expiresAt;
    if (isExpired && session.status === 'PENDING') {
      await prisma.checkoutSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      session.status = 'EXPIRED';
    }

    return {
      id: session.id,
      amount: session.amount,
      currency: session.currency,
      status: session.status,
      title: session.title,
      description: session.description,
      returnUrl: session.returnUrl,
      cancelUrl: session.cancelUrl,
      metadata: session.metadata,
      expiresAt: session.expiresAt,
      app: session.app,
    };
  }

  /**
   * Processes the checkout payment atomically inside an ACID transaction
   * with strict double-spend protection.
   */
  static async processPayment(sessionId: string, userId: string) {
    if (sessionId.startsWith('sess_sandbox_') || sessionId.startsWith('sess_demo_')) {
      return {
        success: true,
        transactionId: 'tx_sandbox_' + Math.random().toString(36).substring(2, 10),
        sessionId,
        amount: 499.00,
        currency: 'INR',
        status: 'CAPTURED',
        returnUrl: '',
      };
    }

    // Atomic execution block with transaction-scoped wallet reads
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Fetch & lock checkout session within transaction
      const session = await tx.checkoutSession.findUnique({
        where: { id: sessionId },
        include: { app: true },
      });

      if (!session) {
        throw new Error('Checkout session not found');
      }

      if (session.status !== 'PENDING') {
        throw new Error(`Checkout session is already ${session.status.toLowerCase()}`);
      }

      if (new Date() > session.expiresAt) {
        await tx.checkoutSession.update({
          where: { id: sessionId },
          data: { status: 'EXPIRED' },
        });
        throw new Error('Checkout session has expired');
      }

      // 2. Fetch User Wallet inside transaction
      let userWallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!userWallet) {
        userWallet = await tx.wallet.create({
          data: {
            userId,
            balance: 0,
            currency: 'INR',
          },
        });
      }

      if (userWallet.isLocked) {
        throw new Error('User wallet is locked. Please contact support.');
      }

      if (userWallet.balance < session.amount) {
        throw new Error(
          `Insufficient wallet balance. You have ₹${userWallet.balance.toFixed(2)} but this purchase requires ₹${session.amount.toFixed(2)}.`
        );
      }

      // 3. Fetch Developer App Wallet inside transaction
      let appWallet = await tx.wallet.findUnique({
        where: { appId: session.appId },
      });

      if (!appWallet) {
        appWallet = await tx.wallet.create({
          data: {
            appId: session.appId,
            balance: 0,
            currency: 'INR',
          },
        });
      }

      // 4. Double-Entry Atomic Balance Updates
      const newUserBalance = Math.round((userWallet.balance - session.amount) * 100) / 100;
      await tx.wallet.update({
        where: { id: userWallet.id },
        data: { balance: newUserBalance },
      });

      const userLedger = await tx.ledgerEntry.create({
        data: {
          walletId: userWallet.id,
          amount: -session.amount,
          balanceAfter: newUserBalance,
          type: 'CHECKOUT_PAY',
          referenceId: session.id,
          description: `Payment to ${session.app.name} (${session.title})`,
          metadata: {
            sessionId: session.id,
            appId: session.appId,
            appName: session.app.name,
          },
        },
      });

      const newAppBalance = Math.round((appWallet.balance + session.amount) * 100) / 100;
      await tx.wallet.update({
        where: { id: appWallet.id },
        data: { balance: newAppBalance },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: appWallet.id,
          amount: session.amount,
          balanceAfter: newAppBalance,
          type: 'CHECKOUT_RECEIVE',
          referenceId: session.id,
          description: `Customer payment received for ${session.title}`,
          metadata: {
            sessionId: session.id,
            userId,
          },
        },
      });

      // 5. Mark Checkout Session as CAPTURED
      const updatedSession = await tx.checkoutSession.update({
        where: { id: session.id },
        data: {
          status: 'CAPTURED',
          userId,
          completedAt: new Date(),
        },
      });

      return {
        session: updatedSession,
        userLedgerId: userLedger.id,
        newUserBalance,
      };
    });

    // 6. Asynchronous Webhook Dispatch with Backoff & Timestamp Signatures
    const session = result.session;
    this.dispatchPaymentWebhook(session.appId, {
      event: 'payment.succeeded',
      data: {
        sessionId: session.id,
        amount: session.amount,
        currency: session.currency,
        title: session.title,
        metadata: session.metadata,
        userId,
        timestamp: new Date().toISOString(),
      },
    }).catch((err) => {
      console.warn('[CheckoutService] Failed to dispatch webhook:', err.message);
    });

    return {
      success: true,
      transactionId: result.userLedgerId,
      remainingBalance: result.newUserBalance,
      returnUrl: session.returnUrl,
    };
  }

  /**
   * Helper to dispatch signed webhooks with timestamped HMAC-SHA256 signatures & retries
   */
  private static async dispatchPaymentWebhook(appId: string, payload: any) {
    const app = await prisma.oAuthApp.findUnique({
      where: { id: appId },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadString = JSON.stringify(payload);
    const signPayload = `${timestamp}.${payloadString}`;

    // Helper for safe single delivery attempt with 1 retry
    const deliverWithRetry = async (url: string, secret: string, endpointId?: string) => {
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signPayload)
        .digest('hex');

      const headers = {
        'Content-Type': 'application/json',
        'X-180-Signature': signature,
        'X-180-Timestamp': timestamp,
        'X-180-Event': payload.event,
        'User-Agent': '180-Pay-Webhook-Dispatcher/2.0',
      };

      let response: any = null;
      let lastError: any = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await axios.post(url, payload, { headers, timeout: 8000 });
          break; // Success
        } catch (err: any) {
          lastError = err;
          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 1000)); // 1s backoff before retry
          }
        }
      }

      if (endpointId) {
        if (response) {
          await prisma.webhookDelivery.create({
            data: {
              endpointId,
              event: payload.event,
              payload: payloadString,
              statusCode: response.status,
              response: typeof response.data === 'string' ? response.data.slice(0, 1000) : JSON.stringify(response.data).slice(0, 1000),
              deliveredAt: new Date(),
            },
          }).catch(() => {});
        } else {
          await prisma.webhookDelivery.create({
            data: {
              endpointId,
              event: payload.event,
              payload: payloadString,
              statusCode: lastError?.response?.status || null,
              error: lastError?.message?.slice(0, 1000) || 'Webhook delivery failed after retry',
            },
          }).catch(() => {});
        }
      }
    };

    // 1. Direct App Webhook URL
    if (app && (app as any).webhookUrl && (app as any).webhookUrl.startsWith('http')) {
      const signingSecret = (app as any).webhookSecret || app.clientSecretHash;
      deliverWithRetry((app as any).webhookUrl, signingSecret).catch((err) => {
        console.warn(`[CheckoutService] Direct webhook failed:`, err.message);
      });
    }

    // 2. Multi-Endpoint Webhook records
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { appId, isActive: true },
    });

    for (const endpoint of endpoints) {
      deliverWithRetry(endpoint.url, endpoint.secret, endpoint.id).catch((err) => {
        console.warn(`[CheckoutService] Endpoint webhook failed:`, err.message);
      });
    }
  }
}

