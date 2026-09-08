import type { Request, Response } from 'express';
import {
  SignalExtractor,
  DecisionEngine,
  TrafficLinksService,
  TrafficAnalyticsService,
  ClientShieldGenerator,
  ReverseProxyService
} from '@workspace/traffic-director';

export class PublicRoutingController {
  static async handleRedirect(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const domainQuery = (req.query.domain as string) || (req.headers['x-forwarded-host'] as string) || (req.headers.host as string);

      let link = null;
      if (slug && slug !== '_domain') {
        link = await TrafficLinksService.getLinkBySlug(slug);
      }
      
      if (!link && domainQuery) {
        link = await TrafficLinksService.getLinkByCustomDomain(domainQuery);
      }

      if (!link) {
        return res.status(404).send('Smart Link Not Found');
      }

      // If link is configured for client-side shield, render the shield probe page
      if (link.shieldMode === 'client_shield') {
        return PublicRoutingController.handleShieldRoute(req, res);
      }

      // 2. Extract Signals from Client Request
      const signals = SignalExtractor.extractFromRequest(req);

      // 3. Evaluate Rule Matrix
      const result = DecisionEngine.evaluate(
        {
          id: link.id,
          fallbackUrl: link.fallbackUrl,
          isActive: link.isActive,
          warmupUntil: link.warmupUntil,
          rampUpEnabled: link.rampUpEnabled,
          rampUpDurationHours: link.rampUpDurationHours,
          datacenterBlocked: link.datacenterBlocked,
          safePageProxyMode: (link as any).safePageProxyMode,
          createdAt: (link as any).createdAt,
          rules: link.rules
        },
        signals
      );

      // 4. Asynchronous Non-Blocking Log Ingestion
      setImmediate(async () => {
        try {
          await TrafficAnalyticsService.recordTrafficLog(link.id, result, signals);
        } catch (err) {
          console.error('[PublicRoutingController] Async log error:', err);
        }
      });

      // 5. Compute destination URL and handle subpaths for assets or deep routes
      let finalDestination = result.destinationUrl;
      const subpath = req.query.subpath ? String(req.query.subpath).replace(/^\/+/, '') : '';
      
      if (subpath) {
        try {
          const parsedDest = new URL(finalDestination);
          const targetOrigin = `${parsedDest.protocol}//${parsedDest.host}`;
          const isStaticAsset = /\.(png|jpe?g|svg|webp|avif|ico|gif|mp4|webm|woff2?|ttf|eot|css|js|map|json|webmanifest)$/i.test(subpath.split('?')[0]);
          
          if (isStaticAsset) {
            // Direct static asset streaming proxy (e.g. /logo.png, /favicon.ico)
            const assetUrl = `${targetOrigin}/${subpath}`;
            const assetResult = await ReverseProxyService.fetchAndStreamAsset(assetUrl, {
              customHeaders: {
                'user-agent': req.get('user-agent') || '',
                'accept-language': req.get('accept-language') || '',
                'accept': req.get('accept') || '*/*'
              }
            });

            res.removeHeader('Cross-Origin-Opener-Policy');
            res.removeHeader('Cross-Origin-Resource-Policy');
            res.removeHeader('Content-Security-Policy');
            res.removeHeader('X-Frame-Options');

            res.setHeader('Content-Type', assetResult.contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Timing-Allow-Origin', '*');
            return res.status(assetResult.statusCode || 200).send(assetResult.body);
          } else {
            // Append page subpath to destination
            finalDestination = `${targetOrigin}/${subpath}`;
          }
        } catch (e) {}
      }

      // Preserve non-subpath query params from original request
      const urlObj = new URL(req.url, 'http://localhost');
      urlObj.searchParams.delete('subpath');
      const extraQuery = urlObj.searchParams.toString();
      if (extraQuery) {
        const separator = finalDestination.includes('?') ? '&' : '?';
        finalDestination = `${finalDestination}${separator}${extraQuery}`;
      }

      // 6. Action Execution: Reverse Proxy (HTTP 200 OK) vs JavaScript Replace vs Standard 302 Redirect
      const shouldProxyInPlace = result.actionType === 'proxy_safe_page' || result.actionType === 'proxy_target_offer' || result.actionType === 'rewrite';

      if (shouldProxyInPlace) {
        try {
          const streamResult = await ReverseProxyService.fetchAndStreamHtml(finalDestination, {
            customHeaders: {
              'user-agent': req.get('user-agent') || '',
              'accept-language': req.get('accept-language') || ''
            }
          });

          res.removeHeader('Cross-Origin-Opener-Policy');
          res.removeHeader('Cross-Origin-Resource-Policy');
          res.removeHeader('Content-Security-Policy');
          res.removeHeader('X-Frame-Options');

          res.setHeader('Content-Type', streamResult.contentType);
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          return res.status(streamResult.statusCode || 200).send(streamResult.html);
        } catch (proxyErr: any) {
          console.warn('[PublicRoutingController] Reverse proxy direct stream fallback to 302:', proxyErr.message);
        }
      }

      if (result.actionType === 'js_replace') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        const safeUrl = JSON.stringify(finalDestination);
        return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><script>try{window.location.replace(${safeUrl});}catch(e){window.location.href=${safeUrl};}</script></head><body></body></html>`);
      }

      // Default Standard Redirect (302 / 301 / 307)
      const statusCode = result.actionType === 'redirect_301' 
        ? 301 
        : (result.actionType === 'redirect_307' ? 307 : 302);

      // Strip COOP / CSP / X-Frame-Options headers from Helmet that can break cross-origin redirection
      res.removeHeader('Cross-Origin-Opener-Policy');
      res.removeHeader('Cross-Origin-Resource-Policy');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');

      // Add no-cache headers so dynamic routing is re-evaluated on each request
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Location', finalDestination);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      const safeUrl = JSON.stringify(finalDestination);
      return res.status(statusCode).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${finalDestination}">
  <title>Redirecting...</title>
  <script>
    try { window.location.replace(${safeUrl}); } catch(e) { window.location.href = ${safeUrl}; }
  </script>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa;color:#333;">
  <div style="text-align:center;">
    <p style="font-size:14px;margin-bottom:8px;">Redirecting...</p>
    <a href="${finalDestination}" style="font-size:12px;color:#6366f1;text-decoration:none;">Click here if you are not redirected automatically</a>
  </div>
  <script>
    setTimeout(function() {
      try { window.location.replace(${safeUrl}); } catch(e) { window.location.href = ${safeUrl}; }
    }, 100);
  </script>
</body>
</html>`);
    } catch (error: any) {
      console.error('[PublicRoutingController.handleRedirect]', error);
      return res.status(500).send('Routing Error');
    }
  }

  static async handleShieldRoute(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const link = await TrafficLinksService.getLinkBySlug(slug);
      if (!link) {
        return res.status(404).send('Smart Link Not Found');
      }

      const signals = SignalExtractor.extractFromRequest(req);
      const result = DecisionEngine.evaluate(
        {
          id: link.id,
          fallbackUrl: link.fallbackUrl,
          isActive: link.isActive,
          warmupUntil: link.warmupUntil,
          rampUpEnabled: link.rampUpEnabled,
          rampUpDurationHours: link.rampUpDurationHours,
          datacenterBlocked: link.datacenterBlocked,
          createdAt: (link as any).createdAt,
          rules: link.rules
        },
        signals
      );

      // Async log
      setImmediate(async () => {
        try {
          await TrafficAnalyticsService.recordTrafficLog(link.id, result, signals);
        } catch (err) {
          console.error('[PublicRoutingController.shield] Async log error:', err);
        }
      });

      let finalDestination = result.destinationUrl;
      const originalQuery = req.url.includes('?') ? req.url.split('?')[1] : '';
      if (originalQuery) {
        const separator = finalDestination.includes('?') ? '&' : '?';
        finalDestination = `${finalDestination}${separator}${originalQuery}`;
      }

      const html = ClientShieldGenerator.generateShieldHtml({
        slug: link.slug,
        linkName: link.name,
        targetUrl: finalDestination,
        fallbackUrl: link.fallbackUrl,
        datacenterBlocked: link.datacenterBlocked
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.send(html);
    } catch (error: any) {
      console.error('[PublicRoutingController.handleShieldRoute]', error);
      return res.status(500).send('Shield Error');
    }
  }

  // In-memory cache to prevent re-obfuscating scripts on high volume requests
  private static dynamicTagCache = new Map<string, { scriptJs: string; expiresAt: number }>();

  static async handleDynamicTag(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const cleanSlug = slug.replace(/\.js$/, '');
      const link = await TrafficLinksService.getLinkBySlug(cleanSlug);
      if (!link) {
        return res.status(404).type('application/javascript').send('// Smart Link Not Found');
      }

      const host = req.get('host') || 'localhost:4002';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const apiBaseUrl = `${protocol}://${host}`;
      
      const targetUrl = link.rules?.[0]?.destinationUrl || link.fallbackUrl;
      const cacheKey = `${cleanSlug}:${targetUrl}:${apiBaseUrl}`;
      const now = Date.now();
      
      // Cache for 15 minutes to avoid expensive JS obfuscation on every edge hit
      const cached = PublicRoutingController.dynamicTagCache.get(cacheKey);
      let scriptJs = '';
      
      if (cached && cached.expiresAt > now) {
        scriptJs = cached.scriptJs;
      } else {
        scriptJs = ClientShieldGenerator.generateSelfHostedPixelJs({
          slug: link.slug,
          apiBaseUrl,
          targetUrl,
          fallbackUrl: link.fallbackUrl
        });
        
        PublicRoutingController.dynamicTagCache.set(cacheKey, {
          scriptJs,
          expiresAt: now + 15 * 60 * 1000 
        });
      }

      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400'); // Cache at edge/browser level too
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(scriptJs);
    } catch (error: any) {
      console.error('[PublicRoutingController.handleDynamicTag]', error);
      return res.status(500).type('application/javascript').send('// Dynamic Tag Error');
    }
  }

  static async handleEdgeEvaluate(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const cleanSlug = slug.replace(/\.js$/, '');
      const link = await TrafficLinksService.getLinkBySlug(cleanSlug);
      if (!link) {
        return res.status(404).json({ success: false, error: 'Smart Link Not Found' });
      }

      // Merge server-side request signals with client-side hardware telemetry
      const serverSignals = SignalExtractor.extractFromRequest(req);
      const clientBody = req.body || {};

      const effectiveUserAgent = clientBody.userAgent || serverSignals.userAgent;
      const effectiveIp = clientBody.clientIp || serverSignals.ipAddress;
      const effectiveTouchPoints = typeof clientBody.touchPoints === 'number' ? clientBody.touchPoints : serverSignals.touchPoints;
      const effectiveGpuRenderer = clientBody.gpuRenderer || serverSignals.gpuRenderer;

      const mergedSignals = {
        ...serverSignals,
        ipAddress: effectiveIp,
        userAgent: effectiveUserAgent,
        referrer: clientBody.referrer || serverSignals.referrer,
        touchPoints: effectiveTouchPoints,
        gpuRenderer: effectiveGpuRenderer
      };

      // Re-evaluate bot patterns on effective user-agent if provided in client body
      if (clientBody.userAgent) {
        const { deviceType, os, browser } = SignalExtractor.parseClientCharacteristics(effectiveUserAgent);
        mergedSignals.deviceType = deviceType;
        mergedSignals.os = os;
        mergedSignals.browser = browser;

        for (const bot of [
          { name: 'Googlebot', regex: /googlebot/i },
          { name: 'Bingbot', regex: /bingbot/i },
          { name: 'FacebookExternalHit', regex: /facebookexternalhit/i },
          { name: 'Twitterbot', regex: /twitterbot/i },
          { name: 'LinkedInBot', regex: /linkedinbot/i },
          { name: 'PythonRequests', regex: /python-requests/i },
          { name: 'cURL', regex: /curl\//i },
          { name: 'HeadlessChrome', regex: /headlesschrome/i }
        ]) {
          if (bot.regex.test(effectiveUserAgent)) {
            mergedSignals.isBot = true;
            mergedSignals.botName = bot.name;
            break;
          }
        }
      }

      const result = DecisionEngine.evaluate(
        {
          id: link.id,
          fallbackUrl: link.fallbackUrl,
          isActive: link.isActive,
          warmupUntil: link.warmupUntil,
          rampUpEnabled: link.rampUpEnabled,
          rampUpDurationHours: link.rampUpDurationHours,
          datacenterBlocked: link.datacenterBlocked,
          createdAt: (link as any).createdAt,
          rules: link.rules
        },
        mergedSignals
      );

      // Asynchronous traffic logging
      setImmediate(async () => {
        try {
          await TrafficAnalyticsService.recordTrafficLog(link.id, result, mergedSignals);
        } catch (err) {
          console.error('[PublicRoutingController.handleEdgeEvaluate] Log error:', err);
        }
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.json({
        success: true,
        route: result.isFallback ? 'fallback' : 'target',
        destinationUrl: result.destinationUrl,
        matchedRule: result.matchedRuleName || null,
        isBot: Boolean(mergedSignals.isBot || result.datacenterBlocked || mergedSignals.isEmulated),
        latencyMs: result.evaluationLatencyMs
      });
    } catch (error: any) {
      console.error('[PublicRoutingController.handleEdgeEvaluate]', error);
      return res.status(500).json({ success: false, error: 'Evaluation Error' });
    }
  }

  static async handleProxyStream(req: Request, res: Response) {
    try {
      const targetUrl = String(req.query.url || '').trim();
      if (!targetUrl || !ReverseProxyService.isSafeUrl(targetUrl)) {
        return res.status(400).send('Invalid or blocked proxy destination URL');
      }

      const host = req.get('host') || '';
      const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const requestOrigin = host ? `${proto}://${host}` : undefined;

      const streamResult = await ReverseProxyService.fetchAndStreamHtml(targetUrl, {
        requestOrigin,
        customHeaders: {
          'user-agent': req.get('user-agent') || '',
          'accept-language': req.get('accept-language') || ''
        }
      });

      res.removeHeader('Cross-Origin-Opener-Policy');
      res.removeHeader('Cross-Origin-Resource-Policy');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');

      res.setHeader('Content-Type', streamResult.contentType);
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      return res.status(streamResult.statusCode || 200).send(streamResult.html);
    } catch (err: any) {
      console.error('[PublicRoutingController.handleProxyStream]', err);
      return res.status(500).send('Proxy Stream Error: ' + (err.message || 'Internal error'));
    }
  }

  static async handleProxyAsset(req: Request, res: Response) {
    try {
      const assetUrl = String(req.query.url || '').trim();
      if (!assetUrl || !ReverseProxyService.isSafeUrl(assetUrl)) {
        return res.status(400).send('Invalid or blocked asset URL');
      }

      const assetResult = await ReverseProxyService.fetchAndStreamAsset(assetUrl, {
        customHeaders: {
          'user-agent': req.get('user-agent') || '',
          'accept-language': req.get('accept-language') || '',
          'accept': req.get('accept') || '*/*'
        }
      });

      res.removeHeader('Cross-Origin-Opener-Policy');
      res.removeHeader('Cross-Origin-Resource-Policy');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');

      res.setHeader('Content-Type', assetResult.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Timing-Allow-Origin', '*');
      return res.status(assetResult.statusCode || 200).send(assetResult.body);
    } catch (err: any) {
      console.error('[PublicRoutingController.handleProxyAsset]', err);
      return res.status(500).send('Proxy Asset Error: ' + (err.message || 'Internal error'));
    }
  }
}



