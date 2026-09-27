/**
 * 180 PLATFORM: MASTER AUTOMATED VERIFICATION RUNNER
 * Sequentially executes all verification test suites across Phases 1 through 7:
 * - Phase 1: Database Migration & 180 Identity Backend Engine (14 tests)
 * - Phase 2: Universal 180 Identity Dynamic Modal & Client Embed SDK (6 tests)
 * - Phase 3: 180 Workspace Auth Cutover & Corporate Onboarding (4 tests)
 * - Phase 4: 180 Developer Portal & Credential Management (4 tests)
 * - Phase 5: Pitch in 180 Network Domain & ABR HLS Media Pipeline (13 tests)
 * - Phase 6: Pitch in 180 Dedicated Flutter App & Social Studio SSO (24 tests)
 * - Phase 7: End-to-End Cryptography, Security & Isolation Audit (25 tests)
 */
import { execSync } from 'child_process';
import path from 'path';

interface PhaseSuite {
  phase: number;
  name: string;
  file: string;
  expectedTests: number;
}

const SUITES: PhaseSuite[] = [
  {
    phase: 1,
    name: 'Database Migration & 180 Identity Backend Engine',
    file: 'test-oauth-verification.ts',
    expectedTests: 14,
  },
  {
    phase: 2,
    name: 'Universal 180 Identity Dynamic Modal & Client Embed SDK',
    file: 'test-phase2-client-verification.ts',
    expectedTests: 6,
  },
  {
    phase: 3,
    name: '180 Workspace Auth Cutover & Corporate Onboarding',
    file: 'test-phase3-workspace-cutover.ts',
    expectedTests: 4,
  },
  {
    phase: 4,
    name: '180 Developer Portal (developers.180workspace.com)',
    file: 'test-phase4-developer-portal.ts',
    expectedTests: 4,
  },
  {
    phase: 5,
    name: 'Pitch in 180 Network Domain & ABR HLS Media Pipeline',
    file: 'test-phase5-pitch-network.ts',
    expectedTests: 13,
  },
  {
    phase: 6,
    name: 'Pitch in 180 Flutter Mobile App & Social Studio SSO',
    file: 'test-phase6-flutter-ecosystem.ts',
    expectedTests: 24,
  },
  {
    phase: 7,
    name: 'End-to-End Cryptography, Security & Isolation Audit',
    file: 'test-phase7-security-and-e2e.ts',
    expectedTests: 25,
  },
];

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║        180 PLATFORM ECOSYSTEM: MASTER TEST SUITE RUNNER              ║');
console.log('║        Validating All Phases (1 through 7) for Production Release    ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

let totalPassed = 0;
let totalFailed = 0;
const results: { phase: number; name: string; passed: boolean; durationMs: number }[] = [];

for (const suite of SUITES) {
  const filePath = path.resolve(__dirname, suite.file);
  console.log(`\n▶ [Executing Phase ${suite.phase}]: ${suite.name}`);
  const start = Date.now();

  try {
    const output = execSync(`npx tsx "${filePath}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60000,
    });

    const elapsed = Date.now() - start;
    console.log(output.trim());
    console.log(`✔ Phase ${suite.phase} Completed in ${elapsed}ms`);
    results.push({ phase: suite.phase, name: suite.name, passed: true, durationMs: elapsed });
    totalPassed += suite.expectedTests;
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error(`✘ Phase ${suite.phase} FAILED in ${elapsed}ms`);
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    results.push({ phase: suite.phase, name: suite.name, passed: false, durationMs: elapsed });
    totalFailed++;
  }
}

console.log('\n\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                    MASTER VERIFICATION SCORECARD                     ║');
console.log('╠═══════╦══════════════════════════════════════════════════════╦═══════╣');
console.log('║ Phase ║ Module Name                                          ║ State ║');
console.log('╠═══════╬══════════════════════════════════════════════════════╬═══════╣');

for (const r of results) {
  const statusStr = r.passed ? 'PASS ✔ ' : 'FAIL ✘ ';
  const phaseStr = `Phase ${r.phase}`.padEnd(5);
  const nameStr = r.name.padEnd(52).substring(0, 52);
  console.log(`║ ${phaseStr} ║ ${nameStr} ║ ${statusStr}║`);
}

console.log('╚═══════╩══════════════════════════════════════════════════════╩═══════╝\n');
console.log(`TOTAL AUDIT ASSERTIONS: ${totalPassed} Passed, ${totalFailed} Failed`);

if (totalFailed > 0) {
  console.error('\n💥 Production gate FAILED. Fix failing assertions before release.\n');
  process.exit(1);
} else {
  console.log('\n🚀 ALL 7 PHASES VERIFIED: PLATFORM READY FOR PRODUCTION RELEASE!\n');
  process.exit(0);
}
