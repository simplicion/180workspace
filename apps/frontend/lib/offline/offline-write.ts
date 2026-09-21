/**
 * The single place where an offline write becomes (1) an optimistic local entity and (2) a queued mutation.
 * Used by the global axios interceptor and by offlineApi, so both follow identical rules.
 */

import { classifyForQueue } from './queue-policy';
import {
  deleteLocalEntity,
  enqueueMutation,
  getLocalEntityRecord,
  saveLocalEntity,
  type OutboxMutation,
} from './outbox';
import { newTempId } from './sync-logic';
import { toRestTask } from './local-queries';

export interface OfflineWriteResult {
  /** What the caller should treat as the (optimistic) server response body. */
  data: any;
  mutation: OutboxMutation;
}

function parseBody(body: unknown): Record<string, any> | null {
  let value = body;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, any>) } : null;
}

/**
 * Returns null when the request is not something we are allowed to queue (caller must then fail normally).
 * Throws if it IS queueable but could not be persisted (storage full/blocked): the caller must surface that.
 */
export async function queueOfflineWrite(
  method: string,
  url: string,
  body: unknown,
  optimistic?: Record<string, any>
): Promise<OfflineWriteResult | null> {
  const c = classifyForQueue(method, url);
  if (!c) return null;

  const payload = c.action === 'DELETE' ? null : parseBody(body);
  if (c.action !== 'DELETE' && !payload) return null;

  const nowIso = new Date().toISOString();
  let entityId = c.entityId;
  let baseUpdatedAt: number | undefined;
  let data: any;

  if (c.action === 'CREATE') {
    entityId = newTempId();
    delete (payload as any).id; // the server assigns the real id; we remap temp -> real after it is created
    // `optimistic` lets the caller supply a richer local shape (e.g. resolved assignee/project objects) for the UI;
    // the request payload always wins for fields both define.
    data = { ...(optimistic || {}), ...payload, id: entityId, createdAt: nowIso, updatedAt: nowIso, syncStatus: 'pending_sync' };
    // Mirror the server-side column defaults so offline lists and status/priority filters treat the new row exactly
    // as they will once it has synced (a task with no status would otherwise vanish from every filtered view).
    if (c.entityType === 'task') data = toRestTask({ status: 'todo', priority: 'medium', ...data });
    await saveLocalEntity(c.entityType, entityId, data, 'pending_sync');
  } else if (c.action === 'UPDATE') {
    const existing = await getLocalEntityRecord(c.entityType, entityId!);
    baseUpdatedAt = existing?.syncStatus === 'synced' ? existing.serverUpdatedAt : undefined;
    data = { ...(existing?.data || {}), ...payload, id: entityId, updatedAt: nowIso, syncStatus: 'pending_sync' };
    await saveLocalEntity(c.entityType, entityId!, data, 'pending_sync', existing?.serverUpdatedAt);
  } else {
    const existing = await getLocalEntityRecord(c.entityType, entityId!);
    baseUpdatedAt = existing?.syncStatus === 'synced' ? existing.serverUpdatedAt : undefined;
    data = { success: true, id: entityId, deleted: true };
    await deleteLocalEntity(c.entityType, entityId!);
  }

  let mutation: OutboxMutation;
  try {
    mutation = await enqueueMutation({
      entityType: c.entityType,
      entityId: entityId!,
      action: c.action,
      endpoint: c.action === 'CREATE' ? c.path : `${c.path.replace(/\/[^/]+$/, '')}/${entityId}`,
      method: c.method,
      payload,
      baseUpdatedAt,
    });
  } catch (err) {
    // Roll back the optimistic entity so the UI does not show something that will never sync.
    if (c.action === 'CREATE') await deleteLocalEntity(c.entityType, entityId!).catch(() => {});
    throw err;
  }

  // REST-shaped envelope so callers that read `data.task` / `data.id` keep working.
  const envelope =
    c.action === 'DELETE'
      ? { success: true, offline: true, id: entityId, deleted: true }
      : { success: true, offline: true, [c.entityType]: data, ...data };
  return { data: envelope, mutation };
}
