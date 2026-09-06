"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IndianRupee, CreditCard, ArrowUpRight, ArrowDownLeft, Clock, 
  Download, RefreshCw, CheckCircle2, ShieldCheck, Zap, Sliders, AlertCircle, AlertTriangle, Lock
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { UniversalSlideDrawer } from './UniversalSlideDrawer';
import { UniversalSkeleton } from '@workspace/ui';
import clsx from 'clsx';

interface WalletLedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdated?: () => void;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * 180 Voiceforce: Prepaid Wallet Ledger & Razorpay Top-Up Drawer
 * 
 * Rules:
 * - Minimum calling threshold: ₹200.00 (Hard Lock if below ₹200)
 * - Recommended balance: ₹1,000.00
 * - Call rate: ₹6.00 / minute
 * - Number lease: ₹149.00 / month (Auto-released if unpaid for 5 days)
 * - Cryptographic Razorpay checkout with HMAC verification & webhook truth
 */
export function WalletLedgerDrawer({ isOpen, onClose, onBalanceUpdated }: WalletLedgerDrawerProps) {
  const router = useRouter();
  const { user, company } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isRecharging, setIsRecharging] = useState(false);

  // Auto-recharge form state
  const [autoRecharge, setAutoRecharge] = useState(false);
  const [thresholdInr, setThresholdInr] = useState(200);
  const [autoRefillAmount, setAutoRefillAmount] = useState(1000);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const [walletRes, txRes] = await Promise.all([
        api.get('/api/v1/wallet'),
        api.get('/api/v1/wallet/transactions?limit=50').catch(() => ({ data: { data: { transactions: [] } } }))
      ]);
      const data = walletRes.data?.data || null;
      const transactions = txRes.data?.data?.transactions || [];
      setWallet({
        ...data,
        transactions
      });

      if (data) {
        setAutoRecharge(Boolean(data.autoRecharge));
        setThresholdInr(Number(data.thresholdInr) || 200);
        setAutoRefillAmount(Number(data.rechargeAmountInr) || 1000);
      }
    } catch (err: any) {
      toast.error('Failed to load wallet ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
      loadRazorpayScript().catch(() => {});
    }
  }, [isOpen]);

  const handleRecharge = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amountToCharge = customAmount ? Number(customAmount) : rechargeAmount;

    if (!amountToCharge || amountToCharge <= 0) {
      toast.error('Please specify a valid recharge amount');
      return;
    }

    try {
      setIsRecharging(true);
      const scriptLoaded = await loadRazorpayScript();

      // 1. Request Razorpay Order from server
      const orderRes = await api.post('/api/v1/wallet/order', {
        amountInr: amountToCharge
      });

      if (orderRes.data?.success && scriptLoaded && (window as any).Razorpay) {
        const { orderId, amountPaise, keyId } = orderRes.data.data;

        const options = {
          key: keyId,
          amount: amountPaise,
          currency: 'INR',
          name: '180 Voiceforce',
          description: `Prepaid Voice Wallet Top-up (₹${amountToCharge})`,
          order_id: orderId,
          handler: async (response: any) => {
            try {
              toast.loading('Verifying payment cryptographically on server...', { id: 'rzp-verify' });
              const verifyRes = await api.post('/api/v1/wallet/verify', {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amountInr: amountToCharge
              });

              if (verifyRes.data?.success) {
                toast.success(`Payment verified! ₹${amountToCharge.toFixed(2)} credited to your 180 Wallet.`, { id: 'rzp-verify' });
                setCustomAmount('');
                fetchWallet();
                if (onBalanceUpdated) onBalanceUpdated();
              }
            } catch (vErr: any) {
              toast.error(vErr.response?.data?.error || 'Payment verification failed', { id: 'rzp-verify' });
            }
          },
          prefill: {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || company?.name || 'Workspace Admin' : (company?.name || 'Workspace Admin'),
            email: user?.email || company?.billingEmail || ''
          },
          theme: { color: '#f59e0b' }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (failRes: any) => {
          toast.error(`Payment failed: ${failRes.error?.description || 'Cancelled'}`);
        });
        rzp.open();
      } else {
        // Fallback test recharge
        const res = await api.post('/api/v1/wallet/recharge', {
          amountInr: amountToCharge,
          paymentRef: `manual_topup_${Date.now()}`
        });

        if (res.data?.success) {
          toast.success(`Wallet successfully credited with ₹${amountToCharge.toFixed(2)}!`);
          setCustomAmount('');
          fetchWallet();
          if (onBalanceUpdated) onBalanceUpdated();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Recharge request failed');
    } finally {
      setIsRecharging(false);
    }
  };

  const handleSaveAutoRecharge = async () => {
    try {
      setSavingSettings(true);
      const res = await api.put('/api/v1/wallet/settings', {
        autoRecharge: autoRecharge,
        thresholdInr: Number(thresholdInr),
        rechargeAmountInr: Number(autoRefillAmount)
      });

      if (res.data?.success) {
        toast.success('Auto-recharge rules updated successfully!');
        fetchWallet();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save auto-recharge settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportStatementCsv = () => {
    const transactions = wallet?.transactions || [];
    if (transactions.length === 0) {
      toast.error('No ledger transactions to export');
      return;
    }

    const headers = ['Date', 'Type', 'Amount (INR)', 'Balance After (INR)', 'Reference', 'Description'];
    const rows = transactions.map((t: any) => [
      new Date(t.createdAt).toISOString(),
      t.type,
      t.amountInr,
      t.balanceAfterInr,
      t.paymentRef || t.callSessionId || '',
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `180voice_wallet_statement_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Statement CSV exported');
  };

  const balance = Number(wallet?.balanceInr ?? 0);
  const isLocked = balance < 200.0;
  const isLow = balance >= 200.0 && balance <= 300.0;

  return (
    <UniversalSlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="180 Voiceforce Wallet & Billing"
      subtitle="Corporate balance, Razorpay instant top-ups, and transaction statement."
      icon={IndianRupee}
      iconColorClass="text-amber-600 dark:text-amber-400"
      iconBgClass="bg-amber-50 dark:bg-amber-950/60"
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportStatementCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/settings/wallet');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer border border-indigo-200/50 dark:border-indigo-800/50"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Open Settings Wallet Hub</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="p-4 space-y-4">
          <UniversalSkeleton type="detail" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Alert Banner */}
          {isLocked && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
              <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">Voiceforce Calling is Locked</h4>
                <p className="text-[11px] text-rose-700/90 dark:text-rose-400/90 mt-0.5">
                  Your wallet balance is ₹{balance.toFixed(2)}. A minimum balance of ₹{(wallet?.minRequiredInr || 200).toFixed(2)} is required to operate calls. 
                  Unpaid numbers enter a {wallet?.constants?.graceDays || 5}-day grace period before being released to the carrier.
                </p>
              </div>
            </div>
          )}

          {isLow && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">Wallet Balance Running Low</h4>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 mt-0.5">
                  Your balance is ₹{balance.toFixed(2)}. Top up to the recommended ₹{(wallet?.recommendedInr || 1000).toFixed(2)} to prevent calls from locking when balance drops below ₹{(wallet?.minRequiredInr || 200).toFixed(2)}.
                </p>
              </div>
            </div>
          )}

          {/* Live Balance Card */}
          <div className={clsx(
            "p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all",
            isLocked
              ? "bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 shadow-rose-600/20"
              : isLow
              ? "bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-amber-500/20"
              : "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 shadow-emerald-600/20"
          )}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Available 180 Wallet Balance
                </span>
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                  isLocked
                    ? "bg-rose-900/60 text-rose-200 border-rose-400/40"
                    : isLow
                    ? "bg-amber-900/60 text-amber-200 border-amber-400/40"
                    : "bg-emerald-900/60 text-emerald-200 border-emerald-400/40"
                )}>
                  {isLocked ? `Locked (< ₹${(wallet?.minRequiredInr || 200).toFixed(0)})` : isLow ? 'Low Balance' : 'Active & Ready'}
                </span>
              </div>
              <div className="text-3xl font-extrabold tracking-tight mt-1">
                ₹{balance.toFixed(2)}
              </div>
              <p className="text-xs text-white/80 mt-1">
                Calls metered at ₹{Number(wallet?.constants?.ratePerMinuteInr || 6).toFixed(2)}/min. Numbers leased at ₹{Number(wallet?.constants?.numberRentalInr || 149).toFixed(2)}/month.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-5 text-xs text-white/90 gap-1.5">
              <div>Minimum Required: <span className="font-bold text-white">₹{(wallet?.minRequiredInr || 200).toFixed(2)}</span></div>
              <div>Recommended Reserve: <span className="font-bold text-white">₹{(wallet?.recommendedInr || 1000).toFixed(2)}</span></div>
            </div>
          </div>

          {/* Quick Top-Up with Razorpay Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Top Up via Razorpay</h3>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> UPI, Cards, Netbanking
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { amt: 1000, label: '₹1,000', recommended: 1000 === Number(wallet?.recommendedInr || 1000) },
                { amt: 500, label: '₹500', recommended: 500 === Number(wallet?.recommendedInr || 1000) },
                { amt: 2500, label: '₹2,500', recommended: 2500 === Number(wallet?.recommendedInr || 1000) },
                { amt: 5000, label: '₹5,000', recommended: 5000 === Number(wallet?.recommendedInr || 1000) }
              ].map(({ amt, label, recommended }) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setRechargeAmount(amt);
                    setCustomAmount('');
                  }}
                  className={clsx(
                    "relative py-3 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5",
                    rechargeAmount === amt && !customAmount
                      ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20"
                      : "bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  {recommended && (
                    <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-500 text-white mb-0.5">
                      Recommended
                    </span>
                  )}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="200"
                  placeholder="Custom amount (e.g. 1500)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRecharge()}
                disabled={isRecharging}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isRecharging ? 'Opening Razorpay...' : `Pay ₹${customAmount ? Number(customAmount) || 0 : rechargeAmount}`}</span>
              </button>
            </div>
          </div>

          {/* Automated Recharge Settings */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Automated Wallet Refill</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Prevent call locks by auto-refilling when balance reaches threshold.</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoRecharge} 
                  onChange={(e) => setAutoRecharge(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {autoRecharge && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Trigger Threshold (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      min="200"
                      value={thresholdInr}
                      onChange={(e) => setThresholdInr(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Auto-Refill Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      min="500"
                      value={autoRefillAmount}
                      onChange={(e) => setAutoRefillAmount(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 pt-1 text-right">
                  <button
                    type="button"
                    onClick={handleSaveAutoRecharge}
                    disabled={savingSettings}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {savingSettings ? 'Saving...' : 'Save Refill Rules'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Statement Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Transaction Statement</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {wallet?.transactions?.length || 0} entries
              </span>
            </div>

            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/60 sticky top-0 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Balance After</th>
                      <th className="py-2.5 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {!wallet?.transactions || wallet.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-gray-400">
                          No wallet transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      wallet.transactions.map((tx: any) => {
                        const isTopup = tx.type === 'topup' || tx.amountInr > 0;
                        const isNumber = tx.type === 'number_purchase' || tx.type === 'number_rental';
                        const isAutoReleased = tx.type === 'number_auto_released';

                        return (
                          <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                            <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={clsx(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                isTopup
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60"
                                  : isNumber
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60"
                                  : isAutoReleased
                                  ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-700"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60"
                              )}>
                                {isTopup ? '+ Top Up' : isNumber ? '- Number' : isAutoReleased ? 'Released' : '- Call'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold font-mono whitespace-nowrap">
                              <span className={isTopup ? "text-emerald-600 dark:text-emerald-400" : isAutoReleased ? "text-gray-500" : "text-rose-600 dark:text-rose-400"}>
                                {isTopup ? '+' : tx.amountInr === 0 ? '₹' : '-₹'}{Math.abs(tx.amountInr).toFixed(2)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              ₹{Number(tx.balanceAfterInr ?? 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                              {tx.description || 'Prepaid transaction'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </UniversalSlideDrawer>
  );
}
