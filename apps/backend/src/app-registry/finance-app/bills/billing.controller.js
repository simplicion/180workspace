'use strict';

/**
 * Billing Controller â€” Handles e-Mandate flows and sub management (migrated to Prisma/PostgreSQL)
 */

const BillingService = require('./billing.service');
const EmailService = require('../../productivity-tools-app/emails/email.service');
const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
const { prisma } = require('@workspace/db');

// â”€â”€â”€ GET /api/billing/status â€” Current subscription & autopay status â”€â”€â”€â”€â”€â”€â”€â”€
exports.getStatus = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        const settings = await prisma.platformSettings.findFirst() || {};

        const sub = await BillingService.getActiveSubscription(companyId);
        const countdown = BillingService.getTrialCountdown(sub);

        res.json({
            companyName: company?.name || 'Platform Company',
            subscriptionStatus: company?.subscriptionStatus || 'trial',
            trialEndDate: company?.trialEndDate || sub?.trialEndDate || null,
            trialStartDate: company?.trialStartDate || sub?.trialStartDate || null,
            autopayEnabled: company?.autopayEnabled || sub?.autopayEnabled || false,
            mandateStatus: company?.mandateStatus || sub?.mandateStatus || 'pending',
            nextChargeDate: company?.nextChargeDate || sub?.nextChargeDate || null,
            dataDeletionDate: null,
            countdown,
            planName: sub?.plan?.planName || 'Free Trial',
            planPrice: sub?.plan?.price || 0,
            currency: sub?.plan?.currency || 'INR',
            billingCycle: sub?.plan?.billingCycle || 'monthly',
            paymentsEnabled: !!settings.paymentsEnabled,
            platformName: settings.platformName || '180workspace'
        });
    } catch (err) { next(err); }
};

// â”€â”€â”€ GET /api/billing/plans â€” Fetch available plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.getPlans = async (req, res, next) => {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });
        const settings = await prisma.platformSettings.findFirst() || {};

        res.json({
            plans: plans.map(p => ({ ...p, _id: p.id })),
            paymentsEnabled: !!settings.paymentsEnabled,
            trialMandateAmount: settings.trialMandateAmount || 100,
            trialDays: settings.trialDays || 14
        });
    } catch (err) { next(err); }
};

// â”€â”€â”€ POST /api/billing/mandate/initiate â€” Start â‚¹1 Trial Mandate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.initiateMandate = async (req, res, next) => {
    try {
        const { planId } = req.body;
        if (!planId) return res.status(400).json({ error: 'Plan ID required' });

        const result = await BillingService.initiateMandateOrder(planId);
        res.json(result);
    } catch (err) { next(err); }
};

