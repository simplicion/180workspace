/**
 * Offline sync — mutation policy (pure, dependency-free so it is unit-testable).
 *
 * Offline clients queue REST writes and replay them through `POST /sync/push`. The server replays each one
 * against the *real* REST route (so requireManager / requireAccess / requirePermission / subscription guards and
 * business logic apply exactly as for an online call). This module decides which writes are allowed to be replayed
 * at all. It is an ALLOWLIST: anything not matched here is rejected, never guessed at.
 *
 * NOTE: apps/frontend/lib/offline/queue-policy.ts mirrors these rules on the client. If you add an entity here,
 * add it there too (a client that queues something the server rejects only ends up with a visible "rejected" item;
 * a server that is stricter than the client is the safe direction to drift in).
 */

export const MAX_MUTATIONS_PER_PUSH = 50;
export const MAX_MUTATION_BODY_BYTES = 256 * 1024;

export type MutationMethod = 'POST' | 'PUT' | 'DELETE';
export type MutationAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncEntityRule {
  entityType: 'task' | 'project' | 'client';
  /** Collection path, without trailing slash. */
  collection: string;
  /** Prisma accessor on the tenant-scoped client. */
  prismaModel: 'task' | 'project' | 'client';
  /** Whether rows of this model are soft deleted (deletedAt). */
  softDelete: boolean;
  /** Whether the model has updatedAt (needed for the stale-write guard). */
  hasUpdatedAt: boolean;
}

export const SYNC_ENTITY_RULES: readonly SyncEntityRule[] = [
  { entityType: 'task', collection: '/api/tasks', prismaModel: 'task', softDelete: true, hasUpdatedAt: true },
  { entityType: 'project', collection: '/api/projects', prismaModel: 'project', softDelete: true, hasUpdatedAt: true },
  { entityType: 'client', collection: '/api/clients', prismaModel: 'client', softDelete: false, hasUpdatedAt: false },
];

// UUID / cuid / nanoid-ish. Deliberately excludes '/', '.', '%', whitespace.
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
// Ids minted by the client before the server assigned a real one. They must be remapped before replay.
const TEMP_ID_PATTERN = /^(temp|tmp|offline|local)[_-]/i;

export type PolicyErrorCode =
  | 'bad_method'
  | 'bad_path'
  | 'unsupported_entity'
  | 'unresolved_temp_id'
  | 'bad_body';

export type PolicyResult =
  | { ok: true; rule: SyncEntityRule; action: MutationAction; entityId?: string; path: string; method: MutationMethod }
  | { ok: false; code: PolicyErrorCode; message: string };

/**
 * Validates and classifies one queued write. `path` must be the exact server-relative REST path
 * (no origin, no query string, no encoding tricks).
 */
export function classifyMutation(methodRaw: unknown, pathRaw: unknown): PolicyResult {
  const method = typeof methodRaw === 'string' ? methodRaw.toUpperCase() : '';
  if (method !== 'POST' && method !== 'PUT' && method !== 'DELETE') {
    return { ok: false, code: 'bad_method', message: `Method "${String(methodRaw)}" cannot be replayed` };
  }

  if (typeof pathRaw !== 'string' || pathRaw.length === 0 || pathRaw.length > 300) {
    return { ok: false, code: 'bad_path', message: 'Path is required' };
  }
  // Reject anything that could escape the API prefix or smuggle a different target through the loopback hop.
  if (
    !pathRaw.startsWith('/api/') ||
    /[?#%\\\s]/.test(pathRaw) ||
    pathRaw.includes('//') ||
    pathRaw.split('/').some((seg) => seg === '.' || seg === '..')
  ) {
    return { ok: false, code: 'bad_path', message: 'Path is not a valid API path' };
  }

  for (const rule of SYNC_ENTITY_RULES) {
    if (pathRaw === rule.collection) {
      if (method !== 'POST') {
        return { ok: false, code: 'bad_method', message: `${method} is not valid on ${rule.collection}` };
      }
      return { ok: true, rule, action: 'CREATE', path: pathRaw, method };
    }
    if (pathRaw.startsWith(rule.collection + '/')) {
      const id = pathRaw.slice(rule.collection.length + 1);
      if (id.includes('/')) break; // nested resources (comments, attachments, bulk-*) are not replayable yet
      if (TEMP_ID_PATTERN.test(id)) {
        return { ok: false, code: 'unresolved_temp_id', message: 'Entity id was never resolved to a server id' };
      }
      if (!ID_PATTERN.test(id)) {
        return { ok: false, code: 'bad_path', message: 'Malformed entity id' };
      }
      if (method === 'POST') {
        return { ok: false, code: 'bad_method', message: `POST is not valid on ${rule.collection}/:id` };
      }
      return {
        ok: true,
        rule,
        action: method === 'PUT' ? 'UPDATE' : 'DELETE',
        entityId: id,
        path: pathRaw,
        method,
      };
    }
  }

  return { ok: false, code: 'unsupported_entity', message: 'This endpoint is not supported for offline sync' };
}

export function validateBody(method: MutationMethod, body: unknown): { ok: true; json: string } | { ok: false; message: string } {
  if (method === 'DELETE') return { ok: true, json: '' };
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Body must be a JSON object' };
  }
  const json = JSON.stringify(body);
  if (Buffer.byteLength(json, 'utf8') > MAX_MUTATION_BODY_BYTES) {
    return { ok: false, message: 'Mutation body is too large' };
  }
  return { ok: true, json };
}

export type PushStatus = 'applied' | 'conflict' | 'rejected' | 'retry';

/**
 * Maps the HTTP outcome of the replayed REST call to a sync status.
 * - retry    : transient; keep in the queue and try again later (never counts against the retry cap for auth/429)
 * - rejected : permanent; the server will never accept this as written (validation, permission, plan limits)
 * - conflict : the target changed or disappeared; a human must choose
 */
export function mapHttpStatus(action: MutationAction, status: number): { status: PushStatus; reason?: string } {
  if (status >= 200 && status < 300) return { status: 'applied' };
  if (status === 401) return { status: 'retry', reason: 'unauthorized' };
  if (status === 408 || status === 425 || status === 429) return { status: 'retry', reason: status === 429 ? 'rate_limited' : 'timeout' };
  if (status === 409) return { status: 'conflict', reason: 'conflict' };
  if (status === 404) {
    return action === 'DELETE'
      ? { status: 'applied', reason: 'already_deleted' }
      : { status: 'conflict', reason: 'entity_not_found' };
  }
  if (status === 402) return { status: 'rejected', reason: 'plan_limit' };
  if (status === 403) return { status: 'rejected', reason: 'forbidden' };
  if (status >= 400 && status < 500) return { status: 'rejected', reason: 'validation' };
  return { status: 'retry', reason: 'server_error' };
}
