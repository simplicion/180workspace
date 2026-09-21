/**
 * Removing locally stored data.
 *
 * On sign-out we drop everything that is a *cache* of server data (entities, HTTP cache, pull cursors) so the next
 * person to use this browser profile / machine does not find business data on disk. The outbox is deliberately KEPT:
 * it holds the user's not-yet-synced work and is scoped to that user, so it is neither visible to nor replayable by
 * anyone else, and it resumes when the same user signs back in. `purgeAllOfflineData` is the explicit "wipe
 * everything, including unsynced changes" action.
 */

import { STORES, deleteMeta, getOfflineDB, isOfflineDbSupported, req, withTransaction } from './db';
import { purgeHttpCache } from './http-cache';
import type { SessionScope } from './session';

export async function purgeSessionData(scope: SessionScope | null): Promise<void> {
  if (!scope || !isOfflineDbSupported()) return;
  try {
    await withTransaction(STORES.ENTITIES, 'readwrite', async (store) => {
      const keys: IDBValidKey[] = await req(store.index('by_userId').getAllKeys(scope.userId));
      for (const k of keys) store.delete(k);
    });
    await purgeHttpCache(scope.userId);
    await deleteMeta(`pull:task:${scope.userId}`);
  } catch (err) {
    console.warn('[Offline] Could not purge session data:', err);
  }
}

export async function purgeAllOfflineData(): Promise<void> {
  if (!isOfflineDbSupported()) return;
  const db = await getOfflineDB();
  for (const name of Object.values(STORES)) {
    await withTransaction(name, 'readwrite', (store) => {
      store.clear();
    });
  }
  db.close();
}
