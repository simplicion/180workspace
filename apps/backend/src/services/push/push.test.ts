/**
 * Run: npx tsx --test --test-force-exit apps/backend/src/services/push/push.test.ts
 * Push module with a mocked FCM messaging client: typed PUSH_NOT_CONFIGURED, tenant + user scoped recipients,
 * dead-token cleanup, publish / reconnect / approval hooks with dedupe, status + test routes. No Redis, no DB.
 */
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://127.0.0.1:1';
process.env.DESKTOP_DEVICE_JWT_SECRET = 'unit-test-secret-unit-test-secret-1234';
for (const k of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) delete process.env[k];

import test, { afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import type { MulticastMessage } from './fcm-client';

// Loaded after the env above is in place (static imports are hoisted and would open the default local Redis).
let PushNotConfiguredError: typeof import('./fcm-client').PushNotConfiguredError;
let pushStatus: typeof import('./fcm-client').pushStatus;
let setMessagingClientForTest: typeof import('./fcm-client').setMessagingClientForTest;
let sendToUser: typeof import('./push.service').sendToUser;
let notifyUserSafe: typeof import('./push.service').notifyUserSafe;
let installSocialPushHooks: typeof import('./social-push-hooks').installSocialPushHooks;
let pushForPublishResult: typeof import('./social-push-hooks').pushForPublishResult;
let registerDevice: typeof import('../../api/v1/desktop/desktop-device').registerDevice;
let setDevicePushToken: typeof import('../../api/v1/desktop/desktop-device').setDevicePushToken;
let listDevices: typeof import('../../api/v1/desktop/desktop-device').listDevices;
let pushRoutes: any;
before(async () => {
  ({ PushNotConfiguredError, pushStatus, setMessagingClientForTest } = await import('./fcm-client'));
  ({ sendToUser, notifyUserSafe } = await import('./push.service'));
  ({ installSocialPushHooks, pushForPublishResult } = await import('./social-push-hooks'));
  ({ registerDevice, setDevicePushToken, listDevices } = await import('../../api/v1/desktop/desktop-device'));
  pushRoutes = (await import('./push.routes')).default;
});

class FakeMessaging {
  sent: MulticastMessage[] = [];
  dead = new Set<string>();
  async sendEachForMulticast(m: MulticastMessage) {
    this.sent.push(m);
    const responses = m.tokens.map((t) => (this.dead.has(t) ? { success: false, error: { code: 'messaging/registration-token-not-registered' } } : { success: true }));
    return { successCount: responses.filter((r) => r.success).length, failureCount: responses.filter((r) => !r.success).length, responses };
  }
}

afterEach(() => setMessagingClientForTest?.(null));

let seq = 0;
const tok = () => `fcm_${'t'.repeat(40)}_${Date.now()}_${seq++}`;
async function phone(companyId: string, userId: string) {
  const d = await registerDevice({ companyId, userId, platform: 'android', label: 'Pixel' });
  const token = tok();
  await setDevicePushToken({ companyId, userId, deviceId: d.deviceId, provider: 'fcm', token });
  return { deviceId: d.deviceId, token };
}

test('without Firebase env: typed PUSH_NOT_CONFIGURED, status lists missing vars, safe notify swallows', async () => {
  assert.deepEqual(pushStatus().missingEnv, ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']);
  assert.equal(pushStatus().configured, false);
  await assert.rejects(sendToUser('co', 'u', { kind: 'test', title: 't', body: 'b' }), (e: any) => e instanceof PushNotConfiguredError && e.code === 'PUSH_NOT_CONFIGURED');
  assert.equal(await notifyUserSafe('co', 'u', { kind: 'test', title: 't', body: 'b' }), null);
});

test('sends only to the target company + user devices, with deep link data; dead tokens are detached', async () => {
  const fake = new FakeMessaging();
  setMessagingClientForTest(fake);
  const mine = await phone('co-push', 'alice');
  const other = await phone('co-push', 'bob');
  const otherTenant = await phone('co-other', 'alice');

  const r = await sendToUser('co-push', 'alice', { kind: 'publish_succeeded', title: 'Published', body: 'Live', postId: 'p1', link: 'workspace180://posts/p1' });
  assert.equal(r.sent, 1);
  assert.deepEqual(fake.sent[0].tokens, [mine.token]);
  assert.ok(!fake.sent[0].tokens.includes(other.token) && !fake.sent[0].tokens.includes(otherTenant.token));
  assert.deepEqual(fake.sent[0].data, { kind: 'publish_succeeded', postId: 'p1', link: 'workspace180://posts/p1' });

  fake.dead.add(mine.token);
  const r2 = await sendToUser('co-push', 'alice', { kind: 'test', title: 't', body: 'b' });
  assert.equal(r2.removed, 1);
  assert.equal((await listDevices('co-push', 'alice')).find((d) => d.deviceId === mine.deviceId)?.push, undefined);
  assert.equal((await sendToUser('co-push', 'alice', { kind: 'test', title: 't', body: 'b' })).skipped, 'no_devices');
});

test('publish result → push decision (success, simulated label, final failure, retry pending, reconnect)', () => {
  const post = { id: 'p9', companyId: 'co', createdById: 'u1', projectId: 'pr', title: 'Launch', publishAttemptCount: 1 };
  const ok = pushForPublishResult({ status: 'published', post, publishedLinks: { instagram: 'x' }, variants: [] })!;
  assert.equal(ok.payload.kind, 'publish_succeeded');
  assert.equal(ok.payload.link, 'workspace180://posts/p9');
  assert.match(pushForPublishResult({ status: 'published', simulated: true, post, publishedLinks: {}, variants: [] })!.payload.title, /^\[Simulated\]/);
  assert.equal(pushForPublishResult({ status: 'failed', post, errors: { x: 'boom' }, variants: [] })!.payload.kind, 'publish_failed');
  assert.equal(pushForPublishResult({ status: 'failed', post, retryScheduledFor: new Date().toISOString(), variants: [] }), null, 'no push while a retry is pending');
  assert.equal(pushForPublishResult({ status: 'failed', post, variants: [{ platform: 'linkedin', errorCode: 'REAUTH_REQUIRED' }] })!.payload.kind, 'reconnect_needed');
  assert.equal(pushForPublishResult({ status: 'published', post: { ...post, createdById: null }, variants: [] }), null, 'system posts have nobody to notify');
});

test('hooks: summarize → one push per post/status/attempt; updatePost to in_review → owner gets approval push', async () => {
  const pushes: Array<{ companyId: string; userId: string; kind: string }> = [];
  const seen = new Set<string>();
  const post = { id: 'p1', companyId: 'co', createdById: 'author', projectId: 'pr1', title: 'Hello', publishAttemptCount: 1, status: 'in_review', versionNumber: 2 };
  const dispatcher = { summarize: async () => ({ status: 'published', post, publishedLinks: { threads: 'u' }, variants: [] }) };
  const postService = { updatePost: async (_id: string, _data: any, _uid?: string) => ({ ...post, reapprovalRequired: true }) };
  installSocialPushHooks({
    dispatcher,
    postService,
    loadProject: async (id, companyId) => (id === 'pr1' && companyId === 'co' ? { ownerId: 'owner' } : null),
    notify: async (companyId, userId, p) => void pushes.push({ companyId, userId, kind: p.kind }),
    claimOnce: async (k) => (seen.has(k) ? false : (seen.add(k), true)),
  });
  await dispatcher.summarize('p1', { companyId: 'co' });
  await dispatcher.summarize('p1', { companyId: 'co' }, 'note');
  await postService.updatePost('p1', { content: 'edit' }, 'author');
  await postService.updatePost('p1', { content: 'edit' }, 'owner'); // owner editing their own project: no self-push (and deduped)
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(pushes, [
    { companyId: 'co', userId: 'author', kind: 'publish_succeeded' },
    { companyId: 'co', userId: 'owner', kind: 'approval_requested' },
  ]);
});

test('routes: status never leaks credentials; test send answers 503 when unconfigured and 200 with a device', async () => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => ((req.user = { id: 'route-user', companyId: 'co-route' }), next()));
  app.use('/push', pushRoutes);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (p: string) => new Promise<{ status: number; json: any }>((resolve, reject) => {
    const req = http.request(base + p, { method: 'POST' }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode!, json: JSON.parse(b) }));
    });
    req.on('error', reject);
    req.end();
  });
  const get = (p: string) => new Promise<any>((resolve) => http.get(base + p, (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve(JSON.parse(b))); }));
  try {
    const st = await get('/push/status');
    assert.equal(st.configured, false);
    assert.ok(!JSON.stringify(st).includes('PRIVATE KEY'));
    assert.equal((await post('/push/test')).status, 503);

    setMessagingClientForTest(new FakeMessaging());
    assert.equal((await post('/push/test')).status, 404, 'no device yet');
    await phone('co-route', 'route-user');
    const ok = await post('/push/test');
    assert.equal(ok.status, 200);
    assert.equal(ok.json.sent, 1);
  } finally {
    server.close();
  }
});
