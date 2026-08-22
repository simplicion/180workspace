import { prisma } from './src/index';

async function main() {
    const plans = await prisma.plan.findMany({
        where: {
            planName: {
                contains: 'Test',
                mode: 'insensitive'
            }
        }
    });

    for (const plan of plans) {
        await prisma.subscription.deleteMany({
            where: {
                planId: plan.id
            }
        });
        await prisma.plan.delete({
            where: {
                id: plan.id
            }
        });
        console.log(`Deleted test plan: ${plan.planName}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
