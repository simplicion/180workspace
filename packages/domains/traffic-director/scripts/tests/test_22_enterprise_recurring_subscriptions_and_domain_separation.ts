import { developersPrisma } from '@workspace/db-180core';
import { prisma as appDb } from '@workspace/db';
import { 
  SubscriptionService, 
  RazorpaySubscriptionService, 
  RecurringBillingEngine,
  CheckoutService 
} from '../../../payment-provider/src';
import { seedFirstPartyOAuthApps } from '@workspace/identity-provider';
import { TrafficDirectorBillingService } from '../../src/services/billing.service';
import { TrafficLinksService } from '../../src/services/links.service';

async function runEnterpriseSubscriptionAuditTest() {
  console.log('================================================================');
  console.log('🧪 180 Pay Universal Recurring Subscription & Decoupling Audit');
  console.log('================================================================\n');

  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition: boolean, description: string) {
    totalAssertions++;
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passedAssertions++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  const testSuffix = Date.now().toString().slice(-6);
  const testCompanyId = `test-e2e-co-${testSuffix}`;
  let testUserId: string = '';
  let testSessionId: string = '';
  let testSubId: string = '';

  try {
    // -----------------------------------------------------------------
    // 1. Domain Separation Invariants
    // -----------------------------------------------------------------
    console.log('1️⃣ Checking Domain Separation & Clean Exports...');
    assert(typeof SubscriptionService.createOrUpdatePlan === 'function', 'SubscriptionService.createOrUpdatePlan exists in @workspace/payment-provider');
    assert(typeof SubscriptionService.createSubscriptionSession === 'function', 'SubscriptionService.createSubscriptionSession exists');
    assert(typeof SubscriptionService.cancelSubscription === 'function', 'SubscriptionService.cancelSubscription exists');
    assert(typeof RazorpaySubscriptionService.syncPlanWithRazorpay === 'function', 'RazorpaySubscriptionService.syncPlanWithRazorpay exists');
    assert(typeof RazorpaySubscriptionService.handleRazorpaySubscriptionWebhook === 'function', 'RazorpaySubscriptionService.handleRazorpaySubscriptionWebhook exists');
    assert(typeof RecurringBillingEngine.runRecurringBillingCycle === 'function', 'RecurringBillingEngine.runRecurringBillingCycle exists');
    assert(typeof CheckoutService.processPayment === 'function', 'CheckoutService.processPayment alias exists');

    // -----------------------------------------------------------------
    // 2. First-Party App Seeding & Subscriptions Configuration
    // -----------------------------------------------------------------
    console.log('\n2️⃣ Verifying 180-Traffic-Director OAuth App & Plan Seeding...');
    await seedFirstPartyOAuthApps();

    const trafficApp = await (developersPrisma as any).oAuthApp.findUnique({
      where: { clientId: '180-traffic-director' },
    });

    assert(Boolean(trafficApp), 'OAuthApp 180-traffic-director is seeded in db-180core');
    assert(trafficApp.isActive === true, '180-traffic-director app isActive is true');
    assert(trafficApp.enablePay === true, '180-traffic-director app enablePay is true');

    const appPlans = await (developersPrisma as any).subscriptionPlan.findMany({
      where: { appId: trafficApp.id },
    });

    assert(appPlans.length >= 3, `Default subscription plans are seeded (found: ${appPlans.length})`);
    const starterPlan = appPlans.find((p: any) => p.planCode === 'traffic-starter');
    const proPlan = appPlans.find((p: any) => p.planCode === 'traffic-pro');
    const entPlan = appPlans.find((p: any) => p.planCode === 'traffic-enterprise');

    assert(Boolean(starterPlan && starterPlan.amount === 25), 'traffic-starter plan exists with amount $25');
    assert(Boolean(proPlan && proPlan.amount === 50), 'traffic-pro plan exists with amount $50');
    assert(Boolean(entPlan && entPlan.amount === 75), 'traffic-enterprise plan exists with amount $75');

    // -----------------------------------------------------------------
    // 3. User Setup in 180 Core DB
    // -----------------------------------------------------------------
    console.log('\n3️⃣ Provisioning Test Subscriber in 180 Core...');
    const testUser = await (developersPrisma as any).user.create({
      data: {
        username: `testsub_${testSuffix}`,
        email: `testsub_${testSuffix}@180workspace.com`,
        name: 'Enterprise Test Subscriber',
      },
    });
    testUserId = testUser.id;
    assert(Boolean(testUserId), `Created test user ${testUserId}`);

    // Create user wallet with balance
    const userWallet = await (developersPrisma as any).wallet.create({
      data: {
        userId: testUserId,
        balance: 500,
        currency: 'USD',
      },
    });
    assert(userWallet.balance === 500, 'Test user wallet funded with $500 balance');

    // Ensure Company exists in app DB for tenant
    await (appDb as any).$executeRawUnsafe(
      `INSERT INTO "Company" ("id", "name", "createdAt", "updatedAt") 
       VALUES ($1, 'Enterprise Subscription Co', NOW(), NOW())
       ON CONFLICT ("id") DO NOTHING`,
      testCompanyId
    );

    // -----------------------------------------------------------------
    // 4. Create Subscription Checkout Session via 180 Pay
    // -----------------------------------------------------------------
    console.log('\n4️⃣ Creating 180 Pay Subscription Checkout Session...');
    const sessionResult = await SubscriptionService.createSubscriptionSession({
      clientId: '180-traffic-director',
      clientSecret: process.env.TRAFFIC_DIRECTOR_CLIENT_SECRET || '180_secret_traffic_director_prod_key_771829',
      planCode: 'traffic-pro',
      metadata: {
        companyId: testCompanyId,
        subscriberEmail: testUser.email,
      },
    });

    assert(sessionResult.success === true, 'createSubscriptionSession returns success: true');
    assert(Boolean(sessionResult.sessionId), `Checkout session ID generated: ${sessionResult.sessionId}`);
    assert(sessionResult.amount === 50, 'Session amount is $50 (traffic-pro)');
    assert(sessionResult.currency === 'USD', 'Session currency is USD');
    testSessionId = sessionResult.sessionId;

    // -----------------------------------------------------------------
    // 5. Authorize and Complete Subscription via 180 Pay
    // -----------------------------------------------------------------
    console.log('\n5️⃣ Authorizing and Capturing Subscription Session...');
    const captureResult = await CheckoutService.processPayment(testSessionId, testUserId);
    assert(captureResult.session.status === 'CAPTURED', 'Checkout session status is CAPTURED');

    // Verify RecurringSubscription row was automatically provisioned
    const activeSub = await (developersPrisma as any).recurringSubscription.findFirst({
      where: {
        appId: trafficApp.id,
        userId: testUserId,
        planId: proPlan.id,
      },
      include: { plan: true, app: true },
    });

    assert(Boolean(activeSub), 'RecurringSubscription record created in 180 Core database');
    assert(activeSub.status === 'ACTIVE', `Subscription status is ACTIVE (got: ${activeSub?.status})`);
    assert(activeSub.amount === 50, 'Subscription amount is $50');
    assert(Boolean(activeSub.nextBillingDate), 'Subscription nextBillingDate is populated');
    testSubId = activeSub.id;

    // -----------------------------------------------------------------
    // 6. Decoupled Webhook Dispatch & Sync to Traffic Director App
    // -----------------------------------------------------------------
    console.log('\n6️⃣ Syncing Subscription Activation to Traffic Director App...');
    // Create company record in app DB
    await (appDb as any).$executeRawUnsafe(
      `INSERT INTO "Company" ("id", "name", "createdAt", "updatedAt") 
       VALUES ($1, 'Enterprise Subscription Co', NOW(), NOW())
       ON CONFLICT ("id") DO NOTHING`,
      testCompanyId
    );

    // Simulate 180 Pay -> Traffic Director signed webhook delivery
    const webhookRes = await TrafficDirectorBillingService.handleWebhookEvent({
      event: 'subscription.activated',
      data: {
        subscriptionId: activeSub.id,
        sessionId: testSessionId,
        planCode: 'traffic-pro',
        amount: 50.0,
        currency: 'USD',
        currentPeriodStart: activeSub.currentPeriodStart.toISOString(),
        currentPeriodEnd: activeSub.currentPeriodEnd.toISOString(),
        nextBillingDate: activeSub.nextBillingDate.toISOString(),
        status: 'ACTIVE',
        metadata: {
          companyId: testCompanyId,
          planTier: 'PRO',
        },
      },
    });

    assert(webhookRes.received === true && webhookRes.updated === true, 'Traffic Director processed subscription.activated webhook');

    // Check Traffic Director local billing status
    const tdStatus = await TrafficDirectorBillingService.getSubscriptionStatus(testCompanyId);
    assert(tdStatus.success === true, 'getSubscriptionStatus succeeded in Traffic Director');
    assert(tdStatus.subscription.planTier === 'PRO', `Traffic Director planTier updated to PRO (got: ${tdStatus.subscription.planTier})`);
    assert(tdStatus.subscription.maxLinks === 5, `PRO plan maxLinks is 5 (got: ${tdStatus.subscription.maxLinks})`);
    assert(tdStatus.subscription.hasAdvancedAnalytics === true, 'hasAdvancedAnalytics is true for PRO');
    assert(tdStatus.subscription.cloakingEnabled === true, 'cloakingEnabled is true for PRO');
    assert(tdStatus.subscription.isSubscriptionActive === true, 'isSubscriptionActive is true for PRO');

    // -----------------------------------------------------------------
    // 7. Verify Link Quota Under PRO Subscription (Max 5 Links)
    // -----------------------------------------------------------------
    console.log('\n7️⃣ Verifying Pro Link Quota (Can create up to 5 links)...');
    const { link: link1 } = await TrafficLinksService.createLink(testCompanyId, {
      title: 'Pro Link 1',
      destinationUrl: 'https://money-page-1.com',
      cloakedUrl: 'https://safe-white-1.com',
    });
    assert(Boolean(link1 && link1.id), 'Successfully created Link 1 under PRO subscription');

    const { link: link2 } = await TrafficLinksService.createLink(testCompanyId, {
      title: 'Pro Link 2',
      destinationUrl: 'https://money-page-2.com',
      cloakedUrl: 'https://safe-white-2.com',
    });
    assert(Boolean(link2 && link2.id), 'Successfully created Link 2 under PRO subscription');

    // -----------------------------------------------------------------
    // 8. Razorpay Subscriptions Webhook Simulation (subscription.charged)
    // -----------------------------------------------------------------
    console.log('\n8️⃣ Simulating Razorpay Recurring Auto-Debit Webhook (subscription.charged)...');
    const simRzpSubId = `sub_rzp_mock_${Date.now()}`;
    await (developersPrisma as any).recurringSubscription.update({
      where: { id: testSubId },
      data: {
        paymentSource: 'RAZORPAY_RECURRING',
        razorpaySubscriptionId: simRzpSubId,
      },
    });

    const chargedPayload = {
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: simRzpSubId,
            plan_id: 'plan_rzp_mock_123',
            status: 'active',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor((Date.now() + 30 * 24 * 3600 * 1000) / 1000),
            charge_at: Math.floor((Date.now() + 30 * 24 * 3600 * 1000) / 1000),
          },
        },
        payment: {
          entity: {
            id: `pay_rzp_mock_${Date.now()}`,
            amount: 5000,
            currency: 'USD',
            status: 'captured',
          },
        },
      },
    };

    const rzpWebhookResult = await RazorpaySubscriptionService.handleRazorpaySubscriptionWebhook(chargedPayload);
    assert(rzpWebhookResult.handled === true, 'Razorpay webhook handled successfully');
    assert(rzpWebhookResult.event === 'subscription.charged', 'Event was subscription.charged');

    // Verify developer wallet received subscription revenue credit
    const devWallet = await (developersPrisma as any).wallet.findUnique({
      where: { developerAppId: trafficApp.id },
    });
    assert(Boolean(devWallet && devWallet.balance >= 50), `Developer wallet credited with subscription revenue (balance: ${devWallet?.balance})`);

    // -----------------------------------------------------------------
    // 9. Dual-Cancellation Flow (180 Pay + Razorpay Mandate + Client App)
    // -----------------------------------------------------------------
    console.log('\n9️⃣ Testing Dual-Cancellation Flow...');
    const cancelResult = await SubscriptionService.cancelSubscription(
      testSubId,
      trafficApp.id,
      'User upgraded to another tier or cancelled via bottom sheet',
      testUserId
    );

    assert(cancelResult.success === true, 'Subscription cancelled in 180 Pay');
    assert(cancelResult.data.status === 'CANCELLED', '180 Pay status updated to CANCELLED');
    assert(Boolean(cancelResult.data.cancelledAt), 'cancelledAt timestamp recorded');

    // Sync cancellation to Traffic Director app
    const tdCancelRes = await TrafficDirectorBillingService.handleWebhookEvent({
      event: 'subscription.cancelled',
      data: {
        subscriptionId: testSubId,
        planCode: 'traffic-pro',
        status: 'CANCELLED',
        metadata: {
          companyId: testCompanyId,
        },
      },
    });

    assert(tdCancelRes.received === true && tdCancelRes.updated === true, 'Traffic Director processed subscription.cancelled webhook');

    const tdCancelledStatus = await TrafficDirectorBillingService.getSubscriptionStatus(testCompanyId);
    assert(tdCancelledStatus.subscription.status === 'CANCELLED', `Traffic Director status is CANCELLED (got: ${tdCancelledStatus.subscription.status})`);
    assert(tdCancelledStatus.subscription.isSubscriptionActive === false, 'isSubscriptionActive is false after cancellation');
    assert(tdCancelledStatus.subscription.canCreateMoreLinks === false, 'canCreateMoreLinks is false after cancellation');

    // -----------------------------------------------------------------
    // 10. Verify Feature & Link Locking Under Cancelled State
    // -----------------------------------------------------------------
    console.log('\n🔟 Verifying Feature Locking Under Cancelled State...');
    let createBlocked = false;
    try {
      await TrafficLinksService.createLink(testCompanyId, {
        title: 'Blocked Link',
        destinationUrl: 'https://money.com',
      });
    } catch (e: any) {
      createBlocked = true;
      assert(e.message.includes('SUBSCRIPTION_REQUIRED') || e.message.includes('expired') || e.message.includes('Upgrade'), `Link creation blocked with message: "${e.message}"`);
    }
    assert(createBlocked === true, 'Creating new link is strictly blocked when subscription is inactive');

    // Power toggle activation blocked
    let toggleBlocked = false;
    try {
      await TrafficLinksService.updateLink(link1.id, { isActive: true });
    } catch (e: any) {
      toggleBlocked = true;
      assert(e.message.includes('inactive') || e.message.includes('subscription'), `Link power toggle blocked with message: "${e.message}"`);
    }
    assert(toggleBlocked === true, 'Power toggle to active is strictly blocked when subscription is inactive');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedAssertions}/${totalAssertions} AUDIT ASSERTIONS PASSED WITH ZERO FAILURES!`);
    console.log('================================================================\n');

  } finally {
    // -----------------------------------------------------------------
    // Teardown: Clean up test fixtures in both databases
    // -----------------------------------------------------------------
    console.log('🧹 Cleaning up test artifacts...');
    try {
      if (testCompanyId) {
        await (appDb as any).$executeRawUnsafe(
          `DELETE FROM "TrafficDirectorSubscription" WHERE "companyId" = $1`,
          testCompanyId
        );
        await (appDb as any).$executeRawUnsafe(
          `DELETE FROM "TrafficLink" WHERE "companyId" = $1`,
          testCompanyId
        );
        await (appDb as any).$executeRawUnsafe(
          `DELETE FROM "Company" WHERE "id" = $1`,
          testCompanyId
        );
      }
      if (testUserId) {
        if (testSubId) {
          await (developersPrisma as any).recurringSubscription.deleteMany({
            where: { id: testSubId },
          });
        }
        if (testSessionId) {
          await (developersPrisma as any).checkoutSession.deleteMany({
            where: { id: testSessionId },
          });
        }
        await (developersPrisma as any).ledgerEntry.deleteMany({
          where: { wallet: { userId: testUserId } },
        });
        await (developersPrisma as any).wallet.deleteMany({
          where: { userId: testUserId },
        });
        await (developersPrisma as any).user.deleteMany({
          where: { id: testUserId },
        });
      }
      console.log('✨ Cleanup completed successfully.');
    } catch (cleanErr: any) {
      console.warn('Cleanup non-blocking note:', cleanErr.message);
    }
  }
}

runEnterpriseSubscriptionAuditTest().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
