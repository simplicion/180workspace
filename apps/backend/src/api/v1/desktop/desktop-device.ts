/**
 * Desktop device tokens: entitlement, limit and audit for the desktop-only media routes.
 *
 * The desktop app registers itself once per install (while the user is signed in) and receives a per-device, expiring,
 * revocable token. Server media routes (`/media-editor/render`, `/ai-direct`, ...) require it, so:
 *   - a lost or stolen laptop can be revoked without touching the user's password or other devices;
 *   - a user can only have a bounded number of devices (MAX_DEVICES_PER_USER);
 *   - every use is attributable to a device.
 *
 * WHAT THIS IS NOT: proof that the caller is the genuine desktop app. A device token is issued to anyone who is signed
 * in and calls `register`, so a determined user can register from a script. Real attestation needs an OS-level signal
 * (a signed binary plus platform attestation) and is out of scope. This is a control, not a lock.
 *
 * Rollout switch DESKTOP_DEVICE_ENFORCEMENT: `off` (default; nothing changes) -> `report` (log what would be rejected)
 * -> `enforce` (reject). Turn it on only after the desktop app that registers devices has shipped.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { redis } from '../../../system-configs/config/redis';

export const MAX_DEVICES_PER_USER = 5;
export const DEVICE_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const DEVICE_HEADER = 'x-desktop-device-token';

export type EnforcementMode = 'off' | 'report' | 'enforce';

export function enforcementMode(): EnforcementMode {
  const v = (process.env.DESKTOP_DEVICE_ENFORCEMENT || 'off').toLowerCase();
  return v === 'enforce' || v === 'report' ? v : 'off';
}

/** No fallback: a missing secret must be a loud failure, never a guessable default. */
function secret(): string {
  const s = process.env.DESKTOP_DEVICE_JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('DESKTOP_DEVICE_JWT_SECRET must be set (at least 32 characters) to use desktop device tokens.');
  }
  return s;
}

export interface DeviceRecord {
  deviceId: string;
  label: string;
  createdAt: number;
  lastSeenAt: number;
  platform?: string;
}

// ── registry (Redis; process memory only outside production) ─────────────────────────────────────────────────

const memory = new Map<string, Map<string, DeviceRecord>>();
const registryKey = (companyId: string, userId: string) => `desktop:devices:v1:${companyId}:${userId}`;

class RegistryUnavailable extends Error {}

