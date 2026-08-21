import { PRICING_PLANS } from '@workspace/common';
import { Request, Response, NextFunction } from 'express';

const featureFlagGuard = (featureKey: string) => {
    return async (req: any, res: Response, next: NextFunction) => {
        const company = req.company;
        if (!company) {
            return next();
        }

        const planId = company.subscriptionPlan || 'starter';
        const plan = (PRICING_PLANS as any)[planId];

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

export default featureFlagGuard;
