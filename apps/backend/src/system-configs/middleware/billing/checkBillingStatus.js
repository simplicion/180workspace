const { PRICING_PLANS } = require('@workspace/common');

const checkBillingStatus = async (req, res, next) => {
    // Skip billing check for specific routes
    const openRoutes = [
        '/api/auth',
        '/api/billing', // allow access to billing so they can upgrade
        '/api/webhooks'
    ];

    if (openRoutes.some(route => req.path.startsWith(route))) {
        return next();
    }

    const company = req.company;
    
    if (!company) {
        return next(); // Let auth middleware handle missing company
    }

    const now = new Date();
    const trialEndsAt = company.trialEndDate ? new Date(company.trialEndDate) : null;
    
    // Check if trial is expired
    if (trialEndsAt && now > trialEndsAt && company.subscriptionStatus === 'trial') {
        return res.status(402).json({
            error: 'Trial Expired',
            message: 'Your 14-day free trial has expired. Please upgrade your plan to continue using the workspace.',
            code: 'TRIAL_EXPIRED'
        });
    }

    // Check if subscription is cancelled/expired
    if (company.subscriptionStatus === 'expired' || company.subscriptionStatus === 'cancelled') {
        return res.status(402).json({
            error: 'Subscription Expired',
            message: 'Your subscription has expired or been cancelled. Please renew your plan.',
            code: 'SUBSCRIPTION_EXPIRED'
        });
    }

    next();
};

module.exports = checkBillingStatus;
