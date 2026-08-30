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

    const parsedUrl = new URL(cleanUrl);
    const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const basePath = parsedUrl.pathname.endsWith('/') 
      ? `${origin}${parsedUrl.pathname}` 
      : `${origin}${parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1)}`;
    const baseHref = basePath.endsWith('/') ? basePath : `${basePath}/`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 4000);

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

      const rawHtml = await response.text();
      let transformedHtml = rawHtml;

      // Inject <base href="..."> into <head> if not already present
      if (!/<base\s+[^>]*href=/i.test(transformedHtml)) {
        const baseTag = `\n  <base href="${baseHref}">`;
        if (/<head[^>]*>/i.test(transformedHtml)) {
          transformedHtml = transformedHtml.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
        } else if (/<html[^>]*>/i.test(transformedHtml)) {
          transformedHtml = transformedHtml.replace(/(<html[^>]*>)/i, `$1\n<head>${baseTag}</head>`);
        } else {
          transformedHtml = `<head>${baseTag}</head>\n${transformedHtml}`;
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'text/html; charset=utf-8',
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
        html: transformedHtml,
        statusCode: response.status,
        headers,
        expiresAt: now + this.CACHE_TTL_MS
      });

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        statusCode: response.status,
        headers,
        html: transformedHtml,
        isCached: false,
        latencyMs
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Reverse proxy failed to fetch safe page (${cleanUrl}): ${err.message}`);
    }
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
