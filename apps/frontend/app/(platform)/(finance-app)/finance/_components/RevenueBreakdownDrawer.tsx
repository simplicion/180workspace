'use client';

import React from 'react';
import { 
    X, 
    TrendingUp, 
    DollarSign, 
    FileText, 
    Briefcase, 
    CheckCircle2, 
    ArrowDownLeft, 
    Building2,
    Calendar,
    Download
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface RevenueBreakdownDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    stats: any;
}

export default function RevenueBreakdownDrawer({
    isOpen,
    onClose,
    stats
}: RevenueBreakdownDrawerProps) {
    if (!isOpen) return null;

    const revenueData = stats?.breakdown?.revenue || {
        total: stats?.totalRevenue || 0,
        dealRevenue: 0,
        invoiceRevenue: 0,
        recentItems: []
    };

    const recentItems = revenueData.recentItems || [];
    const totalAmount = revenueData.total || stats?.totalRevenue || 0;

    const handleExportCSV = () => {
        if (recentItems.length === 0) {
            toast.error('No revenue records to export');
            return;
        }

        const headers = ['ID', 'Type', 'Title / Item', 'Client / Counterparty', 'Amount (INR)', 'Status', 'Date'];
        const rows = recentItems.map((item: any) => [
            item.id,
            item.type,
            `"${item.name || ''}"`,
            `"${item.client || ''}"`,
            item.amount,
            item.status,
            format(new Date(item.date), 'yyyy-MM-dd HH:mm:ss')
        ]);

        const csvContent = [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `revenue-breakdown-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Revenue ledger exported to CSV');
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
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-gray-900 dark:to-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Revenue Breakdown
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        +12.5% Inflow
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Contracts, client retainers, and paid invoice settlements
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
                        
                        {/* Hero Card */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 dark:from-gray-800/80 dark:via-gray-800 dark:to-gray-800/50 border border-emerald-100/80 dark:border-gray-700 shadow-sm relative overflow-hidden">
                            <div className="absolute right-3 top-3 opacity-10 pointer-events-none">
                                <TrendingUp className="w-24 h-24 text-emerald-600" />
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                <ArrowDownLeft className="w-3.5 h-3.5" /> Total Inflow Volume
                            </span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                                    ₹{totalAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">INR</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-emerald-100 dark:border-gray-700/60">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-400">Commercial Deals</span>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        ₹{(revenueData.dealRevenue || 0).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-400">Paid Invoices</span>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        ₹{(revenueData.invoiceRevenue || 0).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Revenue Items */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                    Recent Inbound Transactions
                                </h3>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {recentItems.length} settlements
                                </span>
                            </div>

                            {recentItems.length === 0 ? (
                                <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">No recent commercial inflows recorded.</p>
                                </div>
                            ) : (
                                recentItems.map((item: any, idx: number) => (
                                    <div 
                                        key={idx}
                                        className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-2 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {item.name}
                                                </span>
                                            </div>
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                +₹{item.amount.toLocaleString('en-IN')}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300 font-medium">
                                                <Building2 className="w-3 h-3 text-gray-400" />
                                                {item.client}
                                            </span>
                                            <span className="font-mono">{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-50 dark:border-gray-700/40">
                                            <span>Provider: <strong className="text-gray-600 dark:text-gray-300">{item.provider}</strong></span>
                                            <span className="capitalize font-semibold text-emerald-600 dark:text-emerald-400">
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex items-center justify-between">
                        <button
                            onClick={handleExportCSV}
                            className="btn-secondary text-xs flex items-center gap-1.5 py-2"
                        >
                            <Download className="w-3.5 h-3.5" /> Export Revenue CSV
                        </button>
                        <button
                            onClick={onClose}
                            className="btn-primary text-xs py-2 px-5"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
