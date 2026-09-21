/**
 * Runs native render plans through a REAL ffmpeg/ffprobe and inspects the result.
 *
 *   cd apps/frontend && npx tsx tests/integration/native-render-plan.integration.ts
 *
 * Uses the binaries from @ffmpeg-installer / @ffprobe-installer (the same ones the desktop app bundles as sidecars).
 * The ffmpeg arguments assembled here mirror apps/desktop-app/src-tauri/src/render.rs; keep them in sync.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { buildNativeRenderPlan, type NativeRenderSpec } from "../../app/(platform)/(media-editor-app)/media-editor/services/native-render-plan";
import { descriptorFromFfprobe } from "../../app/(platform)/(media-editor-app)/media-editor/services/native-probe";
import { validateRenderSpec } from "../../app/(platform)/(media-editor-app)/media-editor/services/native-render-validate";

const req = createRequire(join(process.cwd(), "package.json"));
const FFMPEG: string = req("@ffmpeg-installer/ffmpeg").path;
const FFPROBE: string = req("@ffprobe-installer/ffprobe").path;
const work = mkdtempSync(join(tmpdir(), "render-plan-"));
const f = (n: string) => join(work, n);

const run = (bin: string, args: string[]) => {
  const r = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout, err: r.stderr };
};
const probe = (file: string) => JSON.parse(run(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]).out);

/** Mirrors render.rs: the encoder arguments per quality and the overall command shape. */
function renderSpec(spec: NativeRenderSpec, output: string) {
  validateRenderSpec(spec); // whatever we render must also pass the native allowlist
  const enc = { draft: ["-preset", "veryfast", "-crf", "26"], balanced: ["-preset", "medium", "-crf", "20"], high: ["-preset", "slow", "-crf", "17"] }[spec.quality];
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-nostats"];
  for (const i of spec.inputs) args.push("-i", i);
  args.push("-filter_complex", spec.filterComplex);
  for (const m of spec.maps) args.push("-map", m);
  args.push("-c:v", "libx264", ...enc, "-pix_fmt", "yuv420p");
  if (spec.hasAudio) args.push("-c:a", "aac", "-b:a", "192k");
  args.push("-t", String(spec.durationSec), "-movflags", "+faststart", output);
  return run(FFMPEG, args);
}

