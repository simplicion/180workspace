import { prisma } from './src/index.js';

async function main() {
    console.log('Fixing company subscription statuses...');
    
    // Set all companies to 'active' if they are currently 'trial'
    const companyRes = await prisma.company.updateMany({
        where: { subscriptionStatus: 'trial' },
        data: {
            subscriptionStatus: 'active',
            trialStartDate: null,
            trialEndDate: null
        }
    });
    
    console.log(`Updated ${companyRes.count} companies from trial to active.`);
    
    // Also update any subscriptions that might be marked as trial
    const subRes = await prisma.subscription.updateMany({
        where: { status: 'trial' },
        data: {
            status: 'ACTIVE',
            trialStartDate: null,
            trialEndDate: null
        }
    });
    
    console.log(`Updated ${subRes.count} subscriptions from trial to ACTIVE.`);
    
    console.log('Done!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
