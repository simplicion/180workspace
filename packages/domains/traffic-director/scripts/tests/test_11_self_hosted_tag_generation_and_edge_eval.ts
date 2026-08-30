
import assert from 'assert';
import { ClientShieldGenerator } from '../../src/evaluator/client-shield-generator';

console.log('--- TEST SUITE 11: Method 1 Self-Hosted Pixel Tag & WordPress Hook Generator ---');

// 1. Self-Hosted Pixel JS Generation
const pixelJs = ClientShieldGenerator.generateSelfHostedPixelJs({
  slug: 'vip-campaign',
  apiBaseUrl: 'https://180workspace.com'
});

assert.ok(pixelJs.length > 500, 'Pixel JS must be generated and obfuscated');
assert.ok(!pixelJs.includes('navigator.webdriver'), 'Pixel JS must be heavily obfuscated and not contain plain-text strings');
console.log('✓ Test 11.1: Self-hosted pixel JavaScript generated and aggressively obfuscated accurately.');

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
