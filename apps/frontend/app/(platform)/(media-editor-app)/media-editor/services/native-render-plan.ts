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
 *   - image clips (`mediaType: "image"` photos are scaled and cropped to cover the canvas); gaps render black / silent
 *   - the effect track (flash, fade_black, shake, zoom_pulse, black_white, vignette), see `buildEffectChains`
 *   - audio: audio of main-track video clips + every audio track clip (volume, fade in/out, speed)
 *
 * What is NOT rendered natively yet (the plan then reports `supported: false` with reasons, and the editor falls back to
 * the compatibility renderer): captions, camera zoom events, rotation, crop, animated (keyframed / start != end) scale,
 * clip effects (the string list on a clip; the effect TRACK is rendered).
 *
 * Transitions: the bundled FFmpeg (4.1, see prepare-sidecars.mjs) has no `xfade`, and timeline clips do not overlap, so
 * every transition is drawn at the cut with the incoming clip's own stream over a FREEZE of the outgoing clip's last
 * frame (overlay eof_action=repeat for the transition length): CROSSFADE/DISSOLVE alpha-fade, SLIDE_* animate the
 * overlay position, WIPE/WIPE_RIGHT reveal with a `geq` alpha mask, DIP_* fade through a colour, BLUR_PUNCH/GLITCH are
 * hard cuts with a blur / RGB-split burst, ZOOM_SWOOSH/ZOOM_OUT settle a zoom on the composite (see `planTransitions`). Audio ducking is applied as plain track volume (reported as a warning).
 */

