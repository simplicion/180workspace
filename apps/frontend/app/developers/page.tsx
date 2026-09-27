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
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [searchQuery, setSearchQuery] = useState('');

  // Create App Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
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
    clientSecret: string;
    name: string;
  } | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [clientIdCopied, setClientIdCopied] = useState(false);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : '';
      const res = await fetch('/api/oauth/developer/apps', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          // If not logged in, prompt to log in via 180 Identity
          window.location.href = '/login?returnUrl=/developers';
          return;
        }
        throw new Error('Failed to load developer applications');
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.apps)) {
        setApps(data.apps);
      }
    } catch (err: any) {
      console.error('[DeveloperPortal] fetch error:', err);
      toast.error(err.message || 'Error fetching apps');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) return;

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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create OAuth application');
      }

      // Close create modal and open secret reveal modal
      setShowCreateModal(false);
      setRevealedCredentials({
        clientId: data.app.clientId,
        clientSecret: data.app.clientSecret,
        name: data.app.name,
      });

      // Reset form
      setAppName('');
      setAppDescription('');
      setRedirectUrisInput('http://localhost:3000/callback');
      setAllowedOriginsInput('http://localhost:3000');

      fetchApps();
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

  return (
    <div className="space-y-8">
      {/* Hero / Header */}
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter applications by name or client_id..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Applications Grid / List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading OAuth applications...</span>
        </div>
      ) : filteredApps.length === 0 ? (
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
                  <span className="text-slate-500">Secret Hint:</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {app.clientSecretHint || '••••••••'}
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
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Register New OAuth App</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Issue client credentials for your web, mobile or backend service.
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
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">Application Name *</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. My Next.js Web App"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <input
                  type="text"
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  placeholder="Brief description shown on consent screens"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">
                  Redirect URIs (one per line)
                </label>
                <textarea
                  rows={2}
                  value={redirectUrisInput}
                  onChange={(e) => setRedirectUrisInput(e.target.value)}
                  placeholder="http://localhost:3000/callback&#10;https://myapp.com/callback"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">
                  Allowed Origins (CORS, one per line)
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
                  {['openid', 'identity:read', 'identity:email', 'identity:phone', 'pitch:read', 'pitch:write'].map((scope) => (
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
                <h2 className="text-lg font-bold text-white">Application Created!</h2>
                <p className="text-xs text-slate-400">{revealedCredentials.name}</p>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Important:</strong> Save your Client Secret now. For security purposes, it
                is hashed in our database and will <strong>never be shown again</strong>.
              </div>
            </div>

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

              {/* Client Secret */}
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
                      navigator.clipboard.writeText(revealedCredentials.clientSecret);
                      setSecretCopied(true);
                      setTimeout(() => setSecretCopied(false), 2000);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    {secretCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRevealedCredentials(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs transition-all cursor-pointer"
            >
              I have stored my secret securely
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
