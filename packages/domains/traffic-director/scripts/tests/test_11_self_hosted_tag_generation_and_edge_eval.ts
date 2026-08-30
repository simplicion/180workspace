import assert from 'assert';
import { ClientShieldGenerator } from '../../src/evaluator/client-shield-generator';

console.log('--- TEST SUITE 11: Method 1 Self-Hosted Pixel Tag & WordPress Hook Generator ---');

// 1. Self-Hosted Pixel JS Generation
const pixelJs = ClientShieldGenerator.generateSelfHostedPixelJs({
  slug: 'vip-campaign',
  apiBaseUrl: 'https://180workspace.com'
});

assert.ok(pixelJs.startsWith('(function()'), 'Pixel JS must be a self-contained IIFE');
assert.ok(pixelJs.includes('"vip-campaign"'), 'Pixel JS must contain the target slug');
assert.ok(pixelJs.includes('"https://180workspace.com"'), 'Pixel JS must contain the sanitized API base URL');
assert.ok(pixelJs.includes('/api/v1/traffic-director/evaluate/'), 'Pixel JS must ping edge evaluation endpoint');
assert.ok(pixelJs.includes('navigator.webdriver'), 'Pixel JS must check webdriver flag for fast-path exit');
assert.ok(pixelJs.includes('WEBGL_debug_renderer_info'), 'Pixel JS must inspect GPU software rasterizers');
assert.ok(pixelJs.length < 3500, `Pixel script must be under 3.5KB (actual: ${pixelJs.length} bytes)`);
console.log('✓ Test 11.1: Self-hosted pixel JavaScript generated accurately.');

// 2. WordPress PHP Drop-In Hook Generation
const phpCode = ClientShieldGenerator.generateWordPressPhpSnippet({
  slug: 'vip-campaign',
  apiBaseUrl: 'https://180workspace.com'
});

assert.ok(phpCode.includes('<?php'), 'Must be valid PHP syntax header');
assert.ok(phpCode.includes('add_action(\'template_redirect\''), 'Must hook into WordPress template_redirect');
assert.ok(phpCode.includes('wp_remote_post'), 'Must use native WordPress HTTP API');
assert.ok(phpCode.includes('wp_redirect'), 'Must execute native WordPress redirect on target match');
assert.ok(phpCode.includes('HTTP_CF_CONNECTING_IP'), 'Must extract Cloudflare/Reverse proxy IP headers');
console.log('✓ Test 11.2: WordPress server-side PHP hook snippet generated accurately.');

console.log('>>> TEST SUITE 11 ALL PASSED! <<<\n');
