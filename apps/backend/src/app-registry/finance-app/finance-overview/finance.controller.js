'use strict';
const CompanyPaymentService = require('../finance/CompanyPaymentService.js');
const PayoutService = require('../finance/PayoutService.js');
const BankVerificationService = require('../finance/BankVerificationService.js');
const ReminderService = require('../finance/ReminderService.js');
const PDFService = require('../finance/PDFService.js');
const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');

exports.getConfig = async (req, res, next) => {
    try {
        const CompanyConfig = req.prisma.companyConfig;
        const config = await CompanyConfig.findFirst();

        // Strip out the secure secrets entirely from GET response
        let publicConfig = { activeProvider: 'manual' };
        
        // Prisma JSON fields are parsed automatically.
        if (config?.companyPaymentConfig) {
            const tpc = typeof config.companyPaymentConfig === 'string' ? JSON.parse(config.companyPaymentConfig) : config.companyPaymentConfig;
            publicConfig.activeProvider = tpc.activeProvider || 'manual';
            publicConfig.razorpay = { keyId: tpc.razorpay?.keyId };
            publicConfig.stripe = { publicKey: tpc.stripe?.publicKey };
            publicConfig.reminderSettings = tpc.reminderSettings || { enabled: false, schedule: [3, 1, -7] };
        }

        res.json({ success: true, paymentConfig: publicConfig });
    } catch (err) { next(err); }
};

exports.updateConfig = async (req, res, next) => {
    try {
        const CompanyConfig = req.prisma.companyConfig;
        const config = await CompanyConfig.findFirst();
        if (config && req.body.companyPaymentConfig) {
            const newConfig = req.body.companyPaymentConfig;
            let currentConfig = typeof config.companyPaymentConfig === 'string' ? JSON.parse(config.companyPaymentConfig) : (config.companyPaymentConfig || {});

            if (!currentConfig.razorpay) currentConfig.razorpay = {};
            if (!currentConfig.stripe) currentConfig.stripe = {};
            if (!currentConfig.reminderSettings) currentConfig.reminderSettings = {};

            if (newConfig.activeProvider) {
                currentConfig.activeProvider = newConfig.activeProvider;
            }
            if (newConfig.razorpay) {
                Object.assign(currentConfig.razorpay, newConfig.razorpay);
            }
            if (newConfig.stripe) {
                Object.assign(currentConfig.stripe, newConfig.stripe);
            }
            if (newConfig.reminderSettings) {
                Object.assign(currentConfig.reminderSettings, newConfig.reminderSettings);
            }

            await CompanyConfig.update({
                where: { id: config.id },
                data: { companyPaymentConfig: currentConfig }
            });

            await AutomationService.trigger({
                eventType: 'finance_config_updated',
                triggeredBy: req.user.id,
                description: 'Finance and payment settings were updated.',
                metadata: { provider: currentConfig.activeProvider }
            }, req.prisma);
        }
        res.json({ success: true, message: 'Finance configuration updated securely' });
    } catch (err) { next(err); }
};

exports.generateInvoicePaymentLink = async (req, res, next) => {
    try {
        if (!req.params.id) return res.status(400).json({ error: 'Invoice ID required' });
        const Invoice = req.prisma.invoice;
        const invoice = await Invoice.findUnique({ where: { id: req.params.id } });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice already paid' });

        // Pass Prisma client to services that expect it.
        const provider = await CompanyPaymentService.getActiveProvider(req.prisma);
        const linkData = await provider.generatePaymentLink({
            amount: invoice.totalAmount,
            currency: 'INR',
            description: `Payment for Invoice ${invoice.invoiceNumber}`,
            referenceId: invoice.id,
            customerInfo: { name: invoice.clientName || 'Valued Client' }
        });

        await Invoice.update({
            where: { id: invoice.id },
            data: {
                paymentDetails: {
                    paymentLink: linkData.paymentLinkUrl,
                    gatewayOrderId: linkData.providerOrderId,
                    provider: linkData.providerName,
                    paidAt: null
                }
            }
        });

        res.json({ success: true, linkData, message: 'Payment link generated successfully' });
    } catch (err) { next(err); }
};

exports.downloadInvoicePDF = async (req, res, next) => {
    try {
        if (!req.params.id) return res.status(400).json({ error: 'Invoice ID required' });

        const Invoice = req.prisma.invoice;
        const CompanyConfig = req.prisma.companyConfig;

        const [invoice, company] = await Promise.all([
            Invoice.findUnique({ where: { id: req.params.id } }),
            CompanyConfig.findFirst()
        ]);

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (!company) return res.status(404).json({ error: 'Company configuration not found' });

        const pdfBuffer = await PDFService.generateInvoicePDF(invoice, company);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (err) { next(err); }
};

exports.initiateSalaryPayout = async (req, res, next) => {
    try {
        if (!req.params.id) return res.status(400).json({ error: 'Salary ID required' });
        const result = await PayoutService.initiateSalaryPayout(req.prisma, req.params.id);

        await AutomationService.trigger({
            eventType: 'salary_payout_initiated',
            triggeredBy: req.user.id,
            relatedItem: { itemId: req.params.id, itemModel: 'Salary' },
            description: `Salary payout initiated for record ${req.params.id}.`
        }, req.prisma);

        res.json(result);
    } catch (err) { next(err); }
};

exports.verifyBankAccount = async (req, res, next) => {
    try {
        const userIdToVerify = req.body.userId || req.user.id;
        const result = await BankVerificationService.verifyEmployeeAccount(req.prisma, userIdToVerify);
        res.json(result);
    } catch (err) { next(err); }
};

exports.triggerReminders = async (req, res, next) => {
    try {
        const result = await ReminderService.processReminders(req.prisma);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getTransactions = async (req, res, next) => {
    try {
        const CompanyTransaction = req.prisma.companyTransaction;
        const { type, status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (type) query.type = type;
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [transactions, total] = await Promise.all([
            CompanyTransaction.findMany({
                where: query,
                include: {
                    user: { select: { name: true, email: true } },
                    client: { select: { name: true, email: true, company: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: skip,
                take: Number(limit)
            }),
            CompanyTransaction.count({ where: query })
        ]);

        // Mock _id for frontend compatibility
        transactions.forEach(t => t._id = t.id);

        res.json({ success: true, transactions, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const Invoice = req.prisma.invoice;
        const Salary = req.prisma.salary;
        const Expense = req.prisma.expense;
        const User = req.prisma.user;

        const [revenueRes, salaryRes, expenseRes, pendingInvoices, unverifiedBanks] = await Promise.all([
            Invoice.aggregate({ where: { status: 'paid' }, _sum: { totalAmount: true } }),
            Salary.aggregate({ where: { status: 'paid' }, _sum: { netSalary: true } }),
            Expense.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
            Invoice.count({ where: { status: { in: ['sent', 'overdue'] } } }),
            User.count({
                where: {
                    bankAccount: null,
                    role: { not: 'client' }
                }
            })
        ]);

        const totalRevenue = revenueRes._sum.totalAmount || 0;
        const totalPayouts = (salaryRes._sum.netSalary || 0) + (expenseRes._sum.amount || 0);

        res.json({
            success: true,
            stats: {
                totalRevenue,
                totalPayouts,
                pendingInvoices,
                unverifiedBanks,
                netBalance: totalRevenue - totalPayouts
            }
        });
    } catch (err) { next(err); }
};
