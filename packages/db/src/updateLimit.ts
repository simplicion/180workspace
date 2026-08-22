import { prisma } from './index';

async function updateLimitlessPlan() {
    console.log("Updating Limitless plan limit to 20 users...");
    
    const limitPlan = await prisma.plan.findFirst({
        where: {
            planName: '180 Limitless',
            price: 15
        }
    });

    if (!limitPlan) {
        console.error("Could not find the 180 Limitless plan.");
        return;
    }

    const updated = await prisma.plan.update({
        where: { id: limitPlan.id },
        data: {
            maxUsers: 20
        }
    });

    console.log(`Successfully updated plan ${updated.planName} (ID: ${updated.id})`);
    console.log(`New maxUsers limit: ${updated.maxUsers}`);
}

updateLimitlessPlan().catch(console.error).finally(() => prisma.$disconnect());
