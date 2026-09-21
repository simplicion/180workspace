/**
 * Offline data is always scoped to the signed-in user. On a shared machine, user B must never see, or replay,
 * what user A queued or cached. The scope is derived from the (already issued) access token; no network needed.
 */

import { jwtDecode } from 'jwt-decode';

export interface SessionScope {
  userId: string;
  companyId: string;
}

export function readScopeFromToken(token: string | null | undefined): SessionScope | null {
  if (!token || token === 'null' || token === 'undefined') return null;
  try {
    const payload: any = jwtDecode(token);
    const userId = payload?.id ?? payload?.userId ?? payload?.sub;
    if (!userId) return null;
    return { userId: String(userId), companyId: payload?.companyId ? String(payload.companyId) : '' };
  } catch {
    return null;
  }
}

/** The token may live in localStorage or (subdomain sharing) only in the cookie — same lookup order as lib/api.tsx. */
export function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const local = window.localStorage.getItem('platform_auth_token');
    if (local) return local;
  } catch {
    /* storage blocked */
  }
  const match = typeof document !== 'undefined' ? document.cookie.match(/(^| )platform_auth_token=([^;]+)/) : null;
  return match ? decodeURIComponent(match[2]) : null;
}

export function getSessionScope(): SessionScope | null {
  return readScopeFromToken(readStoredToken());
}
