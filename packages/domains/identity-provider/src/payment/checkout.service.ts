'use strict';

import crypto from 'crypto';
import axios from 'axios';
import { developersPrisma as prisma } from '@workspace/db-180developers';
import { hashSecret } from '../oauth/oauth.service';
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

    // 1. Authenticate developer application
    const app = await prisma.oAuthApp.findUnique({
      where: { clientId },
    });

    if (!app || !app.isActive) {
      throw new Error('Invalid or inactive OAuth client credentials');
    }

    const isValidSecret = hashSecret(clientSecret) === app.clientSecretHash;
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
        amount,
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
   * Processes the checkout payment atomically by deducting from the user's wallet
   * and crediting the developer's app wallet.
   */
  static async processPayment(sessionId: string, userId: string) {
    const session = await prisma.checkoutSession.findUnique({
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
      await prisma.checkoutSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Checkout session has expired');
    }

    // Ensure user wallet exists
    const userWallet = await IdentityWalletService.getOrCreateUserWallet(userId);
    if (userWallet.balance < session.amount) {
      throw new Error(
        `Insufficient wallet balance. You have ₹${userWallet.balance.toFixed(2)} but this purchase requires ₹${session.amount.toFixed(2)}.`
      );
    }

    // Ensure developer app wallet exists
    const appWallet = await IdentityWalletService.getOrCreateAppWallet(session.appId);

    // Atomic double-entry transfer
    const transaction = await prisma.$transaction(async (tx: any) => {
      // 1. Deduct from User
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

      // 2. Credit to Developer App
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

      // 3. Mark Checkout Session as CAPTURED
      const updatedSession = await tx.checkoutSession.update({
        where: { id: session.id },
        data: {
          status: 'CAPTURED',
          userId,
          completedAt: new Date(),
        },
      });

      return {
        userLedgerId: userLedger.id,
        newUserBalance,
        session: updatedSession,
      };
    });

    // 4. Trigger Webhook to Developer (Asynchronous)
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
      transactionId: transaction.userLedgerId,
      remainingBalance: transaction.newUserBalance,
      returnUrl: session.returnUrl,
    };
  }

  /**
   * Helper to dispatch signed webhooks to developer endpoints
   */
  private static async dispatchPaymentWebhook(appId: string, payload: any) {
    const app = await prisma.oAuthApp.findUnique({
      where: { id: appId },
    });

    const payloadString = JSON.stringify(payload);

    // 1. Direct App Webhook URL
    if (app && (app as any).webhookUrl && (app as any).webhookUrl.startsWith('http')) {
      const signingSecret = (app as any).webhookSecret || app.clientSecretHash;
      try {
        const signature = crypto
          .createHmac('sha256', signingSecret)
          .update(payloadString)
          .digest('hex');

        await axios.post((app as any).webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-180-Signature': signature,
            'X-180-Event': payload.event,
            'User-Agent': '180-Pay-Webhook-Dispatcher/1.0',
          },
          timeout: 10000,
        });
      } catch (err: any) {
        console.warn(`[CheckoutService] Failed to dispatch direct webhook to ${(app as any).webhookUrl}:`, err.message);
      }
    }

    // 2. Any additional WebhookEndpoint records
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { appId, isActive: true },
    });

    for (const endpoint of endpoints) {
      try {
        const signature = crypto
          .createHmac('sha256', endpoint.secret)
          .update(payloadString)
          .digest('hex');

        const res = await axios.post(endpoint.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-180-Signature': signature,
            'X-180-Event': payload.event,
            'User-Agent': '180-Pay-Webhook-Dispatcher/1.0',
          },
          timeout: 10000,
        });

        await prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event: payload.event,
            payload: payloadString,
            statusCode: res.status,
            response: typeof res.data === 'string' ? res.data.slice(0, 1000) : JSON.stringify(res.data).slice(0, 1000),
            deliveredAt: new Date(),
          },
        });
      } catch (err: any) {
        await prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event: payload.event,
            payload: payloadString,
            statusCode: err.response?.status || null,
            error: err.message?.slice(0, 1000) || 'Webhook delivery failed',
          },
        });
      }
    }
  }
}
