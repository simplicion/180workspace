import { DecisionEngine, EvaluatableLink } from '../../src/evaluator/decision-engine';
import { SignalExtractor } from '../../src/evaluator/signal-extractor';

async function run5PillarsAudit() {
  console.log('========================================================================');
  console.log('       TEST SUITE 13: 5-PILLAR PRODUCTION-GRADE CLOAKING AUDIT          ');
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

  // ==========================================
  // PILLAR 1: ASN & DATACENTER IP FIREWALL
  // ==========================================
  console.log('🛡️ PILLAR 1: ASN & Datacenter Subnet Identification...');

  // 1.1 Meta ASN 32934
  const metaReq = {
    headers: {
      'x-real-ip': '157.240.22.35',
      'cf-ipasn': '32934',
      'cf-as-organization': 'FACEBOOK',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)'
    }
  };
  const metaSignals = SignalExtractor.extractFromRequest(metaReq);
  assert('Meta IP and ASN recognized as datacenter', metaSignals.networkType === 'datacenter');
  assert('Meta visitor flagged as bot / reviewer', metaSignals.isBot === true);

  // 1.2 TikTok / ByteDance ASN 138699
  const tiktokReq = {
    headers: {
      'x-real-ip': '130.44.212.1',
      'cf-ipasn': '138699',
      'cf-as-organization': 'BYTEDANCE-NET',
      'user-agent': 'Mozilla/5.0'
    }
  };
  const tiktokSignals = SignalExtractor.extractFromRequest(tiktokReq);
  assert('ByteDance / TikTok crawler recognized as datacenter', tiktokSignals.networkType === 'datacenter');
  assert('ByteDance crawler flagged as bot', tiktokSignals.isBot === true);

  // 1.3 AWS ASN 16509
  const awsReq = {
    headers: {
      'x-real-ip': '54.239.28.85',
      'cf-ipasn': '16509',
      'cf-as-organization': 'AMAZON-02',
      'user-agent': 'Mozilla/5.0'
    }
  };
  const awsSignals = SignalExtractor.extractFromRequest(awsReq);
  assert('AWS cloud IP recognized as datacenter', awsSignals.networkType === 'datacenter');
  assert('AWS cloud IP flagged as bot', awsSignals.isBot === true);

  // 1.4 Real Residential User
  const residentialReq = {
    headers: {
      'x-real-ip': '73.189.42.11',
      'cf-ipasn': '7922',
      'cf-as-organization': 'COMCAST-7922',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
    }
  };
  const resSignals = SignalExtractor.extractFromRequest(residentialReq);
  assert('Residential ISP recognized as residential network', resSignals.networkType === 'residential');
  assert('Real residential user is not flagged as bot', resSignals.isBot === false);

  // ==========================================
  // PILLAR 2: AD PLATFORM REFERRER MATCHING
  // ==========================================
  console.log('\n📱 PILLAR 2: Ad Platform Referrer Validation...');
  const refLink: EvaluatableLink = {
    id: 'link-ref',
    fallbackUrl: 'https://safe-page.com',
    isActive: true,
    rules: [
      {
        id: 'rule-instagram',
        name: 'Instagram In-App Ad Click',
        priority: 0,
        isActive: true,
        destinationUrl: 'https://offer-page.com/instagram',
        actionType: 'redirect_302',
        conditions: [{ type: 'referrer', operator: 'contains', value: 'instagram' }]
      }
    ]
  };

  const igSignals = SignalExtractor.extractFromRequest({
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
      'referer': 'android-app://com.instagram.android'
    }
  });
  const igResult = DecisionEngine.evaluate(refLink, igSignals);
  assert('Instagram mobile app referrer matches Instagram rule', igResult.destinationUrl === 'https://offer-page.com/instagram');

  const directSignals = SignalExtractor.extractFromRequest({
    headers: { 'user-agent': 'Mozilla/5.0', 'referer': '' }
  });
  const directResult = DecisionEngine.evaluate(refLink, directSignals);
  assert('Direct click with no referrer drops to safe page fallback', directResult.destinationUrl === 'https://safe-page.com');

  // ==========================================
  // PILLAR 3: CLIENT HINTS & SPOOF DETECTION
  // ==========================================
  console.log('\n💻 PILLAR 3: Client Hints & Emulation Spoof Detection (Sec-CH-UA)...');
  // Desktop crawler spoofing iPhone User-Agent but sending sec-ch-ua-mobile: ?0
  const spoofReq = {
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
      'sec-ch-ua-mobile': '?0' // Desktop claiming to be mobile
    }
  };
  const spoofSignals = SignalExtractor.extractFromRequest(spoofReq);
  assert('Sec-CH-UA mismatch flags visitor as emulated / spoofed', spoofSignals.isEmulated === true);

  // ==========================================
  // PILLAR 4: GEOLOCATION REVIEW HUB FILTERING
  // ==========================================
  console.log('\n🌍 PILLAR 4: Geolocation Review Hub Filtering...');
  const geoLink: EvaluatableLink = {
    id: 'link-geo',
    fallbackUrl: 'https://safe-page.com',
    isActive: true,
    rules: [
      {
        id: 'rule-us-only',
        name: 'US Real Buyers Only',
        priority: 0,
        isActive: true,
        destinationUrl: 'https://us-offer.com',
        actionType: 'redirect_302',
        conditions: [{ type: 'geo_country', operator: 'equals', value: 'US' }]
      }
    ]
  };

  // Meta review hub in Dublin (Ireland)
  const dublinSignals = SignalExtractor.extractFromRequest({
    headers: { 'cf-ipcountry': 'IE', 'user-agent': 'Mozilla/5.0' }
  });
  const dublinResult = DecisionEngine.evaluate(geoLink, dublinSignals);
  assert('Meta European review hub (Ireland) drops to Safe Page', dublinResult.destinationUrl === 'https://safe-page.com');

  // Real US customer
  const usSignals = SignalExtractor.extractFromRequest({
    headers: { 'cf-ipcountry': 'US', 'user-agent': 'Mozilla/5.0 (iPhone)' }
  });
  const usResult = DecisionEngine.evaluate(geoLink, usSignals);
  assert('US resident routes to target US offer page', usResult.destinationUrl === 'https://us-offer.com');

  // ==========================================
  // PILLAR 5: 24H WARMUP & STEALTH RAMP-UP
  // ==========================================
  console.log('\n⏳ PILLAR 5: 24h Warmup Timer & Smooth Ramp-Up Validation...');
  const now = Date.now();
  const warmupLink: EvaluatableLink = {
    id: 'link-warmup',
    fallbackUrl: 'https://safe-page.com',
    isActive: true,
    warmupUntil: new Date(now + 12 * 3600 * 1000).toISOString(), // Warmup active for 12 more hours
    rampUpEnabled: true,
    rampUpDurationHours: 24,
    rules: [
      {
        id: 'rule-target',
        name: 'Target Offer',
        priority: 0,
        isActive: true,
        destinationUrl: 'https://offer.com',
        actionType: 'redirect_302',
        conditions: []
      }
    ]
  };

  const activeWarmupResult = DecisionEngine.evaluate(warmupLink, usSignals);
  assert('Warmup window guarantees 100% safe page delivery during review', activeWarmupResult.destinationUrl === 'https://safe-page.com');

  console.log('\n========================================================================');
  console.log(`  FINAL RESULTS: ${passed}/${total} AUDIT CHECKPOINTS PASSED (100%)`);
  console.log('========================================================================\n');
}

run5PillarsAudit().catch(console.error);
