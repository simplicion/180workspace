import {
  backoffMs,
  deepReplace,
  extractEntityId,
  findDependents,
  isDue,
  isExpired,
  isTempId,
  MAX_MUTATION_AGE_MS,
  newTempId,
  planCoalesce,
  remapMutation,
  takeBatch,
} from '../../../lib/offline/sync-logic';
import type { OutboxMutation } from '../../../lib/offline/db';

let seq = 0;
const mut = (over: Partial<OutboxMutation> = {}): OutboxMutation => ({
  id: `mut_${seq++}`,
  clientMutationId: `cid_${seq}`,
  userId: 'u1',
  companyId: 'c1',
  entityType: 'task',
  entityId: 'temp_abc',
  action: 'CREATE',
  endpoint: '/api/tasks',
  method: 'POST',
  payload: { title: 'A' },
  createdAt: 1000 + seq,
  retryCount: 0,
  nextAttemptAt: 0,
  status: 'queued',
  ...over,
});

describe('temp ids', () => {
  it('recognises client-minted ids only', () => {
    expect(isTempId('temp_123')).toBe(true);
    expect(isTempId('tmp-123')).toBe(true);
    expect(isTempId('3f2b8c1e-9a4d-4e0b-8f6a-1c2d3e4f5a6b')).toBe(false);
    expect(isTempId(undefined)).toBe(false);
    expect(isTempId(newTempId())).toBe(true);
  });

  it('deepReplace rewrites ids in nested payloads and URLs, leaving other values alone', () => {
    const out = deepReplace({ projectId: 'temp_p', nested: { list: ['temp_p', 'x'], url: '/api/projects/temp_p/x' }, n: 3 }, 'temp_p', 'real-1');
    expect(out).toEqual({ projectId: 'real-1', nested: { list: ['real-1', 'x'], url: '/api/projects/real-1/x' }, n: 3 });
  });

  it('remapMutation updates entityId, endpoint and payload references', () => {
    const m = mut({ action: 'UPDATE', method: 'PUT', entityId: 'temp_t', endpoint: '/api/tasks/temp_t', payload: { projectId: 'temp_p', title: 'x' } });
    const a = remapMutation(m, 'temp_t', 'task-1');
    expect(a.entityId).toBe('task-1');
    expect(a.endpoint).toBe('/api/tasks/task-1');
    const b = remapMutation(a, 'temp_p', 'proj-1');
    expect(b.payload).toEqual({ projectId: 'proj-1', title: 'x' });
  });

  it('findDependents returns queued mutations that reference a failed CREATE, and nothing for non-creates', () => {
    const create = mut({ entityId: 'temp_p', entityType: 'project', endpoint: '/api/projects' });
    const dep1 = mut({ action: 'UPDATE', method: 'PUT', entityId: 'temp_p', endpoint: '/api/projects/temp_p', entityType: 'project' });
    const dep2 = mut({ payload: { projectId: 'temp_p' } });
    const other = mut({ entityId: 'temp_other', payload: { title: 'z' } });
    const inflight = mut({ entityId: 'temp_p', status: 'in_flight' });
    const deps = findDependents([create, dep1, dep2, other, inflight], create).map((m) => m.id);
    expect(deps).toEqual([dep1.id, dep2.id]);
    expect(findDependents([dep1], dep1)).toEqual([]);
  });
});

describe('extractEntityId', () => {
  it('finds the server id across response envelopes and ignores temp ids', () => {
    expect(extractEntityId({ success: true, task: { id: 'srv-1' } }, 'task')).toBe('srv-1');
    expect(extractEntityId({ data: { id: 'srv-2' } }, 'task')).toBe('srv-2');
    expect(extractEntityId({ id: 'srv-3' }, 'task')).toBe('srv-3');
    expect(extractEntityId({ task: { id: 'temp_x' } }, 'task')).toBeNull();
    expect(extractEntityId(null, 'task')).toBeNull();
    expect(extractEntityId({ success: true }, 'task')).toBeNull();
  });
});

describe('planCoalesce', () => {
  it('merges an UPDATE into a queued CREATE of the same entity', () => {
    const create = mut({ payload: { title: 'A', priority: 'low' } });
    const upd = mut({ action: 'UPDATE', method: 'PUT', endpoint: '/api/tasks/temp_abc', payload: { title: 'B' } });
    const plan = planCoalesce([create], upd);
    expect(plan.add).toBeNull();
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].id).toBe(create.id);
    expect(plan.update[0].payload).toEqual({ title: 'B', priority: 'low' });
    expect(plan.update[0].action).toBe('CREATE');
  });

  it('merges consecutive UPDATEs, keeping the earliest baseUpdatedAt', () => {
    const u1 = mut({ action: 'UPDATE', method: 'PUT', entityId: 'srv-1', endpoint: '/api/tasks/srv-1', payload: { title: 'A' }, baseUpdatedAt: 100 });
    const u2 = mut({ action: 'UPDATE', method: 'PUT', entityId: 'srv-1', endpoint: '/api/tasks/srv-1', payload: { status: 'done' }, baseUpdatedAt: 200 });
    const plan = planCoalesce([u1], u2);
    expect(plan.add).toBeNull();
    expect(plan.update[0].payload).toEqual({ title: 'A', status: 'done' });
    expect(plan.update[0].baseUpdatedAt).toBe(100);
  });

  it('cancels a never-synced entity entirely when it is deleted offline', () => {
    const create = mut();
    const upd = mut({ action: 'UPDATE', method: 'PUT', endpoint: '/api/tasks/temp_abc', payload: { title: 'B' } });
    const del = mut({ action: 'DELETE', method: 'DELETE', endpoint: '/api/tasks/temp_abc', payload: null });
    const plan = planCoalesce([create, upd], del);
    expect(plan.cancelledCreate).toBe(true);
    expect(plan.add).toBeNull();
    expect(plan.remove.sort()).toEqual([create.id, upd.id].sort());
  });

  it('drops queued UPDATEs when a synced entity is deleted, but still sends the DELETE', () => {
    const u = mut({ action: 'UPDATE', method: 'PUT', entityId: 'srv-1', endpoint: '/api/tasks/srv-1', payload: { title: 'A' } });
    const del = mut({ action: 'DELETE', method: 'DELETE', entityId: 'srv-1', endpoint: '/api/tasks/srv-1', payload: null });
    const plan = planCoalesce([u], del);
    expect(plan.remove).toEqual([u.id]);
    expect(plan.add).toBe(del);
  });

  it('never merges into an in-flight mutation (it may already be on the wire) or across users/entities', () => {
    const inflight = mut({ status: 'in_flight' });
    const upd = mut({ action: 'UPDATE', method: 'PUT', endpoint: '/api/tasks/temp_abc', payload: { title: 'B' } });
    expect(planCoalesce([inflight], upd).add).toBe(upd);

    const otherUser = mut({ userId: 'u2' });
    expect(planCoalesce([otherUser], upd).add).toBe(upd);

    const otherEntity = mut({ entityId: 'temp_zzz' });
    expect(planCoalesce([otherEntity], upd).add).toBe(upd);
  });

  it('always adds a CREATE', () => {
    const c = mut();
    expect(planCoalesce([mut()], c).add).toBe(c);
  });
});

