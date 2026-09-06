"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Lock,
  RefreshCw,
  Download,
  Sliders,
  CheckCircle2,
  PhoneCall,
  Zap,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Printer,
  Tag,
  Gift,
  X,
  Percent
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { locationService } from '@/lib/location-service';
import { LogoLoader, PlatformModal } from '@workspace/ui';
import clsx from 'clsx';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function DedicatedWalletSettingsPage() {
  const { user, company } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currencyCode = (wallet?.currency || company?.currency || 'USD').toUpperCase();
  const currencySymbol = wallet?.currencySymbol || company?.currencySymbol || locationService.getCurrencySymbol(currencyCode);
  const isUsd = currencyCode === 'USD';

  // Top-Up State
  const [rechargeAmount, setRechargeAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isRecharging, setIsRecharging] = useState(false);

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    finalPayableAmount: number;
    isFree: boolean;
    message?: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Auto-Recharge State
  const [autoRecharge, setAutoRecharge] = useState(false);
  const [thresholdInr, setThresholdInr] = useState(200);
  const [autoRefillAmount, setAutoRefillAmount] = useState(1000);
  const [savingSettings, setSavingSettings] = useState(false);

  // Ledger State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTypeTab, setActiveTypeTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  // Tax Receipt State
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Fetch Wallet Summary & Balance
  const fetchWallet = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await api.get('/api/v1/wallet');
      const data = res.data?.data || null;
      setWallet(data);

      if (data) {
        setAutoRecharge(Boolean(data.autoRecharge));
        setThresholdInr(Number(data.thresholdInr) || (data.currency === 'USD' ? 10 : 200));
        setAutoRefillAmount(Number(data.rechargeAmountInr) || (data.currency === 'USD' ? 50 : 1000));
        if (data.currency === 'USD') {
          setRechargeAmount(50);
        } else if (data.recommendedInr) {
          setRechargeAmount(Number(data.recommendedInr));
        }
      }
    } catch (err: any) {
      console.error('Failed to load wallet data:', err);
      toast.error(err.response?.data?.error || 'Could not load wallet balance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch Ledger Transactions
  const fetchLedger = async () => {
    try {
      setLedgerLoading(true);
      const params: any = {
        page,
        limit: 15
      };

      if (activeTypeTab !== 'all') params.type = activeTypeTab;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/api/v1/wallet/transactions', { params });
      if (res.data?.success) {
        setTransactions(res.data.data.transactions || []);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalCount(res.data.data.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load transaction ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
    loadRazorpayScript().catch(() => {});
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [page, activeTypeTab]);

  // Handle Search Submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLedger();
  };

  // View GST Tax Receipt Modal
  const handleViewReceipt = async (transactionId: string) => {
    try {
      setReceiptLoading(true);
      const res = await api.get(`/api/v1/wallet/transactions/${transactionId}/receipt`);
      if (res.data?.success) {
        setSelectedReceipt(res.data.data);
      } else {
        toast.error('Tax receipt not available for this entry');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch tax invoice');
    } finally {
      setReceiptLoading(false);
    }
  };

  // Coupon Validation & Application
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponCodeInput.trim()) {
      setCouponError('Please enter a valid promo code');
      return;
    }

    const currentAmount = customAmount ? Number(customAmount) : rechargeAmount;
    if (!currentAmount || currentAmount <= 0) {
      toast.error('Please choose or enter a top-up amount first');
      return;
    }

    try {
      setValidatingCoupon(true);
      setCouponError(null);
      const res = await api.post('/api/v1/wallet/coupon/validate', {
        couponCode: couponCodeInput.trim().toUpperCase(),
        amountInr: currentAmount
      });

      if (res.data?.success && res.data.data?.valid) {
        setAppliedCoupon(res.data.data);
        toast.success(res.data.data.message || `Coupon ${res.data.data.code} applied!`);
      } else {
        const msg = res.data?.error || 'Invalid or inactive coupon code';
        setCouponError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to validate coupon code';
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError(null);
  };

  // Dynamically update discount when user adjusts top-up amount
  useEffect(() => {
    if (!appliedCoupon) return;
    const currentAmount = customAmount ? Number(customAmount) : rechargeAmount;
    if (currentAmount > 0) {
      let discountAmount = 0;
      if (appliedCoupon.discountType === 'percentage') {
        discountAmount = Math.round(((currentAmount * appliedCoupon.discountValue) / 100) * 100) / 100;
      } else {
        discountAmount = Math.min(appliedCoupon.discountValue, currentAmount);
      }
      discountAmount = Math.min(discountAmount, currentAmount);
      const finalPayableAmount = Math.max(0, Math.round((currentAmount - discountAmount) * 100) / 100);
      setAppliedCoupon(prev => prev ? {
        ...prev,
        discountAmount,
        finalPayableAmount,
        isFree: finalPayableAmount === 0
      } : null);
    }
  }, [rechargeAmount, customAmount]);

  // Process Razorpay Top-Up with Custom Coupon Code Support
  const handleTopup = async () => {
    const amountToCharge = customAmount ? Number(customAmount) : rechargeAmount;
    const minTopup = isUsd ? 10 : 100;

    if (!amountToCharge || amountToCharge < minTopup) {
      toast.error(`Minimum top-up amount is ${currencySymbol}${minTopup.toFixed(2)}`);
      return;
    }

    try {
      setIsRecharging(true);

      const orderRes = await api.post('/api/v1/wallet/order', {
        amountInr: amountToCharge,
        couponCode: appliedCoupon?.code
      });

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.error || 'Order creation failed');
      }

      // Case 1: 100% Free Coupon - Instant credit with Zero Payment Gateway Interruption
      if (orderRes.data.data?.isFree) {
        toast.success(
          `🎉 Coupon ${appliedCoupon?.code} Applied! ${currencySymbol}${amountToCharge.toFixed(2)} credited directly to your wallet for FREE!`,
          { duration: 6000 }
        );
        setCustomAmount('');
        setAppliedCoupon(null);
        setCouponCodeInput('');
        fetchWallet(true);
        fetchLedger();
        return;
      }

      // Case 2: Partial or Full Payment through Razorpay
      const scriptLoaded = await loadRazorpayScript();
      const { orderId, amountPaise, keyId, amountInr: netPayable } = orderRes.data.data;

      if (scriptLoaded && (window as any).Razorpay) {
        const options = {
          key: keyId,
          amount: amountPaise,
          currency: currencyCode,
          name: '180workspace',
          description: appliedCoupon
            ? `Prepaid Wallet Top-up (Pay ${currencySymbol}${netPayable.toFixed(2)} for ${currencySymbol}${amountToCharge.toFixed(2)} credit)`
            : `Prepaid Wallet Top-up (${currencySymbol}${amountToCharge.toFixed(2)})`,
          order_id: orderId,
          handler: async (response: any) => {
            try {
              toast.loading('Cryptographically verifying payment truth...', { id: 'wallet-verify' });
              const verifyRes = await api.post('/api/v1/wallet/verify', {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amountInr: netPayable,
                couponCode: appliedCoupon?.code,
                creditedAmount: amountToCharge
              });

              if (verifyRes.data?.success) {
                toast.success(`Success! ${currencySymbol}${amountToCharge.toFixed(2)} credited to your dedicated wallet.`, { id: 'wallet-verify' });
                setCustomAmount('');
                setAppliedCoupon(null);
                setCouponCodeInput('');
                fetchWallet(true);
                fetchLedger();
              }
            } catch (vErr: any) {
              toast.error(vErr.response?.data?.error || 'Cryptographic verification failed', { id: 'wallet-verify' });
            }
          },
          prefill: {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || company?.name || 'Workspace Administrator' : (company?.name || 'Workspace Administrator'),
            email: user?.email || (company as any)?.billingEmail || (company as any)?.email || ''
          },
          theme: { color: '#4f46e5' }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (failRes: any) => {
          toast.error(`Payment failed: ${failRes.error?.description || 'Cancelled'}`);
        });
        rzp.open();
      } else {
        toast.error('Razorpay payment gateway script could not be loaded.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Payment initiation failed');
    } finally {
      setIsRecharging(false);
    }
  };

  // Save Auto-Recharge Automation Rules
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await api.put('/api/v1/wallet/settings', {
        autoRecharge: Boolean(autoRecharge),
        thresholdInr: Number(thresholdInr),
        rechargeAmountInr: Number(autoRefillAmount)
      });
      toast.success('Automated balance guard rules saved successfully!');
      fetchWallet(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Export Transactions as CSV
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const res = await api.get('/api/v1/wallet/transactions/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `180wallet_ledger_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Ledger statement CSV downloaded');
    } catch (err: any) {
      toast.error('Failed to export ledger statement');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <LogoLoader className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const balance = Number(wallet?.balanceInr || 0);
  const isLocked = Boolean(wallet?.isLocked);
  const isLow = Boolean(wallet?.isLow);
  const minRequired = Number(wallet?.minRequiredInr || (isUsd ? 10 : 200));
  const summary = wallet?.summary;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* ─── Header & Isolation Seal ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Prepaid Wallet & Telephony Ledger
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              100% Cryptographic Tenant Isolation
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Dedicated multi-tenant prepaid balance, automated refill rules, call usage economics, and cryptographic ledger.
          </p>
        </div>

        <button
          onClick={() => {
            fetchWallet(true);
            fetchLedger();
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={clsx('h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400', refreshing && 'animate-spin')} />
          {refreshing ? 'Syncing...' : 'Sync Balance'}
        </button>
      </div>

      {/* ─── Top Warning Banner (If Low or Locked) ─────────────────────────── */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-4.5 shadow-sm backdrop-blur-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-rose-900 dark:text-rose-200">
                Voiceforce Telephony Operations are Hard-Locked (Balance: {currencySymbol}{balance.toFixed(2)})
              </p>
              <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
                A minimum balance of {currencySymbol}{minRequired.toFixed(2)} is required to dial or receive calls. Top up {currencySymbol}{Number(wallet?.recommendedInr || (isUsd ? 50 : 1000)).toFixed(2)} to immediately unlock all telephony services.
              </p>
            </div>
          </motion.div>
        )}

        {!isLocked && isLow && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="alert"
            aria-live="polite"
            className="flex items-center gap-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 p-4.5 shadow-sm backdrop-blur-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Low Wallet Balance Warning ({currencySymbol}{balance.toFixed(2)})
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                Your wallet is approaching the {currencySymbol}{minRequired.toFixed(2)} lock threshold. Top up now to prevent carrier call interruptions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Metrics Bento Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Balance Card */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Available Balance</span>
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                isLocked
                  ? 'border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                  : isLow
                  ? 'border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                  : 'border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
              )}
            >
              {isLocked ? 'Hard Locked' : isLow ? 'Low Balance' : 'Operational'}
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">{currencySymbol}{balance.toFixed(2)}</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{currencyCode}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Lock Threshold: {currencySymbol}{minRequired.toFixed(2)}</span>
            <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500">ID: {wallet?.companyId?.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Call Metering Economics */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Telephony Call Rate</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <PhoneCall className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              {currencySymbol}{Number(wallet?.constants?.ratePerMinuteInr || (isUsd ? 0.053 : 6)).toFixed(2)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">/ billable min</span>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            60-second minimum increments. Includes LiveKit STT, Cartesia TTS & carrier bridging.
          </div>
        </div>

        {/* Dedicated Lines Lease */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Virtual DID Lease</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              {currencySymbol}{Number(wallet?.constants?.numberRentalInr || (isUsd ? 2.5 : 149)).toFixed(2)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">/ month</span>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Includes {wallet?.constants?.graceDays || 5}-day automated cooling-down grace period before carrier number release.
          </div>
        </div>

        {/* 30-Day Burn & Runway */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">30-Day Activity</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">{currencySymbol}{summary?.thirtyDayBurnInr?.toFixed(2) || '0.00'}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">spent</span>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {summary?.estimatedRunwayDays !== null && summary?.estimatedRunwayDays !== undefined
              ? `Est. Runway: ~${summary.estimatedRunwayDays} days at current burn`
              : 'Zero active burn recorded over last 30 days'}
          </div>
        </div>
      </div>

      {/* ─── Two-Column Action Layout: Top-Up & Auto-Recharge ──────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Instant Prepaid Top-Up Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Instant Prepaid Top-Up</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cryptographically verified Razorpay payment with zero carrier debt risk.</p>
              </div>
            </div>

            {/* Quick Refill Chips */}
            <div className="mt-6">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Select Top-Up Amount</label>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(isUsd
                  ? [25, 50, 100, 250]
                  : [500, Number(wallet?.recommendedInr || 1000), 2000, 5000].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b)
                ).map((amt) => {
                  const isSelected = !customAmount && rechargeAmount === amt;
                  const isRecommended = amt === Number(wallet?.recommendedInr || (isUsd ? 50 : 1000));
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setCustomAmount('');
                        setRechargeAmount(amt);
                      }}
                      className={clsx(
                        'relative flex flex-col items-center justify-center rounded-xl border p-3 transition-all cursor-pointer min-h-[44px]',
                        isSelected
                          ? 'border-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 font-semibold'
                      )}
                    >
                      <span className="text-sm font-bold">{currencySymbol}{amt}</span>
                      {isRecommended && (
                        <span className="mt-1 rounded bg-indigo-600 dark:bg-indigo-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Recommended
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Or Custom Amount ({currencyCode})</label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500 font-semibold">{currencySymbol}</span>
                <input
                  type="number"
                  min={isUsd ? 10 : 100}
                  step={isUsd ? 5 : 50}
                  placeholder={`Enter custom amount (min ${currencySymbol}${isUsd ? 10 : 100})`}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 pl-8 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {/* Custom Coupon / Promo Code Section */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-indigo-500" />
                  Have a Promo / Coupon Code?
                </label>
                {appliedCoupon && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Applied
                  </span>
                )}
              </div>

              {!appliedCoupon ? (
                <div className="mt-1.5 flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500">
                      <Percent className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. FREE000, FREE100, SAVE20"
                      value={couponCodeInput}
                      onChange={(e) => {
                        setCouponCodeInput(e.target.value.toUpperCase());
                        if (couponError) setCouponError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 pl-9 pr-3 text-sm uppercase tracking-wider font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={validatingCoupon || !couponCodeInput.trim()}
                    className="rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 px-4 text-xs font-semibold shadow-sm transition-all disabled:opacity-40 cursor-pointer min-w-[72px] flex items-center justify-center"
                  >
                    {validatingCoupon ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      %
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          {appliedCoupon.code}
                        </span>
                        <span className="rounded bg-emerald-200/80 dark:bg-emerald-800/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 dark:text-emerald-100">
                          {appliedCoupon.discountType === 'percentage'
                            ? `${appliedCoupon.discountValue}% OFF`
                            : `${currencySymbol}${appliedCoupon.discountValue} OFF`}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {appliedCoupon.isFree ? '100% Free - Zero payment required!' : `Discount savings: ${currencySymbol}${appliedCoupon.discountAmount.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    title="Remove coupon"
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {couponError && (
                <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {couponError}
                </p>
              )}
            </div>

            {/* Live Pricing Breakdown when Coupon is applied */}
            {appliedCoupon && (
              <div className="mt-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Wallet Credit Value</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {currencySymbol}{(customAmount ? Number(customAmount) : rechargeAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span className="font-semibold">
                    -{currencySymbol}{appliedCoupon.discountAmount.toFixed(2)}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-gray-200/60 dark:border-gray-700/60 flex justify-between font-bold text-sm text-gray-900 dark:text-white">
                  <span>Net Payable Amount</span>
                  <span className={appliedCoupon.isFree ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                    {appliedCoupon.isFree ? `FREE (${currencySymbol}0.00)` : `${currencySymbol}${appliedCoupon.finalPayableAmount.toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => handleTopup()}
              disabled={isRecharging}
              className={clsx(
                'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-sm transition-all hover:shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer',
                appliedCoupon?.isFree
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              )}
            >
              {appliedCoupon?.isFree ? (
                <Gift className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {isRecharging
                ? 'Processing Top-Up...'
                : appliedCoupon?.isFree
                ? `Claim 100% Free ${currencySymbol}${(customAmount ? Number(customAmount) : rechargeAmount).toFixed(2)} Credit`
                : appliedCoupon
                ? `Pay ${currencySymbol}${appliedCoupon.finalPayableAmount.toFixed(2)} via Razorpay (Get ${currencySymbol}${(customAmount ? Number(customAmount) : rechargeAmount).toFixed(2)} Credit)`
                : `Top Up ${currencySymbol}${(customAmount ? Number(customAmount) : rechargeAmount).toFixed(2)} via Razorpay`}
            </button>
            <p className="mt-2.5 text-center text-[11px] text-gray-400 dark:text-gray-500">
              {appliedCoupon?.isFree
                ? 'Zero transaction fees & zero payment gateway routing required for free promotion codes.'
                : 'Secured with 256-bit SSL encryption & server-side HMAC SHA-256 truth verification.'}
            </p>
          </div>
        </div>

        {/* Auto-Recharge Automation Rules */}
        <form
          onSubmit={handleSaveSettings}
          className="flex flex-col justify-between rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Automated Balance Guard</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Prevent call hard-locks with automated refill threshold triggers.</p>
              </div>
            </div>

            {/* Toggle switch */}
            <div className="mt-6 flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-4">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Enable Automated Low-Balance Guard</span>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Sends admin alerts & auto-prompts refill when wallet falls below the configured threshold.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoRecharge(!autoRecharge)}
                className={clsx(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  autoRecharge ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
                )}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    autoRecharge ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Trigger Threshold ({currencyCode})</label>
                <div className="relative mt-1.5">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500 font-semibold">{currencySymbol}</span>
                  <input
                    type="number"
                    min={isUsd ? 10 : 200}
                    step={isUsd ? 5 : 50}
                    value={thresholdInr}
                    onChange={(e) => setThresholdInr(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2 pl-8 pr-3 text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <span className="mt-1 block text-[11px] text-gray-400 dark:text-gray-500">
                  Minimum: {currencySymbol}{minRequired.toFixed(2)} (Calling lock threshold)
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Suggested Refill ({currencyCode})</label>
                <div className="relative mt-1.5">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500 font-semibold">{currencySymbol}</span>
                  <input
                    type="number"
                    min={isUsd ? 25 : 500}
                    step={isUsd ? 10 : 100}
                    value={autoRefillAmount}
                    onChange={(e) => setAutoRefillAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2 pl-8 pr-3 text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <span className="mt-1 block text-[11px] text-gray-400 dark:text-gray-500">
                  Recommended: {currencySymbol}{Number(wallet?.recommendedInr || (isUsd ? 50 : 1000)).toFixed(2)} (~{Math.floor(autoRefillAmount / (Number(wallet?.constants?.ratePerMinuteInr) || (isUsd ? 0.053 : 6)))} mins calling)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="submit"
              disabled={savingSettings}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {savingSettings ? 'Saving Configuration...' : 'Save Automation Rules'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Unified Cryptographic Ledger ──────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Transaction Statement & Audit Trail</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Immutable, append-only financial records ({totalCount} total entries).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute inset-y-0 left-0 my-auto ml-3 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reference or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-1.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-64"
              />
            </form>

            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="mt-6 flex flex-wrap gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-3">
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'topup', label: 'Top-Ups' },
            { id: 'call_deduction', label: 'Call Usage' },
            { id: 'number_rental', label: 'Number Leases' },
            { id: 'refund', label: 'Refunds' },
            { id: 'grace_period_warning', label: 'Grace Warnings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTypeTab(tab.id);
                setPage(1);
              }}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                activeTypeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transaction Table */}
        <div className="mt-4 overflow-x-auto">
          {ledgerLoading ? (
            <div className="flex h-48 items-center justify-center">
              <LogoLoader className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-center">
              <Clock className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">No transactions found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Transactions will appear here when you top up or dispatch calls.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-3 pl-2 pr-4 font-semibold">Type & Ref</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance After</th>
                  <th className="py-3 pl-3 pr-2 text-right font-semibold">Tax Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-gray-700 dark:text-gray-300">
                {transactions.map((tx) => {
                  const isCredit = Number(tx.amountInr) > 0;
                  const isZero = Number(tx.amountInr) === 0;

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 pl-2 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={clsx(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                              isCredit
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                : isZero
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                            )}
                          >
                            {isCredit ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : isZero ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white capitalize">
                              {tx.type?.replace(/_/g, ' ')}
                            </span>
                            {tx.paymentRef && (
                              <span className="block font-mono text-[10px] text-gray-400 dark:text-gray-500">
                                {tx.paymentRef}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="max-w-md px-4 py-3.5 text-gray-600 dark:text-gray-300">
                        <p className="truncate text-xs">{tx.description}</p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                        {new Date(tx.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold">
                        <span
                          className={clsx(
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isZero
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {isCredit ? `+${currencySymbol}${tx.amountInr.toFixed(2)}` : `${currencySymbol}${tx.amountInr.toFixed(2)}`}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono font-medium text-gray-900 dark:text-white">
                        {currencySymbol}{Number(tx.balanceAfterInr || 0).toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap py-3.5 pl-3 pr-2 text-right">
                        {isCredit ? (
                          <button
                            onClick={() => handleViewReceipt(tx.id)}
                            disabled={receiptLoading}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                            title="View GST Tax Receipt (HSN 9984)"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Receipt</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Page {page} of {totalPages} ({totalCount} entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || ledgerLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || ledgerLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 cursor-pointer"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Universal Pop-Up Modal: GST Tax Receipt ──────────────────────── */}
      <PlatformModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        title="GST Tax Invoice / Official Receipt"
        icon={FileText}
        iconColorClass="text-indigo-600 dark:text-indigo-400"
        iconBgClass="bg-indigo-50 dark:bg-indigo-950/50"
        subHeader={
          <div className="px-6 pb-2 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
            Invoice #{selectedReceipt?.receiptNumber}
          </div>
        }
        maxWidthClass="max-w-lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Print Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        }
      >
        {selectedReceipt && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Billed To</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.companyName}</span>
                <span className="block font-mono text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">ID: {selectedReceipt.companyId}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Payment Date</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Date(selectedReceipt.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </span>
                <span className="block font-mono text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Ref: {selectedReceipt.paymentRef}</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/80 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">Service Description</th>
                    <th className="py-2.5 px-2 text-center">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-right">Base Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                  <tr>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedReceipt.description}</p>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Prepaid Telephony Infrastructure</span>
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-medium">{selectedReceipt.hsnSacCode}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                      {currencySymbol}{selectedReceipt.baseAmountInr.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 p-4 border border-gray-200 dark:border-gray-700 text-[11px]">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Base Taxable Amount:</span>
                <span className="font-mono text-gray-900 dark:text-white font-medium">{currencySymbol}{selectedReceipt.baseAmountInr.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>CGST ({((Number(selectedReceipt.gstRatePercent) || 18) / 2).toFixed(1)}%):</span>
                <span className="font-mono text-gray-900 dark:text-white font-medium">{currencySymbol}{selectedReceipt.cgstInr.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>SGST ({((Number(selectedReceipt.gstRatePercent) || 18) / 2).toFixed(1)}%):</span>
                <span className="font-mono text-gray-900 dark:text-white font-medium">{currencySymbol}{selectedReceipt.sgstInr.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <span>Total Amount Paid:</span>
                <span className="font-mono font-bold">{currencySymbol}{selectedReceipt.totalAmountInr.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
              This is a computer-generated tax receipt under Indian GST regulations (SAC 9984).
            </p>
          </div>
        )}
      </PlatformModal>
    </div>
  );
}
