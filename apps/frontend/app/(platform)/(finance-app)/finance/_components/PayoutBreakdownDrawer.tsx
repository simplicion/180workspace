'use client';

import React, { useState } from 'react';
import { 
    X, 
    TrendingDown, 
    Banknote, 
    ArrowUpRight, 
    Users, 
    Layers, 
    CreditCard, 
    CheckCircle2, 
    Clock, 
    Download, 
    Plus, 
    ShieldCheck, 
    ExternalLink,
    Building2,
    DollarSign,
    Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface PayoutBreakdownDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    stats: any;
    onOpenRecordTx?: () => void;
}

export default function PayoutBreakdownDrawer({
    isOpen,
    onClose,
    stats,
    onOpenRecordTx
}: PayoutBreakdownDrawerProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'payroll'>('overview');

    if (!isOpen) return null;

    const payoutData = stats?.breakdown?.payouts || {
        total: stats?.totalPayouts || 0,
        payrollTotal: 0,
        opexTotal: stats?.opexApproved || 0,
        txDebits: 0,
        categories: [],
        recentItems: []
    };

    const categories = payoutData.categories || [];
    const recentItems = payoutData.recentItems || [];
    const totalAmount = payoutData.total || stats?.totalPayouts || 0;

    const handleExportCSV = () => {
        if (recentItems.length === 0) {
            toast.error('No payout records to export');
            return;
        }

        const headers = ['ID', 'Type', 'Beneficiary / Name', 'Category', 'Amount (INR)', 'Status', 'Provider', 'Date'];
        const rows = recentItems.map((item: any) => [
            item.id,
            item.type,
            `"${item.name || ''}"`,
            `"${item.category || ''}"`,
            item.amount,
            item.status,
            `"${item.provider || ''}"`,
            format(new Date(item.date), 'yyyy-MM-dd HH:mm:ss')
        ]);

        const csvContent = [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payouts-breakdown-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Payout ledger exported to CSV');
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 animate-in slide-in-from-right">
                    
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-rose-50/50 via-white to-white dark:from-rose-950/20 dark:via-gray-900 dark:to-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                                <TrendingDown className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Payouts Breakdown
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                        Outflows
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Itemized composition of cash disbursements, payroll & OPEX
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Close drawer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* Total Outflow Hero Card */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50 via-white to-amber-50/40 dark:from-gray-800/80 dark:via-gray-800 dark:to-gray-800/50 border border-rose-100/80 dark:border-gray-700 shadow-sm relative overflow-hidden">
                            <div className="absolute right-3 top-3 opacity-10 pointer-events-none">
                                <TrendingDown className="w-24 h-24 text-rose-600" />
                            </div>
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Banknote className="w-3.5 h-3.5" /> Total Disbursed & Scheduled
                            </span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                                    ₹{totalAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">INR</span>
                            </div>

                            {/* Sub-allocations */}
                            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-rose-100 dark:border-gray-700/60">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-400">Payroll Total</span>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        ₹{(payoutData.payrollTotal || 0).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-400">Vendor & OPEX</span>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        ₹{(payoutData.opexTotal || 0).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-gray-100 dark:border-gray-800 gap-6">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={clsx(
                                    "pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5",
                                    activeTab === 'overview'
                                        ? "border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400"
                                        : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                )}
                            >
                                <Layers className="w-3.5 h-3.5" /> Category Breakdown
                            </button>
                            <button
                                onClick={() => setActiveTab('items')}
                                className={clsx(
                                    "pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5",
                                    activeTab === 'items'
                                        ? "border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400"
                                        : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                )}
                            >
                                <CreditCard className="w-3.5 h-3.5" /> Itemized Payouts ({recentItems.length})
                            </button>
                        </div>

                        {/* Tab 1: Category Allocation */}
                        {activeTab === 'overview' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                        Expense Category Allocation
                                    </h3>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        {categories.length} Categories
                                    </span>
                                </div>

                                {categories.length === 0 ? (
                                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">No category breakdown recorded yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {categories.map((cat: any, idx: number) => (
                                            <div 
                                                key={idx}
                                                className="p-3.5 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                                                        {cat.name}
                                                    </span>
                                                    <span className="text-xs font-black text-gray-900 dark:text-white">
                                                        ₹{cat.amount.toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-gray-400">
                                                    <span>{cat.count} line items</span>
                                                    <span className="font-semibold text-rose-600 dark:text-rose-400">{cat.percentage}% of total</span>
                                                </div>
                                                {/* Progress line */}
                                                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mt-2">
                                                    <div 
                                                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Payout Rails Trust Info */}
                                <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs space-y-1">
                                        <p className="font-bold text-indigo-950 dark:text-indigo-200">Automated Direct Payout Rails</p>
                                        <p className="text-indigo-700/80 dark:text-indigo-300/80">
                                            Disbursements route through direct RazorpayX & IMPS/NEFT banking rails with real-time UTR reconciliation.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Itemized Payouts */}
                        {activeTab === 'items' && (
                            <div className="space-y-3">
                                {recentItems.length === 0 ? (
                                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">No recent payout records found.</p>
                                    </div>
                                ) : (
                                    recentItems.map((item: any, idx: number) => (
                                        <div 
                                            key={idx}
                                            className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "w-2 h-2 rounded-full",
                                                        item.status === 'completed' || item.status === 'paid' ? "bg-emerald-500" :
                                                        item.status === 'approved' ? "bg-blue-500" : "bg-amber-500"
                                                    )} />
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                                                    -₹{item.amount.toLocaleString('en-IN')}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-gray-400">
                                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                                                    {item.category}
                                                </span>
                                                <span className="font-mono">{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-50 dark:border-gray-700/40">
                                                <span>Rail: <strong className="text-gray-600 dark:text-gray-300">{item.provider}</strong></span>
                                                <span className="capitalize font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex items-center justify-between gap-3">
                        <button
                            onClick={handleExportCSV}
                            className="btn-secondary text-xs flex items-center gap-1.5 py-2"
                        >
                            <Download className="w-3.5 h-3.5" /> Export CSV
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                                Done
                            </button>
                            {onOpenRecordTx && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onOpenRecordTx();
                                    }}
                                    className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Record Transaction
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
