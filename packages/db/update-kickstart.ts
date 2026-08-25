import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePlan() {
    await prisma.plan.updateMany({
        where: { planName: '180 Kickstart' },
        data: { price: 0 }
    });
    console.log('Updated 180 Kickstart price to 0');
}

updatePlan().catch(console.error).finally(() => prisma.$disconnect());
