import { URL } from 'url';

export interface ProxyResponse {
  statusCode: number;
  headers: Record<string, string>;
  html: string;
  isCached: boolean;
  latencyMs: number;
}

export interface ProxyAssetResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
  contentType: string;
  isCached: boolean;
  latencyMs: number;
}

export interface ProxyCacheEntry {
  html: string;
  statusCode: number;
  headers: Record<string, string>;
  expiresAt: number;
}

export interface ProxyAssetCacheEntry {
  body: Buffer;
  statusCode: number;
  contentType: string;
  headers: Record<string, string>;
  expiresAt: number;
}

export class ReverseProxyService {
  private static cache = new Map<string, ProxyCacheEntry>();
  private static assetCache = new Map<string, ProxyAssetCacheEntry>();
  private static MAX_CACHE_ENTRIES = 500;
  private static MAX_ASSET_CACHE_ENTRIES = 1000;
  private static CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static ASSET_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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
   * Helper to detect MIME type from extension or URL
   */
  private static detectMimeType(urlPath: string, upstreamType?: string | null): string {
    const cleanPath = urlPath.split('?')[0].toLowerCase();
    if (cleanPath.endsWith('.js') || cleanPath.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
    if (cleanPath.endsWith('.css')) return 'text/css; charset=utf-8';
    if (cleanPath.endsWith('.json') || cleanPath.endsWith('.map')) return 'application/json; charset=utf-8';
    if (cleanPath.endsWith('.webmanifest') || cleanPath.endsWith('.manifest')) return 'application/manifest+json';
    if (cleanPath.endsWith('.svg')) return 'image/svg+xml';
    if (cleanPath.endsWith('.png')) return 'image/png';
    if (cleanPath.endsWith('.jpg') || cleanPath.endsWith('.jpeg')) return 'image/jpeg';
    if (cleanPath.endsWith('.webp')) return 'image/webp';
    if (cleanPath.endsWith('.avif')) return 'image/avif';
    if (cleanPath.endsWith('.ico')) return 'image/x-icon';
    if (cleanPath.endsWith('.woff2')) return 'font/woff2';
    if (cleanPath.endsWith('.woff')) return 'font/woff';
    if (cleanPath.endsWith('.ttf')) return 'font/ttf';
    if (cleanPath.endsWith('.otf')) return 'font/otf';
    if (cleanPath.endsWith('.html') || cleanPath.endsWith('.htm')) return 'text/html; charset=utf-8';
    
    if (upstreamType && upstreamType !== 'text/plain') {
      return upstreamType;
    }
    return 'application/octet-stream';
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
   * Fetches target URL, removes framing/CORS restrictions, and rewrites assets & favicons
   */
  static async fetchAndStreamHtml(
    targetUrl: string,
    options: {
      requestOrigin?: string;
      customHeaders?: Record<string, string>;
      timeoutMs?: number;
    } = {}
  ): Promise<{ statusCode: number; html: string; contentType: string; title: string }> {
    const cleanUrl = targetUrl.trim();
    if (!this.isSafeUrl(cleanUrl)) {
      throw new Error(`Invalid or blocked destination URL: ${cleanUrl}`);
    }

    const parsedUrl = new URL(cleanUrl);
    const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
    // Always use root-relative path for asset proxying so subresources resolve seamlessly on any custom domain or subdomain
    // without leaking internal container hostnames (e.g. backend:4000).
    const assetProxyBase = '/r/_proxy/asset';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 8000);

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

      // Extract real document title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : 'Website';

      // 1. Strip any embedded Traffic Director client evaluation tags (e.g. /tag/*.js, foodandus.js, etc.)
      // so they don't execute client-side window.location.replace when served via reverse proxy
      html = html.replace(/<script[^>]*src=["'][^"']*(?:\/tag\/|\/shield\/|\/evaluate\/|\.180workspace\.com\/tag)[^"']*["'][^>]*>\s*<\/script>/gi, '');
      html = html.replace(/<script[^>]*src=["'][^"']*(?:\/tag\/|\/shield\/|\/evaluate\/|\.180workspace\.com\/tag)[^"']*["'][^>]*\/>/gi, '');

      // 2. Neutralize top-level frame-busting scripts & CSP / X-Frame meta headers
      html = html.replace(/if\s*\(\s*top\s*!==?\s*self\s*\)/gi, 'if (false)');
      html = html.replace(/top\.location\s*=/gi, 'window.location =');
      html = html.replace(/window\.top\.location\s*=/gi, 'window.location =');
      html = html.replace(/<meta[^>]*http-equiv=["']?(Content-Security-Policy|X-Frame-Options)["']?[^>]*>/gi, '');

      // 3. Strip all crossorigin and integrity attributes to eliminate browser CORS blocks on subresources
      html = html.replace(/\s+crossorigin(=["'][^"']*["']|(?=[\s>]))/gi, '');
      html = html.replace(/\s+integrity=["'][^"']*["']/gi, '');

      // 4. Rewrite scripts, stylesheets, modulepreloads, and favicons through the edge asset proxy (/r/_proxy/asset)
      // This guarantees same-origin delivery with universal CORS (Access-Control-Allow-Origin: *)
      html = html.replace(/<(script|link)([^>]*?)>/gi, (_match, tag, attrs) => {
        let updatedAttrs = attrs;
        const tagLower = tag.toLowerCase();
        
        // Rewrite src on scripts (clean single-pass replacement)
        if (tagLower === 'script') {
          const srcMatch = updatedAttrs.match(/\bsrc=["']([^"']+)["']/i);
          if (srcMatch) {
            const rawSrc = srcMatch[1];
            let absoluteAsset = '';
            if (rawSrc.startsWith('//')) {
              absoluteAsset = `${parsedUrl.protocol}${rawSrc}`;
            } else if (rawSrc.startsWith('/')) {
              absoluteAsset = `${origin}${rawSrc}`;
            } else if (rawSrc.startsWith(origin)) {
              absoluteAsset = rawSrc;
            }
            if (absoluteAsset) {
              const proxiedSrc = `${assetProxyBase}?url=${encodeURIComponent(absoluteAsset)}`;
              updatedAttrs = updatedAttrs.replace(/\bsrc=["'][^"']+["']/i, `src="${proxiedSrc}"`);
            }
          }
        }
        
        // Rewrite href on link tags (stylesheets, modulepreload, icons, shortcut icons, apple-touch-icon, fonts)
        if (tagLower === 'link') {
          const hrefMatch = updatedAttrs.match(/\bhref=["']([^"']+)["']/i);
          if (hrefMatch) {
            const rawHref = hrefMatch[1];
            let absoluteAsset = '';
            if (rawHref.startsWith('//')) {
              absoluteAsset = `${parsedUrl.protocol}${rawHref}`;
            } else if (rawHref.startsWith('/')) {
              absoluteAsset = `${origin}${rawHref}`;
            } else if (rawHref.startsWith(origin)) {
              absoluteAsset = rawHref;
            }
            if (absoluteAsset) {
              const proxiedHref = `${assetProxyBase}?url=${encodeURIComponent(absoluteAsset)}`;
              updatedAttrs = updatedAttrs.replace(/\bhref=["'][^"']+["']/i, `href="${proxiedHref}"`);
            }
          }
        }

        return `<${tag}${updatedAttrs}>`;
      });

      // 4. Ensure a real destination favicon is present in <head>
      if (!/<link[^>]*rel=["'](icon|shortcut icon)["']/i.test(html)) {
        const defaultFaviconUrl = `${origin}/favicon.ico`;
        const faviconTag = `\n  <link rel="icon" href="${assetProxyBase}?url=${encodeURIComponent(defaultFaviconUrl)}">`;
        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/(<head[^>]*>)/i, `$1${faviconTag}`);
        }
      }

      // 5. Rewrite remaining general root-relative assets (images, audio, video posters, etc.) to absolute target URLs
      // (Explicitly excluding our edge asset proxy path /r/_proxy/)
      html = html
        .replace(/\b(src|poster|data-src)=["']\/(?!r\/_proxy\/|\/)([^"']*)["']/gi, `$1="${origin}/$2"`)
        .replace(/\bsrcset=["']([^"']+)["']/gi, (_m, val) => {
          const rewritten = val.split(',').map((part: string) => {
            const p = part.trim();
            return p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/r/_proxy/') ? `${origin}${p}` : p;
          }).join(', ');
          return `srcset="${rewritten}"`;
        })
        .replace(/url\(\s*["']?\/(?!r\/_proxy\/|\/)([^"')]+)["']?\s*\)/gi, `url("${origin}/$1")`);

      // 6. Inject SPA path normalizer, network interceptor & animation fallback into <head> (WITHOUT <base href>)
      const targetPath = parsedUrl.pathname || '/';
      const compatScript = `<script id="__td_compat__">
(function() {
  try {
    var targetOrigin = "${origin}";
    var targetPath = "${targetPath}";
    var assetProxyBase = "${assetProxyBase}";

    // SPA Router Path Normalizer (Next.js App Router, Vite, Nuxt, Remix, SvelteKit)
    var curPath = window.location.pathname;
    if (curPath.startsWith('/r/') || curPath.startsWith('/sites/') || (curPath !== targetPath && targetPath !== '/')) {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(window.history.state, '', targetPath + window.location.search + window.location.hash);
      }
    }

    // Intercept window.fetch for RSC flight payloads, RUM beacons, and dynamic asset chunks
    var originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function(resource, init) {
        try {
          var urlStr = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
          if (urlStr) {
            var fullTarget = '';
            if (urlStr.startsWith('/') && !urlStr.startsWith('/r/_proxy/')) {
              fullTarget = targetOrigin + urlStr;
            } else if (urlStr.startsWith(targetOrigin)) {
              fullTarget = urlStr;
            }
            if (fullTarget) {
              var isGet = !init || !init.method || init.method.toUpperCase() === 'GET';
              if (isGet) {
                var proxiedUrl = assetProxyBase + '?url=' + encodeURIComponent(fullTarget);
                if (typeof resource === 'string') {
                  resource = proxiedUrl;
                } else {
                  resource = new Request(proxiedUrl, resource);
                }
              }
            }
          }
        } catch(fe) {}
        return originalFetch.call(this, resource, init);
      };
    }

    // Intercept XMLHttpRequest for relative XHR / Beacon calls
    var OriginalXHR = window.XMLHttpRequest;
    if (OriginalXHR) {
      var origOpen = OriginalXHR.prototype.open;
      OriginalXHR.prototype.open = function(method, url, async, user, password) {
        try {
          if (typeof url === 'string') {
            var fullTarget = '';
            if (url.startsWith('/') && !url.startsWith('/r/_proxy/')) {
              fullTarget = targetOrigin + url;
            } else if (url.startsWith(targetOrigin)) {
              fullTarget = url;
            }
            if (fullTarget && (!method || method.toUpperCase() === 'GET')) {
              url = assetProxyBase + '?url=' + encodeURIComponent(fullTarget);
            }
          }
        } catch(xe) {}
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
      const injection = `\n  ${animationFallback}\n  ${compatScript}`;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/(<head[^>]*>)/i, `$1${injection}`);
      } else if (/<html[^>]*>/i.test(html)) {
        html = html.replace(/(<html[^>]*>)/i, `$1\n<head>${injection}</head>`);
      } else {
        html = `<head>${injection}</head>\n${html}`;
      }

      return {
        statusCode: response.status,
        html,
        contentType: response.headers.get('content-type') || 'text/html; charset=utf-8',
        title: pageTitle
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Failed to stream proxied page: ${err.message}`);
    }
  }

  /**
   * Universal Asset Streamer: Fetches JS, CSS, Fonts, Images, and Beacons with Universal CORS
   */
  static async fetchAndStreamAsset(
    assetUrl: string,
    options: {
      customHeaders?: Record<string, string>;
      timeoutMs?: number;
      bypassCache?: boolean;
    } = {}
  ): Promise<ProxyAssetResponse> {
    const startTime = performance.now();
    const cleanUrl = assetUrl.trim();

    if (!this.isSafeUrl(cleanUrl)) {
      throw new Error(`Invalid or blocked asset URL: ${cleanUrl}`);
    }

    const now = Date.now();
    const cacheKey = cleanUrl;

    // 1. Check memory cache for static assets
    if (!options.bypassCache) {
      const cached = this.assetCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        const latencyMs = Math.round(performance.now() - startTime);
        return {
          statusCode: cached.statusCode,
          headers: cached.headers,
          body: cached.body,
          contentType: cached.contentType,
          isCached: true,
          latencyMs
        };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

    try {
      const response = await fetch(cleanUrl, {
        method: 'GET',
        headers: {
          'User-Agent': options.customHeaders?.['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': options.customHeaders?.['accept'] || '*/*',
          'Accept-Language': options.customHeaders?.['accept-language'] || 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const arrayBuffer = await response.arrayBuffer();
      const body = Buffer.from(arrayBuffer);
      const upstreamContentType = response.headers.get('content-type');
      const contentType = this.detectMimeType(cleanUrl, upstreamContentType);

      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': '*',
        'Timing-Allow-Origin': '*',
        'X-Powered-By': '180workspace-Traffic-Director'
      };

      // Cache if under 10MB
      if (body.length < 10 * 1024 * 1024) {
        if (this.assetCache.size >= this.MAX_ASSET_CACHE_ENTRIES) {
          const firstKey = this.assetCache.keys().next().value;
          if (firstKey) this.assetCache.delete(firstKey);
        }

        this.assetCache.set(cacheKey, {
          body,
          statusCode: response.status,
          contentType,
          headers,
          expiresAt: now + this.ASSET_CACHE_TTL_MS
        });
      }

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        statusCode: response.status,
        headers,
        body,
        contentType,
        isCached: false,
        latencyMs
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Failed to fetch proxied asset: ${err.message}`);
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
      this.assetCache.delete(targetUrl.trim());
    } else {
      this.cache.clear();
      this.assetCache.clear();
    }
  }
}
