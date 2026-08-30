import assert from 'assert';
import { DecisionEngine } from '../../src/evaluator/decision-engine';
import { ExtractedSignals } from '../../src/types';

console.log('--- TEST SUITE 4: Temporal Warmup Safe Mode Logic ---');

const humanSignals: ExtractedSignals = {
  ipAddress: '104.28.19.45',
  country: 'US',
  city: 'Los Angeles',
  deviceType: 'mobile',
  os: 'iOS',
  browser: 'Safari',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
  referrer: 'https://facebook.com',
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

// 1. Link within active warmup window (warmupUntil is 2 hours in the future)
const activeWarmupUntil = new Date(Date.now() + 2 * 3600 * 1000);

const linkInWarmup = {
  id: 'link-warmup',
  fallbackUrl: 'https://example.com/clean-safe-page',
  isActive: true,
  warmupUntil: activeWarmupUntil,
  rules: [
    {
      id: 'rule-1',
      name: 'US iPhone Offer',
      priority: 0,
      isActive: true,
      destinationUrl: 'https://example.com/target-offer-page',
      actionType: 'redirect_302',
      conditions: [{ type: 'geo_country', operator: 'equals', value: 'US' }]
    }
  ]
};

const warmupResult = DecisionEngine.evaluate(linkInWarmup, humanSignals);
assert.strictEqual(warmupResult.isFallback, true, 'Link in warmup must route to fallback URL');
assert.strictEqual(warmupResult.warmupBlocked, true, 'warmupBlocked flag must be true');
assert.strictEqual(warmupResult.destinationUrl, 'https://example.com/clean-safe-page');
console.log('✓ Test 4.1: Active warmup window enforces 100% compliant safe page.');

// 2. Link with expired warmup window (warmupUntil was 1 hour ago)
const expiredWarmupUntil = new Date(Date.now() - 1 * 3600 * 1000);

const linkExpiredWarmup = {
  id: 'link-warmup-expired',
  fallbackUrl: 'https://example.com/clean-safe-page',
  isActive: true,
  warmupUntil: expiredWarmupUntil,
  rules: [
    {
      id: 'rule-1',
      name: 'US iPhone Offer',
      priority: 0,
      isActive: true,
      destinationUrl: 'https://example.com/target-offer-page',
      actionType: 'redirect_302',
      conditions: [{ type: 'geo_country', operator: 'equals', value: 'US' }]
    }
  ]
};

const liveResult = DecisionEngine.evaluate(linkExpiredWarmup, humanSignals);
assert.strictEqual(liveResult.isFallback, false, 'Expired warmup must execute normal rules');
assert.strictEqual(liveResult.destinationUrl, 'https://example.com/target-offer-page');
assert.strictEqual(liveResult.matchedRuleId, 'rule-1');
console.log('✓ Test 4.2: Expired warmup window seamlessly resumes active conditional routing.');

console.log('>>> TEST SUITE 4 ALL PASSED! <<<\n');
