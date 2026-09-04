// @ts-nocheck
import { prisma, Prisma } from '@workspace/db';
import { paginateWithCursor, extractPaginationParams, getCache, setCache } from '@workspace/backend-infra';
import { FraudDetectionService } from '../fraud-detection/fraud-detection.service';

export class InvoiceService {
  /**
   * Create a new invoice with built-in fraud detection
   */
  static async createInvoice(invoiceData: any, user: any) {
    const data = {
      ...invoiceData,
      createdById: user.id || user._id,
    };

    // Run Fraud Detection
    const { score, notes, fingerprint } = await FraudDetectionService.calculateRisk(data, 'invoice');
    data.riskScore = score;
    data.riskNotes = notes;
    data.fingerprint = fingerprint;

    // Separate lineItems and taxItems for nested create
    const { lineItems, taxItems, ...invoiceFields } = data;
    
    const invoice = await prisma.invoice.create({
      data: {
        ...invoiceFields,
        lineItems: lineItems?.length ? {
          create: lineItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            amount: item.amount || item.total || 0
          }))
        } : undefined,
        taxItems: taxItems?.length ? {
          create: taxItems
        } : undefined
      },
      include: { lineItems: true, taxItems: true }
    });
    return invoice;
  }

  /**
   * Generate an invoice from a milestone
   */
  static async generateFromMilestone(milestone: any, project: any, user: any) {
    if (!milestone.autoInvoice || !milestone.invoiceAmount) return null;

    const config = await prisma.companyConfig.findFirst();
    if (!config) throw new Error('Company settings not found. Cannot generate invoice.');

    const invoiceNumber = `INV-${Date.now()}`;

    const invoiceData = {
      invoiceNumber,
      clientId: project.clientIds?.[0],
      projectId: project.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'draft',
      lineItems: [{
        description: milestone.invoiceDescription || `Milestone: ${milestone.title}`,
        quantity: 1,
        unitPrice: milestone.invoiceAmount,
        amount: milestone.invoiceAmount
      }],
      totalAmount: milestone.invoiceAmount,
      taxPercent: 0,
      discount: 0
    };

    try {
      const invoice = await this.createInvoice(invoiceData, user);

      // Link invoice back to milestone
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { invoiceId: invoice.id }
      });

      return invoice;
    } catch (error) {
      console.error('InvoiceService: Error generating from milestone:', error);
      throw error;
    }
  }

  static async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id },
      include: {
        lineItems: true,
        taxItems: true,
        client: true,
        project: true
      }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice;
  }

  static async getInvoices(filter: any, paginationOrQuery: any = {}) {
    const params = extractPaginationParams(paginationOrQuery);
    const where = filter || {};

    let invoices: any[] = [];
    let pageInfo: any = null;

    if (params.cursor) {
      const result = await paginateWithCursor(prisma.invoice, {
        where,
        cursor: params.cursor,
        limit: params.limit,
        direction: params.direction,
        sortField: params.sortField || 'issueDate',
        sortOrder: params.sortOrder || 'desc',
        include: {
          client: { select: { id: true, name: true, email: true, company: true } },
          createdBy: { select: { id: true, name: true } }
        }
      });
      invoices = result.items;
      pageInfo = result.pageInfo;
    } else {
      const safeLimit = Math.min(params.limit || 100, 100);
      invoices = await prisma.invoice.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, email: true, company: true } },
          createdBy: { select: { id: true, name: true } }
        },
        orderBy: { issueDate: 'desc' },
        take: safeLimit
      });
    }

    // Cache total revenue with 60-second TTL to avoid scanning table on every view
    const cacheKey = `finance:revenue:${JSON.stringify(where)}`;
    let totalRevenue = await getCache(cacheKey).catch(() => null);

    if (totalRevenue === null || totalRevenue === undefined) {
      const aggregate = await prisma.invoice.aggregate({
        where: { ...where, status: 'paid' },
        _sum: { totalAmount: true }
      }).catch(() => null);

      totalRevenue = aggregate?._sum?.totalAmount || 0;
      await setCache(cacheKey, totalRevenue, 60).catch(() => {});
    }

    return { invoices, totalRevenue, pageInfo };
  }

  static async updateInvoice(id: string, updateData: any) {
    const { lineItems = [], taxPercent = 0, discount = 0, ...rest } = updateData;

    const existing = await prisma.invoice.findFirst({
      where: { id }
    });
    if (!existing) {
      throw new Error('Not found');
    }

    const data: any = {
      ...rest,
      taxPercent,
      discount,
    };

    if (lineItems.length > 0) {
      data.lineItems = { deleteMany: {}, create: lineItems };
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data
    });

    return invoice;
  }

  static async deleteInvoice(id: string) {
    await prisma.invoice.delete({
      where: { id }
    });
    return { message: 'Deleted' };
  }
}
