import assert from 'assert';
import { DecisionEngine } from '../../src/evaluator/decision-engine';
import { ExtractedSignals } from '../../src/types';

console.log('--- TEST SUITE 7: Rule Priority Matrix & Weighted Multi-Variant Splits ---');

const usMobileSignals: ExtractedSignals = {
  ipAddress: '104.28.19.45',
  country: 'US',
  city: 'Chicago',
  deviceType: 'mobile',
  os: 'iOS',
  browser: 'Safari',
  userAgent: 'Mozilla/5.0 (iPhone)',
  referrer: '',
  isBot: false,
  language: 'en',
  networkType: 'residential',
  touchPoints: 5,
  batteryLevel: 0.75,
  isEmulated: false,
  headers: {},
  queryParams: {},
  timestamp: new Date()
};

// Multi-Rule Link
const linkWithOrderedRules = {
  id: 'link-ordered',
  fallbackUrl: 'https://example.com/default-fallback',
  isActive: true,
  rules: [
    {
      id: 'rule-high-priority',
      name: 'P0: US iOS Mobile Offer',
      priority: 0,
      isActive: true,
      destinationUrl: 'https://example.com/ios-vip-offer',
      actionType: 'redirect_302',
      conditions: [
        { type: 'geo_country', operator: 'equals', value: 'US' },
        { type: 'device_type', operator: 'equals', value: 'mobile' }
      ]
    },
    {
      id: 'rule-mid-priority',
      name: 'P1: General US Offer',
      priority: 1,
      isActive: true,
      destinationUrl: 'https://example.com/general-us-offer',
      actionType: 'redirect_302',
      conditions: [
        { type: 'geo_country', operator: 'equals', value: 'US' }
      ]
    },
    {
      id: 'rule-low-priority',
      name: 'P2: Global Mobile',
      priority: 2,
      isActive: true,
      destinationUrl: 'https://example.com/global-mobile',
      actionType: 'redirect_302',
      conditions: [
        { type: 'device_type', operator: 'equals', value: 'mobile' }
      ]
    }
  ]
};

// 1. Priority 0 must match first even though all 3 rules match US Mobile
const res1 = DecisionEngine.evaluate(linkWithOrderedRules, usMobileSignals);
assert.strictEqual(res1.isFallback, false);
assert.strictEqual(res1.matchedRuleId, 'rule-high-priority', 'Priority 0 must match before Priority 1 or 2');
assert.strictEqual(res1.destinationUrl, 'https://example.com/ios-vip-offer');
console.log('✓ Test 7.1: Top priority rule P0 wins matching sequence.');

// 2. US Desktop signals: Should skip P0 (device!=mobile) and match P1 (country=US)
const usDesktopSignals: ExtractedSignals = {
  ...usMobileSignals,
  deviceType: 'desktop'
};
const res2 = DecisionEngine.evaluate(linkWithOrderedRules, usDesktopSignals);
assert.strictEqual(res2.isFallback, false);
assert.strictEqual(res2.matchedRuleId, 'rule-mid-priority', 'Priority 1 should match for desktop US');
assert.strictEqual(res2.destinationUrl, 'https://example.com/general-us-offer');
console.log('✓ Test 7.2: Desktop skips P0 and matches P1.');

// 3. UK Desktop signals: Should skip all and hit fallback
const ukDesktopSignals: ExtractedSignals = {
  ...usMobileSignals,
  country: 'GB',
  deviceType: 'desktop'
};
const res3 = DecisionEngine.evaluate(linkWithOrderedRules, ukDesktopSignals);
assert.strictEqual(res3.isFallback, true);
assert.strictEqual(res3.destinationUrl, 'https://example.com/default-fallback');
console.log('✓ Test 7.3: Unmatched visitor correctly hits default fallback target.');

// 4. Inactive Rule check
const linkWithDisabledP0 = {
  ...linkWithOrderedRules,
  rules: [
    { ...linkWithOrderedRules.rules[0], isActive: false },
    linkWithOrderedRules.rules[1],
    linkWithOrderedRules.rules[2]
  ]
};
const res4 = DecisionEngine.evaluate(linkWithDisabledP0, usMobileSignals);
assert.strictEqual(res4.matchedRuleId, 'rule-mid-priority', 'Disabled P0 must be bypassed and evaluate P1');
console.log('✓ Test 7.4: Inactive rules are bypassed properly.');

console.log('>>> TEST SUITE 7 ALL PASSED! <<<\n');
