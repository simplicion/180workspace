/**
 * Run: npx tsx --test --test-force-exit apps/backend/src/api/v1/identity/auth/refresh-rotation.test.ts
 * Refresh-token rotation, reuse detection, family logout, missing-secret handling and push-token cleanup on logout.
 * Redis is pointed at a closed port, so the revocation store and device registry use process memory (NODE_ENV=test).
 */
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://127.0.0.1:1';
process.env.JWT_SECRET = 'unit-test-access-secret-unit-test-access';
process.env.JWT_REFRESH_SECRET = 'unit-test-refresh-secret-unit-test-refresh';
process.env.DESKTOP_DEVICE_JWT_SECRET = 'unit-test-secret-unit-test-secret-1234';

import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import jwt from 'jsonwebtoken';

let server: http.Server;
let base = '';
let signRefreshToken: (u: string, c: string, f?: string) => string;
let device: typeof import('../../desktop/desktop-device');

before(async () => {
  const { AuthService } = await import('@workspace/identity');
  // Stand-in for the DB lookup: any token that verifies belongs to an active user of its company.
  (AuthService as any).refreshToken = async (t: string) => {
    let d: any;
    try {
      d = jwt.verify(t, process.env.JWT_REFRESH_SECRET!);
    } catch {
      const e: any = new Error('Invalid or expired refresh token');
      e.status = 401;
      throw e;
    }
    return { token: 'access', user: { id: d.id, companyId: d.companyId, isActive: true }, company: { id: d.companyId } };
  };
  ({ signRefreshToken } = await import('../../../../system-configs/middleware/auth/auth'));
  device = await import('../../desktop/desktop-device');
  const { AuthController } = await import('./auth.controller');

  const app = express();
  app.use(express.json());
  app.post('/api/auth/refresh', AuthController.refreshToken);
  app.post('/api/auth/logout', AuthController.logout);
  app.use((err: any, _req: any, res: any, _next: any) => res.status(err.status || 500).json({ error: err.message }));
  server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

beforeEach(() => {
  process.env.JWT_REFRESH_SECRET = 'unit-test-refresh-secret-unit-test-refresh';
  process.env.REFRESH_TOKEN_REUSE_GRACE_SECONDS = '0';
});

const post = (path: string, body: any, headers: Record<string, string> = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, json: (await r.json()) as any }));
const refresh = (refreshToken: string) => post('/api/auth/refresh', { refreshToken });
const sidOf = (t: string) => (jwt.decode(t) as any).sid;

let seq = 0;
const login = () => signRefreshToken(`user-${Date.now()}-${seq++}`, 'co-1');

test('refresh rotates: same response shape, new token in the same session family', async () => {
  const t0 = login();
  const r = await refresh(t0);
  assert.equal(r.status, 200);
  for (const k of ['token', 'accessToken', 'refreshToken', 'tokenType', 'expiresIn']) assert.ok(k in r.json, k);
  assert.notEqual(r.json.refreshToken, t0);
  assert.equal(sidOf(r.json.refreshToken), sidOf(t0));
});

test('reusing a rotated token revokes the whole family (attacker and user are both signed out)', async () => {
  const t0 = login();
  const t1 = (await refresh(t0)).json.refreshToken;
  const replay = await refresh(t0);
  assert.equal(replay.status, 401);
  assert.equal(replay.json.code, 'REFRESH_TOKEN_REUSED');
  const legit = await refresh(t1);
  assert.equal(legit.status, 401, 'the newest token of the family is dead too');
  assert.equal(legit.json.code, 'REFRESH_TOKEN_REVOKED');
});

test('within the grace window a just-rotated token may be used again (concurrent tabs), staying in its family', async () => {
  process.env.REFRESH_TOKEN_REUSE_GRACE_SECONDS = '30';
  const t0 = login();
  const a = await refresh(t0);
  const b = await refresh(t0);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(sidOf(b.json.refreshToken), sidOf(t0));
  assert.equal((await refresh(b.json.refreshToken)).status, 200);
});

