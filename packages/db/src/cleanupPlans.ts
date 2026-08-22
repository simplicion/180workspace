import { prisma } from './index';

async function cleanupPlans() {
    console.log("Starting plan cleanup...");
    const plans = await prisma.plan.findMany({
        orderBy: { createdAt: 'desc' }
    });

    console.log("Total plans found:", plans.length);

    // Identify the valid plans we want to keep
    const validKickstart = plans.find(p => p.planName === '180 Kickstart' && p.price === 10);
    const validMomentum = plans.find(p => p.planName === '180 Momentum' && p.price === 12);
    const validLimitless = plans.find(p => p.planName === '180 Limitless' && p.price === 15);

    if (!validKickstart || !validMomentum || !validLimitless) {
        console.error("Missing one of the target valid plans ($10/$12/$15). Cannot proceed safely.");
        console.log("Found plans:");
        plans.forEach(p => console.log(`${p.planName} - $${p.price} (${p.id})`));
        return;
    }

    console.log("Target Valid Plans:");
    console.log(`Kickstart: ${validKickstart.id}`);
    console.log(`Momentum: ${validMomentum.id}`);
    console.log(`Limitless: ${validLimitless.id}`);

    const validPlanIds = [validKickstart.id, validMomentum.id, validLimitless.id];

    for (const plan of plans) {
        if (validPlanIds.includes(plan.id)) {
            continue; // Keep these
        }

        console.log(`Processing legacy plan: ${plan.planName} - $${plan.price} (${plan.id})`);

        // Check if subscriptions exist for this plan
        const subsCount = await prisma.subscription.count({
            where: { planId: plan.id }
        });

        if (subsCount > 0) {
            console.log(`  Plan has ${subsCount} subscriptions. Re-mapping them...`);
            // Determine which valid plan to map to
            let targetId = validKickstart.id;
            if (plan.planName.toLowerCase().includes('momentum')) {
                targetId = validMomentum.id;
            } else if (plan.planName.toLowerCase().includes('limitless') || plan.price > 12) {
                targetId = validLimitless.id;
            }

            await prisma.subscription.updateMany({
                where: { planId: plan.id },
                data: { planId: targetId }
            });
            console.log(`  Re-mapped subscriptions to ${targetId}`);
        }

        // Delete the plan
        await prisma.plan.delete({
            where: { id: plan.id }
        });
        console.log(`  Deleted plan ${plan.id}`);
    }

    console.log("Cleanup completed!");
}

cleanupPlans().catch(console.error).finally(() => prisma.$disconnect());
