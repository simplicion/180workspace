'use strict';

const FraudDetectionService = require('./FraudDetectionService');

/**
 * Service to handle Invoice operations
 */
class InvoiceService {
    /**
     * Create a new invoice with built-in fraud detection
     * @param {Object} invoiceData - Data for the invoice
     * @param {Object} prisma - Prisma client instance
     * @param {Object} user - User creating the invoice
     * @returns {Promise<Object>} Created invoice
     */
    static async createInvoice(invoiceData, prisma, user) {
        const data = {
            ...invoiceData,
            createdById: user.id || user._id,
        };

        // Run Fraud Detection
        const { score, notes, fingerprint } = await FraudDetectionService.calculateRisk(data, prisma, 'invoice');
        data.riskScore = score;
        data.riskNotes = notes;
        data.fingerprint = fingerprint;

        // Separate lineItems and taxItems for nested create
        const { lineItems, taxItems, ...invoiceFields } = data;
        
        const invoice = await prisma.invoice.create({
            data: {
                ...invoiceFields,
                lineItems: lineItems?.length ? {
                    create: lineItems.map(item => ({
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
     * @param {Object} milestone - Milestone object
     * @param {Object} project - Project object
     * @param {Object} prisma - Prisma client instance
     * @param {Object} user - User triggering the completion
     * @returns {Promise<Object|null>} Created invoice or null
     */
    static async generateFromMilestone(milestone, project, prisma, user) {
        if (!milestone.autoInvoice || !milestone.invoiceAmount) return null;

        const config = await prisma.companyConfig.findFirst({
            where: { companyId: project.companyId }
        });
        if (!config) throw new Error('Company settings not found. Cannot generate invoice.');

        const invoiceNumber = `INV-${Date.now()}`; // Basic generation, model pre-save might override

        const invoiceData = {
            invoiceNumber,
            companyId: config.companyId,
            clientId: project.clientIds?.[0],
            projectId: project.id,
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
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
            const invoice = await this.createInvoice(invoiceData, prisma, user);

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
}

module.exports = InvoiceService;
