import { Request, Response, NextFunction } from 'express';
import { prisma } from '@workspace/db';

const featureFlagGuard = (featureKey: string) => {
    return async (req: any, res: Response, next: NextFunction) => {
        const company = req.company;
        if (!company) {
            return next();
        }

        const subscription = await prisma.subscription.findFirst({
            where: { companyId: company.id, status: { in: ['ACTIVE', 'active', 'trial', 'TRIAL'] } },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });

        let plan = subscription?.plan;
        
        if (!plan) {
             plan = await prisma.plan.findFirst({
                 where: { planName: { contains: 'Kickstart' } }
             }) as any;
        }

        if (!plan) {
            return res.status(403).json({ error: 'Plan details not found.' });
        }

        let hasAccess = false;
        if (featureKey === 'hasAIAssistant') {
            hasAccess = plan.features.some((f: any) => {
                const lower = f.toLowerCase();
                return lower.includes('ai') || lower.includes('assistant') || lower.includes('all') || lower.includes('tools');
            });
        } else if (featureKey === 'hasEmailServices') {
            hasAccess = plan.features.some((f: any) => {
                const lower = f.toLowerCase();
                return lower.includes('email') || lower.includes('smtp') || lower.includes('all');
            });
        } else {
            hasAccess = plan.features.some((f: any) => f.toLowerCase().includes(featureKey.toLowerCase()) || f.toLowerCase().includes('all'));
        }

        if (!hasAccess) {
            return res.status(403).json({
                error: 'Feature Restricted',
                message: `This feature is not available on the ${plan.planName} plan. Please upgrade your plan to access this feature.`,
                code: 'FEATURE_RESTRICTED'
            });
        }

        next();
    };
};

export default featureFlagGuard;
