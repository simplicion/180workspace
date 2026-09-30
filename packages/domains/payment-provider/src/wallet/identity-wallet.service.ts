'use strict';

import crypto from 'crypto';
import axios from 'axios';
import { developersPrisma as prisma } from '@workspace/db-180core';

export interface WalletTopupOrderResult {
  success: boolean;
  orderId: string;
  amountInr: number;
  amountPaise: number;
  currency: string;
  keyId: string;
}

export interface VerifyTopupResult {
  success: boolean;
  newBalance: number;
  alreadyProcessed?: boolean;
  transactionId: string;
}

export class IdentityWalletService {
  /**
   * Retrieves or creates a user's wallet
   */
  static async getOrCreateUserWallet(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          currency: 'INR',
        },
        include: {
          ledgerEntries: true,
        },
      });
    }

    return wallet;
  }

  /**
   * Retrieves or creates a developer app's revenue wallet
   */
  static async getOrCreateAppWallet(appId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { developerAppId: appId },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          developerAppId: appId,
          balance: 0,
          currency: 'INR',
        },
        include: {
          ledgerEntries: true,
        },
      });
    }

    return wallet;
  }

  /**
   * Creates a Razorpay Order for a user wallet top-up
   */
  static async createTopupOrder(
    userId: string,
    amountInr: number,
    currency = 'INR'
  ): Promise<WalletTopupOrderResult> {
    if (!amountInr || amountInr <= 0) {
      throw new Error('Top-up amount must be greater than zero');
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials are not configured in environment');
    }

    const amountPaise = Math.round(amountInr * 100);
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const normalizedCurrency = currency.toUpperCase();

    const notesPayload = {
      userId,
      purpose: '180_profile_wallet_topup',
      amountInr: String(amountInr),
      currency: normalizedCurrency,
    };

    const res = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: amountPaise,
        currency: normalizedCurrency,
        receipt: `topup_${userId.slice(0, 8)}_${Date.now()}`,
        payment_capture: 1,
        notes: notesPayload,
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      orderId: res.data.id,
      amountInr,
      amountPaise,
      currency: normalizedCurrency,
      keyId,
    };
  }

  /**
   * Verifies Razorpay payment signature & idempotently credits the user wallet
   */
  static async verifyAndCreditTopup(
    userId: string,
    orderId: string,
    paymentId: string,
    signature: string,
    amountInr: number
  ): Promise<VerifyTopupResult> {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    // 1. Verify HMAC SHA-256 signature
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Cryptographic signature verification failed for Razorpay payment');
    }

    // 2. Check for duplicate processing
    const existingEntry = await prisma.ledgerEntry.findFirst({
      where: {
        referenceId: paymentId,
        type: 'TOPUP',
      },
    });

    if (existingEntry) {
      const wallet = await this.getOrCreateUserWallet(userId);
      return {
        success: true,
        newBalance: wallet.balance,
        alreadyProcessed: true,
        transactionId: existingEntry.id,
      };
    }

    // 3. Atomically credit wallet and create ledger entry
    const result = await prisma.$transaction(async (tx: any) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId,
            balance: 0,
            currency: 'INR',
          },
        });
      }

      const newBalance = Math.round((wallet.balance + amountInr) * 100) / 100;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
        },
      });

      const ledger = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          amount: amountInr,
          balanceAfter: newBalance,
          type: 'TOPUP',
          referenceId: paymentId,
          description: `Wallet Top-Up via Razorpay (Order: ${orderId})`,
          metadata: {
            orderId,
            paymentId,
            gateway: 'RAZORPAY',
          },
        },
      });

      return {
        newBalance: updatedWallet.balance,
        transactionId: ledger.id,
      };
    });

    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
    };
  }

  /**
   * Retrieves transaction ledger history for a user
   */
  static async getUserLedger(userId: string, limit = 50, page = 1) {
    const wallet = await this.getOrCreateUserWallet(userId);
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.ledgerEntry.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return {
      balance: wallet.balance,
      currency: wallet.currency,
      entries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
