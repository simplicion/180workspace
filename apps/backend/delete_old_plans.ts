import { prisma } from '@workspace/db';

async function main() {
    const plans = await prisma.plan.findMany();
    console.log('Total plans before:', plans.length);
    
    // We want to keep only one of each: 10, 12, 15
    const keepIds = [];
    const seenPrices = new Set();
    
    // Sort by descending created at, so we keep the latest ones
    plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    for (const plan of plans) {
        if ([10, 12, 15].includes(plan.price) && !seenPrices.has(plan.price)) {
            keepIds.push(plan.id);
            seenPrices.add(plan.price);
        }
    }
    
    console.log('Keeping IDs:', keepIds);
    
    // Check if we can safely delete the others. If there's a subscription, we might fail due to FK constraints.
    // In that case, we can set isActive = false, or delete if possible.
    for (const plan of plans) {
        if (!keepIds.includes(plan.id)) {
            try {
                // Try to delete
                await prisma.plan.delete({ where: { id: plan.id } });
                console.log(`Deleted plan ${plan.planName} - $${plan.price}`);
            } catch (err) {
                // If it fails (e.g., active subscription), just mark it as inactive
                await prisma.plan.update({ where: { id: plan.id }, data: { isActive: false } });
                console.log(`Marked plan ${plan.planName} - $${plan.price} as inactive due to active subscriptions`);
            }
        }
    }
    
    console.log('Done cleaning plans.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
