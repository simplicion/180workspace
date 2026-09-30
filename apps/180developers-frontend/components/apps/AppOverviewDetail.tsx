'use client';

import React from 'react';
import {
  Key,
  Copy,
  Check,
  RotateCw,
  Zap,
  Shield,
  CreditCard,
  ImageIcon,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@workspace/ui';
import { AppCard } from '../AppCard';
import { DeveloperAppDetail } from './types';

export interface AppOverviewDetailProps {
  app: DeveloperAppDetail;
  enableAuth: boolean;
  enablePay: boolean;
  copiedKey: string | null;
  copyToClipboard: (text: string, key: string) => void;
  onOpenIdentity: () => void;
  onOpenPay: () => void;
  onRotateSecretClick: () => void;
  name: string;
  setName: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  logoUrl: string;
  setLogoUrl: (val: string) => void;
  redirectUrisInput: string;
  setRedirectUrisInput: (val: string) => void;
  allowedOriginsInput: string;
  setAllowedOriginsInput: (val: string) => void;
  onSave: (e?: React.SyntheticEvent) => void;
  saving: boolean;
  onRevokeTokens: () => void;
  isRevoking: boolean;
  onDeleteAppClick: () => void;
}

export function AppOverviewDetail({
  app,
  enableAuth,
  enablePay,
  copiedKey,
  copyToClipboard,
  onOpenIdentity,
  onOpenPay,
  onRotateSecretClick,
  name,
  setName,
  description,
  setDescription,
  logoUrl,
  setLogoUrl,
  redirectUrisInput,
  setRedirectUrisInput,
  allowedOriginsInput,
  setAllowedOriginsInput,
  onSave,
  saving,
  onRevokeTokens,
  isRevoking,
  onDeleteAppClick,
}: AppOverviewDetailProps) {
  return (
    <div className="space-y-8">
      {/* Credentials Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-5 shadow-sm dark:shadow-2xl">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">OAuth 2.0 Credentials</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Client ID</label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 font-mono text-xs text-zinc-900 dark:text-white">
              <span className="flex-1 truncate">{app.clientId}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(app.clientId, 'client')}
                className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
                title="Copy Client ID"
              >
                {copiedKey === 'client' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Client Secret</label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 font-mono text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex-1">
                {app.clientSecretHint ? `••••••••••••${app.clientSecretHint}` : 'Public PKCE Client'}
              </span>
              {app.clientSecretHint && (
                <button
                  type="button"
                  onClick={onRotateSecretClick}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Rotate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MY APPS: Modular Application Cards Grid using Reusable AppCard
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>My Apps</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Click on any app card to open its dedicated configuration and analytics dashboard.
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Single Client ID Architecture</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* App Card 1: 180 Identity */}
          <AppCard
            name="180 Identity"
            description="Universal login with WhatsApp OTP, Google SSO, and sovereign @usernames. Issues RS256 asymmetric JWKS access tokens."
            icon={Shield}
            enabled={enableAuth}
            protocol="OAuth 2.0 / OIDC Protocol"
            accentColor="blue"
            actionLabel="Open Dashboard"
            onClick={onOpenIdentity}
          />

          {/* App Card 2: 180 Pay */}
          <AppCard
            name="180 Pay"
            description="1-Click Sovereign Wallet & UPI checkout popup. Dedicated 180 Pay engine processes payments with 2-way verification."
            icon={CreditCard}
            enabled={enablePay}
            protocol="Sovereign Wallet Checkout"
            accentColor="purple"
            actionLabel="Open Dashboard"
            onClick={onOpenPay}
          />
        </div>
      </div>

      {/* General Application Configuration Form */}
      <form onSubmit={onSave} className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">Application Configuration</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              General application profile, redirect URIs, and cross-origin resource sharing (CORS).
            </p>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Settings</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Application Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* App Logo URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
            App Logo URL (White-label OAuth Branding) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            {logoUrl.trim() && (
              <div className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center p-1 shrink-0">
                <img
                  src={logoUrl.trim()}
                  alt="Logo preview"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <input
              type="url"
              required
              placeholder="https://yourapp.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <p className="text-[10px] text-zinc-400">Displayed in OAuth authorization prompts and checkout headers for your users.</p>
        </div>

        {/* Redirect URIs */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            OAuth 2.0 Redirect URIs (One per line)
          </label>
          <textarea
            rows={3}
            value={redirectUrisInput}
            onChange={(e) => setRedirectUrisInput(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* CORS Allowed Origins */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Allowed Web Origins (CORS)
          </label>
          <textarea
            rows={2}
            value={allowedOriginsInput}
            onChange={(e) => setAllowedOriginsInput(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Settings</span>
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-3xl border border-red-200 dark:border-red-500/20 bg-red-50/20 dark:bg-zinc-950 p-6 sm:p-8 space-y-4 shadow-sm dark:shadow-2xl">
        <h2 className="text-base font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
        <div className="divide-y divide-zinc-200 dark:divide-white/5 text-xs text-zinc-700 dark:text-zinc-300">
          <div className="py-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-zinc-900 dark:text-white">Revoke All Active Tokens</div>
              <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                Immediately invalidates all issued access and refresh tokens for this app.
              </div>
            </div>
            <button
              type="button"
              onClick={onRevokeTokens}
              disabled={isRevoking}
              className="px-3.5 py-2 rounded-xl bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-semibold cursor-pointer transition-colors"
            >
              {isRevoking ? 'Revoking...' : 'Revoke Tokens'}
            </button>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-zinc-900 dark:text-white">Delete Application</div>
              <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                Permanently removes this application and all associated grants.
              </div>
            </div>
            <button
              type="button"
              onClick={onDeleteAppClick}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Delete App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppOverviewDetail;
