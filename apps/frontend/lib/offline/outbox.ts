/**
 * 180 Workspace - Transactional Outbox + local entity store
 *
 * All reads/writes are scoped to the signed-in user (see session.ts). Queue operations that read-modify-write
 * (coalescing) run inside ONE readwrite transaction, so two tabs enqueuing at once cannot interleave.
 */

import {
  CachedEntity,
  OutboxMutation,
  OutboxEntityType,
  STORES,
  deleteMeta,
  getMeta,
  req,
  setMeta,
  withTransaction,
} from './db';
import { getSessionScope } from './session';
import { isTempId, mentionsId, planCoalesce, remapMutation } from './sync-logic';

export type { OutboxMutation, CachedEntity };

// ── change notifications (same tab + other tabs) ────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  try {
    channel = new BroadcastChannel('180-offline-outbox');
    channel.onmessage = () => listeners.forEach((l) => l());
  } catch {
    channel = null;
  }
  return channel;
}

export function emitOutboxChanged(): void {
  listeners.forEach((l) => l());
  try {
    getChannel()?.postMessage('changed');
  } catch {
    /* channel closed */
  }
}

export function subscribeOutboxChanged(cb: Listener): () => void {
  getChannel();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ── temp id map ──────────────────────────────────────────────────────────────

const idMapMemory = new Map<string, string>();

export async function rememberIdMapping(tempId: string, realId: string): Promise<void> {
  idMapMemory.set(tempId, realId);
  try {
    await setMeta(`idmap:${tempId}`, { realId, at: Date.now() });
  } catch {
    /* memory copy still serves this session */
  }
}

export async function lookupRealId(tempId: string): Promise<string | undefined> {
  const mem = idMapMemory.get(tempId);
  if (mem) return mem;
  const stored = await getMeta<{ realId: string }>(`idmap:${tempId}`);
  if (stored?.realId) {
    idMapMemory.set(tempId, stored.realId);
    return stored.realId;
  }
  return undefined;
}

/** Synchronous best-effort lookup (memory only). Used by the axios request interceptor. */
export function lookupRealIdSync(tempId: string): string | undefined {
  return idMapMemory.get(tempId);
}

const TEMP_IN_TEXT = /(?:temp|tmp|offline|local)[_-][A-Za-z0-9-]+/gi;

/** Rewrites every already-resolved temp id inside a string / JSON value to its server id. */
async function resolveKnownTempIds<T>(value: T): Promise<T> {
  const text = JSON.stringify(value ?? null);
  const found = new Set(text.match(TEMP_IN_TEXT) || []);
  let out = text;
  for (const t of found) {
    if (!isTempId(t)) continue;
    const real = await lookupRealId(t);
    if (real) out = out.split(t).join(real);
  }
  return out === text ? value : (JSON.parse(out) as T);
}

// ── outbox ───────────────────────────────────────────────────────────────────

export interface EnqueueParams {
  entityType: OutboxEntityType;
  entityId: string;
  action: OutboxMutation['action'];
  endpoint: string;
  method: OutboxMutation['method'];
  payload: any;
  baseUpdatedAt?: number;
  force?: boolean;
}

function newId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${uuid}`;
}

/**
 * Enqueues a mutation for the current user. May merge into / cancel existing queued mutations for the same entity
 * (see planCoalesce). Throws if there is no signed-in user or storage is unavailable/full — callers must treat that
 * as "could not save offline" and surface it, never pretend the change was saved.
 */
export async function enqueueMutation(params: EnqueueParams): Promise<OutboxMutation> {
  const scope = getSessionScope();
  if (!scope) throw new Error('Cannot queue changes offline without a signed-in session.');

  const endpoint = await resolveKnownTempIds(params.endpoint);
  const payload = await resolveKnownTempIds(params.payload);
  const entityId = (await lookupRealId(params.entityId)) || params.entityId;

  const now = Date.now();
  const incoming: OutboxMutation = {
    id: newId('mut'),
    clientMutationId: newId('cid'),
    userId: scope.userId,
    companyId: scope.companyId,
    entityType: params.entityType,
    entityId,
    action: params.action,
    endpoint,
    method: params.method,
    payload,
    baseUpdatedAt: params.baseUpdatedAt,
    force: params.force,
    createdAt: now,
    retryCount: 0,
    nextAttemptAt: 0,
    status: 'queued',
  };

  const result = await withTransaction(STORES.OUTBOX, 'readwrite', async (store) => {
    const mine: OutboxMutation[] = await req(store.index('by_userId').getAll(scope.userId));
    const plan = planCoalesce(mine, incoming);
    for (const id of plan.remove) store.delete(id);
    for (const row of plan.update) store.put(row);
    if (plan.add) store.put(plan.add);
    return plan.add || plan.update[0] || { ...incoming, status: 'applied' as const };
  });

  emitOutboxChanged();
  return result;
}

const byCreatedAt = (a: OutboxMutation, b: OutboxMutation) => a.createdAt - b.createdAt;

async function allForUser(userId: string): Promise<OutboxMutation[]> {
  return withTransaction(STORES.OUTBOX, 'readonly', async (store) => {
    const rows: OutboxMutation[] = await req(store.index('by_userId').getAll(userId));
    return rows.sort(byCreatedAt);
  });
}

/** Queued + in-flight mutations of the current user, FIFO. */
export async function getPendingMutations(): Promise<OutboxMutation[]> {
  const scope = getSessionScope();
  if (!scope) return [];
  return (await allForUser(scope.userId)).filter((m) => m.status === 'queued' || m.status === 'in_flight');
}

/** Conflicts and rejected mutations of the current user (plus quarantined legacy rows): need a human decision. */
export async function getAttentionMutations(): Promise<OutboxMutation[]> {
  const scope = getSessionScope();
  if (!scope) return [];
  const mine = await allForUser(scope.userId);
  const legacy = await withTransaction(STORES.OUTBOX, 'readonly', async (store) => {
    const rows: OutboxMutation[] = await req(store.index('by_userId').getAll(''));
    return rows;
  });
  return [...mine, ...legacy].filter((m) => m.status === 'conflict' || m.status === 'rejected').sort(byCreatedAt);
}

export async function getPendingMutationCount(): Promise<number> {
  try {
    return (await getPendingMutations()).length;
  } catch {
    return 0;
  }
}

export async function getMutation(id: string): Promise<OutboxMutation | undefined> {
  return withTransaction(STORES.OUTBOX, 'readonly', (store) => req(store.get(id)));
}

/** Read-modify-write a single row atomically. No-op if it no longer exists. */
export async function patchMutation(id: string, patch: (m: OutboxMutation) => OutboxMutation | null): Promise<OutboxMutation | null> {
  const next = await withTransaction(STORES.OUTBOX, 'readwrite', async (store) => {
    const current: OutboxMutation | undefined = await req(store.get(id));
    if (!current) return null;
    const updated = patch(current);
    if (updated) store.put(updated);
    return updated;
  });
  emitOutboxChanged();
  return next;
}

export async function removeMutation(id: string): Promise<void> {
  await withTransaction(STORES.OUTBOX, 'readwrite', (store) => {
    store.delete(id);
  });
  emitOutboxChanged();
}

/**
 * After a CREATE succeeded: rewrite every not-yet-terminal mutation of this user that mentions the temp id
 * (entity id, URL, or any payload field such as projectId) to the real id.
 */
export async function remapTempId(tempId: string, realId: string): Promise<void> {
  const scope = getSessionScope();
  await rememberIdMapping(tempId, realId);
  if (!scope) return;
  await withTransaction(STORES.OUTBOX, 'readwrite', async (store) => {
    const mine: OutboxMutation[] = await req(store.index('by_userId').getAll(scope.userId));
    for (const m of mine) {
      if ((m.status === 'queued' || m.status === 'in_flight') && mentionsId(m, tempId)) {
        store.put(remapMutation(m, tempId, realId));
      }
    }
  });
  emitOutboxChanged();
}

/** User chose "retry": put a conflict/rejected mutation back in the queue (optionally forcing over a newer server copy). */
export async function requeueMutation(id: string, opts: { force?: boolean } = {}): Promise<void> {
  const scope = getSessionScope();
  await patchMutation(id, (m) => ({
    ...m,
    // adopt quarantined legacy rows into the current session on explicit user action
    userId: m.userId || scope?.userId || '',
    companyId: m.companyId || scope?.companyId || '',
    status: 'queued',
    force: opts.force ? true : m.force,
    retryCount: 0,
    nextAttemptAt: 0,
    lastError: undefined,
    lastReason: undefined,
    serverEntity: undefined,
    createdAt: m.createdAt,
  }));
}

/** User chose "discard": drop the mutation and its optimistic local entity. */
export async function discardMutation(id: string): Promise<void> {
  const m = await getMutation(id);
  await removeMutation(id);
  if (m && m.action === 'CREATE') {
    await deleteLocalEntity(m.entityType, m.entityId, m.userId).catch(() => {});
  }
}

// ── local entities ───────────────────────────────────────────────────────────

const entityKey = (userId: string, type: string, id: string) => `${userId}:${type}:${id}`;

export async function saveLocalEntity<T = any>(
  entityType: string,
  entityId: string,
  data: T,
  syncStatus: CachedEntity['syncStatus'] = 'pending_sync',
  serverUpdatedAt?: number
): Promise<CachedEntity<T> | null> {
  const scope = getSessionScope();
  if (!scope) return null;
  // For rows that mirror the server, remember the server's updatedAt: it is the base for the stale-write guard.
  const parsed = syncStatus === 'synced' && serverUpdatedAt === undefined ? Date.parse((data as any)?.updatedAt ?? '') : NaN;
  const record: CachedEntity<T> = {
    id: entityKey(scope.userId, entityType, entityId),
    userId: scope.userId,
    entityType,
    entityId,
    data,
    syncStatus,
    localUpdatedAt: Date.now(),
    serverUpdatedAt: serverUpdatedAt ?? (Number.isFinite(parsed) ? parsed : undefined),
    version: 1,
  };
  await withTransaction(STORES.ENTITIES, 'readwrite', (store) => {
    store.put(record);
  });
  return record;
}

/**
 * Upserts server-sourced rows in ONE transaction, skipping any row the user has unsynced local changes for
 * (pending_sync / sync_failed) so a background refresh can never erase offline work. Returns rows written.
 */
export async function bulkUpsertSynced(entityType: string, rows: any[], shape: (row: any) => any = (r) => r): Promise<number> {
  const scope = getSessionScope();
  if (!scope || rows.length === 0) return 0;
  let written = 0;
  await withTransaction(STORES.ENTITIES, 'readwrite', async (store) => {
    for (const row of rows) {
      if (!row || typeof row.id !== 'string') continue;
      const key = entityKey(scope.userId, entityType, row.id);
      const existing: CachedEntity | undefined = await req(store.get(key));
      if (existing && (existing.syncStatus === 'pending_sync' || existing.syncStatus === 'sync_failed')) continue;
      const parsed = Date.parse(row.updatedAt ?? '');
      store.put({
        id: key,
        userId: scope.userId,
        entityType,
        entityId: row.id,
        data: shape(row),
        syncStatus: 'synced',
        localUpdatedAt: Date.now(),
        serverUpdatedAt: Number.isFinite(parsed) ? parsed : undefined,
        version: 1,
      } as CachedEntity);
      written++;
    }
  });
  return written;
}

/** Deletes synced rows by id (tombstones from the server). Rows with unsynced local changes are kept. */
export async function bulkDeleteSynced(entityType: string, ids: string[]): Promise<void> {
  const scope = getSessionScope();
  if (!scope || ids.length === 0) return;
  await withTransaction(STORES.ENTITIES, 'readwrite', async (store) => {
    for (const id of ids) {
      const key = entityKey(scope.userId, entityType, id);
      const existing: CachedEntity | undefined = await req(store.get(key));
      if (!existing || existing.syncStatus === 'synced') store.delete(key);
    }
  });
}

export async function getLocalEntityRecord<T = any>(entityType: string, entityId: string): Promise<CachedEntity<T> | null> {
  const scope = getSessionScope();
  if (!scope) return null;
  const row = await withTransaction(STORES.ENTITIES, 'readonly', (store) => req<CachedEntity<T> | undefined>(store.get(entityKey(scope.userId, entityType, entityId))));
  return row ?? null;
}

export async function getLocalEntity<T = any>(entityType: string, entityId: string): Promise<T | null> {
  return (await getLocalEntityRecord<T>(entityType, entityId))?.data ?? null;
}

export async function getLocalEntityRecordsByType<T = any>(entityType: string): Promise<CachedEntity<T>[]> {
  const scope = getSessionScope();
  if (!scope) return [];
  return withTransaction(STORES.ENTITIES, 'readonly', (store) => req<CachedEntity<T>[]>(store.index('by_user_type').getAll([scope.userId, entityType])));
}

export async function getLocalEntitiesByType<T = any>(entityType: string): Promise<T[]> {
  return (await getLocalEntityRecordsByType<T>(entityType)).map((r) => r.data);
}

export async function deleteLocalEntity(entityType: string, entityId: string, userId?: string): Promise<void> {
  const uid = userId ?? getSessionScope()?.userId;
  if (!uid) return;
  await withTransaction(STORES.ENTITIES, 'readwrite', (store) => {
    store.delete(entityKey(uid, entityType, entityId));
  });
}

export { deleteMeta, getMeta, setMeta };
