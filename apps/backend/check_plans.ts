import { prisma } from '@workspace/db';

async function main() {
    const plans = await prisma.plan.findMany();
    for (const plan of plans) {
        console.log(`Plan: ${plan.planName}, Price: $${plan.price}, maxUsers: ${plan.maxUsers}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
