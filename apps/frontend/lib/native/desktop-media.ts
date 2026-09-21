/**
 * Typed client for the desktop app's native media commands (apps/desktop-app/src-tauri/src/media.rs).
 *
 * Talks to Tauri through its injected IPC bridge, so no extra npm dependency is needed. Every function throws
 * `DesktopOnlyError` in a browser: media processing is a desktop-app feature (see DesktopOnlyGate).
 *
 * Paths are only ever obtained from the native pickers (`pickMediaFiles`, `pickExportPath`); the native side refuses
 * any other path, so this module intentionally has no way to pass an arbitrary one.
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

export interface EngineInfo {
  app_version: string;
  os: string;
  arch: string;
  /** First line of `ffmpeg -version`; null if the bundled FFmpeg could not run. */
  ffmpeg: string | null;
}

export type ExportPreset = 'source' | '1080p' | '720p';

export const desktopMedia = {
  /** Version info and whether the bundled FFmpeg is healthy. */
  engineInfo: () => getInvoke()<EngineInfo>('engine_info'),

  /** Opens the native file picker. Resolves to the chosen absolute paths (empty if cancelled). */
  pickMediaFiles: () => getInvoke()<string[]>('pick_media_files'),

  /** ffprobe report (`format` + `streams`) for a file returned by `pickMediaFiles`. */
  probeMedia: (path: string) => getInvoke()<{ format?: Record<string, any>; streams?: Record<string, any>[] }>('probe_media', { path }),

  /** Opens the native "save as" dialog. Resolves to the chosen path, or null if cancelled. */
  pickExportPath: (suggestedName?: string) => getInvoke()<string | null>('pick_export_path', { suggestedName }),

  /** Re-encodes a picked file to H.264/AAC MP4 at `output` (a path from `pickExportPath`). */
  transcodeMedia: (inputPath: string, outputPath: string, preset: ExportPreset = 'source') =>
    getInvoke()<string>('transcode_media', { inputPath, outputPath, preset }),
};
