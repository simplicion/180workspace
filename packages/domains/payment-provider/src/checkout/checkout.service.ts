'use strict';

import crypto from 'crypto';
import axios from 'axios';
import { developersPrisma as prisma } from '@workspace/db-180core';
import { IdentityWalletService } from '../wallet/identity-wallet.service';
import { SubscriptionService } from '../subscription/subscription.service';

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
  mode?: 'payment' | 'subscription';
  planCode?: string;
  billingInterval?: string;
  paymentSource?: 'WALLET' | 'RAZORPAY_RECURRING' | 'HYBRID';
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
      mode = 'payment',
      planCode,
      billingInterval,
      paymentSource = 'WALLET',
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

    if (app.enablePay === false) {
      throw new Error('180 Pay is currently disabled for this application.');
    }

    // 2. Set expiry
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // 3. Resolve plan if in subscription mode
    let planId: string | null = null;
    let resolvedInterval = billingInterval || 'MONTHLY';
    if (mode === 'subscription' && planCode) {
      const plan = await (prisma as any).subscriptionPlan.findUnique({
        where: {
          appId_planCode: {
            appId: app.id,
            planCode: planCode.toLowerCase().trim(),
          },
        },
      });
      if (plan) {
        planId = plan.id;
        resolvedInterval = plan.interval;
      }
    }

    // 4. Create session record
    const session = await prisma.checkoutSession.create({
      data: {
        appId: app.id,
        amount: Math.round(amount * 100) / 100,
        currency: currency.toUpperCase(),
        status: 'PENDING',
        mode,
        planId,
        billingInterval: mode === 'subscription' ? resolvedInterval : null,
        title,
        description: description || '',
        returnUrl: returnUrl || '',
        cancelUrl: cancelUrl || '',
        metadata: {
          ...(metadata || {}),
          paymentSource,
        },
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

    const checkoutBase = process.env.PROFILE_FRONTEND_URL || 'https://pay.180workspace.com';

    return {
      success: true,
      sessionId: session.id,
      amount: session.amount,
      currency: session.currency,
      mode: session.mode,
      planId: session.planId,
      expiresAt: session.expiresAt,
      checkoutUrl: `${checkoutBase}/checkout/${session.id}`,
    };
  }

  /**
   * Retrieves a Checkout Session for rendering the 180 Pay Drawer
   */
  static async getSession(sessionId: string) {
    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            description: true,
            logoUrl: true,
            isVerified: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Checkout session not found');
    }

    if (session.status === 'EXPIRED' || session.expiresAt < new Date()) {
      if (session.status !== 'EXPIRED' && session.status === 'PENDING') {
        await prisma.checkoutSession.update({
          where: { id: sessionId },
          data: { status: 'EXPIRED' },
        });
      }
      return {
        ...session,
        status: 'EXPIRED',
        isExpired: true,
      };
    }

    return {
      ...session,
      isExpired: false,
    };
  }

  /**
   * Alias for captureSession - authenticates and executes payment from user's sovereign wallet
   */
  static async processPayment(sessionId: string, userId: string) {
    return this.captureSession(sessionId, userId);
  }

  /**
   * Captures payment from the user's sovereign wallet and completes the session
   */
  static async captureSession(sessionId: string, userId: string) {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Lock and verify session
      const session = await tx.checkoutSession.findUnique({
        where: { id: sessionId },
        include: { app: true },
      });

      if (!session) {
        throw new Error('Checkout session not found');
      }

      if (session.status === 'CAPTURED') {
        throw new Error('This checkout session has already been completed.');
      }

      if (session.status === 'EXPIRED' || session.expiresAt < new Date()) {
        throw new Error('This checkout session has expired. Please create a new one.');
      }

      if (session.status !== 'PENDING') {
        throw new Error(`Cannot capture session with status: ${session.status}`);
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
        where: { developerAppId: session.appId },
      });

      if (!appWallet) {
        appWallet = await tx.wallet.create({
          data: {
            developerAppId: session.appId,
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

      // 5.1 Activate recurring subscription if session was created in subscription mode
      if (session.mode === 'subscription') {
        try {
          await SubscriptionService.activateSubscriptionFromSession(session.id, userId, tx);
        } catch (subErr: any) {
          console.warn('[CheckoutService] Failed to activate subscription from session:', subErr.message);
        }
      }

      return {
        session: updatedSession,
        userLedgerId: userLedger.id,
        newUserBalance,
      };
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // 6. Asynchronous Webhook Dispatch with Backoff & Timestamp Signatures
    // Dispatches both 'payment.captured' (standard) and 'payment.succeeded' (compatibility alias)
    const session = result.session;
    const webhookData = {
      sessionId: session.id,
      transactionId: result.userLedgerId,
      amount: session.amount,
      currency: session.currency,
      title: session.title,
      metadata: session.metadata,
      userId,
      timestamp: new Date().toISOString(),
    };

    Promise.allSettled([
      this.dispatchPaymentWebhook(session.appId, {
        event: 'payment.captured',
        data: webhookData,
      }),
      this.dispatchPaymentWebhook(session.appId, {
        event: 'payment.succeeded',
        data: webhookData,
      }),
    ]).catch((err) => {
      console.warn('[CheckoutService] Failed to dispatch webhook:', err.message);
    });

    return {
      success: true,
      session: result.session,
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

  /**
   * Creates a direct Razorpay order for guest/unauthenticated checkout
   */
  static async createDirectOrder(sessionId: string) {
    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            description: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Checkout session not found');
    }

    if (session.status === 'CAPTURED') {
      throw new Error('This checkout session has already been completed.');
    }

    if (session.status === 'EXPIRED' || session.expiresAt < new Date()) {
      throw new Error('This checkout session has expired.');
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Payment gateway credentials not configured');
    }

    const amountPaise = Math.round(session.amount * 100);
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const rzpResponse = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: amountPaise,
        currency: session.currency || 'INR',
        receipt: `cs_${session.id.replace(/-/g, '').slice(0, 36)}`,
        notes: {
          sessionId: session.id,
          appId: session.appId,
          appName: session.app?.name || '180 App',
          title: session.title,
        },
      },
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return {
      orderId: rzpResponse.data.id,
      amountPaise,
      currency: session.currency || 'INR',
      keyId,
    };
  }

  /**
   * Cryptographically verifies Razorpay payment and captures the session
   */
  static async verifyDirectPayment(input: {
    sessionId: string;
    orderId: string;
    paymentId: string;
    signature: string;
  }) {
    const { sessionId, orderId, paymentId, signature } = input;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error('Payment gateway key secret not configured');
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (!timingSafeCompare(expectedSignature, signature)) {
      throw new Error('Cryptographic signature verification failed');
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const session = await tx.checkoutSession.findUnique({
        where: { id: sessionId },
        include: { app: true },
      });

      if (!session) {
        throw new Error('Checkout session not found');
      }

      if (session.status === 'CAPTURED') {
        return { session, transactionId: paymentId, alreadyCaptured: true };
      }

      // Fetch or create Developer App Wallet
      let appWallet = await tx.wallet.findUnique({
        where: { developerAppId: session.appId },
      });

      if (!appWallet) {
        appWallet = await tx.wallet.create({
          data: {
            developerAppId: session.appId,
            balance: 0,
            currency: session.currency || 'INR',
          },
        });
      }

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
          referenceId: paymentId,
          description: `Direct payment received for ${session.title}`,
          metadata: {
            sessionId: session.id,
            gateway: 'RAZORPAY',
            orderId,
            paymentId,
          },
        },
      });

      const updatedSession = await tx.checkoutSession.update({
        where: { id: session.id },
        data: {
          status: 'CAPTURED',
          completedAt: new Date(),
          metadata: {
            ...(session.metadata as any || {}),
            gateway: 'RAZORPAY',
            paymentId,
            orderId,
          },
        },
      });

      return { session: updatedSession, transactionId: paymentId, alreadyCaptured: false };
    });

    // Dispatch webhook to merchant
    if (!result.alreadyCaptured) {
      const webhookData = {
        sessionId: result.session.id,
        transactionId: paymentId,
        amount: result.session.amount,
        currency: result.session.currency,
        title: result.session.title,
        metadata: result.session.metadata,
        timestamp: new Date().toISOString(),
      };

      Promise.allSettled([
        this.dispatchPaymentWebhook(result.session.appId, {
          event: 'payment.captured',
          data: webhookData,
        }),
        this.dispatchPaymentWebhook(result.session.appId, {
          event: 'payment.succeeded',
          data: webhookData,
        }),
      ]).catch((err) => {
        console.warn('[CheckoutService] Direct pay webhook failed:', err.message);
      });
    }

    return {
      success: true,
      sessionId,
      transactionId: paymentId,
      status: 'CAPTURED',
      returnUrl: result.session.returnUrl,
    };
  }
}

