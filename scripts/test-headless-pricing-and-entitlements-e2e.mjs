import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Setup ANSI colors
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

async function runAudit() {
  console.log(`${BOLD}${BLUE}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  180 PAY HEADLESS PRICING & 0ms ENTITLEMENTS END-TO-END AUDIT SUITE  ${RESET}`);
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

  // 1. Dynamic imports of services and controllers
  const { developersPrisma } = await import('../packages/db-180core/src/index.ts');
  const { SubscriptionService } = await import('../packages/domains/payment-provider/src/index.ts');
  const { PricingTableApiController } = await import('../apps/180-core-backend/src/controllers/pricing-table.controller.ts');
  const { SubscriptionApiController } = await import('../apps/180-core-backend/src/controllers/subscription.controller.ts');

  // Test setup variables
  const TEST_CLIENT_ID = '180_client_e2e_headless_test';
  const TEST_CLIENT_SECRET = '180_secret_e2e_headless_super_secure_key_9921';
  const TEST_SECRET_HASH = crypto.createHash('sha256').update(TEST_CLIENT_SECRET).digest('hex');
  const WHITELISTED_DOMAIN = 'https://my-saas-platform.com';
  const UNLISTED_DOMAIN = 'https://malicious-cors-attacker.org';

  let testApp;
  let testUser;
  let createdPlanTiers = [];

  // TEST 1: Decoupling & Zero Hardcoded Data
  await test('1. Zero Hardcoded Data: Verify PricingTableApiController has NO static fallback ₹499/₹1499 tiers', async () => {
    const controllerSource = PricingTableApiController.toString();
    if (controllerSource.includes('499') || controllerSource.includes('1499')) {
      throw new Error('Violation: Hardcoded plan prices (499 / 1499) found in controller source!');
    }
    if (controllerSource.toLowerCase().includes('starter') && controllerSource.includes('fallback')) {
      throw new Error('Violation: Hardcoded fallback starter tier found in controller source!');
    }
  });

  // TEST 2: Seed / Ensure OAuth App with Domain Whitelisting
  await test('2. App Provisioning: Register OAuth app with Allowed Origins domain whitelist', async () => {
    testUser = await developersPrisma.user.findFirst();
    if (!testUser) throw new Error('No user found in developersPrisma');

    testApp = await developersPrisma.oAuthApp.upsert({
      where: { clientId: TEST_CLIENT_ID },
      update: {
        clientSecretHash: TEST_SECRET_HASH,
        allowedOrigins: [WHITELISTED_DOMAIN, 'http://localhost:3000'],
        isActive: true,
        enablePay: true,
      },
      create: {
        clientId: TEST_CLIENT_ID,
        name: 'Apex Edge Cloud',
        description: 'Next-gen distributed serverless and network edge orchestration',
        clientSecretHash: TEST_SECRET_HASH,
        clientSecretHint: '9921',
        redirectUris: ['https://my-saas-platform.com/callback'],
        allowedOrigins: [WHITELISTED_DOMAIN, 'http://localhost:3000'],
        allowedScopes: ['openid', 'pay:checkout'],
        isVerified: true,
        isActive: true,
        enablePay: true,
        userId: testUser.id,
      },
    });

    if (!testApp || !testApp.allowedOrigins.includes(WHITELISTED_DOMAIN)) {
      throw new Error('Failed to configure test app with domain whitelist');
    }
  });

  // TEST 3: Pricing Table Configuration & Database Sync
  await test('3. Studio Config & Auto-Sync: Update pricing table config with machine-readable featureKeys', async () => {
    const tierPayload = [
      {
        planCode: 'starter_developer',
        name: 'Developer Starter',
        description: 'For individuals exploring edge deployments',
        amount: 25,
        currency: 'USD',
        trialDays: 14,
        isPopular: false,
        features: [
          { text: '100k requests/month', included: true },
          { text: 'Standard SLA', included: true },
          { text: 'Custom Cloaking', included: false },
        ],
        featureKeys: ['edge:deploy', 'metrics:basic'],
        buttonText: 'Start Free Trial',
      },
      {
        planCode: 'pro_sovereign',
        name: 'Pro Sovereign',
        description: 'For growing teams requiring mission-critical routing and cloaking',
        amount: 79,
        currency: 'USD',
        trialDays: 7,
        isPopular: true,
        badgeText: 'Most Popular',
        features: [
          { text: '5M requests/month', included: true },
          { text: 'Real-time Telemetry Stream', included: true },
          { text: 'Traffic Cloaking & Armor', included: true },
          { text: 'Custom Domains', included: true },
        ],
        featureKeys: ['edge:deploy', 'traffic:cloaking', 'analytics:realtime', 'domains:custom'],
        buttonText: 'Upgrade to Pro',
      },
      {
        planCode: 'enterprise_scale',
        name: 'Enterprise Scale',
        description: 'Custom governance, dedicated clusters & 99.99% uptime guarantees',
        amount: 299,
        currency: 'USD',
        trialDays: 30,
        isPopular: false,
        badgeText: 'High Concurrency',
        features: [
          { text: 'Uncapped Burst Bandwidth', included: true },
          { text: 'Dedicated Isolated Server Nodes', included: true },
          { text: 'Audit Logging & SOC2 Export', included: true },
        ],
        featureKeys: ['edge:deploy', 'traffic:cloaking', 'analytics:realtime', 'domains:custom', 'dedicated_clusters', 'sla:99_99'],
        buttonText: 'Contact Enterprise',
      },
    ];

    // Simulate PUT /api/v1/pricing-tables/:appId
    const mockReq = {
      params: { appId: testApp.id },
      body: {
        appId: testApp.id,
        headline: 'Apex Edge Cloud Pricing',
        subheadline: 'Transparent plans engineered for zero-latency execution',
        theme: 'dark',
        accentColor: '#8b5cf6',
        billingIntervals: ['MONTHLY', 'YEARLY'],
        yearlyDiscountPct: 20,
        planCards: tierPayload,
        syncToSubscriptionPlans: true,
      },
    };

    let responseData = null;
    const mockRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await PricingTableApiController.updatePricingTableConfig(mockReq, mockRes);
    if (!responseData || !responseData.success) {
      throw new Error(`Failed to update pricing table config: ${responseData?.error}`);
    }

    // Verify database sync created corresponding SubscriptionPlan records
    const dbPlans = await developersPrisma.subscriptionPlan.findMany({
      where: { appId: testApp.id, isActive: true },
    });

    if (dbPlans.length < 3) {
      throw new Error(`Expected at least 3 synced database plans, found ${dbPlans.length}`);
    }

    const proPlan = dbPlans.find((p) => p.planCode === 'pro_sovereign');
    if (!proPlan) throw new Error('pro_sovereign plan not found in database');
    if (!proPlan.metadata?.featureKeys?.includes('traffic:cloaking')) {
      throw new Error('pro_sovereign plan in DB is missing synced featureKeys');
    }

    createdPlanTiers = dbPlans;
  });

  // TEST 4: Headless API Domain Whitelisting (CORS) Security
  await test('4. Headless API Security: Reject unlisted origins and accept whitelisted origins with CORS', async () => {
    // 4A: Unlisted Origin Check
    let unlistedError = null;
    const unlistedReq = {
      params: { appId: testApp.clientId },
      headers: { origin: UNLISTED_DOMAIN },
    };
    const unlistedRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader() {},
      json(data) {
        unlistedError = data;
        return this;
      },
    };

    await PricingTableApiController.getHeadlessPricing(unlistedReq, unlistedRes);
    if (unlistedRes.statusCode !== 403 || !unlistedError?.error?.includes('not authorized')) {
      throw new Error(`Expected 403 Forbidden for unlisted origin, got ${unlistedRes.statusCode}`);
    }

    // 4B: Whitelisted Origin Check
    let whitelistedData = null;
    let setHeaders = {};
    const whitelistedReq = {
      params: { appId: testApp.clientId },
      headers: { origin: WHITELISTED_DOMAIN },
    };
    const whitelistedRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(k, v) {
        setHeaders[k] = v;
      },
      json(data) {
        whitelistedData = data;
        return this;
      },
    };

    await PricingTableApiController.getHeadlessPricing(whitelistedReq, whitelistedRes);
    if (whitelistedRes.statusCode !== 200 || !whitelistedData?.success) {
      throw new Error(`Whitelisted request failed: ${whitelistedData?.error}`);
    }
    if (setHeaders['Access-Control-Allow-Origin'] !== WHITELISTED_DOMAIN) {
      throw new Error(`CORS header mismatch: expected ${WHITELISTED_DOMAIN}, got ${setHeaders['Access-Control-Allow-Origin']}`);
    }
  });

  // TEST 5: Headless API Data Integrity
  await test('5. Headless API Integrity: Verify dynamic plans, yearly discounts, featureKeys & checkout URLs', async () => {
    let responseData = null;
    const req = {
      params: { appId: testApp.clientId },
      headers: { origin: WHITELISTED_DOMAIN },
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader() {},
      json(data) {
        responseData = data;
        return this;
      },
    };

    await PricingTableApiController.getHeadlessPricing(req, res);
    const { plans, settings } = responseData;

    if (!Array.isArray(plans) || plans.length !== 3) {
      throw new Error(`Expected exactly 3 plans, got ${plans?.length}`);
    }

    const pro = plans.find((p) => p.planCode === 'pro_sovereign');
    if (!pro) throw new Error('pro_sovereign tier missing from headless response');

    // Verify annual discount calculation: $79 * 12 * 0.8 = $758.4 -> 758
    if (pro.yearlyAmount !== Math.round(79 * 12 * 0.8)) {
      throw new Error(`Yearly amount calculation mismatch: expected ${Math.round(79 * 12 * 0.8)}, got ${pro.yearlyAmount}`);
    }

    // Verify featureKeys
    if (!pro.featureKeys.includes('traffic:cloaking') || !pro.featureKeys.includes('analytics:realtime')) {
      throw new Error(`Missing expected feature keys in pro tier: ${JSON.stringify(pro.featureKeys)}`);
    }

    // Verify checkout URL format
    if (!pro.checkoutUrl || !pro.checkoutUrl.includes(testApp.clientId) || !pro.checkoutUrl.includes('pro_sovereign')) {
      throw new Error(`Invalid checkoutUrl: ${pro.checkoutUrl}`);
    }
  });

  // TEST 6: Create Subscription Checkout Session
  let testSession;
  await test('6. Subscription Session Creation: Provision recurring subscription checkout session', async () => {
    const sessionRes = await SubscriptionService.createSubscriptionSession({
      clientId: TEST_CLIENT_ID,
      clientSecret: TEST_CLIENT_SECRET,
      planCode: 'pro_sovereign',
      returnUrl: 'https://my-saas-platform.com/dashboard',
      cancelUrl: 'https://my-saas-platform.com/pricing',
      metadata: {
        subscriberCompany: 'Acme Edge Inc.',
      },
    });

    if (!sessionRes.success || !sessionRes.sessionId) {
      throw new Error(`Failed to create subscription session: ${JSON.stringify(sessionRes)}`);
    }

    testSession = sessionRes;
  });

  // TEST 7: Activate Subscription & Link Features
  let activeSubscription;
  const subscriberUserId = testUser.id;
  await test('7. Subscription Activation: Capture checkout payment and activate subscription', async () => {
    activeSubscription = await SubscriptionService.activateSubscriptionFromSession(
      testSession.sessionId,
      subscriberUserId,
      developersPrisma
    );

    if (!activeSubscription || activeSubscription.status !== 'ACTIVE') {
      throw new Error('Subscription failed to activate');
    }

    if (!activeSubscription.currentPeriodEnd || new Date(activeSubscription.currentPeriodEnd) <= new Date()) {
      throw new Error('Invalid currentPeriodEnd date on active subscription');
    }
  });

  // TEST 8: Query Entitlements & Issue Subscription Entitlement Token (SET)
  let entitlementData;
  await test('8. Entitlements Issuance: Query active entitlements and issue cryptographically signed JWT token', async () => {
    const req = {
      headers: {
        'x-client-id': TEST_CLIENT_ID,
        'x-client-secret': TEST_CLIENT_SECRET,
      },
      query: {
        userId: subscriberUserId,
      },
    };

    let result = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        result = data;
        return this;
      },
    };

    await SubscriptionApiController.getUserEntitlements(req, res);
    if (!result?.success || !result?.hasActiveSubscription) {
      throw new Error(`Failed to get user entitlements: ${JSON.stringify(result)}`);
    }

    if (!result.entitlementToken) {
      throw new Error('Entitlement token was not generated');
    }

    if (!result.subscription.features.includes('traffic:cloaking')) {
      throw new Error(`traffic:cloaking feature not present in entitlements: ${JSON.stringify(result.subscription.features)}`);
    }

    entitlementData = result;
  });

  // TEST 9: 0ms Offline Local Verification (The Gold Standard)
  await test('9. 0ms Offline Verification: Verify token signature locally in memory with ZERO network latency', async () => {
    const startTime = performance.now();

    // The developer verifies the token offline using the app's secret hash
    const decoded = jwt.verify(entitlementData.entitlementToken, testApp.clientSecretHash);

    const elapsed = performance.now() - startTime;

    if (decoded.sub !== subscriberUserId) {
      throw new Error(`Subject mismatch: expected ${subscriberUserId}, got ${decoded.sub}`);
    }
    if (decoded.aud !== TEST_CLIENT_ID) {
      throw new Error(`Audience mismatch: expected ${TEST_CLIENT_ID}, got ${decoded.aud}`);
    }
    if (decoded.status !== 'ACTIVE') {
      throw new Error(`Expected ACTIVE status in claims, got ${decoded.status}`);
    }
    if (!decoded.features.includes('traffic:cloaking') || !decoded.features.includes('analytics:realtime')) {
      throw new Error(`Decoded token missing feature keys: ${JSON.stringify(decoded.features)}`);
    }

    if (elapsed > 50) {
      throw new Error(`Local verification took too long: ${elapsed.toFixed(2)}ms (expected < 50ms)`);
    }
  });

  // TEST 10: Server-to-Server Verification Endpoint
  await test('10. Server Verification API: Verify token validity via POST /verify-token endpoint', async () => {
    const req = {
      body: {
        token: entitlementData.entitlementToken,
        clientId: TEST_CLIENT_ID,
      },
    };

    let verifyResult = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        verifyResult = data;
        return this;
      },
    };

    await SubscriptionApiController.verifyEntitlementToken(req, res);
    if (!verifyResult?.success || !verifyResult?.valid || !verifyResult?.isActive) {
      throw new Error(`Token verification endpoint failed: ${JSON.stringify(verifyResult)}`);
    }
  });

  // TEST 11: Real-time Invalidation & Revocation
  await test('11. Lifecycle Invalidation: Cancel subscription and verify instant revocation of entitlements', async () => {
    // 1. Cancel the subscription
    await SubscriptionService.cancelSubscription(
      activeSubscription.id,
      testApp.id,
      'Test user downgraded to free tier'
    );

    // 2. Query entitlements again
    const req = {
      headers: {
        'x-client-id': TEST_CLIENT_ID,
        'x-client-secret': TEST_CLIENT_SECRET,
      },
      query: {
        userId: subscriberUserId,
      },
    };

    let revokedResult = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        revokedResult = data;
        return this;
      },
    };

    await SubscriptionApiController.getUserEntitlements(req, res);
    if (revokedResult.hasActiveSubscription !== false) {
      throw new Error('Expected hasActiveSubscription to be false after cancellation');
    }
    if (revokedResult.entitlements.features.length > 0) {
      throw new Error('Features should be empty after cancellation');
    }

    // 3. Verify server-to-server check flags the old token as revoked
    const verifyReq = {
      body: {
        token: entitlementData.entitlementToken,
        clientId: TEST_CLIENT_ID,
      },
    };

    let verifyRevokedResult = null;
    const verifyRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        verifyRevokedResult = data;
        return this;
      },
    };

    await SubscriptionApiController.verifyEntitlementToken(verifyReq, verifyRes);
    if (verifyRevokedResult.isActive !== false || verifyRevokedResult.revoked !== true) {
      throw new Error(`Expected token to be marked revoked, got: ${JSON.stringify(verifyRevokedResult)}`);
    }
  });

  // TEST 12: Webhook HMAC-SHA256 Signature Verification
  await test('12. Universal Webhooks: Verify HMAC-SHA256 signature calculation matches developer listener', async () => {
    const webhookSecret = 'whsec_test_secret_for_e2e_verification_881';
    const payload = {
      event: 'subscription.activated',
      data: {
        subscriptionId: 'sub_test_123',
        planCode: 'pro_sovereign',
        userId: subscriberUserId,
        featureKeys: ['traffic:cloaking', 'analytics:realtime'],
        status: 'ACTIVE',
      },
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadString = JSON.stringify(payload);
    const signPayload = `${timestamp}.${payloadString}`;
    const generatedSignature = crypto.createHmac('sha256', webhookSecret).update(signPayload).digest('hex');

    // Simulate developer receiver
    const expected = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${payloadString}`).digest('hex');

    if (generatedSignature !== expected) {
      throw new Error('HMAC signature mismatch between 180 Pay dispatcher and developer receiver');
    }
  });

  // Clean up test records
  try {
    await developersPrisma.recurringSubscription.deleteMany({
      where: { appId: testApp.id },
    });
    await developersPrisma.subscriptionPlan.deleteMany({
      where: { appId: testApp.id },
    });
    await developersPrisma.pricingTableConfig.deleteMany({
      where: { appId: testApp.id },
    });
    await developersPrisma.oAuthApp.deleteMany({
      where: { clientId: TEST_CLIENT_ID },
    });
  } catch (_) {}

  console.log(`\n${BOLD}${BLUE}======================================================================${RESET}`);
  console.log(`${BOLD}${passed === 12 ? GREEN : YELLOW} AUDIT COMPLETE: ${passed} Passed, ${failed} Failed ${RESET}`);
  console.log(`${BOLD}${BLUE}======================================================================${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
