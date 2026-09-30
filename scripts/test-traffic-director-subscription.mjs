import { PrismaClient as CorePrismaClient } from '@prisma/client';
import { prisma as workspaceDb } from '../packages/db/dist/index.js';
import crypto from 'crypto';

// Setup colors
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

async function runTests() {
  console.log(`${BOLD}${BLUE}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN} 180 PAY SOVEREIGN RECURRING BILLING & TRAFFIC DIRECTOR AUDIT SUITE ${RESET}`);
  console.log(`${BOLD}${BLUE}======================================================================${RESET}\n`);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ${GREEN}✓${RESET} ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ${RED}✗${RESET} ${name}`);
      console.error(`    ${RED}Error: ${err.message}${RESET}`);
      failed++;
    }
  }

  // 1. Dynamic imports of services from dedicated domain packages
  const { 
    SubscriptionService, 
    RecurringBillingEngine,
    RazorpaySubscriptionService 
  } = await import('../packages/domains/payment-provider/src/index.ts');
  const { 
    TrafficDirectorBillingService, 
    TRAFFIC_DIRECTOR_PLANS 
  } = await import('../packages/domains/traffic-director/src/services/billing.service.ts');
  const { TrafficLinksService } = await import('../packages/domains/traffic-director/src/services/links.service.ts');
  const { developersPrisma } = await import('../packages/db-180core/src/index.ts');

  // Test Case 1: Architectural Decoupling Audit
  await test('1. Architectural Decoupling: Verify ZERO direct Razorpay dependencies in Traffic Director', async () => {
    // Check that TrafficDirectorBillingService does NOT import Razorpay or hold Razorpay keys
    const billingCode = TrafficDirectorBillingService.toString();
    if (billingCode.toLowerCase().includes('razorpay_key_secret') || billingCode.toLowerCase().includes('new razorpay')) {
      throw new Error('Violation: Direct Razorpay dependency detected in Traffic Director domain!');
    }
  });

  // Test Case 2: Seed / verify OAuth App for Traffic Director in 180 Pay Core DB
  let testApp;
  const testWebhookSecret = 'whsec_test_traffic_director_hmac_secret_44910';
  await test('2. Verify / register 180-traffic-director in 180 Pay database with Webhook Endpoint', async () => {
    const sysUser = await developersPrisma.user.findFirst();
    if (!sysUser) throw new Error('No user found in 180developers_db');

    const clientId = '180-traffic-director';
    const clientSecret = '180_secret_traffic_director_prod_key_771829';
    const secretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');

    testApp = await developersPrisma.oAuthApp.upsert({
      where: { clientId },
      update: {
        clientSecretHash: secretHash,
        enablePay: true,
        isActive: true,
      },
      create: {
        clientId,
        name: '180 Traffic Director',
        description: 'Enterprise Edge Traffic Router & Click Armor',
        clientSecretHash: secretHash,
        clientSecretHint: '1829',
        redirectUris: ['http://localhost:3006/callback'],
        allowedOrigins: ['http://localhost:3006'],
        allowedScopes: ['openid', 'identity:read'],
        isVerified: true,
        isActive: true,
        enablePay: true,
        userId: sysUser.id,
      },
    });

    if (!testApp) throw new Error('Failed to upsert testApp');

    // Register active webhook endpoint
    const existingEp = await developersPrisma.webhookEndpoint.findFirst({
      where: {
        appId: testApp.id,
        url: 'http://localhost:4002/api/v1/traffic-director/billing/webhook',
      },
    });

    if (existingEp) {
      await developersPrisma.webhookEndpoint.update({
        where: { id: existingEp.id },
        data: {
          secret: testWebhookSecret,
          isActive: true,
        },
      });
    } else {
      await developersPrisma.webhookEndpoint.create({
        data: {
          appId: testApp.id,
          url: 'http://localhost:4002/api/v1/traffic-director/billing/webhook',
          secret: testWebhookSecret,
          events: ['subscription.activated', 'subscription.renewed', 'subscription.cancelled', 'subscription.payment_failed'],
          isActive: true,
        },
      });
    }
  });

  // Test Case 3: Universal Plan Registration & Razorpay Plan Sync in 180 Pay
  let starterPlan, proPlan, enterprisePlan;
  await test('3. Register $25, $50, $75 tiers via @workspace/payment-provider SubscriptionService', async () => {
    const starterRes = await SubscriptionService.createOrUpdatePlan({
      clientId: '180-traffic-director',
      clientSecret: '180_secret_traffic_director_prod_key_771829',
      planCode: 'traffic-starter',
      name: 'Traffic Director Starter',
      amount: 25.00,
      currency: 'USD',
      interval: 'MONTHLY',
      description: 'Max 2 Smart Links with Anycast Routing',
    });

    const proRes = await SubscriptionService.createOrUpdatePlan({
      clientId: '180-traffic-director',
      clientSecret: '180_secret_traffic_director_prod_key_771829',
      planCode: 'traffic-pro',
      name: 'Traffic Director Pro',
      amount: 50.00,
      currency: 'USD',
      interval: 'MONTHLY',
      description: 'Max 5 Smart Links with AdBot Cloaking',
    });

    const enterpriseRes = await SubscriptionService.createOrUpdatePlan({
      clientId: '180-traffic-director',
      clientSecret: '180_secret_traffic_director_prod_key_771829',
      planCode: 'traffic-enterprise',
      name: 'Traffic Director Enterprise',
      amount: 75.00,
      currency: 'USD',
      interval: 'MONTHLY',
      description: 'Unlimited Smart Links with Dedicated Tor RAM Sets',
    });

    if (!starterRes.data || !proRes.data || !enterpriseRes.data) {
      throw new Error('Plan registration failed in payment provider');
    }

    starterPlan = starterRes.data;
    proPlan = proRes.data;
    enterprisePlan = enterpriseRes.data;

    // Verify plans have valid razorpayPlanId or simulated gateway plan linkage
    if (!proPlan.razorpayPlanId) {
      throw new Error('Expected razorpayPlanId to be populated on plan');
    }
  });

  // Test Case 4: Query Plans via Open Developer API
  await test('4. Query registered plans via 180 Pay Open API', async () => {
    const plansRes = await SubscriptionService.listPlans('180-traffic-director');
    if (!plansRes.success || plansRes.data.length < 3) {
      throw new Error(`Expected at least 3 plans, got ${plansRes.data?.length}`);
    }
  });

  // Test Case 5: Create Recurring Checkout Session with Razorpay Subscriptions Backing
  let testSessionId;
  const testCompanyId = `test_cmp_${Date.now()}`;
  await test('5. Create recurring subscription checkout session with Razorpay mandate linkage', async () => {
    const sessionRes = await SubscriptionService.createSubscriptionSession({
      clientId: '180-traffic-director',
      clientSecret: '180_secret_traffic_director_prod_key_771829',
      planCode: 'traffic-pro',
      amount: 50.00,
      currency: 'USD',
      title: '180 Traffic Director Pro',
      metadata: {
        companyId: testCompanyId,
        planTier: 'PRO',
      },
    });

    if (!sessionRes.success || !sessionRes.sessionId) {
      throw new Error('Failed to create subscription session');
    }

    testSessionId = sessionRes.sessionId;
  });

  // Test Case 6: Activate Subscription & Verify Dual Mandate Linkage
  let activeSub;
  await test('6. Activate recurring subscription in 180 Pay and verify Mandate Status', async () => {
    const sysUser = await developersPrisma.user.findFirst();
    if (!sysUser) throw new Error('No user found');

    const activated = await SubscriptionService.activateSubscriptionFromSession(testSessionId, sysUser.id);
    if (!activated || activated.status !== 'ACTIVE') {
      throw new Error('Failed to activate subscription');
    }

    activeSub = activated;
    if (!activeSub.paymentSource) {
      throw new Error('Expected paymentSource to be defined on active subscription');
    }
  });

  // Test Case 7: Platform Coupon Validation Engine
  await test('7. Validate discount coupon using platform coupon engine with 20% discount', async () => {
    await workspaceDb.coupon.upsert({
      where: { couponCode: 'TESTLAUNCH20' },
      update: {
        discountType: 'percentage',
        discountValue: 20,
        isActive: true,
      },
      create: {
        couponCode: 'TESTLAUNCH20',
        discountType: 'percentage',
        discountValue: 20,
        isActive: true,
      },
    });

    const couponResult = await TrafficDirectorBillingService.validateCoupon('TESTLAUNCH20', 'PRO');
    if (!couponResult.valid || couponResult.finalPrice !== 40.00 || couponResult.discountAmount !== 10.00) {
      throw new Error(`Unexpected coupon calculation: ${JSON.stringify(couponResult)}`);
    }
  });

  // Test Case 8: Tenant Quota Enforcement (Starter Plan: 2 links)
  await test('8. Enforce smart link quota limit on default Starter tier (Max 2 links)', async () => {
    await workspaceDb.company.create({
      data: {
        id: testCompanyId,
        name: 'Audit Test Company',
        slug: `audit-test-${Date.now()}`,
        accountStatus: 'ACTIVE',
      },
    });

    const initialStatus = await TrafficDirectorBillingService.getSubscriptionStatus(testCompanyId);
    if (initialStatus.subscription.maxLinks !== 2 || initialStatus.subscription.planTier !== 'STARTER') {
      throw new Error(`Unexpected initial status: ${JSON.stringify(initialStatus.subscription)}`);
    }

    // Link 1
    await TrafficLinksService.createLink(testCompanyId, {
      name: 'Link 1',
      slug: `link-1-${Date.now()}`,
      fallbackUrl: 'https://example.com/fallback',
    });

    // Link 2
    await TrafficLinksService.createLink(testCompanyId, {
      name: 'Link 2',
      slug: `link-2-${Date.now()}`,
      fallbackUrl: 'https://example.com/fallback',
    });

    // Link 3 - MUST throw quota error!
    let blocked = false;
    try {
      await TrafficLinksService.createLink(testCompanyId, {
        name: 'Link 3 (Should Fail)',
        slug: `link-3-${Date.now()}`,
        fallbackUrl: 'https://example.com/fallback',
      });
    } catch (err) {
      blocked = true;
      if (!err.message.includes('Plan link limit reached')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }

    if (!blocked) {
      throw new Error('Link quota enforcement failed: 3rd link created on 2-link Starter plan!');
    }
  });

  // Test Case 9: Webhook Delivery & Upgrade to Pro (5 links)
  await test('9. Upgrade tenant to Pro (5 links) via signed subscription.activated webhook', async () => {
    const webhookPayload = {
      event: 'subscription.activated',
      data: {
        subscriptionId: activeSub.id,
        sessionId: testSessionId,
        amount: 50.00,
        currency: 'USD',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        metadata: {
          companyId: testCompanyId,
          planTier: 'PRO',
        },
      },
    };

    // Generate valid HMAC signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const rawBody = JSON.stringify(webhookPayload);
    const signature = crypto.createHmac('sha256', testWebhookSecret).update(`${timestamp}.${rawBody}`).digest('hex');
    const signatureHeader = `t=${timestamp},v1=${signature}`;

    const webhookResult = await TrafficDirectorBillingService.handleWebhookEvent(
      webhookPayload,
      signatureHeader,
      rawBody,
      testWebhookSecret
    );

    if (!webhookResult.updated || webhookResult.planTier !== 'PRO') {
      throw new Error(`Webhook handling failed: ${JSON.stringify(webhookResult)}`);
    }

    const updatedStatus = await TrafficDirectorBillingService.getSubscriptionStatus(testCompanyId);
    if (updatedStatus.subscription.maxLinks !== 5 || updatedStatus.subscription.planTier !== 'PRO') {
      throw new Error(`Tenant was not updated to 5 links: ${JSON.stringify(updatedStatus.subscription)}`);
    }

    // Tenant can now successfully create link 3!
    const link3 = await TrafficLinksService.createLink(testCompanyId, {
      name: 'Link 3 (Now Allowed on Pro)',
      slug: `link-3-allowed-${Date.now()}`,
      fallbackUrl: 'https://example.com/fallback',
    });

    if (!link3) throw new Error('Failed to create link 3 after upgrading to Pro!');
  });

  // Test Case 10: Security Test: Reject Tampered HMAC Signature
  await test('10. Security: Reject tampered or forged HMAC webhook signature', async () => {
    const fakePayload = {
      event: 'subscription.activated',
      data: {
        subscriptionId: 'fake_sub_id',
        amount: 0,
        metadata: { companyId: testCompanyId, planTier: 'ENTERPRISE' },
      },
    };

    const forgedSignature = `t=123456,v1=bad0000000000000000000000000000000000000000000000000000000000000`;
    let rejected = false;
    try {
      await TrafficDirectorBillingService.handleWebhookEvent(
        fakePayload,
        forgedSignature,
        JSON.stringify(fakePayload),
        testWebhookSecret
      );
    } catch (err) {
      rejected = true;
      if (!err.message.includes('Invalid HMAC-SHA256 webhook signature')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }

    if (!rejected) {
      throw new Error('Security failure: Tampered webhook signature was accepted!');
    }
  });

  // Test Case 11: Dual-Layer Cancellation via 180 Pay Bottom Sheet
  await test('11. Dual-Layer Cancellation: Cancel in 180 Pay, Revoke Mandate, & Propagate via Webhook', async () => {
    // 1. Cancel via SubscriptionService (same method called by /api/v1/subscriptions/:id/cancel)
    const cancelRes = await SubscriptionService.cancelSubscription(
      activeSub.id,
      testApp.id,
      'Subscriber clicked Cancel Subscription in 180 Pay Bottom Sheet'
    );

    if (!cancelRes.success || cancelRes.data.status !== 'CANCELLED') {
      throw new Error('Failed to cancel subscription in 180 Pay');
    }

    // 2. Deliver subscription.cancelled webhook to Traffic Director
    const cancelWebhookPayload = {
      event: 'subscription.cancelled',
      data: {
        subscriptionId: activeSub.id,
        planCode: 'traffic-pro',
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
        cancelReason: 'Subscriber clicked Cancel Subscription in 180 Pay Bottom Sheet',
        metadata: {
          companyId: testCompanyId,
        },
      },
    };

    const cancelTimestamp = Math.floor(Date.now() / 1000).toString();
    const cancelRawBody = JSON.stringify(cancelWebhookPayload);
    const cancelSig = crypto.createHmac('sha256', testWebhookSecret).update(`${cancelTimestamp}.${cancelRawBody}`).digest('hex');
    const cancelSigHeader = `t=${cancelTimestamp},v1=${cancelSig}`;

    const cancelWebhookResult = await TrafficDirectorBillingService.handleWebhookEvent(
      cancelWebhookPayload,
      cancelSigHeader,
      cancelRawBody,
      testWebhookSecret
    );

    if (!cancelWebhookResult.updated || cancelWebhookResult.status !== 'CANCELLED') {
      throw new Error(`Cancel webhook processing failed: ${JSON.stringify(cancelWebhookResult)}`);
    }

    // 3. Verify Traffic Director subscription status is updated to CANCELLED and autoRenew: false
    const finalTenantStatus = await TrafficDirectorBillingService.getSubscriptionStatus(testCompanyId);
    if (finalTenantStatus.subscription.status !== 'CANCELLED' || finalTenantStatus.subscription.autoRenew !== false) {
      throw new Error(`Tenant subscription status not marked CANCELLED: ${JSON.stringify(finalTenantStatus.subscription)}`);
    }
  });

  // Test Case 12: Recurring Billing Engine Run
  await test('12. Execute autonomous RecurringBillingEngine worker cycle', async () => {
    const cycleRes = await RecurringBillingEngine.runRecurringBillingCycle();
    if (typeof cycleRes.processed !== 'number') {
      throw new Error('Invalid cycle result from RecurringBillingEngine');
    }
  });

  // Cleanup test resources
  try {
    await workspaceDb.trafficLink.deleteMany({ where: { companyId: testCompanyId } });
    await workspaceDb.$executeRawUnsafe(`DELETE FROM "TrafficDirectorSubscription" WHERE "companyId" = $1`, testCompanyId);
    await workspaceDb.company.delete({ where: { id: testCompanyId } });
  } catch (_) {}

  console.log(`\n${BOLD}======================================================================${RESET}`);
  console.log(`${BOLD}AUDIT SUMMARY: ${GREEN}${passed} Passed${RESET}, ${failed > 0 ? RED + failed + ' Failed' : GREEN + '0 Failed'}${RESET}`);
  console.log(`${BOLD}======================================================================${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
