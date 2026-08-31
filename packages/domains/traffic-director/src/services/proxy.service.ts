import { URL } from 'url';

export interface ProxyResponse {
  statusCode: number;
  headers: Record<string, string>;
  html: string;
  isCached: boolean;
  latencyMs: number;
}

export interface ProxyCacheEntry {
  html: string;
  statusCode: number;
  headers: Record<string, string>;
  expiresAt: number;
}

export class ReverseProxyService {
  private static cache = new Map<string, ProxyCacheEntry>();
  private static MAX_CACHE_ENTRIES = 500;
  private static CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Validates if a target URL is safe to fetch (Prevents SSRF attacks)
   */
  static isSafeUrl(targetUrl: string): boolean {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();

      // Block local and link-local hostnames
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname === '169.254.169.254' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal')
      ) {
        return false;
      }

      // Block private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
      const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (ipMatch) {
        const [, oct1, oct2] = ipMatch.map(Number);
        if (oct1 === 10) return false;
        if (oct1 === 127) return false;
        if (oct1 === 169 && oct2 === 254) return false;
        if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return false;
        if (oct1 === 192 && oct2 === 168) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generates a seamless, responsive, full-screen live viewport container
   */
  static renderSeamlessContainer(targetUrl: string, title?: string): string {
    const cleanUrl = targetUrl.trim();
    const streamUrl = `/r/_proxy/stream?url=${encodeURIComponent(cleanUrl)}`;
    const pageTitle = title || 'Welcome';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${pageTitle}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
    #viewport-frame {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      border: none;
      margin: 0;
      padding: 0;
      display: block;
      background: transparent;
    }
  </style>
</head>
<body>
  <iframe 
    id="viewport-frame" 
    src="${streamUrl}" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
    allowfullscreen>
  </iframe>
  <script>
    // Sync browser tab title from embedded frame once loaded
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === '__TD_TITLE__' && e.data.title) {
        document.title = e.data.title;
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Fetches target URL and strips framing/CORS restrictions while rewriting assets
   */
  static async fetchAndStreamHtml(
    targetUrl: string,
    options: {
      customHeaders?: Record<string, string>;
      timeoutMs?: number;
    } = {}
  ): Promise<{ statusCode: number; html: string; contentType: string }> {
    const cleanUrl = targetUrl.trim();
    if (!this.isSafeUrl(cleanUrl)) {
      throw new Error(`Invalid or blocked destination URL: ${cleanUrl}`);
    }

    const parsedUrl = new URL(cleanUrl);
    const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const basePath = parsedUrl.pathname.endsWith('/') 
      ? `${origin}${parsedUrl.pathname}` 
      : `${origin}${parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1)}`;
    const baseHref = basePath.endsWith('/') ? basePath : `${basePath}/`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 6000);

    try {
      const response = await fetch(cleanUrl, {
        method: 'GET',
        headers: {
          'User-Agent': options.customHeaders?.['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': options.customHeaders?.['accept-language'] || 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      let html = await response.text();

      // 1. Neutralize top-level frame-busting scripts
      html = html.replace(/if\s*\(\s*top\s*!==?\s*self\s*\)/gi, 'if (false)');
      html = html.replace(/top\.location\s*=/gi, 'window.location =');
      html = html.replace(/window\.top\.location\s*=/gi, 'window.location =');

      // 2. Rewrite root-relative assets to absolute URLs
      html = html
        .replace(/\b(href|src|poster|data-src)=["']\/(?!\/)([^"']*)["']/gi, `$1="${origin}/$2"`)
        .replace(/\bsrcset=["']([^"']+)["']/gi, (_m, val) => {
          const rewritten = val.split(',').map((part: string) => {
            const p = part.trim();
            return p.startsWith('/') && !p.startsWith('//') ? `${origin}${p}` : p;
          }).join(', ');
          return `srcset="${rewritten}"`;
        })
        .replace(/url\(\s*["']?\/(?!\/)([^"')]+)["']?\s*\)/gi, `url("${origin}/$1")`);

      // 3. Inject base href, SPA path normalizer, network interceptor & animation fallback into <head>
      const targetPath = parsedUrl.pathname || '/';
      const compatScript = `<script id="__td_compat__">
(function() {
  try {
    var targetOrigin = "${origin}";
    var targetPath = "${targetPath}";

    // SPA Router Path Normalizer (Next.js App Router, Vite, Nuxt, Remix, SvelteKit)
    var curPath = window.location.pathname;
    if (curPath.startsWith('/r/') || curPath.startsWith('/sites/') || (curPath !== targetPath && targetPath !== '/')) {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(window.history.state, '', targetPath + window.location.search + window.location.hash);
      }
    }

    // Intercept window.fetch for RSC flight payloads (/?_rsc=...) and static chunks
    var originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function(resource, init) {
        if (typeof resource === 'string') {
          if (resource.startsWith('/_next/') || resource.startsWith('/_astro/') || resource.startsWith('/assets/') || resource.startsWith('/?_rsc=') || resource.includes('_rsc=')) {
            resource = targetOrigin + (resource.startsWith('/') ? resource : '/' + resource);
          }
        } else if (resource && resource.url && typeof resource.url === 'string') {
          var url = resource.url;
          if (url.startsWith('/_next/') || url.startsWith('/_astro/') || url.startsWith('/assets/') || url.includes('_rsc=')) {
            resource = new Request(targetOrigin + (url.startsWith('/') ? url : '/' + url), resource);
          }
        }
        return originalFetch.call(this, resource, init);
      };
    }

    // Intercept XMLHttpRequest for relative XHR calls
    var OriginalXHR = window.XMLHttpRequest;
    if (OriginalXHR) {
      var origOpen = OriginalXHR.prototype.open;
      OriginalXHR.prototype.open = function(method, url, async, user, password) {
        if (typeof url === 'string') {
          if (url.startsWith('/_next/') || url.startsWith('/_astro/') || url.startsWith('/assets/') || url.includes('_rsc=')) {
            url = targetOrigin + (url.startsWith('/') ? url : '/' + url);
          }
        }
        return origOpen.call(this, method, url, async !== false, user, password);
      };
    }

    // Title broadcaster for parent container
    if (document.title && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: '__TD_TITLE__', title: document.title }, '*');
    }
  } catch (e) {}
})();
</script>`;

      const animationFallback = `<style id="__td_anim_fix__">@keyframes __td_reveal{to{opacity:1 !important; visibility:visible !important; transform:none !important; filter:none !important;}} [style*="opacity: 0"], [style*="opacity:0"], [class*="opacity-0"] { animation: __td_reveal 0.01s forwards 0.35s !important; }</style>`;
      const injection = `\n  <base href="${baseHref}">\n  ${animationFallback}\n  ${compatScript}`;

      if (!/<base\s+[^>]*href=/i.test(html)) {
        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/(<head[^>]*>)/i, `$1${injection}`);
        } else if (/<html[^>]*>/i.test(html)) {
          html = html.replace(/(<html[^>]*>)/i, `$1\n<head>${injection}</head>`);
        } else {
          html = `<head>${injection}</head>\n${html}`;
        }
      } else {
        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/(<head[^>]*>)/i, `$1\n  ${animationFallback}\n  ${compatScript}`);
        }
      }

      return {
        statusCode: response.status,
        html,
        contentType: response.headers.get('content-type') || 'text/html; charset=utf-8'
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Failed to stream proxied page: ${err.message}`);
    }
  }

  /**
   * Fetches target URL and injects <base href> so all assets (CSS, JS, images) load seamlessly
   */
  static async fetchAndMirror(
    targetUrl: string,
    options: {
      bypassCache?: boolean;
      timeoutMs?: number;
      customHeaders?: Record<string, string>;
    } = {}
  ): Promise<ProxyResponse> {
    const startTime = performance.now();
    const cleanUrl = targetUrl.trim();

    if (!this.isSafeUrl(cleanUrl)) {
      throw new Error(`Invalid or blocked destination URL: ${cleanUrl}`);
    }

    const now = Date.now();
    const cacheKey = cleanUrl;

    // Check memory cache
    if (!options.bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        const latencyMs = Math.round(performance.now() - startTime);
        return {
          statusCode: cached.statusCode,
          headers: cached.headers,
          html: cached.html,
          isCached: true,
          latencyMs
        };
      }
    }

    const { statusCode, html, contentType } = await this.fetchAndStreamHtml(cleanUrl, {
      customHeaders: options.customHeaders,
      timeoutMs: options.timeoutMs
    });

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=180, stale-while-revalidate=86400',
      'X-Powered-By': '180workspace-Traffic-Director',
      'Access-Control-Allow-Origin': '*'
    };

    // Store in LRU cache
    if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(cacheKey, {
      html,
      statusCode,
      headers,
      expiresAt: now + this.CACHE_TTL_MS
    });

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      statusCode,
      headers,
      html,
      isCached: false,
      latencyMs
    };
  }

  /**
   * Clears in-memory proxy cache for a specific URL or all entries
   */
  static clearCache(targetUrl?: string) {
    if (targetUrl) {
      this.cache.delete(targetUrl.trim());
    } else {
      this.cache.clear();
    }
  }
}
