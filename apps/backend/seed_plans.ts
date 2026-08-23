import { prisma } from '@workspace/db';

async function main() {
    console.log('Seeding plans...');

    const plans = [
        {
            planName: '180 Kickstart',
            price: 0, // USD
            currency: 'USD',
            billingCycle: 'monthly',
            maxUsers: 2,
            maxWebsites: 1,
            maxApps: 5,
            maxStorageBytes: 1 * 1024 * 1024 * 1024, // 1GB
            features: [
                'Access to 5 Apps',
                'Up to 2 Team Members',
                '1 Website',
                '1GB Cloud Storage',
                'Standard Support'
            ],
            isActive: true,
            trialDays: 0
        },
        {
            planName: '180 Momentum',
            price: 12, // USD
            currency: 'USD',
            billingCycle: 'monthly',
            maxUsers: 5,
            maxWebsites: 5,
            maxApps: 7,
            maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
            features: [
                'Access to 7 Apps',
                'Up to 5 Team Members',
                'Up to 5 Websites',
                '10GB Cloud Storage',
                'Priority Support',
                'AI Assistant Access',
                'Custom Email SMTP'
            ],
            isActive: true,
            trialDays: 14
        },
        {
            planName: '180 Limitless',
            price: 15, // USD
            currency: 'USD',
            billingCycle: 'monthly',
            maxUsers: 20,
            maxWebsites: -1, // unlimited
            maxApps: 999, // practically unlimited
            maxStorageBytes: 20 * 1024 * 1024 * 1024, // 20GB
            features: [
                'Unlimited Access to All Apps',
                'Up to 20 Team Members',
                'Unlimited Websites',
                '20GB Cloud Storage',
                'Dedicated Team Support',
                'AI Assistant Access',
                'Custom Email SMTP'
            ],
            isActive: true,
            trialDays: 14
        }
    ];

    for (const plan of plans) {
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

    console.log('Finished seeding plans.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
