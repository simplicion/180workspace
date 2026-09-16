/**
 * 180 Workspace - Offline-Aware API Client
 * 
 * Intercepts standard CRUD mutations to execute 0ms optimistic local updates,
 * writes to IndexedDB, and queues to Outbox if network is unavailable.
 */

import api from '@/lib/api';
import { enqueueMutation, saveLocalEntity, getLocalEntity, getLocalEntitiesByType } from './outbox';
import { syncEngine } from './sync-engine';

export interface OfflineMutationOptions {
  entityType?: 'task' | 'employee' | 'project' | 'client' | 'document' | 'lead' | 'generic';
  entityId?: string;
  optimisticData?: any;
  companyId?: string;
}

export const offlineApi = {
  /**
   * Offline-aware GET request
   * 1. If online: Tries network and updates local IndexedDB cache.
   * 2. If offline or network error: Reads directly from local IndexedDB cache.
   */
  async get<T = any>(
    endpoint: string,
    options: { entityType?: string; entityId?: string } = {}
  ): Promise<{ data: T; isOfflineCache?: boolean }> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (isOnline) {
      try {
        const response = await api.get<T>(endpoint);
        if (options.entityType && options.entityId && response.data) {
          saveLocalEntity(options.entityType, options.entityId, response.data, 'synced').catch(() => {});
        }
        return { data: response.data, isOfflineCache: false };
      } catch (err: any) {
        // If network failed unexpectedly, fall back to local cache
        console.warn(`[OfflineAPI] Network GET failed for ${endpoint}, checking local storage...`);
      }
    }

    // Offline / Fallback read
    if (options.entityType && options.entityId) {
      const cached = await getLocalEntity<T>(options.entityType, options.entityId);
      if (cached) {
        return { data: cached, isOfflineCache: true };
      }
    } else if (options.entityType) {
      const cachedList = await getLocalEntitiesByType<T>(options.entityType);
      if (cachedList && cachedList.length > 0) {
        return { data: cachedList as unknown as T, isOfflineCache: true };
      }
    }

    // If no cache, perform last-resort call or rethrow
    const res = await api.get<T>(endpoint);
    return { data: res.data, isOfflineCache: false };
  },

  /**
   * Offline-aware POST request (Creates entities)
   * 1. Assigns deterministic UUID if not present.
   * 2. Saves optimistically to local IndexedDB.
   * 3. Queues to outbox.
   * 4. Triggers background sync drain if online.
   */
  async post<T = any>(
    endpoint: string,
    payload: any,
    options: OfflineMutationOptions = {}
  ): Promise<{ data: T; isOptimisticOffline: boolean; mutationId?: string }> {
    const entityType = options.entityType || 'generic';
    const entityId = options.entityId || payload?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `temp_${Date.now()}`);
    
    // Inject deterministic ID if payload is an object
    const finalPayload = typeof payload === 'object' && !payload.id ? { ...payload, id: entityId } : payload;
    const optimisticData = options.optimisticData || finalPayload;

    // 1. Save locally to IndexedDB immediately
    await saveLocalEntity(entityType, entityId, optimisticData, 'pending_sync');

    // 2. Enqueue mutation
    const mutation = await enqueueMutation({
      entityType,
      entityId,
      action: 'CREATE',
      endpoint,
      method: 'POST',
      payload: finalPayload,
      companyId: options.companyId,
    });

    syncEngine.refreshCount().catch(() => {});

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // 3. If online, attempt immediate sync in background
    if (isOnline) {
      try {
        const response = await api.post<T>(endpoint, finalPayload, {
          headers: { 'x-idempotency-key': mutation.clientMutationId }
        });
        
        // Update local store with confirmed server data
        if (response.data) {
          await saveLocalEntity(entityType, entityId, response.data, 'synced');
        }
        
        return { data: response.data, isOptimisticOffline: false };
      } catch (err: any) {
        console.warn(`[OfflineAPI] Online POST failed. Keeping mutation ${mutation.id} queued for auto-replay.`);
      }
    }

    // Offline / Optimistic return
    return {
      data: optimisticData as T,
      isOptimisticOffline: true,
      mutationId: mutation.id,
    };
  },

  /**
   * Offline-aware PUT request (Updates entities)
   */
  async put<T = any>(
    endpoint: string,
    payload: any,
    options: OfflineMutationOptions = {}
  ): Promise<{ data: T; isOptimisticOffline: boolean; mutationId?: string }> {
    const entityType = options.entityType || 'generic';
    const entityId = options.entityId || payload?.id || endpoint.split('/').pop() || `ent_${Date.now()}`;
    const optimisticData = options.optimisticData || payload;

    await saveLocalEntity(entityType, entityId, optimisticData, 'pending_sync');

    const mutation = await enqueueMutation({
      entityType,
      entityId,
      action: 'UPDATE',
      endpoint,
      method: 'PUT',
      payload,
      companyId: options.companyId,
    });

    syncEngine.refreshCount().catch(() => {});

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (isOnline) {
      try {
        const response = await api.put<T>(endpoint, payload, {
          headers: { 'x-idempotency-key': mutation.clientMutationId }
        });
        if (response.data) {
          await saveLocalEntity(entityType, entityId, response.data, 'synced');
        }
        return { data: response.data, isOptimisticOffline: false };
      } catch (err) {
        console.warn(`[OfflineAPI] Online PUT failed. Retaining queued mutation ${mutation.id}.`);
      }
    }

    return {
      data: optimisticData as T,
      isOptimisticOffline: true,
      mutationId: mutation.id,
    };
  },

  /**
   * Offline-aware DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options: OfflineMutationOptions = {}
  ): Promise<{ success: boolean; isOptimisticOffline: boolean }> {
    const entityType = options.entityType || 'generic';
    const entityId = options.entityId || endpoint.split('/').pop() || `del_${Date.now()}`;

    const mutation = await enqueueMutation({
      entityType,
      entityId,
      action: 'DELETE',
      endpoint,
      method: 'DELETE',
      payload: null,
      companyId: options.companyId,
    });

    syncEngine.refreshCount().catch(() => {});

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (isOnline) {
      try {
        await api.delete(endpoint, {
          headers: { 'x-idempotency-key': mutation.clientMutationId }
        });
        return { success: true, isOptimisticOffline: false };
      } catch (err) {
        console.warn(`[OfflineAPI] Online DELETE failed. Queued mutation ${mutation.id}.`);
      }
    }

    return { success: true, isOptimisticOffline: true };
  }
};
