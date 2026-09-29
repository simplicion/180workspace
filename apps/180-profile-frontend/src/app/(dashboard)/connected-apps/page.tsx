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
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [revokingApp, setRevokingApp] = useState<ConnectedApp | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem('platform_auth_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken');
      if (!token) {
        setApps([]);
        return;
      }
      const res = await fetch('/api/oauth/authorized-apps', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.apps)) {
          setApps(data.apps);
        } else {
          setApps([]);
        }
      } else {
        setApps([]);
      }
    } catch (_) {
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const confirmRevoke = async () => {
    if (!revokingApp) return;
    setRevoking(true);
    try {
      const token =
        localStorage.getItem('platform_auth_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken');

      const res = await fetch(`/api/oauth/authorized-apps/${revokingApp.clientId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      setApps((prev) => prev.filter((a) => a.id !== revokingApp.id && a.clientId !== revokingApp.clientId));
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
            <Link href="/" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              ← Overview
            </Link>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">OAuth 2.0 Client Authorizations</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Connected Applications</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              {apps.length} Active
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Applications authorized to authenticate your Sovereign 180 Profile and interact with 180 Pay under your consent.
          </p>
        </div>

        <a
          href="https://developers.180workspace.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
        >
          <span>Developer Portal</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Apps List (2 Column Span) */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <UniversalSkeleton type="form" count={2} />
            </div>
          ) : apps.length > 0 ? (
            apps.map((app) => (
              <div
                key={app.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  {/* App Logo Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
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
                      {app.scopes?.map((scope) => (
                        <span
                          key={scope}
                          className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-mono font-medium"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Revoke Action Button */}
                <Button
                  variant="outline"
                  onClick={() => setRevokingApp(app)}
                  className="min-h-[40px] px-3.5 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-2 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke Access</span>
                </Button>
              </div>
            ))
          ) : (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <AppWindow className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">No Connected Applications Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have not authorized any external applications yet. When you sign in to 180 Workspace, Voiceforce, or third-party client apps using your 180 Profile, they will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Security & Access Sidebar */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Sovereign Privacy Model</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every token issued to third-party applications is cryptographically signed using RS256 JWKS. Applications can only read the specific attributes you grant consent to.
            </p>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant Revocation</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Revoking an application immediately invalidates all active access tokens and refresh tokens.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      {revokingApp && (
        <RevokeAppModal
          app={revokingApp}
          onClose={() => setRevokingApp(null)}
          onConfirm={confirmRevoke}
          loading={revoking}
        />
      )}
    </div>
  );
}
