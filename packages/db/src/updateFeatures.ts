import { prisma } from './index';

async function updatePlanFeatures() {
    console.log("Searching for plans with 'Dedicated Account Manager'...");
    
    const plans = await prisma.plan.findMany();

    for (const plan of plans) {
        if (!plan.features || !Array.isArray(plan.features)) continue;
        
        let changed = false;
        const newFeatures = plan.features.map(feature => {
            if (feature === 'Dedicated Account Manager') {
                changed = true;
                return 'Dedicated Team Support';
            }
            return feature;
        });

        if (changed) {
            console.log(`Updating features for ${plan.planName} (ID: ${plan.id})...`);
            await prisma.plan.update({
                where: { id: plan.id },
                data: { features: newFeatures }
            });
            console.log(`Successfully updated ${plan.planName}!`);
        }
    }

    console.log("Done.");
}

updatePlanFeatures().catch(console.error).finally(() => prisma.$disconnect());
