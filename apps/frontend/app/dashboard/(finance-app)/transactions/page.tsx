'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, ArrowUpRight, ArrowDownRight, Activity, DollarSign, Wallet } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { LogoLoader } from "@workspace/ui";
import { AddTransactionDrawer } from './_components/AddTransactionDrawer';
import { useSettings } from '@/lib/settings-context';
import CustomSelect from '@/components/ui/CustomSelect';

export default function TransactionsPage() {
    const { company } = useSettings();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [filterType, setFilterType] = useState('all');

    const [filterCategory, setFilterCategory] = useState('all');

    function loadData() {
        setLoading(true);
        Promise.all([
            api.get('/api/transactions'),
            api.get('/api/transactions/kpis')
        ]).then(([txRes, kpiRes]) => {
            setTransactions(txRes.data.data || []);
            setKpis(kpiRes.data.data || null);
        }).catch(() => {
            toast.error('Failed to load ledger data');
        }).finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
    }, []);

    const filteredTransactions = transactions.filter(t => {
        if (filterType !== 'all') {
            const isCredit = ['credit', 'income', 'sales'].includes(t.type.toLowerCase());
            if (filterType === 'credit' && !isCredit) return false;
            if (filterType === 'debit' && isCredit) return false;
        }
        
        if (filterCategory !== 'all') {
            if ((t.metadata?.category || '').toLowerCase() !== filterCategory) return false;
        }
        
        return true;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: company?.currency || 'USD' }).format(amount);
    };

    const renderGrowth = (growth: number) => {
        if (growth > 0) return <span className="text-green-600 text-sm font-medium flex items-center"><ArrowUpRight className="w-3 h-3 mr-1"/>{growth.toFixed(1)}%</span>;
        if (growth < 0) return <span className="text-red-600 text-sm font-medium flex items-center"><ArrowDownRight className="w-3 h-3 mr-1"/>{Math.abs(growth).toFixed(1)}%</span>;
        return <span className="text-gray-500 text-sm font-medium">0%</span>;
    };

    // Extract unique categories from metadata for the filter
    const categories = ['all', ...Array.from(new Set(transactions.map(t => (t.metadata?.category || 'general').toLowerCase())))];

    if (loading && !transactions.length) return <LogoLoader />;

    return (
        <div className="p-6 w-full h-[calc(100vh-theme(spacing.16))] flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ledger & Transactions</h1>
                    <p className="text-sm text-gray-500 mt-1">Master record of all company financial movements.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Record Transaction
                </button>
            </div>

            {/* KPIs */}
            {kpis && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-500">Net Cash Flow</span>
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalCashFlow.value)}</div>
                        <div className="mt-2 flex items-center gap-2">
                            {renderGrowth(kpis.totalCashFlow.growth)}
                            <span className="text-xs text-gray-400">vs last month</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-500">Money In (Credits)</span>
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                <ArrowDownRight className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalIn.value)}</div>
                        <div className="mt-2 flex items-center gap-2">
                            {renderGrowth(kpis.totalIn.growth)}
                            <span className="text-xs text-gray-400">vs last month</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-500">Money Out (Debits)</span>
                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                <ArrowUpRight className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalOut.value)}</div>
                        <div className="mt-2 flex items-center gap-2">
                            {renderGrowth(kpis.totalOut.growth)}
                            <span className="text-xs text-gray-400">vs last month</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-500">Net Profit</span>
                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                <Wallet className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.netProfit.value)}</div>
                        <div className="mt-2 flex items-center gap-2">
                            {renderGrowth(kpis.netProfit.growth)}
                            <span className="text-xs text-gray-400">vs last month</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 w-fit">
                    {['all', 'credit', 'debit'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={clsx(
                                'px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors',
                                filterType === t ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 flex items-center pr-3">
                    <CustomSelect 
                        value={filterCategory} 
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium text-gray-700 py-2 pl-4 pr-8 focus:ring-0 cursor-pointer outline-none capitalize"
                    >
                        {categories.map(c => (
                            <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                        ))}
                    </CustomSelect>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm relative">
                        <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="py-3 px-4 border-b border-gray-200 whitespace-nowrap">Date</th>
                                <th className="py-3 px-4 border-b border-gray-200">Description</th>
                                <th className="py-3 px-4 border-b border-gray-200 whitespace-nowrap">Type</th>
                                <th className="py-3 px-4 border-b border-gray-200">Reference</th>
                                <th className="py-3 px-4 text-right border-b border-gray-200 whitespace-nowrap">Amount</th>
                                <th className="py-3 px-4 text-center border-b border-gray-200 whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.map(t => {
                                const isCredit = ['credit', 'income', 'sales'].includes(t.type.toLowerCase());
                                return (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                                            {format(new Date(t.createdAt), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-gray-900">{t.metadata?.description || 'Manual Entry'}</div>
                                            <div className="text-xs text-gray-500 mt-0.5 capitalize">{t.metadata?.category || 'General'}</div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className={clsx(
                                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase",
                                                isCredit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {isCredit ? 'Credit' : 'Debit'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 truncate max-w-[200px]">
                                            {t.client?.name || t.user?.name || t.provider || 'N/A'}
                                        </td>
                                        <td className={clsx(
                                            "py-3 px-4 whitespace-nowrap text-right font-semibold",
                                            isCredit ? "text-green-600" : "text-gray-900"
                                        )}>
                                            {isCredit ? '+' : '-'}{formatCurrency(t.amount)}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-center">
                                            <span className={clsx(
                                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                                                t.status === 'completed' ? 'badge-green' : 
                                                t.status === 'pending' ? 'badge-orange' : 'badge-red'
                                            )}>
                                                {t.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-500">
                                        No transactions found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddTransactionDrawer 
                open={showAdd} 
                onClose={() => setShowAdd(false)}
                onSuccess={() => {
                    setShowAdd(false);
                    loadData();
                }}
            />
        </div>
    );
}
