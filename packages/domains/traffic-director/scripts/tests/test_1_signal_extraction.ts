import assert from 'assert';
import { SignalExtractor } from '../../src/evaluator/signal-extractor';

console.log('--- TEST SUITE 1: Signal Extraction & Client Classification ---');

// 1. iPhone Mobile User-Agent Extraction
const iphoneReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'cf-connecting-ip': '104.28.19.45',
    'cf-ipcountry': 'US',
    'cf-ipcity': 'San Francisco',
    'accept-language': 'en-US,en;q=0.9',
    'referer': 'https://google.com'
  },
  query: { utm_source: 'meta', tp: '5', gpu: 'Apple GPU (A16 Bionic)', bat: '0.72' }
};

const iphoneSignals = SignalExtractor.extractFromRequest(iphoneReq);
assert.strictEqual(iphoneSignals.deviceType, 'mobile', 'iPhone should be classified as mobile');
assert.strictEqual(iphoneSignals.os, 'iOS', 'OS should be iOS');
assert.strictEqual(iphoneSignals.browser, 'Safari', 'Browser should be Safari');
assert.strictEqual(iphoneSignals.country, 'US', 'Country should be US');
assert.strictEqual(iphoneSignals.city, 'San Francisco', 'City should be San Francisco');
assert.strictEqual(iphoneSignals.isBot, false, 'iPhone human client should not be flagged as bot');
assert.strictEqual(iphoneSignals.touchPoints, 5, 'Touchpoints should be 5');
assert.strictEqual(iphoneSignals.batteryLevel, 0.72, 'Battery level should be 0.72');
assert.strictEqual(iphoneSignals.isEmulated, false, 'iPhone with hardware GPU should not be emulated');
console.log('✓ Test 1.1: iPhone human client extraction passed.');

// 2. Windows Desktop Chrome Extraction
const windowsReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'x-real-ip': '82.165.197.1',
    'x-geo-country': 'GB',
    'x-geo-city': 'London'
  },
  query: {}
};

const windowsSignals = SignalExtractor.extractFromRequest(windowsReq);
assert.strictEqual(windowsSignals.deviceType, 'desktop', 'Windows PC should be desktop');
assert.strictEqual(windowsSignals.os, 'Windows 10/11', 'OS should be Windows 10/11');
assert.strictEqual(windowsSignals.browser, 'Chrome', 'Browser should be Chrome');
assert.strictEqual(windowsSignals.country, 'GB', 'Country should be GB');
assert.strictEqual(windowsSignals.isBot, false, 'Desktop Chrome should not be bot');
console.log('✓ Test 1.2: Windows desktop client extraction passed.');

// 3. Android Mobile Extraction
const androidReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
    'cf-connecting-ip': '49.37.10.15',
    'cf-ipcountry': 'IN',
    'cf-ipcity': 'Mumbai'
  }
};

const androidSignals = SignalExtractor.extractFromRequest(androidReq);
assert.strictEqual(androidSignals.deviceType, 'mobile', 'Pixel 8 should be mobile');
assert.strictEqual(androidSignals.os, 'Android', 'OS should be Android');
assert.strictEqual(androidSignals.browser, 'Chrome', 'Browser should be Chrome');
assert.strictEqual(androidSignals.country, 'IN', 'Country should be IN');
console.log('✓ Test 1.3: Android mobile client extraction passed.');

// 4. iPad Tablet Extraction
const ipadReq = {
  headers: {
    'user-agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'cf-ipcountry': 'CA'
  }
};

const ipadSignals = SignalExtractor.extractFromRequest(ipadReq);
assert.strictEqual(ipadSignals.deviceType, 'tablet', 'iPad should be classified as tablet');
assert.strictEqual(ipadSignals.os, 'iOS', 'iPad OS should be iOS');
console.log('✓ Test 1.4: iPad tablet client extraction passed.');

console.log('>>> TEST SUITE 1 ALL PASSED! <<<\n');
