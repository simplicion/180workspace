import assert from 'assert';
import { DecisionEngine } from '../../src/evaluator/decision-engine';
import { ExtractedSignals, RuleCondition } from '../../src/types';

console.log('--- TEST SUITE 6: Multi-Condition Rule Evaluation & All 9 Operators ---');

const baseSignals: ExtractedSignals = {
  ipAddress: '104.28.19.45',
  country: 'US',
  city: 'Los Angeles',
  deviceType: 'mobile',
  os: 'iOS',
  browser: 'Safari',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
  referrer: 'https://instagram.com/p/xyz',
  isBot: false,
  language: 'en',
  networkType: 'residential',
  asn: '13335',
  asnOrg: 'CLOUDFLARE',
  touchPoints: 5,
  gpuRenderer: 'Apple GPU',
  batteryLevel: 0.65,
  isEmulated: false,
  headers: { 'x-campaign-id': 'cmp-99' },
  queryParams: { utm_source: 'fb_ads', utm_medium: 'cpc' },
  timestamp: new Date()
};

// Helper evaluator
const testCond = (cond: RuleCondition, signals = baseSignals): boolean => {
  return DecisionEngine.evaluateCondition(cond, signals);
};

// 1. Operators on Geo Country
assert.strictEqual(testCond({ type: 'geo_country', operator: 'equals', value: 'US' }), true);
assert.strictEqual(testCond({ type: 'geo_country', operator: 'equals', value: 'GB' }), false);
assert.strictEqual(testCond({ type: 'geo_country', operator: 'not_equals', value: 'CA' }), true);
assert.strictEqual(testCond({ type: 'geo_country', operator: 'in', value: 'US,CA,GB' }), true);
assert.strictEqual(testCond({ type: 'geo_country', operator: 'in', value: ['US', 'CA'] }), true);
assert.strictEqual(testCond({ type: 'geo_country', operator: 'not_in', value: 'FR,DE,IT' }), true);
console.log('✓ Test 6.1: Geo country operators passed.');

// 2. Operators on Device & OS
assert.strictEqual(testCond({ type: 'device_type', operator: 'equals', value: 'mobile' }), true);
assert.strictEqual(testCond({ type: 'os', operator: 'contains', value: 'ios' }), true);
assert.strictEqual(testCond({ type: 'browser', operator: 'not_contains', value: 'firefox' }), true);
console.log('✓ Test 6.2: Device, OS, and Browser operators passed.');

// 3. Operators on Network & ASN
assert.strictEqual(testCond({ type: 'network_type', operator: 'equals', value: 'residential' }), true);
assert.strictEqual(testCond({ type: 'asn_provider', operator: 'contains', value: 'cloudflare' }), true);
console.log('✓ Test 6.3: Network and ASN operators passed.');

// 4. Operators on Touch, Battery & Hardware
assert.strictEqual(testCond({ type: 'touch_support', operator: 'equals', value: 'true' }), true);
assert.strictEqual(testCond({ type: 'touch_support', operator: 'equals', value: true }), true);
assert.strictEqual(testCond({ type: 'battery_valid', operator: 'equals', value: 'true' }), true);
assert.strictEqual(testCond({ type: 'gpu_renderer', operator: 'contains', value: 'apple' }), true);
console.log('✓ Test 6.4: Touch, battery, and hardware operators passed.');

// 5. Query Param and Custom Header Operators
assert.strictEqual(testCond({ type: 'query_param', key: 'utm_source', operator: 'equals', value: 'fb_ads' }), true);
assert.strictEqual(testCond({ type: 'query_param', key: 'utm_source', operator: 'regex', value: '^fb_.*' }), true);
assert.strictEqual(testCond({ type: 'query_param', key: 'utm_medium', operator: 'exists', value: '' }), true);
assert.strictEqual(testCond({ type: 'query_param', key: 'nonexistent', operator: 'not_exists', value: '' }), true);
assert.strictEqual(testCond({ type: 'header', key: 'x-campaign-id', operator: 'equals', value: 'cmp-99' }), true);
console.log('✓ Test 6.5: Query param and header operators passed.');

console.log('>>> TEST SUITE 6 ALL PASSED! <<<\n');
