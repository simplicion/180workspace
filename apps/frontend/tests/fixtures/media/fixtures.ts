/**
 * Deterministic real-media fixtures, generated with the same FFmpeg the desktop app bundles (@ffmpeg-installer) from
 * lavfi sources only (testsrc2 / mandelbrot / colour + sine / anoisesrc). Nothing is committed: files are generated
 * on first use into `<tmp>/180-media-fixtures-v<VERSION>` and reused (delete the folder, or bump VERSION, to rebuild).
 *
 * "Speech" is a 220 Hz tone gated on and off with a known pattern, so silence/pauses land at known times.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { analysisArgs, filterReport, parseDurationMs, type AnalysisKind } from "../../../app/(platform)/(media-editor-app)/media-editor/services/media-analysis";

const req = createRequire(join(process.cwd(), "package.json"));
export const FFMPEG: string = req("@ffmpeg-installer/ffmpeg").path;
export const FFPROBE: string = req("@ffprobe-installer/ffprobe").path;

const VERSION = 1;
export const FIXTURE_DIR = join(tmpdir(), `180-media-fixtures-v${VERSION}`);

export interface Fixture {
  name: string;
  path: string;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  /** 0 = no audio stream */
  channels: 0 | 1 | 2;
  /** Pauses in the "speech" (ms, source time) the fixture was built with. */
  pausesMs: Array<[number, number]>;
  /** Hard visual cuts built into the fixture (ms). */
  sceneCutsMs: number[];
}

/** Speech-like gated tone: on for `on` s, off for `off` s, repeating; returns the gate expression and the pauses. */
function gate(on: number, off: number, durationSec: number, leadSilence = 0): { expr: string; pausesMs: Array<[number, number]> } {
  const period = on + off;
  const expr = `if(lt(t,${leadSilence}),0,if(lt(mod(t-${leadSilence},${period}),${on}),1,0))`;
  const pausesMs: Array<[number, number]> = [];
  if (leadSilence > 0) pausesMs.push([0, leadSilence * 1000]);
  for (let t = leadSilence + on; t < durationSec; t += period) pausesMs.push([Math.round(t * 1000), Math.round(Math.min(durationSec, t + off) * 1000)]);
  return { expr, pausesMs };
}

interface Spec {
  name: string;
  w: number;
  h: number;
  fps: number;
  dur: number;
  video: string; // filter_complex producing [v]
  audio?: string; // filter_complex producing [a]
  channels: 0 | 1 | 2;
  pausesMs?: Array<[number, number]>;
  sceneCutsMs?: number[];
}

function specs(): Spec[] {
  const moving = (w: number, h: number, fps: number, d: number) => `testsrc2=s=${w}x${h}:r=${fps}:d=${d}`;
  const talk = gate(2.5, 1.2, 12, 0.8);
  const pauses = gate(3, 3, 15);
  const monoTalk = gate(2, 1, 6);
  const longTalk = gate(4, 1.5, 60);
  const voice = (expr: string, d: number, layout: "mono" | "stereo") =>
    `sine=f=220:sample_rate=48000:d=${d},volume='${expr}':eval=frame,volume=0.5${layout === "stereo" ? ",aformat=channel_layouts=stereo" : ""}[a]`;
  return [
    {
      name: "talking_9x16",
      w: 360, h: 640, fps: 30, dur: 12,
      video: `${moving(360, 640, 30, 12)},format=yuv420p[v]`,
      audio: voice(talk.expr, 12, "mono"),
      channels: 1,
      pausesMs: talk.pausesMs,
    },
    {
      name: "multiclip_16x9",
      w: 640, h: 360, fps: 30, dur: 9,
      // three visually distinct moving shots -> hard cuts at 3 s and 6 s
      video:
        `${moving(640, 360, 30, 3)},format=yuv420p[s0];` +
        `mandelbrot=s=640x360:r=30,trim=duration=3,format=yuv420p[s1];` +
        `${moving(640, 360, 30, 3)},negate,hue=h=120,format=yuv420p[s2];` +
        `[s0][s1][s2]concat=n=3:v=1:a=0,setsar=1[v]`,
      audio: `sine=f=330:sample_rate=48000:d=9,volume=0.4,aformat=channel_layouts=stereo[a]`,
      channels: 2,
      sceneCutsMs: [3000, 6000],
    },
    {
      name: "square_1x1",
      w: 480, h: 480, fps: 30, dur: 6,
      video: `${moving(480, 480, 30, 6)},format=yuv420p[v]`,
      audio: `sine=f=260:sample_rate=48000:d=6,volume=0.4[a]`,
      channels: 1,
    },
    { name: "no_audio", w: 640, h: 360, fps: 30, dur: 4, video: `${moving(640, 360, 30, 4)},format=yuv420p[v]`, channels: 0 },
    {
      name: "mono_speech",
      w: 640, h: 360, fps: 30, dur: 6,
      video: `${moving(640, 360, 30, 6)},format=yuv420p[v]`,
      audio: voice(monoTalk.expr, 6, "mono"),
      channels: 1,
      pausesMs: monoTalk.pausesMs,
    },
    {
      name: "stereo_music_bed",
      w: 640, h: 360, fps: 30, dur: 8,
      video: `${moving(640, 360, 30, 8)},format=yuv420p[v]`,
      // chord "music" + low noise bed, stereo
      audio:
        `sine=f=261.6:sample_rate=48000:d=8[m1];sine=f=329.6:sample_rate=48000:d=8[m2];sine=f=392:sample_rate=48000:d=8[m3];` +
        `anoisesrc=d=8:c=pink:r=48000:a=0.02[n];[m1][m2][m3][n]amix=inputs=4,volume=1.5,aformat=channel_layouts=stereo[a]`,
      channels: 2,
    },
    {
      name: "long_pauses",
      w: 640, h: 360, fps: 30, dur: 15,
      video: `${moving(640, 360, 30, 15)},format=yuv420p[v]`,
      audio: voice(pauses.expr, 15, "mono"),
      channels: 1,
      pausesMs: pauses.pausesMs,
    },
    {
      name: "short_1s5",
      w: 640, h: 360, fps: 30, dur: 1.5,
      video: `${moving(640, 360, 30, 1.5)},format=yuv420p[v]`,
      audio: `sine=f=300:sample_rate=48000:d=1.5,volume=0.4[a]`,
      channels: 1,
    },
    {
      name: "long_60s",
      w: 320, h: 180, fps: 15, dur: 60,
      video: `${moving(320, 180, 15, 60)},format=yuv420p[v]`,
      audio: voice(longTalk.expr, 60, "mono"),
      channels: 1,
      pausesMs: longTalk.pausesMs,
    },
  ];
}