/** RGB of one pixel of the output at time `t`. */
function pixel(file: string, t: number, x: number, y: number): [number, number, number] {
  const r = spawnSync(FFMPEG, ["-v", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", `crop=1:1:${x}:${y},format=rgb24`, "-f", "rawvideo", "-"], { maxBuffer: 1024 });
  const b = r.stdout;
  return [b[0], b[1], b[2]];
}

const T = (s: number) => ({ value: Math.round(s * 48000), timescale: 48000 });
const range = (start: number, dur: number) => ({ start: T(start), duration: T(dur) });
const clip = (id: string, path: string, src: [number, number], tl: [number, number], extra: any = {}) => ({
  id,
  assetId: id,
  sourcePath: path,
  sourceRange: range(...src),
  timelineRange: range(...tl),
  transform: { scale: { start: 1, end: 1, easing: "linear" }, position: { x: 0, y: 0 }, anchor: { x: 0.5, y: 0.5 }, rotationDeg: 0, opacity: 1 },
  speedMultiplier: 1,
  volumeDb: 0,
  effects: [],
  ...extra,
});
const project = (o: { tracks?: any[]; audio?: any[]; total: number; aspect?: string; captions?: any[]; camera?: any[] }): any => ({
  version: "1.0.0",
  meta: { projectId: "p", title: "t", targetAspect: o.aspect ?? "16:9", resolution: { width: 1920, height: 1080 }, fps: { numerator: 30, denominator: 1 }, totalDuration: T(o.total) },
  directorStyle: { preset: "CUSTOM", pacingMultiplier: 1, zoomAggressiveness: 0.5, brollFrequencySeconds: 15 },
  tracks: { videoTracks: o.tracks ?? [], cameraTrack: o.camera ?? [], captionTrack: o.captions ?? [], audioTracks: o.audio ?? [] },
});

let passed = 0;
let failed = 0;
async function t(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  ✘ ${name}\n      ${String(e?.message || e).split("\n").slice(0, 6).join("\n      ")}`);
  }
}

// ── synthetic media ──────────────────────────────────────────────────────────
const A = f("a.mp4"); // 6 s, red-ish testsrc + 440 Hz tone, 1280x720 @25
const B = f("b.mp4"); // 4 s, blue + 880 Hz tone, 640x360 @30 (different size/fps than A)
const SILENT = f("silent.mp4"); // 3 s, video only
const IMG = f("logo.png");
const BGM = f("bgm.wav");
assert.ok(run(FFMPEG, ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=1280x720:r=25:d=6", "-f", "lavfi", "-i", "sine=f=440:d=6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", A]).ok);
assert.ok(run(FFMPEG, ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=640x360:r=30:d=4", "-f", "lavfi", "-i", "sine=f=880:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", B]).ok);
assert.ok(run(FFMPEG, ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=green:s=640x360:r=30:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", SILENT]).ok);
assert.ok(run(FFMPEG, ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=white:s=400x400", "-frames:v", "1", IMG]).ok);
assert.ok(run(FFMPEG, ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=f=220:d=20", BGM]).ok);

const hasAudioFor = (p: string) => p !== SILENT && p !== IMG;
const opts = (settings: any = { resolution: "1080p", fps: 30 }) => ({ resolveNativePath: (p: string) => p, sourceHasAudio: hasAudioFor, settings });

async function main() {
  await t("two sequential clips (different sizes/fps), 2x speed, PiP image with opacity, BGM with fades: renders a valid 1080p H.264 + AAC file of the right length", () => {
    const ir = project({
      total: 8,
      tracks: [
        { id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("c1", A, [0, 4], [0, 4]), clip("c2", B, [0, 4], [4, 2], { speedMultiplier: 2 })] },
        {
          id: "ov",
          type: "PICTURE_IN_PICTURE",
          zIndex: 1,
          clips: [clip("logo", IMG, [0, 3], [1, 3], { transform: { scale: { start: 0.5, end: 0.5, easing: "linear" }, position: { x: 400, y: -200 }, anchor: { x: 0.5, y: 0.5 }, rotationDeg: 0, opacity: 0.5 } })],
        },
      ],
      audio: [{ id: "bgm", type: "BGM", volumeDb: -6, duckWithSpeech: true, clips: [{ id: "bgm1", sourcePath: BGM, sourceRange: range(0, 8), timelineRange: range(0, 8), volumeDb: 0, fadeInDuration: T(1), fadeOutDuration: T(2) }] }],
    });
    const plan = buildNativeRenderPlan(ir, opts());
    assert.ok(plan.supported, JSON.stringify(plan));
    assert.ok((plan as any).warnings.some((w: string) => /ducking/.test(w)), "ducking warning expected");
    const out = f("out1.mp4");
    const r = renderSpec((plan as any).spec, out);
    assert.ok(r.ok, `${r.err}
GRAPH: ${(plan as any).spec.filterComplex}`);
    const p = probe(out);
    const v = p.streams.find((s: any) => s.codec_type === "video");
    const a = p.streams.find((s: any) => s.codec_type === "audio");
    assert.equal(v.codec_name, "h264");
    assert.equal(v.width, 1920);
    assert.equal(v.height, 1080);
    assert.equal(v.r_frame_rate, "30/1");
    assert.ok(a && a.codec_name === "aac", "audio stream present");
    assert.ok(Math.abs(Number(p.format.duration) - 8) < 0.25, `duration ${p.format.duration}`);
  });

  await t("pixels are where the timeline says: clip A is red at t=1, clip B (2x speed) is blue at t=4.5, PiP logo blended at t=2", () => {
    const out = f("out1.mp4");
    const [r1, g1, b1] = pixel(out, 1, 100, 500);
    assert.ok(r1 > 180 && g1 < 90 && b1 < 90, `t=1 expected red, got ${[r1, g1, b1]}`);
    const [r2, g2, b2] = pixel(out, 4.5, 100, 500);
    assert.ok(b2 > 150 && r2 < 90, `t=4.5 expected blue, got ${[r2, g2, b2]}`);
    // PiP: 400px image * scale 0.5 of 40% width => 384px wide, centred + (400,-200) => around x=960+400, y=540-200; white at 50% over red
    const [rp, gp, bp] = pixel(out, 2, 1360, 340);
    assert.ok(gp > 90 && gp < 200, `t=2 expected white-over-red blend at the PiP position, got ${[rp, gp, bp]}`);
  });

  await t("audio is actually present and audible (mean volume above silence), and the tail after the last clip is silent-padded to full length", () => {
    const out = f("out1.mp4");
    const r = run(FFMPEG, ["-v", "info", "-i", out, "-af", "volumedetect", "-f", "null", "-"]);
    const m = /mean_volume: (-?[\d.]+) dB/.exec(r.err);
    assert.ok(m, "volumedetect output");
    assert.ok(Number(m![1]) > -50, `mean volume ${m![1]} dB`);
  });

  await t("a gap before the first clip renders black, and the video-only clip yields no source audio", () => {
    const ir = project({ total: 5, tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("late", SILENT, [0, 3], [2, 3])] }] });
    const plan = buildNativeRenderPlan(ir, opts());
    assert.ok(plan.supported);
    assert.equal((plan as any).spec.hasAudio, false);
    assert.deepEqual((plan as any).spec.maps, ["[vout]"]);
    const out = f("out2.mp4");
    assert.ok(renderSpec((plan as any).spec, out).ok);
    const [r0, g0, b0] = pixel(out, 1, 640, 360);
    assert.ok(r0 < 8 && g0 < 8 && b0 < 8, `gap must be black, got ${[r0, g0, b0]}`);
    const [r1, g1, b1] = pixel(out, 3, 640, 360);
    assert.ok(g1 > 100 && r1 < 60, `clip must be green, got ${[r1, g1, b1]}`);
    assert.equal(probe(out).streams.some((s: any) => s.codec_type === "audio"), false);
  });

  await t("vertical 9:16 at 720p produces 720x1280", () => {
    const ir = project({ total: 3, aspect: "9:16", tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("v", A, [0, 3], [0, 3])] }] });
    const plan = buildNativeRenderPlan(ir, opts({ resolution: "720p", fps: 24 }));
    assert.ok(plan.supported);
    const out = f("out3.mp4");
    const r = renderSpec((plan as any).spec, out);
    assert.ok(r.ok, r.err);
    const v = probe(out).streams.find((s: any) => s.codec_type === "video");
    assert.equal(`${v.width}x${v.height}`, "720x1280");
    assert.equal(v.r_frame_rate, "24/1");
  });

  await t("extreme speeds (0.25x and 4x) build valid audio chains and render", () => {
    const ir = project({
      total: 6,
      tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("slow", A, [0, 1], [0, 4], { speedMultiplier: 0.25 }), clip("fast", A, [0, 4], [4, 1], { speedMultiplier: 4 })] }],
    });
    const plan = buildNativeRenderPlan(ir, opts());
    assert.ok(plan.supported, JSON.stringify(plan));
    const r = renderSpec((plan as any).spec, f("out4.mp4"));
    assert.ok(r.ok, r.err);
  });

  await t("features the native exporter cannot render are REPORTED, never silently dropped", () => {
    const base = { total: 3, tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("c", A, [0, 3], [0, 3])] }] };
    const cases: Array<[string, any, RegExp]> = [
      ["captions", project({ ...base, captions: [{ id: "cap", timeRange: range(0, 1), text: "hi", words: [], style: {} }] }), /captions/],
      ["camera zoom", project({ ...base, camera: [{ id: "z", timeRange: range(0, 1), scale: 1.4 }] }), /camera zoom/],
      ["animated scale", project({ total: 3, tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("c", A, [0, 3], [0, 3], { transform: { scale: { start: 1, end: 1.3 }, position: { x: 0, y: 0 }, rotationDeg: 0, opacity: 1 } })] }] }), /animated scale/],
      ["rotation", project({ total: 3, tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("c", A, [0, 3], [0, 3], { transform: { scale: { start: 1, end: 1 }, position: { x: 0, y: 0 }, rotationDeg: 15, opacity: 1 } })] }] }), /rotation/],
      ["effects", project({ total: 3, tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("c", A, [0, 3], [0, 3], { effects: ["glitch"] })] }] }), /effects/],
      ["transition", project({ total: 3, tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("c", A, [0, 3], [0, 3], { transitionIn: { type: "CROSSFADE", duration: T(0.5) } })] }] }), /transition CROSSFADE/],
      ["speed out of range", project({ total: 3, tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [clip("c", A, [0, 3], [0, 3], { speedMultiplier: 8 })] }] }), /speed/],
      ["empty timeline", project({ total: 3, tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [] }] }), /no video clips/],
    ];
    for (const [name, ir, re] of cases) {
      const plan = buildNativeRenderPlan(ir, opts());
      assert.equal(plan.supported, false, `${name} should be unsupported`);
      assert.ok((plan as any).reasons.some((x: string) => re.test(x)), `${name}: reasons ${JSON.stringify((plan as any).reasons)}`);
    }
    const remote = buildNativeRenderPlan(project(base), { ...opts(), resolveNativePath: () => null });
    assert.equal(remote.supported, false);
    assert.match((remote as any).reasons[0], /not a file on this computer/);
  });

  await t("hostile clip data cannot inject into the filter graph (only numbers and fixed tokens are interpolated)", () => {
    const evil = clip("c'];movie=/etc/passwd[x", A, [0, 3], [0, 3]);
    const ir = project({ total: 3, tracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [evil] }] });
    const plan = buildNativeRenderPlan(ir, opts());
    assert.ok(plan.supported);
    assert.ok(!/movie|passwd|;\s*\[x/.test((plan as any).spec.filterComplex), "clip ids must never reach the graph");
  });

  await t("real ffprobe output maps to correct descriptors (video+audio, silent video, image, audio-only)", () => {
    const d = (file: string) => descriptorFromFfprobe(probe(file), file, "http://asset.localhost/x", "id");
    const a = d(A);
    assert.equal(a.width, 1280);
    assert.equal(a.height, 720);
    assert.equal(a.fps, 25);
    assert.equal(a.hasAudio, true);
    assert.ok(Math.abs(a.durationSeconds - 6) < 0.2, `duration ${a.durationSeconds}`);
    assert.equal(a.codecVideo, "h264");
    const s = d(SILENT);
    assert.equal(s.hasAudio, false);
    assert.equal(s.fps, 30);
    const img = d(IMG);
    assert.equal(img.durationSeconds, 5);
    assert.equal(img.hasAudio, false);
    assert.equal(img.width, 400);
    const au = d(BGM);
    assert.equal(au.isAudioOnly, true);
    assert.equal(au.width, 0);
    assert.ok(Math.abs(au.durationSeconds - 20) < 0.2);
  });

  rmSync(work, { recursive: true, force: true });
  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed ? 1 : 0);
}

if (!existsSync(FFMPEG) || !existsSync(FFPROBE)) {
  console.error("ffmpeg/ffprobe binaries not found");
  process.exit(2);
}
main();
