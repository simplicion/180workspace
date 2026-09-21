/**
 * Read-through cache for allowlisted GET requests (see queue-policy.ts → isCacheableGet).
 *
 * Pages in this app call axios directly, so caching at the axios layer is what lets a previously seen screen — and
 * the app boot payload — render with no connection. Entries are per-user, size-capped and age-capped.
 * Nothing here is used while online except to be refreshed: the network always wins when it answers.
 */

import { HttpCacheRecord, STORES, req, withTransaction } from './db';
import { cacheKeyFor } from './queue-policy';
import { getSessionScope } from './session';

export const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
export const MAX_ENTRIES_PER_USER = 300;
export const MAX_ENTRY_AGE_MS = 30 * 24 * 60 * 60 * 1000;

let putsSinceSweep = 0;

const storageKey = (userId: string, key: string) => `${userId}|${key}`;

export async function cachePut(url: string, params: Record<string, any> | null | undefined, data: unknown): Promise<void> {
  const scope = getSessionScope();
  const key = cacheKeyFor(url, params);
  if (!scope || !key || data === undefined || data === null || typeof data !== 'object') return;

  let bytes = 0;
  try {
    bytes = JSON.stringify(data).length;
  } catch {
    return; // not serialisable
  }
  if (bytes > MAX_ENTRY_BYTES) return;

  const record: HttpCacheRecord = { key: storageKey(scope.userId, key), userId: scope.userId, url: key, data, storedAt: Date.now(), bytes };
  await withTransaction(STORES.HTTP_CACHE, 'readwrite', (store) => {
    store.put(record);
  });

  if (++putsSinceSweep >= 20) {
    putsSinceSweep = 0;
    sweep(scope.userId).catch(() => {});
  }
}

export async function cacheGet(url: string, params: Record<string, any> | null | undefined): Promise<HttpCacheRecord | null> {
  const scope = getSessionScope();
  const key = cacheKeyFor(url, params);
  if (!scope || !key) return null;
  const row = await withTransaction(STORES.HTTP_CACHE, 'readonly', (store) => req<HttpCacheRecord | undefined>(store.get(storageKey(scope.userId, key))));
  if (!row) return null;
  if (Date.now() - row.storedAt > MAX_ENTRY_AGE_MS) return null;
  return row;
}

/** Evicts expired entries, then the oldest entries beyond the per-user cap. */
export async function sweep(userId: string): Promise<void> {
  await withTransaction(STORES.HTTP_CACHE, 'readwrite', async (store) => {
    const rows: HttpCacheRecord[] = await req(store.index('by_userId').getAll(userId));
    const now = Date.now();
    const fresh: HttpCacheRecord[] = [];
    for (const r of rows) {
      if (now - r.storedAt > MAX_ENTRY_AGE_MS) store.delete(r.key);
      else fresh.push(r);
    }
    if (fresh.length > MAX_ENTRIES_PER_USER) {
      fresh.sort((a, b) => a.storedAt - b.storedAt);
      for (const r of fresh.slice(0, fresh.length - MAX_ENTRIES_PER_USER)) store.delete(r.key);
    }
  });
}

export async function purgeHttpCache(userId: string): Promise<void> {
  await withTransaction(STORES.HTTP_CACHE, 'readwrite', async (store) => {
    const keys: IDBValidKey[] = await req(store.index('by_userId').getAllKeys(userId));
    for (const k of keys) store.delete(k);
  });
}
