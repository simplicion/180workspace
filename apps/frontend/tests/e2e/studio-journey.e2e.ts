/**
 * End-to-end creator journey with REAL media and the REAL desktop render path; only the LLMs are stubbed.
 *
 *   cd apps/frontend && npx tsx tests/e2e/studio-journey.e2e.ts
 *
 * brand (brand-consciousness pure builders) → 7-day calendar (autopilot pipeline, STUBBED deterministic LLM)
 * → a reel piece's script → fixture footage analysed by the bundled FFmpeg (silences, scenes, loudness)
 * → AI Director (real VideoAIDirectorService.directMobile: planner, validator, PlanExpander, EditIRCompiler;
 *   STUBBED tool-calling LLM) with a locked range → native render plan → REAL FFmpeg render → media checks
 * → critic (VideoCriticService heuristics + measured post-export QA) → one repair turn → final render + checks
 * → calendar row + attach upload payload + publish input (buildPublishInput; no platform is called).
 *
 * Stubbed, and why: the LLM calls (no network/keys in CI), speech-to-text (the fixtures are tones, not speech: the
 * transcript is the piece's script placed on the fixture's voiced segments), and the caption text rasteriser (it
 * needs a browser canvas; solid boxes are drawn per caption state instead, with the real state timeline).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseBrandPatch, readBrandConsciousness, toBrandPromptContext } from "../../../../packages/domains/social-media/src/brand-consciousness";
import { buildPublishInput } from "../../../../packages/domains/social-media/src/publishing/publish-dispatcher";
import { runAutopilotPipeline, buildBrandContext, pieceToRow } from "../../../../packages/domains/ai/src/content/autopilot";
import type { AutopilotLLM, LlmRequest } from "../../../../packages/domains/ai/src/content/autopilot";
import { VideoAIDirectorService } from "../../../../packages/domains/ai/src/builders/video-ai-director.service";
import { VideoCriticService, type EditIR } from "@workspace/video-contracts";

import { buildNativeRenderPlan, type NativeRenderSpec } from "../../app/(platform)/(media-editor-app)/media-editor/services/native-render-plan";
import { validateRenderSpec } from "../../app/(platform)/(media-editor-app)/media-editor/services/native-render-validate";
import { captionStateTimeline } from "../../app/(platform)/(media-editor-app)/media-editor/services/caption-raster";
import { parseSceneCutsMs, parseLoudness, exportQaFromReports, qaIssues, qaExpectationsFor, type LastExportQa } from "../../app/(platform)/(media-editor-app)/media-editor/services/media-analysis";
import { lockedRangeProblems } from "../../app/(platform)/(media-editor-app)/media-editor/services/director-locks";
import { ensureFixtures, FFMPEG, ffprobeJson, runAnalysis, silencesMs, type Fixture } from "../fixtures/media/fixtures";

// ── harness ───────────────────────────────────────────────────────────────────
const steps: Array<{ name: string; kind: "real" | "stubbed" | "mixed"; ok: boolean; ms: number; note?: string }> = [];
async function step<T>(name: string, kind: "real" | "stubbed" | "mixed", fn: () => T | Promise<T>, note?: string): Promise<T> {
  const t0 = Date.now();
  try {
    const r = await fn();
    steps.push({ name, kind, ok: true, ms: Date.now() - t0, note });
    console.log(`  ✔ [${kind}] ${name} (${Date.now() - t0} ms)`);
    return r;
  } catch (e) {
    steps.push({ name, kind, ok: false, ms: Date.now() - t0, note });
    console.log(`  ✘ [${kind}] ${name}\n    ${(e as any)?.stack || e}`);
    throw e;
  }
}
const work = mkdtempSync(join(tmpdir(), "studio-e2e-"));
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const sec = (t: { value: number; timescale: number }) => t.value / t.timescale;

// ── stubbed autopilot LLM: valid JSON per agent role, derived from the prompt (deterministic, no network) ──────
function jsonAfter(prompt: string, label: string): any[] {
  const lines = prompt.split("\n");
  const i = lines.findIndex((l) => l.trim() === label);
  return JSON.parse(lines[i + 1]);
}
const stubCalendarLLM: AutopilotLLM = {
  provider: "stub",
  async complete(req: LlmRequest) {
    let body: any;
    if (req.role === "strategist") {
      body = {
        audiencePsychology: { coreDesires: ["get fit without living in the gym"], corePains: ["no time", "quit after a month"], objections: [], triggers: [] },
        positioningAngle: "20-minute consistency beats 2-hour intensity",
        pillars: [{ name: "Myths", percent: 50, purpose: "correct beliefs" }, { name: "Routines", percent: 50, purpose: "give a plan" }],
        cadence: [{ platform: "instagram", postsPerWeek: 4, bestFormats: ["reel", "carousel"] }, { platform: "tiktok", postsPerWeek: 2, bestFormats: ["reel"] }],
        contentMix: { reel: 50, carousel: 25, static: 25, text: 0 },
        slots: [
          { day: 1, platforms: ["instagram", "tiktok"], format: "reel", pillar: "Myths", topic: "Why people quit the gym", angle: "they go too hard", hookType: "contrarian" },
          { day: 3, platforms: ["instagram"], format: "carousel", pillar: "Routines", topic: "20-minute routine", angle: "5 moves", hookType: "curiosity_gap" },
          { day: 5, platforms: ["instagram", "tiktok"], format: "reel", pillar: "Routines", topic: "Consistency", angle: "streaks", hookType: "story" },
          { day: 7, platforms: ["instagram"], format: "static", pillar: "Myths", topic: "Two hours is a myth", angle: "science", hookType: "relatable_pain" },
          { day: 6, platforms: ["tiktok"], format: "reel", pillar: "Myths", topic: "Soreness myth", angle: "not a metric", hookType: "pattern_interrupt" },
        ],
      };
    } else if (req.role === "hook_script") {
      body = {
        items: jsonAfter(req.prompt, "Slots:").map((s: any) => ({
          slotId: s.slotId,
          headline: `${s.topic}`,
          hookType: s.hookType,
          spokenHook: "Most people quit the gym in month one",
          onScreenHook: "Stop quitting the gym",
          ...(s.format === "reel"
            ? {
                script: {
                  hook: "Most people quit the gym in month one",
                  body: [{ beat: "They go way too hard" }, { beat: "You need twenty minutes and consistency" }],
                  retentionLoop: "And the punchline is coming",
                  cta: "Follow for more",
                  estimatedDurationSec: 12,
                },
                shotNotes: ["talking head, medium close-up", "cut on every beat"],
              }
            : {}),
          ...(s.format === "carousel"
            ? { carouselBrief: { title: "20-minute routine", slides: [1, 2, 3, 4, 5].map((i) => ({ index: i, role: i === 1 ? "hook" : i === 5 ? "cta" : "value", headline: `Slide ${i}`, body: "", visualIdea: "" })) } }
            : {}),
          ...(s.format === "static" ? { visualBrief: "A stopwatch at 20:00" } : {}),
        })),
      };
    } else if (req.role === "copy") {
      body = {
        items: jsonAfter(req.prompt, "Pieces:").map((p: any) => ({
          slotId: p.slotId,
          copies: p.platforms.map((platform: string) => ({ platform, caption: `${p.headline}: consistency beats intensity.`, cta: "Follow for more", hashtags: ["#fitness", "#gymtips"], postingTime: "18:30" })),
        })),
      };
    } else if (req.role === "critic") {
      body = { items: jsonAfter(req.prompt, "Pieces:").map((p: any) => ({ slotId: p.slotId, verdict: "ok", issues: [], fixes: [] })) };
    } else throw new Error(`stub LLM: unexpected role ${req.role}`);
    return { text: JSON.stringify(body), usage: { inputTokens: 0, outputTokens: 0, estimated: true }, model: "stub" };
  },
};

// ── stubbed tool-calling LLM for the director (scripted responses, like packages/domains/ai/tests) ────────────
function scriptedDirectorLLM(responses: any[]) {
  const calls: string[] = [];
  const client = {
    provider: "claude",
    generate: async () => {
      throw new Error("generate() must not be used by the director");
    },
    generateStream: async () => {
      throw new Error("generateStream() must not be used by the director");
    },
    generateWithTools: async (prompt: string) => {
      calls.push(prompt);
      const next = responses.shift();
      if (!next) throw new Error("stub director LLM: no more scripted responses");
      return next;
    },
  };
  return { client, calls };
}
const tc = (name: string, args: Record<string, any>) => ({ id: `t_${name}_${Math.random().toString(36).slice(2, 7)}`, name, args });

// ── render (mirrors render.rs build_args, like tests/integration/native-render-plan.integration.ts) ────────────
function render(spec: NativeRenderSpec, output: string) {
  validateRenderSpec(spec);
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-nostats"];
  for (const i of spec.inputs) args.push("-i", i);
  if (spec.overlaySequence) args.push("-f", "concat", "-safe", "1", "-i", spec.overlaySequence);
  args.push("-filter_complex", spec.filterComplex);
  for (const m of spec.maps) args.push("-map", m);
  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p");
  if (spec.hasAudio) args.push("-c:a", "aac", "-b:a", "192k");
  args.push("-t", String(spec.durationSec), "-movflags", "+faststart", output);
  const r = spawnSync(FFMPEG, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`render failed: ${r.stderr}\nGRAPH: ${spec.filterComplex}`);
}

/** Caption overlays: one PNG per distinct caption state (solid box stands in for the canvas text rasteriser). */
function writeCaptionOverlays(editIR: EditIR, W: number, H: number, durationSec: number, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const { states, sequence } = captionStateTimeline(editIR.tracks.captionTrack ?? [], durationSec);
  states.forEach((s, i) => {
    const lavfi = s.caption || s.titles.length
      ? `color=c=white:s=${Math.round(W * 0.6)}x${Math.round(H * 0.06)},format=rgba,pad=${W}:${H}:${Math.round(W * 0.2)}:${Math.round(H * 0.86)}:color=0x00000000`
      : `color=c=0x00000000:s=${W}x${H},format=rgba`;
    const r = spawnSync(FFMPEG, ["-y", "-v", "error", "-f", "lavfi", "-i", lavfi, "-frames:v", "1", join(dir, `f${String(i).padStart(5, "0")}.png`)]);
    assert.equal(r.status, 0);
  });
  // overlays.rs build_ffconcat: entries + the last one repeated
  const name = (i: number) => `f${String(i).padStart(5, "0")}.png`;
  writeFileSync(join(dir, "list.ffconcat"), "ffconcat version 1.0\n" + sequence.map((q) => `file ${name(q.state)}\nduration ${q.durationSec.toFixed(6)}\n`).join("") + `file ${name(sequence[sequence.length - 1].state)}\n`);
  return join(dir, "list.ffconcat").split("\\").join("/");
}

