/**
 * 180 Workspace - Transactional Outbox Queue Manager
 * 
 * Queues write mutations during offline periods or network instability,
 * maintaining causal ordering, retry limits, and idempotency guarantees.
 */

import { withTransaction, STORES, OutboxMutation, CachedEntity } from './db';

export type { OutboxMutation, CachedEntity };

/**
 * Enqueues a new mutation to the outbox queue
 */
export async function enqueueMutation(params: {
  entityType: OutboxMutation['entityType'];
  entityId: string;
  action: OutboxMutation['action'];
  endpoint: string;
  method: OutboxMutation['method'];
  payload: any;
  companyId?: string;
  headers?: Record<string, string>;
}): Promise<OutboxMutation> {
  const mutationId = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const clientMutationId = `cid_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;

  const mutation: OutboxMutation = {
    id: mutationId,
    clientMutationId,
    companyId: params.companyId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    endpoint: params.endpoint,
    method: params.method,
    payload: params.payload,
    headers: params.headers,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'queued',
  };

  await withTransaction(STORES.OUTBOX, 'readwrite', (store) => {
    store.put(mutation);
  });

  return mutation;
}

/**
 * Retrieves all pending outbox mutations ordered by createdAt (FIFO)
 */
export async function getPendingMutations(): Promise<OutboxMutation[]> {
  return await withTransaction(STORES.OUTBOX, 'readonly', (store) => {
    return new Promise<OutboxMutation[]>((resolve, reject) => {
      const index = store.index('by_createdAt');
      const request = index.getAll();

      request.onsuccess = () => {
        const results = (request.result as OutboxMutation[]) || [];
        // Filter only active queued/in_flight items
        const pending = results.filter((m) => m.status === 'queued' || m.status === 'in_flight');
        resolve(pending);
      };

      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Updates a mutation's status, error, or retry count
 */
export async function updateMutationStatus(
  id: string,
  status: OutboxMutation['status'],
  lastError?: string
): Promise<void> {
  await withTransaction(STORES.OUTBOX, 'readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const mutation = getReq.result as OutboxMutation | undefined;
        if (!mutation) {
          resolve();
          return;
        }

        mutation.status = status;
        if (status === 'in_flight') {
          mutation.retryCount += 1;
        }
        if (lastError) {
          mutation.lastError = lastError;
        }

        const putReq = store.put(mutation);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  });
}

/**
 * Removes a successfully applied mutation from the outbox
 */
export async function removeMutation(id: string): Promise<void> {
  await withTransaction(STORES.OUTBOX, 'readwrite', (store) => {
    store.delete(id);
  });
}

/**
 * Counts total pending mutations waiting to be synced
 */
export async function getPendingMutationCount(): Promise<number> {
  try {
    const mutations = await getPendingMutations();
    return mutations.length;
  } catch {
    return 0;
  }
}

/**
 * Saves or updates an entity in the local IndexedDB cache
 */
export async function saveLocalEntity<T = any>(
  entityType: string,
  entityId: string,
  data: T,
  syncStatus: 'synced' | 'pending_sync' | 'sync_failed' = 'pending_sync'
): Promise<CachedEntity<T>> {
  const id = `${entityType}:${entityId}`;
  const record: CachedEntity<T> = {
    id,
    entityType,
    entityId,
    data,
    syncStatus,
    localUpdatedAt: Date.now(),
    version: 1,
  };

  await withTransaction(STORES.ENTITIES, 'readwrite', (store) => {
    store.put(record);
  });

  return record;
}

/**
 * Gets a cached entity by type and ID
 */
export async function getLocalEntity<T = any>(
  entityType: string,
  entityId: string
): Promise<T | null> {
  const id = `${entityType}:${entityId}`;
  return await withTransaction(STORES.ENTITIES, 'readonly', (store) => {
    return new Promise<T | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const result = req.result as CachedEntity<T> | undefined;
        resolve(result ? result.data : null);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Retrieves all cached entities for a given type (e.g. 'task', 'employee')
 */
export async function getLocalEntitiesByType<T = any>(entityType: string): Promise<T[]> {
  return await withTransaction(STORES.ENTITIES, 'readonly', (store) => {
    return new Promise<T[]>((resolve, reject) => {
      const index = store.index('by_entityType');
      const req = index.getAll(entityType);
      req.onsuccess = () => {
        const records = (req.result as CachedEntity<T>[]) || [];
        resolve(records.map((r) => r.data));
      };
      req.onerror = () => reject(req.error);
    });
  });
}
