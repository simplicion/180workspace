'use strict';

import crypto from 'crypto';
import { developersPrisma as prisma } from '@workspace/db-180core';
import { WebhookDispatcherService } from '../webhook/webhook-dispatcher.service';

export interface CreatePaymentLinkInput {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  customSlug?: string;
  collectPhone?: boolean;
  collectAddress?: boolean;
  allowCoupons?: boolean;
  redirectUrl?: string;
  fulfillmentMessage?: string;
  fulfillmentFileUrl?: string;
  maxPurchases?: number;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdatePaymentLinkInput {
  title?: string;
  description?: string;
  amount?: number;
  currency?: string;
  collectPhone?: boolean;
  collectAddress?: boolean;
  allowCoupons?: boolean;
  redirectUrl?: string;
  fulfillmentMessage?: string;
  fulfillmentFileUrl?: string;
  maxPurchases?: number | null;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface PublicPaymentLinkResult {
  id: string;
  slug: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  collectPhone: boolean;
  collectAddress: boolean;
  allowCoupons: boolean;
  isAvailable: boolean;
  isSoldOut: boolean;
  merchant: {
    name: string;
    logoUrl?: string;
    clientId: string;
  };
}

export interface FulfillmentResult {
  success: boolean;
  fulfillmentMessage?: string;
  fulfillmentFileUrl?: string;
  redirectUrl?: string;
}

export class PaymentLinkService {
  /**
   * Helper to generate clean, URL-safe random slugs.
   */
  static generateRandomSlug(title?: string): string {
    const randomHex = crypto.randomBytes(4).toString('hex');
    if (!title) {
      return `pl_${randomHex}`;
    }
    const cleanTitle = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
    return cleanTitle ? `${cleanTitle}-${randomHex}` : `pl_${randomHex}`;
  }

  /**
   * 1. Creates a shareable Payment Link.
   */
  static async createPaymentLink(appId: string, data: CreatePaymentLinkInput) {
    if (!data.title || !data.title.trim()) {
      throw new Error('Payment link title is required');
    }
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    let slug = data.customSlug
      ? data.customSlug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '')
      : this.generateRandomSlug(data.title);

    // Verify slug uniqueness, retry with random entropy if collision occurs
    let attempts = 0;
    while (attempts < 5) {
      const existing = await (prisma as any).paymentLink.findUnique({
        where: { slug },
      });
      if (!existing) break;
      slug = this.generateRandomSlug(data.title);
      attempts++;
    }

    return await (prisma as any).paymentLink.create({
      data: {
        appId,
        slug,
        title: data.title.trim(),
        description: data.description || '',
        amount: Number(data.amount),
        currency: (data.currency || 'INR').toUpperCase(),
        collectPhone: data.collectPhone !== undefined ? data.collectPhone : true,
        collectAddress: data.collectAddress !== undefined ? data.collectAddress : false,
        allowCoupons: data.allowCoupons !== undefined ? data.allowCoupons : true,
        redirectUrl: data.redirectUrl || '',
        fulfillmentMessage: data.fulfillmentMessage || '',
        fulfillmentFileUrl: data.fulfillmentFileUrl || '',
        maxPurchases: data.maxPurchases ? Number(data.maxPurchases) : null,
        metadata: data.metadata || {},
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  /**
   * 2. Resolves a Payment Link for public checkout page rendering.
   * Conceals private fulfillment secrets until payment is verified.
   */
  static async getPublicPaymentLink(slug: string): Promise<PublicPaymentLinkResult> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const link = await (prisma as any).paymentLink.findUnique({
      where: { slug: cleanSlug },
      include: {
        app: {
          select: {
            name: true,
            logoUrl: true,
            clientId: true,
            allowedOrigins: true,
          },
        },
      },
    });

    if (!link) {
      throw new Error('Payment link not found');
    }

    const isSoldOut = link.maxPurchases !== null && link.purchasesCount >= link.maxPurchases;
    const isAvailable = Boolean(link.isActive && !isSoldOut);

    return {
      id: link.id,
      slug: link.slug,
      title: link.title,
      description: link.description || '',
      amount: link.amount,
      currency: link.currency,
      collectPhone: link.collectPhone,
      collectAddress: link.collectAddress,
      allowCoupons: link.allowCoupons,
      isAvailable,
      isSoldOut,
      merchant: {
        name: link.app?.name || '180 Workspace Merchant',
        logoUrl: link.app?.logoUrl || '',
        clientId: link.app?.clientId || '',
      },
    };
  }

  /**
   * 3. Completes payment on a link, atomically increments counter, and reveals fulfillment assets.
   */
  static async completeLinkPurchase(linkId: string, sessionId: string): Promise<FulfillmentResult> {
    const result = await prisma.$transaction(async (tx: any) => {
      // Atomic increment with conditional capacity check
      const affectedRows = await tx.$executeRaw`
        UPDATE "PaymentLink"
        SET "purchasesCount" = "purchasesCount" + 1,
            "updatedAt" = NOW()
        WHERE "id" = ${linkId}
          AND "isActive" = true
          AND ("maxPurchases" IS NULL OR "purchasesCount" < "maxPurchases")
      `;

      if (affectedRows === 0) {
        throw new Error('Item reached purchase capacity concurrently or link is inactive');
      }

      const link = await tx.paymentLink.findUnique({
        where: { id: linkId },
        select: {
          appId: true,
          slug: true,
          title: true,
          amount: true,
          currency: true,
          fulfillmentMessage: true,
          fulfillmentFileUrl: true,
          redirectUrl: true,
        },
      });

      return {
        success: true,
        appId: link?.appId,
        slug: link?.slug,
        title: link?.title,
        amount: link?.amount,
        currency: link?.currency,
        fulfillmentMessage: link?.fulfillmentMessage || undefined,
        fulfillmentFileUrl: link?.fulfillmentFileUrl || undefined,
        redirectUrl: link?.redirectUrl || undefined,
      };
    });

    // Asynchronously dispatch webhook event
    if (result.appId) {
      WebhookDispatcherService.dispatchEvent(result.appId, {
        event: 'payment_link.completed',
        data: {
          linkId,
          slug: result.slug,
          title: result.title,
          amount: result.amount,
          currency: result.currency,
          sessionId,
        },
      }).catch((err) => console.warn('[PaymentLinkService] Webhook dispatch error:', err.message));
    }

    return {
      success: true,
      fulfillmentMessage: result.fulfillmentMessage,
      fulfillmentFileUrl: result.fulfillmentFileUrl,
      redirectUrl: result.redirectUrl,
    };
  }

  /**
   * 4. Developer Management: Update Payment Link
   */
  static async updatePaymentLink(appId: string, linkId: string, data: UpdatePaymentLinkInput) {
    const link = await (prisma as any).paymentLink.findFirst({
      where: { id: linkId, appId },
    });

    if (!link) {
      throw new Error('Payment link not found');
    }

    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    return await (prisma as any).paymentLink.update({
      where: { id: linkId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: Number(data.amount) }),
        ...(data.currency !== undefined && { currency: data.currency.toUpperCase() }),
        ...(data.collectPhone !== undefined && { collectPhone: data.collectPhone }),
        ...(data.collectAddress !== undefined && { collectAddress: data.collectAddress }),
        ...(data.allowCoupons !== undefined && { allowCoupons: data.allowCoupons }),
        ...(data.redirectUrl !== undefined && { redirectUrl: data.redirectUrl }),
        ...(data.fulfillmentMessage !== undefined && { fulfillmentMessage: data.fulfillmentMessage }),
        ...(data.fulfillmentFileUrl !== undefined && { fulfillmentFileUrl: data.fulfillmentFileUrl }),
        ...(data.maxPurchases !== undefined && { maxPurchases: data.maxPurchases }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * 5. Developer Management: Delete Payment Link
   */
  static async deletePaymentLink(appId: string, linkId: string) {
    const link = await (prisma as any).paymentLink.findFirst({
      where: { id: linkId, appId },
    });

    if (!link) {
      throw new Error('Payment link not found');
    }

    return await (prisma as any).paymentLink.delete({
      where: { id: linkId },
    });
  }

  /**
   * 6. Developer Management: List Payment Links
   */
  static async listPaymentLinks(appId: string, options?: { page?: number; limit?: number }) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const skip = (page - 1) * limit;

    const [links, total] = await Promise.all([
      (prisma as any).paymentLink.findMany({
        where: { appId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any).paymentLink.count({
        where: { appId },
      }),
    ]);

    return {
      links,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 7. Developer Management: Fetch single link by ID
   */
  static async getPaymentLinkById(appId: string, linkId: string) {
    const link = await (prisma as any).paymentLink.findFirst({
      where: { id: linkId, appId },
    });

    if (!link) {
      throw new Error('Payment link not found');
    }

    return link;
  }

  /**
   * 8. Post-purchase delivery helper: Validates session status before revealing fulfillment assets
   */
  static async getFulfillmentData(linkId: string, sessionId: string): Promise<FulfillmentResult> {
    const session = await (prisma as any).checkoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'CAPTURED') {
      throw new Error('Valid completed purchase session required to access digital fulfillment');
    }

    return await this.completeLinkPurchase(linkId, sessionId);
  }
}