/** Mean-abs-difference of the top half of two frames (32x32 grey), 0..255. */
function frameDiff(a: string, ta: number, b: string, tb: number): number {
  const grab = (file: string, t: number) =>
    spawnSync(FFMPEG, ["-v", "error", "-ss", t.toFixed(4), "-i", file, "-frames:v", "1", "-vf", "crop=iw:ih/2:0:0,scale=32:32,format=gray", "-f", "rawvideo", "-"], { maxBuffer: 1 << 20 }).stdout as Buffer;
  const x = grab(a, ta);
  const y = grab(b, tb);
  assert.equal(x.length, 1024);
  assert.equal(y.length, 1024);
  let d = 0;
  for (let i = 0; i < 1024; i++) d += Math.abs(x[i] - y[i]);
  return d / 1024;
}

function pixel(file: string, t: number, x: number, y: number): [number, number, number] {
  const b = spawnSync(FFMPEG, ["-v", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", `crop=1:1:${x}:${y},format=rgb24`, "-f", "rawvideo", "-"], { maxBuffer: 1024 }).stdout as Buffer;
  return [b[0], b[1], b[2]];
}

/** Timeline time (s) where source time `s` of the main track plays, or null if it was cut. */
function timelineTimeOf(ir: EditIR, s: number): number | null {
  const main = ir.tracks.videoTracks.find((t) => t.type === "MAIN_VIDEO") ?? ir.tracks.videoTracks[0];
  for (const c of main.clips) {
    const src0 = sec(c.sourceRange.start);
    const speed = c.speedMultiplier || 1;
    const len = sec(c.timelineRange.duration) * speed;
    if (s >= src0 && s < src0 + len) return sec(c.timelineRange.start) + (s - src0) / speed;
  }
  return null;
}

function renderAndMeasure(ir: EditIR, fixture: Fixture, label: string) {
  const opts = (overlay: string | null) =>
    buildNativeRenderPlan(ir, {
      resolveNativePath: (p) => (/^https?:/i.test(p) ? null : fixture.path),
      sourceHasAudio: () => fixture.channels > 0,
      settings: { resolution: "720p", fps: 30, quality: "draft" },
      captionOverlay: overlay,
    });
  const dry = opts((ir.tracks.captionTrack ?? []).length ? "pending/list.ffconcat" : null);
  assert.ok(dry.supported, `render plan unsupported: ${JSON.stringify((dry as any).reasons)}`);
  const { width, height, durationSec } = (dry as any).spec as NativeRenderSpec;
  const overlay = (ir.tracks.captionTrack ?? []).length ? writeCaptionOverlays(ir, width, height, durationSec, join(work, `ovl-${label}`)) : null;
  const plan = opts(overlay);
  assert.ok(plan.supported);
  const spec = (plan as any).spec as NativeRenderSpec;
  const out = join(work, `${label}.mp4`);
  render(spec, out);
  const qa = exportQaFromReports(ffprobeJson(out), runAnalysis(out, "qa"));
  const issues = qaIssues(qa, qaExpectationsFor(ir, { width, height, durationSec, hasAudio: spec.hasAudio }));
  return { out, spec, qa, issues };
}

// ── the journey ───────────────────────────────────────────────────────────────
async function main() {
  console.log("Studio journey E2E (real FFmpeg; stubbed LLMs)");
  const companyId = "company_e2e";

  const brand = await step("brand consciousness from onboarding input (validated patch → profile → prompt block)", "real", () => {
    const patch = parseBrandPatch({
      brandName: "Twenty Minute Fitness",
      brandType: "creator",
      positioning: "Short, consistent workouts for busy people",
      description: "A coach who shows 20-minute routines that actually stick.",
      colors: { primary: "#FF5A1F" },
      targetPlatforms: ["instagram", "tiktok"],
      font: "Inter",
    });
    const profile = readBrandConsciousness(
      { id: "proj_e2e", name: "Twenty Minute Fitness" },
      { tone: "direct, warm, no hype", targetAudience: "busy professionals 25-45", forbiddenWords: ["guaranteed"], standardCtas: ["Follow for more"], defaultHashtags: ["#fitness"], metadata: { brand: patch, contentPillars: ["Myths", "Routines"] } }
    );
    assert.equal(profile.completeness.isComplete, true, JSON.stringify(profile.completeness));
    const ctx = buildBrandContext(profile, { promptContext: toBrandPromptContext(profile) });
    assert.match(ctx.promptContext, /Twenty Minute Fitness/);
    return { profile, ctx };
  });

  const calendar = await step("7-day calendar: strategist → hooks/scripts → copy → critic (autopilot pipeline)", "stubbed", () =>
    runAutopilotPipeline({ days: 7, startDate: "2026-10-01", timezone: "Europe/London", platforms: ["instagram", "tiktok"], goals: ["grow followers"], brand: brand.ctx }, { llm: stubCalendarLLM }), "pipeline + schema checks + brand enforcement are real; agent replies are scripted");
  const piece = calendar.pieces.find((p) => p.format === "reel" && p.script)!;
  await step("calendar piece persisted as a CalendarPiece row with its script", "real", () => {
    assert.ok(calendar.pieces.length >= 4);
    const row = pieceToRow(piece, "cal_e2e", companyId);
    assert.equal((row as any).companyId, companyId);
    assert.match(JSON.stringify(row), /twenty minutes and consistency/);
  });

  const fx = await step("fixture set generated with the bundled FFmpeg (9 clips: 9:16, 16:9 multi-clip, 1:1, no-audio, mono, stereo+music, long pauses, <2 s, 60 s)", "real", () => ensureFixtures());
  const clip = fx.talking_9x16;

  const analysis = await step("analysis of the footage: silences, scene cuts, loudness (bundled FFmpeg, analysis.rs command lines)", "real", () => {
    const silences = silencesMs(clip.path);
    const scenes = parseSceneCutsMs(runAnalysis(clip.path, "scenes"));
    const loud = parseLoudness(runAnalysis(clip.path, "loudness"))!;
    assert.ok(silences.length >= 3, JSON.stringify(silences));
    assert.ok(loud.integratedLufs < -24, `fixture voice is deliberately quiet, got ${loud.integratedLufs}`);
    assert.deepEqual(parseSceneCutsMs(runAnalysis(fx.multiclip_16x9.path, "scenes")).length, 2);
    return { silences, scenes, loud };
  });

  // Transcript: the piece's script words laid onto the fixture's voiced segments (stand-in for STT).
  const words = await step("transcript for the footage (script words on the voiced segments)", "stubbed", () => {
    const text = [piece.script!.hook, ...piece.script!.body.map((b) => b.beat), piece.script!.cta].join(" ").split(/\s+/).filter(Boolean);
    const voiced: Array<[number, number]> = [];
    let cursor = 0;
    for (const [s, e] of analysis.silences) {
      if (s > cursor) voiced.push([cursor, s]);
      cursor = e;
    }
    if (cursor < clip.durationMs) voiced.push([cursor, clip.durationMs]);
    const per = Math.ceil(text.length / voiced.length);
    const out: Array<{ text: string; startMs: number; endMs: number }> = [];
    voiced.forEach(([s, e], vi) => {
      const chunk = text.slice(vi * per, (vi + 1) * per);
      const step = (e - s) / Math.max(1, chunk.length);
      chunk.forEach((w, i) => out.push({ text: w, startMs: Math.round(s + i * step), endMs: Math.round(s + (i + 1) * step - 40) }));
    });
    return out;
  }, "no speech in a tone fixture; STT is not exercised here");

  const media = {
    assetId: "primary",
    durationMs: clip.durationMs,
    width: clip.width,
    height: clip.height,
    fps: clip.fps,
    transcript: { words },
    silences: analysis.silences.map(([startMs, endMs]) => ({ startMs, endMs })),
    scenesMs: analysis.scenes,
    loudness: { integratedLufs: analysis.loud.integratedLufs, ...(analysis.loud.truePeakDb != null ? { truePeakDb: analysis.loud.truePeakDb } : {}) },
  };
  // Keep the first spoken line exactly as shot.
  const firstVoiced = [analysis.silences[0][1], analysis.silences[1][0]] as [number, number];
  const director = VideoAIDirectorService.getInstance();

  const turn1 = await step("AI Director turn 1: remove pauses + captions, first line locked (planner → validator → expander → EditIRCompiler)", "mixed", async () => {
    const llm = scriptedDirectorLLM([
      { text: "", toolCalls: [tc("removeSilences", { minDurationSec: 0.5, paddingSec: 0.1 }), tc("autoCaptions", { highlightColor: "#FF5A1F" }), tc("finish_edit", { summary: "Removed the pauses and added captions." })] },
    ]);
    const res = await director.directMobile(
      { prompt: "Remove the pauses and add captions in my brand colour. Keep my first line as it is.", media, constraints: { lockedRanges: [firstVoiced] } } as any,
      { llmClient: llm.client as any, context: { warnings: [] } }
    );
    assert.equal(res.plannerSource, "llm", res.plannerReason);
    assert.ok(res.appliedOperations.length >= 2, JSON.stringify(res.appliedOperations));
    const ast = res.ast as EditIR;
    assert.ok(sec(ast.meta.totalDuration) < clip.durationMs / 1000 - 2, "pauses were cut");
    assert.ok((ast.tracks.captionTrack ?? []).length > 0, "captions were added");
    return res;
  }, "director code path is real; the model's tool calls are scripted");
  const ir1 = turn1.ast as EditIR;
  const sourceIR = { ...ir1, meta: { ...ir1.meta, totalDuration: { value: clip.durationMs, timescale: 1000 } }, tracks: { ...ir1.tracks, videoTracks: [{ id: "main", type: "MAIN_VIDEO", zIndex: 0, clips: [{ ...ir1.tracks.videoTracks[0].clips[0], sourceRange: { start: { value: 0, timescale: 1000 }, duration: { value: clip.durationMs, timescale: 1000 } }, timelineRange: { start: { value: 0, timescale: 1000 }, duration: { value: clip.durationMs, timescale: 1000 } }, speedMultiplier: 1 }] }] } } as EditIR;

  await step("locked range preserved in the timeline (client re-check, same rule as the server validator)", "real", () => {
    assert.deepEqual(lockedRangeProblems(sourceIR, ir1, [firstVoiced]), []);
  });

  const r1 = await step("native render plan + REAL FFmpeg render of turn 1 (720p 9:16, captions overlay, AAC)", "mixed", () => renderAndMeasure(ir1, clip, "turn1"), "render is real; caption PNGs are solid boxes (canvas text rasteriser needs a browser)");

  await step("media checks on the turn-1 export: duration, size, fps, audio, captions at their times, locked footage unchanged", "real", () => {
    const { out, qa, spec } = r1;
    assert.equal(qa.width, 720);
    assert.equal(qa.height, 1280);
    assert.ok(qa.fps && near(qa.fps, 30, 0.01));
    assert.ok(near(qa.durationMs, sec(ir1.meta.totalDuration) * 1000, 120), `${qa.durationMs} vs ${sec(ir1.meta.totalDuration)}`);
    assert.equal(qa.hasAudio, true);
    assert.equal(qa.audioChannels, 2, "the renderer mixes to stereo AAC (mono voice is centred)");
    assert.deepEqual(qa.blackRangesMs, [], "no black frames");
    assert.deepEqual(qa.frozenRangesMs, [], "no frozen picture");
    // captions: white box at every caption's midpoint, transparent where no caption is active
    const caps = ir1.tracks.captionTrack!;
    for (const c of [caps[0], caps[Math.floor(caps.length / 2)], caps[caps.length - 1]]) {
      const mid = sec(c.timeRange.start) + sec(c.timeRange.duration) / 2;
      const px = pixel(out, mid, spec.width / 2, Math.round(spec.height * 0.89));
      assert.ok(Math.min(...px) > 200, `caption "${c.text}" at ${mid.toFixed(2)} s: ${px}`);
    }
    const { sequence, states } = captionStateTimeline(caps, spec.durationSec);
    let t = 0;
    const gap = sequence.find((q) => {
      const s = states[q.state];
      const hit = !s.caption && !s.titles.length && q.durationSec > 0.2;
      if (!hit) t += q.durationSec;
      return hit;
    });
    if (gap) {
      const px = pixel(out, t + gap.durationSec / 2, spec.width / 2, Math.round(spec.height * 0.89));
      assert.ok(Math.min(...px) < 200 || Math.max(...px) - Math.min(...px) > 30, `no caption expected at ${t}`);
    }
    // locked footage: the frames of the locked source range are in the export unchanged (top half, below captions)
    for (const s of [firstVoiced[0] / 1000 + 0.35, (firstVoiced[0] + firstVoiced[1]) / 2000, firstVoiced[1] / 1000 - 0.35]) {
      const tl = timelineTimeOf(ir1, s);
      assert.ok(tl != null, `locked source time ${s} was cut`);
      const d = frameDiff(clip.path, s, out, tl!);
      assert.ok(d < 12, `locked frame at source ${s.toFixed(2)} s differs by ${d.toFixed(1)}`);
    }
  });

  const critique = await step("critic: VideoCriticService heuristics + measured export QA (turn 1)", "real", () => {
    const report = VideoCriticService.analyze(ir1);
    assert.ok(report.overallScore >= 0 && report.overallScore <= 100);
    const quiet = r1.issues.find((i) => i.id === "too-quiet");
    assert.ok(quiet, `the quiet fixture voice must be flagged by the loudness check: ${JSON.stringify(r1.issues)} lufs=${r1.qa.integratedLufs}`);
    return { report, issues: r1.issues, lastExportQa: r1.qa as LastExportQa };
  });

  const ir2 = await step("repair round: director turn 2 with the QA issues + lastExportQa (stubbed LLM raises the voice)", "mixed", async () => {
    const llm = scriptedDirectorLLM([{ text: "", toolCalls: [tc("adjustVolume", { trackId: "original", volumeDb: 9 }), tc("finish_edit", { summary: "Raised the voice to a normal loudness." })] }]);
    const lockedNow: [number, number] = [Math.round(timelineTimeOf(ir1, firstVoiced[0] / 1000 + 0.01)! * 1000), Math.round(timelineTimeOf(ir1, firstVoiced[1] / 1000 - 0.01)! * 1000)];
    const res = await director.directMobile(
      {
        prompt: `Fix the problems the quality check found in the last export:\n${critique.issues.map((i) => `- ${i.title}`).join("\n")}`,
        media,
        currentEditIR: turn1.editIR,
        constraints: { lockedRanges: [lockedNow], lockedTracks: ["captions"] },
        lastExportQa: critique.lastExportQa,
      } as any,
      { llmClient: llm.client as any, context: { warnings: [] } }
    );
    assert.equal(res.plannerSource, "llm", res.plannerReason);
    assert.match(llm.calls[0], /quality check/);
    const ast = res.ast as EditIR;
    assert.ok(near(sec(ast.meta.totalDuration), sec(ir1.meta.totalDuration), 0.05), "the repair did not re-cut the video");
    assert.deepEqual(lockedRangeProblems(ir1, ast, [lockedNow]), []);
    return ast;
  });

  const r2 = await step("final REAL render + checks: loudness fixed, captions/size/duration kept, no black/frozen frames", "real", () => {
    const r = renderAndMeasure(ir2, clip, "final");
    assert.ok(!r.issues.some((i) => i.id === "too-quiet"), JSON.stringify(r.issues));
    assert.ok(r.qa.integratedLufs! > r1.qa.integratedLufs! + 5, `${r1.qa.integratedLufs} -> ${r.qa.integratedLufs}`);
    assert.equal(r.qa.width, 720);
    assert.ok(near(r.qa.durationMs, r1.qa.durationMs, 120));
    assert.deepEqual(r.qa.blackRangesMs, []);
    assert.deepEqual(r.qa.frozenRangesMs, []);
    assert.deepEqual(r.issues, []);
    return r;
  });

  await step("no-audio footage: a title-only edit renders without an audio stream (expected), 16:9", "mixed", async () => {
    const na = fx.no_audio;
    const llm = scriptedDirectorLLM([{ text: "", toolCalls: [tc("addText", { text: "20 minutes", timelineStartSec: 0.5, durationSec: 2 }), tc("finish_edit", { summary: "Added a title." })] }]);
    const res = await director.directMobile({ prompt: "Add a title that says 20 minutes", media: { assetId: "primary", durationMs: na.durationMs, width: na.width, height: na.height, fps: na.fps } } as any, { llmClient: llm.client as any, context: { warnings: [] } });
    const r = renderAndMeasure(res.ast as EditIR, na, "no-audio");
    assert.equal(r.qa.hasAudio, false);
    assert.equal(r.qa.width, 1280);
    assert.equal(r.qa.height, 720);
    assert.ok(!r.issues.some((i) => i.id === "no-audio"), "a silent timeline is not flagged for missing audio");
  });

  await step("calendar attach payload: the final MP4 as multipart 'video' to /calendar-pieces/:id/final-video (not sent)", "real", async () => {
    const bytes = readFileSync(r2.out);
    const form = new FormData();
    form.append("video", new File([bytes], "final.mp4", { type: "video/mp4" }), "final.mp4");
    const f = form.get("video") as File;
    assert.equal(f.type, "video/mp4");
    assert.equal(f.size, statSync(r2.out).size);
  });

  await step("publish input per platform (buildPublishInput; no platform API is called)", "real", () => {
    const qa = r2.qa;
    const finalUrl = "https://media.test/e2e/final.mp4";
    const post = { id: "post_e2e", content: piece.captions.instagram!.caption, mediaType: "video", finalVideoUrl: finalUrl, mediaUrls: [finalUrl], metadata: { mediaInfo: { [finalUrl]: { mimeType: "video/mp4", width: qa.width, height: qa.height, durationSec: qa.durationMs / 1000, sizeBytes: statSync(r2.out).size } } } };
    for (const platform of piece.platforms) {
      const input = buildPublishInput(post, { id: `v_${platform}`, platformMeta: {} }, { id: `acc_${platform}`, platformAccountId: "123", username: "tmf" }, platform as any);
      assert.equal(input.format, "video");
      assert.equal(input.media.length, 1);
      assert.equal(input.media[0].kind, "video");
      assert.equal(input.media[0].width, 720);
      assert.ok(near(input.media[0].durationSec! * 1000, qa.durationMs, 1));
      assert.match(input.caption, /consistency beats intensity/);
    }
  });

  rmSync(work, { recursive: true, force: true });
  const real = steps.filter((s) => s.kind === "real").length;
  console.log(`\n${steps.filter((s) => s.ok).length}/${steps.length} steps passed (${real} fully real, ${steps.length - real} with stubbed LLM/STT/text-raster parts)`);
}

main().then(
  () => process.exit(0),
  () => {
    rmSync(work, { recursive: true, force: true });
    process.exit(1);
  }
);
