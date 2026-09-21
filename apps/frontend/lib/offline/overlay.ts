/**
 * Glue between the outbox and `applyOverlay`: turns the current user's pending mutations for one collection into
 * overlay operations and applies them to a cached list response.
 */

import { COLLECTIONS, normalizeApiPath } from './queue-policy';
import { getLocalEntityRecord, getPendingMutations } from './outbox';
import { applyOverlay, type OverlayOps } from './local-queries';

export async function overlayPendingOnCachedList(url: string, data: any): Promise<any> {
  const path = normalizeApiPath(url);
  const collection = COLLECTIONS.find((c) => c.path === path); // only list endpoints of writable entities
  if (!collection) return data;

  const pending = (await getPendingMutations()).filter((m) => m.entityType === collection.entityType);
  if (pending.length === 0) return data;

  const ops: OverlayOps = { creates: [], updates: {}, deletes: new Set() };
  for (const m of pending) {
    if (m.action === 'CREATE') {
      const record = await getLocalEntityRecord(m.entityType, m.entityId);
      ops.creates.push(record?.data ?? { ...(m.payload || {}), id: m.entityId });
    } else if (m.action === 'UPDATE') {
      ops.updates[m.entityId] = { ...(ops.updates[m.entityId] || {}), ...(m.payload || {}) };
    } else if (m.action === 'DELETE') {
      ops.deletes.add(m.entityId);
    }
  }
  return applyOverlay(data, ops);
}
