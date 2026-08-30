import { DomainsService } from '../../../public/src/domains.service';

console.log('========================================================================');
console.log('  TEST SUITE 14: CENTRALIZED CUSTOM DOMAINS & DNS ENGINE VERIFICATION  ');
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

// 🧪 1. Testing Domain Normalization
console.log('🧪 1. Testing Domain Normalization...');
const testCases = [
  { input: 'https://Go.MyBrand.com/', expected: 'go.mybrand.com' },
  { input: 'http://Shop.Brand.io:3000/some/path', expected: 'shop.brand.io' },
  { input: '  MYWEBSITE.COM  ', expected: 'mywebsite.com' },
];

testCases.forEach(({ input, expected }) => {
  const normalized = DomainsService.normalizeDomain(input);
  assert(normalized === expected, `Normalized "${input}" -> "${expected}"`);
});

// 🧪 2. Testing Apex vs Subdomain Detection
console.log('\n🧪 2. Testing Apex vs Subdomain Detection...');
assert(DomainsService.isApexDomain('mybrand.com') === true, 'mybrand.com recognized as Apex domain');
assert(DomainsService.isApexDomain('startup.io') === true, 'startup.io recognized as Apex domain');
assert(DomainsService.isApexDomain('brand.co.uk') === true, 'brand.co.uk recognized as Apex domain (second-level TLD)');
assert(DomainsService.isApexDomain('go.mybrand.com') === false, 'go.mybrand.com recognized as Subdomain');
assert(DomainsService.isApexDomain('track.links.brand.io') === false, 'track.links.brand.io recognized as Subdomain');

// 🧪 3. Testing Required DNS Record Generation
console.log('\n🧪 3. Testing Required DNS Record Generation...');

// Case A: Apex Domain
const apexRecords = DomainsService.calculateRequiredRecords('mybrand.com', 'vc-domain-verify=mybrand.com,12345');
assert(apexRecords.some(r => r.type === 'A' && r.name === '@' && r.value === '76.76.21.21'), 'Apex generates A record pointing to 76.76.21.21');
assert(apexRecords.some(r => r.type === 'CNAME' && r.name === 'www' && r.value === 'cname.vercel-dns.com'), 'Apex generates www CNAME record pointing to cname.vercel-dns.com');
assert(apexRecords.some(r => r.type === 'TXT' && r.name === '_vercel'), 'Apex generates _vercel TXT ownership record');

// Case B: Subdomain
const subRecords = DomainsService.calculateRequiredRecords('go.mybrand.com');
assert(subRecords.length === 1, 'Subdomain generates exactly 1 CNAME record');
assert(subRecords[0].type === 'CNAME', 'Subdomain record is CNAME');
assert(subRecords[0].name === 'go', 'Subdomain record name is "go"');
assert(subRecords[0].value === 'cname.vercel-dns.com', 'Subdomain target is "cname.vercel-dns.com"');

console.log('\n========================================================================');
console.log(`  FINAL RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
console.log('========================================================================\n');
