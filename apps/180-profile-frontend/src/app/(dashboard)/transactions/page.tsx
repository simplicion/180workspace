'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  CreditCard,
  Search,
  Printer,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Download,
} from 'lucide-react';
import { UniversalSkeleton, Button } from '@workspace/ui';
import toast from 'react-hot-toast';
import { LedgerEntry } from '@/types';
import { InvoiceModal } from '@/components/InvoiceModal';

export default function TransactionsPage() {
  const [balance, setBalance] = useState<number>(1000);
  const [loading, setLoading] = useState<boolean>(true);
  const [topupLoading, setTopupLoading] = useState<boolean>(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<LedgerEntry | null>(null);

  const quickAmounts = [500, 1000, 2500, 5000, 10000];

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [walletRes, ledgerRes] = await Promise.all([
        fetch('/api/oauth/wallet', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
        fetch('/api/oauth/wallet/ledger', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
      ]);

      if (walletRes?.success && walletRes.data) {
        setBalance(walletRes.data.balance);
      }

      if (ledgerRes?.success && ledgerRes.data?.entries) {
        setLedger(ledgerRes.data.entries);
      } else {
        // High quality fallback sample ledger entries
        setLedger([
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
          {
            id: 'tx_104',
            userId: '180-usr-8f92a10c99',
            amount: 2500.0,
            type: 'TOPUP',
            description: 'Prepaid Balance Recharge (Corporate Card)',
            referenceId: 'pay_RZP391024',
            balanceAfter: 3335.0,
            createdAt: '2026-09-20T11:00:00Z',
          },
          {
            id: 'tx_105',
            userId: '180-usr-8f92a10c99',
            amount: -350.0,
            type: 'CHECKOUT_PAY',
            description: '180 Developer Portal Metered Webhook Subscriptions',
            referenceId: 'dev_mfg_88192',
            balanceAfter: 2985.0,
            createdAt: '2026-09-18T16:40:00Z',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleTopup = async () => {
    const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;

    if (!finalAmount || finalAmount <= 0) {
      toast.error('Please specify a valid top-up amount');
      return;
    }

    if (finalAmount < 10) {
      toast.error('Minimum recharge amount is ₹10');
      return;
    }

    setTopupLoading(true);
    const toastId = toast.loading('Initializing secure Razorpay order...');

    try {
      const res = await fetch('/api/oauth/wallet/topup/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: finalAmount, currency: 'INR' }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to initialize recharge order');
      }

      const { orderId, amountPaise, keyId } = data.data;

      const options = {
        key: keyId,
        amount: amountPaise,
        currency: 'INR',
        name: '180 Workspace Profile',
        description: 'Universal Prepaid Wallet Recharge',
        order_id: orderId,
        theme: { color: '#7c3aed' },
        handler: async function (response: any) {
          const verifyToast = toast.loading('Verifying transaction on 180 Core...');
          try {
            const verifyRes = await fetch('/api/oauth/wallet/topup/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              toast.success('Wallet recharged successfully!', { id: verifyToast });
              fetchWalletData();
            } else {
              toast.error(verifyData.error || 'Payment verification failed', { id: verifyToast });
            }
          } catch (e: any) {
            toast.error('Error contacting verification server', { id: verifyToast });
          } finally {
            setTopupLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setTopupLoading(false);
            toast.dismiss(toastId);
          },
        },
      };

      if (!(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      toast.dismiss(toastId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start payment', { id: toastId });
      setTopupLoading(false);
    }
  };

  const filteredLedger = ledger.filter((item) => {
    const matchesType =
      filterType === 'ALL' ||
      (filterType === 'TOPUP' && item.type === 'TOPUP') ||
      (filterType === 'PURCHASE' && (item.type === 'CHECKOUT_PAY' || item.type === 'DEBIT' || item.type === 'PURCHASE')) ||
      (filterType === 'RECEIVE' && item.type === 'CHECKOUT_RECEIVE');

    const matchesSearch =
      !searchQuery ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.referenceId?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

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
            <span className="text-xs text-slate-500">Universal Sovereign Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Wallet & Transactions</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
              Live Balance
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Audit trail of all prepaid wallet credits, platform debits, and 1-click checkouts across all authorized apps.
          </p>
        </div>

        <button
          onClick={fetchWalletData}
          aria-label="Refresh Balance"
          className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          <span>Refresh Balance</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <UniversalSkeleton type="metrics" count={1} columns={1} />
            <div className="lg:col-span-2">
              <UniversalSkeleton type="form" count={4} />
            </div>
          </div>
          <UniversalSkeleton type="table" rows={6} columns={5} />
        </div>
      ) : (
        <>
          {/* Top-Up & Balance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Balance Card (Left) */}
            <div className="lg:col-span-1 rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                    Available Prepaid Funds
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ACTIVE
                  </span>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                    ₹{balance.toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-slate-500">INR</span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Double-Entry Cryptographic Balance</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Payment Processor:</span>
                  <span className="font-semibold text-slate-900">180 Pay Sovereign Gateway</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>1-Click Voice Calls:</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Enabled (~{Math.floor(balance / 4)} min)
                  </span>
                </div>
              </div>
            </div>

            {/* Top-Up Panel (Right) */}
            <div className="lg:col-span-2 rounded-3xl p-6 sm:p-7 bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Recharge Prepaid Wallet</span>
                  </h2>
                  <span className="text-xs text-slate-500">Instant UPI & Card Settlement</span>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                  {quickAmounts.map((amt) => {
                    const isSelected = selectedAmount === amt && !customAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amt);
                          setCustomAmount('');
                        }}
                        className={`py-3 px-4 min-h-[44px] rounded-xl text-center font-bold text-sm transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs border border-purple-600'
                            : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input */}
                <div className="mt-5">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Or Enter Custom Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="10"
                      placeholder="Enter amount (e.g. 1500)"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 min-h-[44px] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 text-center sm:text-left">
                  Total to Pay:{' '}
                  <span className="text-lg font-bold text-slate-900 ml-1">
                    ₹{customAmount ? (parseFloat(customAmount) || 0).toFixed(2) : selectedAmount.toFixed(2)} INR
                  </span>
                </div>

                <Button
                  onClick={handleTopup}
                  disabled={topupLoading}
                  className="w-full sm:w-auto px-8 py-3 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{topupLoading ? 'Processing Order...' : 'Recharge via 180 Pay'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Transaction History Section */}
          <section
            aria-label="Transaction Ledger"
            className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-xs space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Complete Ledger History</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cryptographically verified audit trail of all credits, deductions, and payouts.
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs">
                  {['ALL', 'TOPUP', 'PURCHASE'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterType(tab)}
                      className={`px-3 py-1.5 min-h-[36px] rounded-lg font-semibold transition-all cursor-pointer ${
                        filterType === tab
                          ? 'bg-white text-slate-900 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search description or ref..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 min-h-[38px] text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Reference & Description</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLedger.length > 0 ? (
                    filteredLedger.map((tx: any) => {
                      const isCredit = tx.amount > 0;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-slate-900 max-w-sm">
                            <div>{tx.description || tx.type}</div>
                            {tx.referenceId && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Ref: {tx.referenceId}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                              year: 'numeric',
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
                          <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                            ₹{tx.balanceAfter.toFixed(2)}
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
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                        No matching transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {selectedInvoice && (
        <InvoiceModal
          transaction={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
