/**
 * 180 Workspace - useOfflineSync React Hook
 * 
 * Provides live synchronization status, connectivity detection,
 * pending mutation count, and manual sync triggers.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncEngine, SyncState } from './sync-engine';
import { getPendingMutations, OutboxMutation } from './outbox';

export interface OfflineSyncStatus {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  lastSyncedAt: number | null;
  triggerSync: () => Promise<void>;
  getPendingList: () => Promise<OutboxMutation[]>;
}

export function useOfflineSync(): OfflineSyncStatus {
  const [status, setStatus] = useState(() => syncEngine.getStatus());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((updatedState) => {
      setStatus({
        isOnline: updatedState.isOnline,
        syncState: updatedState.syncState,
        pendingCount: updatedState.pendingCount,
        lastSyncedAt: updatedState.lastSyncedAt,
      });
    });

    // Refresh pending count on mount
    syncEngine.refreshCount().catch(() => {});

    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(async () => {
    await syncEngine.drainOutbox();
  }, []);

  const getPendingList = useCallback(async () => {
    return await getPendingMutations();
  }, []);

  return {
    isOnline: status.isOnline,
    syncState: status.syncState,
    pendingCount: status.pendingCount,
    lastSyncedAt: status.lastSyncedAt,
    triggerSync,
    getPendingList,
  };
}
