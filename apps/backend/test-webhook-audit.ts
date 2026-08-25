import { prisma } from '@workspace/db';
import { BillingService } from '@workspace/platform-billing/src/billing/billing.service';


async function run() {
    console.log('--- Starting Webhook Audit Test ---');
    try {
        // 1. Setup Test Data
        console.log('Setting up test company and plan...');
        
        // Clean up from previous tests
        const oldCompany = await prisma.company.findFirst({ where: { name: 'Audit Test Company' } });
        if (oldCompany) {
            await prisma.companyConfig.deleteMany({ where: { companyId: oldCompany.id } });
            await prisma.subscription.deleteMany({ where: { companyId: oldCompany.id } });
            await prisma.company.delete({ where: { id: oldCompany.id } });
        }
        await prisma.plan.deleteMany({ where: { planName: 'Audit Test Plan' } });
        
        const plan = await prisma.plan.create({
            data: {
                planName: 'Audit Test Plan',
                price: 5000,
                currency: 'INR',
                billingCycle: 'monthly',
                isActive: true,
            }
        });

        const company = await prisma.company.create({
            data: {
                name: 'Audit Test Company',
                slug: `audit-test-${Date.now()}`,
                adminEmail: 'test@audit.com'
            }
        });

        const providerSubId = `sub_${Date.now()}`;

        // 2. Scenario 1: User Drops Off before `/verify`
        // Action: Razorpay triggers webhook: `SUBSCRIPTION_CHARGED`
        console.log('\n[Scenario 1] User drops off. Webhook triggers for SUBSCRIPTION_CHARGED...');
        
        const eventData = {
            subscriptionId: providerSubId,
            notes: {
                companyId: company.id,
                planId: plan.id
            }
        };

        const result1 = await BillingService.handleWebhookEvent('SUBSCRIPTION_CHARGED', eventData, `evt_1_${Date.now()}`);
        console.log('Result:', result1);

        // Verify it created a subscription
        const sub1 = await prisma.subscription.findFirst({
            where: { companyId: company.id, status: 'ACTIVE' }
        });
        
        if (sub1 && sub1.providerSubscriptionId === providerSubId) {
            console.log('âœ… Success: Drop-off recovery created the subscription correctly.');
        } else {
            console.error('âŒ Failed: Subscription was not created properly.', sub1);
        }

        // 3. Scenario 2: Idempotency Check
        console.log('\n[Scenario 2] Idempotency Check...');
        const eventId2 = `evt_2_${Date.now()}`;
        const result2a = await BillingService.handleWebhookEvent('SUBSCRIPTION_CHARGED', eventData, eventId2);
        console.log('First Call Result:', result2a);
        const result2b = await BillingService.handleWebhookEvent('SUBSCRIPTION_CHARGED', eventData, eventId2);
        console.log('Second Call Result:', result2b);

        if (result2b.status === 'ignored' && result2b.reason === 'duplicate') {
            console.log('âœ… Success: Idempotency correctly prevented double processing.');
        } else {
            console.error('âŒ Failed: Idempotency check failed.');
        }

        // 4. Scenario 3: Regular Auto-Renew (Subscription already exists and is active)
        console.log('\n[Scenario 3] Regular Auto-Renew...');
        
        // Wait 1 second to ensure we can see date changes if any
        await new Promise(r => setTimeout(r, 1000));
        
        const currentEndDate = sub1!.subscriptionEndDate;
        const result3 = await BillingService.handleWebhookEvent('SUBSCRIPTION_CHARGED', eventData, `evt_3_${Date.now()}`);
        console.log('Result:', result3);

        const sub3 = await prisma.subscription.findFirst({
            where: { companyId: company.id, status: 'ACTIVE' }
        });

        if (sub3 && currentEndDate && sub3.subscriptionEndDate && sub3.subscriptionEndDate.getTime() > currentEndDate.getTime()) {
            console.log('âœ… Success: Subscription successfully auto-renewed and endDate was extended.');
        } else {
            console.error('âŒ Failed: Auto-renew failed to extend the end date.', { old: currentEndDate, new: sub3?.subscriptionEndDate });
        }
        
    } catch (err) {
        console.error('Test failed with error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
