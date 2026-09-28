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
  AlertTriangle,
  Lock,
  Code2,
  Sparkles,
  Search,
  CheckCircle2,
  Users,
  Play,
  Terminal,
  Smartphone,
  Globe,
  Zap,
  RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
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
  metrics: {
    activeTokens: number;
    authorizedUsers: number;
  };
  createdAt: string;
}

export default function DeveloperPortalPage() {
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 180 Identity SSO Hook
  const { launch180Identity, isOpeningIdentity } = use180Identity();

  // Landing Page Interactive Demo Modal State
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoStep, setDemoStep] = useState<'prompt' | 'authenticating' | 'verified'>('prompt');
  const [landingCodeTab, setLandingCodeTab] = useState<'react' | 'nextauth' | 'node' | 'python' | 'flutter'>('nextauth');

  // Create App Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [clientType, setClientType] = useState<'confidential' | 'public'>('confidential');
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
    name: string;
    isPublic: boolean;
  } | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [clientIdCopied, setClientIdCopied] = useState(false);
  const [hasAcknowledgedSecret, setHasAcknowledgedSecret] = useState(false);

  useEffect(() => {
    checkAuthAndFetchApps();

    // Listen for 180_IDENTITY_SUCCESS from popup
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === '180_IDENTITY_SUCCESS') {
        setTimeout(() => checkAuthAndFetchApps(), 1000);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuthAndFetchApps = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : '';

      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/oauth/developer/apps', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error('Failed to load developer applications');
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.apps)) {
        setApps(data.apps);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      console.error('[DeveloperPortal] fetch error:', err);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      toast.error('Application name is required');
      return;
    }

    try {
      setIsCreating(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : '';

      const redirectUris = redirectUrisInput
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      const allowedOrigins = allowedOriginsInput
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);

      // Validate redirect URIs: require https for production (allow localhost/127.0.0.1 or mobile schemes)
      for (const uri of redirectUris) {
        if (!uri.startsWith('http://localhost') && !uri.startsWith('http://127.0.0.1') && !uri.includes('://')) {
          toast.error(`Invalid redirect URI format: ${uri}`);
          setIsCreating(false);
          return;
        }
        if (uri.startsWith('http://') && !uri.startsWith('http://localhost') && !uri.startsWith('http://127.0.0.1')) {
          toast.error('Production redirect URIs must use HTTPS');
          setIsCreating(false);
          return;
        }
      }

      const res = await fetch('/api/oauth/developer/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: appName.trim(),
          description: appDescription.trim(),
          redirectUris,
          allowedOrigins,
          allowedScopes: selectedScopes,
          clientType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create OAuth application');
      }

      setShowCreateModal(false);
      setRevealedCredentials({
        clientId: data.app.clientId,
        clientSecret: data.app.clientSecret,
        name: data.app.name,
        isPublic: clientType === 'public',
      });
      setHasAcknowledgedSecret(false);

      // Reset form
      setAppName('');
      setAppDescription('');
      setRedirectUrisInput('http://localhost:3000/callback');
      setAllowedOriginsInput('http://localhost:3000');

      checkAuthAndFetchApps();
    } catch (err: any) {
      toast.error(err.message || 'Error creating app');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.clientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: LOADING STATE
  // ──────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-400 font-medium tracking-wide">
          Connecting to 180 Developer Console...
        </span>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: DEVELOPER SHOWCASE LANDING (UNAUTHENTICATED)
  // ──────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="space-y-16 py-4">
        {/* Hero Section */}
        <div className="relative text-center max-w-4xl mx-auto space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sovereign Identity for Modern Developers & Startups</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Build with{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              180 Identity
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Add 1-tap WhatsApp OTP, Google login, and universal @usernames to your web or mobile app in minutes.
            Cryptographic RS256 JWKS tokens, RFC 7636 PKCE, and zero credential lock-in.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              disabled={isOpeningIdentity}
              onClick={launch180Identity}
              className="w-full sm:w-auto relative group overflow-hidden rounded-2xl p-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <div className="w-full bg-slate-950/95 group-hover:bg-slate-950/90 rounded-[14px] px-6 py-3.5 flex items-center justify-center gap-3 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-[10px]">
                  180
                </div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  Get started with 180 Identity
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                </span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowDemoModal(true);
                setDemoStep('prompt');
              }}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 text-indigo-400 fill-current" />
              <span>Try Interactive Demo</span>
            </button>

            <Link
              href="/developers/docs"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 text-sm font-medium transition-colors text-center"
            >
              Documentation & SDKs →
            </Link>
          </div>
        </div>

        {/* 4-Card Architecture Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">1-Tap WhatsApp OTP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Native WhatsApp 6-digit OTP delivery powered by MSG91 enterprise templates. Zero password fatigue.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">RS256 Public JWKS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify tokens cryptographically on your server using public RSA-2048 keys from <code className="text-indigo-400">/certs/jwks.json</code> without database hits.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Universal @Usernames</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every verified user retains their globally reserved @username and 180 Profile across 180 Social Studio, Workspace, and your apps.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              <RotateCw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">24-Hr Secret Rotation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rotate client secrets with a 24-hour overlap grace period. Update your production environments with zero user downtime.
            </p>
          </div>
        </div>

        {/* Code Tabs Preview */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Integrate in 2 Lines of Code</h3>
              <p className="text-xs text-slate-400">Copy pre-filled drop-in code for your tech stack</p>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'nextauth', label: 'NextAuth.js' },
                { id: 'react', label: 'Web Drop-in SDK' },
                { id: 'node', label: 'Node.js' },
                { id: 'python', label: 'Python' },
                { id: 'flutter', label: 'Flutter Mobile' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLandingCodeTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    landingCodeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
            {landingCodeTab === 'nextauth' &&
`// [...nextauth]/route.ts
import NextAuth from "next-auth";

export const authOptions = {
  providers: [
    {
      id: "180-identity",
      name: "180 Identity",
      type: "oauth",
      wellKnown: "https://180identity.180workspace.com/.well-known/openid-configuration",
      clientId: process.env.ONE_EIGHTY_CLIENT_ID,
      clientSecret: process.env.ONE_EIGHTY_CLIENT_SECRET,
    },
  ],
};`}
            {landingCodeTab === 'react' &&
`<!-- 1. Include Drop-in SDK in <head> -->
<script src="https://180identity.180workspace.com/sdk/180-identity.js"></script>

<!-- 2. Mount 180 Identity Button -->
<div id="180-btn"></div>
<script>
  OneEightyIdentity.renderButton('180-btn', {
    clientId: 'YOUR_CLIENT_ID',
    uxMode: 'popup',
    onSuccess: (res) => console.log('Auth Code:', res.code)
  });
</script>`}
            {landingCodeTab === 'node' &&
`// Express back-channel code exchange
app.post('/api/auth/callback', async (req, res) => {
  const { code } = req.body;
  const tokenRes = await axios.post('https://180identity.180workspace.com/oauth/token', {
    grant_type: 'authorization_code',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    code,
    redirect_uri: 'https://myapp.com/callback'
  });
  res.json({ token: tokenRes.data.access_token });
});`}
            {landingCodeTab === 'python' &&
`# FastAPI token verification
@app.post("/auth/callback")
async def callback(code: str):
    async with httpx.AsyncClient() as client:
        res = await client.post("https://180identity.180workspace.com/oauth/token", json={
            "grant_type": "authorization_code",
            "client_id": os.getenv("CLIENT_ID"),
            "client_secret": os.getenv("CLIENT_SECRET"),
            "code": code,
            "redirect_uri": "https://myapp.com/callback"
        })
        return res.json()`}
            {landingCodeTab === 'flutter' &&
`// Flutter PKCE Authorization
final url = Uri.parse(
  'https://180identity.180workspace.com/oauth/authorize'
  '?client_id=\${AppConfig.clientId}'
  '&redirect_uri=myapp://oauth-callback'
  '&response_type=code'
  '&code_challenge=\$pkceChallenge'
  '&code_challenge_method=S256',
);
await launchUrl(url, mode: LaunchMode.externalApplication);`}
          </pre>
        </div>

        {/* ─── LIVE INTERACTIVE DEMO MODAL ─── */}
        {showDemoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Play className="w-6 h-6 fill-current" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Live 180 Identity Demo</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Experience how your users will authenticate via the centered popup window.
                </p>
              </div>

              {demoStep === 'prompt' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400">Demo Application</div>
                    <div className="text-sm font-bold text-white">Acme Analytics Platform</div>
                    <div className="text-xs text-indigo-400 font-mono">Scope: openid identity:read identity:email</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDemoStep('authenticating');
                      setTimeout(() => setDemoStep('verified'), 1500);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 cursor-pointer"
                  >
                    Simulate 1-Tap Sign In
                  </button>
                </div>
              )}

              {demoStep === 'authenticating' && (
                <div className="py-8 space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Exchanging PKCE authorization code & verifying RS256 JWKS...</p>
                </div>
              )}

              {demoStep === 'verified' && (
                <div className="space-y-4 animate-in zoom-in-95">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-left space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Authenticated Successfully!</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-300">
                      User: alex@180workspace.com (@alexrivers)<br />
                      Token: RS256 RSA-2048 Cryptographically Valid
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDemoModal(false)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Close Demo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: DEVELOPER CONSOLE DASHBOARD (AUTHENTICATED)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>OAuth Applications</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {apps.length} {apps.length === 1 ? 'App' : 'Apps'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Register and manage your OAuth 2.0 & OpenID Connect client credentials to enable
            Single Sign-On with 180 Identity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Total Applications</div>
          <div className="text-2xl font-black text-white mt-1">{apps.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active OAuth 2.0 Clients</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Authorized Users</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {apps.reduce((acc, a) => acc + (a.metrics?.authorizedUsers || 0), 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Consents granted across apps</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Active Access Tokens</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">
            {apps.reduce((acc, a) => acc + (a.metrics?.activeTokens || 0), 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Issued tokens</div>
        </div>
      </div>

      {/* Search Bar & Quick Docs Link */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter applications by name or client_id..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <Link
          href="/developers/docs"
          className="px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Code2 className="w-4 h-4 text-indigo-400" />
          <span>Integration Guides</span>
        </Link>
      </div>

      {/* Applications Grid */}
      {filteredApps.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No applications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create your first OAuth application to obtain a Client ID and Secret and start
              integrating 180 Identity SSO.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Your First App</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => (
            <Link
              key={app.id}
              href={`/developers/${app.id}`}
              className="group block p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 shadow-lg hover:shadow-indigo-500/10 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-base">
                  {app.name.charAt(0).toUpperCase()}
                </div>
                {app.isVerified && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Verified
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                  <span>{app.name}</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {app.description || 'No description provided'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Client ID:</span>
                  <span className="font-mono text-slate-300 text-[11px] truncate max-w-[150px]">
                    {app.clientId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Secret:</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {app.clientSecretHint ? `••••${app.clientSecretHint}` : 'PKCE Public'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <span>{app.metrics?.authorizedUsers || 0} Users</span>
                <span>•</span>
                <span>{app.redirectUris.length} Redirect {app.redirectUris.length === 1 ? 'URI' : 'URIs'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ─── CREATE APPLICATION MODAL ─────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Register New Application</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generate OAuth 2.0 client credentials for your web, mobile or backend service.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApp} className="space-y-4">
              {/* Client Type Selector */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-300">Client Type</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setClientType('confidential')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      clientType === 'confidential'
                        ? 'bg-indigo-600/15 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Confidential</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Web apps with backend (Next.js, Node, Python). Generates client_secret.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClientType('public')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      clientType === 'public'
                        ? 'bg-indigo-600/15 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Public (PKCE)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Mobile & SPAs (Flutter, React SPA). Enforces RFC 7636 PKCE.
                    </div>
                  </button>
                </div>
              </div>

              {/* App Name */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">Application Name *</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. Acme Analytics Platform"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                />
              </div>

              {/* App Description */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <input
                  type="text"
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  placeholder="Brief description displayed on 180 consent screens"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                />
              </div>

              {/* Redirect URIs */}
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Authorized Redirect URIs (one per line)
                  </label>
                  <span className="text-[10px] text-slate-500">HTTPS required for production</span>
                </div>
                <textarea
                  rows={2}
                  value={redirectUrisInput}
                  onChange={(e) => setRedirectUrisInput(e.target.value)}
                  placeholder="http://localhost:3000/callback&#10;https://myapp.com/callback"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs outline-none focus:border-indigo-500"
                />
              </div>

              {/* Allowed Origins */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">
                  Allowed Web Origins (CORS, one per line)
                </label>
                <textarea
                  rows={2}
                  value={allowedOriginsInput}
                  onChange={(e) => setAllowedOriginsInput(e.target.value)}
                  placeholder="http://localhost:3000&#10;https://myapp.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs outline-none focus:border-indigo-500"
                />
              </div>

              {/* Scopes Selection */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold text-slate-300">Allowed Scopes</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['openid', 'identity:read', 'identity:email', 'identity:phone'].map((scope) => (
                    <label
                      key={scope}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                        selectedScopes.includes(scope)
                          ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span className="font-mono text-[11px]">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Register App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ONE-TIME SECRET REVEAL MODAL ─────────────────────────────────── */}
      {revealedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Application Registered!</h2>
                <p className="text-xs text-slate-400">{revealedCredentials.name}</p>
              </div>
            </div>

            {/* Warning Alert */}
            {revealedCredentials.clientSecret && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Important:</strong> Save your Client Secret now. For security purposes, it
                  is hashed in our database and will <strong>never be shown again</strong>.
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Client ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Client ID
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-mono text-xs text-white select-all">
                    {revealedCredentials.clientId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(revealedCredentials.clientId);
                      setClientIdCopied(true);
                      setTimeout(() => setClientIdCopied(false), 2000);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    {clientIdCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Client Secret (Only for confidential clients) */}
              {revealedCredentials.clientSecret && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Client Secret
                  </label>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-mono text-xs text-emerald-400 select-all font-semibold">
                      {revealedCredentials.clientSecret}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(revealedCredentials.clientSecret!);
                        setSecretCopied(true);
                        setTimeout(() => setSecretCopied(false), 2000);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      {secretCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Acknowledgment Checkbox */}
            {revealedCredentials.clientSecret && (
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={hasAcknowledgedSecret}
                  onChange={(e) => setHasAcknowledgedSecret(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>I have copied and securely saved my Client Secret</span>
              </label>
            )}

            <button
              type="button"
              disabled={revealedCredentials.clientSecret ? !hasAcknowledgedSecret : false}
              onClick={() => setRevealedCredentials(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold text-xs transition-all cursor-pointer"
            >
              Continue to Application Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
