/**
 * Single source of truth for "am I running inside the 180 Workspace desktop app?" and for where to get it.
 *
 * Detection (any one is enough):
 *  - `window.__180_NATIVE__`      injected by the desktop shell (Tauri initialization script / legacy WebView2 launcher)
 *  - `window.__TAURI_INTERNALS__` injected by Tauri itself
 *  - `tauri:` / `workspace180:` protocol
 *
 * This is a PRODUCT gate ("this feature needs the app"), not a security boundary — a determined user can fake the
 * globals in a browser. Anything that must be enforced (licensing, cost) has to be enforced server-side.
 */

export type ClientOS = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web';

export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return (
    '__180_NATIVE__' in w ||
    '__TAURI_INTERNALS__' in w ||
    window.location.protocol === 'tauri:' ||
    window.location.protocol === 'workspace180:'
  );
}

export function detectOS(): ClientOS {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'web';
}

/** Desktop installers exist for these; phones/tablets and unknown UAs get the Windows link as a sensible default. */
export function desktopPlatformFor(os: ClientOS = detectOS()): 'windows' | 'mac' | 'linux' {
  if (os === 'macos') return 'mac';
  if (os === 'linux') return 'linux';
  return 'windows';
}

export function desktopDownloadUrl(os: ClientOS = detectOS()): string {
  return `/api/download/${desktopPlatformFor(os)}`;
}

export function desktopPlatformLabel(os: ClientOS = detectOS()): string {
  const p = desktopPlatformFor(os);
  return p === 'mac' ? 'macOS' : p === 'linux' ? 'Linux' : 'Windows';
}

/** Deep link that opens the installed desktop app at a route, e.g. `workspace180://media-editor`. */
export function desktopDeepLink(path = ''): string {
  return `workspace180://${path.replace(/^\/+/, '')}`;
}
