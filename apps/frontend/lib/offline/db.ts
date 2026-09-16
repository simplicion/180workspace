/**
 * 180 Workspace - Persistent Local Database Engine (IndexedDB)
 * 
 * Provides zero-latency local caching and transactional mutation logging
 * across Web, PWA, Desktop (Tauri/WebView2), and Mobile (Capacitor Android/iOS).
 */

export const DB_NAME = '180Workspace_OfflineDB_v1';
export const DB_VERSION = 1;

export const STORES = {
  ENTITIES: 'entities',       // Cached work graph entities (tasks, employees, projects, etc.)
  OUTBOX: 'mutations_outbox', // Pending mutation operations to be replayed to cloud
  METADATA: 'sync_metadata',  // System sync timestamps, active session tokens, sync checkpoints
} as const;

export interface OutboxMutation {
  id: string;                 // Unique client mutation UUID (e.g. mut_abc123)
  clientMutationId: string;   // Idempotency key sent to server (x-idempotency-key)
  companyId?: string;
  entityType: 'task' | 'employee' | 'project' | 'client' | 'document' | 'lead' | 'deal' | 'invoice' | 'expense' | 'attendance' | 'ticket' | 'social_post' | 'campaign' | 'link' | 'generic';
  entityId: string;           // Entity UUID
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;           // Target REST API route (e.g. /api/tasks)
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: any;               // Exact request body
  headers?: Record<string, string>;
  createdAt: number;          // Timestamp when mutation was enqueued
  retryCount: number;
  lastError?: string;
  status: 'queued' | 'in_flight' | 'applied' | 'conflict';
}

export interface CachedEntity<T = any> {
  id: string;                 // Composite key: `${entityType}:${entityId}` or entityId
  entityType: string;
  entityId: string;
  data: T;
  syncStatus: 'synced' | 'pending_sync' | 'sync_failed';
  localUpdatedAt: number;
  serverUpdatedAt?: number;
  version: number;
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens and initializes the IndexedDB database instance
 */
export async function getOfflineDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in browser / client runtime.');
  }

  if (dbInstance) {
    return dbInstance;
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Entities Store (Key: id)
      if (!db.objectStoreNames.contains(STORES.ENTITIES)) {
        const entityStore = db.createObjectStore(STORES.ENTITIES, { keyPath: 'id' });
        entityStore.createIndex('by_entityType', 'entityType', { unique: false });
        entityStore.createIndex('by_syncStatus', 'syncStatus', { unique: false });
        entityStore.createIndex('by_localUpdatedAt', 'localUpdatedAt', { unique: false });
      }

      // 2. Outbox Mutations Store (Key: id)
      if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
        const outboxStore = db.createObjectStore(STORES.OUTBOX, { keyPath: 'id' });
        outboxStore.createIndex('by_createdAt', 'createdAt', { unique: false });
        outboxStore.createIndex('by_status', 'status', { unique: false });
        outboxStore.createIndex('by_entityType', 'entityType', { unique: false });
        outboxStore.createIndex('by_clientMutationId', 'clientMutationId', { unique: true });
      }

      // 3. Metadata Store (Key: key)
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;

      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbPromise = null;
      };

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[OfflineDB] Error opening IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

/**
 * Execute a transaction on a given store with automatic promise handling
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

    transaction.oncomplete = () => {
      resolve(result);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(new Error('Transaction aborted'));
    };

    try {
      const res = callback(store, transaction);
      if (res instanceof Promise) {
        res.then((val) => {
          result = val;
        }).catch((err) => {
          transaction.abort();
          reject(err);
        });
      } else {
        result = res;
      }
    } catch (err) {
      transaction.abort();
      reject(err);
    }
  });
}
