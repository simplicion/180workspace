'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Landmark,
  RotateCw,
  Loader2,
  Clock,
  ArrowUpRight,
  Send,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProject } from '@/context/ProjectContext';

export function PayPayoutsView() {
  const {
    projectId,
    payoutBalance,
    payoutHistory,
    loadingPayoutHistory,
    fetchPayoutHistory,
  } = useProject();

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [bankAccNumber, setBankAccNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPayoutHistory();
  }, [fetchPayoutHistory]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid payout amount');
      return;
    }
    if (amountNum > payoutBalance) {
      toast.error(`Amount exceeds available balance of ₹${payoutBalance.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const apiBase = isLocal ? 'http://localhost:4003' : 'https://services.180workspace.com';

      const res = await fetch(`${apiBase}/api/v1/identity/developer/apps/${projectId}/payouts/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          payoutMethod,
          accountDetails:
            payoutMethod === 'UPI'
              ? { upiId }
              : { accountNumber: bankAccNumber, ifscCode: bankIfsc, accountHolderName: bankHolder },
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to submit payout request');

      toast.success('Payout request submitted successfully for settlement review!');
      setShowPayoutModal(false);
      setPayoutAmount('');
      fetchPayoutHistory();
    } catch (err: any) {
      toast.error(err.message || 'Payout request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Request Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleRequestPayout}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
              <span className="font-bold text-sm text-zinc-950 dark:text-white flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Withdraw to Bank or UPI</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={payoutBalance}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder={`Max ₹${payoutBalance.toLocaleString()}`}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Transfer Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('UPI')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                      payoutMethod === 'UPI'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10'
                    }`}
                  >
                    UPI ID (Instant)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK_TRANSFER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                      payoutMethod === 'BANK_TRANSFER'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10'
                    }`}
                  >
                    NEFT / IMPS
                  </button>
                </div>
              </div>

              {payoutMethod === 'UPI' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    VPA / UPI ID
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. merchant@okaxis"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Account Number</label>
                    <input
                      type="text"
                      required
                      value={bankAccNumber}
                      onChange={(e) => setBankAccNumber(e.target.value)}
                      placeholder="e.g. 501004561234"
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">IFSC Code</label>
                    <input
                      type="text"
                      required
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value)}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Holder Name</label>
                    <input
                      type="text"
                      required
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      placeholder="e.g. Acme Technologies Pvt Ltd"
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Submit Request</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Balance & Action Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Available Withdrawable Balance</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Settled merchant revenues ready for instant payout disbursement to your account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPayoutModal(true)}
            disabled={payoutBalance <= 0}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Request Payout</span>
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Settled Balance
            </span>
            <div className="text-3xl font-extrabold text-zinc-950 dark:text-white mt-1">
              ₹{payoutBalance.toLocaleString()}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Instant settlement available via UPI 24x7 or NEFT/RTGS on banking days.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPayoutHistory}
            disabled={loadingPayoutHistory}
            className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer self-start sm:self-auto"
            title="Refresh payout balance"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingPayoutHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 3. Payout History Ledger */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
            Payout Settlement Records
          </h3>

          {loadingPayoutHistory && payoutHistory.length === 0 ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          ) : payoutHistory.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 font-semibold font-sans">
                  <tr>
                    <th className="px-4 py-3">Payout ID</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Requested At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                  {payoutHistory.map((p: any) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="px-4 py-3 font-semibold text-zinc-950 dark:text-white">
                        {p.id?.slice(0, 14)}...
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{(p.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 font-sans">{p.payoutMethod || 'UPI'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {p.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-[11px]">
                        {new Date(p.createdAt || Date.now()).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-center text-xs text-zinc-500">
              No previous payout records found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PayPayoutsView;
