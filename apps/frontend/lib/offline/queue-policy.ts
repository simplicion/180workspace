/**
 * Client-side allowlist of writes that may be queued while offline, and of GETs whose responses may be cached.
 *
 * Mirrors apps/backend/src/api/v1/sync/sync-policy.ts. The server is the authority (it rejects anything it does not
 * support), this side merely avoids queueing writes that could never be replayed. Everything else — payments, AI
 * calls, auth, uploads, account creation, calls/meetings — fails normally when offline instead of being "saved".
 */

import type { OutboxEntityType } from './db';
import { isReadCacheablePath } from './module-policy';

interface Collection {
  entityType: OutboxEntityType;
  path: string;
  /** Actions that may be queued offline. Mirrors `allow` in apps/backend/src/api/v1/sync/sync-policy.ts. */
  allow: ReadonlyArray<'CREATE' | 'UPDATE' | 'DELETE'>;
}

export const COLLECTIONS: Collection[] = [
  { entityType: 'task', path: '/api/tasks', allow: ['CREATE', 'UPDATE', 'DELETE'] },
  { entityType: 'project', path: '/api/projects', allow: ['CREATE', 'UPDATE', 'DELETE'] },
  { entityType: 'client', path: '/api/clients', allow: ['CREATE', 'UPDATE', 'DELETE'] },
  { entityType: 'lead', path: '/api/sales/leads', allow: ['CREATE', 'UPDATE', 'DELETE'] },
  // Employees can apply for and cancel leave offline; approval (`/:id/review`) is a manager action and stays online.
  { entityType: 'leave', path: '/api/leaves', allow: ['CREATE', 'DELETE'] },
];

export interface QueueClassification {
  entityType: OutboxEntityType;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  method: 'POST' | 'PUT' | 'DELETE';
  /** Normalised server-relative path without query. */
  path: string;
  /** Present for UPDATE/DELETE. */
  entityId?: string;
}

/** Strips origin, query and hash and folds `/api/v1/…` into `/api/…`. Returns null for non-API URLs. */
export function normalizeApiPath(url: string | undefined | null): string | null {
  if (!url) return null;
  let path = url;
  const originMatch = path.match(/^https?:\/\/[^/]+(\/.*)?$/i);
  if (originMatch) path = originMatch[1] || '/';
  path = path.split('#')[0].split('?')[0];
  if (!path.startsWith('/')) path = '/' + path;
  path = path.replace(/^\/api\/v1\//, '/api/').replace(/\/+$/, '');
  return path.startsWith('/api/') ? path : null;
}

export function classifyForQueue(methodRaw: string | undefined, url: string | undefined): QueueClassification | null {
  const method = (methodRaw || '').toUpperCase();
  if (method !== 'POST' && method !== 'PUT' && method !== 'DELETE') return null;
  const path = normalizeApiPath(url);
  if (!path) return null;

  for (const c of COLLECTIONS) {
    if (path === c.path) {
      return method === 'POST' && c.allow.includes('CREATE') ? { entityType: c.entityType, action: 'CREATE', method, path } : null;
    }
    if (path.startsWith(c.path + '/')) {
      const id = path.slice(c.path.length + 1);
      if (id.includes('/') || method === 'POST') return null; // nested resources / bulk-* are not replayable
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
      const action = method === 'PUT' ? 'UPDATE' : 'DELETE';
      if (!c.allow.includes(action)) return null;
      return { entityType: c.entityType, action, method, path, entityId: id };
    }
  }
  return null;
}

// ── read cache ──────────────────────────────────────────────────────────────

// Which GET responses are stored on the device is decided by the module policy table (module-policy.ts): only modules
// that are usable offline contribute paths, and sensitive areas (payroll, wallet, finance, vaults, tokens...) are
// excluded there. Each cached response is business data written to disk.
export function isCacheableGet(url: string | undefined | null): boolean {
  const path = normalizeApiPath(url);
  return !!path && isReadCacheablePath(path);
}

/** Stable cache key: path + sorted query params, so `?a=1&b=2` and `?b=2&a=1` share an entry. */
export function cacheKeyFor(url: string, params?: Record<string, any> | null): string | null {
  const path = normalizeApiPath(url);
  if (!path) return null;
  const search = new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '');
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      search.set(k, String(v));
    }
  }
  const sorted = [...search.entries()].sort(([a], [b]) => a.localeCompare(b));
  const qs = sorted.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return qs ? `${path}?${qs}` : path;
}
