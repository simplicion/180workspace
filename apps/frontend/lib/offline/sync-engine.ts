/**
 * 180 Workspace - Background Sync Engine & Replay Worker
 * 
 * Monitors network availability (navigator.onLine, window online/offline, ping heartbeats)
 * and automatically replays pending outbox mutations sequentially with idempotency protection.
 */

import api from '@/lib/api';
import {
  getPendingMutations,
  updateMutationStatus,
  removeMutation,
  saveLocalEntity,
  OutboxMutation,
  getPendingMutationCount,
} from './outbox';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncEngineListener {
  (state: {
    isOnline: boolean;
    syncState: SyncState;
    pendingCount: number;
    lastSyncedAt: number | null;
    currentMutation?: OutboxMutation;
  }): void;
}

class BackgroundSyncEngine {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncState: SyncState = 'idle';
  private pendingCount: number = 0;
  private lastSyncedAt: number | null = null;
  private listeners: Set<SyncEngineListener> = new Set();
  private isProcessing: boolean = false;
  private syncIntervalTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initNetworkListeners();
      this.refreshCount();
    }
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[SyncEngine] Network restored (online event). Starting auto-sync...');
      this.isOnline = true;
      this.notify();
      this.drainOutbox();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncEngine] Network lost (offline event). Switching to offline queue mode.');
      this.isOnline = false;
      this.syncState = 'offline';
      this.notify();
    });

    // Capacitor Mobile Network listener if available
    try {
      if ((window as any).Capacitor?.Plugins?.Network) {
        (window as any).Capacitor.Plugins.Network.addListener('networkStatusChange', (status: any) => {
          console.log('[SyncEngine] Mobile network status changed:', status.connected);
          this.isOnline = status.connected;
          if (status.connected) {
            this.drainOutbox();
          } else {
            this.syncState = 'offline';
            this.notify();
          }
        });
      }
    } catch {}

    // Periodic heartbeat sync check every 15 seconds
    this.syncIntervalTimer = setInterval(() => {
      if (this.isOnline && !this.isProcessing) {
        this.drainOutbox();
      }
    }, 15000);
  }

  public subscribe(listener: SyncEngineListener): () => void {
    this.listeners.add(listener);
    listener({
      isOnline: this.isOnline,
      syncState: this.syncState,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(currentMutation?: OutboxMutation) {
    for (const listener of this.listeners) {
      listener({
        isOnline: this.isOnline,
        syncState: this.syncState,
        pendingCount: this.pendingCount,
        lastSyncedAt: this.lastSyncedAt,
        currentMutation,
      });
    }
  }

  public async refreshCount(): Promise<number> {
    try {
      this.pendingCount = await getPendingMutationCount();
      this.notify();
      return this.pendingCount;
    } catch {
      return 0;
    }
  }

  /**
   * Drains all pending mutations in the outbox in strict FIFO order
   * Attempts high-throughput batch sync first, falling back to individual replay.
   */
  public async drainOutbox(): Promise<void> {
    if (this.isProcessing || !this.isOnline) {
      return;
    }

    this.isProcessing = true;
    this.syncState = 'syncing';
    this.notify();

    try {
      const pendingMutations = await getPendingMutations();
      this.pendingCount = pendingMutations.length;

      if (pendingMutations.length === 0) {
        this.syncState = 'idle';
        this.lastSyncedAt = Date.now();
        this.notify();
        this.isProcessing = false;
        return;
      }

      console.log(`[SyncEngine] Draining ${pendingMutations.length} pending mutations...`);

      // Attempt high-speed batch sync first
      try {
        const batchRes = await api.post('/api/v1/sync/batch', { mutations: pendingMutations });
        if (batchRes?.data?.success && Array.isArray(batchRes.data.results)) {
          for (const res of batchRes.data.results) {
            if (res.status === 'applied') {
              await removeMutation(res.mutationId);
              if (res.data && res.mutationId) {
                const originalMut = pendingMutations.find(m => m.id === res.mutationId);
                if (originalMut?.entityId) {
                  await saveLocalEntity(originalMut.entityType, originalMut.entityId, res.data, 'synced');
                }
              }
            }
          }
          this.lastSyncedAt = Date.now();
          this.syncState = 'idle';
          await this.refreshCount();
          this.isProcessing = false;
          this.notify();
          return;
        }
      } catch (batchErr) {
        console.warn('[SyncEngine] Batch sync endpoint unavailable, falling back to sequential replay.');
      }

      // Sequential FIFO fallback
      for (const mutation of pendingMutations) {
        if (!this.isOnline) {
          break;
        }

        this.notify(mutation);
        await updateMutationStatus(mutation.id, 'in_flight');

        try {
          const headers = {
            ...(mutation.headers || {}),
            'x-idempotency-key': mutation.clientMutationId,
            'x-offline-mutation-id': mutation.id,
          };

          let response: any;
          if (mutation.method === 'POST') {
            response = await api.post(mutation.endpoint, mutation.payload, { headers });
          } else if (mutation.method === 'PUT') {
            response = await api.put(mutation.endpoint, mutation.payload, { headers });
          } else if (mutation.method === 'PATCH') {
            response = await api.patch(mutation.endpoint, mutation.payload, { headers });
          } else if (mutation.method === 'DELETE') {
            response = await api.delete(mutation.endpoint, { headers });
          }

          if (response?.data && mutation.entityId) {
            await saveLocalEntity(mutation.entityType, mutation.entityId, response.data, 'synced');
          }

          await removeMutation(mutation.id);
          this.pendingCount = Math.max(0, this.pendingCount - 1);
        } catch (err: any) {
          console.warn(`[SyncEngine] Error replaying mutation ${mutation.id}:`, err?.message || err);

          if (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
            this.isOnline = false;
            this.syncState = 'offline';
            await updateMutationStatus(mutation.id, 'queued', 'Network unreachable');
            break;
          }

          if (err.response?.status >= 400 && err.response?.status < 500) {
            if (mutation.retryCount >= 3) {
              await updateMutationStatus(mutation.id, 'conflict', err.response?.data?.message || err.message);
            } else {
              await updateMutationStatus(mutation.id, 'queued', err.response?.data?.message || err.message);
            }
          }
        }
      }

      this.lastSyncedAt = Date.now();
      this.syncState = this.isOnline ? 'idle' : 'offline';
      await this.refreshCount();
    } catch (err) {
      console.error('[SyncEngine] Fatal error during outbox drain:', err);
      this.syncState = 'error';
    } finally {
      this.isProcessing = false;
      this.notify();
    }
  }

  public getStatus() {
    return {
      isOnline: this.isOnline,
      syncState: this.syncState,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
    };
  }
}

// Global Singleton Instance
export const syncEngine = new BackgroundSyncEngine();
