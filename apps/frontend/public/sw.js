/* 180 Workspace service worker.
 *
 * What it does (deliberately small):
 *  1. Precaches /offline.html and serves it when a page navigation fails because there is no connection.
 *  2. Cache-first for /_next/static/* — those files are content-hashed and immutable, so a previously loaded app
 *     shell keeps working offline.
 *  3. Desktop app only (registered as /sw.js?desktop=1): network-first caching of page navigations and Next.js RSC
 *     payloads, so screens the user already opened still open with no connection.
 *
 * What it deliberately does NOT do:
 *  - It never touches cross-origin requests, so API calls (api.180workspace.com) and their Authorization headers are
 *    never seen, cached or replayed here. Offline data is handled by the app's own IndexedDB layer.
 *  - It never caches page HTML in a regular browser: server-rendered HTML can embed the signed-in user's session,
 *    and a browser profile may be shared. The desktop app has its own per-OS-user profile.
 *
 * Bump VERSION to drop old caches on release.
 */
const VERSION = 'v1';
const STATIC_CACHE = `180-static-${VERSION}`;
const PAGES_CACHE = `180-pages-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const MAX_PAGE_ENTRIES = 150;
const IS_DESKTOP = new URL(self.location.href).searchParams.get('desktop') === '1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('180-') && k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    // Only cache successful, non-redirected, same-origin HTML/RSC responses.
    if (response.ok && response.type === 'basic' && !response.redirected) {
      cache.put(request, response.clone()).then(() => trim(PAGES_CACHE, MAX_PAGE_ENTRIES)).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept API / third-party traffic
  if (url.pathname.startsWith('/api/')) return; // same-origin API proxy (rewrites): leave to the app's own offline layer
  if (url.pathname === '/sw.js') return;

  // Immutable, content-hashed build assets: cache-first.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone()).catch(() => {});
        return response;
      })
    );
    return;
  }

  const isNavigation = request.mode === 'navigate';
  const isRsc = request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');

  if (isNavigation || isRsc) {
    event.respondWith(
      (IS_DESKTOP ? networkFirstPage(request) : fetch(request)).catch(async () => {
        if (isNavigation) {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
  }
});
