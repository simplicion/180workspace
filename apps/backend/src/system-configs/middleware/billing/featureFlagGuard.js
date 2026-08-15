const { PRICING_PLANS } = require('@workspace/common');

const featureFlagGuard = (featureKey) => {
    return async (req, res, next) => {
        const company = req.company;
        if (!company) {
            return next();
        }

        const planId = company.subscriptionPlan || 'starter';
        const plan = PRICING_PLANS[planId];

        if (!plan) {
            return res.status(403).json({ error: 'Plan details not found.' });
        }

        const hasAccess = plan.features[featureKey];

        if (!hasAccess) {
            return res.status(403).json({
                error: 'Feature Restricted',
                message: `The ${featureKey} feature is not available on the ${plan.name} plan. Please upgrade your plan to access this feature.`,
                code: 'FEATURE_RESTRICTED'
            });
        }

        next();
    };
};

module.exports = featureFlagGuard;
