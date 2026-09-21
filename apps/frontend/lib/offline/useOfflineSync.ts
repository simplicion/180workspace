/**
 * 180 Workspace - useOfflineSync React Hook
 *
 * Live connectivity + sync status, the pending queue, and the items that need a human decision
 * (conflicts / rejected changes) together with the actions to resolve them.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncEngine, SyncState } from './sync-engine';
import {
  discardMutation,
  getAttentionMutations,
  getPendingMutations,
  requeueMutation,
  saveLocalEntity,
  OutboxMutation,
} from './outbox';

export interface OfflineSyncStatus {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  attentionCount: number;
  lastSyncedAt: number | null;
  triggerSync: () => Promise<void>;
  getPendingList: () => Promise<OutboxMutation[]>;
  getAttentionList: () => Promise<OutboxMutation[]>;
  /** "Retry" (or, with force, "keep my version" over a newer server copy). */
  retryMutation: (id: string, opts?: { force?: boolean }) => Promise<void>;
  /** "Use theirs" when the server sent its copy, otherwise plain discard. */
  discardMutation: (m: OutboxMutation) => Promise<void>;
}

export function useOfflineSync(): OfflineSyncStatus {
  const [status, setStatus] = useState(() => syncEngine.getStatus());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((s) => setStatus(s));
    syncEngine.refreshCount().catch(() => {});
    return unsubscribe;
  }, []);

  const triggerSync = useCallback(async () => {
    await syncEngine.drainOutbox();
  }, []);

  const retry = useCallback(async (id: string, opts?: { force?: boolean }) => {
    await requeueMutation(id, opts);
    await syncEngine.drainOutbox();
  }, []);

  const discard = useCallback(async (m: OutboxMutation) => {
    if (m.serverEntity && m.entityType) {
      // "Use theirs": adopt the server's copy locally, then drop our edit.
      await saveLocalEntity(m.entityType, m.entityId, m.serverEntity, 'synced').catch(() => {});
    }
    await discardMutation(m.id);
  }, []);

  return {
    isOnline: status.isOnline,
    syncState: status.syncState,
    pendingCount: status.pendingCount,
    attentionCount: status.attentionCount,
    lastSyncedAt: status.lastSyncedAt,
    triggerSync,
    getPendingList: getPendingMutations,
    getAttentionList: getAttentionMutations,
    retryMutation: retry,
    discardMutation: discard,
  };
}
