"use client";

import { useState } from 'react';
import { 
  Copy, Check, Shield, Globe, 
  Sparkles, CheckCircle2, AlertCircle,
  Terminal, MonitorSmartphone, Settings2
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
  onDomainUpdated?: () => void;
}

export default function EmbedTagModal({ 
  isOpen, 
  onClose, 
  slug, 
  linkName,
  linkId,
  customDomain,
  onDomainUpdated
}: EmbedTagModalProps) {
  const [activeTab, setActiveTab] = useState<'self_hosted' | 'direct_link'>('self_hosted');
  const [snippetType, setSnippetType] = useState<'html_script' | 'wordpress_php' | 'inline_shield'>('html_script');
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
        'body'     => wp_json_encode([
            'ip'        => $ip,
            'userAgent' => $ua,
            'referrer'  => $ref,
            'url'       => home_url($_SERVER['REQUEST_URI'] ?? '')
        ])
    ]);

    if (!is_wp_error($response)) {
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($body['success']) && ($body['route'] ?? '') === 'target' && !empty($body['destinationUrl'])) {
            wp_redirect($body['destinationUrl'], 302);
            exit;
        }
    }
});
?>`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Copied to clipboard');
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
  const brandedUrl = customDomain ? `https://${customDomain}/${slug}` : null;

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Campaign Deployment"
        description={`${linkName} (/r/${slug})`}
        width="600px"
      >
        <div className="space-y-5">
          {/* Tab Navigation */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('self_hosted')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'self_hosted'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>1. Self-Hosted Tag</span>
            </button>

            <button
              onClick={() => setActiveTab('direct_link')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'direct_link'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MonitorSmartphone className="w-3.5 h-3.5" />
              <span>2. Direct Link</span>
            </button>
          </div>

          {/* TAB 1: SELF-HOSTED PIXEL TAG */}
          {activeTab === 'self_hosted' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Value Proposition Callout */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  Embed on your safe page. Ad review crawlers inspect clean content while real users route seamlessly to your targeted offer.
                </p>
              </div>

              {/* Platform Snippet Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Snippet Format
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSnippetType('html_script')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition ${
                        snippetType === 'html_script'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      HTML Script
                    </button>
                    <button
                      onClick={() => setSnippetType('wordpress_php')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition ${
                        snippetType === 'wordpress_php'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      WordPress PHP
                    </button>
                    <button
                      onClick={() => setSnippetType('inline_shield')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition ${
                        snippetType === 'inline_shield'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Inline Shield
                    </button>
                  </div>
                </div>

                {/* Code Display Card */}
                <div className="relative rounded-xl bg-gray-900 border border-gray-800 text-gray-100 p-3.5 font-mono text-xs overflow-hidden group shadow-sm">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-800 text-[11px] text-gray-400">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {snippetType === 'html_script' && 'HTML Header Embed'}
                        {snippetType === 'wordpress_php' && 'WordPress Hook (functions.php)'}
                        {snippetType === 'inline_shield' && 'Standalone Shield Script'}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        snippetType === 'html_script' ? scriptTagCode :
                        snippetType === 'wordpress_php' ? wordPressPhpCode : inlineShieldCode,
                        'snippet'
                      )}
                      className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1.5 transition font-sans font-medium"
                    >
                      {copiedType === 'snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedType === 'snippet' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <pre className="overflow-x-auto max-h-[140px] text-gray-300 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <code>
                      {snippetType === 'html_script' && scriptTagCode}
                      {snippetType === 'wordpress_php' && wordPressPhpCode}
                      {snippetType === 'inline_shield' && inlineShieldCode}
                    </code>
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

          {/* TAB 2: DIRECT LINK & BRANDED CUSTOM DOMAIN */}
          {activeTab === 'direct_link' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Card 1: Standard Direct Link */}
              <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                      <MonitorSmartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">Direct Smart Link</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Edge redirect with bot cloaking</p>
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

              {/* Card 2: Branded Custom Domain / Platform Subdomain */}
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
