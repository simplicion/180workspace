import assert from 'assert';
import { DecisionEngine } from '../../src/evaluator/decision-engine';
import { ExtractedSignals } from '../../src/types';

console.log('--- TEST SUITE 5: Stealth Ramp-Up Linear Scaling Mathematics ---');

const humanSignals: ExtractedSignals = {
  ipAddress: '104.28.19.45',
  country: 'US',
  city: 'New York',
  deviceType: 'mobile',
  os: 'iOS',
  browser: 'Safari',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
  referrer: '',
  isBot: false,
  language: 'en',
  networkType: 'residential',
  touchPoints: 5,
  batteryLevel: 0.8,
  isEmulated: false,
  headers: {},
  queryParams: {},
  timestamp: new Date()
};

// 1. Link midway through 24-hour ramp-up (warmup finished 12 hours ago)
const midwayWarmupUntil = new Date(Date.now() - 12 * 3600 * 1000);

const linkMidwayRamp = {
  id: 'link-ramp',
  fallbackUrl: 'https://example.com/fallback',
  isActive: true,
  warmupUntil: midwayWarmupUntil,
  rampUpEnabled: true,
  rampUpDurationHours: 24,
  rules: [
    {
      id: 'rule-1',
      name: 'US Offer',
      priority: 0,
      isActive: true,
      destinationUrl: 'https://example.com/target-offer',
      actionType: 'redirect_302',
      conditions: [{ type: 'geo_country', operator: 'equals', value: 'US' }]
    }
  ]
};

// At 12h into 24h, factor is ~0.10 + 0.90*(12/24) = ~55%
let targetHits = 0;
let fallbackHits = 0;
const iterations = 500;

for (let i = 0; i < iterations; i++) {
  const res = DecisionEngine.evaluate(linkMidwayRamp, humanSignals);
  if (res.isFallback) {
    fallbackHits++;
  } else {
    targetHits++;
  }
}

const targetRatio = targetHits / iterations;
console.log(`Midway 12h ramp-up target distribution: ${(targetRatio * 100).toFixed(1)}% (${targetHits}/${iterations})`);
assert.ok(targetRatio > 0.40 && targetRatio < 0.70, 'Target ratio should be around 55% at halfway point');
console.log('✓ Test 5.1: Midway ramp-up distribution matches theoretical ~55% curve.');

// 2. Link with ramp-up completed (warmup finished 30 hours ago for 24h ramp)
const completedWarmupUntil = new Date(Date.now() - 30 * 3600 * 1000);

const linkCompletedRamp = {
  ...linkMidwayRamp,
  warmupUntil: completedWarmupUntil
};

let completedTargetHits = 0;
for (let i = 0; i < 50; i++) {
  const res = DecisionEngine.evaluate(linkCompletedRamp, humanSignals);
  if (!res.isFallback) completedTargetHits++;
}

assert.strictEqual(completedTargetHits, 50, 'Once ramp-up duration concludes, 100% of matching traffic must hit target');
console.log('✓ Test 5.2: Post ramp-up phase delivers 100% traffic to target offer.');

console.log('>>> TEST SUITE 5 ALL PASSED! <<<\n');
