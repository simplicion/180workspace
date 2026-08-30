import JavaScriptObfuscator from 'javascript-obfuscator';

/**
 * Client-Side Shield Probe & Dynamic Ad Tag Generator
 * 
 * Delivers lightweight (< 2.5KB) zero-dependency browser telemetry probes
 * that unmask emulated headless cloud scrapers before DOM rendering.
 */

export interface ShieldConfig {
  slug: string;
  linkName?: string;
  targetUrl: string;
  fallbackUrl: string;
  datacenterBlocked?: boolean;
  timeoutMs?: number;
}

export interface EmbedTagConfig {
  slug: string;
  targetUrl: string;
  fallbackUrl: string;
  creativeUrl?: string;
  fallbackCreativeUrl?: string;
  width?: number;
  height?: number;
}

export class ClientShieldGenerator {
  /**
   * Generates a stealth client-side hardware probe page
   */
  static generateShieldHtml(config: ShieldConfig): string {
    const { targetUrl, fallbackUrl, timeoutMs = 800 } = config;
    const safeTarget = JSON.stringify(targetUrl);
    const safeFallback = JSON.stringify(fallbackUrl);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
  <title>Verifying Connection...</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #090d16;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #94a3b8;
      overflow: hidden;
    }
    .shield-container {
      text-align: center;
      padding: 24px;
    }
    .spinner {
      width: 38px;
      height: 38px;
      border: 3px solid rgba(147, 51, 234, 0.15);
      border-top-color: #a855f7;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 0 auto 16px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .label {
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div class="shield-container">
    <div class="spinner"></div>
    <div class="label">Securing verification...</div>
  </div>
  <script>
    (function() {
      var target = ${safeTarget};
      var fallback = ${safeFallback};
      var resolved = false;

      function redirect(url) {
        if (resolved) return;
        resolved = true;
        try {
          window.location.replace(url);
        } catch(e) {
          window.location.href = url;
        }
      }

      // Hard fallback timer
      setTimeout(function() {
        redirect(fallback);
      }, ${timeoutMs});

      try {
        var ua = (navigator.userAgent || '').toLowerCase();
        var isMobileUa = /iphone|ipad|ipod|android|mobile/.test(ua);
        var touchPoints = navigator.maxTouchPoints || 0;
        var hasTouch = ('ontouchstart' in window) || (touchPoints > 0);
        var isWebdriver = navigator.webdriver === true;

        // 1. Webdriver / Automation detection
        if (isWebdriver) {
          return redirect(fallback);
        }

        // 2. Mobile touch consistency check
        if (isMobileUa && !hasTouch && touchPoints === 0) {
          return redirect(fallback);
        }

        // 3. WebGL GPU Hardware check (Catches SwiftShader / CPU software rasterizers)
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        var gpu = '';
        if (gl) {
          var dbg = gl.getExtension('WEBGL_debug_renderer_info');
          if (dbg) {
            gpu = (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
            if (gpu.indexOf('swiftshader') !== -1 || 
                gpu.indexOf('llvmpipe') !== -1 || 
                gpu.indexOf('software rasterizer') !== -1 ||
                gpu.indexOf('virtualbox') !== -1 ||
                gpu.indexOf('vmware') !== -1) {
              return redirect(fallback);
            }
          }
        }

        // 4. Battery API check (Headless clouds often return static 100% charging)
        if (navigator.getBattery) {
          navigator.getBattery().then(function(battery) {
            if (isMobileUa && battery.charging === true && battery.level === 1.0 && screen.width > 1200) {
              return redirect(fallback);
            }
            redirect(target);
          }).catch(function() {
            redirect(target);
          });
        } else {
          redirect(target);
        }
      } catch(err) {
        redirect(fallback);
      }
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Generates a stealth, zero-footprint JavaScript snippet for embedding in the <head>
   * of an advertiser's self-hosted safe page on their own domain.
   */
  static generateSelfHostedPixelJs(config: { slug: string; apiBaseUrl: string; targetUrl?: string; fallbackUrl?: string }): string {
    const { slug, apiBaseUrl } = config;
    const safeBaseUrl = JSON.stringify(apiBaseUrl.replace(/\/+$/, ''));
    const safeSlug = JSON.stringify(slug);

    const rawScript = `(function() {
  'use strict';
  try {
    var bUrl = ${safeBaseUrl};
    var s = ${safeSlug};
    var ua = (navigator.userAgent || '').toLowerCase();
    var isMobile = /iphone|ipad|ipod|android|mobile/.test(ua);
    var tp = navigator.maxTouchPoints || 0;
    var hasTouch = ('ontouchstart' in window) || (tp > 0);
    var isWd = navigator.webdriver === true || !!window.__nightmare || !!window._phantom || !!window.callPhantom;

    // If running inside a reverse-proxy sandbox or frame, don't double-evaluate
    if (window.self !== window.top) {
      return;
    }

    // Fast-path client heuristic check: Bot / Automation detected -> stay on safe page quietly
    if (isWd || (isMobile && !hasTouch && tp === 0)) {
      return;
    }

    // WebGL software renderer verification
    var gpu = '';
    try {
      var cv = document.createElement('canvas');
      var gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
      if (gl) {
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          gpu = (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
          if (gpu.indexOf('swiftshader') !== -1 || gpu.indexOf('llvmpipe') !== -1 || gpu.indexOf('software rasterizer') !== -1) {
            return; // Bot / Cloud sandbox detected -> silent exit
          }
        }
      }
    } catch(e) {}

    // Edge evaluation ping
    var payload = {
      touchPoints: tp,
      gpuRenderer: gpu,
      screenWidth: window.screen ? window.screen.width : 0,
      screenHeight: window.screen ? window.screen.height : 0,
      referrer: document.referrer || '',
      url: window.location.href,
      timezoneOffset: new Date().getTimezoneOffset()
    };

    fetch(bUrl + '/api/v1/traffic-director/evaluate/' + s, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.success && data.route === 'target' && data.destinationUrl) {
        var curUrl = window.location.href;
        var destUrl = data.destinationUrl;
        if (curUrl === destUrl || curUrl.indexOf(destUrl) === 0 || (destUrl.indexOf(window.location.pathname) !== -1 && window.location.pathname !== '/')) {
          return;
        }
        try {
          window.location.replace(data.destinationUrl);
        } catch(err) {
          window.location.href = data.destinationUrl;
        }
      }
    })
    .catch(function() {
      // On network failure or adblocker interception, gracefully remain on safe page
    });
  } catch(fatal) {}
})();`;

    // Aggressively obfuscate the script to bypass static scanners (Meta/Google bots)
    const obfuscated = JavaScriptObfuscator.obfuscate(rawScript, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      debugProtection: false, // Don't crash legit users' devtools
      disableConsoleOutput: true,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: true,
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 5,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayCallsTransformThreshold: 0.75,
      stringArrayEncoding: ['base64', 'rc4'],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 2,
      stringArrayWrappersChainedCalls: true,
      stringArrayWrappersParametersMaxCount: 4,
      stringArrayWrappersType: 'function',
      unicodeEscapeSequence: false
    });

    return obfuscated.getObfuscatedCode();
  }

  /**
   * Generates a drop-in WordPress PHP hook snippet for server-side evaluation
   */
  static generateWordPressPhpSnippet(config: { slug: string; apiBaseUrl: string }): string {
    const { slug, apiBaseUrl } = config;
    return `<?php
/**
 * 180workspace Traffic Director - Server-Side Safe Page Hook
 * Paste inside your active theme's functions.php or header.php
 */
add_action('template_redirect', function() {
    if (is_admin() || wp_doing_ajax() || wp_doing_cron()) {
        return;
    }

    $slug = '${slug}';
    $api_endpoint = '${apiBaseUrl.replace(/\/+$/, '')}/api/v1/traffic-director/evaluate/' . $slug;

    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] 
        ?? $_SERVER['HTTP_X_FORWARDED_FOR'] 
        ?? $_SERVER['REMOTE_ADDR'] 
        ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $ref = $_SERVER['HTTP_REFERER'] ?? '';

    $response = wp_remote_post($api_endpoint, [
        'timeout'     => 1.2,
        'redirection' => 0,
        'httpversion' => '1.1',
        'blocking'    => true,
        'headers'     => ['Content-Type' => 'application/json'],
        'body'        => json_encode([
            'clientIp'    => $ip,
            'userAgent'   => $ua,
            'referrer'    => $ref,
            'queryParams' => $_GET
        ])
    ]);

    if (!is_wp_error($response)) {
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        if (!empty($data['route']) && $data['route'] === 'target' && !empty($data['destinationUrl'])) {
            wp_redirect($data['destinationUrl'], 302);
            exit;
        }
    }
});
?>`;
  }

  /**
   * Generates a pre-click embeddable dynamic ad script
   */
  static generateEmbedTagJs(config: EmbedTagConfig): string {
    const { 
      targetUrl, 
      fallbackUrl, 
      creativeUrl = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80', 
      fallbackCreativeUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
      width = 300, 
      height = 250 
    } = config;

    return `(function() {
  var targetUrl = ${JSON.stringify(targetUrl)};
  var fallbackUrl = ${JSON.stringify(fallbackUrl)};
  var creativeUrl = ${JSON.stringify(creativeUrl)};
  var fallbackCreativeUrl = ${JSON.stringify(fallbackCreativeUrl)};
  var width = ${width};
  var height = ${height};

  var ua = (navigator.userAgent || '').toLowerCase();
  var isMobileUa = /iphone|ipad|ipod|android|mobile/.test(ua);
  var touchPoints = navigator.maxTouchPoints || 0;
  var hasTouch = ('ontouchstart' in window) || (touchPoints > 0);
  var isWebdriver = navigator.webdriver === true;

  var isHuman = !isWebdriver;
  if (isMobileUa && !hasTouch) isHuman = false;

  var dest = isHuman ? targetUrl : fallbackUrl;
  var creative = isHuman ? creativeUrl : fallbackCreativeUrl;

  var container = document.currentScript ? document.currentScript.parentNode : document.body;
  var wrapper = document.createElement('div');
  wrapper.style.width = width + 'px';
  wrapper.style.height = height + 'px';
  wrapper.style.overflow = 'hidden';
  wrapper.style.display = 'inline-block';
  wrapper.style.position = 'relative';

  var link = document.createElement('a');
  link.href = dest;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'block';
  link.style.width = '100%';
  link.style.height = '100%';

  var img = document.createElement('img');
  img.src = creative;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.alt = 'Advertisement';

  link.appendChild(img);
  wrapper.appendChild(link);
  container.appendChild(wrapper);
})();`;
  }
}

