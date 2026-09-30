'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, ShieldCheck, Copy, Check, ExternalLink, 
  CreditCard, Key, Smartphone, Mail, Building, 
  Calendar, Lock, Sparkles, RefreshCw, BadgeCheck, LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthToken } from '@/lib/api';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  isVerified: boolean;
  isOnboarded?: boolean;
  companyId?: string;
  companyName?: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('platform_auth_token');
    localStorage.removeItem('platform_refresh_token');
    document.cookie = 'platform_auth_token=; path=/; max-age=0;';
    toast.success('Logged out successfully');
    window.location.href = '/';
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    setLoading(true);
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        
        // Also check localStorage user cache if available
        let cachedUser: any = {};
        try {
          const raw = localStorage.getItem('user');
          if (raw) cachedUser = JSON.parse(raw);
        } catch (_) {}

        setProfile({
          id: payload.id || payload.sub || payload.userId || cachedUser.id || 'usr_sovereign_anonymous',
          name: payload.name || cachedUser.name || payload.email?.split('@')[0] || '180 Advertiser',
          username: payload.username || cachedUser.username || (payload.email ? payload.email.split('@')[0] : 'advertiser'),
          email: payload.email || cachedUser.email || 'advertiser@180workspace.com',
          phone: payload.phone || cachedUser.phone || '+1 (555) 019-2834',
          avatarUrl: payload.avatar || cachedUser.avatar || '',
          role: payload.role || cachedUser.role || 'OWNER',
          isVerified: payload.isVerified !== undefined ? payload.isVerified : true,
          companyId: payload.companyId || cachedUser.companyId || 'cmp_traffic_sovereign',
          companyName: cachedUser.companyName || '180 Traffic Operations',
          createdAt: cachedUser.createdAt || new Date().toISOString(),
        });
      }
    } catch (e: any) {
      console.error('Failed to parse profile token:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUserId = () => {
    if (!profile?.id) return;
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    toast.success('User ID copied to clipboard!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-zinc-500 font-medium">Resolving 180 Sovereign Identity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Top Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
            Sovereign Identity
          </span>
          <span className="text-xs text-zinc-400">· 180 Workspace Single Sign-On</span>
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight mt-1">
          User Account & Sovereign Profile
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Your credentials and permissions are issued by 180 Identity. Traffic Director uses sovereign zero-trust access tokens.
        </p>
      </div>

      {/* Primary Identity Hero Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2px] shadow-md shrink-0">
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-[14px] flex items-center justify-center font-bold text-xl text-blue-600 dark:text-blue-400">
                {profile?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                  {profile?.name}
                </h2>
                {profile?.isVerified && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-mono">@{profile?.username}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-semibold text-[10px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Role: {profile?.role}
                </span>
                <span>·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                  Active Session
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start">
            <a
              href="https://profile.180workspace.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Edit on 180 Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-all cursor-pointer"
              title="Sign out of current session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* User ID Highlight Box */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
              Sovereign User Identifier (180 User ID)
            </span>
            <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 break-all select-all">
              {profile?.id}
            </div>
          </div>

          <button
            onClick={handleCopyUserId}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors shadow-sm shrink-0 cursor-pointer self-start sm:self-auto"
          >
            {copiedId ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy User ID</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Identity Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & SSO Information */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Credentials & Contact</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Primary Email</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{profile?.email}</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Connected Phone</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{profile?.phone}</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Auth Method</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">180 Identity SSO (PKCE)</span>
            </div>
          </div>
        </div>

        {/* Tenant & Permissions Context */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Workspace & Tenancy</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Company ID</span>
              <span className="font-mono text-zinc-900 dark:text-white truncate max-w-[200px]">
                {profile?.companyId}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Subscription Status</span>
              <Link
                href="/traffic-director/subscription"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View Plans & Billing</span>
                <CreditCard className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Traffic Director Role</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Full Edge Administrator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sovereign Security & Biometrics Status */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-950 border border-blue-200/60 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
              Sovereign Account Security
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Your identity supports WebAuthn Passkeys, WhatsApp Instant Verification, and multi-app SSO across 180 Workspace.
            </p>
          </div>
        </div>

        <a
          href="https://profile.180workspace.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors shrink-0 cursor-pointer"
        >
          Security Center ↗
        </a>
      </div>

      {/* Active Session & Sign Out Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Active Session</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Sign out of your 180 Traffic Director session on this device.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Traffic Director</span>
        </button>
      </div>
    </div>
  );
}
