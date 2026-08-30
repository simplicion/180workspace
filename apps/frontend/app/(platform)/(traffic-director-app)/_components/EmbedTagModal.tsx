"use client";

import { useState, useEffect } from 'react';
import { 
  Copy, Check, Shield, Globe, 
  Sparkles, CheckCircle2, AlertCircle,
  Terminal, MonitorSmartphone, Settings2,
  Code2, ChevronDown
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
  // Directly bind active mode to the link's selected strategy
  const isCodeMode = shieldMode === 'client_shield';
  const [deploymentMode, setDeploymentMode] = useState<'code_injection' | 'smart_link'>(
    isCodeMode ? 'code_injection' : 'smart_link'
  );

  useEffect(() => {
    setDeploymentMode(shieldMode === 'client_shield' ? 'code_injection' : 'smart_link');
  }, [shieldMode, isOpen]);

  type SnippetFormat = 'vercel_edge' | 'node_express' | 'wordpress_php' | 'html_script' | 'inline_shield';
  const [snippetType, setSnippetType] = useState<SnippetFormat>('vercel_edge');
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

  const apiBase = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BACKEND_URL || window.location.origin) 
    : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '');

  // 1. Vercel / Next.js / Edge Middleware Snippet
  const vercelEdgeCode = `/**
 * 180workspace Traffic Director - Edge Middleware
 * Place in: \`middleware.js\` (or \`middleware.ts\`) at project root
 * 0% HTML footprint. Intercepts crawlers before HTML is sent.
 */
export const config = {
  matcher: ['/((?!assets|_next|favicon.ico|.*\\\\..*).*)'],
};

export default async function middleware(request) {
  const ip = request.headers.get('cf-connecting-ip') || 
             request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const userAgent = request.headers.get('user-agent') || '';
  const referrer = request.headers.get('referer') || '';
  const url = request.url;

  try {
    const res = await fetch('${apiBase.replace(/\/+$/, '')}/api/v1/traffic-director/evaluate/${slug}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, userAgent, referrer, url }),
      signal: AbortSignal.timeout(1200)
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.route === 'target' && data?.destinationUrl) {
        if (url !== data.destinationUrl && !url.startsWith(data.destinationUrl)) {
          return Response.redirect(data.destinationUrl, 302);
        }
      }
    }
  } catch (err) {
    // Fail-Open: Serves safe page on timeout or error
  }
}`;

  // 2. Node.js / Express Server Middleware Snippet
  const nodeExpressCode = `/**
 * 180workspace Traffic Director - Express.js Middleware
 * Place in: \`server.js\` or \`app.js\` BEFORE page/static routes
 */
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.includes('.')) {
    return next();
  }

  const slug = '${slug}';
  const apiUrl = '${apiBase.replace(/\/+$/, '')}/api/v1/traffic-director/evaluate/' + slug;
  const ip = req.headers['cf-connecting-ip'] || 
             req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.socket?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  const referrer = req.headers['referer'] || '';
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, userAgent, referrer, url: fullUrl }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data?.success && data?.route === 'target' && data?.destinationUrl) {
        if (fullUrl !== data.destinationUrl && !fullUrl.startsWith(data.destinationUrl)) {
          return res.redirect(302, data.destinationUrl);
        }
      }
    }
  } catch (err) {}

  next();
});`;

  // 3. WordPress / PHP Theme Hook Snippet
  const wordPressPhpCode = `<?php
/**
 * 180workspace Traffic Director - WordPress Server Hook
 * Paste at bottom of active theme's \`functions.php\`
 */
add_action('template_redirect', function() {
    if (is_admin() || wp_doing_ajax() || wp_doing_cron()) return;

    $slug = '${slug}';
    $api_url = '${apiBase.replace(/\/+$/, '')}/api/v1/traffic-director/evaluate/' . $slug;
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $ref = $_SERVER['HTTP_REFERER'] ?? '';
    $url = home_url($_SERVER['REQUEST_URI'] ?? '');

    $response = wp_remote_post($api_url, [
        'timeout'  => 1.2,
        'headers'  => ['Content-Type' => 'application/json'],
        'body'     => wp_json_encode(['ip' => $ip, 'userAgent' => $ua, 'referrer' => $ref, 'url' => $url])
    ]);

    if (!is_wp_error($response)) {
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($body['success']) && $body['route'] === 'target' && !empty($body['destinationUrl'])) {
            if ($url !== $body['destinationUrl'] && strpos($url, $body['destinationUrl']) !== 0) {
                wp_redirect($body['destinationUrl'], 302);
                exit;
            }
        }
    }
});
?>`;

  // 4. Dynamic HTML Script Tag Snippet
  const scriptTagCode = `<!-- 180workspace Dynamic Header Tag -->
<script src="${apiBase.replace(/\/+$/, '')}/tag/${slug}.js" async></script>`;

  // 5. Standalone Inline Ad Shield Snippet
  const inlineShieldCode = `<!-- 180workspace Inline Ad Shield (Shopify / Webflow / Wix / HTML) -->
<script>
(function(){
  var bUrl = "${apiBase.replace(/\/+$/, '')}";
  var s = "${slug}";
  var ua = (navigator.userAgent || '').toLowerCase();
  var isMobile = /iphone|ipad|ipod|android|mobile/.test(ua);
  var tp = navigator.maxTouchPoints || 0;
  var hasTouch = ('ontouchstart' in window) || (tp > 0);
  if (navigator.webdriver || (isMobile && !hasTouch && tp === 0) || (window.self !== window.top)) return;

  fetch(bUrl + '/api/v1/traffic-director/evaluate/' + s, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ touchPoints: tp, referrer: document.referrer || '', url: window.location.href })
  }).then(function(r){ return r.json(); }).then(function(d){
    if (d && d.success && d.route === 'target' && d.destinationUrl) {
      var cur = window.location.href.split('#')[0].replace(/\/+$/, '');
      var dest = d.destinationUrl.split('#')[0].replace(/\/+$/, '');
      if (cur === dest || window.location.pathname === dest || cur.indexOf(dest) === 0) return;
      window.location.replace(d.destinationUrl);
    }
  }).catch(function(){});
})();
</script>`;

  const SNIPPET_MAP: Record<SnippetFormat, {
    title: string;
    targetFile: string;
    category: 'Server-Side (100% Invisible)' | 'Client-Side (Quick Setup)';
    badge: string;
    badgeColor: string;
    frameworks: string;
    code: string;
    instructions: string;
  }> = {
    vercel_edge: {
      title: 'Vercel / Next.js Edge Middleware',
      targetFile: 'middleware.js (Project Root)',
      category: 'Server-Side (100% Invisible)',
      badge: 'Recommended for Vercel',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      frameworks: 'Vercel, Next.js, Nuxt, Edge Functions',
      code: vercelEdgeCode,
      instructions: 'Place in middleware.js at the root of your repository. 0% footprint in HTML source code.'
    },
    node_express: {
      title: 'Node.js / Express Server Middleware',
      targetFile: 'server.js / app.js (Before routes)',
      category: 'Server-Side (100% Invisible)',
      badge: 'Server-Side',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      frameworks: 'Express.js, Fastify, NestJS, Node servers',
      code: nodeExpressCode,
      instructions: 'Paste inside your server.js before static files or page routes.'
    },
    wordpress_php: {
      title: 'WordPress / PHP Theme Hook',
      targetFile: 'functions.php (Active Theme)',
      category: 'Server-Side (100% Invisible)',
      badge: 'WordPress Native',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      frameworks: 'WordPress, WooCommerce, Classic PHP',
      code: wordPressPhpCode,
      instructions: 'Paste at the bottom of functions.php in your WordPress theme.'
    },
    html_script: {
      title: 'Dynamic HTML <script> Tag',
      targetFile: 'index.html (<head>)',
      category: 'Client-Side (Quick Setup)',
      badge: 'Quick Tag',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      frameworks: 'Static HTML, Custom CMS, Landing Pages',
      code: scriptTagCode,
      instructions: 'Paste inside the <head> tag of your HTML landing page.'
    },
    inline_shield: {
      title: 'Inline Standalone Ad Shield Tag',
      targetFile: 'Page Settings -> Custom Code (<head>)',
      category: 'Client-Side (Quick Setup)',
      badge: 'No-Code Builders',
      badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      frameworks: 'Shopify, Webflow, Wix, ClickFunnels, Unbounce',
      code: inlineShieldCode,
      instructions: 'Paste into the Custom Code / Header section of your page builder.'
    }
  };

  const currentSnippet = SNIPPET_MAP[snippetType];

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
        title={deploymentMode === 'smart_link' ? 'Smart Link Deployment' : 'Code Injection Deployment'}
        description={`${linkName} (/r/${slug})`}
        maxWidth="max-w-xl"
      >
        <div className="p-5 space-y-4">
          {/* TOP TOGGLE: Only show if link has NOT explicitly chosen a fixed shieldMode */}
          {!isCodeMode ? (
            <div className="grid grid-cols-2 gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <button
                type="button"
                onClick={() => setDeploymentMode('smart_link')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  deploymentMode === 'smart_link'
                    ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-gray-200/60 dark:border-gray-700/60'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Smart Link</span>
              </button>
              <button
                type="button"
                onClick={() => setDeploymentMode('code_injection')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  deploymentMode === 'code_injection'
                    ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-gray-200/60 dark:border-gray-700/60'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Code Injection</span>
              </button>
            </div>
          ) : null}

          {/* VIEW 1: CODE INJECTION (STREAMLINED & ZERO SCROLLBAR TRACKS) */}
          {(deploymentMode === 'code_injection' || isCodeMode) && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Compact Informative Callout */}
              <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Submit your <strong>existing website URL</strong> to ad networks. Real visitors are routed automatically.</span>
              </div>

              {/* Platform / Framework Selector Dropdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Integration Method
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${currentSnippet.badgeColor}`}>
                    {currentSnippet.badge}
                  </span>
                </div>

                {/* Enhanced Slim Dropdown */}
                <div className="relative">
                  <select
                    value={snippetType}
                    onChange={(e) => setSnippetType(e.target.value as SnippetFormat)}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs"
                  >
                    <optgroup label="🌐 Server-Side Integration (100% Stealth)">
                      <option value="vercel_edge">Vercel / Next.js Edge Middleware (middleware.js)</option>
                      <option value="node_express">Node.js / Express Backend (server.js / app.js)</option>
                      <option value="wordpress_php">WordPress Theme Hook (functions.php)</option>
                    </optgroup>
                    <optgroup label="⚡ Client-Side Integration (Quick Tag)">
                      <option value="html_script">Dynamic HTML &lt;script&gt; Tag (index.html)</option>
                      <option value="inline_shield">Inline Standalone Ad Shield (Shopify / Webflow / Wix)</option>
                    </optgroup>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Target File & Framework Helper */}
                <div className="flex items-center justify-between text-[11px] px-0.5 text-gray-500 dark:text-gray-400">
                  <span>File: <code className="font-mono text-gray-800 dark:text-gray-200 font-semibold">{currentSnippet.targetFile}</code></span>
                  <span className="text-[10px] opacity-75">{currentSnippet.frameworks}</span>
                </div>

                {/* Code Display Card (Completely Scrollbar Free) */}
                <div className="rounded-xl bg-gray-950 border border-gray-800 text-gray-100 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-gray-900/90 border-b border-gray-800/90 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-medium text-gray-300 text-xs">{currentSnippet.title}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(currentSnippet.code, 'snippet')}
                      className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                    >
                      {copiedType === 'snippet' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                      {copiedType === 'snippet' ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>

                  <pre 
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    className="p-3.5 overflow-auto max-h-[195px] text-gray-300 text-[11.5px] leading-relaxed select-all [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <code>{currentSnippet.code}</code>
                  </pre>
                </div>
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

          {/* VIEW 2: SMART LINK (DOMAIN & REVERSE PROXY) */}
          {(deploymentMode === 'smart_link' || !isCodeMode) && (
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
