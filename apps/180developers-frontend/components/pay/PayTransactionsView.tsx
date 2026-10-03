'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Receipt,
  Search,
  RotateCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';

export function PayTransactionsView() {
  const { paymentAnalytics, loadingAnalytics, fetchPaymentAnalytics, copiedKey, copyToClipboard } = useProject();

  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState<'ALL' | 'CAPTURED' | 'PENDING' | 'FAILED'>('ALL');
  const [selectedTx, setSelectedTx] = useState<any>(null);

  // Lazy loading pagination
  const [displayedCount, setDisplayedCount] = useState(15);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPaymentAnalytics();
  }, [fetchPaymentAnalytics]);

  const rawTxs = paymentAnalytics?.transactions || [];

  const filteredTxs = useMemo(() => {
    return rawTxs.filter((tx: any) => {
      if (txStatusFilter !== 'ALL' && tx.status !== txStatusFilter) return false;
      if (txSearchQuery.trim()) {
        const q = txSearchQuery.toLowerCase();
        const matchId = (tx.id || '').toLowerCase().includes(q);
        const matchPhone = (tx.customerPhone || '').toLowerCase().includes(q);
        const matchName = (tx.customerName || '').toLowerCase().includes(q);
        const matchAmount = String(tx.amount || '').includes(q);
        return matchId || matchPhone || matchName || matchAmount;
      }
      return true;
    });
  }, [rawTxs, txStatusFilter, txSearchQuery]);

  const visibleTxs = useMemo(() => {
    return filteredTxs.slice(0, displayedCount);
  }, [filteredTxs, displayedCount]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedCount < filteredTxs.length) {
          setDisplayedCount((prev) => Math.min(prev + 15, filteredTxs.length));
        }
      },
      { threshold: 0.2 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [displayedCount, filteredTxs.length]);

  return (
    <div className="space-y-6">
      {/* 1. Transaction Detail Drawer Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
              <span className="font-bold text-sm text-zinc-950 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Transaction Receipt Details</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-white/5">
                <span className="text-zinc-400">Transaction ID:</span>
                <span className="text-zinc-950 dark:text-white">{selectedTx.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-white/5">
                <span className="text-zinc-400">Amount:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedTx.currency || 'INR'} {selectedTx.amount}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-white/5">
                <span className="text-zinc-400">Status:</span>
                <span className="text-emerald-600 font-bold">{selectedTx.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-white/5">
                <span className="text-zinc-400">Customer:</span>
                <span className="text-zinc-950 dark:text-white">{selectedTx.customerName || 'Customer'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-white/5">
                <span className="text-zinc-400">Method:</span>
                <span className="text-zinc-950 dark:text-white">{selectedTx.method || 'Sovereign Wallet'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Date:</span>
                <span className="text-zinc-950 dark:text-white">
                  {new Date(selectedTx.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Ledger Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Incoming Transaction Receipts</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live ledger of all customer payments captured across UPI, Wallets, and Cards.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPaymentAnalytics}
            disabled={loadingAnalytics}
            className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer self-start sm:self-auto"
            title="Refresh transactions"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 3. Search and Status Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Tx ID, customer phone, name, or amount..."
              value={txSearchQuery}
              onChange={(e) => {
                setTxSearchQuery(e.target.value);
                setDisplayedCount(15);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs self-start sm:self-auto">
            {(['ALL', 'CAPTURED', 'PENDING', 'FAILED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setTxStatusFilter(st);
                  setDisplayedCount(15);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  txStatusFilter === st
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Transactions Table */}
        <div className="space-y-3">
          {loadingAnalytics && rawTxs.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
              <p className="text-xs text-zinc-400">Loading payment ledger...</p>
            </div>
          ) : visibleTxs.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Receipt / Tx ID</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Customer / Handle</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5 font-mono">
                  {visibleTxs.map((tx: any) => {
                    const isCaptured = tx.status === 'CAPTURED' || tx.status === 'SUCCESS';
                    return (
                      <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-zinc-950 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{tx.id?.slice(0, 14)}...</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(tx.id, `tx_${tx.id}`)}
                              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                              title="Copy Transaction ID"
                            >
                              {copiedKey === `tx_${tx.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-zinc-950 dark:text-white">
                          {tx.currency || 'INR'} {(tx.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 font-sans">
                          {tx.customerName || tx.customerPhone || 'Anonymous'}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-[11px]">
                          {tx.method || 'Sovereign Wallet'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCaptured
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-[11px]">
                          {new Date(tx.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTx(tx)}
                            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                            title="View receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-center text-xs text-zinc-500">
              No transactions match your search criteria.
            </div>
          )}

          {/* Lazy loading infinite scroll anchor */}
          {displayedCount < filteredTxs.length && (
            <div ref={observerTarget} className="py-4 flex items-center justify-center gap-2 text-xs text-zinc-400 font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>Loading more transactions ({displayedCount} of {filteredTxs.length})...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PayTransactionsView;