import type { EditIR, EffectEvent } from "@workspace/video-contracts";
import { EFFECT_CONSTANTS } from "./effect-constants";

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
  /** Caption overlay list (ffconcat) written by the desktop app; when set it is the LAST graph input. */
  overlaySequence?: string | null;
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
    /** photo that covers the canvas (clip.mediaType === "image") */
    cover: boolean;
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
    trackIdx: number;
    trIn: TransitionSpec | null;
    trOut: TransitionSpec | null;
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

  for (const [trackIdx, track] of tracks.entries()) {
    const main = track.type === "MAIN_VIDEO";
    const ordered = [...track.clips].sort((a, b) => sec(a.timelineRange.start) - sec(b.timelineRange.start));
    for (const clip of ordered) {
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

      const srcStart = sec(clip.sourceRange.start);
      const srcDur = sec(clip.sourceRange.duration);
      const tlStart = sec(clip.timelineRange.start);
      const tlDur = sec(clip.timelineRange.duration);
      if (!(srcDur > 0) || !(tlDur > 0)) {
        addReason(`clip "${clip.id}" has no duration`);
        continue;
      }

      const idx = inputIndex(path);
      const isImage = clip.mediaType === "image" || IMAGE_EXT.test(path);
      vclips.push({
        idx,
        isImage,
        cover: clip.mediaType === "image",
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
        trackIdx,
        trIn: transitionSpec(clip.transitionIn),
        trOut: transitionSpec(clip.transitionOut),
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

  const tr = planTransitions(vclips, { width, height });

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
    // Photos (mediaType "image") cover the whole canvas: scale up to fill, then centre-crop.
    const coverW = Math.max(2, 2 * Math.round((width * c.scale) / 2));
    const coverH = Math.max(2, 2 * Math.round((height * c.scale) / 2));
    const sizing = c.cover
      ? [`scale=w=${coverW}:h=${coverH}:force_original_aspect_ratio=increase`, `crop=w=${coverW}:h=${coverH}`]
      : [`scale=w=${targetW}:h=-2`];
    const parts = [
      src,
      `setpts=(PTS-STARTPTS)/${num(c.isImage ? 1 : c.speed)}+${num(c.tlStart)}/TB`,
      ...sizing,
      `setsar=1`,
      `format=yuva420p`,
    ];
    if (c.opacity < 1 - EPS) parts.push(`colorchannelmixer=aa=${num(c.opacity)}`);
    const look = tr.perClip[i];
    parts.push(...look.filters);
    chains.push(`${parts.join(",")}[${label}]`);

    const out = `base${i + 1}`;
    const x = `(main_w-overlay_w)/2+${num(px)}${look.x}`;
    const y = `(main_h-overlay_h)/2+${num(py)}${look.y}`;
    const end = c.tlStart + c.tlDur + look.freezeSec;
    chains.push(
      `[${prev}][${label}]overlay=x='${x}':y='${y}':enable='between(t,${num(c.tlStart)},${num(end)})':eof_action=${look.freezeSec > 0 ? "repeat" : "pass"}[${out}]`
    );
    prev = out;
  });
  const fx = buildEffectChains(editIR.tracks.effectTrack ?? [], prev, { width, height, fps, durationSec }, tr.zoomSettles);
  chains.push(...fx.chains);
  prev = fx.out;
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

// ── transitions ───────────────────────────────────────────────────────────────

type TransitionKind =
  | "CUT" | "CROSSFADE" | "DISSOLVE" | "ZOOM_SWOOSH" | "ZOOM_OUT" | "SLIDE_LEFT" | "SLIDE_UP" | "WIPE" | "WIPE_RIGHT"
  | "BLUR_PUNCH" | "GLITCH" | "DIP_BLACK" | "DIP_WHITE";
export interface TransitionSpec {
  type: TransitionKind;
  durationSec: number;
}
export interface ZoomSettle {
  startSec: number;
  durationSec: number;
  /** extra zoom at the start of the range; eases back to none */
  peak: number;
}
export interface ClipTransitionLook {
  /** filters appended to the clip's own chain */
  filters: string[];
  /** appended to the overlay x / y expressions ("" or "+...") */
  x: string;
  y: string;
  /** keep showing this clip's last frame (overlay eof_action=repeat) under the next clip for this long */
  freezeSec: number;
}

function transitionSpec(t: { type: string; duration: Time } | undefined): TransitionSpec | null {
  if (!t || t.type === "CUT") return null;
  const d = sec(t.duration);
  return d > EPS ? { type: t.type as TransitionKind, durationSec: d } : null;
}

/** Transitions whose incoming clip is drawn over a freeze of the outgoing clip's last frame. */
const OVER_FREEZE = new Set<TransitionKind>(["CROSSFADE", "DISSOLVE", "ZOOM_SWOOSH", "SLIDE_LEFT", "SLIDE_UP", "WIPE", "WIPE_RIGHT"]);

/**
 * Per-clip transition looks. The incoming side of a cut uses `clip.transitionIn`, else the adjacent previous clip's
 * `transitionOut` (same track). A `transitionOut` with no adjacent next clip fades the clip out at its end.
 */
export function planTransitions(
  clips: ReadonlyArray<{ trackIdx: number; tlStart: number; tlDur: number; trIn: TransitionSpec | null; trOut: TransitionSpec | null }>,
  canvas: { width: number; height: number }
): { perClip: ClipTransitionLook[]; zoomSettles: ZoomSettle[] } {
  const perClip: ClipTransitionLook[] = clips.map(() => ({ filters: [], x: "", y: "", freezeSec: 0 }));
  const zoomSettles: ZoomSettle[] = [];
  const adjacent = (i: number, dir: -1 | 1) =>
    clips.findIndex(
      (o, j) =>
        j !== i &&
        o.trackIdx === clips[i].trackIdx &&
        (dir < 0
          ? Math.abs(o.tlStart + o.tlDur - clips[i].tlStart) < 0.02
          : Math.abs(clips[i].tlStart + clips[i].tlDur - o.tlStart) < 0.02)
    );

  clips.forEach((c, i) => {
    const look = perClip[i];
    const s = c.tlStart;
    const p = adjacent(i, -1);
    const entry = c.trIn ?? (p >= 0 ? clips[p].trOut : null);
    if (entry) {
      const d = Math.max(0.05, Math.min(entry.durationSec, c.tlDur / 2));
      const P = `clip((t-${num(s)})/${num(d)},0,1)`;
      const inRange = (a: number, b: number) => `enable='between(t,${num(a)},${num(b)})'`;
      if (p >= 0 && OVER_FREEZE.has(entry.type)) perClip[p].freezeSec = Math.max(perClip[p].freezeSec, d);
      switch (entry.type) {
        case "CROSSFADE":
        case "DISSOLVE":
          look.filters.push(`fade=t=in:st=${num(s)}:d=${num(d)}:alpha=1`);
          break;
        case "ZOOM_SWOOSH":
          look.filters.push(`fade=t=in:st=${num(s)}:d=${num(d)}:alpha=1`);
          zoomSettles.push({ startSec: s, durationSec: d, peak: 0.45 });
          break;
        case "ZOOM_OUT":
          zoomSettles.push({ startSec: s, durationSec: d, peak: 0.3 });
          break;
        case "SLIDE_LEFT":
          look.x = `+main_w*(1-${P})`;
          break;
        case "SLIDE_UP":
          look.y = `+main_h*(1-${P})`;
          break;
        case "WIPE": // wipe left: the edge moves right-to-left, revealing the new clip from the right
        case "WIPE_RIGHT": {
          const T = `clip((T-${num(s)})/${num(d)},0,1)`;
          const mask = entry.type === "WIPE" ? `gte(X,W*(1-${T}))` : `lte(X,W*${T})`;
          look.filters.push(`geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='if(${mask},alpha(X,Y),0)':${inRange(s, s + d)}`);
          break;
        }
        case "BLUR_PUNCH":
          look.filters.push(`gblur=sigma=18:${inRange(s, s + d / 2)}`, `gblur=sigma=6:${inRange(s + d / 2, s + d)}`);
          break;
        case "GLITCH": {
          const R = Math.max(4, Math.round(canvas.width * 0.012));
          look.filters.push(`rgbashift=rh=-${R}:bh=${R}:${inRange(s, s + d)}`, `noise=alls=40:allf=t:all_seed=180:${inRange(s, s + d)}`);
          break;
        }
        case "DIP_BLACK":
        case "DIP_WHITE": {
          const color = entry.type === "DIP_BLACK" ? "black" : "white";
          look.filters.push(`fade=t=in:st=${num(s)}:d=${num(d / 2)}:color=${color}`);
          if (p >= 0) {
            const pe = clips[p].tlStart + clips[p].tlDur;
            const pd = Math.min(d / 2, clips[p].tlDur / 2);
            perClip[p].filters.push(`fade=t=out:st=${num(pe - pd)}:d=${num(pd)}:color=${color}`);
          }
          break;
        }
      }
    }
    // An out-transition with nothing after it: fade the clip out at its end.
    if (c.trOut && adjacent(i, 1) < 0) {
      const d = Math.max(0.05, Math.min(c.trOut.durationSec, c.tlDur / 2));
      const st = num(s + c.tlDur - d);
      look.filters.push(
        c.trOut.type === "DIP_WHITE" ? `fade=t=out:st=${st}:d=${num(d)}:color=white` : `fade=t=out:st=${st}:d=${num(d)}:alpha=1`
      );
    }
  });
  return { perClip, zoomSettles };
}

export const MAX_EFFECTS = 64;
const even = (n: number) => Math.max(2, 2 * Math.round(n / 2));

/**
 * FFmpeg chains for the effect track, applied to the composited picture (label `input`) before the final format/fps.
 * Deterministic (no random sources) and built only from allow-listed filters. The formulas mirror `effectVisualsAt`
 * in editor-library.ts:
 *  - flash / fade_black: a white / black `color` layer whose alpha ramps with `fade` (alpha=1), scaled by intensity
 *  - black_white: `hue=s=1-intensity`, vignette: `vignette=angle=...`, both gated with timeline `enable`
 *  - shake / zoom_pulse: ONE full-length branch per kind (crop jitter + scale back / zoompan), overlaid only inside
 *    the ranges. Full-length on purpose: a trimmed branch of a split makes overlay buffer every frame before it.
 */
export function buildEffectChains(
  effects: readonly EffectEvent[],
  input: string,
  canvas: { width: number; height: number; fps: number; durationSec: number },
  zoomSettles: readonly ZoomSettle[] = []
): { chains: string[]; out: string } {
  const { width: W, height: H, fps, durationSec } = canvas;
  const k = EFFECT_CONSTANTS;
  const items = effects
    .map((e) => {
      const a = Math.max(0, sec(e.timeRange.start));
      const b = Math.min(durationSec, a + Math.max(0.1, sec(e.timeRange.duration)));
      const I = Math.max(0, Math.min(1, Number.isFinite(e.intensity) ? e.intensity : 0.6));
      return { type: e.type, a, b, d: b - a, I };
    })
    .filter((e) => e.d > EPS && e.I > EPS)
    .sort((x, y) => x.a - y.a)
    .slice(0, MAX_EFFECTS);

  const chains: string[] = [];
  let prev = input;
  let n = 0;
  const next = () => `fx${n++}`;
  const between = (list: typeof items) => list.map((e) => `between(t,${num(e.a)},${num(e.b)})`).join("+");

  // 1. zoom_pulse (geometry first)
  const zooms = items.filter((e) => e.type === "zoom_pulse");
  const settles = zoomSettles
    .map((z) => ({ a: Math.max(0, z.startSec), d: z.durationSec, b: Math.min(durationSec, z.startSec + z.durationSec), peak: z.peak }))
    .filter((z) => z.b - z.a > EPS && z.peak > EPS);
  if (zooms.length > 0 || settles.length > 0) {
    const T = `(in/${fps})`;
    const z = [
      ...zooms.map((e) => `between(${T},${num(e.a)},${num(e.b)})*${num(k.zoomPulsePeak * e.I)}*sin(PI*(${T}-${num(e.a)})/${num(e.d)})`),
      // transition zoom: starts at 1+peak and eases (quadratically) back to 1
      ...settles.map((e) => `between(${T},${num(e.a)},${num(e.b)})*${num(e.peak)}*pow(1-(${T}-${num(e.a)})/${num(e.d)},2)`),
    ].join("+");
    const [main, copy, zoomed, out] = [next(), next(), next(), next()];
    chains.push(`[${prev}]split=2[${main}][${copy}]`);
    chains.push(
      `[${copy}]zoompan=z='1+max(0,${z})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${fps},setsar=1[${zoomed}]`
    );
    const enable = [...zooms, ...settles].map((e) => `between(t,${num(e.a)},${num(e.b)})`).join("+");
    chains.push(`[${main}][${zoomed}]overlay=x=0:y=0:enable='${enable}':eof_action=pass[${out}]`);
    prev = out;
  }

  // 2. shake
  const shakes = items.filter((e) => e.type === "shake");
  if (shakes.length > 0) {
    const mx = even(W * k.shakeMargin);
    const my = even(H * k.shakeMargin);
    const amp = (m: number) => shakes.map((e) => `between(t,${num(e.a)},${num(e.b)})*${num(m * e.I)}`).join("+");
    const x = `${mx}+clip((${amp(mx)})*sin(2*PI*${k.shakeFreqX}*t),-${mx},${mx})`;
    const y = `${my}+clip((${amp(my)})*cos(2*PI*${k.shakeFreqY}*t),-${my},${my})`;
    const [main, copy, shaken, out] = [next(), next(), next(), next()];
    chains.push(`[${prev}]split=2[${main}][${copy}]`);
    chains.push(`[${copy}]crop=w=${W - 2 * mx}:h=${H - 2 * my}:x='${x}':y='${y}',scale=w=${W}:h=${H},setsar=1[${shaken}]`);
    chains.push(`[${main}][${shaken}]overlay=x=0:y=0:enable='${between(shakes)}':eof_action=pass[${out}]`);
    prev = out;
  }

  // 3. colour / tone
  for (const e of items) {
    if (e.type !== "black_white" && e.type !== "vignette") continue;
    const out = next();
    const filter =
      e.type === "black_white"
        ? `hue=s=${num(1 - e.I)}`
        : `vignette=angle=${num(k.vignetteAngleBase + k.vignetteAngleSpan * e.I)}`;
    chains.push(`[${prev}]${filter}:enable='between(t,${num(e.a)},${num(e.b)})'[${out}]`);
    prev = out;
  }

  // 4. flash / dip to black layers
  for (const e of items) {
    if (e.type !== "flash" && e.type !== "fade_black") continue;
    const up = e.type === "flash" ? e.d * k.flashAttack : e.d / 2;
    const down = e.d - up;
    const layer = next();
    const out = next();
    chains.push(
      `color=c=${e.type === "flash" ? "white" : "black"}:s=${W}x${H}:r=${fps}:d=${num(e.d)},format=yuva420p,` +
        `fade=t=in:st=0:d=${num(up)}:alpha=1,fade=t=out:st=${num(up)}:d=${num(down)}:alpha=1,` +
        `colorchannelmixer=aa=${num(e.I)},setpts=PTS-STARTPTS+${num(e.a)}/TB[${layer}]`
    );
    chains.push(`[${prev}][${layer}]overlay=x=0:y=0:enable='between(t,${num(e.a)},${num(e.b)})':eof_action=pass[${out}]`);
    prev = out;
  }

  return { chains, out: prev };
}

/** Human-readable explanation of why the native exporter was not used. */
export function describeUnsupported(reasons: string[]): string {
  return `The fast native exporter can't render yet: ${reasons.join(", ")}.`;
}
