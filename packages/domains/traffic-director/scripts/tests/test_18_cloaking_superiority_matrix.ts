import assert from 'node:assert';
import { SignalExtractor } from '../../src/evaluator/signal-extractor';
import { DecisionEngine, EvaluatableLink } from '../../src/evaluator/decision-engine';
import { ClientShieldGenerator } from '../../src/evaluator/client-shield-generator';

async function runTests() {
  console.log('\n========================================================================');
  console.log('🛡️ TEST SUITE 18: CLOAKING & INTELLIGENCE SUPERIORITY VERIFICATION');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Ad Spy Service Detection (AdPlexity, SpyOver, Anstrex, etc.)
  // -------------------------------------------------------------------------
  console.log('[1/6] Testing Ad Spy Service Detection (User-Agent & ASN)...');

  // 1a. User-Agent detection: AdPlexity crawler
  const reqAdPlexity = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AdPlexity Mobile Intelligence Crawler 2.0',
      'x-forwarded-for': '198.51.100.12'
    }
  } as any;
  const signalsAdPlexity = await SignalExtractor.extract(reqAdPlexity);
  assert.strictEqual(signalsAdPlexity.isSpyService, true, 'AdPlexity crawler should be flagged as spy service');
  assert.strictEqual(signalsAdPlexity.spyServiceName, 'AdPlexity', 'Spy service name should be AdPlexity');
  console.log('  ✓ AdPlexity crawler detected via User-Agent signature');

  // 1b. User-Agent detection: Anstrex scraper
  const reqAnstrex = {
    headers: {
      'user-agent': 'AnstrexPushMonitor/1.0 (+https://anstrex.com/bot)',
      'x-forwarded-for': '198.51.100.15'
    }
  } as any;
  const signalsAnstrex = await SignalExtractor.extract(reqAnstrex);
  assert.strictEqual(signalsAnstrex.isSpyService, true);
  assert.strictEqual(signalsAnstrex.spyServiceName, 'Anstrex');
  console.log('  ✓ Anstrex scraper detected via User-Agent signature');

  // 1c. Datacenter Spy Proxy ASN detection: M247 / Choopa / DataCamp
  const reqSpyAsn = {
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      'x-forwarded-for': '185.107.56.1',
      'cf-iporganization': 'M247 Ltd Europe Proxy Pool'
    }
  } as any;
  const signalsSpyAsn = await SignalExtractor.extract(reqSpyAsn);
  assert.strictEqual(signalsSpyAsn.isSpyService, true);
  assert.strictEqual(signalsSpyAsn.spyServiceName, 'M247 Proxy Network');
  console.log('  ✓ Commercial spy proxy provider (M247) detected via ASN organization');

  // -------------------------------------------------------------------------
  // TEST 2: Telecom Carrier & ISP Normalization
  // -------------------------------------------------------------------------
  console.log('\n[2/6] Testing Telecom Carrier & Consumer ISP Normalization...');

  const reqJio = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 14; SM-S928B) Mobile Safari/537.36',
      'x-forwarded-for': '49.44.64.1',
      'cf-iporganization': 'Reliance Jio Infocomm Limited'
    }
  } as any;
  const signalsJio = await SignalExtractor.extract(reqJio);
  assert.strictEqual(signalsJio.isp, 'Jio', 'Reliance Jio should be normalized to Jio');
  console.log('  ✓ Reliance Jio normalized to ISP: Jio');

  const reqVerizon = {
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
      'x-forwarded-for': '108.16.0.1',
      'cf-iporganization': 'Verizon Wireless Fios Broadband'
    }
  } as any;
  const signalsVerizon = await SignalExtractor.extract(reqVerizon);
  assert.strictEqual(signalsVerizon.isp, 'Verizon', 'Verizon Wireless should be normalized to Verizon');
  console.log('  ✓ Verizon Wireless normalized to ISP: Verizon');

  const reqComcast = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'x-forwarded-for': '73.1.2.3',
      'cf-iporganization': 'Comcast Cable Communications, LLC'
    }
  } as any;
  const signalsComcast = await SignalExtractor.extract(reqComcast);
  assert.strictEqual(signalsComcast.isp, 'Comcast', 'Comcast Cable should be normalized to Comcast');
  console.log('  ✓ Comcast Cable normalized to ISP: Comcast');

  // -------------------------------------------------------------------------
  // TEST 3: Timezone Delta / VPN Geolocation Anomaly
  // -------------------------------------------------------------------------
  console.log('\n[3/6] Testing Timezone Delta Anomaly & VPN Detection...');

  const reqTzMismatch = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      'cf-ipcountry': 'US',
      'cf-timezone': 'America/New_York',
      'x-forwarded-for': '108.16.0.1'
    },
    body: {
      clientTimezone: 'Asia/Kolkata' // Client device clock is India, but IP is US
    }
  } as any;
  const signalsTz = await SignalExtractor.extract(reqTzMismatch);
  assert.strictEqual(signalsTz.hasTimezoneDelta, true, 'Timezone delta should be flagged true');
  assert.strictEqual(signalsTz.isVpn, true, 'Should be flagged as VPN due to geo mismatch');
  assert.ok(signalsTz.vpnReason?.includes('Timezone mismatch'), 'VPN reason should mention timezone mismatch');
  console.log('  ✓ Timezone Delta unmasked VPN (Client: Asia/Kolkata vs IP: America/New_York)');

  // -------------------------------------------------------------------------
  // TEST 4: Decision Engine Condition Evaluation
  // -------------------------------------------------------------------------
  console.log('\n[4/6] Testing Decision Engine with Advanced Condition Rules...');

  const testLink: EvaluatableLink = {
    id: 'link-101',
    fallbackUrl: 'https://myshop.com/safe-page',
    isActive: true,
    safePageProxyMode: true,
    rules: [
      {
        id: 'rule-isp-jio',
        name: 'Target Jio Mobile Traffic',
        priority: 1,
        isActive: true,
        destinationUrl: 'https://offer.com/in-promo',
        actionType: 'redirect_302',
        conditions: [
          { type: 'isp_provider', operator: 'equals', value: 'Jio' },
          { type: 'vpn_status', operator: 'equals', value: 'clean' },
          { type: 'spy_service', operator: 'equals', value: 'clean' }
        ]
      }
    ]
  };

  // 4a. Clean human on Jio -> Matches rule
  const cleanJioSignals = {
    ...signalsJio,
    isBot: false,
    isSpyService: false,
    isVpn: false,
    isTor: false
  };
  const resultJio = DecisionEngine.evaluate(testLink, cleanJioSignals);
  assert.strictEqual(resultJio.isFallback, false);
  assert.strictEqual(resultJio.matchedRuleId, 'rule-isp-jio');
  assert.strictEqual(resultJio.destinationUrl, 'https://offer.com/in-promo');
  console.log('  ✓ Real Jio human visitor correctly routed to offer page');

  // 4b. Spy service arriving -> Denied by spy_service condition
  const spyJioSignals = {
    ...cleanJioSignals,
    isSpyService: true,
    spyServiceName: 'AdPlexity'
  };
  const resultSpyDenied = DecisionEngine.evaluate(testLink, spyJioSignals);
  assert.strictEqual(resultSpyDenied.isFallback, true);
  assert.strictEqual(resultSpyDenied.destinationUrl, 'https://myshop.com/safe-page');
  console.log('  ✓ Spy Service visitor denied by rule and routed to safe page');

  // -------------------------------------------------------------------------
  // TEST 5: Link-Level 1-Click Defense Firewalls (blockSpyServices & blockVpn)
  // -------------------------------------------------------------------------
  console.log('\n[5/6] Testing Link-Level 1-Click Defense Firewalls...');

  const firewallLink: EvaluatableLink = {
    id: 'link-102',
    fallbackUrl: 'https://myshop.com/safe-page',
    isActive: true,
    blockSpyServices: true,
    blockVpn: true,
    rules: [
      {
        id: 'rule-target',
        name: 'All Traffic',
        priority: 1,
        isActive: true,
        destinationUrl: 'https://offer.com/all',
        actionType: 'redirect_302',
        conditions: []
      }
    ]
  };

  // 5a. Block Spy Services 1-click firewall
  const resultSpyFirewall = DecisionEngine.evaluate(firewallLink, {
    ...cleanJioSignals,
    isSpyService: true,
    spyServiceName: 'SpyOver'
  });
  assert.strictEqual(resultSpyFirewall.isFallback, true);
  assert.ok(resultSpyFirewall.matchedRuleName?.includes('Spy Service Block'));
  console.log('  ✓ 1-Click Spy Service Firewall dropped SpyOver immediately');

  // 5b. Block VPN 1-click firewall
  const resultVpnFirewall = DecisionEngine.evaluate(firewallLink, {
    ...cleanJioSignals,
    isVpn: true,
    vpnReason: 'Residential Proxy Detected'
  });
  assert.strictEqual(resultVpnFirewall.isFallback, true);
  assert.ok(resultVpnFirewall.matchedRuleName?.includes('VPN / Proxy Firewall'));
  console.log('  ✓ 1-Click VPN Firewall dropped proxy visitor immediately');

  // -------------------------------------------------------------------------
  // TEST 6: Standalone PHP Integration Generator
  // -------------------------------------------------------------------------
  console.log('\n[6/6] Testing Standalone index.php Script Generation...');

  const generatedPhp = ClientShieldGenerator.generateStandalonePhpFile({
    slug: 'foodandme',
    apiBaseUrl: 'http://localhost:4002'
  });

  assert.ok(generatedPhp.includes('180workspace Traffic Director - Standalone Edge Routing Gateway'));
  assert.ok(generatedPhp.includes('$config'));
  assert.ok(generatedPhp.includes('foodandme'));
  assert.ok(generatedPhp.includes('get_client_ip'));
  assert.ok(generatedPhp.includes('proxy_target_offer'));
  assert.ok(generatedPhp.includes('serve_safe_page'));
  assert.ok(generatedPhp.includes('sec-fetch-dest'));
  console.log('  ✓ Generated standalone index.php gateway with transparent reverse-proxy, IP resolvers & loop guards');

  console.log('\n========================================================================');
  console.log('🎉 ALL 6 CLOAKING SUPERIORITY SUITE CHECKS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test Suite 18 failed:', err);
  process.exit(1);
});
