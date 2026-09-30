/**
 * 180 Profile Unified API Gateway Helper
 * Directs all API and OAuth calls to the sovereign core backend (services.180workspace.com)
 */

const envCoreUrl = process.env.NEXT_PUBLIC_CORE_BACKEND_URL;
export const CORE_BACKEND_URL =
  (envCoreUrl && !envCoreUrl.includes(':4004'))
    ? envCoreUrl
    : (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:4003'
        : 'https://services.180workspace.com');

export function getCoreApiUrl(path: string): string {
  if (!path) return CORE_BACKEND_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${CORE_BACKEND_URL}${cleanPath}`;
}

// Client-side auto-interceptor so all relative `/api/` and `/oauth/` calls seamlessly route to services.180workspace.com with CORS credentials
if (typeof window !== 'undefined' && !(window as any).__180_fetch_intercepted) {
  (window as any).__180_fetch_intercepted = true;
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let target = input;
    let isCoreTarget = false;

    if (typeof input === 'string') {
      if (input.startsWith('/api/') || input.startsWith('/oauth/')) {
        target = `${CORE_BACKEND_URL}${input}`;
        isCoreTarget = true;
      } else if (input.startsWith(CORE_BACKEND_URL)) {
        isCoreTarget = true;
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api/') || input.pathname.startsWith('/oauth/')) {
        target = new URL(input.pathname + input.search, CORE_BACKEND_URL);
        isCoreTarget = true;
      } else if (input.origin === new URL(CORE_BACKEND_URL).origin) {
        isCoreTarget = true;
      }
    }

    let modifiedInit: RequestInit = isCoreTarget
      ? {
          ...init,
          credentials: init?.credentials || 'include',
        }
      : (init || {});

    // Automatically inject Authorization Bearer token for sovereign core backend calls
    if (isCoreTarget && typeof window !== 'undefined') {
      const headers = new Headers(modifiedInit.headers || {});
      if (!headers.has('Authorization')) {
        const token =
          localStorage.getItem('platform_auth_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('accessToken');
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
      modifiedInit.headers = headers;
    }

    return originalFetch(target, modifiedInit);
  };
}
