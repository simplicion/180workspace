import { prisma } from '@workspace/db';

export const SOCIAL_STUDIO_PLANS = [
    {
        planName: '180 Social Studio Creator (Monthly)',
        price: 20, // $20 USD per month
        currency: 'USD',
        billingCycle: 'monthly',
        maxUsers: 1,
        maxWebsites: 0,
        maxApps: 1,
        maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50GB video storage
        features: [
            'Full Access to 180 Social Studio & AI Director',
            'Unlimited 4K Teleprompter Recording Takes',
            'Native Video Timeline Editor with Remotion Engine',
            '1-Click Direct Multi-Platform Publishing',
            '3-Day Free Creator Trial Included'
        ],
        isActive: true,
        trialDays: 3, // 3-Day Free Trial
        providerPlanId: 'plan_social_studio_monthly_20'
    },
    {
        planName: '180 Social Studio Flexible Daily Pass',
        price: 0.71, // $0.714/day ($20 / 28 days baseline)
        currency: 'USD',
        billingCycle: 'daily',
        maxUsers: 1,
        maxWebsites: 0,
        maxApps: 1,
        maxStorageBytes: 25 * 1024 * 1024 * 1024,
        features: [
            'Pay-As-You-Go Daily Pass (Recharge & Use)',
            'Slide to Choose 1 to 28 Days Access',
            'Full Studio & Publishing Access for Selected Days',
            'Recharge Anytime Without Recurring Commitment'
        ],
        isActive: true,
        trialDays: 0,
        providerPlanId: 'plan_social_studio_daily_pass'
    }
];

async function seedSocialStudioPlans() {
    console.log('Seeding 180 Social Studio Plans...');
    for (const plan of SOCIAL_STUDIO_PLANS) {
        const existing = await prisma.plan.findFirst({
            where: { planName: plan.planName }
        });

        if (existing) {
            await prisma.plan.update({
                where: { id: existing.id },
                data: plan
            });
            console.log(`Updated plan: ${plan.planName}`);
        } else {
            await prisma.plan.create({
                data: plan
            });
            console.log(`Created plan: ${plan.planName}`);
        }
    }
    console.log('Successfully seeded 180 Social Studio Plans.');
}

if (require.main === module) {
    seedSocialStudioPlans()
        .catch(err => {
            console.error('Failed to seed plans:', err);
            process.exit(1);
        })
        .finally(() => prisma.$disconnect());
}

export { seedSocialStudioPlans };
