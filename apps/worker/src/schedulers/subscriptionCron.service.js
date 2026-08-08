'use strict';

/**
 * Subscription Cron Service â€” Multi-company (migrated to Prisma/PostgreSQL)
 * Runs daily to handle auto-charges and send subscription-related reminders.
 */

const cron = require('node-cron');
const { prisma, getCompanyPrisma } = require('@workspace/db');
const EmailService = require('../../../backend/src/app-registry/productivity-tools-app/emails/email.service');
const BillingService = require('../../../backend/src/app-registry/finance-app/bills/billing.service');
const LifecycleService = require('../../../backend/src/app-registry/superadmin/system-operations/lifecycle.service');

const REMINDER_DAYS = [5, 4, 3, 2, 1];

// Helper to find the company admin details
async function getCompanyAdmin(companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return null;
    return { email: company.adminEmail, name: company.adminName };
}

// â”€â”€â”€ Expire Stale Subscriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function expireSubscriptions() {
    const now = new Date();

    // Expire trials
    const expiredTrials = await prisma.subscription.findMany({
        where: { status: 'trial', trialEndDate: { lt: now } }
    });
    for (const sub of expiredTrials) {
        await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'expired' }
        });
        try {
            const admin = await getCompanyAdmin(sub.companyId);
            const companyPrisma = getCompanyPrisma(sub.companyId);
            if (admin) await EmailService.notify(admin, 'trial_expired', { adminName: admin.name }, companyPrisma);
        } catch (e) { /* non-fatal */ }
    }

    // Expire paid subscriptions
    const expiredPaid = await prisma.subscription.findMany({
        where: { status: 'active', subscriptionEndDate: { lt: now } }
    });
    for (const sub of expiredPaid) {
        await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'expired' }
        });
    }

    const total = expiredTrials.length + expiredPaid.length;
    if (total > 0) console.log(`[SubscriptionCron] Expired ${total} subscription(s)`);
}

// â”€â”€â”€ Send Expiry Reminders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function sendExpiryReminders() {
    const now = new Date();
    let reminderCount = 0;

    for (const daysLeft of REMINDER_DAYS) {
        const windowStart = new Date(now);
        const windowEnd = new Date(now);
        windowStart.setDate(windowStart.getDate() + daysLeft);
        windowStart.setHours(0, 0, 0, 0);
        windowEnd.setDate(windowEnd.getDate() + daysLeft);
        windowEnd.setHours(23, 59, 59, 999);

        // Trial reminders
        const trialSubs = await prisma.subscription.findMany({
            where: {
                status: 'trial',
                trialEndDate: { gte: windowStart, lte: windowEnd },
            }
        });

        for (const sub of trialSubs) {
            const remindersSent = Array.isArray(sub.remindersSent) ? sub.remindersSent : [];
            if (remindersSent.some(r => r.type === 'trial' && r.daysLeft === daysLeft)) continue;
            try {
                const admin = await getCompanyAdmin(sub.companyId);
                const companyPrisma = getCompanyPrisma(sub.companyId);
                if (admin) {
                    await EmailService.notify(admin, 'trial_reminder', { adminName: admin.name, daysLeft }, companyPrisma);
                    remindersSent.push({ type: 'trial', daysLeft, sentAt: new Date().toISOString() });
                    await prisma.subscription.update({
                        where: { id: sub.id },
                        data: { remindersSent }
                    });
                    reminderCount++;
                }
            } catch (e) { console.error('[SubscriptionCron] Trial reminder error:', e.message); }
        }

        // Paid subscription reminders
        const paidSubs = await prisma.subscription.findMany({
            where: {
                status: 'active',
                subscriptionEndDate: { gte: windowStart, lte: windowEnd },
            },
            include: { plan: true }
        });

        for (const sub of paidSubs) {
            const remindersSent = Array.isArray(sub.remindersSent) ? sub.remindersSent : [];
            if (remindersSent.some(r => r.type === 'subscription' && r.daysLeft === daysLeft)) continue;
            try {
                const admin = await getCompanyAdmin(sub.companyId);
                const companyPrisma = getCompanyPrisma(sub.companyId);
                if (admin) {
                    const planName = sub.plan?.planName || 'Subscription';
                    await EmailService.notify(admin, 'renewal_reminder', { 
                        adminName: admin.name, 
                        planName, 
                        daysLeft, 
                        renewalDate: sub.subscriptionEndDate 
                    }, companyPrisma);
                    remindersSent.push({ type: 'subscription', daysLeft, sentAt: new Date().toISOString() });
                    await prisma.subscription.update({
                        where: { id: sub.id },
                        data: { remindersSent }
                    });
                    reminderCount++;
                }
            } catch (e) { console.error('[SubscriptionCron] Renewal reminder error:', e.message); }
        }
    }

    if (reminderCount > 0) console.log(`[SubscriptionCron] Sent ${reminderCount} reminder email(s)`);
}

// â”€â”€â”€ Process Auto-Charges (e-Mandate) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runAutoCharges() {
    console.log('[SubscriptionCron] Checking for auto-charges...');
    const now = new Date();

    // Find subscriptions that are due for a charge and have a mandate setup
    const dueSubscriptions = await prisma.subscription.findMany({
        where: {
            autopayEnabled: true,
            mandateStatus: 'authorized',
            nextChargeDate: { lte: now },
            status: { in: ['trial', 'active'] },
        }
    });

    if (dueSubscriptions.length === 0) {
        console.log('[SubscriptionCron] No auto-charges due today.');
        return;
    }

    console.log(`[SubscriptionCron] Found ${dueSubscriptions.length} subscription(s) due for auto-charge.`);

    for (const sub of dueSubscriptions) {
        try {
            console.log(`[SubscriptionCron] Initiating charge for subscription ${sub.id}`);
            await BillingService.chargeRecurring(sub);
            console.log(`[SubscriptionCron] Successfully initiated charge for subscription ${sub.id}. Webhook will complete the cycle.`);
        } catch (err) {
            console.error(`[SubscriptionCron] Failed to initiate charge for sub ${sub.id}:`, err.message);
            await BillingService.handleAutopayFailure(sub.id);
        }
    }
}

// â”€â”€â”€ Run All Jobs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runAllJobs() {
    console.log('[SubscriptionCron] Running...');
    try {
        // 0. Process Auto Charges first (so renewals happen before expiry)
        await runAutoCharges();

        // 1. Core Lifecycle (Trials)
        await LifecycleService.checkExpirations();
        await LifecycleService.checkDeletionWarnings();
        await LifecycleService.cleanupExpiredData();

        // 2. Original Subscriptions
        await expireSubscriptions();
        await sendExpiryReminders();

        console.log('[SubscriptionCron] Done.');
    } catch (err) {
        console.error('[SubscriptionCron] Job error:', err.message);
    }
}

// â”€â”€â”€ Start Cron â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.start = () => {
    // Daily at 08:00 IST = 02:30 UTC
    cron.schedule('30 2 * * *', runAllJobs, { timezone: 'UTC' });
    console.log('[SubscriptionCron] Scheduled â€” runs daily at 08:00 IST');
};

exports.runNow = runAllJobs;

