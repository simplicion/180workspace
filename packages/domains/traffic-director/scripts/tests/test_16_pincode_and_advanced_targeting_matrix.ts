import { DecisionEngine, EvaluatableLink } from '../../src/evaluator/decision-engine';
import { SignalExtractor } from '../../src/evaluator/signal-extractor';

export async function runTest16(): Promise<{ name: string; passed: boolean; details?: string }> {
  const testSuiteName = 'Suite 16: PIN/Postal Code & Advanced Targeting Matrix Tests';
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING: ${testSuiteName}`);
  console.log(`======================================================\n`);

  let assertionsPassed = 0;
  const totalAssertions = 10;

  try {
    // 1. PIN / Postal Code Exact Match
    const linkWithPostalExact: EvaluatableLink = {
      id: 'link-pincode-1',
      fallbackUrl: 'https://fallback.com/global',
      isActive: true,
      rules: [
        {
          id: 'rule-beverly-hills',
          name: 'Beverly Hills 90210 High-Income Offer',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/luxury-offer-90210',
          actionType: 'redirect_302',
          conditions: [
            { type: 'geo_postal_code', operator: 'equals', value: '90210' }
          ]
        }
      ]
    };

    const signalsPostal90210 = SignalExtractor.extractFromRequest({
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        'cf-ipcountry': 'US',
        'cf-postal-code': '90210'
      }
    });

    const res1 = DecisionEngine.evaluate(linkWithPostalExact, signalsPostal90210);
    if (res1.matchedRuleId === 'rule-beverly-hills' && res1.destinationUrl === 'https://landing.com/luxury-offer-90210') {
      console.log('  ✅ [1/10] PIN/Postal Code exact match passed (90210 routed to luxury offer)');
      assertionsPassed++;
    } else {
      throw new Error(`Postal exact match failed: got ${res1.destinationUrl}`);
    }

    // 2. PIN / Postal Code Comma-Separated List Match (`in`)
    const linkWithPostalList: EvaluatableLink = {
      id: 'link-pincode-2',
      fallbackUrl: 'https://fallback.com/global',
      isActive: true,
      rules: [
        {
          id: 'rule-delhi-ncr',
          name: 'Delhi NCR Metro PIN Codes',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/delhi-exclusive-offer',
          actionType: 'redirect_302',
          conditions: [
            { type: 'geo_country', operator: 'equals', value: 'IN' },
            { type: 'geo_postal_code', operator: 'in', value: '110001, 110002, 110003, 110020' }
          ]
        }
      ]
    };

    const signalsDelhi = SignalExtractor.extractFromRequest({
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
        'cf-ipcountry': 'IN',
        'x-geo-postal-code': '110002'
      }
    });

    const res2 = DecisionEngine.evaluate(linkWithPostalList, signalsDelhi);
    if (res2.matchedRuleId === 'rule-delhi-ncr' && res2.destinationUrl === 'https://landing.com/delhi-exclusive-offer') {
      console.log('  ✅ [2/10] PIN/Postal Code comma-separated list match passed (110002 matched)');
      assertionsPassed++;
    } else {
      throw new Error(`Postal list match failed: got ${res2.destinationUrl}`);
    }

    // 3. PIN / Postal Code Prefix Wildcard (`starts_with` or `902*`)
    const linkWithPostalWildcard: EvaluatableLink = {
      id: 'link-pincode-3',
      fallbackUrl: 'https://fallback.com/global',
      isActive: true,
      rules: [
        {
          id: 'rule-west-la-cluster',
          name: 'West LA 902xx Postal Cluster',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/west-la-campaign',
          actionType: 'redirect_302',
          conditions: [
            { type: 'geo_postal_code', operator: 'starts_with', value: '902' }
          ]
        }
      ]
    };

    const signalsWildcard = SignalExtractor.extractFromRequest({
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        'cf-ipcountry': 'US',
        'x-zip-code': '90277'
      }
    });

    const res3 = DecisionEngine.evaluate(linkWithPostalWildcard, signalsWildcard);
    if (res3.matchedRuleId === 'rule-west-la-cluster') {
      console.log('  ✅ [3/10] PIN/Postal Code prefix starts_with passed (90277 matched 902*)');
      assertionsPassed++;
    } else {
      throw new Error(`Postal wildcard failed: got ${res3.destinationUrl}`);
    }

    // 4. In-App Browser Detection (Instagram In-App WebView)
    const linkInApp: EvaluatableLink = {
      id: 'link-inapp-1',
      fallbackUrl: 'https://fallback.com/clean-site',
      isActive: true,
      rules: [
        {
          id: 'rule-ig-inapp',
          name: 'Instagram In-App Traffic',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/instagram-shoppable-offer',
          actionType: 'redirect_302',
          conditions: [
            { type: 'browser', operator: 'contains', value: 'Instagram' }
          ]
        }
      ]
    };

    const signalsInstagram = SignalExtractor.extractFromRequest({
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 324.0.0.18.109',
        'referer': 'https://instagram.com/'
      }
    });

    const res4 = DecisionEngine.evaluate(linkInApp, signalsInstagram);
    if (res4.matchedRuleId === 'rule-ig-inapp') {
      console.log('  ✅ [4/10] In-App Browser detection passed (Instagram In-App matched)');
      assertionsPassed++;
    } else {
      throw new Error(`In-app browser rule failed: got ${res4.destinationUrl}`);
    }

    // 5. In-App Browser Detection (TikTok In-App WebView)
    const linkTikTok: EvaluatableLink = {
      id: 'link-tiktok-1',
      fallbackUrl: 'https://fallback.com/clean-site',
      isActive: true,
      rules: [
        {
          id: 'rule-tt-inapp',
          name: 'TikTok In-App Traffic',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/tiktok-challenge-offer',
          actionType: 'redirect_302',
          conditions: [
            { type: 'browser', operator: 'contains', value: 'TikTok' }
          ]
        }
      ]
    };

    const signalsTikTok = SignalExtractor.extractFromRequest({
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36 BytedanceWebview/1.0.0 musical_ly_31.5.3',
        'referer': 'https://tiktok.com/'
      }
    });

    const res5 = DecisionEngine.evaluate(linkTikTok, signalsTikTok);
    if (res5.matchedRuleId === 'rule-tt-inapp') {
      console.log('  ✅ [5/10] In-App Browser detection passed (TikTok In-App matched)');
      assertionsPassed++;
    } else {
      throw new Error(`TikTok in-app rule failed: got ${res5.destinationUrl}`);
    }

    // 6. WebGL GPU Hardware Engine Check
    const linkGpu: EvaluatableLink = {
      id: 'link-gpu-1',
      fallbackUrl: 'https://fallback.com/safe-page',
      isActive: true,
      rules: [
        {
          id: 'rule-real-metal-gpu',
          name: 'Apple GPU Hardware Only',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/high-res-3d-offer',
          actionType: 'redirect_302',
          conditions: [
            { type: 'gpu_renderer', operator: 'contains', value: 'apple' }
          ]
        }
      ]
    };

    const signalsRealAppleGpu = SignalExtractor.extractFromRequest({
      headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
      query: { gpu: 'Apple GPU / Metal A17 Pro' }
    });

    const res6 = DecisionEngine.evaluate(linkGpu, signalsRealAppleGpu);
    if (res6.matchedRuleId === 'rule-real-metal-gpu') {
      console.log('  ✅ [6/10] WebGL GPU hardware check passed (Apple GPU matched)');
      assertionsPassed++;
    } else {
      throw new Error(`GPU rule failed: got ${res6.destinationUrl}`);
    }

    // 7. Multi-Country Targeting List (`in`)
    const linkTier1Geos: EvaluatableLink = {
      id: 'link-tier1-1',
      fallbackUrl: 'https://fallback.com/tier2-offer',
      isActive: true,
      rules: [
        {
          id: 'rule-tier1',
          name: 'Tier 1 Geos Direct Campaign',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/tier1-english-offer',
          actionType: 'redirect_302',
          conditions: [
            { type: 'geo_country', operator: 'in', value: 'US, GB, CA, AU, NZ, IE' }
          ]
        }
      ]
    };

    const signalsAustralia = SignalExtractor.extractFromRequest({
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'cf-ipcountry': 'AU'
      }
    });

    const res7 = DecisionEngine.evaluate(linkTier1Geos, signalsAustralia);
    if (res7.matchedRuleId === 'rule-tier1') {
      console.log('  ✅ [7/10] Multi-Country targeting list passed (AU in US,GB,CA,AU,NZ,IE)');
      assertionsPassed++;
    } else {
      throw new Error(`Multi-country list failed: got ${res7.destinationUrl}`);
    }

    // 8. Visitor State / Region & Timezone Matching
    const linkStateTz: EvaluatableLink = {
      id: 'link-state-tz-1',
      fallbackUrl: 'https://fallback.com/general',
      isActive: true,
      rules: [
        {
          id: 'rule-california-pacific',
          name: 'California Region & Timezone',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/california-local-offer',
          actionType: 'redirect_302',
          conditions: [
            { type: 'geo_region', operator: 'equals', value: 'CA' },
            { type: 'geo_timezone', operator: 'contains', value: 'Los_Angeles' }
          ]
        }
      ]
    };

    const signalsCalifornia = SignalExtractor.extractFromRequest({
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'cf-ipcountry': 'US',
        'cf-region': 'CA',
        'cf-timezone': 'America/Los_Angeles'
      }
    });

    const res8 = DecisionEngine.evaluate(linkStateTz, signalsCalifornia);
    if (res8.matchedRuleId === 'rule-california-pacific') {
      console.log('  ✅ [8/10] State / Region & Timezone targeting passed (CA + Los_Angeles matched)');
      assertionsPassed++;
    } else {
      throw new Error(`State/Tz rule failed: got ${res8.destinationUrl}`);
    }

    // 9. URL Query Parameter Key/Value Matching
    const linkQuery: EvaluatableLink = {
      id: 'link-query-1',
      fallbackUrl: 'https://fallback.com/organic',
      isActive: true,
      rules: [
        {
          id: 'rule-influencer-promo',
          name: 'Influencer Promo Tag',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/influencer-vip-deal',
          actionType: 'redirect_302',
          conditions: [
            { type: 'query_param', operator: 'equals', key: 'promo', value: 'summer2026' }
          ]
        }
      ]
    };

    const signalsQueryPromo = SignalExtractor.extractFromRequest({
      headers: { 'user-agent': 'Mozilla/5.0' },
      query: { promo: 'summer2026', utm_source: 'instagram' }
    });

    const res9 = DecisionEngine.evaluate(linkQuery, signalsQueryPromo);
    if (res9.matchedRuleId === 'rule-influencer-promo') {
      console.log('  ✅ [9/10] URL Query Parameter key/value matching passed (promo=summer2026 matched)');
      assertionsPassed++;
    } else {
      throw new Error(`Query param rule failed: got ${res9.destinationUrl}`);
    }

    // 10. Cloud ASN Firewall Drop (Meta & TikTok Review Bot Protection)
    const linkMetaShield: EvaluatableLink = {
      id: 'link-meta-1',
      fallbackUrl: 'https://fallback.com/whitehat-compliance-doc',
      isActive: true,
      datacenterBlocked: true,
      rules: [
        {
          id: 'rule-money-page',
          name: 'Live Conversion Lander',
          priority: 0,
          isActive: true,
          destinationUrl: 'https://landing.com/crypto-fintech-offer',
          actionType: 'redirect_302',
          conditions: [
            { type: 'bot_status', operator: 'equals', value: 'human' }
          ]
        }
      ]
    };

    const signalsMetaBot = SignalExtractor.extractFromRequest({
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        'cf-ipasn': '32934',
        'cf-as-organization': 'Meta Platforms, Inc.'
      }
    });

    const res10 = DecisionEngine.evaluate(linkMetaShield, signalsMetaBot);
    if (res10.isFallback && (res10.datacenterBlocked || res10.matchedRuleName?.includes('Firewall'))) {
      console.log('  ✅ [10/10] Meta ASN 32934 Drop passed (Ad review crawler dropped to whitehat page)');
      assertionsPassed++;
    } else {
      throw new Error(`Meta ASN drop failed: got ${res10.destinationUrl}`);
    }

    console.log(`\n🎉 All ${assertionsPassed}/${totalAssertions} assertions passed in ${testSuiteName}!\n`);
    return { name: testSuiteName, passed: true };
  } catch (error: any) {
    console.error(`\n❌ ${testSuiteName} FAILED:`, error.message);
    return { name: testSuiteName, passed: false, details: error.message };
  }
}

if (require.main === module) {
  runTest16()
    .then(r => process.exit(r.passed ? 0 : 1))
    .catch(e => { console.error(e); process.exit(1); });
}
