'use client';


import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect } from 'react';
import { PieChart, TrendingUp, TrendingDown, Wallet, History, UserCheck, AlertCircle, ArrowUpRight, ArrowDownLeft, Download, Filter, RefreshCw, Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import clsx from 'clsx';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Transaction { id?: string;
    _id: string;
    type: 'inbound' | 'outbound';
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    provider: string;
    referenceModel: string;
    referenceId: string;
    userId?: { name: string; email: string };
    clientId?: { name: string; email: string; company: string };
    createdAt: string;
    failureReason?: string;
}

interface FinancialStats {
    totalRevenue: number;
    totalPayouts: number;
    pendingInvoices: number;
    unverifiedBanks: number;
    netBalance: number;
}

export default function FinancialDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterType, setFilterType] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    const fetchData = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [statsRes, transRes] = await Promise.all([
                api.get('/api/finance/dashboard-stats'),
                api.get('/api/finance/transactions', {
                    params: {
                        page,
                        type: filterType || undefined,
                        status: filterStatus || undefined
                    }
                })
            ]);

            setStats(statsRes.data.stats);
            setTransactions(transRes.data.transactions);
            setTotalPages(transRes.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch financial data:', error);
            toast.error('Failed to load financial data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, filterType, filterStatus]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
                    <p className="text-gray-500">Monitor revenue, payouts, and transaction ledger</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                        Refresh
                    </button>
                    <button className="btn-primary flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-50 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.5%</span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{stats?.totalRevenue.toLocaleString('en-IN')}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <Wallet className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Net Balance</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{stats?.netBalance.toLocaleString('en-IN')}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-red-50 rounded-xl">
                            <TrendingDown className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Total Payouts</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{stats?.totalPayouts.toLocaleString('en-IN')}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-amber-50 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Pending Items</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-bold text-gray-900">{stats?.pendingInvoices}</h3>
                        <span className="text-xs text-gray-400">Invoices</span>
                        <h3 className="text-2xl font-bold text-gray-900 ml-2">{stats?.unverifiedBanks}</h3>
                        <span className="text-xs text-gray-400">Banks</span>
                    </div>
                </div>
            </div>

            {/* Transactions Table Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-gray-900">Transaction Ledger</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="text-sm border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            title="Filter by Transaction Type"
                            aria-label="Filter by Transaction Type"
                        >
                            <option value="">All Types</option>
                            <option value="inbound">Inbound (Revenue)</option>
                            <option value="outbound">Outbound (Payout)</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="text-sm border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            title="Filter by Status"
                            aria-label="Filter by Status"
                        >
                            <option value="">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Entity</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Provider</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No transactions found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-gray-900">{format(new Date(tx.createdAt), 'MMM dd, yyyy')}</span>
                                                <span className="text-xs text-gray-400 font-mono truncate max-w-[100px]">{tx.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {tx.type === 'inbound' ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{tx.clientId?.company || tx.clientId?.name || 'Unknown Client'}</span>
                                                    <span className="text-xs text-gray-400 capitalize">Client</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{tx.userId?.name || 'System User'}</span>
                                                    <span className="text-xs text-gray-400 capitalize">Employee</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                    tx.referenceModel === 'Invoice' ? "bg-indigo-50 text-indigo-600" :
                                                        tx.referenceModel === 'Salary' ? "bg-purple-50 text-purple-600" : "bg-gray-50 text-gray-600"
                                                )}>
                                                    {tx.referenceModel}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 font-bold">
                                                {tx.type === 'inbound' ? (
                                                    <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
                                                ) : (
                                                    <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                                                )}
                                                <span className={tx.type === 'inbound' ? "text-green-600" : "text-gray-900"}>
                                                    ₹{tx.amount.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "status-badge inline-flex items-center gap-1",
                                                tx.status === 'completed' ? "status-paid" :
                                                    tx.status === 'pending' ? "status-pending" : "status-failed"
                                            )}>
                                                {tx.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                                                    tx.status === 'pending' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {tx.status}
                                            </span>
                                            {tx.status === 'failed' && tx.failureReason && (
                                                <p className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate" title={tx.failureReason}>
                                                    {tx.failureReason}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg uppercase tracking-wider">
                                                {tx.provider}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                aria-label="Previous Page"
                                title="Previous"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                aria-label="Next Page"
                                title="Next"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
