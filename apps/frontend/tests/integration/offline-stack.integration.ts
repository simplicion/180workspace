/**
 * Offline client stack — integration test (real outbox / coalescing / id remap / sync engine / axios interceptors
 * against an in-memory IndexedDB, with the server replaced by a stub axios adapter).
 *
 * Not part of the jest run (no *.test.* suffix) because it needs an IndexedDB implementation that is not a repo
 * dependency yet. To run it:
 *   pnpm --filter frontend add -D fake-indexeddb      # commit the lockfile change
 *   cd apps/frontend && npx tsx --tsconfig tsconfig.json tests/integration/offline-stack.integration.ts
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('fake-indexeddb/auto');
import assert from 'node:assert/strict';

// ── browser-ish globals ─────────────────────────────────────────────────────
const g: any = globalThis;
g.window = g;
g.addEventListener = () => {};
g.dispatchEvent = () => true;
g.CustomEvent = class { constructor(public type: string, public init?: any) {} };
const store: Record<string, string> = {};
g.localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v), removeItem: (k: string) => delete store[k] };
g.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
g.document = {
  cookie: '',
  visibilityState: 'visible',
  addEventListener: () => {},
  createElement: () => ({ style: {}, firstChild: { data: '' }, setAttribute() {}, appendChild() {} }),
  createTextNode: () => ({}),
  querySelector: () => null,
  head: { appendChild: (n: any) => n },
};
g.location = { hostname: 'localhost', pathname: '/dashboard', protocol: 'http:', origin: 'http://localhost', href: '' };
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
const tokenFor = (id: string, companyId = 'c1') => `${b64({ alg: 'none' })}.${b64({ id, companyId })}.sig`;
const login = (id: string) => (store['platform_auth_token'] = tokenFor(id));

let passed = 0;
const results: string[] = [];
async function t(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    results.push(`  ✔ ${name}`);
  } catch (e: any) {
    results.push(`  ✘ ${name}\n      ${e?.stack?.split('\n').slice(0, 4).join('\n      ')}`);
    process.exitCode = 1;
  }
}

async function main() {
  // ── v1 database with legacy rows, created BEFORE the app code opens v2 ────────
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.open('180Workspace_OfflineDB_v1', 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      const e = db.createObjectStore('entities', { keyPath: 'id' });
      e.createIndex('by_entityType', 'entityType');
      const o = db.createObjectStore('mutations_outbox', { keyPath: 'id' });
      o.createIndex('by_createdAt', 'createdAt');
      o.createIndex('by_status', 'status');
      o.createIndex('by_entityType', 'entityType');
      o.createIndex('by_clientMutationId', 'clientMutationId', { unique: true });
      db.createObjectStore('sync_metadata', { keyPath: 'key' });
      e.put({ id: 'task:old', entityType: 'task', entityId: 'old', data: { id: 'old', title: 'from someone' } });
      o.put({ id: 'legacy1', clientMutationId: 'cid_legacy', entityType: 'lead', entityId: 'x', action: 'CREATE', endpoint: '/api/leads', method: 'POST', payload: { name: 'L' }, createdAt: 1, retryCount: 0, status: 'queued' });
    };
    r.onsuccess = () => {
      r.result.close();
      resolve();
    };
    r.onerror = () => reject(r.error);
  });

  login('u1');
  const outbox = await import('@/lib/offline/outbox');
  const db = await import('@/lib/offline/db');
  const { queueOfflineWrite } = await import('@/lib/offline/offline-write');
  const httpCache = await import('@/lib/offline/http-cache');
  const purge = await import('@/lib/offline/purge');

  await t('v1 -> v2 migration quarantines legacy outbox rows and drops unscoped legacy entities', async () => {
    await db.getOfflineDB();
    const attention = await outbox.getAttentionMutations();
    assert.equal(attention.length, 1);
    assert.equal(attention[0].id, 'legacy1');
    assert.equal(attention[0].status, 'conflict');
    assert.equal(attention[0].lastReason, 'legacy');
    assert.equal((await outbox.getPendingMutations()).length, 0, 'legacy row must not be auto-replayed');
    assert.equal(await outbox.getLocalEntity('task', 'old'), null);
  });

  await t('offline CREATE: optimistic entity + queued mutation, no id sent to the server, REST-shaped envelope', async () => {
    const res = await queueOfflineWrite('POST', '/api/tasks', JSON.stringify({ title: 'Write docs', id: 'client-chosen' }), { assignee: { id: 'a1', name: 'Ann' } });
    assert.ok(res);
    assert.equal(res!.data.success, true);
    assert.ok(res!.data.task.id.startsWith('temp_'));
    assert.equal(res!.data.task.assignee.name, 'Ann');
    const pending = await outbox.getPendingMutations();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].payload.id, undefined, 'client-chosen id must be stripped from the CREATE payload');
    assert.equal(pending[0].userId, 'u1');
    assert.equal((await outbox.getLocalEntity('task', pending[0].entityId)).title, 'Write docs');
  });

  await t('offline UPDATE of the not-yet-synced entity merges into the pending CREATE (queue stays at 1)', async () => {
    const [create] = await outbox.getPendingMutations();
    const res = await queueOfflineWrite('PUT', `/api/tasks/${create.entityId}`, { title: 'Write better docs' });
    assert.ok(res);
    const pending = await outbox.getPendingMutations();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].action, 'CREATE');
    assert.equal(pending[0].payload.title, 'Write better docs');
  });

  await t('non-queueable writes are refused (returns null)', async () => {
    assert.equal(await queueOfflineWrite('POST', '/api/auth/register-user', { password: 'x' }), null);
    assert.equal(await queueOfflineWrite('PUT', '/api/users/abcdefgh1', { a: 1 }), null);
  });

  await t('user scoping: another user never sees or shares the queue', async () => {
    login('u2');
    assert.equal((await outbox.getPendingMutations()).length, 0);
    assert.equal((await outbox.getAttentionMutations()).length, 1, 'legacy quarantine is visible to any user, by design');
    await queueOfflineWrite('POST', '/api/tasks', { title: 'u2 task' });
    assert.equal((await outbox.getPendingMutations()).length, 1);
    login('u1');
    const mine = await outbox.getPendingMutations();
    assert.equal(mine.length, 1);
    assert.equal(mine[0].payload.title, 'Write better docs');
    login('u2');
    await outbox.discardMutation((await outbox.getPendingMutations())[0].id);
    login('u1');
  });

  await t('delete of a never-synced entity cancels it completely (create + edits vanish, nothing sent)', async () => {
    const [create] = await outbox.getPendingMutations();
    await queueOfflineWrite('DELETE', `/api/tasks/${create.entityId}`, undefined);
    assert.equal((await outbox.getPendingMutations()).length, 0);
    assert.equal(await outbox.getLocalEntity('task', create.entityId), null);
  });

  await t('remapTempId rewrites dependent queued mutations (path and payload references)', async () => {
    const p = await queueOfflineWrite('POST', '/api/projects', { name: 'Proj' });
    const projTemp = p!.data.project.id;
    await queueOfflineWrite('POST', '/api/tasks', { title: 'In proj', projectId: projTemp });
    await queueOfflineWrite('PUT', `/api/projects/${projTemp}`, { name: 'Proj 2' }); // merges into project CREATE
    await outbox.remapTempId(projTemp, 'proj-real-1');
    const pending = await outbox.getPendingMutations();
    const task = pending.find((m) => m.entityType === 'task')!;
    assert.equal(task.payload.projectId, 'proj-real-1');
    assert.equal(await outbox.lookupRealId(projTemp), 'proj-real-1');
    for (const m of pending) await outbox.removeMutation(m.id);
  });

  await t('bulkUpsertSynced never overwrites unsynced local work; bulkDeleteSynced spares it too', async () => {
    await outbox.saveLocalEntity('task', 't-local', { id: 't-local', title: 'MINE', updatedAt: '2026-09-01T00:00:00Z' }, 'pending_sync');
    await outbox.saveLocalEntity('task', 't-synced', { id: 't-synced', title: 'old' }, 'synced');
    const written = await outbox.bulkUpsertSynced('task', [
      { id: 't-local', title: 'SERVER', updatedAt: '2026-09-20T00:00:00Z' },
      { id: 't-synced', title: 'fresh', updatedAt: '2026-09-20T00:00:00Z' },
    ]);
    assert.equal(written, 1);
    assert.equal((await outbox.getLocalEntity('task', 't-local')).title, 'MINE');
    const rec = await outbox.getLocalEntityRecord('task', 't-synced');
    assert.equal(rec!.data.title, 'fresh');
    assert.equal(rec!.serverUpdatedAt, Date.parse('2026-09-20T00:00:00Z'));
    await outbox.bulkDeleteSynced('task', ['t-local', 't-synced']);
    assert.ok(await outbox.getLocalEntity('task', 't-local'), 'pending local entity survives a tombstone');
    assert.equal(await outbox.getLocalEntity('task', 't-synced'), null);
  });

  await t('http cache: per-user, round-trips, purge on sign-out keeps the outbox', async () => {
    await httpCache.cachePut('/api/tasks?b=2&a=1', null, { tasks: [{ id: 'x' }] });
    assert.deepEqual((await httpCache.cacheGet('/api/tasks', { a: 1, b: 2 }))?.data, { tasks: [{ id: 'x' }] });
    login('u2');
    assert.equal(await httpCache.cacheGet('/api/tasks', { a: 1, b: 2 }), null, 'other user must not read it');
    login('u1');
    await queueOfflineWrite('POST', '/api/tasks', { title: 'survives sign-out' });
    await purge.purgeSessionData({ userId: 'u1', companyId: 'c1' });
    assert.equal(await httpCache.cacheGet('/api/tasks', { a: 1, b: 2 }), null);
    assert.equal(await outbox.getLocalEntity('task', 't-synced'), null);
    assert.equal((await outbox.getPendingMutations()).length, 1, 'unsynced work is kept');
    for (const m of await outbox.getPendingMutations()) await outbox.removeMutation(m.id);
  });

  // ── full client stack through axios + sync engine, server stubbed by an adapter ──
  const axios: any = require('axios');
  const { default: api } = await import('@/lib/api');
  const { syncEngine } = await import('@/lib/offline/sync-engine');

  type Handler = (config: any) => { status: number; data: any } | 'network-error';
  let handler: Handler = () => 'network-error';
  const seen: any[] = [];
  const serverRows: any[] = []; // what the (stubbed) server would return from /sync/pull
  (api as any).defaults.adapter = async (config: any) => {
    seen.push({ method: config.method, url: config.url, data: config.data ? JSON.parse(config.data) : undefined });
    const r = handler(config);
    if (r === 'network-error') throw new axios.AxiosError('Network Error', 'ERR_NETWORK', config);
    const response = { data: r.data, status: r.status, statusText: String(r.status), headers: {}, config, request: {} };
    if (r.status >= 400) throw new axios.AxiosError(`HTTP ${r.status}`, 'ERR_BAD_REQUEST', config, {}, response);
    return response;
  };

  const drain = async () => {
    (syncEngine as any).isOnline = true;
    await syncEngine.drainOutbox();
  };
  const pushed = () => seen.filter((s) => s.url.includes('/sync/push'));

  await t('axios interceptor: offline create is queued and resolves with an optimistic 200 (not an error)', async () => {
    handler = () => 'network-error';
    const res = await api.post('/api/tasks', { title: 'Offline task' });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-offline-queued'], '1');
    assert.ok(res.data.task.id.startsWith('temp_'));
    assert.equal((await outbox.getPendingMutations()).length, 1);
    // engine learned we are offline from the failed request
    assert.equal(syncEngine.getStatus().isOnline, false);
  });

  await t('axios interceptor: non-queueable write fails honestly when offline', async () => {
    handler = () => 'network-error';
    await assert.rejects(() => api.post('/api/wallet/topup', { amount: 5 }));
    await assert.rejects(() => api.post('/api/auth/register-user', { password: 'x' }));
    assert.equal((await outbox.getPendingMutations()).length, 1, 'nothing extra queued');
  });

  await t('axios interceptor: editing a task that only exists offline is queued, never sent with a temp id', async () => {
    seen.length = 0;
    const [create] = await outbox.getPendingMutations();
    handler = () => ({ status: 200, data: {} }); // even if the server were reachable
    const res = await api.put(`/api/tasks/${create.entityId}`, { priority: 'high' });
    assert.equal(res.headers['x-offline-queued'], '1');
    assert.equal(seen.filter((s) => s.url.includes(create.entityId) && s.method === 'put').length, 0, 'temp id must not hit the network');
    const pending = await outbox.getPendingMutations();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].payload.priority, 'high');
  });

  await t('offline reads: local task store answers /api/tasks, including offline-created tasks', async () => {
    handler = () => 'network-error';
    const res = await api.get('/api/tasks', { params: { status: 'todo' } });
    assert.equal(res.headers['x-offline-cache'], 'local');
    assert.equal(res.data.tasks.length, 1);
    assert.equal(res.data.tasks[0].title, 'Offline task');
  });

  await t('offline reads: /api/init is served from the HTTP cache after one online load', async () => {
    handler = () => ({ status: 200, data: { user: { id: 'u1' }, company: { id: 'c1' } } });
    await api.get('/api/init');
    await new Promise((r) => setTimeout(r, 50)); // cachePut is fire-and-forget
    handler = () => 'network-error';
    const res = await api.get('/api/init');
    assert.equal(res.headers['x-offline-cache'], 'http');
    assert.equal(res.data.user.id, 'u1');
  });

  await t('sync: applied create remaps temp id -> server id, replaces local entity, empties the queue', async () => {
    seen.length = 0;
    const [m] = await outbox.getPendingMutations();
    handler = (config) => {
      if (config.url.includes('/sync/push')) {
        const body = JSON.parse(config.data);
        return {
          status: 200,
          data: {
            success: true,
            results: body.mutations.map((x: any) => {
              const row = { id: 'srv-task-1', title: x.body.title, priority: x.body.priority, status: 'todo', updatedAt: '2026-09-21T10:00:00Z' };
              serverRows.push(row);
              return { clientMutationId: x.clientMutationId, status: 'applied', data: { task: row } };
            }),
          },
        };
      }
      if (config.url.includes('/sync/pull')) return { status: 200, data: { success: true, upserts: serverRows, deletedIds: [], nextCursor: null, hasMore: false } };
      return { status: 200, data: {} };
    };
    await drain();
    const push = pushed()[0];
    assert.equal(push.data.mutations.length, 1);
    assert.equal(push.data.mutations[0].method, 'POST');
    assert.equal(push.data.mutations[0].path, '/api/tasks');
    assert.equal(push.data.mutations[0].body.priority, 'high', 'merged edit travels in the create');
    assert.equal((await outbox.getPendingMutations()).length, 0);
    assert.equal(await outbox.getLocalEntity('task', m.entityId), null, 'temp entity gone');
    const real = await outbox.getLocalEntityRecord('task', 'srv-task-1');
    assert.equal(real!.syncStatus, 'synced');
    assert.equal(real!.serverUpdatedAt, Date.parse('2026-09-21T10:00:00Z'));
    assert.equal(await outbox.lookupRealId(m.entityId), 'srv-task-1');
  });

  await t('after remap, a UI request still holding the temp id is rewritten to the real id', async () => {
    const temp = (await outbox.getMeta<any>('x')) as any; // noop to keep lints quiet
    void temp;
    const tmpId = [...(await (async () => { const all: string[] = []; return all; })())];
    void tmpId;
    // find the temp id we just remapped via meta store
    const dbi = await db.getOfflineDB();
    const keys: string[] = await new Promise((res) => {
      const rq = dbi.transaction('sync_metadata').objectStore('sync_metadata').getAllKeys();
      rq.onsuccess = () => res(rq.result as string[]);
    });
    let tempId = '';
    for (const k of keys.filter((k) => String(k).startsWith('idmap:temp_'))) {
      const candidate = String(k).replace('idmap:', '');
      if ((await outbox.lookupRealId(candidate)) === 'srv-task-1') tempId = candidate;
    }
    assert.ok(tempId, 'found the temp id that was remapped to srv-task-1');
    seen.length = 0;
    handler = () => ({ status: 200, data: { id: 'srv-task-1' } });
    await api.put(`/api/tasks/${tempId}`, { title: 'again' });
    assert.ok(seen.some((s) => s.method === 'put' && s.url === '/api/tasks/srv-task-1'), 'url rewritten to the real id');
  });

  await t('stale-write conflict is surfaced (not lost) and "keep mine" resends with force', async () => {
    handler = () => 'network-error';
    await api.put('/api/tasks/srv-task-1', { title: 'offline edit' });
    const [m] = await outbox.getPendingMutations();
    assert.equal(m.baseUpdatedAt, Date.parse('2026-09-21T10:00:00Z'), 'base version captured for the stale-write guard');

    handler = (config) =>
      config.url.includes('/sync/push')
        ? { status: 200, data: { success: true, results: JSON.parse(config.data).mutations.map((x: any) => ({ clientMutationId: x.clientMutationId, status: 'conflict', reason: 'stale_write', message: 'changed', serverEntity: { id: 'srv-task-1', title: 'theirs' } })) } }
        : { status: 200, data: { success: true, upserts: serverRows, deletedIds: [], hasMore: false } };
    await drain();
    assert.equal((await outbox.getPendingMutations()).length, 0);
    const attention = (await outbox.getAttentionMutations()).filter((x) => x.id === m.id);
    assert.equal(attention.length, 1);
    assert.equal(attention[0].status, 'conflict');
    assert.equal(attention[0].serverEntity.title, 'theirs');

    seen.length = 0;
    handler = (config) =>
      config.url.includes('/sync/push')
        ? { status: 200, data: { success: true, results: JSON.parse(config.data).mutations.map((x: any) => ({ clientMutationId: x.clientMutationId, status: 'applied', data: { id: 'srv-task-1', title: x.body.title, updatedAt: '2026-09-21T11:00:00Z' } })) } }
        : { status: 200, data: { success: true, upserts: serverRows, deletedIds: [], hasMore: false } };
    await outbox.requeueMutation(m.id, { force: true });
    await drain();
    assert.equal(pushed()[0].data.mutations[0].force, true);
    assert.equal((await outbox.getAttentionMutations()).filter((x) => x.id === m.id).length, 0);
  });

  await t('transient server failure: mutation stays queued with backoff, order preserved, nothing lost', async () => {
    handler = () => 'network-error';
    await api.post('/api/tasks', { title: 'first' });
    await api.post('/api/tasks', { title: 'second' });
    handler = (config) =>
      config.url.includes('/sync/push')
        ? { status: 200, data: { success: true, results: JSON.parse(config.data).mutations.map((x: any, i: number) => ({ clientMutationId: x.clientMutationId, status: i === 0 ? 'retry' : 'retry', reason: i === 0 ? 'server_error' : 'blocked_by_previous' })) } }
        : { status: 200, data: {} };
    seen.length = 0;
    await drain();
    const pending = await outbox.getPendingMutations();
    assert.equal(pending.length, 2);
    assert.equal(pending[0].retryCount, 1);
    assert.ok(pending[0].nextAttemptAt > Date.now(), 'backed off');
    assert.equal(pending[1].retryCount, 0, 'blocked mutation is not penalised');
    // not due yet -> a second drain must not send anything
    seen.length = 0;
    await drain();
    assert.equal(pushed().length, 0, 'no send before backoff elapses');
    // clean up
    for (const m of pending) await outbox.removeMutation(m.id);
  });

  await t('rejected CREATE cascade-rejects dependent edits and flags the optimistic entity as failed', async () => {
    handler = () => 'network-error';
    const created = await api.post('/api/tasks', { title: 'Will be forbidden' });
    const tempId = created.data.task.id;
    await api.post('/api/tasks', { title: 'child', parentRef: tempId });
    handler = (config) =>
      config.url.includes('/sync/push')
        ? { status: 200, data: { success: true, results: JSON.parse(config.data).mutations.slice(0, 1).map((x: any) => ({ clientMutationId: x.clientMutationId, status: 'rejected', reason: 'forbidden', message: 'requireManager' })).concat([]) } }
        : { status: 200, data: {} };
    await drain();
    const attention = await outbox.getAttentionMutations();
    const reasons = attention.filter((a) => a.lastReason !== 'legacy').map((a) => a.lastReason).sort();
    assert.deepEqual(reasons, ['depends_on_failed_change', 'forbidden']);
    assert.equal((await outbox.getLocalEntityRecord('task', tempId))!.syncStatus, 'sync_failed');
    for (const a of attention.filter((x) => x.lastReason !== 'legacy')) await outbox.discardMutation(a.id);
    assert.equal(await outbox.getLocalEntity('task', tempId), null, 'discarding a failed create removes its optimistic entity');
  });

  await t('401 from push: everything stays queued, engine reports auth_required, no tokens wiped', async () => {
    handler = () => 'network-error';
    await api.post('/api/tasks', { title: 'while signed out' });
    // Refresh token exists but the refresh call cannot be made (relative URL in Node => fetch throws): this models
    // "expired access token while the refresh endpoint is unreachable", which must NOT end the session.
    store['platform_refresh_token'] = 'refresh-token';
    handler = (config) => (config.url.includes('/sync/push') ? { status: 401, data: { error: 'expired' } } : { status: 200, data: {} });
    await drain();
    assert.equal(syncEngine.getStatus().syncState, 'auth_required');
    assert.equal((await outbox.getPendingMutations()).length, 1);
    assert.ok(store['platform_auth_token'], 'session must not be wiped because the refresh could not be attempted');
    for (const m of await outbox.getPendingMutations()) await outbox.removeMutation(m.id);
  });

  await t('stuck in_flight rows (crashed tab) are recovered and re-sent', async () => {
    handler = () => 'network-error';
    await api.post('/api/tasks', { title: 'crashed mid-push' });
    const [m] = await outbox.getPendingMutations();
    await outbox.patchMutation(m.id, (row) => ({ ...row, status: 'in_flight', inFlightSince: Date.now() - 10 * 60_000 }));
    seen.length = 0;
    handler = (config) =>
      config.url.includes('/sync/push')
        ? { status: 200, data: { success: true, results: JSON.parse(config.data).mutations.map((x: any) => ({ clientMutationId: x.clientMutationId, status: 'applied', data: { task: { id: 'srv-x', title: x.body.title } } })) } }
        : { status: 200, data: { success: true, upserts: serverRows, deletedIds: [], hasMore: false } };
    await drain();
    assert.equal(pushed().length, 1);
    assert.equal((await outbox.getPendingMutations()).length, 0);
  });

  console.log(results.join('\n'));
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(process.exitCode ?? 0);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
