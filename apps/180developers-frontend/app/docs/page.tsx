'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Play,
  Copy,
  Check,
  Shield,
  Key,
  Globe,
  Sparkles,
  Layers,
  ArrowLeft,
  Terminal,
  Bot,
  Zap,
  CheckCircle2,
  CreditCard,
  Lock,
  ExternalLink,
  Server,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@workspace/ui';

export default function DeveloperDocsPage() {
  const [activeTab, setActiveTab] = useState<'guide' | 'ai-prompt' | 'sdk' | 'pay' | 'webhooks' | 'nextauth' | 'node' | 'python' | 'flutter' | 'curl'>('guide');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Playground state
  const [testClientId, setTestClientId] = useState('180-developer-portal');
  const [testRedirectUri, setTestRedirectUri] = useState('http://localhost:3000/callback');
  const [testScope, setTestScope] = useState('openid identity:read identity:email');
  const [testUxMode, setTestUxMode] = useState<'popup' | 'redirect'>('popup');
  const [testState, setTestState] = useState('xyz_dev_state_981');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getAuthBase = () => {
    if (typeof window === 'undefined') return 'https://auth.180workspace.com';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:3009/auth' : 'https://auth.180workspace.com';
  };

  const generatedAuthUrl = `${getAuthBase()}/authorize?client_id=${encodeURIComponent(
    testClientId
  )}&redirect_uri=${encodeURIComponent(testRedirectUri)}&scope=${encodeURIComponent(
    testScope
  )}&state=${encodeURIComponent(testState)}&response_type=code&ux_mode=${testUxMode}`;

  const launchTestPopup = () => {
    const width = 450;
    const height = 680;
    const left = window.screen.width ? (window.screen.width - width) / 2 : 100;
    const top = window.screen.height ? (window.screen.height - height) / 2 : 100;

    window.open(
      generatedAuthUrl,
      '180_test_auth_popup',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,toolbar=no,resizable=yes`
    );
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="space-y-3 pb-8 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xs font-semibold text-blue-600 dark:text-purple-400 hover:underline transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Applications</span>
          </Link>
          <span className="text-zinc-400">•</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Integration Guides, Port Maps & AI Copilot Prompt</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
          180 Identity & 180 Pay Integration Master Guide
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
          The exact, zero-download developer blueprint for integrating <strong>Universal Authentication (180 Identity)</strong> and <strong>1-Click Sovereign Payments (180 Pay)</strong> into any web or mobile application in fewer than 35 lines of code.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 0: ZERO-DOWNLOAD MASTER BLUEPRINT & ARCHITECTURE
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Zero-Download Integration Blueprint
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Developers never need to download or copy bulky files. All heavy cryptographic operations run securely on 180 Platform Infrastructure.
            </p>
          </div>
        </div>

        {/* 3 Core Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
              01
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Install Lightweight SDK</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Run <code className="font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded">npm install @180workspace/identity-sdk</code> or add a 1-line script tag.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-xs">
              02
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Obtain 3 API Keys</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Create your App in Developer Portal to get <code className="font-mono text-xs">CLIENT_ID</code>, <code className="font-mono text-xs">CLIENT_SECRET</code>, and <code className="font-mono text-xs">WEBHOOK_SECRET</code>.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
              03
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Zero Gateway Friction</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              100% of payment and OTP gateway infrastructure runs securely on 180 Platform. Developers never need to configure individual banking gateways.
            </p>
          </div>
        </div>

        {/* Port Map & Infrastructure Matrix */}
        <div className="rounded-3xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] text-xs shadow-sm">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-500" />
              <span className="font-bold text-zinc-900 dark:text-white">Ecosystem Port & Domain Routing Architecture</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">RFC 6749 & HMAC-SHA256</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-semibold">
              <tr>
                <th className="py-3 px-5">Component</th>
                <th className="py-3 px-5">Local Port</th>
                <th className="py-3 px-5">Production Domain</th>
                <th className="py-3 px-5">Role & Security Responsibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/5 font-mono text-zinc-700 dark:text-zinc-300">
              <tr>
                <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">180 Identity & Payments API</td>
                <td className="py-3 px-5 text-purple-600 dark:text-purple-400">:4003</td>
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400">api.180workspace.com</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">OAuth2/OIDC Engine, Sovereign Double-Entry Ledger, Payment Processing, Webhook Dispatcher</td>
              </tr>
              <tr>
                <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">180 Developer Portal</td>
                <td className="py-3 px-5 text-purple-600 dark:text-purple-400">:3008</td>
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400">developers.180workspace.com</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">App Registration, Client Credentials, Capability Toggles, Webhook Tester</td>
              </tr>
              <tr>
                <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">180 Profile / Wallet</td>
                <td className="py-3 px-5 text-purple-600 dark:text-purple-400">:3009</td>
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400">profile.180workspace.com</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">User Sovereign Wallet, Prepaid Recharge, Connected OAuth Apps & Security</td>
              </tr>
              <tr>
                <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">180 Pay Popup</td>
                <td className="py-3 px-5 text-purple-600 dark:text-purple-400">:3009/checkout</td>
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400">pay.180workspace.com</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">1-Click Sovereign Checkout Popup Window</td>
              </tr>
              <tr>
                <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">Developer's App</td>
                <td className="py-3 px-5 text-zinc-400">Any port (:3000, :8080)</td>
                <td className="py-3 px-5 text-emerald-600 dark:text-emerald-400">developer-site.com</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Calls SDK to open popup, verify tokens, and receive signed webhooks</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 1: AI AGENT / COPILOT ECCENTRIC PROMPT
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1px] shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#101012] rounded-2xl flex items-center justify-center text-purple-400">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2">
                <span>AI Agent Integration Prompt (Cursor / Copilot / ChatGPT)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  1-Click AI Generation
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Copy and paste this exact prompt into your AI coding assistant to auto-generate the complete fullstack integration in your project.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => copyToClipboard(eccentricAiPrompt, 'ai-prompt')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedKey === 'ai-prompt' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'ai-prompt' ? 'Copied to Clipboard!' : 'Copy AI Prompt'}</span>
          </Button>
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-[#101012] p-6 relative overflow-hidden shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-semibold text-purple-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Prompt for Cursor / Claude / ChatGPT / Antigravity
            </span>
            <span className="font-mono text-zinc-500">Markdown Prompt</span>
          </div>

          <pre className="text-xs text-zinc-300 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap bg-black/50 p-4 rounded-2xl border border-white/5">
            {eccentricAiPrompt}
          </pre>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 2: CODE IMPLEMENTATION TABS
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-zinc-900 border border-emerald-100 dark:border-white/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">Code Quickstarts</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Exact snippets for frontend popup triggers, backend token exchange, and signed webhooks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/10 overflow-x-auto">
            {(
              [
                { id: 'guide', label: 'Overview' },
                { id: 'pay', label: '180 Pay (Checkout)' },
                { id: 'webhooks', label: 'Webhooks' },
                { id: 'sdk', label: 'Drop-in JS' },
                { id: 'nextauth', label: 'NextAuth' },
                { id: 'node', label: 'Node.js' },
                { id: 'python', label: 'Python' },
                { id: 'flutter', label: 'Flutter' },
                { id: 'curl', label: 'cURL' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-[#101012] p-6 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-zinc-500">
                {activeTab === 'guide'
                  ? 'integration-summary.ts'
                  : activeTab === 'sdk'
                  ? 'index.html'
                  : activeTab === 'pay'
                  ? 'checkout.tsx'
                  : activeTab === 'webhooks'
                  ? 'webhook-handler.ts'
                  : activeTab === 'nextauth'
                  ? 'route.ts'
                  : activeTab === 'node'
                  ? 'server.js'
                  : activeTab === 'python'
                  ? 'main.py'
                  : activeTab === 'flutter'
                  ? 'auth_service.dart'
                  : 'terminal.sh'}
              </span>
            </div>
            <button
              onClick={() => {
                let code = '';
                if (activeTab === 'guide') code = integrationSummaryCode;
                else if (activeTab === 'sdk') code = dropInJsCode;
                else if (activeTab === 'pay') code = payCheckoutCode;
                else if (activeTab === 'webhooks') code = webhookCode;
                else if (activeTab === 'nextauth') code = nextAuthCode;
                else if (activeTab === 'node') code = nodeCode;
                else if (activeTab === 'python') code = pythonCode;
                else if (activeTab === 'flutter') code = flutterCode;
                else if (activeTab === 'curl') code = curlCode;
                copyToClipboard(code, activeTab);
              }}
              className="px-3.5 py-1.5 min-h-[36px] rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/5 cursor-pointer"
            >
              {copiedKey === activeTab ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === activeTab ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="text-xs text-zinc-300 overflow-x-auto leading-relaxed font-mono">
            {activeTab === 'guide' && integrationSummaryCode}
            {activeTab === 'sdk' && dropInJsCode}
            {activeTab === 'pay' && payCheckoutCode}
            {activeTab === 'webhooks' && webhookCode}
            {activeTab === 'nextauth' && nextAuthCode}
            {activeTab === 'node' && nodeCode}
            {activeTab === 'python' && pythonCode}
            {activeTab === 'flutter' && flutterCode}
            {activeTab === 'curl' && curlCode}
          </pre>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 3: INTERACTIVE OAUTH 2.0 URL BUILDER & PLAYGROUND
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-zinc-900 border border-blue-100 dark:border-white/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">OAuth 2.0 Interactive Playground</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure query parameters and simulate the authorize dialog in real time.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Client ID</label>
              <input
                type="text"
                value={testClientId}
                onChange={(e) => setTestClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Redirect URI</label>
              <input
                type="text"
                value={testRedirectUri}
                onChange={(e) => setTestRedirectUri(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Scope</label>
              <input
                type="text"
                value={testScope}
                onChange={(e) => setTestScope(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">UX Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTestUxMode('popup')}
                  className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    testUxMode === 'popup'
                      ? 'bg-purple-600/15 border-purple-500 text-purple-300'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-white'
                  }`}
                >
                  Popup Modal
                </button>
                <button
                  type="button"
                  onClick={() => setTestUxMode('redirect')}
                  className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    testUxMode === 'redirect'
                      ? 'bg-purple-600/15 border-purple-500 text-purple-300'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-white'
                  }`}
                >
                  Full Redirect
                </button>
              </div>
            </div>
          </div>

          {/* Generated URL Box */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Generated Authorize URL</span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10">
              <span className="flex-1 font-mono text-xs text-purple-400 break-all select-all px-2">
                {generatedAuthUrl}
              </span>
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedAuthUrl, 'url')}
                  className="px-3.5 py-2 min-h-[44px] rounded-xl text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer bg-white dark:bg-zinc-800 border-zinc-200 dark:border-white/10"
                >
                  {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'url' ? 'Copied' : 'Copy URL'}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={launchTestPopup}
                  className="px-4 py-2 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Test in Popup</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE CONSTANTS & AI PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const eccentricAiPrompt = `# AI INSTRUCTION PROMPT: Integrate 180 Identity & 180 Pay in Fullstack App

You are an expert fullstack software engineer. Integrate 180 Workspace's Sovereign Identity (OAuth2 / 180 Identity) and 1-Click Payments (180 Pay) into this application.

## Credentials Required in .env:
NEXT_PUBLIC_180_CLIENT_ID="app_live_your_client_id"
ONE_EIGHTY_CLIENT_SECRET="sec_live_your_client_secret"
ONE_EIGHTY_WEBHOOK_SECRET="whsec_live_your_webhook_secret"

## Dependencies:
Run: \`npm install @180workspace/identity-sdk\`

## Core Endpoints:
- Auth Server: https://auth.180workspace.com
- API Core: https://services.180workspace.com
- Pay Server: https://pay.180workspace.com

## Implementation Steps:
1. **Frontend Authentication (\`components/LoginWith180.tsx\`):**
   - Call \`OneEightyIdentity.openPopup({ clientId, scope: 'openid identity:read identity:email identity:phone' })\`.
   - On success, send returned \`authResponse.code\` to your backend API \`/api/auth/180-callback\`.

2. **Backend Auth Verification (\`app/api/auth/180-callback/route.ts\`):**
   - Exchange authorization \`code\` with \`https://services.180workspace.com/api/oauth/token\` using POST body:
     \`{ grant_type: 'authorization_code', code, client_id, client_secret }\`.
   - Store verified user (\`user.id\`, \`user.email\`, \`user.name\`, \`user.phone\`) in database / session.

3. **Backend Checkout Creation (\`app/api/checkout/create/route.ts\`):**
   - POST to \`https://services.180workspace.com/api/v1/checkout/sessions\` with:
     \`{ amount: 499.00, currency: 'INR', title: 'Product Name', metadata: { userId: '...' } }\`
   - Return \`sessionId\` to frontend.

4. **Frontend 1-Click Checkout (\`components/PayButton.tsx\`):**
   - Fetch \`sessionId\` from backend.
   - Call \`OneEightyPay.checkout({ sessionId })\` to open popup.
   - On completion, redirect user to success page.

5. **Webhook Fulfillment (\`app/api/webhooks/180pay/route.ts\`):**
   - Capture raw body and \`x-180-signature\` header.
   - Verify signature using \`OneEightyPay.webhooks.constructEvent(rawBody, signature, ONE_EIGHTY_WEBHOOK_SECRET)\`.
   - If \`event.type === 'PAYMENT_RECEIVED'\`, fulfill order and grant access in database.

Generate clean TypeScript code with complete error handling and zero layout shifts.`;

const integrationSummaryCode = `// Complete Fullstack 180 Workspace Integration Summary
// ----------------------------------------------------
// 1. Install SDK: npm install @180workspace/identity-sdk

import { OneEightyIdentity, OneEightyPay } from '@180workspace/identity-sdk';

// 2. Trigger Universal Login Popup (Frontend)
export async function loginWith180() {
  const result = await OneEightyIdentity.openPopup({
    clientId: process.env.NEXT_PUBLIC_180_CLIENT_ID!,
    scope: 'openid identity:read identity:email identity:phone',
    onSuccess: async (authResponse) => {
      await fetch('/api/auth/180-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authResponse.code }),
      });
      window.location.reload();
    },
  });
}

// 3. Trigger 1-Click 180 Pay Popup (Frontend)
export async function buyWith180Pay(amount: number) {
  // A. Create checkout session on your backend
  const { sessionId } = await fetch('/api/create-order', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  }).then(r => r.json());

  // B. Open 180 Pay Popup
  await OneEightyPay.checkout({
    sessionId,
    onSuccess: (data) => {
      console.log('Payment Successful:', data.transactionId);
      window.location.href = '/dashboard/success';
    },
  });
}`;

const payCheckoutCode = `// Frontend: Trigger 1-Click 180 Pay Sovereign Checkout Modal
import { OneEightyPay } from '@180workspace/identity-sdk';

export async function handlePurchase() {
  // Step A: Call your backend to create a checkout session
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 499.00, // ₹499 INR
      title: 'Pro Creator Monthly Subscription',
      orderRef: 'ORDER_9841',
    }),
  });

  const { sessionId } = await res.json();

  // Step B: Launch secure 180 Profile popup checkout
  try {
    const paymentResult = await OneEightyPay.checkout({
      sessionId,
    });

    console.log('Payment Successful!', paymentResult);
    window.location.href = '/dashboard/success';
  } catch (err: any) {
    console.error('Payment Failed or Cancelled:', err.message);
  }
}`;

const webhookCode = `// Backend: Verify Cryptographic Webhook Signatures (Express.js / Node)
import express from 'express';
import { OneEightyPay } from '@180workspace/identity-sdk';

const app = express();
// CRITICAL: Ensure raw body is preserved for HMAC-SHA256 verification
app.use(express.json({ verify: (req, res, buf) => { (req as any).rawBody = buf; } }));

app.post('/api/webhooks/180pay', (req, res) => {
  const signature = req.headers['x-180-signature'] as string;
  const webhookSecret = process.env.ONE_EIGHTY_WEBHOOK_SECRET!; // whsec_live_...

  try {
    const event = OneEightyPay.webhooks.constructEvent(
      (req as any).rawBody || req.body,
      signature,
      webhookSecret
    );

    if (event.type === 'PAYMENT_RECEIVED') {
      const { sessionId, amount, metadata, transactionId } = event.data;
      console.log('Payment verified for user:', metadata.userId, 'Amount: ₹' + amount);
      // Upgrade customer account in database!
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send('Webhook Signature Verification Failed');
  }
});`;

const dropInJsCode = `<!-- 1. Include the 180 Identity Drop-in SDK in plain HTML -->
<script src="https://profile.180workspace.com/sdk/180-identity.js"></script>

<!-- 2. Target Button Container -->
<div id="180-identity-container"></div>

<!-- 3. Initialize Button -->
<script>
  OneEightyIdentity.renderButton('180-identity-container', {
    clientId: 'YOUR_CLIENT_ID',
    scope: 'openid identity:read identity:email identity:phone',
    uxMode: 'popup',
    onSuccess: (authResult) => {
      console.log('180 Identity Success!', authResult.code);
      // Send authResult.code to your backend token exchange endpoint!
    },
    onError: (err) => {
      console.error('180 Identity Error:', err);
    }
  });
</script>`;

const nextAuthCode = `// app/api/auth/[...nextauth]/route.ts (Next.js App Router)
import NextAuth, { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: '180-identity',
      name: '180 Identity',
      type: 'oauth',
      wellKnown: 'https://auth.180workspace.com/.well-known/openid-configuration',
      clientId: process.env.ONE_EIGHTY_CLIENT_ID!,
      clientSecret: process.env.ONE_EIGHTY_CLIENT_SECRET!,
      authorization: {
        params: { scope: 'openid identity:read identity:email identity:phone' }
      },
      idToken: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.avatarUrl,
        };
      },
    },
  ],
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };`;

const nodeCode = `// Express.js Backend: Exchange Code for Verified User Identity
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/auth/180-callback', async (req, res) => {
  const { code } = req.body;

  try {
    const tokenResponse = await fetch('https://services.180workspace.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.ONE_EIGHTY_CLIENT_ID,
        client_secret: process.env.ONE_EIGHTY_CLIENT_SECRET,
        code,
      }),
    });

    const data = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.status(400).json(data);
    }

    // Access token is cryptographically signed RS256 JWT
    res.json({ success: true, user: data.user, tokens: data.tokens });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});`;

const pythonCode = `# FastAPI Backend: Exchange Authorization Code
import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class CallbackRequest(BaseModel):
    code: str

@app.post("/api/auth/180-callback")
async def exchange_180_token(payload: CallbackRequest):
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://services.180workspace.com/api/oauth/token",
            json={
                "grant_type": "authorization_code",
                "client_id": os.getenv("ONE_EIGHTY_CLIENT_ID"),
                "client_secret": os.getenv("ONE_EIGHTY_CLIENT_SECRET"),
                "code": payload.code,
            },
        )
        data = res.json()
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=data)
        return data`;

const flutterCode = `// Flutter Mobile: RFC 7636 PKCE Authentication
import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:http/http.dart' as http;

Future<void> signInWith180() async {
  // 1. Generate PKCE Code Verifier & Challenge
  final random = Random.secure();
  final verifierBytes = List<int>.generate(32, (i) => random.nextInt(256));
  final codeVerifier = base64UrlEncode(verifierBytes).replaceAll('=', '');
  
  final challengeBytes = sha256.convert(ascii.encode(codeVerifier)).bytes;
  final codeChallenge = base64UrlEncode(challengeBytes).replaceAll('=', '');

  // 2. Launch 180 Identity Authorize URL
  final authorizeUrl = Uri.https('auth.180workspace.com', '/authorize', {
    'client_id': 'YOUR_PUBLIC_CLIENT_ID',
    'redirect_uri': 'myapp://oauth-callback',
    'response_type': 'code',
    'scope': 'openid identity:read identity:email identity:phone',
    'code_challenge': codeChallenge,
    'code_challenge_method': 'S256',
  });

  final result = await FlutterWebAuth2.authenticate(
    url: authorizeUrl.toString(),
    callbackUrlScheme: 'myapp',
  );

  final code = Uri.parse(result).queryParameters['code'];

  // 3. Exchange Code with code_verifier (No Secret Needed)
  final tokenResponse = await http.post(
    Uri.parse('https://services.180workspace.com/api/oauth/token'),
    body: {
      'grant_type': 'authorization_code',
      'client_id': 'YOUR_PUBLIC_CLIENT_ID',
      'code': code,
      'code_verifier': codeVerifier,
      'redirect_uri': 'myapp://oauth-callback',
    },
  );

  print('Token: \${tokenResponse.body}');
}`;

const curlCode = `# Step 1: Exchange Authorization Code for Access & Refresh Tokens
curl -X POST https://services.180workspace.com/api/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "code": "AUTH_CODE_FROM_USER_CONSENT"
  }'

# Step 2: Fetch Verified User Profile using Bearer Token
curl -X GET https://services.180workspace.com/api/oauth/userinfo \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`;