test('a legacy token without a family id works once, then gets a family; replaying it is detected', async () => {
  const legacy = jwt.sign({ id: `legacy-${seq++}`, companyId: 'co-1' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  const r = await refresh(legacy);
  assert.equal(r.status, 200);
  assert.match(sidOf(r.json.refreshToken), /^[0-9a-f-]{36}$/);
  assert.equal((await refresh(legacy)).json.code, 'REFRESH_TOKEN_REUSED');
  assert.equal((await refresh(r.json.refreshToken)).status, 401, 'the family it was rotated into is revoked');
});

test('logout revokes the family: every token rotated from that sign-in stops working', async () => {
  process.env.REFRESH_TOKEN_REUSE_GRACE_SECONDS = '30';
  const t0 = login();
  const t1 = (await refresh(t0)).json.refreshToken;
  const out = await post('/api/auth/logout', { refreshToken: t0 });
  assert.equal(out.status, 200);
  assert.equal(out.json.refreshTokenRevoked, true);
  const after1 = await refresh(t1);
  assert.equal(after1.status, 401);
  assert.equal(after1.json.code, 'REFRESH_TOKEN_REVOKED');
});

test('logout of a rotated legacy token also ends the family it was rotated into', async () => {
  process.env.REFRESH_TOKEN_REUSE_GRACE_SECONDS = '30';
  const legacy = jwt.sign({ id: `legacy-${seq++}`, companyId: 'co-1' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  const next = (await refresh(legacy)).json.refreshToken;
  assert.equal((await post('/api/auth/logout', { refreshToken: legacy })).status, 200);
  assert.equal((await refresh(next)).status, 401);
});

test('missing JWT_REFRESH_SECRET fails loudly (500 config error), never "token invalid"', async () => {
  const t = login();
  delete process.env.JWT_REFRESH_SECRET;
  const out = await post('/api/auth/logout', { refreshToken: t });
  assert.equal(out.status, 500);
  assert.equal(out.json.code, 'AUTH_CONFIG_ERROR');
  assert.equal(out.json.refreshTokenRevoked, undefined);
  const r = await refresh(t);
  assert.equal(r.status, 500);
  assert.equal(r.json.code, 'AUTH_CONFIG_ERROR');
});

test('an invalid token on logout is still a successful local sign-out', async () => {
  const out = await post('/api/auth/logout', { refreshToken: 'not-a-jwt' });
  assert.equal(out.status, 200);
  assert.equal(out.json.reason, 'token_invalid_or_expired');
});

test("logout clears the signing-out device's push token (by deviceId or device token header), only for that user", async () => {
  const userId = `push-user-${seq++}`;
  const t = signRefreshToken(userId, 'co-1');
  const d1 = await device.registerDevice({ companyId: 'co-1', userId, platform: 'android' });
  const d2 = await device.registerDevice({ companyId: 'co-1', userId, platform: 'ios' });
  await device.setDevicePushToken({ companyId: 'co-1', userId, deviceId: d1.deviceId, provider: 'fcm', token: `fcm-${'a'.repeat(40)}-${seq}` });
  await device.setDevicePushToken({ companyId: 'co-1', userId, deviceId: d2.deviceId, provider: 'apns', token: `apns-${'b'.repeat(40)}-${seq}` });

  assert.equal((await post('/api/auth/logout', { refreshToken: t }, { 'x-device-token': d1.token })).status, 200);
  let devices = await device.listDevices('co-1', userId);
  assert.equal(devices.find((d) => d.deviceId === d1.deviceId)!.push, undefined);
  assert.ok(devices.find((d) => d.deviceId === d2.deviceId)!.push, 'other devices keep their push token');

  const t2 = signRefreshToken(userId, 'co-1');
  assert.equal((await post('/api/auth/logout', { refreshToken: t2, deviceId: d2.deviceId })).status, 200);
  devices = await device.listDevices('co-1', userId);
  assert.equal(devices.find((d) => d.deviceId === d2.deviceId)!.push, undefined);
});
