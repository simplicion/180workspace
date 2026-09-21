/**
 * Builds a native (FFmpeg) render specification from the editor's timeline (EditIR).
 *
 * Pure and dependency-free so it can be unit-tested and run against a real ffmpeg binary (see
 * tests/integration/native-render-plan.integration.ts). The output is a `NativeRenderSpec`; the desktop app's Rust side
 * validates the filter graph against an allowlist and runs it. The web content never gets to pass raw FFmpeg arguments.
 *
 * What is rendered natively (matches the canvas preview/export semantics):
 *   - clip trim, speed (0.25x-4x), volume, opacity, static scale and position, several overlapping tracks in z-order
 *   - main-track clips are fit to the canvas width; overlay tracks are drawn at 40% width (same rule as the canvas export)
 *   - image clips; gaps between clips render black / silent
 *   - audio: audio of main-track video clips + every audio track clip (volume, fade in/out, speed)
 *
 * What is NOT rendered natively yet (the plan then reports `supported: false` with reasons, and the editor falls back to
 * the compatibility renderer): captions, camera zoom events, rotation, crop, animated (keyframed / start != end) scale,
 * transitions other than CUT, clip effects. Audio ducking is applied as plain track volume (reported as a warning).
 */

import type { EditIR } from "@workspace/video-contracts";

export type RenderQuality = "draft" | "balanced" | "high";

export interface NativeRenderSpec {
  version: 1;
  /** Real files on disk (returned by the native picker); filter graph inputs are indexes into this list. */
  inputs: string[];
  filterComplex: string;
  /** e.g. ["[vout]", "[aout]"] or ["[vout]"] when there is no audio */
  maps: string[];
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  quality: RenderQuality;
  hasAudio: boolean;
}

export type RenderPlanResult =
  | { supported: true; spec: NativeRenderSpec; warnings: string[] }
  | { supported: false; reasons: string[] };

export interface RenderPlanOptions {
  /** Maps a clip's `sourcePath` (an asset:// URL in the desktop app) to the real file path, or null if it is not a local file. */
  resolveNativePath: (sourcePath: string) => string | null;
  /** Whether the source has an audio stream (from the asset's probe data). */
  sourceHasAudio: (sourcePath: string) => boolean;
  settings: { resolution: string; fps: number; quality?: RenderQuality };
}

type Time = { value: number; timescale: number };
const sec = (t: Time | undefined): number => (t && t.timescale ? t.value / t.timescale : 0);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|svg)$/i;
const EPS = 1e-3;

/** Fixed-precision number without exponent notation (FFmpeg does not parse `1e-7`). */
export function num(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`non-finite number in render plan: ${n}`);
  const s = n.toFixed(6);
  return s.replace(/\.?0+$/, "") || "0";
}

/** Same canvas sizing rules as the canvas exporter (tauri-bridge.renderExport). */
export function resolveCanvasSize(aspect: string, resolution: string): { width: number; height: number } {
  const vertical = aspect === "9:16" || resolution === "9:16";
  const square = aspect === "1:1";
  let width = vertical || square ? 1080 : 1920;
  let height = vertical ? 1920 : square ? 1080 : 1080;
  if (resolution === "4K") {
    width = vertical || square ? 2160 : 3840;
    height = vertical ? 3840 : square ? 2160 : 2160;
  } else if (resolution === "720p") {
    width = vertical || square ? 720 : 1280;
    height = vertical ? 1280 : square ? 720 : 720;
  }
  return { width, height };
}

/** `atempo` only accepts 0.5-2 per instance; chain instances for the range 0.25-4. */
export function atempoChain(speed: number): string {
  const parts: string[] = [];
  let s = speed;
  while (s > 2 + EPS) {
    parts.push("atempo=2");
    s /= 2;
  }
  while (s < 0.5 - EPS) {
    parts.push("atempo=0.5");
    s /= 0.5;
  }
  if (Math.abs(s - 1) > EPS) parts.push(`atempo=${num(s)}`);
  return parts.join(",");
}

