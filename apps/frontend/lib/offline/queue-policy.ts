/**
 * Client-side allowlist of writes that may be queued while offline, and of GETs whose responses may be cached.
 *
 * Mirrors apps/backend/src/api/v1/sync/sync-policy.ts. The server is the authority (it rejects anything it does not
 * support), this side merely avoids queueing writes that could never be replayed. Everything else — payments, AI
 * calls, auth, uploads, account creation, calls/meetings — fails normally when offline instead of being "saved".
 */

import type { OutboxEntityType } from './db';

interface Collection {
  entityType: OutboxEntityType;
  path: string;
}

const COLLECTIONS: Collection[] = [
  { entityType: 'task', path: '/api/tasks' },
  { entityType: 'project', path: '/api/projects' },
  { entityType: 'client', path: '/api/clients' },
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
      return method === 'POST' ? { entityType: c.entityType, action: 'CREATE', method, path } : null;
    }
    if (path.startsWith(c.path + '/')) {
      const id = path.slice(c.path.length + 1);
      if (id.includes('/') || method === 'POST') return null; // nested resources / bulk-* are not replayable
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
      return { entityType: c.entityType, action: method === 'PUT' ? 'UPDATE' : 'DELETE', method, path, entityId: id };
    }
  }
  return null;
}

// ── read cache ──────────────────────────────────────────────────────────────

// Endpoints whose GET responses are stored so the app can be opened and browsed offline. Deliberately small:
// each entry is business data written to disk.
const CACHEABLE_GET: RegExp[] = [
  /^\/api\/init$/, // boot payload: user + company (offline app start depends on this)
  /^\/api\/tasks$/,
  /^\/api\/tasks\/[A-Za-z0-9_-]{8,64}$/,
  /^\/api\/projects$/,
  /^\/api\/projects\/[A-Za-z0-9_-]{8,64}$/,
  /^\/api\/clients$/,
  /^\/api\/clients\/[A-Za-z0-9_-]{8,64}$/,
];

export function isCacheableGet(url: string | undefined | null): boolean {
  const path = normalizeApiPath(url);
  return !!path && CACHEABLE_GET.some((re) => re.test(path));
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
