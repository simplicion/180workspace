import { PrismaClient } from './generated/client/index.js';

const prisma = new PrismaClient();

async function updatePlan() {
    let plan = await prisma.plan.findFirst({ where: { price: 0 } });
    if (!plan) {
        console.log('No price: 0 plan found. Searching by name...');
        plan = await prisma.plan.findFirst({ where: { planName: '180 Kickstart' } });
    }
    
    if (plan) {
        await prisma.plan.update({
            where: { id: plan.id },
            data: { maxApps: 5, planName: '180 Kickstart' }
        });
        console.log('Updated 180 Kickstart maxApps to 5');
    } else {
        await prisma.plan.create({
            data: {
                planName: '180 Kickstart',
                price: 0,
                interval: 'month',
                maxApps: 5,
                maxUsers: 1,
                maxStorage: 10,
                isActive: true
            }
        });
        console.log('Created 180 Kickstart plan with maxApps 5');
    }
}

updatePlan().catch(console.error).finally(() => prisma.$disconnect());
