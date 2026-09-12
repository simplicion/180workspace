'use client';

import React from 'react';
import { 
    X, 
    ArrowDownLeft, 
    ArrowUpRight, 
    Building2, 
    Calendar, 
    CreditCard, 
    FileText, 
    Hash, 
    ShieldCheck, 
    CheckCircle2, 
    Clock, 
    XCircle,
    Copy,
    Download
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface FinanceDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: any | null;
}

export default function FinanceDetailDrawer({
    isOpen,
    onClose,
    transaction: tx
}: FinanceDetailDrawerProps) {
    if (!isOpen || !tx) return null;

    const isInbound = tx.type === 'inbound';
    const breakdown = tx.breakdown || {
        baseAmount: tx.amount,
        taxAmount: 0,
        feeAmount: 0,
        netAmount: tx.amount,
        debitAccount: isInbound ? '1010 - Operating Bank Account' : '5010 - General Disbursement',
        creditAccount: isInbound ? '4010 - Operating Revenue' : '1010 - Operating Bank Account',
        settlementRail: tx.provider || 'Direct Gateway',
        auditNotes: tx.description
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 animate-in slide-in-from-right">
                    
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-50/80 via-white to-white dark:from-gray-800/60 dark:via-gray-900 dark:to-gray-900">
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                                isInbound 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            )}>
                                {isInbound ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Ledger Receipt & Breakdown
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    Audit record for #{tx.id}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* Transaction Amount Hero */}
                        <div className={clsx(
                            "p-5 rounded-2xl border shadow-sm relative overflow-hidden",
                            isInbound 
                                ? "bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/30 dark:from-gray-800/80 dark:via-gray-800 dark:to-gray-800/50 border-emerald-100/80 dark:border-gray-700"
                                : "bg-gradient-to-br from-rose-50/60 via-white to-amber-50/30 dark:from-gray-800/80 dark:via-gray-800 dark:to-gray-800/50 border-rose-100/80 dark:border-gray-700"
                        )}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={clsx(
                                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    isInbound 
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                )}>
                                    {isInbound ? '↙ MONEY IN (REVENUE)' : '↗ MONEY OUT (PAYOUT)'}
                                </span>
                                <span className={clsx(
                                    "status-badge inline-flex items-center gap-1 text-[11px] font-bold",
                                    tx.status === 'completed' ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300" :
                                    tx.status === 'pending' ? "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300" : "text-rose-700 bg-rose-50"
                                )}>
                                    {tx.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                                     tx.status === 'pending' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    <span className="capitalize">{tx.status}</span>
                                </span>
                            </div>

                            <div className="mt-2">
                                <h3 className={clsx(
                                    "text-3xl font-black tracking-tight",
                                    isInbound ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                                )}>
                                    {isInbound ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                                </h3>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Settled on {format(new Date(tx.createdAt), 'MMMM dd, yyyy • hh:mm a')}
                                </p>
                            </div>
                        </div>

                        {/* Classification */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                Transaction Classification
                            </h4>
                            <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Category</span>
                                    <span className="font-bold text-gray-900 dark:text-white px-2 py-0.5 rounded bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                                        {tx.category}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Reference Model</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{tx.referenceModel}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Description / Memo</span>
                                    <span className="font-medium text-gray-900 dark:text-white max-w-[250px] truncate">{tx.description}</span>
                                </div>
                            </div>
                        </div>

                        {/* Counterparty & Rail */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                Settlement & Counterparty
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-400 flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> Counterparty
                                    </span>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        {tx.entityCompany || tx.entityName || 'Commercial Partner'}
                                    </p>
                                    <span className="text-[10px] text-gray-400 capitalize">{tx.entityRole || 'Client'}</span>
                                </div>

                                <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-400 flex items-center gap-1">
                                        <CreditCard className="w-3 h-3" /> Payment Rail
                                    </span>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        {breakdown.settlementRail || tx.provider}
                                    </p>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Reconciled UTR</span>
                                </div>
                            </div>
                        </div>

                        {/* Double-Entry Ledger Impact */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                General Ledger Double-Entry
                            </h4>
                            <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 font-bold uppercase text-[10px]">
                                            <th className="pb-2">Account</th>
                                            <th className="pb-2 text-right">Debit (DR)</th>
                                            <th className="pb-2 text-right">Credit (CR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40 font-mono">
                                        <tr>
                                            <td className="py-2.5 text-gray-900 dark:text-white font-sans">{breakdown.debitAccount}</td>
                                            <td className="py-2.5 text-right font-bold text-gray-900 dark:text-white">₹{tx.amount.toLocaleString('en-IN')}</td>
                                            <td className="py-2.5 text-right text-gray-300">—</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2.5 text-gray-900 dark:text-white font-sans">{breakdown.creditAccount}</td>
                                            <td className="py-2.5 text-right text-gray-300">—</td>
                                            <td className="py-2.5 text-right font-bold text-gray-900 dark:text-white">₹{tx.amount.toLocaleString('en-IN')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex items-center justify-between">
                        <button
                            onClick={() => copyToClipboard(tx.id, 'Transaction ID')}
                            className="btn-secondary text-xs flex items-center gap-1.5 py-2"
                        >
                            <Copy className="w-3.5 h-3.5" /> Copy ID
                        </button>
                        <button
                            onClick={onClose}
                            className="btn-primary text-xs py-2 px-5"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
