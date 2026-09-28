'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AppWindow,
  ShieldCheck,
  ExternalLink,
  Trash2,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Key,
  Smartphone,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { Button, UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';
import { ConnectedApp } from '@/types';
import { RevokeAppModal } from '@/components/RevokeAppModal';

export default function ConnectedAppsPage() {
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<ConnectedApp[]>([
    {
      id: 'app_1',
      name: '180 Workspace Platform',
      clientId: '180-workspace-platform',
      scopes: ['openid', 'identity:profile', 'identity:email', 'wallet:pay'],
      authorizedAt: '2026-09-01T10:00:00Z',
      lastActive: 'Just now',
      status: 'active',
    },
    {
      id: 'app_2',
      name: '180 Voiceforce AI',
      clientId: 'voiceforce-ai-agent',
      scopes: ['openid', 'identity:phone', 'telephony:wallet'],
      authorizedAt: '2026-09-12T14:30:00Z',
      lastActive: '2 hours ago',
      status: 'active',
    },
    {
      id: 'app_3',
      name: '180 Traffic Director',
      clientId: 'traffic-director-web',
      scopes: ['openid', 'identity:profile'],
      authorizedAt: '2026-09-20T08:15:00Z',
      lastActive: '1 day ago',
      status: 'active',
    },
    {
      id: 'app_4',
      name: '180 Developer Portal & API',
      clientId: '180-developer-portal',
      scopes: ['openid', 'identity:email', 'wallet:metering'],
      authorizedAt: '2026-09-22T19:00:00Z',
      lastActive: '3 days ago',
      status: 'active',
    },
  ]);

  const [revokingApp, setRevokingApp] = useState<ConnectedApp | null>(null);
  const [revoking, setRevoking] = useState(false);

  const confirmRevoke = async () => {
    if (!revokingApp) return;
    setRevoking(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setApps((prev) => prev.filter((a) => a.id !== revokingApp.id));
      toast.success(`Revoked access for ${revokingApp.name}`);
      setRevokingApp(null);
    } catch (err: any) {
      toast.error('Failed to revoke app access');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="text-xs text-purple-600 hover:text-purple-700 font-medium">
              ← Overview
            </Link>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">OAuth 2.0 Client Authorizations</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Connected Applications</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
              {apps.length} Active
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Third-party and native applications authorized to authenticate your Sovereign 180 Profile and interact with 180 Pay.
          </p>
        </div>

        <a
          href="https://developers.180workspace.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-purple-700 hover:border-purple-200 hover:bg-purple-50 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
        >
          <span>Register New App</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Apps List (2 Column Span) */}
        <div className="lg:col-span-2 space-y-4">
          {apps.length > 0 ? (
            apps.map((app) => (
              <div
                key={app.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  {/* App Logo Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {app.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">{app.name}</h2>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live Session Active" />
                    </div>

                    <p className="text-xs text-slate-500 font-mono">{app.clientId}</p>

                    {/* Scopes Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {app.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-mono font-medium"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-400 pt-1">
                      Authorized on: {new Date(app.authorizedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })} • Last Active: <strong className="text-slate-600">{app.lastActive}</strong>
                    </div>
                  </div>
                </div>

                {/* Revoke Action */}
                <button
                  type="button"
                  onClick={() => setRevokingApp(app)}
                  className="self-end sm:self-center px-4 py-2 min-h-[38px] text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Revoke Access
                </button>
              </div>
            ))
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <AppWindow className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">No Connected Applications</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have not authorized any external platforms yet. Applications you log into with 180 Profile will show up here.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Security & Protocol Information */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm pb-3 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>How 180 Identity Works</span>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-900">Zero Password Sharing:</strong> Third-party apps never see your password or full private credentials.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-900">Cryptographic RS256 Tokens:</strong> Access is granted via cryptographically signed OIDC tokens with strict scope isolation.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-900">Instant Kill-Switch:</strong> Revoking an application terminates all active tokens and blocks new transactions instantly.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-purple-50/70 border border-purple-200 text-purple-900 shadow-xs space-y-2">
            <h3 className="font-bold text-xs">Building an app?</h3>
            <p className="text-xs text-purple-700 leading-relaxed">
              Integrate 180 Identity & 180 Pay in 1 line of code with our universal SDK.
            </p>
            <a
              href="https://developers.180workspace.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-800 hover:text-purple-950 pt-1"
            >
              <span>Explore Developer Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      <RevokeAppModal
        app={revokingApp}
        onClose={() => setRevokingApp(null)}
        onConfirm={confirmRevoke}
        loading={revoking}
      />
    </div>
  );
}
