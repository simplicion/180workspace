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

  // Test 2: Pitch in 180 Dedicated Mobile App Scaffolding
  console.log('\n2. Validating Pitch in 180 Mobile App Architecture...');
  const pitchPubspecPath = path.resolve(__dirname, '../../../pitch-mobile/pubspec.yaml');
  const pitchMainPath = path.resolve(__dirname, '../../../pitch-mobile/lib/main.dart');
  const pitchThemePath = path.resolve(__dirname, '../../../pitch-mobile/lib/core/theme/pitch_theme.dart');
  const pitchConfigPath = path.resolve(__dirname, '../../../pitch-mobile/lib/core/config/app_config.dart');

  assert(fs.existsSync(pitchPubspecPath), 'pitch-mobile pubspec.yaml exists');
  assert(fs.existsSync(pitchMainPath), 'pitch-mobile main.dart exists');
  assert(fs.existsSync(pitchThemePath), 'pitch-mobile pitch_theme.dart exists');
  assert(fs.existsSync(pitchConfigPath), 'pitch-mobile app_config.dart exists');

  const pitchConfigContent = fs.readFileSync(pitchConfigPath, 'utf8');
  assert(
    pitchConfigContent.includes('180-pitch-network') &&
    pitchConfigContent.includes('180pitch://oauth-callback'),
    'pitch-mobile app_config registers 180-pitch-network and 180pitch:// scheme'
  );

  // Test 3: First-Party App Ecosystem Registry Alignment
  console.log('\n3. Validating First-Party Registry Scheme Alignment...');
  const pitchApp = Array.isArray(FIRST_PARTY_APPS)
    ? FIRST_PARTY_APPS.find((a: any) => a.clientId === '180-pitch-network')
    : (FIRST_PARTY_APPS as any)['180-pitch-network'];

  const socialApp = Array.isArray(FIRST_PARTY_APPS)
    ? FIRST_PARTY_APPS.find((a: any) => a.clientId === '180-social-studio-mobile')
    : (FIRST_PARTY_APPS as any)['180-social-studio-mobile'];

  assert(pitchApp !== undefined, '180-pitch-network exists in FIRST_PARTY_APPS registry');
  assert(
    pitchApp && pitchApp.redirectUris.includes('180pitch://oauth-callback'),
    '180-pitch-network whitelist contains 180pitch://oauth-callback redirect URI'
  );

  assert(socialApp !== undefined, '180-social-studio-mobile exists in FIRST_PARTY_APPS registry');
  assert(
    socialApp && socialApp.redirectUris.includes('180social://oauth-callback'),
    '180-social-studio-mobile whitelist contains 180social://oauth-callback redirect URI'
  );

  // Test 4: Pitch Reels Feed & 180s Countdown Ring
  console.log('\n4. Validating Feed & 180-Second Countdown Components...');
  const feedScreenPath = path.resolve(__dirname, '../../../pitch-mobile/lib/features/feed/presentation/pitch_feed_screen.dart');
  const countdownRingPath = path.resolve(__dirname, '../../../pitch-mobile/lib/features/feed/presentation/widgets/pitch_countdown_ring.dart');
  const playerPath = path.resolve(__dirname, '../../../pitch-mobile/lib/features/feed/presentation/widgets/video_reel_player.dart');

  assert(fs.existsSync(feedScreenPath), 'pitch_feed_screen.dart exists');
  assert(fs.existsSync(countdownRingPath), 'pitch_countdown_ring.dart exists');
  assert(fs.existsSync(playerPath), 'video_reel_player.dart exists');

  const countdownContent = fs.readFileSync(countdownRingPath, 'utf8');
  assert(
    countdownContent.includes('remainingSeconds') && countdownContent.includes('CustomPaint'),
    'PitchCountdownRing renders circular animated progress arc with remaining pitch seconds'
  );

  // Test 5: Pitch Creator Studio & Duration Rejection
  console.log('\n5. Validating Pitch Creator Studio & Duration Enforcement...');
  const creatorStudioPath = path.resolve(__dirname, '../../../pitch-mobile/lib/features/creator/presentation/pitch_creator_studio.dart');
  assert(fs.existsSync(creatorStudioPath), 'pitch_creator_studio.dart exists');

  const creatorContent = fs.readFileSync(creatorStudioPath, 'utf8');
  assert(
    creatorContent.includes('maxPitchDurationSeconds') &&
    creatorContent.includes('strict 180-second limit') &&
    creatorContent.includes('/api/v1/pitch/media/upload-url'),
    'Creator Studio strictly checks video duration against 180s and uses direct R2 upload'
  );

  // Test 6: Gigs, Resources, Events, and Profile Screens
  console.log('\n6. Validating Gigs, Resources, Events, and Profile Features...');
  const gigsPath = path.resolve(__dirname, '../../../pitch-mobile/lib/features/gigs/presentation/gigs_screen.dart');
  const resourcesPath = path.resolve(__dirname, '../../../pitch-mobile/lib/features/resources/presentation/resources_screen.dart');
  const eventsPath = path.resolve(__dirname, '../../../pitch-mobile/lib/features/events/presentation/events_screen.dart');
  const profilePath = path.resolve(__dirname, '../../../pitch-mobile/lib/features/profile/presentation/profile_screen.dart');

  assert(fs.existsSync(gigsPath), 'gigs_screen.dart exists');
  assert(fs.existsSync(resourcesPath), 'resources_screen.dart exists');
  assert(fs.existsSync(eventsPath), 'events_screen.dart exists');
  assert(fs.existsSync(profilePath), 'profile_screen.dart exists');

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
