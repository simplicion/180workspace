'use client';

import React from 'react';
import { 
    X, 
    Wallet, 
    TrendingUp, 
    TrendingDown, 
    Percent, 
    Activity, 
    ShieldCheck, 
    Scale
} from 'lucide-react';
import clsx from 'clsx';

interface NetBalanceBreakdownDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    stats: any;
}

export default function NetBalanceBreakdownDrawer({
    isOpen,
    onClose,
    stats
}: NetBalanceBreakdownDrawerProps) {
    if (!isOpen) return null;

    const netData = stats?.breakdown?.netBalance || {
        revenue: stats?.totalRevenue || 0,
        payouts: stats?.totalPayouts || 0,
        net: stats?.netBalance || 0,
        grossMargin: stats?.grossMargin || 0,
        workingCapital: stats?.workingCapital || 0,
        quickRatio: stats?.quickRatio || 0
    };

    const isPositive = (netData.net || 0) >= 0;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 animate-in slide-in-from-right">
                    
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-white dark:from-blue-950/20 dark:via-gray-900 dark:to-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Net Cash Position
                                    <span className={clsx(
                                        "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full",
                                        isPositive 
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                    )}>
                                        {isPositive ? 'Surplus' : 'Deficit'}
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Real-time retained operating balance & liquidity health
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
                        
                        {/* Net Position Hero Card */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50/40 dark:from-gray-800/80 dark:via-gray-800 dark:to-gray-800/50 border border-blue-100/80 dark:border-gray-700 shadow-sm relative overflow-hidden">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Scale className="w-3.5 h-3.5" /> Net Free Cash Flow
                            </span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className={clsx(
                                    "text-3xl font-black tracking-tight",
                                    isPositive ? "text-gray-900 dark:text-white" : "text-rose-600 dark:text-rose-400"
                                )}>
                                    ₹{(netData.net || 0).toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">INR</span>
                            </div>

                            {/* Flow Breakdown Equation */}
                            <div className="mt-4 pt-4 border-t border-blue-100 dark:border-gray-700/60 flex items-center justify-between text-xs font-bold">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-gray-400 font-normal">Gross Revenue Inflows</span>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold">+₹{(netData.revenue || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="text-gray-300 font-black text-sm">-</div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-gray-400 font-normal">Total Cash Outflows</span>
                                    <p className="text-rose-600 dark:text-rose-400 font-bold">-₹{(netData.payouts || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="text-gray-300 font-black text-sm">=</div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-gray-400 font-normal">Retained Cash</span>
                                    <p className="text-blue-600 dark:text-blue-400 font-bold">₹{(netData.net || 0).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Health & Liquidity Ratios */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                Treasury & Solvency Metrics
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm">
                                    <div className="flex items-center justify-between text-gray-400 mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Operating Margin</span>
                                        <Percent className="w-3.5 h-3.5 text-indigo-500" />
                                    </div>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">
                                        {netData.grossMargin || 0}%
                                    </p>
                                    <span className="text-[10px] text-gray-400">Net margin on commercial billings</span>
                                </div>

                                <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm">
                                    <div className="flex items-center justify-between text-gray-400 mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Working Capital</span>
                                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                                    </div>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">
                                        ₹{(netData.workingCapital || 0).toLocaleString('en-IN')}
                                    </p>
                                    <span className="text-[10px] text-gray-400">Cash + uncollected receivables</span>
                                </div>
                            </div>
                        </div>

                        {/* Treasury Security Note */}
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-xs space-y-1">
                            <p className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" /> GAAP / Double-Entry Balanced
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                Balances reflect real-time reconciled ledgers across accounts receivable, accounts payable, and escrow settlements.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex justify-end">
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
