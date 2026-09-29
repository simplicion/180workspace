'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Search,
  ExternalLink,
  Shield,
  Building2,
  Landmark,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LogoLoader, PlatformModal, Button } from '@workspace/ui';

interface PayoutItem {
  id: string;
  appId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED';
  payoutMethod: 'UPI' | 'BANK_TRANSFER';
  accountDetails: {
    upiId?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  };
  adminNote?: string;
  transactionRef?: string;
  requestedAt: string;
  processedAt?: string;
  app?: {
    id: string;
    name: string;
    clientId: string;
    user?: {
      id: string;
      name: string;
      email: string;
      phone?: string;
    };
  };
}

interface AnalyticsData {
  totalPlatformVolume: number;
  totalPaidOut: number;
  totalPendingPayouts: number;
  totalVendorsCount: number;
  pendingPayoutsCount: number;
}

export default function CorePaymentsAdminPage() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Mark as Paid Modal State
  const [selectedPayout, setSelectedPayout] = useState<PayoutItem | null>(null);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [paidAdminNote, setPaidAdminNote] = useState('');
  const [isProcessingPaid, setIsProcessingPaid] = useState(false);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingReject, setIsProcessingReject] = useState(false);

  const getCoreApiBase = () => {
    if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_CORE_BACKEND_URL || 'http://localhost:4003';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:4003' : 'https://api.180workspace.com';
  };

  const fetchData = async () => {
    setLoading(true);
    const apiBase = getCoreApiBase();
    try {
      const [payoutsRes, analyticsRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/developer/admin/payouts`),
        fetch(`${apiBase}/api/v1/developer/admin/analytics`),
      ]);

      if (payoutsRes.ok) {
        const pData = await payoutsRes.json();
        if (pData.success) setPayouts(pData.data || []);
      }

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        if (aData.success) setAnalytics(aData.data);
      }
    } catch (err: any) {
      toast.error('Failed to load payout records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (
    payoutId: string,
    status: 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED',
    adminNote?: string,
    ref?: string
  ) => {
    const apiBase = getCoreApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/developer/admin/payouts/${payoutId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNote: adminNote || '',
          transactionRef: ref || '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update payout status');
      }

      toast.success(`Payout marked as ${status}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const submitMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;
    if (!transactionRef.trim()) {
      toast.error('Transaction reference (UTR/Bank Ref) is required');
      return;
    }

    setIsProcessingPaid(true);
    await handleUpdateStatus(selectedPayout.id, 'PAID', paidAdminNote, transactionRef);
    setIsProcessingPaid(false);
    setShowPaidModal(false);
    setSelectedPayout(null);
    setTransactionRef('');
    setPaidAdminNote('');
  };

  const submitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;
    if (!rejectReason.trim()) {
      toast.error('Please specify a rejection reason for the developer');
      return;
    }

    setIsProcessingReject(true);
    await handleUpdateStatus(selectedPayout.id, 'REJECTED', rejectReason);
    setIsProcessingReject(false);
    setShowRejectModal(false);
    setSelectedPayout(null);
    setRejectReason('');
  };

  const filteredPayouts = payouts.filter((p) => {
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const appName = p.app?.name?.toLowerCase() || '';
      const userName = p.app?.user?.name?.toLowerCase() || '';
      const email = p.app?.user?.email?.toLowerCase() || '';
      const id = p.id.toLowerCase();
      return appName.includes(q) || userName.includes(q) || email.includes(q) || id.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">180 Core Payments & Vendor Settlements</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Central settlement vault for 180 Pay vendor revenues, developer withdrawal requests, and ledger reconciliation.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Ledger</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500">Total Platform Gross Volume</span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            ₹{(analytics?.totalPlatformVolume || 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Captured via 180 Checkout
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500">Total Paid Out to Vendors</span>
          <p className="text-2xl font-extrabold text-indigo-600 font-mono">
            ₹{(analytics?.totalPaidOut || 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400">Settled to bank/UPI accounts</span>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-amber-700">Pending Review Queue</span>
          <p className="text-2xl font-extrabold text-amber-600 font-mono">
            ₹{(analytics?.totalPendingPayouts || 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-amber-600 font-bold">
            {analytics?.pendingPayoutsCount || 0} requests awaiting action
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500">Registered Developer Vendors</span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            {analytics?.totalVendorsCount || 0}
          </p>
          <span className="text-[10px] text-purple-600 font-bold">180 Pay Enabled Apps</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
        {/* Controls: Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'PENDING_REVIEW', 'PROCESSING', 'PAID', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL'
                  ? 'All Payouts'
                  : st === 'PENDING_REVIEW'
                  ? 'Pending Review'
                  : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendor, app, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <LogoLoader className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
            <p className="text-xs text-slate-400">Loading vendor settlement ledger...</p>
          </div>
        ) : filteredPayouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="pb-3">Vendor / App</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Settlement Details</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Requested At</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayouts.map((p) => {
                  const acc = p.accountDetails || {};
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Vendor Info */}
                      <td className="py-3.5">
                        <div className="font-bold text-slate-900 leading-tight">
                          {p.app?.name || 'OAuth Application'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.app?.user?.name} ({p.app?.user?.email || 'No email'})
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {p.id.slice(0, 12)}...
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 font-extrabold text-slate-900 font-mono text-sm">
                        ₹{p.amount.toFixed(2)}
                      </td>

                      {/* Settlement Details */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Landmark className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.payoutMethod}</span>
                        </div>
                        {p.payoutMethod === 'UPI' ? (
                          <div className="text-[11px] text-purple-600 font-mono font-medium">
                            {acc.upiId || 'No UPI ID'}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 font-mono">
                            {acc.accountHolderName} • A/C: {acc.accountNumber} ({acc.ifscCode})
                          </div>
                        )}
                        {p.transactionRef && (
                          <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                            Ref: {p.transactionRef}
                          </div>
                        )}
                        {p.adminNote && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5">
                            Note: {p.adminNote}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : p.status === 'PROCESSING'
                              ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 text-slate-500 text-[11px] font-mono">
                        {new Date(p.requestedAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {p.status === 'PENDING_REVIEW' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(p.id, 'PROCESSING')}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] cursor-pointer"
                            >
                              Process
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayout(p);
                                setShowPaidModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm cursor-pointer"
                            >
                              Mark Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayout(p);
                                setShowRejectModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {p.status === 'PROCESSING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayout(p);
                                setShowPaidModal(true);
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm cursor-pointer"
                            >
                              Complete Payout
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayout(p);
                                setShowRejectModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {(p.status === 'PAID' || p.status === 'REJECTED') && (
                          <span className="text-[11px] text-slate-400 italic">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            No payout requests matching your criteria.
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: MARK AS PAID (WITH UTR REF)
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showPaidModal}
        onClose={() => setShowPaidModal(false)}
        title="Confirm Payout Completion"
        icon={CheckCircle2}
        iconBgClass="bg-emerald-500/10"
        iconColorClass="text-emerald-600"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={submitMarkPaid} className="space-y-4 text-slate-900">
          <p className="text-xs text-slate-500">
            Confirm manual bank transfer or UPI disbursement of{' '}
            <strong className="text-emerald-600">₹{selectedPayout?.amount.toFixed(2)}</strong> to{' '}
            <strong>{selectedPayout?.app?.name}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Transaction Reference / UTR Number *
            </label>
            <input
              type="text"
              placeholder="e.g. UTR29810481024 or IMPS-2910481"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Admin Note (Optional)
            </label>
            <input
              type="text"
              placeholder="Disbursed via HDFC Corporate Banking"
              value={paidAdminNote}
              onChange={(e) => setPaidAdminNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowPaidModal(false)}
              className="px-4 py-2 min-h-[44px] text-xs text-slate-600"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isProcessingPaid}
              className="px-5 py-2 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessingPaid ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Confirm & Mark Paid</span>
            </button>
          </div>
        </form>
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: REJECT PAYOUT (WITH REFUND REASON)
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Payout Request"
        icon={AlertCircle}
        iconBgClass="bg-rose-500/10"
        iconColorClass="text-rose-600"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={submitReject} className="space-y-4 text-slate-900">
          <p className="text-xs text-slate-500">
            Rejecting this payout request of{' '}
            <strong className="text-rose-600">₹{selectedPayout?.amount.toFixed(2)}</strong> will{' '}
            <strong>automatically refund the full amount back to the developer app wallet</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Invalid IFSC Code or Beneficiary Name mismatch. Please update and re-submit."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 min-h-[44px] text-xs text-slate-600"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isProcessingReject}
              className="px-5 py-2 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessingReject ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Reject & Refund Funds</span>
            </button>
          </div>
        </form>
      </PlatformModal>
    </div>
  );
}
