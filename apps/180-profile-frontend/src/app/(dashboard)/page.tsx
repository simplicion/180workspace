'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ShieldCheck,
  Smartphone,
  Mail,
  Copy,
  Check,
  QrCode,
  Edit3,
  CreditCard,
  AppWindow,
  Receipt,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button, UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';
import { UserProfile, ConnectedApp, LedgerEntry } from '@/types';
import { getCoreApiUrl } from '@/lib/api';
import { EditProfileModal } from '@/components/EditProfileModal';
import { TopUpModal } from '@/components/TopUpModal';
import { SovereignQRModal } from '@/components/SovereignQRModal';
import { InvoiceModal } from '@/components/InvoiceModal';

export default function HomePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number>(0.0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<LedgerEntry | null>(null);

  // Connected apps & ledger entries (Real from backend, empty by default)
  const [recentApps, setRecentApps] = useState<ConnectedApp[]>([]);
  const [recentLedger, setRecentLedger] = useState<LedgerEntry[]>([]);

  const loadData = async () => {
    const token =
      localStorage.getItem('platform_auth_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      '';

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Step 1: Validate the token with userinfo first
      const userRes = await fetch(getCoreApiUrl('/api/oauth/userinfo'), { headers, credentials: 'include' });

      if (!userRes.ok) {
        // Token is expired/invalid — clear all stale auth and stop
        localStorage.removeItem('platform_auth_token');
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setUser(null);
        setLoading(false);
        return;
      }

      const userData = await userRes.json().catch(() => null);
      if (userData && (userData.user || userData.id)) {
        const u = userData.user || userData;
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      } else {
        setUser(null);
        setLoading(false);
        return;
      }

      // Step 2: Only fetch wallet, ledger, and apps AFTER auth is confirmed
      const [walletRes, ledgerRes, appsRes] = await Promise.all([
        fetch(getCoreApiUrl('/api/oauth/wallet'), { headers, credentials: 'include' }).then((r) => r.json()).catch(() => null),
        fetch(getCoreApiUrl('/api/oauth/wallet/ledger'), { headers, credentials: 'include' }).then((r) => r.json()).catch(() => null),
        fetch(getCoreApiUrl('/api/oauth/authorized-apps'), { headers, credentials: 'include' }).then((r) => r.json()).catch(() => null),
      ]);

      if (walletRes?.success && walletRes.data) {
        setBalance(walletRes.data.balance || 0);
      }

      if (ledgerRes?.success && Array.isArray(ledgerRes.data?.entries)) {
        setRecentLedger(ledgerRes.data.entries.slice(0, 5));
      }

      if (appsRes?.success && Array.isArray(appsRes.apps)) {
        setRecentApps(appsRes.apps.slice(0, 3));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    toast.success('Sovereign ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <UniversalSkeleton type="metrics" count={3} columns={3} />
        <UniversalSkeleton type="form" count={4} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. UNAUTHENTICATED STATE: SHOWCASE PUBLIC LANDING PAGE
  // ─────────────────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="space-y-16 py-6 max-w-5xl mx-auto">
        {/* Hero Section */}
        <section className="text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Universal Sovereign Identity &amp; Prepaid Ledger</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            One Unified Profile for
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
              Every 180 Experience.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Access 180 Workspace, Voiceforce AI, Traffic Director, and partner applications with zero passwords, 1-tap WhatsApp verification, and a cryptographic universal wallet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
            >
              <span>Get Started with 180 Identity</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Sign In to Existing Account</span>
            </Link>
          </div>
        </section>

        {/* Feature Pillar Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">1-Tap WhatsApp Login</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Eliminate password fatigue. Instant 6-digit WhatsApp OTP verification ensures friction-free, secure authentication.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Universal Prepaid Wallet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              One shared balance across every 180 app. 1-click checkouts for AI calls, metered tools, and workspace upgrades.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Sovereign Privacy Controls</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You own your data. See every authorized application, monitor active sessions, and revoke access instantly.
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATED STATE: USER PROFILE & WALLET DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Profile Passport Hero Card */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2px] shadow-sm shrink-0 overflow-hidden">
              <div className="w-full h-full bg-slate-50 rounded-3xl flex items-center justify-center text-slate-900 font-extrabold text-2xl sm:text-3xl">
                {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {user.name || 'Verified User'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Sovereign ID
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 font-mono">
                <span className="text-blue-700 font-bold font-sans">
                  @{user.username || (user.email ? user.email.split('@')[0] : 'user')}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700 font-mono text-[11px] flex items-center gap-1.5 max-w-full sm:max-w-none truncate">
                  <span className="truncate">{user.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="hover:text-blue-700 cursor-pointer shrink-0 p-0.5"
                    title="Copy Sovereign ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </span>
              </div>

              <p className="text-xs text-slate-500 max-w-xl pt-1 leading-relaxed">
                Single sign-on identity, WhatsApp phone verification &amp; universal wallet across all 180 apps.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 sm:flex-none min-h-[40px] px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsQRModalOpen(true)}
              className="min-h-[40px] px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
              title="Pair Companion Device"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
            </Button>
          </div>
        </div>

        {/* Credentials Pills Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</div>
              <div className="font-semibold text-slate-900 truncate">{user.email || 'Not connected'}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/60 text-emerald-700 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Phone</div>
              <div className="font-semibold text-slate-900 truncate">{user.phone || 'Not connected'}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100/60 text-rose-700 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Joined Date</div>
              <div className="font-semibold text-slate-900 truncate">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Verified Member'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100/60 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Authentication</div>
              <div className="font-semibold text-slate-900 truncate">OAuth 2.0 / OIDC Active</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Two-Column Dashboard Row: Wallet Card (Left) & Connected Apps (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Universal Prepaid Wallet Card */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Prepaid Balance</h2>
                  <p className="text-xs text-slate-500">Universal 180 Pay Sovereign Ledger</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="py-6 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                ₹{balance.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-slate-500">INR</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Ready for 1-click calls on Voiceforce AI, Developer API metering, and workspace top-ups with zero third-party client dependencies.
            </p>

            {/* Quick Recharge Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {[500, 1000, 2500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setIsTopUpModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  +₹{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-3">
            <Button
              variant="default"
              onClick={() => setIsTopUpModalOpen(true)}
              className="px-5 py-2.5 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Top-Up Balance</span>
            </Button>

            <Link
              href="/transactions"
              className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1 transition-colors min-h-[40px]"
            >
              <span>Transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Connected Apps Snippet */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                  <AppWindow className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Authorized Platforms</h2>
                  <p className="text-xs text-slate-500">Connected Apps ({recentApps.length})</p>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                OAuth 2.0 Synced
              </span>
            </div>

            {recentApps.length > 0 ? (
              <div className="divide-y divide-slate-100 mt-2">
                {recentApps.map((app) => (
                  <div key={app.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        {app.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{app.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{app.clientId}</div>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-500 shrink-0 font-medium">{app.lastActive || 'Active'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500 space-y-1.5">
                <p className="font-semibold text-slate-700">No Authorized Applications Yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  When you sign in to 180 Workspace, Voiceforce, or third-party applications, their permissions will appear here.
                </p>
              </div>
            )}
          </div>

          <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Automatic SSO consent on authorized domains</span>
            <Link
              href="/connected-apps"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors min-h-[40px]"
            >
              <span>Manage Apps</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Recent Activity Snippet */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Ledger Activity</h2>
            <p className="text-xs text-slate-500">Latest credits, charges, and authenticated transactions.</p>
          </div>

          <Link
            href="/transactions"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors min-h-[36px]"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {recentLedger.length > 0 ? (
                recentLedger.map((tx) => {
                  const isCredit = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div>{tx.description}</div>
                        {tx.referenceId && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {tx.referenceId}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            isCredit
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold font-mono ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isCredit ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(tx)}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 cursor-pointer"
                          title="View Invoice"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">No Ledger Transactions Recorded Yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Top up your prepaid balance to begin using 1-click checkouts and AI agent credits.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      {isEditModalOpen && (
        <EditProfileModal
          user={user}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updated) => {
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isTopUpModalOpen && (
        <TopUpModal
          isOpen={isTopUpModalOpen}
          onClose={() => setIsTopUpModalOpen(false)}
          onSuccess={() => {
            loadData();
            setIsTopUpModalOpen(false);
          }}
        />
      )}

      {isQRModalOpen && (
        <SovereignQRModal
          userId={user.id}
          userName={user.name}
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
        />
      )}

      {selectedInvoice && (
        <InvoiceModal
          transaction={selectedInvoice}
          userName={user?.name}
          userEmail={user?.email}
          userPhone={user?.phone}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
