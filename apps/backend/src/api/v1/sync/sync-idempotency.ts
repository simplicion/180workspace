/**
 * Offline sync — server-side idempotency ledger.
 *
 * A queued mutation can legitimately arrive more than once (client crashed after the server applied it, two tabs
 * drained the same outbox, a proxy retried). Each mutation carries a client-generated `clientMutationId`; the
 * first terminal outcome is recorded here and returned verbatim for every later delivery.
 *
 * Storage is Redis (already required by BullMQ) so the ledger survives restarts and is shared across instances.
 * If Redis is unreachable we fall back to a per-process map and log loudly: that keeps sync available, but
 * duplicate protection is then best-effort across restarts/instances. Do not run production without Redis.
 */

import { redis } from '../../../system-configs/config/redis';

export interface StoredOutcome {
  status: 'applied' | 'conflict' | 'rejected';
  reason?: string;
  httpStatus: number;
  data: unknown;
  at: number;
}

// Must outlive the client's retry horizon (the frontend sync engine abandons a mutation after 7 days, see
// MAX_MUTATION_AGE_MS), otherwise a very late replay could be applied a second time. 8 days = 7 + margin.
const OUTCOME_TTL_SECONDS = 8 * 24 * 60 * 60;
const LOCK_TTL_SECONDS = 60;

const memoryOutcomes = new Map<string, { value: StoredOutcome; expiresAt: number }>();
const memoryLocks = new Map<string, number>();
let lastFallbackWarning = 0;

function warnFallback(err: unknown) {
  const now = Date.now();
  if (now - lastFallbackWarning > 60_000) {
    lastFallbackWarning = now;
    console.error(
      '[SyncIdempotency] Redis unavailable, using in-process fallback (duplicate protection degraded):',
      (err as Error)?.message || err
    );
  }
}

function sweepMemory() {
  if (memoryOutcomes.size < 5000 && memoryLocks.size < 5000) return;
  const now = Date.now();
  for (const [k, v] of memoryOutcomes) if (v.expiresAt < now) memoryOutcomes.delete(k);
  for (const [k, exp] of memoryLocks) if (exp < now) memoryLocks.delete(k);
}

const outcomeKey = (scope: string, id: string) => `sync:idem:v1:${scope}:${id}`;
const lockKey = (scope: string, id: string) => `sync:lock:v1:${scope}:${id}`;

export async function getOutcome(scope: string, clientMutationId: string): Promise<StoredOutcome | null> {
  const key = outcomeKey(scope, clientMutationId);
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as StoredOutcome) : null;
    } catch (err) {
      warnFallback(err);
    }
  }
  const hit = memoryOutcomes.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  return null;
}

export async function saveOutcome(scope: string, clientMutationId: string, outcome: StoredOutcome): Promise<void> {
  const key = outcomeKey(scope, clientMutationId);
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(outcome), 'EX', OUTCOME_TTL_SECONDS);
      return;
    } catch (err) {
      warnFallback(err);
    }
  }
  sweepMemory();
  memoryOutcomes.set(key, { value: outcome, expiresAt: Date.now() + OUTCOME_TTL_SECONDS * 1000 });
}

/** Returns true if this caller now owns the in-flight lock for the mutation. */
export async function acquireLock(scope: string, clientMutationId: string): Promise<boolean> {
  const key = lockKey(scope, clientMutationId);
  if (redis) {
    try {
      const res = await redis.set(key, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
      return res === 'OK';
    } catch (err) {
      warnFallback(err);
    }
  }
  sweepMemory();
  const now = Date.now();
  const existing = memoryLocks.get(key);
  if (existing && existing > now) return false;
  memoryLocks.set(key, now + LOCK_TTL_SECONDS * 1000);
  return true;
}

export async function releaseLock(scope: string, clientMutationId: string): Promise<void> {
  const key = lockKey(scope, clientMutationId);
  memoryLocks.delete(key);
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      warnFallback(err);
    }
  }
}
