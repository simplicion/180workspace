import assert from 'assert';
import { SignalExtractor } from '../../src/evaluator/signal-extractor';
import { DecisionEngine } from '../../src/evaluator/decision-engine';

console.log('--- TEST SUITE 2: Cloud Datacenter ASN & Scraper Classification ---');

// 1. AWS Datacenter Request
const awsReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'cf-connecting-ip': '54.239.28.85',
    'cf-as-organization': 'Amazon.com, Inc.',
    'cf-ipasn': '16509',
    'cf-ipcountry': 'US'
  }
};

const awsSignals = SignalExtractor.extractFromRequest(awsReq);
assert.strictEqual(awsSignals.networkType, 'datacenter', 'AWS IP must be classified as datacenter');
assert.strictEqual(awsSignals.asnOrg, 'AWS', 'ASN Org must resolve to AWS');
assert.strictEqual(awsSignals.isBot, true, 'Datacenter traffic must be flagged for security inspection');
console.log('✓ Test 2.1: AWS ASN detected successfully.');

// 2. Google Cloud Datacenter Request
const gcpReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/124.0.0.0 Safari/537.36',
    'cf-connecting-ip': '34.102.136.1',
    'cf-as-organization': 'Google LLC Cloud Services',
    'cf-ipasn': '15169',
    'cf-ipcountry': 'US'
  }
};

const gcpSignals = SignalExtractor.extractFromRequest(gcpReq);
assert.strictEqual(gcpSignals.networkType, 'datacenter', 'GCP IP must be classified as datacenter');
assert.strictEqual(gcpSignals.asnOrg, 'GOOGLE_CLOUD', 'ASN Org must resolve to GOOGLE_CLOUD');
console.log('✓ Test 2.2: Google Cloud ASN detected successfully.');

// 3. DigitalOcean and Hetzner Datacenter Request
const doReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'cf-as-organization': 'DigitalOcean, LLC',
    'cf-ipasn': '14061'
  }
};

const doSignals = SignalExtractor.extractFromRequest(doReq);
assert.strictEqual(doSignals.networkType, 'datacenter', 'DigitalOcean must be classified as datacenter');
assert.strictEqual(doSignals.asnOrg, 'DIGITALOCEAN', 'ASN Org must resolve to DIGITALOCEAN');
console.log('✓ Test 2.3: DigitalOcean ASN detected successfully.');

// 4. Decision Engine Datacenter ASN Firewall Drop
const linkWithFirewall = {
  id: 'link-1',
  fallbackUrl: 'https://example.com/clean-safe-page',
  isActive: true,
  datacenterBlocked: true,
  rules: [
    {
      id: 'rule-1',
      name: 'All US Users',
      priority: 0,
      isActive: true,
      destinationUrl: 'https://example.com/target-money-page',
      actionType: 'redirect_302',
      conditions: [{ type: 'geo_country', operator: 'equals', value: 'US' }]
    }
  ]
};

const result = DecisionEngine.evaluate(linkWithFirewall, awsSignals);
assert.strictEqual(result.isFallback, true, 'Datacenter IP must drop to fallback URL');
assert.strictEqual(result.datacenterBlocked, true, 'datacenterBlocked flag must be true');
assert.strictEqual(result.destinationUrl, 'https://example.com/clean-safe-page', 'Must route to clean safe page');
console.log('✓ Test 2.4: Datacenter ASN Firewall instantly drops cloud crawler.');

console.log('>>> TEST SUITE 2 ALL PASSED! <<<\n');
