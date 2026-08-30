import assert from 'assert';
import { SignalExtractor } from '../../src/evaluator/signal-extractor';
import { DecisionEngine } from '../../src/evaluator/decision-engine';

console.log('--- TEST SUITE 3: Hardware Telemetry Probing (SwiftShader / Touch / Battery) ---');

// 1. Mobile UA with missing touchscreen hardware (maxTouchPoints = 0)
const fakeMobileReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'cf-connecting-ip': '198.51.100.22'
  },
  query: {
    tp: '0', // 0 touchpoints on supposed iPhone!
    gpu: 'Apple GPU',
    bat: '0.9'
  }
};

const fakeMobileSignals = SignalExtractor.extractFromRequest(fakeMobileReq);
assert.strictEqual(fakeMobileSignals.deviceType, 'mobile', 'Device UA is mobile');
assert.strictEqual(fakeMobileSignals.touchPoints, 0, 'Touchpoints should be 0');
assert.strictEqual(fakeMobileSignals.isEmulated, true, 'Mobile client with 0 touchpoints must be flagged as emulated');
console.log('✓ Test 3.1: Touchscreen mismatch emulation detected.');

// 2. WebGL SwiftShader Software CPU Renderer
const swiftShaderReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'cf-connecting-ip': '198.51.100.33'
  },
  query: {
    tp: '0',
    gpu: 'Google SwiftShader (CPU Software Rasterizer)',
    bat: '1.0'
  }
};

const swiftShaderSignals = SignalExtractor.extractFromRequest(swiftShaderReq);
assert.strictEqual(swiftShaderSignals.isEmulated, true, 'SwiftShader renderer must be flagged as emulated');
console.log('✓ Test 3.2: WebGL SwiftShader CPU software renderer detected.');

// 3. llvmpipe / VirtualBox Software Renderer
const virtualBoxReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)',
    'cf-connecting-ip': '198.51.100.44'
  },
  query: {
    gpu: 'llvmpipe (LLVM 15.0.7, 256 bits)'
  }
};

const virtualBoxSignals = SignalExtractor.extractFromRequest(virtualBoxReq);
assert.strictEqual(virtualBoxSignals.isEmulated, true, 'llvmpipe renderer must be flagged as emulated');
console.log('✓ Test 3.3: Linux llvmpipe headless renderer detected.');

// 4. Decision Rule on GPU Hardware
const ruleOnGpu = {
  id: 'link-gpu',
  fallbackUrl: 'https://example.com/clean-safe-page',
  isActive: true,
  rules: [
    {
      id: 'rule-gpu',
      name: 'Reject Software GPU',
      priority: 0,
      isActive: true,
      destinationUrl: 'https://example.com/offer',
      actionType: 'redirect_302',
      conditions: [
        { type: 'gpu_renderer', operator: 'not_contains', value: 'swiftshader' }
      ]
    }
  ]
};

const swiftResult = DecisionEngine.evaluate(ruleOnGpu, swiftShaderSignals);
assert.strictEqual(swiftResult.isFallback, true, 'SwiftShader should fail not_contains condition');

const realGpuSignals = { ...swiftShaderSignals, gpuRenderer: 'NVIDIA GeForce RTX 4080' };
const realResult = DecisionEngine.evaluate(ruleOnGpu, realGpuSignals);
assert.strictEqual(realResult.isFallback, false, 'Real NVIDIA GPU should pass not_contains condition');
assert.strictEqual(realResult.destinationUrl, 'https://example.com/offer');
console.log('✓ Test 3.4: Rule evaluation on GPU renderer string passed.');

console.log('>>> TEST SUITE 3 ALL PASSED! <<<\n');
