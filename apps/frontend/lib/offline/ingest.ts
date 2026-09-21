/**
 * Every successful GET of an allowlisted endpoint also refreshes the local entity store, so the offline task query
 * has data for anything the user has looked at — not only what the background pull has fetched.
 * Rows with unsynced local changes are never overwritten.
 */

import { bulkUpsertSynced } from './outbox';
import { normalizeApiPath } from './queue-policy';
import { toRestTask } from './local-queries';
import { extractEntity } from './sync-logic';

const MAX_ROWS_PER_RESPONSE = 500;

export async function ingestGetResponse(url: string, data: any): Promise<void> {
  const path = normalizeApiPath(url);
  if (!path || !data || typeof data !== 'object') return;

  if (path === '/api/tasks' && Array.isArray(data.tasks)) {
    await bulkUpsertSynced('task', data.tasks.slice(0, MAX_ROWS_PER_RESPONSE), toRestTask);
    return;
  }
  if (/^\/api\/tasks\/[^/]+$/.test(path)) {
    const task = extractEntity(data, 'task');
    if (task) await bulkUpsertSynced('task', [task], toRestTask);
  }
}