export function buildNativeRenderPlan(editIR: EditIR, options: RenderPlanOptions): RenderPlanResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const addReason = (r: string) => {
    if (!reasons.includes(r)) reasons.push(r);
  };

  const fps = Math.min(120, Math.max(1, Math.round(options.settings.fps || 30)));
  const { width, height } = resolveCanvasSize(editIR.meta.targetAspect, options.settings.resolution);

  // ── project-level features that need the compatibility renderer ────────────────
  if ((editIR.tracks.captionTrack?.length ?? 0) > 0) addReason("captions");
  if ((editIR.tracks.cameraTrack ?? []).some((c) => Math.abs((c.scale ?? 1) - 1) > EPS)) addReason("camera zoom");

  const tracks = [...editIR.tracks.videoTracks].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // ── inputs ───────────────────────────────────────────────────────────────────
  const inputs: string[] = [];
  const inputIndex = (path: string): number => {
    let i = inputs.indexOf(path);
    if (i < 0) {
      inputs.push(path);
      i = inputs.length - 1;
    }
    return i;
  };

  // ── video ────────────────────────────────────────────────────────────────────
  interface VClip {
    idx: number;
    isImage: boolean;
    main: boolean;
    srcStart: number;
    srcDur: number;
    tlStart: number;
    tlDur: number;
    speed: number;
    scale: number;
    posX: number;
    posY: number;
    opacity: number;
  }
  const vclips: VClip[] = [];
  const audioParts: Array<{
    idx: number;
    srcStart: number;
    srcDur: number;
    tlStart: number;
    speed: number;
    volumeDb: number;
    fadeIn: number;
    fadeOut: number;
  }> = [];

  for (const track of tracks) {
    const main = track.type === "MAIN_VIDEO";
    for (const clip of track.clips) {
      const path = options.resolveNativePath(clip.sourcePath);
      if (!path) {
        addReason(`clip "${clip.id}" is not a file on this computer`);
        continue;
      }
      const t = clip.transform;
      const speed = clip.speedMultiplier ?? 1;
      if (!(speed >= 0.25 - EPS && speed <= 4 + EPS)) addReason(`speed ${speed}x is outside 0.25x-4x`);
      if (Math.abs(t?.rotationDeg ?? 0) > EPS) addReason("rotation");
      const crop = (t as any)?.crop;
      if (crop && (crop.top || crop.bottom || crop.left || crop.right)) addReason("crop");
      if (Array.isArray((t as any)?.keyframes) && (t as any).keyframes.length > 0) addReason("keyframe animation");
      if (t?.scale && Math.abs((t.scale.start ?? 1) - (t.scale.end ?? 1)) > EPS) addReason("animated scale");
      if ((clip.effects ?? []).length > 0) addReason(`clip effects (${clip.effects.join(", ")})`);
      for (const tr of [clip.transitionIn, clip.transitionOut]) {
        if (tr && tr.type !== "CUT" && sec(tr.duration) > EPS) addReason(`transition ${tr.type}`);
      }

      const srcStart = sec(clip.sourceRange.start);
      const srcDur = sec(clip.sourceRange.duration);
      const tlStart = sec(clip.timelineRange.start);
      const tlDur = sec(clip.timelineRange.duration);
      if (!(srcDur > 0) || !(tlDur > 0)) {
        addReason(`clip "${clip.id}" has no duration`);
        continue;
      }

      const idx = inputIndex(path);
      const isImage = IMAGE_EXT.test(path);
      vclips.push({
        idx,
        isImage,
        main,
        srcStart,
        srcDur,
        tlStart,
        tlDur,
        speed,
        scale: t?.scale?.start ?? 1,
        posX: t?.position?.x ?? 0,
        posY: t?.position?.y ?? 0,
        opacity: Math.max(0, Math.min(1, t?.opacity ?? 1)),
      });

      if (main && !isImage && options.sourceHasAudio(clip.sourcePath)) {
        audioParts.push({
          idx,
          srcStart,
          srcDur,
          tlStart,
          speed,
          volumeDb: clip.volumeDb ?? 0,
          fadeIn: 0,
          fadeOut: 0,
        });
      }
    }
  }

  // ── audio tracks ─────────────────────────────────────────────────────────────
  for (const at of editIR.tracks.audioTracks ?? []) {
    if (at.duckWithSpeech) warnings.push(`audio ducking on "${at.type}" is not applied in the native export yet; the track plays at its set volume`);
    for (const ac of at.clips) {
      const path = options.resolveNativePath(ac.sourcePath);
      if (!path) {
        addReason(`audio clip "${ac.id}" is not a file on this computer`);
        continue;
      }
      audioParts.push({
        idx: inputIndex(path),
        srcStart: sec(ac.sourceRange.start),
        srcDur: sec(ac.sourceRange.duration),
        tlStart: sec(ac.timelineRange.start),
        speed: 1,
        volumeDb: (at.volumeDb ?? 0) + (ac.volumeDb ?? 0),
        fadeIn: sec(ac.fadeInDuration),
        fadeOut: sec(ac.fadeOutDuration),
      });
    }
  }

  if (vclips.length === 0 && reasons.length === 0) addReason("the timeline has no video clips");
  if (reasons.length > 0) return { supported: false, reasons };

  // ── total duration ───────────────────────────────────────────────────────────
  let durationSec = sec(editIR.meta.totalDuration);
  const timelineEnd = Math.max(0, ...vclips.map((c) => c.tlStart + c.tlDur));
  if (!(durationSec > 0) || timelineEnd > durationSec) durationSec = timelineEnd;
  durationSec = Math.max(0.1, durationSec);

  // ── filter graph ─────────────────────────────────────────────────────────────
  const chains: string[] = [];
  chains.push(`color=c=black:s=${width}x${height}:r=${fps}:d=${num(durationSec)}[base0]`);

  let prev = "base0";
  vclips.forEach((c, i) => {
    const label = `v${i}`;
    const src = c.isImage
      ? `[${c.idx}:v]loop=loop=-1:size=1:start=0,trim=start=0:duration=${num(c.tlDur)}`
      : `[${c.idx}:v]trim=start=${num(c.srcStart)}:duration=${num(c.srcDur)}`;
    // Width rule of the canvas exporter: main track = canvas width, overlays = 40% of it; then the clip's own scale.
    const targetW = Math.max(2, 2 * Math.round((width * (c.main ? 1 : 0.4) * c.scale) / 2));
    const px = c.posX * (width / 1920);
    const py = c.posY * (height / 1080);
    const parts = [
      src,
      `setpts=(PTS-STARTPTS)/${num(c.speed)}+${num(c.tlStart)}/TB`,
      `scale=w=${targetW}:h=-2`,
      `setsar=1`,
      `format=yuva420p`,
    ];
    if (c.opacity < 1 - EPS) parts.push(`colorchannelmixer=aa=${num(c.opacity)}`);
    chains.push(`${parts.join(",")}[${label}]`);

    const out = `base${i + 1}`;
    const x = `(main_w-overlay_w)/2+${num(px)}`;
    const y = `(main_h-overlay_h)/2+${num(py)}`;
    chains.push(
      `[${prev}][${label}]overlay=x='${x}':y='${y}':enable='between(t,${num(c.tlStart)},${num(c.tlStart + c.tlDur)})':eof_action=pass[${out}]`
    );
    prev = out;
  });
  chains.push(`[${prev}]format=yuv420p,fps=${fps}[vout]`);

  // audio
  const maps = ["[vout]"];
  const hasAudio = audioParts.length > 0;
  if (hasAudio) {
    const labels: string[] = [];
    audioParts.forEach((a, i) => {
      const parts = [
        `[${a.idx}:a]atrim=start=${num(a.srcStart)}:duration=${num(a.srcDur)}`,
        `asetpts=PTS-STARTPTS`,
        `aformat=sample_rates=48000:channel_layouts=stereo`,
      ];
      const tempo = atempoChain(a.speed);
      if (tempo) parts.push(tempo);
      if (Math.abs(a.volumeDb) > EPS) parts.push(`volume=${num(a.volumeDb)}dB`);
      const playLen = a.srcDur / a.speed;
      if (a.fadeIn > EPS) parts.push(`afade=t=in:st=0:d=${num(a.fadeIn)}`);
      if (a.fadeOut > EPS) parts.push(`afade=t=out:st=${num(Math.max(0, playLen - a.fadeOut))}:d=${num(a.fadeOut)}`);
      const delayMs = Math.max(0, Math.round(a.tlStart * 1000));
      if (delayMs > 0) parts.push(`adelay=${delayMs}|${delayMs}`);
      chains.push(`${parts.join(",")}[a${i}]`);
      labels.push(`[a${i}]`);
    });
    // A silent bed of the full duration is mixed in with the real tracks. It guarantees the audio is at least as long
    // as the video WITHOUT `apad`: on FFmpeg 4.1 `apad` + `adelay` + `-t` + AAC encoding aborts inside the automatic
    // trim filter (assertion in trim.c). Verified against the bundled binary; see the integration test.
    chains.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${num(durationSec)},asetpts=PTS-STARTPTS[sil]`);
    const mixInputs = [...labels, "[sil]"];
    // amix divides every input by the number of inputs (FFmpeg < 4.4 has no `normalize=0`): compensate.
    chains.push(`${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0,volume=${mixInputs.length}[aout]`);
    maps.push("[aout]");
  }

  return {
    supported: true,
    warnings,
    spec: {
      version: 1,
      inputs,
      filterComplex: chains.join(";"),
      maps,
      width,
      height,
      fps,
      durationSec,
      quality: options.settings.quality ?? "balanced",
      hasAudio,
    },
  };
}

/** Human-readable explanation of why the native exporter was not used. */
export function describeUnsupported(reasons: string[]): string {
  return `The fast native exporter can't render yet: ${reasons.join(", ")}.`;
}