describe('batching', () => {
  it('takes a FIFO prefix and stops at the first mutation that is not yet due (no out-of-order sends)', () => {
    const now = 10_000;
    const a = mut({ entityId: 'a' });
    const b = mut({ entityId: 'b', nextAttemptAt: now + 60_000 }); // backing off
    const c = mut({ entityId: 'c' });
    expect(takeBatch([a, b, c], now).map((m) => m.entityId)).toEqual(['a']);
    expect(takeBatch([b, c], now)).toEqual([]);
  });

  it('respects the count and byte caps but always returns at least one mutation', () => {
    const now = 0;
    const many = Array.from({ length: 10 }, (_, i) => mut({ entityId: `e${i}` }));
    expect(takeBatch(many, now, 3)).toHaveLength(3);
    const big = mut({ entityId: 'temp_big', payload: { blob: 'x'.repeat(5000) } });
    const s1 = mut({ entityId: 'temp_s1' });
    const s2 = mut({ entityId: 'temp_s2' });
    expect(takeBatch([big], now, 50, 1000)).toHaveLength(1);
    // big is ~5.3 KB on its own; adding even one small mutation would exceed a 5.4 KB cap, so only `big` is taken.
    expect(takeBatch([big, s1, s2], now, 50, 5400)).toHaveLength(1);
    // with a roomier cap the small ones join it
    expect(takeBatch([big, s1, s2], now, 50, 6000)).toHaveLength(3);
  });

  it('never sends a mutation in the same batch as the CREATE whose temp id it references (server cannot resolve it)', () => {
    const createProject = mut({ entityId: 'temp_p', entityType: 'project', endpoint: '/api/projects', payload: { name: 'P' } });
    const taskInProject = mut({ entityId: 'temp_t', payload: { title: 'T', projectId: 'temp_p' } });
    const editProject = mut({ action: 'UPDATE', method: 'PUT', entityId: 'temp_p', entityType: 'project', endpoint: '/api/projects/temp_p', payload: { name: 'P2' } });
    const unrelated = mut({ entityId: 'temp_u', payload: { title: 'U' } });

    expect(takeBatch([createProject, taskInProject], 0).map((m) => m.entityId)).toEqual(['temp_p']);
    expect(takeBatch([createProject, editProject], 0).map((m) => m.entityId)).toEqual(['temp_p']);
    // independent mutations may still share a batch
    expect(takeBatch([createProject, unrelated], 0).map((m) => m.entityId)).toEqual(['temp_p', 'temp_u']);
    // once the create has been applied and remapped (no temp id left), the dependent goes through
    expect(takeBatch([{ ...taskInProject, payload: { title: 'T', projectId: 'proj-real' } }], 0)).toHaveLength(1);
  });

  it('skips non-queued rows', () => {
    const conflict = mut({ status: 'conflict' });
    const q = mut();
    expect(takeBatch([conflict, q], 0)).toEqual([q]);
  });

  it('isDue / isExpired', () => {
    expect(isDue(mut({ nextAttemptAt: 5 }), 4)).toBe(false);
    expect(isDue(mut({ nextAttemptAt: 5 }), 5)).toBe(true);
    expect(isDue(mut({ status: 'in_flight' }), 5)).toBe(false);
    expect(isExpired(mut({ createdAt: 0 }), MAX_MUTATION_AGE_MS + 1)).toBe(true);
    expect(isExpired(mut({ createdAt: 0 }), MAX_MUTATION_AGE_MS - 1)).toBe(false);
  });
});

describe('backoff', () => {
  it('grows exponentially, is jittered, and is capped at 15 minutes', () => {
    const lo = () => 0; // minimum jitter -> 50%
    const hi = () => 0.999999; // ~100%
    expect(backoffMs(1, hi)).toBeLessThanOrEqual(30_000);
    expect(backoffMs(1, lo)).toBeGreaterThanOrEqual(15_000);
    expect(backoffMs(3, hi)).toBeGreaterThan(backoffMs(2, hi));
    expect(backoffMs(50, hi)).toBeLessThanOrEqual(15 * 60_000);
    expect(backoffMs(0, hi)).toBeGreaterThan(0);
  });
});