// â”€â”€â”€ POST /api/billing/mandate/verify â€” Verify Auth & Start Trial â”€â”€â”€â”€â”€â”€â”€â”€
exports.verifyMandate = async (req, res, next) => {
    try {
        const { providerOrderId, providerPaymentId, signature, providerSubscriptionId, planId } = req.body;
        if (!providerOrderId || !providerPaymentId || !signature || !planId) {
            return res.status(400).json({ error: 'Missing required payment verification fields' });
        }

        const result = await BillingService.verifyMandate({
            orderId: providerOrderId,
            paymentId: providerPaymentId,
            signature,
            tokenId: providerSubscriptionId,
            planId,
            companyId: req.user.companyId
        });

        // Send confirmation email
        try {
            const settings = await prisma.platformSettings.findFirst() || {};
            await EmailService.notify(req.user, 'subscription_confirmation', {
                planName: result.plan.planName,
                amount: (settings.trialMandateAmount || 100) / 100, // â‚¹1
                expiryDate: result.subscription.trialEndDate
            }, req.prisma);
        } catch (emailErr) {
            console.error('[Billing] Subscription confirmation email failed:', emailErr.message);
        }

        // Log Activity in Tenant DB
        try {
            await AutomationService.trigger({
                eventType: 'subscription_started',
                triggeredBy: req.user.id,
                description: `Trial started for ${result.plan.planName} plan.`,
                metadata: { planName: result.plan.planName, trialEndDate: result.subscription.trialEndDate }
            }, req.prisma);
        } catch (logErr) {
            console.error('[Billing Controller] Failed to log activity:', logErr.message);
        }

        res.json({
            success: true,
            subscription: {
                ...result.subscription,
                _id: result.subscription.id
            },
            plan: {
                ...result.plan,
                _id: result.plan.id
            },
            providerName: result.subscription.provider,
            message: `Trial started! Mandate authorized successfully.`
        });
    } catch (err) {
        if (err.message && err.message.includes('signature mismatch')) {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

// â”€â”€â”€ POST /api/billing/activate â€” Manual Activation (after trial ends) â”€â”€â”€â”€â”€â”€
exports.activatePlan = async (req, res, next) => {
    try {
        const { planId, providerOrderId, providerPaymentId, signature, providerSubscriptionId, couponCode } = req.body;

        if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
        }

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        // Only require payment details if price > 0
        if (plan.price > 0) {
            if (!providerOrderId || !providerPaymentId || !signature) {
                return res.status(400).json({ error: 'Missing required payment fields' });
            }
        }

        const result = await BillingService.activateManualPlan({
            planId,
            orderId: providerOrderId,
            paymentId: providerPaymentId,
            signature,
            tokenId: providerSubscriptionId,
            couponCode,
            companyId: req.user.companyId
        });

        try {
            await EmailService.notify(req.user, 'subscription_confirmation', {
                planName: result.plan.planName,
                amount: result.subscription.amount,
                expiryDate: result.subscription.subscriptionEndDate
            }, req.prisma);
        } catch (emailErr) {
            console.error('[Billing] Activation confirmation email failed:', emailErr.message);
        }

        // Log Activity in Tenant DB
        try {
            await AutomationService.trigger({
                eventType: 'plan_activated',
                triggeredBy: req.user.id,
                description: `${result.plan.planName} plan activated.`,
                metadata: { planName: result.plan.planName, expiry: result.subscription.subscriptionEndDate }
            }, req.prisma);
        } catch (logErr) {
            console.error('[Billing Controller] Failed to log activity:', logErr.message);
        }

        res.json({
            success: true,
            subscription: {
                ...result.subscription,
                _id: result.subscription.id
            },
            plan: {
                ...result.plan,
                _id: result.plan.id
            },
            message: `${result.plan.planName} plan activated successfully!`
        });
    } catch (err) {
        if (err.message && err.message.includes('signature mismatch')) {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

// â”€â”€â”€ POST /api/billing/cancel-autopay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.cancelAutopay = async (req, res, next) => {
    try {
        const subscription = await BillingService.cancelAutopay(req.user.companyId);
        // Log Activity in Tenant DB
        try {
            await AutomationService.trigger({
                eventType: 'autopay_cancelled',
                triggeredBy: req.user.id,
                description: 'Subscription autopay was cancelled.',
            }, req.prisma);
        } catch (logErr) {
            console.error('[Billing Controller] Failed to log activity:', logErr.message);
        }

        res.json({
            success: true,
            message: 'Autopay has been cancelled. Your access will remain until the end of your current billing period.',
            subscription: {
                ...subscription,
                _id: subscription.id
            }
        });
    } catch (err) { next(err); }
};

// â”€â”€â”€ POST /api/billing/resume-autopay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.resumeAutopay = async (req, res, next) => {
    try {
        // Technically this just returns a new mandate order, then frontend calls verifyMandate
        const sub = await BillingService.getCurrentSubscription(req.user.companyId);
        if (!sub || !sub.planId) return res.status(400).json({ error: 'No active plan found' });
        const result = await BillingService.initiateMandateOrder(sub.planId);
        res.json(result);
    } catch (err) { next(err); }
};

// â”€â”€â”€ GET /api/billing/history â€” Transaction history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.getHistory = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const subscriptions = await prisma.subscription.findMany({
            where: { companyId },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });

        // Map plans to planId compatibility object so the frontend gets what it expects
        const mappedSubscriptions = subscriptions.map(sub => ({
            ...sub,
            _id: sub.id,
            planId: sub.plan ? {
                _id: sub.plan.id,
                planName: sub.plan.planName,
                price: sub.plan.price,
                currency: sub.plan.currency
            } : null
        }));

        res.json({ subscriptions: mappedSubscriptions });
    } catch (err) { next(err); }
};

// â”€â”€â”€ POST /api/billing/coupon â€” Validate coupon code â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.validateCoupon = async (req, res, next) => {
    try {
        const { couponCode, planId } = req.body;
        if (!couponCode || !planId) return res.status(400).json({ error: 'Coupon code and plan ID required' });

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        const result = await BillingService.applyCoupon(couponCode.toUpperCase(), plan.price);
        res.json({
            valid: true,
            couponCode: couponCode.toUpperCase(),
            discountAmount: result.discountAmount,
            finalAmount: result.finalAmount,
            originalAmount: plan.price,
            discountType: result.coupon.discountType,
            discountValue: result.coupon.discountValue,
        });
    } catch (err) {
        if (err.message && (err.message.includes('Invalid') || err.message.includes('expired') || err.message.includes('limit'))) {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

// â”€â”€â”€ POST /api/billing/cron-test â€” Manual cron trigger (debug) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.triggerCron = async (req, res, next) => {
    try {
        res.status(501).json({ message: 'Cron job moved to worker app' });
    } catch (err) { next(err); }
};
