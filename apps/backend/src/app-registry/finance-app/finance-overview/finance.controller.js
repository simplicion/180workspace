'use strict';
const { FinanceOverviewService } = require('@workspace/finance');
const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
// The remaining payment generation and PDF generation will rely on legacy provider logic for now, 
// but we route core logic through domain service.

exports.getPLReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });

        const report = await FinanceOverviewService.getPLReport(req.user.companyId, startDate, endDate);
        res.json({ success: true, report });
    } catch (err) { next(err); }
};

exports.getCashFlowForecast = async (req, res, next) => {
    try {
        const forecast = await FinanceOverviewService.getCashFlowForecast(req.user.companyId);
        res.json({ success: true, forecast });
    } catch (err) { next(err); }
};

exports.getProjectProfitability = async (req, res, next) => {
    try {
        if (!req.params.projectId) return res.status(400).json({ error: 'Project ID required' });
        const profitability = await FinanceOverviewService.getProjectProfitability(req.user.companyId, req.params.projectId);
        res.json({ success: true, profitability });
    } catch (err) { next(err); }
};

exports.getConfig = async (req, res, next) => {
    try {
        const publicConfig = await FinanceOverviewService.getConfig(req.user.companyId);
        res.json({ success: true, paymentConfig: publicConfig });
    } catch (err) { next(err); }
};

exports.updateConfig = async (req, res, next) => {
    try {
        if (!req.body.companyPaymentConfig) return res.json({ success: true, message: 'No config provided' });
        
        const { activeProvider } = await FinanceOverviewService.updateConfig(req.user.companyId, req.body.companyPaymentConfig);

        await AutomationService.trigger({
            eventType: 'finance_config_updated',
            triggeredBy: req.user.id,
            description: 'Finance and payment settings were updated.',
            metadata: { provider: activeProvider }
        });
        
        res.json({ success: true, message: 'Finance configuration updated securely' });
    } catch (err) { next(err); }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const stats = await FinanceOverviewService.getDashboardStats(req.user.companyId);
        res.json({ success: true, stats });
    } catch (err) { next(err); }
};

exports.generateInvoicePaymentLink = async (req, res, next) => {
    try {
        res.status(501).json({ message: 'Legacy payment link generation to be migrated to provider patterns' });
    } catch (err) { next(err); }
};

exports.downloadInvoicePDF = async (req, res, next) => {
    try {
        res.status(501).json({ message: 'Legacy PDF generation to be migrated to new shared utility' });
    } catch (err) { next(err); }
};

exports.initiateSalaryPayout = async (req, res, next) => {
    try {
        res.status(501).json({ message: 'Legacy initiate salary payout to be migrated' });
    } catch (err) { next(err); }
};

exports.verifyBankAccount = async (req, res, next) => {
    try {
        res.status(501).json({ message: 'Legacy verify bank account to be migrated' });
    } catch (err) { next(err); }
};

exports.triggerReminders = async (req, res, next) => {
    try {
        res.status(501).json({ message: 'Legacy reminders trigger to be migrated' });
    } catch (err) { next(err); }
};

exports.getTransactions = async (req, res, next) => {
    try {
        res.status(501).json({ message: 'Moved to transaction routes' });
    } catch (err) { next(err); }
};
