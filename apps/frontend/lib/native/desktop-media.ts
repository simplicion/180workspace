/**
 * Typed client for the desktop app's native media commands (apps/desktop-app/src-tauri/src/media.rs and render.rs).
 *
 * Talks to Tauri through its injected IPC bridge, so no extra npm dependency is needed. Every function throws
 * `DesktopOnlyError` in a browser: media processing is a desktop-app feature (see DesktopOnlyGate).
 *
 * Paths are only ever obtained from the native pickers (`pickMediaFiles`, `pickExportPath`); the native side refuses
 * any other path, so this module intentionally has no way to pass an arbitrary one. FFmpeg arguments are never
 * accepted from here: renders are described by a validated filter graph plus a quality preset.
 */

import { isDesktopApp } from '@/lib/platform/desktop';

export class DesktopOnlyError extends Error {
  constructor(feature = 'This feature') {
    super(`${feature} is only available in the 180 Workspace desktop app.`);
    this.name = 'DesktopOnlyError';
  }
}

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

function getInvoke(): Invoke {
  const internals = typeof window !== 'undefined' ? (window as any).__TAURI_INTERNALS__ : undefined;
  if (!isDesktopApp() || typeof internals?.invoke !== 'function') throw new DesktopOnlyError('Media processing');
  return internals.invoke.bind(internals) as Invoke;
}

/** True only inside the desktop app with a working IPC bridge. */
export function hasNativeMedia(): boolean {
  const internals = typeof window !== 'undefined' ? (window as any).__TAURI_INTERNALS__ : undefined;
  return isDesktopApp() && typeof internals?.invoke === 'function';
}

export interface EngineInfo {
  app_version: string;
  os: string;
  arch: string;
  /** First line of `ffmpeg -version`; null if the bundled FFmpeg could not run. */
  ffmpeg: string | null;
}

export type ExportPreset = 'source' | '1080p' | '720p';
export type RenderQuality = 'draft' | 'balanced' | 'high';

export interface NativeRenderSpec {
  version: 1;
  inputs: string[];
  filterComplex: string;
  maps: string[];
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  quality: RenderQuality;
  hasAudio: boolean;
}

export interface RenderStatus {
  state: 'running' | 'done' | 'failed' | 'cancelled';
  /** 0..1 */
  progress: number;
  error: string | null;
  output: string | null;
}

// ── asset protocol (playback of picked files) ───────────────────────────────────

const ASSET_URL = /^(?:https?:\/\/asset\.localhost|asset:\/\/localhost)\/(.+)$/i;

/** Same scheme Tauri's `convertFileSrc` uses: Windows/Android serve assets from asset.localhost, others asset://localhost. */
export function toAssetUrl(nativePath: string, platform?: string): string {
  const encoded = encodeURIComponent(nativePath);
  const p = (platform ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')).toLowerCase();
  return p.includes('windows') || p.includes('android') ? `http://asset.localhost/${encoded}` : `asset://localhost/${encoded}`;
}

/** Inverse of `toAssetUrl`; null if the URL is not an asset URL (for example a blob: URL). */
export function fromAssetUrl(url: string): string | null {
  const m = ASSET_URL.exec(url);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

// ── commands ─────────────────────────────────────────────────────────────────

export const desktopMedia = {
  /** Version info and whether the bundled FFmpeg is healthy. */
  engineInfo: () => getInvoke()<EngineInfo>('engine_info'),

  /** Opens the native file picker. Resolves to the chosen absolute paths (empty if cancelled). */
  pickMediaFiles: () => getInvoke()<string[]>('pick_media_files'),

  /** Raw ffprobe report (`format` + `streams`) for a file returned by `pickMediaFiles`. */
  probeMedia: (path: string) => getInvoke()<{ format?: Record<string, any>; streams?: Record<string, any>[] }>('probe_media', { path }),

  /** Opens the native "save as" dialog. Resolves to the chosen path, or null if cancelled. */
  pickExportPath: (suggestedName?: string) => getInvoke()<string | null>('pick_export_path', { suggestedName }),

  /** Re-encodes a picked file to H.264/AAC MP4 at `output` (a path from `pickExportPath`). */
  transcodeMedia: (inputPath: string, outputPath: string, preset: ExportPreset = 'source') =>
    getInvoke()<string>('transcode_media', { inputPath, outputPath, preset }),

  /** Starts a timeline render; resolves to a job id for `renderStatus`. Rejects if the native validator refuses the spec. */
  startRender: (spec: NativeRenderSpec, outputPath: string) => getInvoke()<string>('render_timeline', { spec, outputPath }),
  renderStatus: (jobId: string) => getInvoke()<RenderStatus>('render_status', { jobId }),
  cancelRender: (jobId: string) => getInvoke()<void>('cancel_render', { jobId }),
};

export class RenderCancelledError extends Error {
  constructor() {
    super('Export cancelled');
    this.name = 'RenderCancelledError';
  }
}

/**
 * Runs a render to completion, reporting progress (0-100) and honouring an AbortSignal (which cancels the FFmpeg job and
 * removes the partial file). Resolves to the output path, rejects with the FFmpeg error text on failure.
 */
export async function runNativeRender(
  spec: NativeRenderSpec,
  outputPath: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
  pollMs = 400
): Promise<string> {
  const jobId = await desktopMedia.startRender(spec, outputPath);
  let aborted = false;
  const onAbort = () => {
    aborted = true;
    desktopMedia.cancelRender(jobId).catch(() => {});
  };
  if (signal?.aborted) onAbort();
  else signal?.addEventListener('abort', onAbort, { once: true });

  try {
    for (;;) {
      const status = await desktopMedia.renderStatus(jobId);
      onProgress(Math.round(status.progress * 100));
      if (status.state === 'done') return status.output || outputPath;
      if (status.state === 'failed') throw new Error(status.error || 'The export failed.');
      if (status.state === 'cancelled' || aborted) throw new RenderCancelledError();
      await new Promise((r) => setTimeout(r, pollMs));
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}