function generate(s: Spec, out: string) {
  const graph = [s.video, s.audio].filter(Boolean).join(";");
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-filter_complex", graph, "-map", "[v]"];
  if (s.audio) args.push("-map", "[a]", "-c:a", "aac", "-b:a", "96k", "-ar", "48000", "-ac", String(s.channels));
  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-pix_fmt", "yuv420p", "-t", String(s.dur), "-movflags", "+faststart", out);
  const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`fixture ${s.name} failed: ${r.stderr}`);
}

/** Generates (or reuses) every fixture; returns them by name. */
export function ensureFixtures(names?: string[]): Record<string, Fixture> {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  const out: Record<string, Fixture> = {};
  for (const s of specs()) {
    if (names && !names.includes(s.name)) continue;
    const path = join(FIXTURE_DIR, `${s.name}.mp4`);
    if (!existsSync(path) || statSync(path).size === 0) generate(s, path);
    out[s.name] = {
      name: s.name, path, width: s.w, height: s.h, fps: s.fps, durationMs: Math.round(s.dur * 1000), channels: s.channels,
      pausesMs: s.pausesMs ?? [], sceneCutsMs: s.sceneCutsMs ?? [],
    };
  }
  return out;
}

export function ffprobeJson(file: string): { format?: any; streams?: any[] } {
  const r = spawnSync(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

/** What `start_media_analysis` returns: the kept report lines of one fixed FFmpeg run. */
export function runAnalysis(file: string, kind: AnalysisKind, sceneThreshold?: number): string {
  const r = spawnSync(FFMPEG, analysisArgs(kind, file, sceneThreshold), { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const report = filterReport(r.stderr);
  const noStream = /does not contain any stream|matches no streams/.test(report);
  if (r.status !== 0 && !noStream) throw new Error(`ffmpeg ${kind} failed: ${r.stderr.split("\n").slice(-3).join(" ")}`);
  return report;
}

/** detect_silences in media.rs (same filter). */
export function silencesMs(file: string, minMs = 500, noiseDb = -40): Array<[number, number]> {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", `silencedetect=noise=${noiseDb}dB:d=${(minMs / 1000).toFixed(3)}`, "-f", "null", "-"], { encoding: "utf8" });
  const out: Array<[number, number]> = [];
  let open: number | null = null;
  for (const line of r.stderr.split("\n")) {
    const s = /silence_start:\s*(-?[0-9.]+)/.exec(line);
    const e = /silence_end:\s*([0-9.]+)/.exec(line);
    if (s) open = Math.max(0, Math.round(parseFloat(s[1]) * 1000));
    if (e && open != null) {
      out.push([open, Math.round(parseFloat(e[1]) * 1000)]);
      open = null;
    }
  }
  const dur = parseDurationMs(r.stderr);
  if (open != null && dur && dur > open) out.push([open, dur]);
  return out;
}

