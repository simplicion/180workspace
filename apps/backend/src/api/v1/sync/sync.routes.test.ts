/**
 * Integration test for POST /sync/push against a real Express server + real loopback replay.
 * Run: npx tsx --test --test-force-exit apps/backend/src/api/v1/sync/sync.routes.test.ts
 *
 * Redis is not required: the idempotency ledger falls back to process memory when it is unreachable.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import syncRoutes from './sync.routes';

const calls: { method: string; url: string; auth?: string; replay?: string; body: any }[] = [];
let baseUrl = '';
let server: http.Server;

// tenant-scoped prisma stub
const rows: Record<string, any> = {
  'exists-task-0001': { id: 'exists-task-0001', updatedAt: new Date('2026-09-20T10:00:00Z'), deletedAt: null },
};
const prismaStub = {
  task: { findFirst: async ({ where }: any) => (rows[where.id] && !rows[where.id].deletedAt ? rows[where.id] : null) },
  project: { findFirst: async () => null },
  client: { findFirst: async () => null },
};

before(async () => {
  const app = express();
  app.use(express.json());

  // stand-in for `protect`
  app.use('/api/sync', (req: any, res, next) => {
    if (req.headers.authorization !== 'Bearer valid') return res.status(401).json({ error: 'no' });
    req.user = { id: 'user-1', companyId: 'co-1', role: 'employee', roles: ['employee'] };
    req.prisma = prismaStub;
    next();
  }, syncRoutes);

  // stand-in REST routes the replay hits
  const record = (req: any) => calls.push({ method: req.method, url: req.originalUrl, auth: req.headers.authorization, replay: req.headers['x-sync-replay'], body: req.body });
  app.post('/api/tasks', (req, res) => {
    record(req);
    if (req.body?.title === 'forbidden') return res.status(403).json({ error: 'requireManager' });
    if (req.body?.title === 'boom') return res.status(500).json({ error: 'db down' });
    if (req.body?.title === '') return res.status(400).json({ error: 'title required' });
    res.status(201).json({ task: { id: 'srv-task-0001', title: req.body.title } });
  });
  app.put('/api/tasks/:id', (req, res) => { record(req); res.status(200).json({ id: req.params.id, ...req.body }); });
  app.delete('/api/tasks/:id', (req, res) => { record(req); res.status(200).json({ success: true }); });

  server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

let seq = 0;
const cmid = () => `cid_test_${Date.now()}_${seq++}`;
const push = (mutations: any[], token = 'valid') =>
  fetch(`${baseUrl}/api/sync/push`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations }),
  }).then(async (r) => ({ status: r.status, json: (await r.json()) as any }));

test('requires authentication', async () => {
  const r = await push([{ clientMutationId: cmid(), method: 'POST', path: '/api/tasks', body: { title: 'x' } }], 'bad');
  assert.equal(r.status, 401);
});

test('create is replayed through the real REST route with the caller token', async () => {
  calls.length = 0;
  const id = cmid();
  const r = await push([{ clientMutationId: id, method: 'POST', path: '/api/tasks', body: { title: 'Ship it' } }]);
  assert.equal(r.status, 200);
  assert.equal(r.json.results[0].status, 'applied');
  assert.equal(r.json.results[0].data.task.id, 'srv-task-0001');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].auth, 'Bearer valid');
  assert.equal(calls[0].replay, '1');
});

test('the same clientMutationId is applied exactly once', async () => {
  calls.length = 0;
  const id = cmid();
  const m = { clientMutationId: id, method: 'POST', path: '/api/tasks', body: { title: 'Once' } };
  const a = await push([m]);
  const b = await push([m]);
  assert.equal(a.json.results[0].status, 'applied');
  assert.equal(b.json.results[0].status, 'applied');
  assert.equal(b.json.results[0].replayed, true);
  assert.equal(calls.length, 1);
});

test('unsupported endpoints are rejected, never silently acknowledged', async () => {
  calls.length = 0;
  const r = await push([
    { clientMutationId: cmid(), method: 'POST', path: '/api/auth/register-user', body: { email: 'a@b.c', password: 'secret' } },
    { clientMutationId: cmid(), method: 'POST', path: '/api/tasks/../users', body: {} },
  ]);
  assert.equal(r.json.results[0].status, 'rejected');
  assert.equal(r.json.results[0].reason, 'unsupported_entity');
  assert.equal(r.json.results[1].status, 'rejected');
  assert.equal(calls.length, 0);
});

test('REST authorization failures surface as rejected (sync cannot exceed REST permissions)', async () => {
  const r = await push([{ clientMutationId: cmid(), method: 'POST', path: '/api/tasks', body: { title: 'forbidden' } }]);
  assert.equal(r.json.results[0].status, 'rejected');
  assert.equal(r.json.results[0].reason, 'forbidden');
});

test('validation errors are rejected with the server message', async () => {
  const r = await push([{ clientMutationId: cmid(), method: 'POST', path: '/api/tasks', body: { title: '' } }]);
  assert.equal(r.json.results[0].status, 'rejected');
  assert.match(r.json.results[0].message, /title required/);
});

test('a transient failure blocks the rest of the batch to preserve causal order, and is not recorded', async () => {
  calls.length = 0;
  const failing = cmid();
  const r = await push([
    { clientMutationId: failing, method: 'POST', path: '/api/tasks', body: { title: 'boom' } },
    { clientMutationId: cmid(), method: 'POST', path: '/api/tasks', body: { title: 'after' } },
  ]);
  assert.equal(r.json.results[0].status, 'retry');
  assert.equal(r.json.results[1].status, 'retry');
  assert.equal(r.json.results[1].reason, 'blocked_by_previous');
  assert.equal(calls.length, 1);
  // retrying the same id runs again (transient failures are not cached)
  calls.length = 0;
  await push([{ clientMutationId: failing, method: 'POST', path: '/api/tasks', body: { title: 'boom' } }]);
  assert.equal(calls.length, 1);
});

test('update of a row deleted remotely is a conflict; delete of a missing row is a success', async () => {
  calls.length = 0;
  const r = await push([
    { clientMutationId: cmid(), method: 'PUT', path: '/api/tasks/missing-task-0001', body: { title: 'x' } },
    { clientMutationId: cmid(), method: 'DELETE', path: '/api/tasks/missing-task-0002' },
  ]);
  assert.equal(r.json.results[0].status, 'conflict');
  assert.equal(r.json.results[0].reason, 'entity_not_found');
  assert.equal(r.json.results[1].status, 'applied');
  assert.equal(calls.length, 0);
});

test('stale-write guard: server changed after the offline edit began', async () => {
  calls.length = 0;
  const base = new Date('2026-09-19T00:00:00Z').getTime(); // older than the row's updatedAt
  const stale = await push([{ clientMutationId: cmid(), method: 'PUT', path: '/api/tasks/exists-task-0001', body: { title: 'mine' }, baseUpdatedAt: base }]);
  assert.equal(stale.json.results[0].status, 'conflict');
  assert.equal(stale.json.results[0].reason, 'stale_write');
  assert.equal(stale.json.results[0].serverEntity.id, 'exists-task-0001');
  assert.equal(calls.length, 0);

  // user chose "keep mine"
  const forced = await push([{ clientMutationId: cmid(), method: 'PUT', path: '/api/tasks/exists-task-0001', body: { title: 'mine' }, baseUpdatedAt: base, force: true }]);
  assert.equal(forced.json.results[0].status, 'applied');

  // an edit based on the current version is fine
  const fresh = await push([{ clientMutationId: cmid(), method: 'PUT', path: '/api/tasks/exists-task-0001', body: { title: 'ok' }, baseUpdatedAt: new Date('2026-09-20T10:00:00Z').getTime() }]);
  assert.equal(fresh.json.results[0].status, 'applied');
});

test('enforces batch size and shape', async () => {
  const many = Array.from({ length: 51 }, () => ({ clientMutationId: cmid(), method: 'POST', path: '/api/tasks', body: { title: 't' } }));
  assert.equal((await push(many)).status, 413);
  assert.equal((await push([])).status, 400);
  const bad = await push([{ method: 'POST', path: '/api/tasks', body: { title: 't' } }]);
  assert.equal(bad.json.results[0].status, 'rejected');
});
