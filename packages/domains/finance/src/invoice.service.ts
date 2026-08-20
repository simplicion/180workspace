// @ts-nocheck
import { prisma } from '@workspace/db';
import { prisma, Prisma } from '@workspace/db';
import { FraudDetectionService } from './fraud-detection.service';

export class InvoiceService {
  /**
   * Create a new invoice with built-in fraud detection
   */
  static async createInvoice(companyId: string, invoiceData: any, user: any) {
    const data = {
      ...invoiceData,
      companyId,
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
  static async generateFromMilestone(companyId: string, milestone: any, project: any, user: any) {
    if (!milestone.autoInvoice || !milestone.invoiceAmount) return null;

    const config = await prisma.companyConfig.findFirst({
      where: { companyId }
    });
    if (!config) throw new Error('Company settings not found. Cannot generate invoice.');

    const invoiceNumber = `INV-${Date.now()}`;

    const invoiceData = {
      invoiceNumber,
      companyId,
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
      const invoice = await this.createInvoice(companyId, invoiceData, user);

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

  static async getInvoiceById(companyId: string, id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id, companyId },
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

  static async getInvoices(filter: any) {
    const invoices = await prisma.invoice.findMany({
      where: filter,
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { issueDate: 'desc' }
    });

    const totalRevenue = invoices
      .filter((i: any) => i.status === 'paid')
      .reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);

    return { invoices, totalRevenue };
  }

  static async updateInvoice(id: string, companyId: string, updateData: any) {
    const { lineItems = [], taxPercent = 0, discount = 0, ...rest } = updateData;

    const existing = await prisma.invoice.findFirst({
      where: { id, companyId }
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

  static async deleteInvoice(id: string, companyId: string) {
    await prisma.invoice.delete({
      where: { id, companyId } as any
    });
    return { message: 'Deleted' };
  }
}
