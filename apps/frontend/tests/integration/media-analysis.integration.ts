/**
 * Desktop media intelligence + post-export QA through the REAL bundled FFmpeg, on the generated fixture set.
 *
 *   cd apps/frontend && npx tsx tests/integration/media-analysis.integration.ts
 *
 * Runs exactly the command lines analysis.rs builds (`analysisArgs`, kept in sync) and the TypeScript parsers the
 * Studio uses, and checks the results against what each fixture was built with.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseSceneCutsMs,
  parseLoudness,
  exportQaFromReports,
  qaIssues,
} from "../../app/(platform)/(media-editor-app)/media-editor/services/media-analysis";
import { ensureFixtures, FFMPEG, ffprobeJson, runAnalysis, silencesMs } from "../fixtures/media/fixtures";

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

let passed = 0;
let failed = 0;
function t(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  ✘ ${name}\n    ${e?.message || e}`);
  }
}

async function main() {
  const fx = ensureFixtures();
  const work = mkdtempSync(join(tmpdir(), "media-analysis-"));
  console.log("media analysis (real FFmpeg)");

  t("fixture matrix: sizes, durations and audio layouts are what was asked for", () => {
    for (const f of Object.values(fx)) {
      const p = ffprobeJson(f.path);
      const v = p.streams!.find((s: any) => s.codec_type === "video");
      const a = p.streams!.find((s: any) => s.codec_type === "audio");
      assert.equal(v.width, f.width, f.name);
      assert.equal(v.height, f.height, f.name);
      assert.ok(near(parseFloat(p.format.duration) * 1000, f.durationMs, 120), `${f.name} duration ${p.format.duration}`);
      assert.equal(a ? a.channels : 0, f.channels, `${f.name} channels`);
    }
  });

  t("scene cuts: the two hard cuts of the multi-clip fixture, and none in a single moving shot", () => {
    const cuts = parseSceneCutsMs(runAnalysis(fx.multiclip_16x9.path, "scenes"));
    assert.equal(cuts.length, 2, JSON.stringify(cuts));
    fx.multiclip_16x9.sceneCutsMs.forEach((c, i) => assert.ok(near(cuts[i], c, 100), `${cuts[i]} vs ${c}`));
    assert.deepEqual(parseSceneCutsMs(runAnalysis(fx.square_1x1.path, "scenes")), []);
  });

  t("loudness: integrated LUFS + true peak for audio fixtures, null without audio, channel count", () => {
    const mono = parseLoudness(runAnalysis(fx.square_1x1.path, "loudness"));
    assert.ok(mono && mono.integratedLufs < -5 && mono.integratedLufs > -40, JSON.stringify(mono));
    assert.ok(mono!.truePeakDb != null && mono!.truePeakDb < 0);
    assert.equal(mono!.audioChannels, 1);
    assert.equal(mono!.clippingPct, 0);
    const stereo = parseLoudness(runAnalysis(fx.stereo_music_bed.path, "loudness"));
    assert.equal(stereo?.audioChannels, 2);
    assert.equal(parseLoudness(runAnalysis(fx.no_audio.path, "loudness")), null);
  });

  t("clipping is measured on a clipped file", () => {
    const clipped = join(work, "clipped.mp4");
    const r = spawnSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=f=200:sample_rate=48000:d=3", "-af", "volume=30", "-c:a", "pcm_s16le", clipped.replace(/\.mp4$/, ".wav")]);
    assert.equal(r.status, 0);
    const l = parseLoudness(runAnalysis(clipped.replace(/\.mp4$/, ".wav"), "loudness"));
    assert.ok(l && (l.clippingPct ?? 0) > 5, JSON.stringify(l));
    assert.ok(l!.truePeakDb! > -1);
  });

  t("silences land on the fixture's pauses (long pauses + talking head)", () => {
    for (const f of [fx.long_pauses, fx.talking_9x16]) {
      const got = silencesMs(f.path);
      for (const [s, e] of f.pausesMs.filter(([s, e]) => e - s >= 700)) {
        assert.ok(got.some(([gs, ge]) => near(gs, s, 150) && near(ge, e, 150)), `${f.name}: pause ${s}-${e} not in ${JSON.stringify(got)}`);
      }
    }
    assert.deepEqual(silencesMs(fx.no_audio.path), []);
  });

  // An "export" with a black gap in the middle and a frozen tail.
  const bad = join(work, "bad-export.mp4");
  const mk = spawnSync(FFMPEG, [
    "-y", "-loglevel", "error",
    "-filter_complex",
    "testsrc2=s=320x180:r=30:d=2,format=yuv420p[a];color=c=black:s=320x180:r=30:d=1,format=yuv420p[b];testsrc2=s=320x180:r=30:d=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=2[c];[a][b][c]concat=n=3:v=1:a=0[v];sine=f=300:d=6[au]",
    "-map", "[v]", "-map", "[au]", "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", "-t", "6", bad,
  ]);

  t("post-export QA (freezedetect): black gap and frozen tail found, as issues with time ranges", () => {
    assert.equal(mk.status, 0);
    const qa = exportQaFromReports(ffprobeJson(bad), runAnalysis(bad, "qa"), "freezedetect");
    assert.equal(qa.width, 320);
    assert.equal(qa.hasAudio, true);
    assert.equal(qa.audioChannels, 1);
    assert.ok(near(qa.durationMs, 6000, 100));
    assert.ok(qa.fps && near(qa.fps, 30, 0.01));
    assert.equal(qa.blackRangesMs.length, 1);
    assert.ok(near(qa.blackRangesMs[0][0], 2000, 100) && near(qa.blackRangesMs[0][1], 3000, 100), JSON.stringify(qa.blackRangesMs));
    assert.ok(qa.frozenRangesMs.some(([s, e]) => near(s, 4000, 150) && near(e, 6000, 150)), JSON.stringify(qa.frozenRangesMs));
    assert.ok(qa.integratedLufs != null);
    const issues = qaIssues(qa, { durationMs: 6000, width: 320, height: 180, hasAudio: true });
    assert.ok(issues.some((i) => i.id.startsWith("black") && i.severity === "critical" && i.timeRangeMs));
    assert.ok(issues.some((i) => i.id.startsWith("frozen") && i.timeRangeMs));
    // the same gap is fine when the timeline asked for it
    const ok = qaIssues(qa, { intendedBlackRangesMs: [[1900, 3100]], intendedStillRangesMs: [[3900, 6100]] });
    assert.deepEqual(ok.map((i) => i.id), []);
  });

  t("post-export QA without freezedetect (mpdecimate fallback) finds the same frozen tail", () => {
    const qa = exportQaFromReports(ffprobeJson(bad), runAnalysis(bad, "qa_nofreeze"), "mpdecimate");
    assert.equal(qa.blackRangesMs.length, 1);
    assert.ok(qa.frozenRangesMs.some(([s, e]) => near(s, 4000, 150) && near(e, 6000, 150)), JSON.stringify(qa.frozenRangesMs));
  });

  t("post-export QA of a clean moving fixture: no black, no freezes; no-audio export reported as such", () => {
    const qa = exportQaFromReports(ffprobeJson(fx.square_1x1.path), runAnalysis(fx.square_1x1.path, "qa"));
    assert.deepEqual(qa.blackRangesMs, []);
    assert.deepEqual(qa.frozenRangesMs, []);
    const na = exportQaFromReports(ffprobeJson(fx.no_audio.path), runAnalysis(fx.no_audio.path, "qa"));
    assert.equal(na.hasAudio, false);
    assert.equal(na.integratedLufs, undefined);
    assert.ok(qaIssues(na, { hasAudio: true }).some((i) => i.id === "no-audio"));
  });

  t("the 60 s fixture analyses end to end (scenes + loudness)", () => {
    const report = runAnalysis(fx.long_60s.path, "loudness");
    assert.ok(parseLoudness(report));
    assert.ok(Array.isArray(parseSceneCutsMs(runAnalysis(fx.long_60s.path, "scenes"))));
  });

  rmSync(work, { recursive: true, force: true });
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

void main();
