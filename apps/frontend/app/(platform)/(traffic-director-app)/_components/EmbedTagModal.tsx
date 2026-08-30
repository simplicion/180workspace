"use client";

import { useState } from 'react';
import { 
  Copy, Check, Code, Shield, ExternalLink, Globe, 
  Sparkles, CheckCircle2, AlertCircle, HelpCircle, Layers,
  Terminal, MonitorSmartphone, QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';

interface EmbedTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  linkName: string;
}

export default function EmbedTagModal({ isOpen, onClose, slug, linkName }: EmbedTagModalProps) {
  const [activeTab, setActiveTab] = useState<'self_hosted' | 'custom_domain' | 'direct_short'>('self_hosted');
  const [snippetType, setSnippetType] = useState<'html_script' | 'wordpress_php' | 'inline_shield'>('html_script');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    verified: boolean;
    url?: string;
    statusCode?: number;
    latencyMs?: number;
    checks?: Array<{ name: string; status: 'passed' | 'warning' | 'failed'; message: string }>;
    summary?: string;
  } | null>(null);

  const apiBase = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_BACKEND_URL || window.location.origin) 
    : 'https://180workspace.com';

  const scriptTagCode = `<script src="${apiBase}/tag/${slug}.js" async></script>`;
  
  const inlineShieldCode = `<!-- 180workspace Stealth Ad Shield Tag -->
<script>
(function(){
  var bUrl = "${apiBase.replace(/\/+$/, '')}";
  var s = "${slug}";
  var ua = (navigator.userAgent || '').toLowerCase();
  var isMobile = /iphone|ipad|ipod|android|mobile/.test(ua);
  var tp = navigator.maxTouchPoints || 0;
  var hasTouch = ('ontouchstart' in window) || (tp > 0);
  if (navigator.webdriver || (isMobile && !hasTouch && tp === 0)) return;
  fetch(bUrl + '/api/v1/traffic-director/evaluate/' + s, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ touchPoints: tp, referrer: document.referrer || '', url: window.location.href })
  }).then(function(r){ return r.json(); }).then(function(d){
    if (d && d.success && d.route === 'target' && d.destinationUrl) {
      window.location.replace(d.destinationUrl);
    }
  }).catch(function(){});
})();
</script>`;

  const wordPressPhpCode = `<?php
/**
 * 180workspace Traffic Director - Server-Side Safe Page Hook
 * Paste in functions.php or header.php of your WordPress theme
 */
add_action('template_redirect', function() {
    if (is_admin() || wp_doing_ajax() || wp_doing_cron()) return;

    $slug = '${slug}';
    $api_url = '${apiBase.replace(/\/+$/, '')}/api/v1/traffic-director/evaluate/' . $slug;

    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $ref = $_SERVER['HTTP_REFERER'] ?? '';

    $response = wp_remote_post($api_url, [
        'timeout'  => 1.2,
        'headers'  => ['Content-Type' => 'application/json'],
        'body'     => json_encode([
            'clientIp'  => $ip,
            'userAgent' => $ua,
            'referrer'  => $ref,
            'queryParams' => $_GET
        ])
    ]);

    if (!is_wp_error($response)) {
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($data['route']) && $data['route'] === 'target' && !empty($data['destinationUrl'])) {
            wp_redirect($data['destinationUrl'], 302);
            exit;
        }
    }
});
?>`;

  const directUrl = `${apiBase}/r/${slug}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleVerifyInstallation = async () => {
    if (!verificationUrl.trim()) {
      toast.error('Please enter your landing page URL');
      return;
    }

    if (verificationUrl.startsWith('file://') || /^[A-Za-z]:[\\/]/.test(verificationUrl)) {
      setDiagnosticResult({
        verified: false,
        url: verificationUrl,
        summary: 'Local file paths (file://) cannot be verified over network requests.',
        checks: [
          {
            name: 'Local File Notice',
            status: 'failed',
            message: 'Web browsers restrict servers from reading local hard-drive file paths. To test this file, run a local web server (e.g. VS Code Live Server at http://localhost:5500/TEST.HTML or npx serve) and paste the http:// URL here.'
          }
        ]
      });
      toast.error('Local file path detected. Use an HTTP/HTTPS URL.');
      return;
    }

    try {
      setVerifying(true);
      setDiagnosticResult(null);

      const res = await api.post('/api/v1/traffic-director/verify-tag', {
        url: verificationUrl.trim(),
        slug
      });

      setDiagnosticResult(res.data);
      if (res.data?.verified) {
        toast.success('All diagnostics passed! Tag verified.');
      } else {
        toast.error('One or more checks failed');
      }
    } catch (err: any) {
      setDiagnosticResult({
        verified: false,
        summary: 'Verification request encountered an error.',
        checks: [
          {
            name: 'Request Error',
            status: 'failed',
            message: err.response?.data?.error || err.message || 'Unable to communicate with the verification crawler.'
          }
        ]
      });
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Ad Campaign Deployment & Embed Center"
      description={`${linkName} (/r/${slug})`}
      icon={<Code className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
      maxWidth="max-w-2xl"
      position="right"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-gray-400">Zero-footprint stealth evaluation</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-6 p-1">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('self_hosted')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'self_hosted'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>1. Self-Hosted Tag</span>
          </button>

          <button
            onClick={() => setActiveTab('custom_domain')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'custom_domain'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>2. Custom Domain</span>
          </button>

          <button
            onClick={() => setActiveTab('direct_short')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'direct_short'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <MonitorSmartphone className="w-3.5 h-3.5" />
            <span>3. Direct Link</span>
          </button>
        </div>

        {/* TAB 1: SELF-HOSTED PIXEL TAG (METHOD 1) */}
        {activeTab === 'self_hosted' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Value Proposition Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                  The #1 Gold Standard for Meta & Google Ads
                </h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Run ads with <strong>your own domain</strong> (e.g. <code className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-gray-800 font-mono text-[11px]">https://yourbrand.com/promo</code>). 
                Meta review bots inspect your clean, policy-compliant safe page. Real human buyers are instantly routed to your targeted offer with <strong>0 domain mismatch</strong> and <strong>0 redirect footprints</strong>.
              </p>
            </div>

            {/* Platform Snippet Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Select Snippet Format
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSnippetType('html_script')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                      snippetType === 'html_script'
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    HTML / Shopify
                  </button>
                  <button
                    onClick={() => setSnippetType('inline_shield')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                      snippetType === 'inline_shield'
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Inline Fast Tag
                  </button>
                  <button
                    onClick={() => setSnippetType('wordpress_php')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                      snippetType === 'wordpress_php'
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    WordPress PHP
                  </button>
                </div>
              </div>

              {/* Code Display Card */}
              <div className="relative rounded-2xl bg-gray-950 text-gray-100 p-4 font-mono text-xs overflow-hidden border border-gray-800 shadow-inner">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-800 text-[11px] text-gray-400">
                  <span>
                    {snippetType === 'html_script' && 'Insert inside the <head> of your safe landing page'}
                    {snippetType === 'inline_shield' && 'Self-contained inline script (Works on Webflow, ClickFunnels, Next.js)'}
                    {snippetType === 'wordpress_php' && 'Paste in your WordPress theme functions.php or header.php'}
                  </span>
                  <button
                    onClick={() => {
                      const code = snippetType === 'html_script' ? scriptTagCode : (snippetType === 'inline_shield' ? inlineShieldCode : wordPressPhpCode);
                      copyToClipboard(code, 'snippet');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold flex items-center gap-1 transition"
                  >
                    {copiedType === 'snippet' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy Code
                  </button>
                </div>
                <pre className="overflow-x-auto text-[11px] text-emerald-400 leading-relaxed max-h-48 custom-scrollbar">
                  {snippetType === 'html_script' && scriptTagCode}
                  {snippetType === 'inline_shield' && inlineShieldCode}
                  {snippetType === 'wordpress_php' && wordPressPhpCode}
                </pre>
              </div>
            </div>

            {/* Quick 3-Step Setup Instructions */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                How to deploy in 3 steps:
              </h4>
              <div className="grid grid-cols-1 gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">1</span>
                  <span>Create your compliant Safe Page on your own website (e.g. WordPress, Shopify, or Webflow).</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">2</span>
                  <span>Paste the snippet into the <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-[11px]">&lt;head&gt;</code> of that page.</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">3</span>
                  <span>Submit your website URL into Meta/Google Ads Manager. The tag will protect your campaigns automatically.</span>
                </div>
              </div>
            </div>

            {/* Live Tag Installation Tester */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">Verify Tag Installation</h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter your landing page URL to test if the tag is correctly installed and communicating with the edge decision engine.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://yourdomain.com/landing-page"
                  value={verificationUrl}
                  onChange={(e) => setVerificationUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  onClick={handleVerifyInstallation}
                  disabled={verifying}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shrink-0 active:scale-95 transition disabled:opacity-50"
                >
                  {verifying ? 'Checking...' : 'Verify Tag'}
                </button>
              </div>

              {diagnosticResult && (
                <div className="space-y-3 pt-1">
                  {/* Summary Header */}
                  <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    diagnosticResult.verified 
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200'
                  }`}>
                    {diagnosticResult.verified ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">
                          {diagnosticResult.verified ? '100% Verification Passed' : 'Verification Issue Detected'}
                        </span>
                        {diagnosticResult.statusCode && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/70 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                            HTTP {diagnosticResult.statusCode} · {diagnosticResult.latencyMs}ms
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed">{diagnosticResult.summary}</p>
                    </div>
                  </div>

                  {/* Multi-Point Checklist Breakdown */}
                  {diagnosticResult.checks && diagnosticResult.checks.length > 0 && (
                    <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Diagnostic Breakdown:
                      </div>
                      <div className="space-y-2">
                        {diagnosticResult.checks.map((check, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            {check.status === 'passed' && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            )}
                            {check.status === 'warning' && (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            {check.status === 'failed' && (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900 dark:text-white">{check.name}: </span>
                              <span className="text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">{check.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM BRAND DOMAIN (CNAME) */}
        {activeTab === 'custom_domain' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                  Branded Tracking Domain
                </h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Connect your branded subdomain (e.g. <code className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 font-mono text-[11px]">go.yourbrand.com</code>) so all your smart links appear 100% native to your company.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="font-bold text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Step 1: Configure DNS CNAME Record</span>
                  <span className="text-[10px] text-indigo-600 font-mono">DNS Manager</span>
                </div>
                <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-[11px]">
                  <div>Type: <span className="font-bold text-gray-900 dark:text-white">CNAME</span></div>
                  <div>Name: <span className="font-bold text-gray-900 dark:text-white">go</span></div>
                  <div>Target: <span className="font-bold text-indigo-600">traffic.180workspace.com</span></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="font-bold text-gray-900 dark:text-white">
                  Step 2: Your Generated Branded URL
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://go.yourdomain.com/${slug}`}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200"
                  />
                  <button
                    onClick={() => copyToClipboard(`https://go.yourdomain.com/${slug}`, 'custom')}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
                  >
                    {copiedType === 'custom' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT SHORT LINK */}
        {activeTab === 'direct_short' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    <MonitorSmartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Direct Smart Link (/r/:slug)</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sub-3ms Edge HTTP 302 Redirect with ASN & Geolocation Firewall</p>
                  </div>
                </div>
                <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 font-semibold">
                  Instant Link
                </span>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  readOnly
                  value={directUrl}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 select-all font-semibold"
                />
                <button
                  onClick={() => copyToClipboard(directUrl, 'direct')}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition shadow-sm"
                >
                  {copiedType === 'direct' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Link
                </button>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Use this link directly in emails, SMS broadcasts, QR codes, social media bios, or ad campaign URLs.
              </p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
