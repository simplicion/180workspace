import { runTest as test01 } from "./01-edge-rational-time-drift.test";
import { runTest as test02 } from "./02-edge-non-idr-smart-cut.test";
import { runTest as test03 } from "./03-edge-subtitle-collision-overflow.test";
import { runTest as test04 } from "./04-edge-audio-ducking-dynamics.test";
import { runTest as test05 } from "./05-edge-spring-physics-bounds.test";
import { runTest as test06 } from "./06-edge-multitenant-isolation.test";
import { runTest as test07 } from "./07-edge-ai-director-offline-repair.test";
import { runTest as test08 } from "./08-edge-cache-collision-eviction.test";
import { runTest as test09 } from "./09-edge-otio-malformed-recovery.test";
import { runTest as test10 } from "./10-edge-plugin-sandbox-security.test";

async function main() {
  console.log("=================================================================");
  console.log("  180 AUTONOMOUS VIDEO ENGINE - 10 CRITICAL EDGE CASE TESTS       ");
  console.log("=================================================================");

  const tests = [
    { id: 1, name: "RationalTime Drift Under Fractional NTSC FPS", fn: test01 },
    { id: 2, name: "Non-IDR GOP Boundary Smart-Cut Splicing", fn: test02 },
    { id: 3, name: "Subtitle Collision, Zero Duration & Overflow", fn: test03 },
    { id: 4, name: "Audio Sidechain Ducking Extreme Dynamic Ranges", fn: test04 },
    { id: 5, name: "Analytical Spring Physics Boundary Stability", fn: test05 },
    { id: 6, name: "Multi-Tenant Data Isolation & Security", fn: test06 },
    { id: 7, name: "AI Director Offline Fallback & AST Validation", fn: test07 },
    { id: 8, name: "Content-Addressed Cache Collisions & Corrupt Recovery", fn: test08 },
    { id: 9, name: "OpenTimelineIO (OTIO) Foreign Metadata Recovery", fn: test09 },
    { id: 10, name: "Sandboxed Plugin SDK Capability Security", fn: test10 },
  ];

  let passed = 0;
  const startTime = Date.now();

  for (const t of tests) {
    try {
      await t.fn();
      passed++;
    } catch (err: any) {
      console.error(`\n❌ FAILED [Test ${t.id}]: ${t.name}`);
      console.error(`   Error: ${err.message}\n`);
      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n=================================================================");
  console.log(`🎉 ALL 10 CRITICAL EDGE CASE TESTS PASSED! (${passed}/10 in ${elapsed}s)`);
  console.log("=================================================================\n");
}

main();
