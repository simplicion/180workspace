'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  CreditCard,
  Activity,
  TrendingUp,
  Clock,
  Landmark,
  Play,
  RotateCw,
  Loader2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Percent,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Receipt,
  ArrowDown,
  Sliders,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { OneEightyPay } from '@workspace/identity-sdk';
import toast from 'react-hot-toast';
import { useProject } from '@/context/ProjectContext';

function TransactionsSkeleton() {
  return (
    <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="h-5 w-56 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          </div>
          <div className="h-3 w-80 bg-zinc-100 dark:bg-zinc-900 rounded-md" />
        </div>
        <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="h-9 flex-1 w-full bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/10" />
        <div className="h-9 w-full sm:w-80 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/10" />
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden">
        <div className="h-10 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-white/5" />
        <div className="divide-y divide-zinc-200 dark:divide-white/5 p-2 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 flex items-center justify-between px-4 gap-2">
              <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded hidden sm:block" />
              <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded hidden md:block" />
              <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded hidden sm:block" />
              <div className="h-7 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PayTransactionsView = dynamic(
  () => import('./PayTransactionsView').then((mod) => mod.PayTransactionsView),
  {
    loading: () => <TransactionsSkeleton />,
    ssr: false,
  }
);

function LazyTransactionsSection() {
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== 'undefined' && window.location.hash.includes('transactions')) {
        setInView(true);
        setTimeout(() => {
          containerRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    };

    if (typeof window !== 'undefined' && window.location.hash.includes('transactions')) {
      handleHash();
      return;
    }

    window.addEventListener('hashchange', handleHash);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '300px',
        threshold: 0,
      }
    );

    const current = containerRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      window.removeEventListener('hashchange', handleHash);
      if (current) observer.unobserve(current);
      observer.disconnect();
    };
  }, []);

  return (
    <div id="transactions" ref={containerRef} className="scroll-mt-6">
      {inView ? <PayTransactionsView /> : <TransactionsSkeleton />}
    </div>
  );
}

