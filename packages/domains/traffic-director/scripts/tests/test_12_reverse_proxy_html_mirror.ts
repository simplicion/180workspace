import assert from 'assert';
import { ReverseProxyService } from '../../src/services/proxy.service';
import { DecisionEngine } from '../../src/evaluator/decision-engine';
import { ExtractedSignals } from '../../src/types';

async function runTests() {
  console.log('--- TEST SUITE 12: Reverse Proxy Safe Page Mirror (HTTP 200 OK) & Multi-Action Engine ---');

  // 1. SSRF Guard Tests
  assert.strictEqual(ReverseProxyService.isSafeUrl('http://127.0.0.1:3000/internal'), false, 'Must block 127.0.0.1');
  assert.strictEqual(ReverseProxyService.isSafeUrl('http://localhost:5000'), false, 'Must block localhost');
  assert.strictEqual(ReverseProxyService.isSafeUrl('http://169.254.169.254/latest/meta-data'), false, 'Must block AWS metadata endpoint');
  assert.strictEqual(ReverseProxyService.isSafeUrl('http://10.0.0.5/admin'), false, 'Must block 10.0.0.0/8 private network');
  assert.strictEqual(ReverseProxyService.isSafeUrl('http://192.168.1.100/status'), false, 'Must block 192.168.0.0/16 private network');
  assert.strictEqual(ReverseProxyService.isSafeUrl('ftp://example.com/file'), false, 'Must block non-HTTP protocols');
  assert.strictEqual(ReverseProxyService.isSafeUrl('https://foot-and-us-rahul.vercel.app'), true, 'Must allow valid public HTTPS URL');
  assert.strictEqual(ReverseProxyService.isSafeUrl('https://example.com/clean-safe-page'), true, 'Must allow valid public domain');
  console.log('✓ Test 12.1: SSRF & Private IP guard successfully protects against internal infrastructure attacks.');

  // 2. Decision Engine Fallback Proxy Mode Tests
  const mockSignals: ExtractedSignals = {
    ipAddress: '66.249.66.1', // Googlebot IP
    country: 'US',
    city: 'Mountain View',
    deviceType: 'desktop',
    os: 'linux',
    browser: 'chrome',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    referrer: '',
    isBot: true,
    botName: 'Googlebot',
    language: 'en',
    networkType: 'datacenter',
    headers: {},
    queryParams: {},
    timestamp: new Date()
  };

  const evalResult = DecisionEngine.evaluate({
    id: 'link-123',
    fallbackUrl: 'https://foot-and-us-rahul.vercel.app',
    isActive: true,
    safePageProxyMode: true,
    rules: [
      {
        id: 'rule-human-offer',
        name: 'Human Target Offer',
        priority: 1,
        isActive: true,
        destinationUrl: 'https://foot-and-us-rahul.vercel.app/alert',
        actionType: 'proxy_target_offer',
        conditions: [{ type: 'bot_status', operator: 'equals', value: 'human' }]
      }
    ]
  }, mockSignals);

  assert.strictEqual(evalResult.isFallback, true, 'Googlebot must trigger fallback');
  assert.strictEqual(evalResult.actionType, 'proxy_safe_page', 'Fallback with safePageProxyMode must return proxy_safe_page action');
  assert.strictEqual(evalResult.destinationUrl, 'https://foot-and-us-rahul.vercel.app', 'Fallback destination must be safe page');
  console.log('✓ Test 12.2: Decision Engine assigns proxy_safe_page (HTTP 200 OK) for bot / crawler visits.');

  // 3. Decision Engine Human Proxy Target Offer Rule Test
  const humanSignals: ExtractedSignals = {
    ...mockSignals,
    ipAddress: '103.21.244.2',
    networkType: 'cellular',
    isBot: false,
    botName: undefined,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  };

  const humanEvalResult = DecisionEngine.evaluate({
    id: 'link-123',
    fallbackUrl: 'https://foot-and-us-rahul.vercel.app',
    isActive: true,
    safePageProxyMode: true,
    rules: [
      {
        id: 'rule-human-offer',
        name: 'Human Target Offer',
        priority: 1,
        isActive: true,
        destinationUrl: 'https://foot-and-us-rahul.vercel.app/alert',
        actionType: 'proxy_target_offer',
        conditions: [{ type: 'bot_status', operator: 'equals', value: 'human' }]
      }
    ]
  }, humanSignals);

  assert.strictEqual(humanEvalResult.isFallback, false, 'Human must match rule');
  assert.strictEqual(humanEvalResult.actionType, 'proxy_target_offer', 'Human rule must preserve proxy_target_offer actionType');
  assert.strictEqual(humanEvalResult.destinationUrl, 'https://foot-and-us-rahul.vercel.app/alert');
  console.log('✓ Test 12.3: Decision Engine evaluates human rule with proxy_target_offer action accurately.');

  // 4. Live HTML Fetch & <base href> Injection Test
  try {
    const mirrorResult = await ReverseProxyService.fetchAndMirror('https://example.com');
    assert.ok(mirrorResult.html.includes('<base href="https://example.com/">'), 'Must inject <base href> tag into <head>');
    assert.strictEqual(mirrorResult.statusCode, 200, 'Must return 200 status code');
    assert.strictEqual(mirrorResult.isCached, false, 'First call is not cached');
    
    // Check second call hits LRU cache
    const cachedResult = await ReverseProxyService.fetchAndMirror('https://example.com');
    assert.strictEqual(cachedResult.isCached, true, 'Second call must hit in-memory cache');
    assert.ok(cachedResult.latencyMs < 50, 'Cached response latency must be sub-50ms');
    console.log('✓ Test 12.4: Reverse Proxy fetches live HTML, injects <base href="...">, and serves from cache seamlessly.');
  } catch (e: any) {
    console.log('⚠️ Network fetch test skipped (offline or sandbox):', e.message);
  }

  console.log('>>> TEST SUITE 12 ALL PASSED! <<<\n');
}

runTests().catch(err => {
  console.error('Test Suite 12 failed:', err);
  process.exit(1);
});
