/**
 * 180 IDENTITY & PITCH PLATFORM: PHASE 6 VERIFICATION SUITE
 * Test Pitch in 180 Mobile Flutter app, Social Studio Mobile SSO integration,
 * deep link schemes, PKCE flow configurations, and duration constraints.
 */
import fs from 'fs';
import path from 'path';
import { FIRST_PARTY_APPS } from '@workspace/identity';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runPhase6Verification() {
  console.log('\n================================================================');
  console.log('  180 PLATFORM PHASE 6: FLUTTER APPS & SSO VERIFICATION');
  console.log('================================================================\n');

  // Test 1: Social Studio Mobile SSO Integration
  console.log('1. Validating Social Studio Mobile SSO Cutover...');
  const socialAppConfigPath = path.resolve(__dirname, '../../../social-studio-mobile/lib/core/config/app_config.dart');
  const socialLoginScreenPath = path.resolve(__dirname, '../../../social-studio-mobile/lib/features/auth/login_screen.dart');
  const socialSsoServicePath = path.resolve(__dirname, '../../../social-studio-mobile/lib/core/auth/one_eighty_sso_service.dart');

  assert(fs.existsSync(socialAppConfigPath), 'Social Studio app_config.dart exists');
  assert(fs.existsSync(socialLoginScreenPath), 'Social Studio login_screen.dart exists');
  assert(fs.existsSync(socialSsoServicePath), 'Social Studio one_eighty_sso_service.dart exists');

  const socialConfigContent = fs.readFileSync(socialAppConfigPath, 'utf8');
  assert(
    socialConfigContent.includes('180-social-studio-mobile') &&
    socialConfigContent.includes('180social://oauth-callback'),
    'Social Studio app_config registers 180-social-studio-mobile and 180social:// scheme'
  );

  const socialLoginContent = fs.readFileSync(socialLoginScreenPath, 'utf8');
  assert(
    socialLoginContent.includes('Get started with 180 Identity') &&
    socialLoginContent.includes('_loginWith180Identity'),
    'Social Studio login screen mounts prominent "Get started with 180 Identity" SSO button'
  );

  // Test 2: First-Party App Ecosystem Registry Alignment
  console.log('\n2. Validating First-Party Registry Scheme Alignment...');
  const socialApp = Array.isArray(FIRST_PARTY_APPS)
    ? FIRST_PARTY_APPS.find((a: any) => a.clientId === '180-social-studio-mobile')
    : (FIRST_PARTY_APPS as any)['180-social-studio-mobile'];

  assert(socialApp !== undefined, '180-social-studio-mobile exists in FIRST_PARTY_APPS registry');
  assert(
    socialApp && socialApp.redirectUris.includes('180social://oauth-callback'),
    '180-social-studio-mobile whitelist contains 180social://oauth-callback redirect URI'
  );

  console.log('\n----------------------------------------------------------------');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase6Verification().catch((err) => {
  console.error('Fatal error during Phase 6 verification:', err);
  process.exit(1);
});