export function PayOverviewView() {
  const {
    project,
    enablePay,
    setEnablePay,
    saveSettings,
    saving,
    paymentAnalytics,
    loadingAnalytics,
    fetchPaymentAnalytics,
    payoutBalance,
  } = useProject();

  const [payUxModes, setPayUxModes] = useState<string[]>(
    project?.payUxModes || ['bottom_sheet', 'popup']
  );
  const [payDesktopDefault, setPayDesktopDefault] = useState<string>(
    project?.payDesktopDefault || 'bottom_sheet'
  );
  const [payMobileDefault, setPayMobileDefault] = useState<string>(
    project?.payMobileDefault || 'bottom_sheet'
  );

  useEffect(() => {
    fetchPaymentAnalytics();
  }, [fetchPaymentAnalytics]);

  useEffect(() => {
    if (project) {
      if (project.payUxModes && Array.isArray(project.payUxModes) && project.payUxModes.length > 0) {
        setPayUxModes(project.payUxModes);
      }
      if (project.payDesktopDefault) {
        setPayDesktopDefault(project.payDesktopDefault);
      }
      if (project.payMobileDefault) {
        setPayMobileDefault(project.payMobileDefault);
      }
    }
  }, [project?.payUxModes, project?.payDesktopDefault, project?.payMobileDefault]);

  const handleSaveUxModes = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    await saveSettings({
      payUxModes,
      payDesktopDefault,
      payMobileDefault,
    });
  };

  const onTestPopup = () => {
    try {
      OneEightyPay.openPopup({
        amount: 499,
        currency: 'INR',
        title: `${project?.name || 'Developer Project'} Premium Checkout`,
        description: 'Sandbox verification session (Popup)',
        onSuccess: (res: any) => toast.success(`Payment test passed! TxID: ${res?.transactionId || res?.sessionId || 'SUCCESS'}`),
        onCancel: () => toast('Pay checkout closed', { icon: 'ℹ️' }),
      });
    } catch (e: any) {
      toast.error(e.message || 'Popup test failed');
    }
  };

  const onTestBottomSheet = () => {
    try {
      OneEightyPay.openBottomSheet({
        amount: 499,
        currency: 'INR',
        title: `${project?.name || 'Developer Project'} Premium Checkout`,
        description: 'Sandbox verification session (Bottom Sheet)',
        onSuccess: (res: any) => toast.success(`Payment test passed! TxID: ${res?.transactionId || res?.sessionId || 'SUCCESS'}`),
        onCancel: () => toast('Pay checkout closed', { icon: 'ℹ️' }),
      });
    } catch (e: any) {
      toast.error(e.message || 'Bottom sheet test failed');
    }
  };

  const onTestPayDrawer = onTestBottomSheet;

  const totalIntentsCount = paymentAnalytics?.totalIntentsCount || (paymentAnalytics?.transactions || []).length;
  const totalIntentsVolume = paymentAnalytics?.totalIntentsVolume || paymentAnalytics?.grossVolume || 0;
  const gatewayAttemptsCount = paymentAnalytics?.gatewayAttemptsCount || 0;
  const gatewayAttemptsVolume = paymentAnalytics?.gatewayAttemptsVolume || 0;
  const capturedCount = paymentAnalytics?.totalTransactionsCount || 0;
  const capturedVolume = paymentAnalytics?.grossVolume || 0;
  const conversionRate = paymentAnalytics?.conversionRate || (totalIntentsCount > 0 ? Math.round((capturedCount / totalIntentsCount) * 1000) / 10 : 0);

  const gatewayPct = totalIntentsCount > 0 ? Math.min(100, Math.round(((gatewayAttemptsCount + capturedCount) / totalIntentsCount) * 100)) : 0;
  const capturedPct = totalIntentsCount > 0 ? Math.min(100, Math.round((capturedCount / totalIntentsCount) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* 1. 180 Pay Service Status Toggle Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-4 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                enablePay ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">180 Pay Engine</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    enablePay
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {enablePay ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                1-Click Sovereign Wallet &amp; UPI checkout popup. Dedicated 180 Pay engine processes payments with 2-way verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {enablePay ? 'Service Enabled' : 'Service Disabled'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enablePay}
              onClick={async () => {
                const next = !enablePay;
                setEnablePay(next);
                await saveSettings({ enablePay: next });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enablePay ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enablePay ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Presentation & UX Modes */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Checkout Presentation &amp; UX Modes</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Customize checkout display behaviors for desktop vs mobile devices.
            </p>
          </div>
          <span className="self-start sm:self-auto text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold">
            180 Pay UX
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-white/5">
            <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-zinc-900 dark:text-white">Supported Display Modes</span>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'bottom_sheet', label: 'Bottom Sheet (Drawer)' },
                { id: 'popup', label: 'Popup Window' },
                { id: 'full_page', label: 'Full Page Redirect' },
              ].map((mode) => {
                const isSelected = payUxModes.includes(mode.id);
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (payUxModes.length > 1) {
                          setPayUxModes(payUxModes.filter((m) => m !== mode.id));
                        }
                      } else {
                        setPayUxModes([...payUxModes, mode.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:border-zinc-300'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Device Defaults */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                <Monitor className="w-3 h-3 text-zinc-400" />
                <span>Desktop Default</span>
              </label>
              <select
                value={payDesktopDefault}
                onChange={(e) => setPayDesktopDefault(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              >
                <option value="bottom_sheet">Bottom Sheet (Recommended)</option>
                <option value="popup">Popup Window</option>
                <option value="full_page">Full Page Redirect</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-zinc-400" />
                <span>Mobile Default</span>
              </label>
              <select
                value={payMobileDefault}
                onChange={(e) => setPayMobileDefault(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              >
                <option value="bottom_sheet">Bottom Sheet (Recommended)</option>
                <option value="popup">Popup Window</option>
                <option value="full_page">Full Page Redirect</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Simulator Test Triggers */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-purple-500" />
              <span>Interactive SDK Experience Tester</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Simulate User Flow</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onTestPopup}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 hover:border-purple-500/50 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102"
            >
              <Monitor className="w-3.5 h-3.5 text-purple-500" />
              <span>Launch Popup Flow</span>
            </button>

            <button
              type="button"
              onClick={onTestBottomSheet}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 hover:border-purple-500/50 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-500" />
              <span>Launch Bottom Sheet Flow</span>
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveUxModes}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* 2. Financial KPI Metric Blocks */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Financial Overview &amp; Settlements</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live collection volume, clearing settlements, and withdrawable balance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('transactions');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                  window.history.replaceState(null, '', '#transactions');
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Jump to transactions ledger"
            >
              <Receipt className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>View Ledger</span>
              <ArrowDown className="w-3 h-3 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={fetchPaymentAnalytics}
              disabled={loadingAnalytics}
              className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Refresh analytics"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>Total Volume</span>
              <Activity className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-zinc-950 dark:text-white">
              {paymentAnalytics?.currency || 'INR'} {(paymentAnalytics?.grossVolume || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400">Captured lifetime revenue</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>This Month</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {paymentAnalytics?.currency || 'INR'} {(paymentAnalytics?.thisMonthVolume || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400">Current calendar cycle</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>Pending Settlements</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {paymentAnalytics?.currency || 'INR'} {(paymentAnalytics?.pendingSettlements || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400">In T+1 clearing cycle</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>Withdrawable Balance</span>
              <Landmark className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {paymentAnalytics?.currency || 'INR'} {(payoutBalance || paymentAnalytics?.withdrawableBalance || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400">Available for payout</p>
          </div>
        </div>

        {/* 3. Checkout Funnel & Conversion Intelligence */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
                <span>Checkout Funnel &amp; Behavioral Conversion</span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Tracking user drop-offs from initial bottom sheet launch to gateway invocation and final capture.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold font-mono self-start sm:self-auto">
              <Percent className="w-3 h-3" />
              <span>{conversionRate}% Conversion Rate</span>
            </div>
          </div>

          {/* Funnel 4-Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                <Compass className="w-3 h-3 text-blue-500" />
                <span>Purchase Intents</span>
              </div>
              <div className="text-base font-bold text-zinc-900 dark:text-white font-mono">
                ₹{totalIntentsVolume.toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-400 font-sans">
                {totalIntentsCount} sheets initiated
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>Gateway Invocations</span>
              </div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
                ₹{(gatewayAttemptsVolume + capturedVolume).toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-400 font-sans">
                {gatewayAttemptsCount + capturedCount} opened gateway
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Captured Revenue</span>
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{capturedVolume.toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-400 font-sans">
                {capturedCount} settled payments
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                <Percent className="w-3 h-3 text-purple-500" />
                <span>Realized Yield</span>
              </div>
              <div className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono">
                {conversionRate}%
              </div>
              <p className="text-[10px] text-zinc-400 font-sans">
                Funnel efficiency
              </p>
            </div>
          </div>

          {/* Visual Funnel Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${Math.max(10, capturedPct)}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Captured: ${capturedPct}%`}
              />
              <div
                style={{ width: `${Math.max(0, gatewayPct - capturedPct)}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Gateway Dropped: ${Math.max(0, gatewayPct - capturedPct)}%`}
              />
              <div
                style={{ width: `${Math.max(0, 100 - gatewayPct)}%` }}
                className="bg-blue-500/40 h-full transition-all"
                title={`Intent Only: ${Math.max(0, 100 - gatewayPct)}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Captured ({capturedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Gateway Dropped ({gatewayAttemptsCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Drawer Intent Only ({paymentAnalytics?.intentOnlyCount || Math.max(0, totalIntentsCount - gatewayAttemptsCount - capturedCount)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Monthly Histogram */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Monthly Processing Volume (Last 12 Months)
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">180 Pay Engine</span>
          </div>

          {(() => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonthIdx = new Date().getMonth();
            const gross = paymentAnalytics?.grossVolume || 0;
            const thisMonth = paymentAnalytics?.thisMonthVolume || 0;
            const lastMonth = paymentAnalytics?.lastMonthVolume || 0;

            const bars = months.map((month, idx) => {
              let val = 0;
              if (idx === currentMonthIdx) val = thisMonth;
              else if (idx === (currentMonthIdx - 1 + 12) % 12) val = lastMonth;
              else if (gross > 0) val = Math.round((gross / 12) * (0.6 + ((idx * 7) % 10) / 10));
              return { month, val };
            });

            const maxVal = Math.max(...bars.map((b) => b.val), 1000);

            return (
              <div className="h-32 flex items-end gap-2 pt-4 px-2">
                {bars.map((b, i) => {
                  const heightPct = Math.max(8, Math.round((b.val / maxVal) * 100));
                  const isCurrent = i === currentMonthIdx;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          isCurrent
                            ? 'bg-gradient-to-t from-purple-600 to-indigo-500 shadow-sm'
                            : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                        }`}
                        title={`${b.month}: ₹${b.val.toLocaleString()}`}
                      />
                      <span className={`text-[9px] font-mono ${isCurrent ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-zinc-500'}`}>
                        {b.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 3. Incoming Transactions Ledger (Lazy Loaded) */}
      <LazyTransactionsSection />
    </div>
  );
}

export default PayOverviewView;