async function withRegistry<T>(redisOp: () => Promise<T>, memoryOp: () => T): Promise<T> {
  if (redis) {
    try {
      return await redisOp();
    } catch (err) {
      if (process.env.NODE_ENV === 'production') throw new RegistryUnavailable((err as Error).message);
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new RegistryUnavailable('Redis is not configured');
  }
  return memoryOp();
}

export async function listDevices(companyId: string, userId: string): Promise<DeviceRecord[]> {
  const rows = await withRegistry(
    async () => Object.values(await redis!.hgetall(registryKey(companyId, userId))).map((s) => JSON.parse(s) as DeviceRecord),
    () => [...(memory.get(registryKey(companyId, userId))?.values() ?? [])]
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

async function saveDevice(companyId: string, userId: string, d: DeviceRecord) {
  await withRegistry(
    async () => {
      await redis!.hset(registryKey(companyId, userId), d.deviceId, JSON.stringify(d));
    },
    () => {
      const key = registryKey(companyId, userId);
      if (!memory.has(key)) memory.set(key, new Map());
      memory.get(key)!.set(d.deviceId, d);
    }
  );
}

export async function revokeDevice(companyId: string, userId: string, deviceId: string): Promise<boolean> {
  return withRegistry(
    async () => (await redis!.hdel(registryKey(companyId, userId), deviceId)) > 0,
    () => memory.get(registryKey(companyId, userId))?.delete(deviceId) ?? false
  );
}

async function findDevice(companyId: string, userId: string, deviceId: string): Promise<DeviceRecord | null> {
  return withRegistry(
    async () => {
      const raw = await redis!.hget(registryKey(companyId, userId), deviceId);
      return raw ? (JSON.parse(raw) as DeviceRecord) : null;
    },
    () => memory.get(registryKey(companyId, userId))?.get(deviceId) ?? null
  );
}

// ── registration ─────────────────────────────────────────────────────────────────────────────────────────────

export class DeviceLimitError extends Error {}

function signToken(companyId: string, userId: string, deviceId: string) {
  return jwt.sign({ typ: 'desktop-device', cid: companyId, did: deviceId }, secret(), {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: DEVICE_TOKEN_TTL_SECONDS,
  });
}

/**
 * Registers a new device, or - when `deviceId` names a device this user already has - RENEWS it: a fresh token for the
 * same device that does not use up another slot. Tokens last 30 days, so without this every renewal would consume one of
 * the MAX_DEVICES_PER_USER slots. A revoked device cannot be renewed (it must be registered again, as a new device).
 */
export async function registerDevice(params: { companyId: string; userId: string; label?: string; platform?: string; deviceId?: string }) {
  const now = Date.now();
  if (params.deviceId) {
    const current = await findDevice(params.companyId, params.userId, params.deviceId);
    if (current) {
      await saveDevice(params.companyId, params.userId, { ...current, lastSeenAt: now });
      return { deviceId: current.deviceId, token: signToken(params.companyId, params.userId, current.deviceId), label: current.label, expiresAt: now + DEVICE_TOKEN_TTL_SECONDS * 1000, renewed: true };
    }
    // unknown / revoked device id: fall through and register a brand new device
  }

  const existing = await listDevices(params.companyId, params.userId);
  if (existing.length >= MAX_DEVICES_PER_USER) {
    throw new DeviceLimitError(`You can register at most ${MAX_DEVICES_PER_USER} devices. Remove one first.`);
  }
  const deviceId = crypto.randomUUID();
  const label = (params.label || 'Desktop app').replace(/[^\w .\-()]/g, '').slice(0, 60) || 'Desktop app';
  await saveDevice(params.companyId, params.userId, { deviceId, label, createdAt: now, lastSeenAt: now, platform: params.platform?.slice(0, 20) });

  const token = signToken(params.companyId, params.userId, deviceId);
  return { deviceId, token, label, expiresAt: now + DEVICE_TOKEN_TTL_SECONDS * 1000, renewed: false };
}

// ── verification ────────────────────────────────────────────────────────────────────────────────────────────

export interface DeviceClaims {
  userId: string;
  companyId: string;
  deviceId: string;
}

export function verifyDeviceToken(token: string): DeviceClaims {
  const payload = jwt.verify(token, secret(), { algorithms: ['HS256'] }) as jwt.JwtPayload;
  if (payload.typ !== 'desktop-device' || !payload.sub || !payload.cid || !payload.did) {
    throw new Error('not a desktop device token');
  }
  return { userId: String(payload.sub), companyId: String(payload.cid), deviceId: String(payload.did) };
}

/** Full check for a request: valid signature and expiry, belongs to THIS user and company, and not revoked. */
export async function checkRequestDevice(req: Request): Promise<{ ok: true; deviceId: string } | { ok: false; reason: string }> {
  const raw = req.headers[DEVICE_HEADER];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (!token) return { ok: false, reason: 'missing_token' };

  let claims: DeviceClaims;
  try {
    claims = verifyDeviceToken(token);
  } catch (err: any) {
    // A missing server secret is a deployment error, not the caller's fault: surface it distinctly.
    return { ok: false, reason: /DESKTOP_DEVICE_JWT_SECRET/.test(err?.message) ? 'server_misconfigured' : 'invalid_token' };
  }

  const user = (req as any).user;
  if (!user?.id || claims.userId !== user.id || claims.companyId !== user.companyId) return { ok: false, reason: 'wrong_user' };

  let device: DeviceRecord | null = null;
  try {
    device = await findDevice(claims.companyId, claims.userId, claims.deviceId);
  } catch (err) {
    // Registry outage: fail open for verification (the signature and expiry above are still enforced). Registration
    // is the strict path; a Redis blip must not take video editing down for everyone.
    console.error('[DesktopDevice] registry unavailable, skipping revocation check:', (err as Error).message);
    return { ok: true, deviceId: claims.deviceId };
  }
  if (!device) return { ok: false, reason: 'revoked' };
  return { ok: true, deviceId: claims.deviceId };
}

/** Express middleware. Mount AFTER `protect` (it needs req.user). */
export async function requireDesktopDevice(req: Request, res: Response, next: NextFunction) {
  const mode = enforcementMode();
  if (mode === 'off') return next();

  const result = await checkRequestDevice(req);
  if (result.ok) {
    (req as any).desktopDeviceId = result.deviceId;
    return next();
  }

  if (mode === 'report') {
    console.warn(`[DesktopDevice] would reject ${req.method} ${req.originalUrl} (${result.reason}) user=${(req as any).user?.id}`);
    return next();
  }

  if (result.reason === 'server_misconfigured') {
    return res.status(503).json({ success: false, error: 'DESKTOP_DEVICE_UNAVAILABLE', message: 'Desktop device verification is not configured on the server.' });
  }
  return res.status(403).json({
    success: false,
    error: 'DESKTOP_APP_REQUIRED',
    reason: result.reason,
    message: 'This feature is only available from the 180 Workspace desktop app. Install it, sign in, and try again.',
  });
}
