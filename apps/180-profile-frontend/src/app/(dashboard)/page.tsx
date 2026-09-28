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
  ExternalLink,
  Sparkles,
  Calendar,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button, UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';
import { UserProfile, ConnectedApp, LedgerEntry } from '@/types';
import { EditProfileModal } from '@/components/EditProfileModal';
import { TopUpModal } from '@/components/TopUpModal';
import { SovereignQRModal } from '@/components/SovereignQRModal';
import { InvoiceModal } from '@/components/InvoiceModal';

export default function HomePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number>(1000.0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<LedgerEntry | null>(null);

  // Summary connected apps
  const [recentApps, setRecentApps] = useState<ConnectedApp[]>([
    {
      id: 'app_1',
      name: '180 Workspace Platform',
      clientId: '180-workspace-platform',
      scopes: ['openid', 'identity:profile', 'wallet:pay'],
      authorizedAt: '2026-09-01T10:00:00Z',
      lastActive: 'Just now',
    },
    {
      id: 'app_2',
      name: '180 Voiceforce AI',
      clientId: 'voiceforce-ai-agent',
      scopes: ['openid', 'identity:phone', 'telephony:wallet'],
      authorizedAt: '2026-09-12T14:30:00Z',
      lastActive: '2 hours ago',
    },
    {
      id: 'app_3',
      name: '180 Traffic Director',
      clientId: 'traffic-director-web',
      scopes: ['openid', 'identity:profile'],
      authorizedAt: '2026-09-20T08:15:00Z',
      lastActive: '1 day ago',
    },
  ]);

  // Summary recent transactions
  const [recentLedger, setRecentLedger] = useState<LedgerEntry[]>([
    {
      id: 'tx_101',
      userId: '180-usr-8f92a10c99',
      amount: 1000.0,
      type: 'TOPUP',
      description: 'Prepaid Wallet Initial Top-Up (Razorpay UPI)',
      referenceId: 'pay_RZP9812491',
      balanceAfter: 1000.0,
      createdAt: '2026-09-28T09:30:00Z',
    },
    {
      id: 'tx_102',
      userId: '180-usr-8f92a10c99',
      amount: -45.0,
      type: 'DEBIT',
      description: 'Voiceforce AI Outbound Call Session (3.2 min)',
      referenceId: 'vf_call_981241',
      balanceAfter: 955.0,
      createdAt: '2026-09-27T18:15:00Z',
    },
    {
      id: 'tx_103',
      userId: '180-usr-8f92a10c99',
      amount: -120.0,
      type: 'PURCHASE',
      description: 'Traffic Director API Monthly Provisioning',
      referenceId: 'td_sub_41029',
      balanceAfter: 835.0,
      createdAt: '2026-09-26T14:10:00Z',
    },
  ]);

  const loadData = async () => {
    try {
      const [userRes, walletRes, ledgerRes] = await Promise.all([
        fetch('/api/oauth/userinfo', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
        fetch('/api/oauth/wallet', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
        fetch('/api/oauth/wallet/ledger', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
      ]);

      if (userRes?.success && userRes.user) {
        setUser(userRes.user);
      } else {
        setUser({
          id: '180-usr-8f92a10c99',
          name: 'Sovereign Creator',
          email: 'creator@180workspace.com',
          phone: '+91 98765 43210',
          username: 'creator_180',
          dob: '1998-05-14',
          createdAt: '2026-01-15T09:00:00Z',
        });
      }

      if (walletRes?.success && walletRes.data) {
        setBalance(walletRes.data.balance);
      }

      if (ledgerRes?.success && ledgerRes.data?.entries?.length > 0) {
        setRecentLedger(ledgerRes.data.entries.slice(0, 3));
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

  const currentUser = user || {
    id: '180-usr-8f92a10c99',
    name: 'Sovereign Creator',
    email: 'creator@180workspace.com',
    phone: '+91 98765 43210',
    username: 'creator_180',
    dob: '1998-05-14',
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Profile Passport Hero Card */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-[2px] shadow-sm shrink-0 overflow-hidden">
              <div className="w-full h-full bg-slate-50 rounded-3xl flex items-center justify-center text-slate-900 font-extrabold text-2xl sm:text-3xl">
                {currentUser.name ? currentUser.name.slice(0, 1).toUpperCase() : 'S'}
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {currentUser.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Sovereign ID
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                <span className="text-purple-700 font-bold font-sans">@{currentUser.username || 'creator_180'}</span>
                <span>•</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono text-[11px] flex items-center gap-1.5">
                  {currentUser.id}
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="hover:text-purple-700 cursor-pointer"
                    title="Copy Sovereign ID"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>

              <p className="text-xs text-slate-500 max-w-xl pt-1 leading-relaxed">
                Single sign-on identity, WhatsApp phone verification & universal wallet across all 180 apps.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              className="min-h-[40px] px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-xs font-semibold cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsQRModalOpen(true)}
              className="min-h-[40px] px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Pair Companion Device"
            >
              <QrCode className="w-4 h-4 text-purple-600" />
            </Button>
          </div>
        </div>

        {/* Credentials Pills Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100/60 text-purple-700 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</div>
              <div className="font-semibold text-slate-900 truncate">{currentUser.email}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/60 text-emerald-700 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Phone</div>
              <div className="font-semibold text-slate-900 truncate">{currentUser.phone || '+91 98765 43210'}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100/60 text-rose-700 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</div>
              <div className="font-semibold text-slate-900 truncate">{currentUser.dob ? '14 May 1998' : '14 May 1998'}</div>
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
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
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
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-200 font-bold text-xs transition-colors cursor-pointer"
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
              className="px-5 py-2.5 min-h-[40px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Top-Up Balance</span>
            </Button>

            <Link
              href="/transactions"
              className="text-xs font-semibold text-slate-600 hover:text-purple-700 flex items-center gap-1 transition-colors min-h-[40px]"
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

              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                OAuth 2.0 Synced
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {recentApps.map((app) => (
                <div key={app.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                      {app.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{app.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{app.clientId}</div>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-500 shrink-0 font-medium">{app.lastActive}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Automatic SSO consent on authorized domains</span>
            <Link
              href="/connected-apps"
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors min-h-[40px]"
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
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors min-h-[36px]"
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
              {recentLedger.map((tx) => {
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
                      {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-bold text-sm ${
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isCredit ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(tx)}
                        className="px-2.5 py-1 rounded-lg hover:bg-purple-50 text-purple-700 font-semibold text-[11px] border border-transparent hover:border-purple-200 transition-colors cursor-pointer"
                      >
                        Tax Invoice
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={currentUser}
        onSave={(updated) => setUser(updated)}
      />

      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        onSuccess={loadData}
      />

      <SovereignQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        userId={currentUser.id}
        userName={currentUser.name}
      />

      {selectedInvoice && (
        <InvoiceModal
          transaction={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          userName={currentUser.name}
          userEmail={currentUser.email}
          userPhone={currentUser.phone}
        />
      )}
    </div>
  );
}
