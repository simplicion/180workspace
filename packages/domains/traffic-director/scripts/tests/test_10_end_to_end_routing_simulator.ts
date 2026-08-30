import assert from 'assert';
import { DecisionEngine } from '../../src/evaluator/decision-engine';
import { SignalExtractor } from '../../src/evaluator/signal-extractor';
import { ExtractedSignals, RuleCondition } from '../../src/types';

console.log('--- TEST SUITE 10: End-to-End Simulation & Multi-Condition Decision Flow ---');

// Mock link structure matching Prisma schema
const mockLink = {
  id: 'link-e2e-1',
  name: 'Global Black Friday Campaign',
  slug: 'black-friday',
  fallbackUrl: 'https://example.com/safe-home',
  isActive: true,
  datacenterBlocked: true,
  warmupUntil: null,
  rampUpEnabled: false,
  rules: [
    {
      id: 'rule-us-mobile',
      name: '1. US Mobile (iPhone/Android)',
      priority: 0,
      isActive: true,
      destinationUrl: 'https://example.com/us-mobile-app-install',
      actionType: 'redirect_302',
      conditions: [
        { type: 'geo_country', operator: 'equals', value: 'US' },
        { type: 'device_type', operator: 'equals', value: 'mobile' },
        { type: 'touch_support', operator: 'equals', value: 'true' },
        { type: 'bot_status', operator: 'equals', value: 'human' }
      ]
    },
    {
      id: 'rule-uk-desktop',
      name: '2. UK Desktop Shoppers',
      priority: 1,
      isActive: true,
      destinationUrl: 'https://example.com/uk-desktop-checkout',
      actionType: 'redirect_302',
      conditions: [
        { type: 'geo_country', operator: 'equals', value: 'GB' },
        { type: 'device_type', operator: 'equals', value: 'desktop' }
      ]
    },
    {
      id: 'rule-utm-promo',
      name: '3. Special Promo UTM Tag',
      priority: 2,
      isActive: true,
      destinationUrl: 'https://example.com/vip-promo',
      actionType: 'redirect_302',
      conditions: [
        { type: 'query_param', key: 'promo', operator: 'equals', value: 'vip' }
      ]
    }
  ]
};

// Simulation Execution Helper
function runSimulation(signals: ExtractedSignals) {
  const evaluation = DecisionEngine.evaluate(mockLink, signals);

  const ruleAudit = mockLink.rules.map(rule => {
    const conditions = rule.conditions as RuleCondition[];
    const conditionResults = conditions.map(cond => ({
      condition: cond,
      matched: DecisionEngine.evaluateCondition(cond, signals)
    }));

    const allConditionsPassed = conditionResults.length === 0 || conditionResults.every(c => c.matched);
    const isSelected = rule.id === evaluation.matchedRuleId;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      conditions: conditionResults,
      allConditionsPassed,
      isSelected
    };
  });

  return {
    evaluation,
    ruleAudit
  };
}

// 1. Simulation Scenario A: Real US iPhone Human
const simA_Req = {
  headers: {
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'cf-connecting-ip': '104.28.19.45',
    'cf-ipcountry': 'US',
    'cf-ipcity': 'Los Angeles'
  },
  query: { tp: '5', gpu: 'Apple GPU', bat: '0.82' }
};
const simA_Signals = SignalExtractor.extractFromRequest(simA_Req);
const simA_Out = runSimulation(simA_Signals);

assert.strictEqual(simA_Out.evaluation.isFallback, false);
assert.strictEqual(simA_Out.evaluation.matchedRuleId, 'rule-us-mobile');
assert.strictEqual(simA_Out.evaluation.destinationUrl, 'https://example.com/us-mobile-app-install');
assert.strictEqual(simA_Out.ruleAudit[0].isSelected, true);
assert.strictEqual(simA_Out.ruleAudit[0].allConditionsPassed, true);
console.log('✓ Test 10.1: Scenario A (Real US iPhone) matched Rule 1 perfectly.');

// 2. Simulation Scenario B: AWS Headless Bot spoofing iPhone UA (no touch + datacenter IP)
const simB_Req = {
  headers: {
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'cf-connecting-ip': '54.239.28.85',
    'cf-as-organization': 'Amazon.com, Inc.',
    'cf-ipasn': '16509',
    'cf-ipcountry': 'US'
  },
  query: { tp: '0', gpu: 'Google SwiftShader' }
};
const simB_Signals = SignalExtractor.extractFromRequest(simB_Req);
const simB_Out = runSimulation(simB_Signals);

assert.strictEqual(simB_Out.evaluation.isFallback, true, 'AWS Datacenter bot must be dropped to fallback');
assert.strictEqual(simB_Out.evaluation.datacenterBlocked, true);
assert.strictEqual(simB_Out.evaluation.destinationUrl, 'https://example.com/safe-home');
console.log('✓ Test 10.2: Scenario B (AWS Headless Bot) intercepted by Datacenter ASN Firewall.');

// 3. Simulation Scenario C: UK Desktop User
const simC_Req = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    'cf-connecting-ip': '82.165.197.1',
    'cf-ipcountry': 'GB',
    'cf-ipcity': 'London'
  },
  query: {}
};
const simC_Signals = SignalExtractor.extractFromRequest(simC_Req);
const simC_Out = runSimulation(simC_Signals);

assert.strictEqual(simC_Out.evaluation.isFallback, false);
assert.strictEqual(simC_Out.evaluation.matchedRuleId, 'rule-uk-desktop');
assert.strictEqual(simC_Out.evaluation.destinationUrl, 'https://example.com/uk-desktop-checkout');
assert.strictEqual(simC_Out.ruleAudit[0].isSelected, false, 'Rule 1 skipped (device!=mobile)');
assert.strictEqual(simC_Out.ruleAudit[1].isSelected, true, 'Rule 2 selected');
console.log('✓ Test 10.3: Scenario C (UK Desktop) matched Rule 2.');

// 4. Simulation Scenario D: German Visitor with VIP promo tag
const simD_Req = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    'cf-connecting-ip': '91.198.174.192',
    'cf-ipcountry': 'DE'
  },
  query: { promo: 'vip' }
};
const simD_Signals = SignalExtractor.extractFromRequest(simD_Req);
const simD_Out = runSimulation(simD_Signals);

assert.strictEqual(simD_Out.evaluation.isFallback, false);
assert.strictEqual(simD_Out.evaluation.matchedRuleId, 'rule-utm-promo');
assert.strictEqual(simD_Out.evaluation.destinationUrl, 'https://example.com/vip-promo');
console.log('✓ Test 10.4: Scenario D (German visitor with VIP promo query parameter) matched Rule 3.');

console.log('>>> TEST SUITE 10 ALL PASSED! <<<\n');
