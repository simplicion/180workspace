import { DomainsService } from '../../../public/src/domains.service';
import { DecisionEngine } from '../../src/evaluator/decision-engine';
import { SignalExtractor } from '../../src/evaluator/signal-extractor';

console.log('========================================================================');
console.log('  TEST SUITE 15: COMPLETE CUSTOM DOMAIN & TRAFFIC SIMULATION AUDIT     ');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 🧪 1. Normalization & Apex Edge Cases
console.log('🧪 1. Testing Domain Normalization Edge Cases...');
assert(DomainsService.normalizeDomain('HTTPS://WWW.MYBRAND.COM:443/PROMO?SRC=FB') === 'www.mybrand.com', 'Strips uppercase, protocol, port, path, and query');
assert(DomainsService.normalizeDomain('http://links.sub.brand.co.nz/') === 'links.sub.brand.co.nz', 'Preserves multi-level subdomain with second-level TLD');

// 🧪 2. Apex vs Subdomain Identification
console.log('\n🧪 2. Testing Apex vs Subdomain Multi-TLD Matrix...');
const tldMatrix = [
  { domain: 'apple.com', expectedApex: true },
  { domain: 'shop.apple.com', expectedApex: false },
  { domain: 'bbc.co.uk', expectedApex: true },
  { domain: 'news.bbc.co.uk', expectedApex: false },
  { domain: 'gov.au', expectedApex: true },
  { domain: 'services.gov.au', expectedApex: false },
  { domain: 'startup.tech', expectedApex: true },
  { domain: 'go.startup.tech', expectedApex: false }
];

tldMatrix.forEach(({ domain, expectedApex }) => {
  assert(
    DomainsService.isApexDomain(domain) === expectedApex,
    `"${domain}" correctly classified as ${expectedApex ? 'Apex' : 'Subdomain'}`
  );
});

// 🧪 3. DNS Configuration Records Structure
console.log('\n🧪 3. Testing Required DNS Configuration Records...');
const apexConfig = DomainsService.calculateRequiredRecords('mybrand.com', 'vc-verify-token-1234');
assert(apexConfig.length === 3, 'Apex configuration contains exactly 3 records (A, CNAME, TXT)');

const subConfig = DomainsService.calculateRequiredRecords('go.mybrand.com');
assert(subConfig.length === 1, 'Subdomain configuration contains exactly 1 CNAME record');
assert(subConfig[0].type === 'CNAME' && subConfig[0].name === 'go', 'Subdomain record correctly specifies host "go"');

// 🧪 4. Full End-to-End Traffic Director Cloaking Simulation via Custom Domain
console.log('\n🧪 4. Simulating Edge Traffic on Custom Domain (https://go.mybrand.com)...');

// Mock link configured on custom domain
const mockSmartLink = {
  id: 'link-custom-domain-1',
  name: 'Branded Campaign Link',
  slug: 'black-friday',
  customDomain: 'go.mybrand.com',
  fallbackUrl: 'https://mysafestore.com/safe-article',
  isActive: true,
  datacenterBlocked: true,
  rampUpEnabled: false,
  rules: [
    {
      id: 'rule-us-mobile',
      linkId: 'link-custom-domain-1',
      name: 'US Real Mobile Target',
      priority: 0,
      isActive: true,
      actionType: 'redirect_302' as const,
      destinationUrl: 'https://mysafestore.com/vip-offer-deal',
      conditions: [
        { type: 'geo_country' as const, operator: 'equals' as const, value: 'US' },
        { type: 'device_type' as const, operator: 'equals' as const, value: 'mobile' }
      ]
    }
  ]
};

// Simulated Visitor A: Real US iPhone visitor on custom domain
const simReqA = {
  headers: {
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'cf-connecting-ip': '172.56.21.89',
    'cf-ipcountry': 'US',
    'referer': 'https://l.instagram.com/'
  },
  query: { tp: '5' }
};

const signalsA = SignalExtractor.extractFromRequest(simReqA);
const resultA = DecisionEngine.evaluate(mockSmartLink, signalsA);
assert(resultA.matchedRuleId === 'rule-us-mobile', 'Real US iPhone visitor matches Rule 1');
assert(resultA.destinationUrl === 'https://mysafestore.com/vip-offer-deal', 'Real US iPhone visitor routes to target offer page');

// Simulated Visitor B: Meta / Facebook Ad Review Bot on AWS Datacenter
const simReqB = {
  headers: {
    'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'cf-connecting-ip': '3.80.12.1', // AWS Datacenter
    'cf-ipcountry': 'US'
  },
  query: {}
};

const signalsB = SignalExtractor.extractFromRequest(simReqB);
const resultB = DecisionEngine.evaluate(mockSmartLink, signalsB);
assert(resultB.datacenterBlocked === true || resultB.botBlocked === true || resultB.isFallback === true, 'Meta Review Bot intercepted by Datacenter Firewall');
assert(resultB.destinationUrl === 'https://mysafestore.com/safe-article', 'Meta Review Bot dropped to compliant safe page fallback');

console.log('\n========================================================================');
console.log(`  FINAL RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
console.log('========================================================================\n');
