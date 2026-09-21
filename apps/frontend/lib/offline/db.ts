/**
 * 180 Workspace - Persistent Local Database Engine (IndexedDB)
 *
 * Shared by Web, PWA and the Tauri desktop app. Every record is scoped to a `userId` so that data queued or cached by
 * one user is never visible to, or replayed by, another user of the same browser profile / machine.
 *
 * Schema versions
 *   v1  entities (global), mutations_outbox, sync_metadata            (first prototype; no user scoping)
 *   v2  + http_cache; entities/outbox gain userId; legacy rows are quarantined/purged (see onupgradeneeded)
 */

export const DB_NAME = '180Workspace_OfflineDB_v1';
export const DB_VERSION = 2;

export const STORES = {
  ENTITIES: 'entities', // Cached work-graph entities (tasks, ...)
  OUTBOX: 'mutations_outbox', // Pending writes to replay to the cloud
  METADATA: 'sync_metadata', // Sync cursors, temp-id map, checkpoints
  HTTP_CACHE: 'http_cache', // Read-through cache of allowlisted GET responses
} as const;

export type OutboxStatus =
  | 'queued' // waiting (or scheduled for retry at nextAttemptAt)
  | 'in_flight' // currently being pushed
  | 'applied' // transient marker, removed right after
  | 'conflict' // server state changed / entity gone: user must choose
  | 'rejected'; // server will never accept it as written: user must edit or discard

export type OutboxEntityType = 'task' | 'project' | 'client';

export interface OutboxMutation {
  id: string;
  /** Idempotency key: the server applies a given value at most once. */
  clientMutationId: string;
  userId: string;
  companyId: string;
  entityType: OutboxEntityType;
  /** Real server id, or a `temp_…` id for entities created offline that have not been pushed yet. */
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  /** Server-relative REST path (no origin, no query), e.g. /api/tasks/abc */
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  /** updatedAt (ms) of the entity when the offline edit began, for the server's stale-write guard. */
  baseUpdatedAt?: number;
  /** Set when the user resolves a conflict with "keep my version". */
  force?: boolean;
  createdAt: number;
  retryCount: number;
  /** Earliest time the engine may attempt this again (exponential backoff). */
  nextAttemptAt: number;
  inFlightSince?: number;
  lastError?: string;
  lastReason?: string;
  /** Present on stale_write conflicts: the server's current copy, for "use theirs". */
  serverEntity?: any;
  status: OutboxStatus;
}

export interface CachedEntity<T = any> {
  /** `${userId}:${entityType}:${entityId}` */
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  data: T;
  syncStatus: 'synced' | 'pending_sync' | 'sync_failed';
  localUpdatedAt: number;
  serverUpdatedAt?: number;
  version: number;
}

export interface HttpCacheRecord {
  /** `${userId}|${normalizedUrl}` */
  key: string;
  userId: string;
  url: string;
  data: any;
  storedAt: number;
  bytes: number;
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

export function isOfflineDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

/** Opens (and migrates) the database. Rejects if IndexedDB is unavailable (private mode, blocked storage, SSR). */
export async function getOfflineDB(): Promise<IDBDatabase> {
  if (!isOfflineDbSupported()) {
    throw new Error('IndexedDB is not available in this runtime.');
  }
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction!;
      const oldVersion = event.oldVersion;

      // ── entities ──
      if (oldVersion > 0 && oldVersion < 2 && db.objectStoreNames.contains(STORES.ENTITIES)) {
        // v1 entities were global (no user scoping) and may belong to anyone: drop them; they are re-pulled.
        db.deleteObjectStore(STORES.ENTITIES);
      }
      if (!db.objectStoreNames.contains(STORES.ENTITIES)) {
        const store = db.createObjectStore(STORES.ENTITIES, { keyPath: 'id' });
        store.createIndex('by_userId', 'userId', { unique: false });
        store.createIndex('by_user_type', ['userId', 'entityType'], { unique: false });
        store.createIndex('by_syncStatus', 'syncStatus', { unique: false });
      }

      // ── outbox ──
      let outbox: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
        outbox = db.createObjectStore(STORES.OUTBOX, { keyPath: 'id' });
        outbox.createIndex('by_createdAt', 'createdAt', { unique: false });
        outbox.createIndex('by_status', 'status', { unique: false });
        outbox.createIndex('by_clientMutationId', 'clientMutationId', { unique: true });
      } else {
        outbox = tx.objectStore(STORES.OUTBOX);
      }
      if (!outbox.indexNames.contains('by_userId')) {
        outbox.createIndex('by_userId', 'userId', { unique: false });
      }
      if (oldVersion > 0 && oldVersion < 2) {
        // v1 outbox rows have no owner and were produced by the flawed generic path. Never auto-replay them under
        // whoever happens to be signed in: quarantine them so a human can retry or discard.
        const cursorReq = outbox.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) return;
          const m = cursor.value as any;
          if (!m.userId) {
            m.userId = '';
            m.companyId = m.companyId || '';
            m.status = 'conflict';
            m.lastReason = 'legacy';
            m.lastError = 'Saved by an older version of the app. Review it, then retry or discard.';
            m.nextAttemptAt = 0;
            cursor.update(m);
          }
          cursor.continue();
        };
      }

      // ── metadata ──
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }

      // ── http cache ──
      if (!db.objectStoreNames.contains(STORES.HTTP_CACHE)) {
        const cache = db.createObjectStore(STORES.HTTP_CACHE, { keyPath: 'key' });
        cache.createIndex('by_userId', 'userId', { unique: false });
        cache.createIndex('by_storedAt', 'storedAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        // Another tab is upgrading the schema: release our handle so it is not blocked.
        db.close();
        dbInstance = null;
        dbPromise = null;
      };
      db.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };
      dbInstance = db;
      resolve(db);
    };

    request.onblocked = () => {
      console.warn('[OfflineDB] Upgrade blocked by another open tab. Close other 180 Workspace tabs to finish updating.');
    };

    request.onerror = () => {
      dbPromise = null;
      console.error('[OfflineDB] Error opening IndexedDB:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Runs `callback` inside a transaction and resolves with its result once the transaction has COMMITTED
 * (not merely when the request succeeded), so callers can rely on durability.
 */
export async function withTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await getOfflineDB();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);

  return new Promise<T>((resolve, reject) => {
    let result: T;
    let settled = false;
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error || new Error('Transaction aborted'));

    try {
      const res = callback(store, transaction);
      if (res instanceof Promise) {
        res.then(
          (val) => {
            result = val;
          },
          (err) => {
            try {
              transaction.abort();
            } catch {
              /* already finished */
            }
            fail(err);
          }
        );
      } else {
        result = res;
      }
    } catch (err) {
      try {
        transaction.abort();
      } catch {
        /* already finished */
      }
      fail(err);
    }
  });
}

/** Promisified IDBRequest helper for use inside withTransaction callbacks. */
export function req<T = any>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getMeta<T = any>(key: string): Promise<T | undefined> {
  try {
    return await withTransaction(STORES.METADATA, 'readonly', async (store) => {
      const row = await req(store.get(key));
      return row?.value as T | undefined;
    });
  } catch {
    return undefined;
  }
}

export async function setMeta(key: string, value: any): Promise<void> {
  await withTransaction(STORES.METADATA, 'readwrite', (store) => {
    store.put({ key, value });
  });
}

export async function deleteMeta(key: string): Promise<void> {
  await withTransaction(STORES.METADATA, 'readwrite', (store) => {
    store.delete(key);
  });
}
