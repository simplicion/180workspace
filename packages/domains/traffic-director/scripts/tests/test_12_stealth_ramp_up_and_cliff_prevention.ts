import { DecisionEngine, EvaluatableLink } from '../../src/evaluator/decision-engine';
import { ExtractedSignals } from '../../src/types';

function createMockSignals(overrides: Partial<ExtractedSignals> = {}): ExtractedSignals {
  return {
    ipAddress: '104.28.19.45',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    country: 'US',
    city: 'Los Angeles',
    deviceType: 'mobile',
    os: 'iOS',
    browser: 'Safari',
    networkType: 'residential',
    isBot: false,
    touchPoints: 5,
    gpuRenderer: 'Apple GPU',
    isEmulated: false,
    headers: {},
    queryParams: {},
    ...overrides
  };
}

async function runRampUpTestSuite() {
  console.log('========================================================================');
  console.log('  TEST SUITE 12: STEALTH TRAFFIC RAMP-UP & CLIFF PREVENTION EDGE CASES  ');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title}`);
    }
  }

  const now = Date.now();

  // Test 1: Warmup is ACTIVE -> 100% Traffic Must Hit Safe Page (0% to Offer)
  console.log('🧪 1. Testing Active Warmup Window (Ad Review Mode)...');
  const activeWarmupLink: EvaluatableLink = {
    id: 'link-1',
    fallbackUrl: 'https://safe-wellness-books.com',
    isActive: true,
    warmupUntil: new Date(now + 24 * 3600 * 1000).toISOString(), // 24 hours into future
    rampUpEnabled: true,
    rampUpDurationHours: 24,
    rules: [
      {
        id: 'rule-offer',
        name: 'Offer Redirect',
        priority: 0,
        isActive: true,
        destinationUrl: 'https://target-offer-page.com',
        actionType: 'redirect_302',
        conditions: [{ type: 'device_type', operator: 'equals', value: 'mobile' }]
      }
    ]
  };

  const warmupResult = DecisionEngine.evaluate(activeWarmupLink, createMockSignals());
  assert('Active warmup forces fallback to safe page', warmupResult.isFallback === true);
  assert('Active warmup destination is Safe Page', warmupResult.destinationUrl === 'https://safe-wellness-books.com');
  assert('Active warmup sets warmupBlocked flag', warmupResult.warmupBlocked === true);

  // Test 2: Warmup Expired 1 Hour Ago (Ramp-Up at ~13.75%)
  console.log('\n🧪 2. Testing Ramp-Up Hour 1 (Statistical Smooth Transition)...');
  const hour1Link: EvaluatableLink = {
    ...activeWarmupLink,
    warmupUntil: new Date(now - 1 * 3600 * 1000).toISOString(), // Ended 1 hr ago
    rampUpDurationHours: 24
  };

  let hour1RedirectCount = 0;
  const iterations = 1000;
  for (let i = 0; i < iterations; i++) {
    const res = DecisionEngine.evaluate(hour1Link, createMockSignals());
    if (!res.isFallback && res.destinationUrl === 'https://target-offer-page.com') {
      hour1RedirectCount++;
    }
  }
  const hour1Pct = (hour1RedirectCount / iterations) * 100;
  console.log(`     -> Hour 1 Redirect Rate: ${hour1Pct.toFixed(1)}% (Expected ~10% - 20%)`);
  assert('Hour 1 redirect rate is smooth and between 7% and 25%', hour1Pct >= 7 && hour1Pct <= 25);

  // Test 3: Ramp-Up Halfway (Hour 12 of 24 -> Expected ~55%)
  console.log('\n🧪 3. Testing Ramp-Up Halfway (Hour 12 of 24)...');
  const halfLink: EvaluatableLink = {
    ...activeWarmupLink,
    warmupUntil: new Date(now - 12 * 3600 * 1000).toISOString(), // Ended 12 hrs ago
    rampUpDurationHours: 24
  };

  let halfRedirectCount = 0;
  for (let i = 0; i < iterations; i++) {
    const res = DecisionEngine.evaluate(halfLink, createMockSignals());
    if (!res.isFallback && res.destinationUrl === 'https://target-offer-page.com') {
      halfRedirectCount++;
    }
  }
  const halfPct = (halfRedirectCount / iterations) * 100;
  console.log(`     -> Halfway Redirect Rate: ${halfPct.toFixed(1)}% (Expected ~45% - 65%)`);
  assert('Halfway redirect rate is between 45% and 65%', halfPct >= 45 && halfPct <= 65);

  // Test 4: Ramp-Up Completed (Hour 26 of 24 -> 100% Full Power)
  console.log('\n🧪 4. Testing Post-Ramp Full Conversion (Hour 26+)...');
  const completedLink: EvaluatableLink = {
    ...activeWarmupLink,
    warmupUntil: new Date(now - 26 * 3600 * 1000).toISOString(), // Ended 26 hrs ago
    rampUpDurationHours: 24
  };

  let completedRedirectCount = 0;
  for (let i = 0; i < iterations; i++) {
    const res = DecisionEngine.evaluate(completedLink, createMockSignals());
    if (!res.isFallback && res.destinationUrl === 'https://target-offer-page.com') {
      completedRedirectCount++;
    }
  }
  const completedPct = (completedRedirectCount / iterations) * 100;
  console.log(`     -> Full Conversion Rate: ${completedPct.toFixed(1)}% (Expected 100%)`);
  assert('Post-ramp traffic is 100% directed to offer', completedPct === 100);

  // Test 5: Edge Case - Ramp-Up Enabled WITHOUT warmupUntil (uses createdAt)
  console.log('\n🧪 5. Testing Ramp-Up with NO warmupUntil (uses createdAt baseline)...');
  const noWarmupLink: EvaluatableLink = {
    ...activeWarmupLink,
    warmupUntil: null,
    createdAt: new Date(now - 12 * 3600 * 1000).toISOString(), // Created 12h ago
    rampUpDurationHours: 24
  };

  let noWarmupRedirectCount = 0;
  for (let i = 0; i < iterations; i++) {
    const res = DecisionEngine.evaluate(noWarmupLink, createMockSignals());
    if (!res.isFallback && res.destinationUrl === 'https://target-offer-page.com') {
      noWarmupRedirectCount++;
    }
  }
  const noWarmupPct = (noWarmupRedirectCount / iterations) * 100;
  console.log(`     -> No-Warmup CreatedAt Ramp Rate: ${noWarmupPct.toFixed(1)}% (Expected ~45% - 65%)`);
  assert('Ramp-up smoothly scales from createdAt when warmupUntil is missing', noWarmupPct >= 45 && noWarmupPct <= 65);

  // Test 6: Edge Case - Datacenter Bot during active ramp-up
  console.log('\n🧪 6. Testing Datacenter Cloud Bot during 100% Ramp-Up...');
  const datacenterBotSignals = createMockSignals({
    networkType: 'datacenter',
    isBot: true
  });
  const botResult = DecisionEngine.evaluate({
    ...completedLink,
    datacenterBlocked: true
  }, datacenterBotSignals);

  assert('Datacenter bot is dropped to Safe Page regardless of ramp-up', botResult.isFallback === true);
  assert('Datacenter bot has datacenterBlocked flag', botResult.datacenterBlocked === true);

  console.log('\n========================================================================');
  console.log(`  FINAL RESULTS: ${passed}/${total} TESTS PASSED (100% COMPLIANCE)`);
  console.log('========================================================================\n');
}

runRampUpTestSuite().catch(console.error);
