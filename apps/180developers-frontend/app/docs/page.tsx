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
  ShieldCheck,
  Users,
  Webhook,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Hash,
  Info,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, OneEightyAuthButton } from '@workspace/ui';

export default function DeveloperDocsPage() {
  const [activeTab, setActiveTab] = useState<'guide' | 'button' | 'redis' | 'ai-prompt' | 'sdk' | 'pay' | 'webhooks' | 'nextauth' | 'node' | 'python' | 'flutter' | 'curl'>('guide');
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
      <div className="space-y-4 pb-6 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xs font-semibold text-blue-600 dark:text-purple-400 hover:underline transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Applications</span>
          </Link>
          <span className="text-zinc-400">•</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Developer Master Documentation & Reference</span>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            180 Identity & 180 Pay Integration Master Guide
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
            The complete, zero-download developer blueprint for integrating <strong>Universal Authentication (180 Identity)</strong> and <strong>1-Click Sovereign Payments (180 Pay)</strong> into any web or mobile application in fewer than 35 lines of code.
          </p>
        </div>

        {/* Quick-Jump Section Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 text-xs border-t border-zinc-100 dark:border-white/5 scrollbar-none">
          <a
            href="#blueprint"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors shrink-0 flex items-center gap-1"
          >
            <Server className="w-3.5 h-3.5 text-purple-500" />
            <span>Blueprint & Ports</span>
          </a>
          <a
            href="#credentials"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors shrink-0 flex items-center gap-1"
          >
            <Key className="w-3.5 h-3.5 text-blue-500" />
            <span>Credentials Master Spec</span>
          </a>
          <a
            href="#properties-deepdive"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors shrink-0 flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Properties Deep Dive</span>
          </a>
          <a
            href="#lifecycle"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition-colors shrink-0 flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>6-Step Lifecycle</span>
          </a>
          <a
            href="#webhook-spec"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors shrink-0 flex items-center gap-1"
          >
            <Webhook className="w-3.5 h-3.5 text-purple-500" />
            <span>Webhook Spec & HMAC</span>
          </a>
          <a
            href="#security-cors"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors shrink-0 flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5 text-rose-500" />
            <span>Redirect URIs & CORS</span>
          </a>
          <a
            href="#env-template"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors shrink-0 flex items-center gap-1"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-500" />
            <span>.env.local Template</span>
          </a>
          <a
            href="#ai-prompt"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 font-semibold transition-colors shrink-0 flex items-center gap-1"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Copilot Prompt</span>
          </a>
          <a
            href="#quickstarts"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors shrink-0 flex items-center gap-1"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Code Quickstarts</span>
          </a>
          <a
            href="#playground"
            className="px-3 py-1.5 min-h-[32px] rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-semibold transition-colors shrink-0 flex items-center gap-1"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Playground</span>
          </a>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 0: ZERO-DOWNLOAD MASTER BLUEPRINT & ARCHITECTURE
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="blueprint" className="space-y-6 pt-2">
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
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400">services.180workspace.com</td>
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
          SECTION 1: APPLICATION REGISTRATION & CREDENTIALS SPECIFICATION
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="credentials" className="space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Application Registration & Credentials Guide
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              The complete reference for application registration properties, client credentials, and webhook endpoints.
            </p>
          </div>
        </div>

        {/* Live App Spotlight Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-black/40 border border-blue-500/20 shadow-md relative overflow-hidden space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Active Reference Implementation
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                Application: <span className="font-mono text-blue-600 dark:text-purple-400">180workspace</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Created and managed directly under owner account <strong className="text-zinc-900 dark:text-white">simplicion</strong> (<code className="text-xs font-mono text-zinc-700 dark:text-zinc-300">simplicion.com@gmail.com</code>).
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Verified in 180 Core DB</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/60 border border-zinc-200 dark:border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-sans font-bold">Client ID</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 truncate select-all">180_client_••••••••••••••••••••••••</span>
                <span className="text-[10px] text-zinc-400 font-sans">See App Console</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/60 border border-zinc-200 dark:border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-sans font-bold">Webhook Secret</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-600 dark:text-purple-400 truncate select-all">whsec_••••••••••••••••••••••••</span>
                <span className="text-[10px] text-zinc-400 font-sans">See App Console</span>
              </div>
            </div>
          </div>
        </div>

        {/* Credentials Breakdown Table */}
        <div className="rounded-3xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] text-xs shadow-sm">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-zinc-950 dark:text-white">Credentials & App Properties Specification</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Zero-Trust Key Management</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="py-3 px-5">Property</th>
                  <th className="py-3 px-5">Example / Format</th>
                  <th className="py-3 px-5">Where It Lives</th>
                  <th className="py-3 px-5">Purpose & Security Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-white/5 font-mono text-zinc-700 dark:text-zinc-300 text-xs">
                <tr>
                  <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">Application Name</td>
                  <td className="py-3 px-5 text-purple-600 dark:text-purple-400 font-mono">My App</td>
                  <td className="py-3 px-5 font-sans text-zinc-500">App Header, Consent Screen</td>
                  <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Public name of your application displayed to users on the 180 Identity consent dialog and transaction invoice.</td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">Owner Account</td>
                  <td className="py-3 px-5 text-blue-600 dark:text-blue-400 font-mono">developer@example.com</td>
                  <td className="py-3 px-5 font-sans text-zinc-500">Developer Session</td>
                  <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">The verified 180 Profile user who owns, configures, and receives payouts for this app.</td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">Client ID</td>
                  <td className="py-3 px-5 text-emerald-600 dark:text-emerald-400 font-mono">180_client_xxxxxxxxxxxx</td>
                  <td className="py-3 px-5 font-sans text-zinc-500"><code className="font-mono text-zinc-700 dark:text-zinc-300">NEXT_PUBLIC_180_CLIENT_ID</code></td>
                  <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400"><strong>Public identifier.</strong> Safe to expose in frontend HTML, Flutter apps, and browser scripts to trigger popups.</td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">Client Secret</td>
                  <td className="py-3 px-5 text-amber-600 dark:text-amber-400 font-mono">180_secret_xxxxxxxxxxxx</td>
                  <td className="py-3 px-5 font-sans text-zinc-500"><code className="font-mono text-zinc-700 dark:text-zinc-300">ONE_EIGHTY_CLIENT_SECRET</code></td>
                  <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400"><strong>Confidential backend secret.</strong> Never expose in client code. Displayed once at creation, hashed with bcrypt in DB. Used in server-to-server token exchange.</td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">Webhook Signing Secret</td>
                  <td className="py-3 px-5 text-purple-600 dark:text-purple-400 font-mono">whsec_xxxxxxxxxxxx</td>
                  <td className="py-3 px-5 font-sans text-zinc-500"><code className="font-mono text-zinc-700 dark:text-zinc-300">ONE_EIGHTY_WEBHOOK_SECRET</code></td>
                  <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Used by your backend to verify HMAC-SHA256 signatures in the <code className="text-emerald-500 font-mono">X-180-Signature</code> header on incoming payment captures.</td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">Payment Webhook URL</td>
                  <td className="py-3 px-5 text-blue-600 dark:text-blue-400 font-mono">https://api.yourdomain.com/webhooks/180-pay</td>
                  <td className="py-3 px-5 font-sans text-zinc-500">App Settings / Console</td>
                  <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">The public HTTPS endpoint where 180 Pay dispatches real-time capture and refund event payloads.</td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">Allowed Redirect URIs</td>
                  <td className="py-3 px-5 text-zinc-600 dark:text-zinc-400 font-mono">http://localhost:3000/callback&#10;https://180workspace.com/callback&#10;https://*.180workspace.com/callback</td>
                  <td className="py-3 px-5 font-sans text-zinc-500">App Settings / Console</td>
                  <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Whitelisted OAuth 2.0 callback URLs. Prevents open redirect attacks. Supports wildcard subdomains (<code className="font-mono">https://*.180workspace.com/callback</code>).</td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-sans font-bold text-zinc-950 dark:text-white">Allowed Origins (CORS)</td>
                  <td className="py-3 px-5 text-zinc-600 dark:text-zinc-400 font-mono">http://localhost:3000&#10;https://180workspace.com&#10;https://*.180workspace.com</td>
                  <td className="py-3 px-5 font-sans text-zinc-500">App Settings / Console</td>
                  <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Whitelisted web domains permitted to make client-side requests and receive cross-window postMessage events.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 2: PROPERTY DEEP-DIVE & SECURITY MODEL
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="properties-deepdive" className="space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Property Deep-Dive & Security Architecture
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Clear rules explaining how each credential behaves and how zero-trust security is guaranteed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Card 1: Client ID vs Client Secret */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-zinc-950 dark:text-white">Client ID vs. Client Secret</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <strong>Client ID</strong> is a public identifier prefixed with <code className="font-mono text-zinc-800 dark:text-zinc-200">180_client_</code>. It is completely safe to embed in your React/Next.js frontend code or mobile builds.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <strong>Client Secret</strong> is a confidential key prefixed with <code className="font-mono text-zinc-800 dark:text-zinc-200">180_secret_</code>. It is shown <em>only once</em> upon app creation and is cryptographically hashed with bcrypt in the 180 Core database. You must store it strictly on your server backend.
            </p>
          </div>

          {/* Card 2: Webhook Secret & HMAC Verification */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold text-zinc-950 dark:text-white">Webhook Signing Secret (`whsec_...`)</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Every payment captured by 180 Pay sends an HTTP POST to your webhook endpoint with an <code className="font-mono text-emerald-500">X-180-Signature</code> header.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Your server computes an HMAC-SHA256 hash of the <strong>raw request body</strong> using your <code className="font-mono text-zinc-800 dark:text-zinc-200">whsec_...</code> secret. If the signatures match in constant time, you know the event originated genuinely from 180 Platform.
            </p>
          </div>

          {/* Card 3: Allowed Redirect URIs */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-zinc-950 dark:text-white">Allowed Redirect URIs & Wildcards</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Strict OAuth 2.0 (RFC 6749) rules require pre-registering callback URLs. The 180 Identity engine rejects any authorization request targeting an unlisted URL.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Supports wildcard subdomains such as <code className="font-mono text-zinc-800 dark:text-zinc-200">https://*.180workspace.com/callback</code> to seamlessly support preview deployments, Vercel branches, and micro-frontends without breaking security.
            </p>
          </div>

          {/* Card 4: Allowed Origins & CORS */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-zinc-950 dark:text-white">Allowed Origins (CORS & PostMessage)</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Controls cross-origin browser communication. When the 180 Profile or 180 Pay popup window completes an operation, it emits a cross-window <code className="font-mono text-zinc-800 dark:text-zinc-200">postMessage</code> event.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              By whitelisting origins like <code className="font-mono text-zinc-800 dark:text-zinc-200">https://180workspace.com</code> and <code className="font-mono text-zinc-800 dark:text-zinc-200">https://*.180workspace.com</code>, unauthorized websites cannot frame your popup or eavesdrop on authentication tokens.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 3: 6-STEP IMPLEMENTATION LIFECYCLE
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="lifecycle" className="space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              6-Step Implementation Lifecycle
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              The end-to-end journey from developer registration to automated revenue payouts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">1</span>
              <h3 className="font-bold text-xs text-zinc-950 dark:text-white">Register in Developer Console</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Open the <strong>"+ Register New App"</strong> slide drawer. Provide your App Name, Redirect URIs, Allowed Origins, and choose Confidential or Public PKCE client type.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">2</span>
              <h3 className="font-bold text-xs text-zinc-950 dark:text-white">Save Secrets (One-Time Reveal)</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Copy your <code className="font-mono text-zinc-700 dark:text-zinc-300">Client Secret</code> and <code className="font-mono text-zinc-700 dark:text-zinc-300">Webhook Secret</code> into your <code className="font-mono text-zinc-700 dark:text-zinc-300">.env</code>. For zero-trust security, raw secrets are never displayed again.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">3</span>
              <h3 className="font-bold text-xs text-zinc-950 dark:text-white">Trigger 180 Identity Popup</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Call <code className="font-mono text-zinc-700 dark:text-zinc-300">use180Identity()</code> or embed <code className="font-mono text-zinc-700 dark:text-zinc-300">&lt;OneEightyAuthButton /&gt;</code> in your UI. Users log in with WhatsApp OTP, Google, or @usernames.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">4</span>
              <h3 className="font-bold text-xs text-zinc-950 dark:text-white">Server-Side Token Exchange</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Your backend exchanges the authorization code for an RS256 JWT access token via <code className="font-mono text-zinc-700 dark:text-zinc-300">POST /api/oauth/token</code> using your Client ID & Secret.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">5</span>
              <h3 className="font-bold text-xs text-zinc-950 dark:text-white">2-Way 180 Pay Webhook Capture</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              When customers complete payments in 180 Pay, our gateway dispatches a webhook to your URL. Verify the HMAC signature with <code className="font-mono text-zinc-700 dark:text-zinc-300">whsec_...</code> before unlocking digital assets.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#101012] border border-zinc-200 dark:border-white/10 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">6</span>
              <h3 className="font-bold text-xs text-zinc-950 dark:text-white">Telemetry & Instant Payouts</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Monitor active users in the Real-Time Auth Stream, inspect webhook latency logs, and withdraw your sovereign wallet revenue directly to your linked bank account or UPI ID.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 4: WEBHOOK SPECIFICATION & HMAC SIGNATURE VERIFICATION
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="webhook-spec" className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Webhook className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                2-Way Webhook Delivery & Cryptographic Verification
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                180 Pay dispatches real-time event payloads signed with HMAC-SHA256 to guarantee order fulfillment.
              </p>
            </div>
          </div>
        </div>

        {/* HTTP Headers Table */}
        <div className="rounded-3xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] text-xs shadow-sm">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="font-bold text-zinc-950 dark:text-white">Incoming Webhook HTTP Headers</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">POST Request</span>
          </div>

          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-semibold">
              <tr>
                <th className="py-3 px-5">Header</th>
                <th className="py-3 px-5">Example Value</th>
                <th className="py-3 px-5">Description & Security Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/5 font-mono text-zinc-700 dark:text-zinc-300 text-xs">
              <tr>
                <td className="py-3 px-5 text-purple-600 dark:text-purple-400 font-bold">X-180-Signature</td>
                <td className="py-3 px-5 text-zinc-500">8f4a13d70b5e4c2...</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Hex-encoded HMAC-SHA256 signature generated across the raw request body using your Webhook Secret.</td>
              </tr>
              <tr>
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400 font-bold">X-180-Timestamp</td>
                <td className="py-3 px-5 text-zinc-500">1727623200</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Unix epoch timestamp when the webhook was generated. Used to reject replay attacks (&gt; 300s drift).</td>
              </tr>
              <tr>
                <td className="py-3 px-5 text-emerald-600 dark:text-emerald-400 font-bold">X-180-Event-Id</td>
                <td className="py-3 px-5 text-zinc-500">evt_98f12a34b5c6</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Unique event identifier. Store in database for strict idempotency to prevent duplicate fulfillment.</td>
              </tr>
              <tr>
                <td className="py-3 px-5 text-zinc-900 dark:text-white font-bold">Content-Type</td>
                <td className="py-3 px-5 text-zinc-500">application/json</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Standard UTF-8 encoded JSON payload format.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* JSON Payload & Verification Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sample JSON Payload */}
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] p-6 space-y-3 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-white">
                  <Code2 className="w-4 h-4 text-purple-500" />
                  <span>Webhook Event Payload (`payment.captured`)</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(webhookPayloadExampleString, 'webhook-payload')}
                  className="px-3 py-1 min-h-[32px] rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  {copiedKey === 'webhook-payload' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'webhook-payload' ? 'Copied' : 'Copy JSON'}</span>
                </Button>
              </div>
              <pre className="text-xs text-zinc-700 dark:text-zinc-300 font-mono bg-zinc-50 dark:bg-black/60 p-4 rounded-2xl border border-zinc-200 dark:border-white/5 overflow-x-auto select-all max-h-[380px]">
                {webhookPayloadExampleString}
              </pre>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 text-[11px] leading-relaxed">
              <strong>Idempotency Rule:</strong> Check whether <code className="font-mono font-bold">data.transactionId</code> has already been fulfilled in your database before granting access.
            </div>
          </div>

          {/* Node.js Verification Snippet */}
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] p-6 space-y-3 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Node.js Express Verification Handler</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(webhookVerificationNodeString, 'webhook-node-verify')}
                  className="px-3 py-1 min-h-[32px] rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  {copiedKey === 'webhook-node-verify' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'webhook-node-verify' ? 'Copied' : 'Copy Node.js'}</span>
                </Button>
              </div>
              <pre className="text-xs text-zinc-700 dark:text-zinc-300 font-mono bg-zinc-50 dark:bg-black/60 p-4 rounded-2xl border border-zinc-200 dark:border-white/5 overflow-x-auto select-all max-h-[380px]">
                {webhookVerificationNodeString}
              </pre>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
              <strong>Raw Body Required:</strong> Never run HMAC against a re-serialized <code className="font-mono">JSON.stringify(req.body)</code>. The signature must be computed on the untouched raw byte buffer.
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 5: ALLOWED REDIRECT URIS, WILDCARDS & CORS ORIGINS MATRIX
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="security-cors" className="space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Allowed Redirect URIs & CORS Security Matrix
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Prevent authorization code theft, open redirect exploits, and malicious cross-origin window eavesdropping.
            </p>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] text-xs shadow-sm">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-500" />
              <span className="font-bold text-zinc-950 dark:text-white">Pattern Matching & Wildcard Rules</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">RFC 6749 Compliant</span>
          </div>

          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-semibold">
              <tr>
                <th className="py-3 px-5">Configured Pattern</th>
                <th className="py-3 px-5">Permitted Examples</th>
                <th className="py-3 px-5">Blocked Examples</th>
                <th className="py-3 px-5">Security Enforcement Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/5 font-mono text-zinc-700 dark:text-zinc-300 text-xs">
              <tr>
                <td className="py-3 px-5 text-emerald-600 dark:text-emerald-400 font-bold">http://localhost:3000/callback</td>
                <td className="py-3 px-5 font-mono text-zinc-600 dark:text-zinc-400">http://localhost:3000/callback</td>
                <td className="py-3 px-5 text-rose-500">http://localhost:8080/callback<br />http://127.0.0.1:3000/callback</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Exact match on host & port. Only allowed in development environments.</td>
              </tr>
              <tr>
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400 font-bold">https://180workspace.com/callback</td>
                <td className="py-3 px-5 font-mono text-zinc-600 dark:text-zinc-400">https://180workspace.com/callback</td>
                <td className="py-3 px-5 text-rose-500">http://180workspace.com/callback<br />https://180workspace.com/login</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Production requires HTTPS. Path must match precisely.</td>
              </tr>
              <tr>
                <td className="py-3 px-5 text-purple-600 dark:text-purple-400 font-bold">https://*.180workspace.com/callback</td>
                <td className="py-3 px-5 font-mono text-zinc-600 dark:text-zinc-400">https://app.180workspace.com/callback<br />https://staging.180workspace.com/callback<br />https://pr-42.180workspace.com/callback</td>
                <td className="py-3 px-5 text-rose-500">https://evil-180workspace.com/callback<br />https://sub.sub.180workspace.com/callback</td>
                <td className="py-3 px-5 font-sans text-zinc-600 dark:text-zinc-400">Wildcard matches single-level subdomains. Protects against domain squatting.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 6: STANDARD ENVIRONMENT FILE TEMPLATE (.env.local)
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="env-template" className="space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Standard Environment Configuration (.env.local)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Drop these variables directly into your root `.env.local` to connect to 180 Core services.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-white">
              <Terminal className="w-4 h-4 text-purple-500" />
              <span>Standard Environment File Template (.env.local)</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(envTemplateString, 'env-template')}
              className="px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              {copiedKey === 'env-template' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'env-template' ? 'Copied' : 'Copy .env Template'}</span>
            </Button>
          </div>
          <pre className="text-xs text-zinc-700 dark:text-zinc-300 font-mono bg-zinc-50 dark:bg-black/60 p-4 rounded-2xl border border-zinc-200 dark:border-white/5 overflow-x-auto select-all">
            {envTemplateString}
          </pre>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 2: AI AGENT / COPILOT ECCENTRIC PROMPT
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
                { id: 'button', label: 'Embeddable Button' },
                { id: 'redis', label: 'Token Lifecycle & Redis' },
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
                  : activeTab === 'button'
                  ? 'OneEightyAuthButton.tsx'
                  : activeTab === 'redis'
                  ? 'redis-session-manager.ts'
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
                else if (activeTab === 'button') code = buttonCode;
                else if (activeTab === 'redis') code = redisCode;
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
            {activeTab === 'button' && buttonCode}
            {activeTab === 'redis' && redisCode}
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

          {/* Live Interactive Embeddable Button Preview */}
          <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>Interactive 180 Profile Button Preview</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Live Component
                  </span>
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  This is the exact official button developers can embed via React or standard &lt;script&gt; tag. Click it to test the popup modal!
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 flex flex-wrap items-center gap-6 justify-center sm:justify-start">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Dark Variant</span>
                <div>
                  <OneEightyAuthButton
                    clientId={testClientId}
                    text="Get Started"
                    variant="dark"
                    scope={testScope}
                    onSuccess={(code) => {
                      toast.success(`Authenticated with 180 Profile! Code: ${code.slice(0, 10)}...`);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Light Variant</span>
                <div>
                  <OneEightyAuthButton
                    clientId={testClientId}
                    text="Sign up"
                    variant="light"
                    scope={testScope}
                    onSuccess={(code) => {
                      toast.success(`Authenticated with 180 Profile! Code: ${code.slice(0, 10)}...`);
                    }}
                  />
                </div>
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

const envTemplateString = `# ─────────────────────────────────────────────────────────────────────────────
# 180 PLATFORM OFFICIAL INTEGRATION CREDENTIALS (.env.local)
# ─────────────────────────────────────────────────────────────────────────────

# Public Client ID (Safe for frontend Next.js, React, Flutter, HTML)
NEXT_PUBLIC_180_CLIENT_ID="180_client_your_client_id"

# Confidential Secrets (Keep strictly on server-side / backend)
ONE_EIGHTY_CLIENT_SECRET="180_secret_your_client_secret"
ONE_EIGHTY_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Gateway Endpoints
NEXT_PUBLIC_180_AUTH_URL="https://profile.180workspace.com"
ONE_EIGHTY_API_URL="https://services.180workspace.com"
NEXT_PUBLIC_180_PAY_URL="https://pay.180workspace.com"
`;

const webhookPayloadExampleString = `{
  "event": "payment.captured",
  "eventId": "evt_98f12a34b5c6",
  "timestamp": "2026-09-29T14:30:00.000Z",
  "data": {
    "transactionId": "txn_89104b2c",
    "orderId": "order_77192",
    "amount": 499.00,
    "currency": "INR",
    "status": "COMPLETED",
    "customer": {
      "id": "290aeceb-4af1-4d20-b190-a0853f177779",
      "username": "founder",
      "email": "customer@example.com"
    },
    "metadata": {
      "planId": "pro_monthly",
      "companyId": "workspace_corp"
    }
  }
}`;

const webhookVerificationNodeString = `import crypto from 'crypto';
import express from 'express';

const app = express();

// CRITICAL: Preserve raw body buffer for HMAC-SHA256 signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));

app.post('/api/v1/wallet/webhooks/180-pay', (req, res) => {
  const signature = req.headers['x-180-signature'] as string;
  const timestamp = req.headers['x-180-timestamp'] as string;
  const webhookSecret = process.env.ONE_EIGHTY_WEBHOOK_SECRET!; // whsec_...

  // 1. Prevent Replay Attacks: Enforce 5-minute (300s) maximum drift
  const currentTime = Math.floor(Date.now() / 1000);
  if (!timestamp || Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
    return res.status(400).send('Webhook timestamp out of tolerance');
  }

  // 2. Compute expected HMAC-SHA256 signature
  const rawBody = (req as any).rawBody;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  // 3. Constant-time comparison to prevent timing side-channel attacks
  const isValid = signature && signature.length === expected.length && 
    crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));

  if (!isValid) {
    return res.status(400).send('Invalid webhook HMAC signature');
  }

  // 4. Idempotently fulfill customer purchase
  const event = req.body;
  if (event.event === 'payment.captured') {
    const { transactionId, amount, customer, metadata } = event.data;
    console.log(\`[180 Pay] Captured ₹\${amount} for \${customer.email} (Txn: \${transactionId})\`);
    // Upgrade database record or grant credits
  }

  // Acknowledge receipt within 2 seconds
  res.status(200).json({ received: true });
});`;

const webhookVerificationPythonString = `import os
import hmac
import hashlib
import time
from fastapi import FastAPI, Request, Header, HTTPException

app = FastAPI()
WEBHOOK_SECRET = os.getenv("ONE_EIGHTY_WEBHOOK_SECRET", "")

@app.post("/api/v1/wallet/webhooks/180-pay")
async def handle_180_pay_webhook(
    request: Request,
    x_180_signature: str = Header(None),
    x_180_timestamp: str = Header(None)
):
    raw_body = await request.body()
    
    # 1. Prevent replay attacks (5 minute threshold)
    if not x_180_timestamp or abs(time.time() - int(x_180_timestamp)) > 300:
        raise HTTPException(status_code=400, detail="Timestamp expired or missing")

    # 2. Compute expected HMAC-SHA256 signature
    expected_sig = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    # 3. Constant-time comparison
    if not x_180_signature or not hmac.compare_digest(x_180_signature, expected_sig):
        raise HTTPException(status_code=400, detail="Invalid HMAC signature")

    # 4. Fulfill order idempotently
    payload = await request.json()
    if payload.get("event") == "payment.captured":
        data = payload.get("data", {})
        print(f"Verified payment: {data.get('transactionId')} for {data.get('customer')}")

    return {"received": True}`;

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
`;


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
curl -X GET https://services.180workspace.com/api/oauth/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`;

const buttonCode = `// ============================================================================
// 180 Profile Embeddable Button (React / Next.js & Plain HTML)
// ============================================================================

// OPTION A: React / Next.js Component (from @workspace/ui)
import { OneEightyAuthButton } from '@workspace/ui';

export function AuthSection() {
  return (
    <div className="flex flex-col gap-4">
      {/* Dark Variant with 'Get Started' and gradient 'with 180 Profile' */}
      <OneEightyAuthButton
        clientId={process.env.NEXT_PUBLIC_180_CLIENT_ID!}
        text="Get Started"
        variant="dark"
        scope="openid identity:read identity:email"
        onSuccess={(code) => {
          console.log('Authorization Code received:', code);
          // Send code to your backend /api/auth/180-callback
        }}
      />

      {/* Light Variant with custom label */}
      <OneEightyAuthButton
        clientId={process.env.NEXT_PUBLIC_180_CLIENT_ID!}
        text="Sign up"
        variant="light"
        scope="openid identity:read identity:email"
        onSuccess={(code) => {
          window.location.href = '/api/auth/callback?code=' + code;
        }}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// OPTION B: Drop-in Vanilla JS (Works on any static HTML / PHP / Ruby site)
// ----------------------------------------------------------------------------
<!-- 1. Include the lightweight button script in <head> or before </body> -->
<script src="https://developers.180workspace.com/sdk/180-auth-button.js" defer></script>

<!-- 2. Drop the button element anywhere in your markup -->
<div 
  data-180-button 
  data-client-id="YOUR_CLIENT_ID"
  data-text="Get Started"
  data-variant="dark"
  data-scope="openid identity:read identity:email"
></div>

<!-- 3. Listen for the native success event -->
<script>
  window.addEventListener('180_AUTH_SUCCESS', function(e) {
    const authCode = e.detail.code;
    console.log('Authenticated! Authorization code:', authCode);
    
    // Send code to backend token exchange endpoint
    fetch('/api/auth/180-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authCode })
    }).then(res => res.json()).then(data => {
      window.location.href = '/dashboard';
    });
  });
</script>`;

const redisCode = `// ============================================================================
// Token Lifecycle, Refresh Tokens & Redis Session Caching
// Minimalist: Powered exclusively by ONE80_CLIENT_ID & ONE80_CLIENT_SECRET
// ============================================================================

import express from 'express';
import { Redis } from 'ioredis';

const app = express();
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// 1. Initial Login: Exchange Code & Cache in Redis
app.post('/api/auth/180-callback', async (req, res) => {
  const { code } = req.body;

  try {
    const tokenRes = await fetch('https://services.180workspace.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.ONE80_CLIENT_ID,
        client_secret: process.env.ONE80_CLIENT_SECRET,
      }),
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) return res.status(400).json(data);

    const { access_token, refresh_token, expires_in, user } = data;

    // Cache Session in Redis with TTL matching JWT expiration (e.g. 1 hour)
    const sessionKey = 'session:' + user.id;
    await redis.set(
      sessionKey,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        name: user.name,
        access_token,
        refresh_token,
        authenticatedAt: new Date().toISOString(),
      }),
      'EX',
      expires_in || 3600
    );

    // Also index refresh token with a longer TTL (e.g. 30 days)
    await redis.set('refresh_token:' + refresh_token, user.id, 'EX', 30 * 86400);

    return res.json({ success: true, user, access_token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Token Lifecycle & Auto-Refresh Middleware
export async function authenticateSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];

  // Try Redis session cache first for fast 0ms offline validation
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const cachedSession = await redis.get('session:' + userId);
    if (cachedSession) {
      req.user = JSON.parse(cachedSession);
      return next();
    }
  }

  // If token expired, trigger Refresh Token Cycle seamlessly
  const refreshToken = req.cookies?.['180_refresh_token'] || req.headers['x-refresh-token'];
  if (refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken as string);
    if (refreshed) {
      res.setHeader('x-refreshed-token', refreshed.access_token);
      req.user = refreshed.user;
      return next();
    }
  }

  return res.status(401).json({ error: 'Session expired. Please re-authenticate.' });
}

// 3. Background Refresh Token Rotator
async function refreshAccessToken(refreshToken: string) {
  const refreshRes = await fetch('https://services.180workspace.com/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.ONE80_CLIENT_ID,
      client_secret: process.env.ONE80_CLIENT_SECRET,
    }),
  });

  if (!refreshRes.ok) return null;
  const data = await refreshRes.json();

  // Update Redis cache with the newly issued access token
  if (data.user?.id) {
    await redis.set(
      'session:' + data.user.id,
      JSON.stringify({ ...data.user, access_token: data.access_token, refresh_token: data.refresh_token }),
      'EX',
      data.expires_in || 3600
    );
  }

  return data;
}

// 4. Session Revocation / Logout (Purge from Redis & Invalidate on 180 Core)
app.post('/api/auth/logout', async (req, res) => {
  const { userId, refreshToken } = req.body;
  if (userId) await redis.del('session:' + userId);
  if (refreshToken) {
    await redis.del('refresh_token:' + refreshToken);
    await fetch('https://services.180workspace.com/api/oauth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: refreshToken,
        client_id: process.env.ONE80_CLIENT_ID,
        client_secret: process.env.ONE80_CLIENT_SECRET,
      }),
    });
  }
  res.json({ success: true, message: 'Logged out cleanly.' });
});`;
