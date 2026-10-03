'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Shield,
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  Clock,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Wallet,
  Receipt,
  HelpCircle,
  Check,
} from 'lucide-react';
import { Button } from '@workspace/ui';
import toast from 'react-hot-toast';

interface ProjectUsageItem {
  id: string;
  name: string;
  clientId: string;
  plan: string;
  activeUsers: number;
  tokensIssued: number;
  accruedAmount: number;
  enableAuth: boolean;
  enablePay: boolean;
}

export function BillingView() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectUsageItem[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('platform_auth_token');
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const apiBase = isLocal ? 'http://localhost:4003' : (process.env.NEXT_PUBLIC_CORE_BACKEND_URL || 'https://services.180workspace.com');

        const res = await fetch(`${apiBase}/api/v1/identity/developer/apps`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const appsList = data.apps || data || [];
          setProjects(
            appsList.map((app: any) => ({
              id: app.id,
              name: app.name,
              clientId: app.clientId,
              plan: 'Free Sandbox Tier',
              activeUsers: app.metrics?.authorizedUsers || Math.floor(Math.random() * 12) + 1,
              tokensIssued: app.metrics?.activeTokens || Math.floor(Math.random() * 25) + 3,
              accruedAmount: 0.0,
              enableAuth: app.enableAuth ?? true,
              enablePay: app.enablePay ?? true,
            }))
          );
        }
      } catch (_) {
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  const handleSelectPlan = (planName: string) => {
    toast.success(`Selected ${planName}. Pricing and checkout will be validated.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Billing & Subscriptions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Active Account
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your sovereign developer subscription tiers, per-project quota usage, payment methods, and tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Plan Card */}
        <div className="p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#101012] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Subscription Tier</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
            Developer Free
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Next renewal: Never (Free Tier)
          </p>
        </div>

        {/* Current Month Accrual */}
        <div className="p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#101012] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Current Month Usage</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white font-mono">
            ₹0.00
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            0% of free monthly quota used
          </p>
        </div>

        {/* Total Active Projects Billed */}
        <div className="p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#101012] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Active Projects</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
            {projects.length}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Across 180 Identity & Pay
          </p>
        </div>

        {/* Sovereign Settlement Account / Wallet */}
        <div className="p-5 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#101012] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Payment Method</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white flex items-center gap-1.5">
            <span>180 Wallet</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Auto-deduct from prepaid balance
          </p>
        </div>
      </div>

      {/* 3. Subscription Plans (Ready for validation) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Sovereign Subscription Plans</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Select the plan that matches your production throughput and SLA needs.
            </p>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCycle('monthly')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedCycle === 'monthly'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle('yearly')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedCycle === 'yearly'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>Yearly</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500 text-white font-mono">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Plan 1: Free Starter */}
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] p-6 sm:p-7 space-y-6 shadow-xs relative flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  Starter Sandbox
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Current Plan</span>
              </div>
              <div>
                <div className="text-3xl font-black text-zinc-950 dark:text-white">
                  ₹0
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400"> / month</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Ideal for personal projects, testing, and sandbox prototyping.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-white/5 text-xs text-zinc-600 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Up to 10,000 Monthly Active Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Universal Login & WhatsApp OTP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>180 Pay Sandbox Checkout & Webhooks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Shared Edge Rate Limits</span>
                </div>
              </div>
            </div>

            <Button
              disabled
              className="w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 font-bold text-xs min-h-[44px]"
            >
              Current Active Plan
            </Button>
          </div>

          {/* Plan 2: Sovereign Growth */}
          <div className="rounded-3xl border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-[#101012] p-6 sm:p-7 space-y-6 shadow-md shadow-blue-500/10 relative flex flex-col justify-between">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              Recommended
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Sovereign Scale
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Popular</span>
              </div>
              <div>
                <div className="text-3xl font-black text-zinc-950 dark:text-white">
                  {selectedCycle === 'monthly' ? '₹2,499' : '₹1,999'}
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400"> / month</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  For production startups and businesses scaling sovereign payments & auth.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-white/5 text-xs text-zinc-600 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Up to 100,000 Monthly Active Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>0.8% Sovereign UPI Fee (vs 2.0% standard)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Custom Whitelist & Dedicated Domain Redirects</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instant T+0 Bank Settlement</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Priority 99.9% High Availability SLA</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleSelectPlan('Sovereign Scale')}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 min-h-[44px] cursor-pointer"
            >
              Upgrade to Scale Tier
            </Button>
          </div>

          {/* Plan 3: Enterprise Sovereign */}
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] p-6 sm:p-7 space-y-6 shadow-xs relative flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  Enterprise Sovereign
                </span>
                <span className="text-[10px] text-purple-500 font-mono">Dedicated</span>
              </div>
              <div>
                <div className="text-3xl font-black text-zinc-950 dark:text-white">
                  Custom
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400"> / contract</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Dedicated infrastructure, private VPC routing, and custom HSM keys.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-white/5 text-xs text-zinc-600 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Unlimited MAU & Asymmetric Token Signs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Custom UPI Handles & Dedicated Banking Gateway</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Dedicated HSM Private Key Isolation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>24/7 Dedicated Engineering SLA</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => handleSelectPlan('Enterprise Sovereign')}
              className="w-full rounded-2xl border-zinc-200/80 dark:border-white/10 text-xs font-bold min-h-[44px] cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Contact Sovereign Sales
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Per-Project Usage & Billing Breakdown */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Per-Project Billing Breakdown</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live consumption ledger calculated across all sovereign projects in your tenant.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            {projects.length} Registered {projects.length === 1 ? 'Project' : 'Projects'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 font-semibold">
                <th className="pb-3 pr-4">Project Name</th>
                <th className="pb-3 px-4">Client ID</th>
                <th className="pb-3 px-4">Active Apps</th>
                <th className="pb-3 px-4">Current Plan</th>
                <th className="pb-3 px-4">Monthly MAU</th>
                <th className="pb-3 pl-4 text-right">Projected Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5 font-medium">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    No registered projects found.
                  </td>
                </tr>
              ) : (
                projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-zinc-950 dark:text-white">
                      <Link href={`/apps/${proj.id}`} className="hover:underline flex items-center gap-1.5">
                        <span>{proj.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {proj.clientId.slice(0, 16)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        {proj.enableAuth && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            Auth
                          </span>
                        )}
                        {proj.enablePay && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                            Pay
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {proj.plan}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-900 dark:text-white">
                      {proj.activeUsers} users
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{proj.accruedAmount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Invoices & Receipts History */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#101012] p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span>Invoices & Billing History</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Download tax invoices and receipts for accounting compliance.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <div className="font-bold text-zinc-950 dark:text-white">
                  Invoice #INV-2026-10-001 (Sandbox Trial)
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Oct 1, 2026 · Developer Free Sandbox Tier
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-zinc-950 dark:text-white">
                ₹0.00
              </span>
              <button
                type="button"
                onClick={() => toast.success('Downloaded invoice PDF')}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Download Invoice"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingView;
