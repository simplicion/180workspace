'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Key,
  Shield,
  RotateCw,
  Trash2,
  Save,
  Check,
  Copy,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Code2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CodeSnippets } from '../components/CodeSnippets';

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [redirectUrisText, setRedirectUrisText] = useState('');
  const [allowedOriginsText, setAllowedOriginsText] = useState('');
  const [allowedScopes, setAllowedScopes] = useState<string[]>([]);

  // Rotate Secret States
  const [rotating, setRotating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  // Copy helpers
  const [clientIdCopied, setClientIdCopied] = useState(false);
  const [newSecretCopied, setNewSecretCopied] = useState(false);

  useEffect(() => {
    if (appId) fetchAppDetails();
  }, [appId]);

  const fetchAppDetails = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : '';
      const res = await fetch(`/api/oauth/developer/apps/${appId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Application not found');
      }

      const data = await res.json();
      if (data.success && data.app) {
        setApp(data.app);
        setName(data.app.name);
        setDescription(data.app.description || '');
        setRedirectUrisText((data.app.redirectUris || []).join('\n'));
        setAllowedOriginsText((data.app.allowedOrigins || []).join('\n'));
        setAllowedScopes(data.app.allowedScopes || ['identity:read']);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading application');
      router.push('/developers');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : '';

      const redirectUris = redirectUrisText
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      const allowedOrigins = allowedOriginsText
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);

      const res = await fetch(`/api/oauth/developer/apps/${appId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          redirectUris,
          allowedOrigins,
          allowedScopes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update application');
      }

      toast.success('Application updated successfully');
      fetchAppDetails();
    } catch (err: any) {
      toast.error(err.message || 'Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRotateSecret = async () => {
    if (!confirm('Are you sure you want to rotate your Client Secret? Existing integrations using the old secret will need to be updated.')) {
      return;
    }

    try {
      setRotating(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : '';

      const res = await fetch(`/api/oauth/developer/apps/${appId}/rotate-secret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to rotate secret');
      }

      setNewSecret(data.clientSecret);
      toast.success('Client Secret rotated successfully!');
      fetchAppDetails();
    } catch (err: any) {
      toast.error(err.message || 'Error rotating secret');
    } finally {
      setRotating(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!confirm(`Are you sure you want to delete ${app?.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : '';
      const res = await fetch(`/api/oauth/developer/apps/${appId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error('Failed to delete application');

      toast.success('Application deleted');
      router.push('/developers');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting application');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-400">Loading application...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Back Link & Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/developers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </Link>

        <button
          type="button"
          onClick={handleDeleteApp}
          className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete App</span>
        </button>
      </div>

      {/* App Header Card */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xl">
              {app.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{app.name}</h1>
                {app.isVerified && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Created on {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div>
              <span className="text-slate-500">Authorized Users: </span>
              <span className="font-bold text-white">{app.metrics?.authorizedUsers || 0}</span>
            </div>
            <div>
              <span className="text-slate-500">Tokens Issued: </span>
              <span className="font-bold text-white">{app.metrics?.activeTokens || 0}</span>
            </div>
          </div>
        </div>

        {/* Credentials Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Client ID
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(app.clientId);
                  setClientIdCopied(true);
                  setTimeout(() => setClientIdCopied(false), 2000);
                }}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                {clientIdCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="font-mono text-xs text-indigo-400 mt-1 select-all truncate">
              {app.clientId}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Client Secret
              </span>
              <button
                type="button"
                disabled={rotating}
                onClick={handleRotateSecret}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
              >
                <RotateCw className={`w-3 h-3 ${rotating ? 'animate-spin' : ''}`} />
                <span>Rotate Secret</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-400 mt-1">
              ••••••••••••••••••••{app.clientSecretHint}
            </div>
          </div>
        </div>

        {/* Rotated Secret Notification */}
        {newSecret && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
            <div className="font-bold flex items-center justify-between">
              <span>New Client Secret (Copy immediately):</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newSecret);
                  setNewSecretCopied(true);
                  setTimeout(() => setNewSecretCopied(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                {newSecretCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{newSecretCopied ? 'Copied' : 'Copy Secret'}</span>
              </button>
            </div>
            <div className="font-mono text-sm font-bold text-white select-all bg-slate-950 p-2.5 rounded-xl border border-emerald-500/30">
              {newSecret}
            </div>
          </div>
        )}
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveChanges} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-base font-bold text-white">OAuth Configuration</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure redirect endpoints and CORS origins for this client.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Application Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">
            Registered Redirect URIs (one per line)
          </label>
          <textarea
            rows={3}
            value={redirectUrisText}
            onChange={(e) => setRedirectUrisText(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">
            Allowed CORS Origins (one per line)
          </label>
          <textarea
            rows={3}
            value={allowedOriginsText}
            onChange={(e) => setAllowedOriginsText(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Code Snippets Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>Interactive Integration Snippets</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pre-configured code examples with your client ID (<code className="font-mono text-indigo-400">{app.clientId}</code>).
          </p>
        </div>

        <CodeSnippets clientId={app.clientId} />
      </div>
    </div>
  );
}
