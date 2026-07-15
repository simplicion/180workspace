'use strict';

/**
 * Subscription Guard Middleware
 * Returns 403 with { subscriptionExpired: true } if subscription has expired.
 */

const BillingService = require('../../../app-registry/finance-app/bills/billing.service');

module.exports = async function subscriptionGuard(req, res, next) {
    try {
        // Bypass for billing, auth, health, and super admin routes
        const url = req.originalUrl || req.path;
        const bypassPrefixes = ['/api/billing', '/api/auth', '/health', '/api/superadmin', '/api/support', '/api/webhooks'];
        if (bypassPrefixes.some(p => url.startsWith(p))) return next();
        if (!req.user) return next();

        const sub = await BillingService.getCurrentSubscription(req.user.companyId);
        const countdown = BillingService.getTrialCountdown(sub);

        // Check Account Status (Lifecycle)
        if (req.company && req.company.accountStatus === 'trial_expired') {
            return res.status(403).json({
                subscriptionExpired: true,
                status: 'trial_expired',
                message: 'Your trial period has ended. Your data is preserved for a limited retention period. Please upgrade to a paid plan to restore access.',
                upgradeUrl: '/dashboard/billing',
            });
        }

        if (countdown.isExpired) {
            return res.status(403).json({
                subscriptionExpired: true,
                status: sub?.status || 'expired',
                message: 'Your subscription has expired. Please upgrade to continue.',
                upgradeUrl: '/dashboard/billing',
            });
        }

        req.subscription = countdown;
        next();
    } catch (err) {
        // Fail open â€” never block requests due to billing errors
        console.error('[SubscriptionGuard] Error:', err.message);
        next();
    }
};

