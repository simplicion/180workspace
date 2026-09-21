/**
 * Pure (IndexedDB-free) sync logic, so every rule that decides "what gets sent, in what order, and what happens when
 * it fails" is unit-testable. See tests/unit/offline/sync-logic.test.ts.
 */

import type { OutboxMutation } from './db';

export const MAX_MUTATION_AGE_MS = 7 * 24 * 60 * 60 * 1000; // server idempotency ledger keeps 8 days
export const STUCK_IN_FLIGHT_MS = 2 * 60 * 1000;
export const MAX_PUSH_MUTATIONS = 50;
// Backend accepts 5 MB JSON bodies; stay well under so a batch of large edits is never rejected wholesale.
export const MAX_PUSH_BYTES = 3 * 1024 * 1024;

const TEMP_ID = /^(temp|tmp|offline|local)[_-]/i;
export const isTempId = (v: unknown): v is string => typeof v === 'string' && TEMP_ID.test(v);

export function newTempId(): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `temp_${uuid}`;
}

/** Exponential backoff with jitter: ~30s, 1m, 2m, 4m … capped at 15m. Never gives up (data must not be dropped). */
export function backoffMs(retryCount: number, rand: () => number = Math.random): number {
  const base = Math.min(30_000 * 2 ** Math.max(0, retryCount - 1), 15 * 60_000);
  return Math.round(base * (0.5 + rand() * 0.5));
}

// ── temp id remapping ────────────────────────────────────────────────────────

export function deepReplace(value: any, from: string, to: string): any {
  if (value === from) return to;
  if (typeof value === 'string') return value.includes(from) ? value.split(from).join(to) : value;
  if (Array.isArray(value)) return value.map((v) => deepReplace(v, from, to));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepReplace(v, from, to);
    return out;
  }
  return value;
}

export function mentionsId(m: OutboxMutation, id: string): boolean {
  return m.entityId === id || m.endpoint.includes(id) || JSON.stringify(m.payload ?? null).includes(id);
}

export function remapMutation(m: OutboxMutation, tempId: string, realId: string): OutboxMutation {
  return {
    ...m,
    entityId: m.entityId === tempId ? realId : m.entityId,
    endpoint: m.endpoint.split(tempId).join(realId),
    payload: deepReplace(m.payload, tempId, realId),
  };
}

/** Queued mutations (other than the failed one itself) that reference a temp id whose CREATE failed. */
export function findDependents(pending: OutboxMutation[], failed: OutboxMutation): OutboxMutation[] {
  if (failed.action !== 'CREATE' || !isTempId(failed.entityId)) return [];
  return pending.filter((m) => m.id !== failed.id && m.status === 'queued' && mentionsId(m, failed.entityId));
}

/** Finds the server-assigned id in the various response envelopes the REST layer uses. */
export function extractEntityId(data: any, entityType: string): string | null {
  if (!data || typeof data !== 'object') return null;
  const direct = [data[entityType], data.data, data.item, data.entity, data];
  for (const c of direct) {
    if (c && typeof c === 'object' && typeof c.id === 'string' && !isTempId(c.id)) return c.id;
  }
  return null;
}

export function extractEntity(data: any, entityType: string): any | null {
  if (!data || typeof data !== 'object') return null;
  const direct = [data[entityType], data.data, data.item, data.entity, data];
  for (const c of direct) {
    if (c && typeof c === 'object' && typeof c.id === 'string') return c;
  }
  return null;
}

// ── coalescing ───────────────────────────────────────────────────────────────

export interface CoalescePlan {
  /** Outbox ids to delete. */
  remove: string[];
  /** Existing rows to overwrite. */
  update: OutboxMutation[];
  /** New row to insert (null when merged/cancelled). */
  add: OutboxMutation | null;
  /** True when a never-synced entity was deleted: the create and its edits are cancelled outright. */
  cancelledCreate: boolean;
}

/**
 * Keeps the queue small and replay cheap without changing the final state:
 *   CREATE + UPDATE*  -> CREATE(merged payload)
 *   UPDATE + UPDATE   -> UPDATE(merged payload, earliest baseUpdatedAt)
 *   CREATE + DELETE   -> nothing (entity never reached the server)
 *   UPDATE* + DELETE  -> DELETE
 * Only `queued` rows are merged; an `in_flight` row may already be on the wire, so a new row is added after it.
 */
export function planCoalesce(pending: OutboxMutation[], incoming: OutboxMutation): CoalescePlan {
  const same = pending.filter(
    (m) =>
      m.userId === incoming.userId &&
      m.entityType === incoming.entityType &&
      m.entityId === incoming.entityId &&
      m.status === 'queued'
  );
  const none: CoalescePlan = { remove: [], update: [], add: incoming, cancelledCreate: false };

  if (incoming.action === 'CREATE') return none;

  if (incoming.action === 'UPDATE') {
    const create = same.find((m) => m.action === 'CREATE');
    if (create) {
      return {
        remove: [],
        update: [{ ...create, payload: { ...(create.payload || {}), ...(incoming.payload || {}) } }],
        add: null,
        cancelledCreate: false,
      };
    }
    const lastUpdate = [...same].reverse().find((m) => m.action === 'UPDATE');
    if (lastUpdate) {
      return {
        remove: [],
        update: [
          {
            ...lastUpdate,
            payload: { ...(lastUpdate.payload || {}), ...(incoming.payload || {}) },
            baseUpdatedAt: lastUpdate.baseUpdatedAt ?? incoming.baseUpdatedAt,
            force: lastUpdate.force || incoming.force,
          },
        ],
        add: null,
        cancelledCreate: false,
      };
    }
    return none;
  }

  // DELETE
  const create = same.find((m) => m.action === 'CREATE');
  if (create) {
    return { remove: same.map((m) => m.id), update: [], add: null, cancelledCreate: true };
  }
  return { remove: same.filter((m) => m.action === 'UPDATE').map((m) => m.id), update: [], add: incoming, cancelledCreate: false };
}

// ── batching ─────────────────────────────────────────────────────────────────

export function isDue(m: OutboxMutation, now: number): boolean {
  return m.status === 'queued' && m.nextAttemptAt <= now;
}

/**
 * Takes the longest FIFO prefix of due mutations that fits count/byte limits. Stops at the first mutation that is
 * NOT yet due, because sending later ones first would apply edits out of order.
 */
export function takeBatch(ordered: OutboxMutation[], now: number, maxCount = MAX_PUSH_MUTATIONS, maxBytes = MAX_PUSH_BYTES): OutboxMutation[] {
  const batch: OutboxMutation[] = [];
  const createdInBatch = new Set<string>();
  let bytes = 0;
  for (const m of ordered) {
    if (m.status !== 'queued') continue;
    if (m.nextAttemptAt > now) break;
    // A mutation that refers to an entity created EARLIER IN THIS BATCH still carries that entity's temp id in its
    // path/body; the server cannot resolve it (it would fail a foreign key and, being a "retry", block the queue).
    // Stop here: once the create has been applied and its temp id remapped, the next batch sends this one.
    if (batch.length > 0 && [...createdInBatch].some((id) => mentionsId(m, id))) break;
    const size = JSON.stringify(m.payload ?? null).length + 256;
    if (batch.length > 0 && (batch.length >= maxCount || bytes + size > maxBytes)) break;
    batch.push(m);
    bytes += size;
    if (m.action === 'CREATE' && isTempId(m.entityId)) createdInBatch.add(m.entityId);
  }
  return batch;
}

export function isExpired(m: OutboxMutation, now: number): boolean {
  return now - m.createdAt > MAX_MUTATION_AGE_MS;
}
