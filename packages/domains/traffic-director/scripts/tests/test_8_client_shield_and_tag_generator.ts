import assert from 'assert';
import { ClientShieldGenerator } from '../../src/evaluator/client-shield-generator';

console.log('--- TEST SUITE 8: Client Shield HTML & Pre-Click Ad Tag Generator ---');

// 1. Client-Side Shield HTML Probe Generation
const html = ClientShieldGenerator.generateShieldHtml({
  slug: 'summer-sale',
  linkName: 'Summer Sale 2026',
  targetUrl: 'https://example.com/target-money-page',
  fallbackUrl: 'https://example.com/clean-safe-page',
  timeoutMs: 600
});

assert.ok(html.includes('<!DOCTYPE html>'), 'Must generate valid HTML document');
assert.ok(html.includes('target-money-page'), 'Must include serialized target URL');
assert.ok(html.includes('clean-safe-page'), 'Must include serialized fallback URL');
assert.ok(html.includes('WEBGL_debug_renderer_info'), 'Must probe WebGL unmasked GPU renderer');
assert.ok(html.includes('maxTouchPoints'), 'Must probe touchscreen points');
assert.ok(html.includes('navigator.webdriver'), 'Must inspect webdriver automation flag');
assert.ok(html.includes('getBattery'), 'Must probe battery API telemetry');
assert.ok(html.length < 5000, `Shield probe HTML must remain ultra-lightweight (actual: ${html.length} bytes)`);
console.log('✓ Test 8.1: Client shield HTML probe script generated accurately.');

// 2. Pre-Click Embeddable Dynamic Ad Tag JS Generation
const jsTag = ClientShieldGenerator.generateEmbedTagJs({
  slug: 'banner-promo',
  targetUrl: 'https://example.com/target-offer',
  fallbackUrl: 'https://example.com/safe-banner-dest',
  creativeUrl: 'https://images.example.com/target-banner.jpg',
  fallbackCreativeUrl: 'https://images.example.com/safe-banner.jpg',
  width: 300,
  height: 250
});

assert.ok(jsTag.startsWith('(function()'), 'Must be a self-executing anonymous function');
assert.ok(jsTag.includes('target-offer'), 'Must include dynamic target URL');
assert.ok(jsTag.includes('safe-banner-dest'), 'Must include fallback destination');
assert.ok(jsTag.includes('300'), 'Must apply width dimensioning');
assert.ok(jsTag.includes('250'), 'Must apply height dimensioning');
assert.ok(jsTag.includes('createElement(\'img\')'), 'Must create dynamic creative element');
console.log('✓ Test 8.2: Pre-click dynamic JavaScript ad tag generated accurately.');

console.log('>>> TEST SUITE 8 ALL PASSED! <<<\n');
