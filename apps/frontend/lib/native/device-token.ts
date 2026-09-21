/**
 * Desktop device token (client side of apps/backend/src/api/v1/desktop/desktop-device.ts).
 *
 * Only the desktop app registers a device. The token is stored per signed-in user (a different account on the same
 * machine gets its own device) and is sent on the server media routes. It is renewed before it expires WITHOUT using
 * another device slot (the stored deviceId is sent back).
 *
 * Storage is localStorage for now. Moving it to the OS keychain is planned (docs/offline-desktop/PRODUCTION_PLAN.md);
 * the token is revocable server-side, which limits what a leaked copy is worth.
 */

import { getSessionScope } from '@/lib/offline/session';

export const DEVICE_HEADER = 'x-desktop-device-token';
const KEY_PREFIX = '180_desktop_device_v1:';
const RENEW_BEFORE_MS = 3 * 24 * 60 * 60 * 1000;

export interface StoredDevice {
  token: string;
  deviceId: string;
  expiresAt: number;
}

const keyFor = (userId: string) => `${KEY_PREFIX}${userId}`;

export function loadStoredDevice(userId: string, now = Date.now()): StoredDevice | null {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDevice;
    return parsed?.token && parsed?.deviceId && Number.isFinite(parsed.expiresAt) ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredDevice(userId: string, d: StoredDevice) {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(d));
  } catch {
    /* storage blocked: the token just is not remembered across restarts */
  }
}

/** The token to send right now for the signed-in user, or null (not registered / expired). */
export function currentDeviceToken(now = Date.now()): string | null {
  if (typeof window === 'undefined') return null;
  const scope = getSessionScope();
  if (!scope) return null;
  const d = loadStoredDevice(scope.userId, now);
  return d && d.expiresAt > now ? d.token : null;
}

/** Media processing endpoints that require the device token. */
export function isMediaApiUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return /\/(media-editor|video-studio)\/(ai-direct|generate-from-prompt|render)(\/|$|\?)/.test(url) || /\/social-media\/posts\/sync-studio-render(\/|$|\?)/.test(url);
}

export type RegisterFn = (body: { label: string; platform: string; deviceId?: string }) => Promise<StoredDevice>;

/**
 * Makes sure the signed-in user has a valid device token, registering or renewing through `register`.
 * Returns the token, or null when it could not be obtained (never throws: media features that need the server
 * report that themselves).
 */
export async function ensureDeviceToken(register: RegisterFn, label: string, platform: string, now = Date.now()): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const scope = getSessionScope();
  if (!scope) return null;

  const stored = loadStoredDevice(scope.userId, now);
  if (stored && stored.expiresAt - now > RENEW_BEFORE_MS) return stored.token;

  try {
    const fresh = await register({ label, platform, deviceId: stored?.deviceId });
    saveStoredDevice(scope.userId, fresh);
    return fresh.token;
  } catch (err: any) {
    // A token that is still valid keeps working while renewal is retried later (offline, server restarting, ...).
    if (stored && stored.expiresAt > now) return stored.token;
    console.warn('[DesktopDevice] could not register this device:', err?.response?.data?.message || err?.message || err);
    return null;
  }
}
