'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Key,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Lock,
  Code2,
  Sparkles,
  Search,
  CheckCircle2,
  Users,
  Play,
  Smartphone,
  Zap,
  RotateCw,
  LogOut,
  User,
  Activity,
  CreditCard,
  Webhook,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  UniversalSkeleton,
  PlatformModal,
  FavoriteButton,
  LogoLoader,
  HelpIcon,
  AILogoIcon,
} from '@workspace/ui';
import { use180Identity } from '@workspace/identity-sdk';

interface DeveloperApp {
  id: string;
  name: string;
  description: string;
  clientId: string;
  clientSecretHint: string;
  redirectUris: string[];
  allowedOrigins: string[];
  allowedScopes: string[];
  isVerified: boolean;
  isActive: boolean;
  enableAuth?: boolean;
  enablePay?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  metrics: {
    activeTokens: number;
    authorizedUsers: number;
  };
  createdAt: string;
}

export default function DeveloperPortalPage() {
  const [apps, setApps] = useState<DeveloperApp[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('180_dev_apps_cache');
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return [];
  });
  const [userProfile, setUserProfile] = useState<{ id: string; name?: string; email?: string; username?: string } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('user');
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('platform_auth_token')
        || localStorage.getItem('auth_token')
        || localStorage.getItem('token')
        || localStorage.getItem('accessToken');
      return !!token;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('platform_auth_token')
        || localStorage.getItem('auth_token')
        || localStorage.getItem('token')
        || localStorage.getItem('accessToken');
      // If no token or if we already have cached user, don't show blocking skeleton
      if (!token) return false;
      const cached = localStorage.getItem('user');
      if (cached) return false;
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState('');

  // 180 Identity SSO Hook
  const { launch180Identity, isOpeningIdentity } = use180Identity();

  // Landing Page Interactive Demo Modal State
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoStep, setDemoStep] = useState<'prompt' | 'authenticating' | 'verified'>('prompt');
  const [landingCodeTab, setLandingCodeTab] = useState<'nextauth' | 'pay' | 'webhook' | 'react' | 'node' | 'python' | 'flutter'>('nextauth');

  // Create App Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [clientType, setClientType] = useState<'confidential' | 'public'>('confidential');
  const [createEnableAuth, setCreateEnableAuth] = useState(true);
  const [createEnablePay, setCreateEnablePay] = useState(true);
  const [createWebhookUrl, setCreateWebhookUrl] = useState('');
  const [redirectUrisInput, setRedirectUrisInput] = useState('http://localhost:3000/callback');
  const [allowedOriginsInput, setAllowedOriginsInput] = useState('http://localhost:3000');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'openid',
    'identity:read',
    'identity:email',
  ]);
  const [isCreating, setIsCreating] = useState(false);

  // One-time Secret Reveal Modal
  const [revealedCredentials, setRevealedCredentials] = useState<{
    clientId: string;
    clientSecret?: string;
    webhookSecret?: string;
    name: string;
    isPublic: boolean;
  } | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [clientIdCopied, setClientIdCopied] = useState(false);
  const [webhookSecretCopied, setWebhookSecretCopied] = useState(false);
  const [hasAcknowledgedSecret, setHasAcknowledgedSecret] = useState(false);

  // Secret Rotation Modal
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [rotatingApp, setRotatingApp] = useState<DeveloperApp | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    checkAuthAndFetchApps();

    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === '180_IDENTITY_SUCCESS') {
        setTimeout(() => checkAuthAndFetchApps(), 300);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getApiBase = () => {
    if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_CORE_BACKEND_URL || 'http://localhost:4003';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:4003' : 'https://api.180workspace.com';
  };

  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 1800): Promise<Response | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (_) {
      clearTimeout(timer);
      return null;
    }
  };

  const checkAuthAndFetchApps = async () => {
    let token = localStorage.getItem('platform_auth_token')
      || localStorage.getItem('auth_token')
      || localStorage.getItem('token')
      || localStorage.getItem('accessToken');

    if (!token && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)platform_auth_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    localStorage.setItem('platform_auth_token', token);

    try {
      const apiBase = getApiBase();

      // Parallel fetch with fast timeout to eliminate slow loading
      const [uRes, appsRes] = await Promise.all([
        fetchWithTimeout(`${apiBase}/api/oauth/userinfo`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchWithTimeout(`${apiBase}/api/v1/identity/developer/apps`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      let user: any = null;
      if (uRes && uRes.ok) {
        user = await uRes.json();
      }

      // Fallback 1: /api/v1/auth/me if userinfo wasn't returned
      if (!user) {
        const meRes = await fetchWithTimeout(`${apiBase}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }, 1200);
        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          user = meData.user || meData;
        }
      }

      // Fallback 2: Cached user in localStorage
      if (!user) {
        try {
          const stored = localStorage.getItem('user');
          if (stored) user = JSON.parse(stored);
        } catch (_) {}
      }

      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setUserProfile(user);
      localStorage.setItem('user', JSON.stringify(user));
      setIsAuthenticated(true);

      // Process developer apps
      let appsList: DeveloperApp[] = [];
      if (appsRes && appsRes.ok) {
        const appsData = await appsRes.json();
        appsList = appsData.apps || [];
      } else {
        // Fallback to oauth developer apps endpoint
        const fallbackAppsRes = await fetchWithTimeout(`${apiBase}/api/oauth/developer/apps`, {
          headers: { Authorization: `Bearer ${token}` },
        }, 1200);
        if (fallbackAppsRes && fallbackAppsRes.ok) {
          const appsData = await fallbackAppsRes.json();
          appsList = appsData.apps || [];
        } else {
          // Keep cached apps if available
          try {
            const cached = localStorage.getItem('180_dev_apps_cache');
            if (cached) appsList = JSON.parse(cached);
          } catch (_) {}
        }
      }

      setApps(appsList);
      if (appsList.length > 0) {
        localStorage.setItem('180_dev_apps_cache', JSON.stringify(appsList));
      }
    } catch (err: any) {
      console.error('[180Developers] Auth fetch error:', err);
      // If we have cached user, maintain authenticated view
      const cached = localStorage.getItem('user');
      if (cached) {
        try {
          setUserProfile(JSON.parse(cached));
          setIsAuthenticated(true);
        } catch (_) {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('platform_auth_token');
    localStorage.removeItem('platform_refresh_token');
    localStorage.removeItem('user');
    document.cookie = 'platform_auth_token=; path=/; max-age=0;';
    setIsAuthenticated(false);
    setApps([]);
    setUserProfile(null);
    toast.success('Signed out of 180 Developers');
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      toast.error('Application name is required');
      return;
    }

    const redirectUris = redirectUrisInput
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    const isProd = window.location.protocol === 'https:';
    for (const uri of redirectUris) {
      if (isProd && !uri.startsWith('https://') && !uri.startsWith('http://localhost') && !uri.startsWith('http://127.0.0.1')) {
        if (!uri.includes('://')) {
          toast.error(`Invalid redirect URI format: ${uri}`);
          return;
        }
        if (clientType === 'confidential' && !uri.startsWith('https://')) {
          toast.error(`Confidential clients require HTTPS redirect URIs in production: ${uri}`);
          return;
        }
      }
    }

    const allowedOrigins = allowedOriginsInput
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);

    setIsCreating(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      let res = await fetch(`${apiBase}/api/v1/identity/developer/apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: appName.trim(),
          description: appDescription.trim(),
          clientType,
          redirectUris,
          allowedOrigins,
          allowedScopes: selectedScopes,
          enableAuth: createEnableAuth,
          enablePay: createEnablePay,
          webhookUrl: createWebhookUrl.trim(),
        }),
      });

      if (!res.ok) {
        res = await fetch(`${apiBase}/api/oauth/developer/apps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: appName.trim(),
            description: appDescription.trim(),
            clientType,
            redirectUris,
            allowedOrigins,
            allowedScopes: selectedScopes,
            enableAuth: createEnableAuth,
            enablePay: createEnablePay,
            webhookUrl: createWebhookUrl.trim(),
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to register application');
      }

      toast.success('Application created successfully!');
      setShowCreateModal(false);

      setRevealedCredentials({
        clientId: data.app?.clientId || data.clientId,
        clientSecret: data.app?.clientSecret || data.clientSecret,
        webhookSecret: data.app?.webhookSecret || data.webhookSecret,
        name: data.app?.name || data.name,
        isPublic: clientType === 'public',
      });
      setHasAcknowledgedSecret(false);
      setSecretCopied(false);
      setClientIdCopied(false);
      setWebhookSecretCopied(false);

      setAppName('');
      setAppDescription('');
      setCreateEnableAuth(true);
      setCreateEnablePay(true);
      setCreateWebhookUrl('');
      setRedirectUrisInput('http://localhost:3000/callback');
      setAllowedOriginsInput('http://localhost:3000');

      checkAuthAndFetchApps();
    } catch (err: any) {
      toast.error(err.message || 'Creation failed');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRotateSecret = async () => {
    if (!rotatingApp) return;
    setIsRotating(true);

    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      let res = await fetch(`${apiBase}/api/v1/identity/developer/apps/${rotatingApp.id}/rotate-secret`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        res = await fetch(`${apiBase}/api/oauth/developer/apps/${rotatingApp.id}/rotate-secret`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Secret rotation failed');
      }

      toast.success('Secret rotated! 24-hr zero-downtime grace period activated.');
      setShowRotateModal(false);

      setRevealedCredentials({
        clientId: rotatingApp.clientId,
        clientSecret: data.clientSecret,
        name: rotatingApp.name,
        isPublic: false,
      });
      setHasAcknowledgedSecret(false);
      setSecretCopied(false);

      checkAuthAndFetchApps();
    } catch (err: any) {
      toast.error(err.message || 'Rotation failed');
    } finally {
      setIsRotating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'client' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'client') {
      setClientIdCopied(true);
      setTimeout(() => setClientIdCopied(false), 2000);
    } else {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
    toast.success('Copied to clipboard');
  };

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.clientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADING STATE (Universal Skeleton per UI Architecture Rule #5)
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto py-8">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-4 w-96 bg-zinc-200/70 dark:bg-zinc-800/60 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <UniversalSkeleton type="metrics" />
          <UniversalSkeleton type="metrics" />
          <UniversalSkeleton type="metrics" />
        </div>
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 shadow-sm">
          <UniversalSkeleton type="table" />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UNAUTHENTICATED STATE: SHOWCASE LANDING PAGE (SaaS Pro Max & Obsidian Dark)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="space-y-24 py-8">
        {/* Hero Section */}
        <section className="relative text-center max-w-4xl mx-auto space-y-8 pt-6">
          {/* Subtle glow in background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
            Agentic Infrastructure • Universal Identity & 1-Click Payments
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.1]">
            Build on <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-zinc-900 dark:from-blue-400 dark:via-indigo-300 dark:to-white bg-clip-text text-transparent">180 Core</span>.
            <br />
            Identity, Payments & Agentic Infra.
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            One universal Client ID powers <strong>180 Identity</strong> (1-tap WhatsApp OTP, Google SSO, RS256 JWKS) and <strong>180 Pay</strong> (1-click checkout popups, sovereign wallet settlements, and 2-way signed verification webhooks).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {/* Primary Action: Get started with 180 Identity SSO Button */}
            <Button
              onClick={() => launch180Identity(() => checkAuthAndFetchApps())}
              disabled={isOpeningIdentity}
              size="lg"
              className="w-full sm:w-auto rounded-2xl px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base shadow-lg shadow-blue-600/25 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer"
            >
              {isOpeningIdentity ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting to 180 Core...</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                    <span className="font-bold text-xs text-white">180</span>
                  </div>
                  <span>Sign In with 180 ID</span>
                  <ArrowRight className="w-4 h-4 text-blue-200" />
                </>
              )}
            </Button>

            {/* Interactive Demo Action */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setShowDemoModal(true);
                setDemoStep('prompt');
              }}
              className="w-full sm:w-auto rounded-2xl px-8 py-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-semibold text-base shadow-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Try Interactive Demo</span>
            </Button>
          </div>

          {/* Quick Metrics Grid (Conforming to CSS Grid Rule in design-system.md) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 text-left">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1 backdrop-blur-md">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">RS256</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Asymmetric JWKS Keys</div>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1 backdrop-blur-md">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400">1-Click</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">180 Pay Popup Checkout</div>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1 backdrop-blur-md">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">2-Way</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Signed Webhook Verification</div>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1 backdrop-blur-md">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400">Single ID</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Multi-Service Capabilities</div>
            </div>
          </div>
        </section>

        {/* Code Preview Section */}
        <section className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">Integrate in Minutes</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Pick your favorite language or product flow</p>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/10 overflow-x-auto">
              {(['nextauth', 'pay', 'webhook', 'react', 'node', 'python', 'flutter'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLandingCodeTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 cursor-pointer ${
                    landingCodeTab === tab
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/5'
                  }`}
                >
                  {tab === 'nextauth' ? 'NextAuth.js' : tab === 'pay' ? '180 Pay (Checkout)' : tab === 'webhook' ? 'Webhooks (Verification)' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Terminal Code Box with Obsidian dark styling for code readability */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 relative overflow-hidden shadow-2xl">
            {/* Terminal Top Window Dots */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-zinc-500">
                  {landingCodeTab === 'nextauth' ? 'authOptions.ts' : landingCodeTab === 'pay' ? 'checkout.ts' : landingCodeTab === 'webhook' ? 'webhook-server.ts' : landingCodeTab === 'react' ? 'index.html' : landingCodeTab === 'node' ? 'server.ts' : landingCodeTab === 'python' ? 'main.py' : 'auth_service.dart'}
                </span>
              </div>
              <button
                onClick={() => {
                  let codeToCopy = '';
                  if (landingCodeTab === 'nextauth') codeToCopy = 'https://180identity.180workspace.com/.well-known/openid-configuration';
                  navigator.clipboard.writeText(codeToCopy);
                  toast.success('Snippet copied');
                }}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>

            <pre className="text-xs sm:text-sm text-zinc-300 overflow-x-auto leading-relaxed font-mono">
              {landingCodeTab === 'nextauth' && `// NextAuth.js OIDC Provider Setup
import NextAuth from 'next-auth';

export const authOptions = {
  providers: [
    {
      id: '180-identity',
      name: '180 Identity',
      type: 'oauth',
      wellKnown: 'https://180identity.180workspace.com/.well-known/openid-configuration',
      clientId: process.env.ONE_EIGHTY_CLIENT_ID,
      clientSecret: process.env.ONE_EIGHTY_CLIENT_SECRET,
      authorization: { params: { scope: 'openid identity:read identity:email' } },
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
};`}
              {landingCodeTab === 'pay' && `// 1. Frontend: Trigger 1-Click 180 Pay Sovereign Checkout Popup
import { OneEightyPay } from '@workspace/identity-sdk';

async function buyProduct() {
  // Step 1: Create session on your backend via 180 Core Backend
  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ amount: 499, title: 'Pro Plan' })
  });
  const { sessionId } = await res.json();

  // Step 2: Open standalone 180 popup checkout
  const payment = await OneEightyPay.checkout({
    sessionId,
    clientId: 'YOUR_CLIENT_ID',
  });

  console.log('Payment Captured in Popup:', payment.transactionId);
}`}
              {landingCodeTab === 'webhook' && `// 2. Developer Backend: 2-Way Payment Verification Webhook Handler
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

app.post('/api/webhooks/180-pay', (req, res) => {
  const signature = req.headers['x-180-signature'];
  const webhookSecret = process.env.ONE_EIGHTY_WEBHOOK_SECRET; // whsec_...

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;
  if (event === 'payment.captured') {
    console.log('Payment confirmed! Unlocking product for:', data.customer.email);
    // Provide subscription / product to user!
  }

  res.json({ received: true });
});`}
              {landingCodeTab === 'react' && `<!-- Drop-in Web SDK in index.html -->
<script src="https://180identity.180workspace.com/sdk/180-identity.js"></script>

<div id="180-identity-btn"></div>
<script>
  OneEightyIdentity.renderButton('180-identity-btn', {
    clientId: 'YOUR_CLIENT_ID',
    onSuccess: (tokens) => {
      console.log('Verified 180 User:', tokens);
    }
  });
</script>`}
              {landingCodeTab === 'node' && `// Node.js Express Back-Channel Token Exchange
app.post('/auth/180/callback', async (req, res) => {
  const { code } = req.body;
  const response = await fetch('https://api.180workspace.com/api/v1/identity/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.ONE_EIGHTY_CLIENT_ID,
      client_secret: process.env.ONE_EIGHTY_CLIENT_SECRET,
      code,
      redirect_uri: 'https://myapp.com/auth/180/callback',
    }),
  });
  const tokens = await response.json();
  res.json({ success: true, tokens });
});`}
              {landingCodeTab === 'python' && `# Python FastAPI Token Exchange
import httpx
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.post("/auth/180/callback")
async def exchange_token(code: str):
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.180workspace.com/api/v1/identity/oauth/token",
            json={
                "grant_type": "authorization_code",
                "client_id": "YOUR_CLIENT_ID",
                "client_secret": "YOUR_CLIENT_SECRET",
                "code": code,
                "redirect_uri": "https://myapp.com/callback",
            },
        )
    return res.json()`}
              {landingCodeTab === 'flutter' && `// Flutter Mobile PKCE Authentication
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

Future<void> signInWith180() async {
  final codeVerifier = generateRandomString(64);
  final codeChallenge = sha256Base64Url(codeVerifier);

  final url = 'https://180identity.180workspace.com/oauth/authorize'
      '?client_id=YOUR_CLIENT_ID'
      '&redirect_uri=myapp://oauth-callback'
      '&response_type=code'
      '&code_challenge=$codeChallenge'
      '&code_challenge_method=S256';

  final result = await FlutterWebAuth2.authenticate(
    url: url,
    callbackUrlScheme: 'myapp',
  );
  final code = Uri.parse(result).queryParameters['code'];
  // Exchange code with code_verifier for access token!
}`}
            </pre>
          </div>
        </section>

        {/* Feature Cards Grid (4 columns CSS Grid conforming to design-system.md) */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Why Developers Build on 180 Core
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Everything you need for agentic infrastructure, auth, and sovereign checkouts</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-3 backdrop-blur-md shadow-sm dark:shadow-none hover:border-blue-500/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-zinc-950 border border-blue-100 dark:border-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-950 dark:text-white text-base">Sovereign Identity</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Users own their digital passport with custom @username, verified WhatsApp phone, and Google single sign-on.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-3 backdrop-blur-md shadow-sm dark:shadow-none hover:border-purple-500/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-zinc-950 border border-purple-100 dark:border-white/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-950 dark:text-white text-base">1-Click 180 Pay</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Seamless checkout popup backed by the Sovereign Wallet. Eliminate customer friction and drop-off.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-3 backdrop-blur-md shadow-sm dark:shadow-none hover:border-emerald-500/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-zinc-950 border border-emerald-100 dark:border-white/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Webhook className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-950 dark:text-white text-base">2-Way Webhooks</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Cryptographically signed HMAC SHA-256 webhooks for real-time payment confirmation and instant fulfillment.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-3 backdrop-blur-md shadow-sm dark:shadow-none hover:border-amber-500/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-zinc-950 border border-amber-100 dark:border-white/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-950 dark:text-white text-base">Single Client ID</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Toggle authentication and payments on or off per application dynamically with zero code changes.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Demo Modal */}
        <PlatformModal
          isOpen={showDemoModal}
          onClose={() => setShowDemoModal(false)}
          title="180 Identity Live Demo"
          icon={Play}
          iconBgClass="bg-blue-500/10"
          iconColorClass="text-blue-600 dark:text-blue-400"
          maxWidthClass="max-w-md"
        >
          {demoStep === 'prompt' && (
            <div className="space-y-4 text-center text-zinc-900 dark:text-white">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-zinc-900 border border-blue-100 dark:border-white/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-zinc-950 dark:text-white">Test the End-User Flow</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Click below to launch the authentic 180 Identity sovereign authentication modal.
                </p>
              </div>
              <Button
                onClick={() => {
                  launch180Identity(() => {
                    setShowDemoModal(false);
                    checkAuthAndFetchApps();
                  });
                }}
                className="w-full py-3.5 min-h-[44px] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Launch 180 Identity Popup</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          )}
        </PlatformModal>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTHENTICATED STATE: DEVELOPER CONSOLE DASHBOARD (SaaS Pro Max & Obsidian)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Console Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Developer Applications
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10">
              {apps.length} {apps.length === 1 ? 'App' : 'Apps'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            <span>Signed in as <strong className="text-zinc-900 dark:text-zinc-200">{userProfile?.name || userProfile?.email || 'Developer'}</strong></span>
            {userProfile?.username && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-mono text-xs">
                @{userProfile.username}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-white/10 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200"
          >
            <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Interactive Playground</span>
          </Link>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New App</span>
          </Button>

          <button
            onClick={handleSignOut}
            title="Sign out of Developer Console"
            className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 shadow-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row (CSS Grid with consistent p-6 padding) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-2 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <span>Total Registered Apps</span>
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">{apps.length}</div>
          <div className="text-[11px] text-zinc-500">Live OAuth 2.0 Clients</div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-2 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <span>Active Tokens Issued</span>
            <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {apps.reduce((sum, a) => sum + (a.metrics?.activeTokens || 0), 0)}
          </div>
          <div className="text-[11px] text-zinc-500">Valid JWT Access Tokens</div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-2 shadow-sm dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <span>Unique Authorized Users</span>
            <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
            {apps.reduce((sum, a) => sum + (a.metrics?.authorizedUsers || 0), 0)}
          </div>
          <div className="text-[11px] text-zinc-500">Distinct 180 Identities</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          placeholder="Filter applications by name or client_id..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 shadow-sm transition-colors"
        />
      </div>

      {/* Application Cards List */}
      {filteredApps.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-12 text-center space-y-4 shadow-sm dark:shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-zinc-900 border border-blue-100 dark:border-white/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Key className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-white">No Applications Found</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
              {searchQuery
                ? 'No registered applications match your search query.'
                : 'You have not registered any applications yet. Register your first OAuth 2.0 client to start building.'}
            </p>
          </div>
          {!searchQuery && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First App</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 space-y-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-white/20 shadow-sm dark:shadow-none transition-all duration-300"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-zinc-950 dark:text-white text-base flex items-center gap-2">
                      <span>{app.name}</span>
                      {app.isVerified && (
                        <span title="Verified App">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                      {app.description || 'No description provided'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <FavoriteButton
                      recordId={app.id}
                      type="Project"
                      label={app.name}
                      href={`/apps/${app.id}`}
                      className="min-h-[36px] min-w-[36px] p-1.5"
                    />
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        app.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {app.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </div>

                {/* Service Capability Status Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border ${
                      app.enableAuth !== false
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-white/5 opacity-60'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    <span>Identity: {app.enableAuth !== false ? 'Enabled' : 'Disabled'}</span>
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border ${
                      app.enablePay !== false
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-white/5 opacity-60'
                    }`}
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>180 Pay: {app.enablePay !== false ? 'Enabled' : 'Disabled'}</span>
                  </span>

                  {app.webhookUrl && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Webhook className="w-3 h-3" />
                      <span>Webhook Configured</span>
                    </span>
                  )}
                </div>

                {/* Client ID & Secret Hint */}
                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Client ID</span>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-300 font-mono">
                      <span className="flex-1 truncate">{app.clientId}</span>
                      <button
                        onClick={() => copyToClipboard(app.clientId, 'client')}
                        className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
                        title="Copy Client ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Client Secret</span>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      <span className="flex-1">
                        {app.clientSecretHint ? `••••••••••••${app.clientSecretHint}` : 'PKCE Public Client (No Secret)'}
                      </span>
                      {app.clientSecretHint && (
                        <button
                          onClick={() => {
                            setRotatingApp(app);
                            setShowRotateModal(true);
                          }}
                          className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Rotate</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scopes */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(app.allowedScopes || []).map((scope) => (
                    <span
                      key={scope}
                      className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[10px] text-zinc-700 dark:text-zinc-300 font-mono"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Created {new Date(app.createdAt).toLocaleDateString()}</span>
                <Link
                  href={`/apps/${app.id}`}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors min-h-[36px] flex items-center"
                >
                  <span>Configure Settings & Webhooks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: CREATE NEW APPLICATION
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New OAuth Application"
        icon={Plus}
        iconBgClass="bg-blue-500/10"
        iconColorClass="text-blue-600 dark:text-blue-400"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleCreateApp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Application Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Mobile App or SaaS Dashboard"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
            <input
              type="text"
              placeholder="Short summary of what this application does"
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Core Services Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Enabled Services & Capabilities</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  createEnableAuth
                    ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-500/50 text-blue-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={createEnableAuth}
                  onChange={(e) => setCreateEnableAuth(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    <span>180 Identity (SSO)</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">WhatsApp OTP, Google, @usernames</div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  createEnablePay
                    ? 'bg-purple-50 dark:bg-purple-600/10 border-purple-500/50 text-purple-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={createEnablePay}
                  onChange={(e) => setCreateEnablePay(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-0 cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                    <span>180 Pay (Checkout)</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Sovereign Wallet & 2-Way Webhooks</div>
                </div>
              </label>
            </div>
          </div>

          {/* Optional Initial Webhook URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Payment Webhook URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://api.myapp.com/webhooks/180-pay"
              value={createWebhookUrl}
              onChange={(e) => setCreateWebhookUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Client Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Application Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClientType('confidential')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] ${
                  clientType === 'confidential'
                    ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-500 text-blue-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs text-zinc-900 dark:text-white">Confidential Client</div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Web apps with secure backends (Node, Next, Python)</div>
              </button>

              <button
                type="button"
                onClick={() => setClientType('public')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] ${
                  clientType === 'public'
                    ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-500 text-blue-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs text-zinc-900 dark:text-white">Public Client (PKCE)</div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Mobile (Flutter, iOS, Android) or SPAs</div>
              </button>
            </div>
          </div>

          {/* Redirect URIs */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Allowed Redirect URIs (One per line)
            </label>
            <textarea
              rows={3}
              value={redirectUrisInput}
              onChange={(e) => setRedirectUrisInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="https://myapp.com/callback&#10;http://localhost:3000/callback"
            />
          </div>

          {/* Allowed Origins */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Allowed Web Origins (CORS)
            </label>
            <textarea
              rows={2}
              value={allowedOriginsInput}
              onChange={(e) => setAllowedOriginsInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="https://myapp.com&#10;http://localhost:3000"
            />
          </div>

          {/* Scopes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Default Authorized Scopes</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'openid', label: 'openid (OIDC Core)' },
                { id: 'identity:read', label: 'identity:read (Name & Profile)' },
                { id: 'identity:email', label: 'identity:email (Verified Email)' },
                { id: 'identity:phone', label: 'identity:phone (WhatsApp Phone)' },
              ].map((scope) => {
                const isSelected = selectedScopes.includes(scope.id);
                return (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedScopes(selectedScopes.filter((s) => s !== scope.id));
                      } else {
                        setSelectedScopes([...selectedScopes, scope.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer min-h-[36px] ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10'
                    }`}
                  >
                    {scope.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              {isCreating ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4" />}
              <span>Register Application</span>
            </Button>
          </div>
        </form>
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: ONE-TIME SECRET REVEAL
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={!!revealedCredentials}
        onClose={() => setRevealedCredentials(null)}
        title="Save Client Credentials"
        icon={Key}
        iconBgClass="bg-amber-500/10"
        iconColorClass="text-amber-600 dark:text-amber-400"
        maxWidthClass="max-w-lg"
      >
        {revealedCredentials && (
          <div className="space-y-6 text-zinc-900 dark:text-white">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {revealedCredentials.isPublic
                ? 'Your public client ID is ready to use in your mobile or single-page application.'
                : 'Your Client Secret and Webhook Secret will only be displayed once. Copy and store them securely in your backend environment variables.'}
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Client ID</span>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono">
                  <span className="flex-1 truncate">{revealedCredentials.clientId}</span>
                  <button
                    onClick={() => copyToClipboard(revealedCredentials.clientId, 'client')}
                    className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Copy Client ID"
                  >
                    {clientIdCopied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!revealedCredentials.isPublic && revealedCredentials.clientSecret && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Client Secret (Never Shown Again)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">ONE_EIGHTY_CLIENT_SECRET</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/50 dark:bg-zinc-900 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 font-mono">
                    <span className="flex-1 break-all select-all">{revealedCredentials.clientSecret}</span>
                    <button
                      onClick={() => copyToClipboard(revealedCredentials.clientSecret!, 'secret')}
                      className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-white cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Copy Secret"
                    >
                      {secretCopied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {revealedCredentials.webhookSecret && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Webhook Signing Secret</span>
                    <span className="text-[10px] text-zinc-500 font-mono">ONE_EIGHTY_WEBHOOK_SECRET</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-500/30 text-xs text-emerald-900 dark:text-emerald-200 font-mono">
                    <span className="flex-1 break-all select-all">{revealedCredentials.webhookSecret}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(revealedCredentials.webhookSecret!);
                        setWebhookSecretCopied(true);
                        toast.success('Webhook Secret copied');
                        setTimeout(() => setWebhookSecretCopied(false), 2000);
                      }}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-white cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Copy Webhook Secret"
                    >
                      {webhookSecretCopied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!revealedCredentials.isPublic && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAcknowledgedSecret}
                  onChange={(e) => setHasAcknowledgedSecret(e.target.checked)}
                  className="mt-0.5 rounded border-amber-500 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>I have securely saved my Client Secret and Webhook Secret. I understand they will not be displayed again.</span>
              </label>
            )}

            <Button
              disabled={!revealedCredentials.isPublic && !hasAcknowledgedSecret}
              onClick={() => setRevealedCredentials(null)}
              className="w-full py-3 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg cursor-pointer"
            >
              Done & Return to Console
            </Button>
          </div>
        )}
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: SECRET ROTATION CONFIRMATION
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showRotateModal && !!rotatingApp}
        onClose={() => setShowRotateModal(false)}
        title="Rotate Client Secret"
        icon={RotateCw}
        iconBgClass="bg-amber-500/10"
        iconColorClass="text-amber-600 dark:text-amber-400"
        maxWidthClass="max-w-md"
      >
        {rotatingApp && (
          <div className="space-y-5 text-zinc-900 dark:text-white">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Rotating the secret generates a new high-entropy secret while preserving the previous secret for a 24-hour grace period to ensure zero downtime.
            </p>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Target App:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{rotatingApp.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Client ID:</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{rotatingApp.clientId}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowRotateModal(false)}
                className="flex-1 py-2.5 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              >
                Cancel
              </Button>
              <Button
                disabled={isRotating}
                onClick={handleRotateSecret}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRotating ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : <RotateCw className="w-4 h-4" />}
                <span>Generate New Secret</span>
              </Button>
            </div>
          </div>
        )}
      </PlatformModal>
    </div>
  );
}
