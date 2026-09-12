'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    TrendingUp, 
    TrendingDown, 
    Wallet, 
    History, 
    AlertCircle, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Download, 
    RefreshCw, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    XCircle, 
    Clock,
    Plus,
    Building2,
    Eye,
    Layers,
    Sparkles,
    Calendar,
    Filter,
    ArrowDownRight,
    Banknote,
    CreditCard,
    Receipt,
    CheckCircle,
    UserCheck,
    Send
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import clsx from 'clsx';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { LogoLoader, BulkActionBar } from "@workspace/ui";
import CustomSelect from '@/components/ui/CustomSelect';

// Interactive Drawers
import PayoutBreakdownDrawer from './_components/PayoutBreakdownDrawer';
import RevenueBreakdownDrawer from './_components/RevenueBreakdownDrawer';
import NetBalanceBreakdownDrawer from './_components/NetBalanceBreakdownDrawer';
import PendingItemsDrawer from './_components/PendingItemsDrawer';
import FinanceDetailDrawer from './_components/FinanceDetailDrawer';
import SalaryDetailDrawer from './_components/SalaryDetailDrawer';
import { AddTransactionDrawer } from './_components/AddTransactionDrawer';
import { TransactionDetailsDrawer } from './_components/TransactionDetailsDrawer';
import { TRANSACTION_CATEGORIES } from './_components/categories';

interface Transaction {
    id?: string;
    _id?: string;
    rawId?: string;
    type: 'inbound' | 'outbound' | 'credit' | 'debit';
    ledgerType?: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'draft';
    provider: string;
    referenceModel: string;
    referenceId: string;
    description?: string;
    entityName?: string;
    entityCompany?: string;
    entityRole?: string;
    category?: string;
    counterparty?: string;
    paymentMethod?: string;
    userId?: { name: string; email: string };
    clientId?: { name: string; email: string; company: string };
    createdAt: string;
    failureReason?: string;
    breakdown?: any;
    doubleEntryDebit?: string;
    doubleEntryCredit?: string;
}

interface FinancialStats {
    totalRevenue: number;
    totalPayouts: number;
    pendingInvoices: number;
    unverifiedBanks: number;
    netBalance: number;
    grossMargin?: number;
    accountsReceivable?: number;
    workingCapital?: number;
    quickRatio?: number;
    opexApproved?: number;
    activeContractsCount?: number;
    breakdown?: any;
}

type ViewMode = 'all' | 'payroll' | 'revenue' | 'opex';

interface FinancialDashboardProps {
    initialView?: ViewMode;
}

function thisMonthStr() { 
    return new Date().toISOString().slice(0, 7); 
}

const SALARY_STATUS_CONFIG: Record<string, { cls: string; icon: any; label: string }> = {
    pending: { cls: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/40', icon: Clock, label: 'Pending' },
    hr_approved: { cls: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/40', icon: CheckCircle, label: 'HR Approved' },
    approved: { cls: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/40', icon: CheckCircle, label: 'Approved' },
    paid: { cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40', icon: CheckCircle2, label: 'Paid' },
    rejected: { cls: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/40', icon: XCircle, label: 'Rejected' },
};

export default function FinancialDashboard({ initialView }: FinancialDashboardProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const urlView = searchParams.get('view') as ViewMode | null;

    const [viewMode, setViewMode] = useState<ViewMode>(initialView || urlView || 'all');
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '₹';

    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [salaries, setSalaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Ledger Pagination & Counts
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Ledger Filters
    const [filterMovement, setFilterMovement] = useState<'all' | 'credit' | 'debit'>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterDateRange, setFilterDateRange] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Payroll View Filters
    const [payrollMonth, setPayrollMonth] = useState<string>(thisMonthStr());
    const [payrollStatus, setPayrollStatus] = useState<string>('all');
    const [payrollSearch, setPayrollSearch] = useState<string>('');

    // Drawers
    const [openPayoutDrawer, setOpenPayoutDrawer] = useState(false);
    const [openRevenueDrawer, setOpenRevenueDrawer] = useState(false);
    const [openNetDrawer, setOpenNetDrawer] = useState(false);
    const [openPendingDrawer, setOpenPendingDrawer] = useState(false);
    const [openRecordTxDrawer, setOpenRecordTxDrawer] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [selectedSalary, setSelectedSalary] = useState<any | null>(null);

    // Bulk Action Selection State
    const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    const handleSelectAll = () => {
        const allIds = transactions.map(t => (t.id || t._id || t.rawId) as string).filter(Boolean);
        setSelectedTxIds(allIds);
    };

    const handleDeselectAll = () => {
        setSelectedTxIds([]);
    };

    const toggleSelectTx = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedTxIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAmount = (amount: number) => {
        const ids = transactions.slice(0, amount).map(t => (t.id || t._id || t.rawId) as string).filter(Boolean);
        setSelectedTxIds(ids);
    };

    const handleBulkDelete = async () => {
        if (selectedTxIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            try {
                await api.post('/api/transactions/bulk-delete', { ids: selectedTxIds });
            } catch {
                await Promise.allSettled(
                    selectedTxIds.map(id => api.delete(`/api/transactions/${id}`))
                );
            }
            toast.success(`Successfully voided and deleted ${selectedTxIds.length} transaction(s).`);
            setSelectedTxIds([]);
            swrCacheRef.current.clear();
            await fetchLedger(true);
            await fetchStats();
        } catch (err) {
            toast.error('Failed to bulk delete selected transactions.');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // SWR Cache for Instant UI Navigation
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    // Fetch Master Financial Stats
    const fetchStats = async () => {
        try {
            const statsRes = await api.get('/api/finance/dashboard-stats');
            setStats(statsRes.data.stats);
        } catch (error) {
            console.error('Failed to load financial stats:', error);
        }
    };

    // Fetch Master Ledger Transactions
    const fetchLedger = async (showRefresh = false) => {
        const cacheKey = `finance:ledger:${page}:${filterMovement}:${filterCategory}:${filterDateRange}:${filterStatus}:${searchQuery}:${viewMode}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (showRefresh) {
            setRefreshing(true);
        } else if (cached) {
            setTransactions(cached.data.transactions);
            setTotalPages(cached.data.totalPages);
            setTotalCount(cached.data.total || cached.data.transactions?.length || 0);
            setLoading(false);
        } else {
            setLoading(true);
        }

        try {
            let txTypeParam: string | undefined = undefined;
            if (viewMode === 'revenue') {
                txTypeParam = 'inbound';
            } else if (viewMode === 'opex') {
                txTypeParam = 'outbound';
            } else if (filterMovement === 'credit') {
                txTypeParam = 'inbound';
            } else if (filterMovement === 'debit') {
                txTypeParam = 'outbound';
            }

            const [statsResult, transResult] = await Promise.allSettled([
                api.get('/api/finance/dashboard-stats'),
                api.get('/api/finance/transactions', {
                    params: {
                        page,
                        type: txTypeParam,
                        status: filterStatus || undefined,
                        search: searchQuery || undefined
                    }
                })
            ]);

            if (statsResult.status === 'fulfilled') {
                setStats(statsResult.value.data.stats);
            } else {
                console.error('Failed to load financial stats:', statsResult.reason);
            }

            if (transResult.status === 'fulfilled') {
                let fetchedTx: Transaction[] = transResult.value.data.transactions || [];
                const fetchedTotalPages = transResult.value.data.totalPages || 1;
                const fetchedTotal = transResult.value.data.total || fetchedTx.length;

                // Apply category filter if specified
                if (filterCategory !== 'all') {
                    fetchedTx = fetchedTx.filter(t => 
                        t.category?.toLowerCase() === filterCategory.toLowerCase() ||
                        t.referenceModel?.toLowerCase() === filterCategory.toLowerCase()
                    );
                }

                // Apply date range filter if specified
                if (filterDateRange !== 'all') {
                    const now = new Date();
                    fetchedTx = fetchedTx.filter(t => {
                        const txDate = new Date(t.createdAt);
                        if (filterDateRange === 'this_month') {
                            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
                        } else if (filterDateRange === 'last_30_days') {
                            return (now.getTime() - txDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
                        } else if (filterDateRange === 'this_year') {
                            return txDate.getFullYear() === now.getFullYear();
                        }
                        return true;
                    });
                }

                setTransactions(fetchedTx);
                setTotalPages(fetchedTotalPages);
                setTotalCount(fetchedTotal);

                swrCacheRef.current.set(cacheKey, {
                    data: { transactions: fetchedTx, totalPages: fetchedTotalPages, total: fetchedTotal },
                    timestamp: Date.now()
                });
            } else {
                console.error('Failed to fetch transactions:', transResult.reason);
                if (!cached) toast.error('Failed to load financial ledger');
            }
        } catch (error) {
            console.error('Failed to fetch financial data:', error);
            if (!cached) toast.error('Failed to load financial ledger');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Fetch Salaries for Payroll View
    const fetchSalaries = async (showRefresh = false) => {
        const cacheKey = `finance:salary:${payrollMonth}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (showRefresh) {
            setRefreshing(true);
        } else if (cached) {
            setSalaries(cached.data || []);
            setLoading(false);
        } else {
            setLoading(true);
        }

        try {
            const [statsResult, salaryResult] = await Promise.allSettled([
                api.get('/api/finance/dashboard-stats'),
                api.get('/api/salary', { params: { month: payrollMonth } })
            ]);

            if (statsResult.status === 'fulfilled') {
                setStats(statsResult.value.data.stats);
            } else {
                console.error('Failed to load financial stats:', statsResult.reason);
            }

            if (salaryResult.status === 'fulfilled') {
                const fetched = (salaryResult.value.data.salaries || []).filter((s: any) => 
                    ['hr_approved', 'approved', 'paid', 'pending'].includes(s.status)
                );
                setSalaries(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            } else {
                console.error('Failed to load salaries:', salaryResult.reason);
                if (!cached) toast.error('Failed to load salaries');
            }
        } catch (error) {
            console.error('Failed to load salaries:', error);
            if (!cached) toast.error('Failed to load salaries');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'payroll') {
            fetchSalaries();
        } else {
            fetchLedger();
        }
    }, [viewMode, page, filterMovement, filterCategory, filterDateRange, filterStatus, searchQuery, payrollMonth]);

    // Handle Salary Actions
    const handleFinalApproveSalary = async (id: string) => {
        try {
            await api.put(`/api/salary/${id}/approve`);
            toast.success('Salary finalized & approved by Finance!');
            setSalaries(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
            fetchStats();
        } catch {
            toast.error('Failed to approve salary');
        }
    };

    const handleMarkSalaryPaid = async (id: string) => {
        try {
            await api.put(`/api/salary/${id}/mark-paid`);
            toast.success('Marked as paid!');
            setSalaries(prev => prev.map(s => s.id === id ? { ...s, status: 'paid' } : s));
            fetchStats();
        } catch {
            toast.error('Failed to update salary status');
        }
    };

    const handleInitiateSalaryPayout = async (id: string) => {
        const loadingToast = toast.loading('Initiating automated RazorpayX payout...');
        try {
            const { data } = await api.post(`/api/finance/payouts/salary/${id}`);
            toast.dismiss(loadingToast);
            toast.success(data.message || 'Payout initiated successfully!');
            setSalaries(prev => prev.map(s => s.id === id ? { ...s, status: 'paid' } : s));
            fetchStats();
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error(err?.response?.data?.error || 'Payout failed');
        }
    };

    const handleVerifyBank = async (userId: string) => {
        const loadingToast = toast.loading('Initiating bank account verification...');
        try {
            const { data } = await api.post('/api/finance/verify-bank', { userId });
            toast.dismiss(loadingToast);
            toast.success('Bank verification initiated.');
            fetchSalaries(true);
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error(err?.response?.data?.error || 'Verification failed');
        }
    };

    // Filter Salaries
    const filteredSalaries = salaries.filter(s => {
        const matchesSearch = !payrollSearch || (
            s.employee?.name?.toLowerCase().includes(payrollSearch.toLowerCase()) ||
            s.employee?.employeeId?.toLowerCase().includes(payrollSearch.toLowerCase())
        );
        const matchesStatus = payrollStatus === 'all' || s.status === payrollStatus;
        return matchesSearch && matchesStatus;
    });

    // Payroll Computations for Selected Month
    const payrollTotalAmount = salaries.reduce((sum, s) => sum + (s.baseSalary || s.netSalary || s.amount || 0) + (s.bonuses || 0), 0);
    const payrollPaidAmount = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.netSalary || s.amount || 0), 0);
    const payrollDeductionsTotal = salaries.reduce((sum, s) => sum + (s.deductions || 0), 0);
    const payrollPendingCount = salaries.filter(s => s.status !== 'paid').length;

    // Export CSV
    const handleExportCSV = () => {
        if (viewMode === 'payroll') {
            if (filteredSalaries.length === 0) {
                toast.error('No salary records to export');
                return;
            }
            const headers = ['Month', 'Employee Name', 'Employee ID', 'Base Salary', 'Bonuses', 'Tax & Deductions', 'Net Disbursable', 'Status'];
            const rows = filteredSalaries.map(s => [
                s.month || payrollMonth,
                `"${s.employee?.name || 'Staff'}"`,
                `"${s.employee?.employeeId || 'EMP'}"`,
                s.baseSalary || 0,
                s.bonuses || 0,
                s.deductions || 0,
                s.netSalary || s.amount || 0,
                s.status
            ]);
            const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `payroll-ledger-${payrollMonth}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Payroll ledger exported to CSV');
        } else {
            if (transactions.length === 0) {
                toast.error('No transactions to export');
                return;
            }
            const headers = ['Date', 'ID', 'Description', 'Category', 'Type', 'Counterparty / Reference', 'Payment Rail', 'Amount (INR)', 'Status'];
            const rows = transactions.map(tx => [
                format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                tx.id || tx._id,
                `"${tx.description || tx.referenceId || ''}"`,
                `"${tx.category || tx.referenceModel || 'General'}"`,
                tx.type === 'inbound' || tx.type === 'credit' ? 'CREDIT' : 'DEBIT',
                `"${tx.entityCompany || tx.entityName || tx.counterparty || tx.clientId?.company || 'Commercial Partner'}"`,
                `"${tx.provider || tx.paymentMethod || 'Gateway'}"`,
                tx.amount,
                tx.status
            ]);
            const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `financial-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Financial ledger exported to CSV');
        }
    };

    const isCredit = (tx: Transaction) => tx.type === 'inbound' || tx.type === 'credit';

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
                        Ledger & Financial Overview
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Real-time master ledger of company cash inflows, payroll disbursements, OPEX settlements, and treasury health.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={() => {
                            if (viewMode === 'payroll') fetchSalaries(true);
                            else fetchLedger(true);
                        }}
                        disabled={refreshing}
                        className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin")} />
                        Refresh
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </button>
                    <button 
                        onClick={() => setOpenRecordTxDrawer(true)}
                        className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Record Transaction
                    </button>
                </div>
            </div>



            {/* Dynamic Interactive KPI Summary Cards Adapted to Selected View */}
            {viewMode === 'payroll' ? (
                /* PAYROLL KPI VIEW (Requested by User: Total Payroll, Net Disbursed, Pending Payouts, Total Deductions) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Total Payroll Volume */}
                    <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                TOTAL PAYROLL ({payrollMonth})
                            </span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
                                <Banknote className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                            {currencySymbol}{payrollTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                            <span className="text-[11px] text-gray-400 font-medium">
                                {salaries.length} staff records
                            </span>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                                Gross Volume
                            </span>
                        </div>
                    </div>

                    {/* 2. Net Disbursed */}
                    <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                NET DISBURSED
                            </span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <CreditCard className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {currencySymbol}{payrollPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold">
                                {salaries.filter(s => s.status === 'paid').length} Paid out
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                IMPS / Bank Verified
                            </span>
                        </div>
                    </div>

                    {/* 3. Pending Payouts */}
                    <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                PENDING PAYOUTS
                            </span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                            {payrollPendingCount} Pending
                        </h3>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                            <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">
                                Awaiting approval / payout
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                Action Needed
                            </span>
                        </div>
                    </div>

                    {/* 4. Total Tax & Deductions (Salary Deducted Fee) */}
                    <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                TOTAL DEDUCTED FEE & TAX
                            </span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
                                <Receipt className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            {currencySymbol}{payrollDeductionsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                            <span className="text-[11px] text-blue-600/80 dark:text-blue-400/80 font-medium">
                                Statutory PF, TDS & Deductions
                            </span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                                Retained
                            </span>
                        </div>
                    </div>
                </div>
            ) : viewMode === 'revenue' ? (
                /* REVENUE KPI VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div 
                        onClick={() => setOpenRevenueDrawer(true)}
                        className="group bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-emerald-200 cursor-pointer relative"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">TOTAL REVENUE (MONEY IN)</span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600">
                                <ArrowDownLeft className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-emerald-600">
                            +₹{(stats?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-2">Combined Invoices & Deals Inflow</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">INVOICES COLLECTED</span>
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600">
                                <Receipt className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                            ₹{(stats?.breakdown?.revenue?.invoiceRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-2">Settled Tax Invoices</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CONTRACTED DEALS</span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600">
                                <Building2 className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                            ₹{(stats?.breakdown?.revenue?.dealRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-2">Commercial Retainers & Contracts</p>
                    </div>

                    <div 
                        onClick={() => setOpenPendingDrawer(true)}
                        className="group bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-amber-200 cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">ACCOUNTS RECEIVABLE</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-amber-600">
                            ₹{(stats?.accountsReceivable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-2">{stats?.pendingInvoices || 0} Invoices Pending Payment</p>
                    </div>
                </div>
            ) : viewMode === 'opex' ? (
                /* OPEX KPI VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div 
                        onClick={() => setOpenPayoutDrawer(true)}
                        className="group bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-rose-200 cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">TOTAL MONEY OUT (DEBITS)</span>
                            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600">
                                <TrendingDown className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-rose-600">
                            -₹{(stats?.totalPayouts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-2">Combined Payroll & OPEX Outflows</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">STAFF PAYROLL OUTFLOW</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600">
                                <Banknote className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                            ₹{(stats?.breakdown?.payouts?.payrollTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-2">Net Salary Compensation</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">VENDOR & INFRA OPEX</span>
                            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300">
                                <Layers className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                            ₹{(stats?.breakdown?.payouts?.opexTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-2">Cloud, Software & Operations</p>
                    </div>

                    <div 
                        onClick={() => setOpenPendingDrawer(true)}
                        className="group bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-amber-200 cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">UNVERIFIED STAFF BANKS</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats?.unverifiedBanks || 0} Unverified
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-2">Requires verification before payout</p>
                    </div>
                </div>
            ) : (
                /* MASTER OVERVIEW VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Net Cash Flow */}
                    <div 
                        onClick={() => setOpenNetDrawer(true)}
                        className="group bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                NET CASH FLOW
                            </span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                <Wallet className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                            ₹{(stats?.netBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                            <span className="text-[11px] text-gray-400 font-medium">
                                {stats?.grossMargin || 0}% Operating Margin
                            </span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold group-hover:underline">
                                Breakdown ↗
                            </span>
                        </div>
                    </div>

                    {/* 2. Money In */}
                    <div 
                        onClick={() => setOpenRevenueDrawer(true)}
                        className="group bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                MONEY IN (CREDITS)
                            </span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                <ArrowDownLeft className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            +₹{(stats?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold">
                                Retainers & Invoices
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline">
                                Inflows ↗
                            </span>
                        </div>
                    </div>

                    {/* 3. Money Out */}
                    <div 
                        onClick={() => setOpenPayoutDrawer(true)}
                        className="group bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer relative overflow-hidden ring-1 ring-rose-500/10"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                                MONEY OUT (DEBITS)
                            </span>
                            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                                <TrendingDown className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
                            -₹{(stats?.totalPayouts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                            <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-semibold">
                                Salaries & OPEX
                            </span>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold group-hover:underline">
                                Outflows ↗
                            </span>
                        </div>
                    </div>

                    {/* 4. Pending Action Center */}
                    <div 
                        onClick={() => setOpenPendingDrawer(true)}
                        className="group bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                PENDING ITEMS
                            </span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats?.pendingInvoices || 0}</h3>
                            <span className="text-xs text-gray-400 font-medium">Invoices</span>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white ml-2">{stats?.unverifiedBanks || 0}</h3>
                            <span className="text-xs text-gray-400 font-medium">Banks</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                            <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">
                                Action required
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold group-hover:underline">
                                Resolve ↗
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Contextual Filter Toolbar Adapted to Selected View */}
            {viewMode === 'payroll' ? (
                /* PAYROLL VIEW TOOLBAR */
                <div className="p-4 bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search employee by name, ID, department..."
                            value={payrollSearch}
                            onChange={(e) => setPayrollSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* View Filter Dropdown */}
                        <CustomSelect
                            value={viewMode}
                            onChange={(e: any) => setViewMode((e?.target?.value || e) as ViewMode)}
                            className="text-xs border-gray-200 dark:border-gray-600 rounded-xl focus:ring-purple-500 py-2 min-w-[170px]"
                            title="Filter by View"
                            aria-label="Filter by View"
                        >
                            <option value="all">Master Overview (All Flows)</option>
                            <option value="payroll">Payroll & Salaries</option>
                            <option value="revenue">Money In (Revenue)</option>
                            <option value="opex">Money Out (Expenses)</option>
                        </CustomSelect>

                        {/* Month Selector */}
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-xl text-xs font-medium">
                            <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            <input
                                type="month"
                                value={payrollMonth}
                                onChange={(e) => setPayrollMonth(e.target.value)}
                                className="bg-transparent border-0 focus:outline-none text-xs font-bold text-gray-900 dark:text-white cursor-pointer"
                                aria-label="Select Payroll Month"
                            />
                        </div>

                        {/* Status Filter */}
                        <CustomSelect
                            value={payrollStatus}
                            onChange={(e: any) => setPayrollStatus(e?.target?.value || e)}
                            className="text-xs border-gray-200 dark:border-gray-600 rounded-xl focus:ring-purple-500 py-2 min-w-[130px]"
                            title="Filter by Status"
                            aria-label="Filter by Status"
                        >
                            <option value="all">All Status</option>
                            <option value="hr_approved">HR Approved</option>
                            <option value="approved">Approved</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                        </CustomSelect>
                    </div>
                </div>
            ) : (
                /* MASTER LEDGER / INFLOWS / OUTFLOWS TOOLBAR */
                <div className="p-4 bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search memo, counterparty, category, reference ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* View Filter Dropdown */}
                        <CustomSelect
                            value={viewMode}
                            onChange={(e: any) => setViewMode((e?.target?.value || e) as ViewMode)}
                            className="text-xs border-gray-200 dark:border-gray-600 rounded-xl focus:ring-indigo-500 py-2 min-w-[170px]"
                            title="Filter by View"
                            aria-label="Filter by View"
                        >
                            <option value="all">Master Overview (All Flows)</option>
                            <option value="payroll">Payroll & Salaries</option>
                            <option value="revenue">Money In (Revenue)</option>
                            <option value="opex">Money Out (Expenses)</option>
                        </CustomSelect>

                        {/* Movement Dropdown (Only in 'all' view) */}
                        {viewMode === 'all' && (
                            <CustomSelect
                                value={filterMovement}
                                onChange={(e: any) => setFilterMovement((e?.target?.value || e) as 'all' | 'credit' | 'debit')}
                                className="text-xs border-gray-200 dark:border-gray-600 rounded-xl focus:ring-indigo-500 py-2 min-w-[130px]"
                                title="Filter Movement"
                                aria-label="Filter Movement"
                            >
                                <option value="all">All Movements</option>
                                <option value="credit">Credits (Money In)</option>
                                <option value="debit">Debits (Money Out)</option>
                            </CustomSelect>
                        )}

                        {/* Category Selector */}
                        <CustomSelect
                            value={filterCategory}
                            onChange={(e: any) => setFilterCategory(e?.target?.value || e)}
                            className="text-xs border-gray-200 dark:border-gray-600 rounded-xl focus:ring-indigo-500 py-2 min-w-[140px]"
                            title="Filter by Category"
                            aria-label="Filter by Category"
                        >
                            <option value="all">All Categories</option>
                            {TRANSACTION_CATEGORIES.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </CustomSelect>

                        {/* Date Range Selector */}
                        <CustomSelect
                            value={filterDateRange}
                            onChange={(e: any) => setFilterDateRange(e?.target?.value || e)}
                            className="text-xs border-gray-200 dark:border-gray-600 rounded-xl focus:ring-indigo-500 py-2 min-w-[120px]"
                            title="Filter by Date"
                            aria-label="Filter by Date"
                        >
                            <option value="all">All Time</option>
                            <option value="this_month">This Month</option>
                            <option value="last_30_days">Last 30 Days</option>
                            <option value="this_year">This Year</option>
                        </CustomSelect>

                        {/* Status Selector */}
                        <CustomSelect
                            value={filterStatus}
                            onChange={(e: any) => setFilterStatus(e?.target?.value || e)}
                            className="text-xs border-gray-200 dark:border-gray-600 rounded-xl focus:ring-indigo-500 py-2 min-w-[110px]"
                            title="Filter by Status"
                            aria-label="Filter by Status"
                        >
                            <option value="">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </CustomSelect>
                    </div>
                </div>
            )}

            {/* Dynamic Data Table (Swaps seamlessly between Salary Ledger & Master Ledger) */}
            {viewMode === 'payroll' ? (
                /* PAYROLL SALARY LEDGER TABLE */
                <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm overflow-hidden text-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/70 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">EMPLOYEE & ID</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">BASE SALARY</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">BONUS & PERKS</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">TAX & DED. (FEE)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">NET PAYABLE</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">STATUS</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                                {filteredSalaries.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center">
                                            <div className="max-w-sm mx-auto space-y-3">
                                                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 mx-auto">
                                                    <Banknote className="w-6 h-6" />
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                    No salary records found for {payrollMonth}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Generate monthly payroll in HR Operations or adjust your month filter.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSalaries.map((pay: any) => {
                                        const cfg = SALARY_STATUS_CONFIG[pay.status] || SALARY_STATUS_CONFIG.pending;
                                        const Icon = cfg.icon;
                                        const isBankVerified = pay.employee?.bankDetails?.verificationStatus === 'verified' || !!pay.employee?.bankAccount;

                                        return (
                                            <tr 
                                                key={pay.id} 
                                                onClick={() => setSelectedSalary(pay)}
                                                className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs uppercase">
                                                            {pay.employee?.name?.[0] || 'E'}
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{pay.employee?.name || 'Staff Member'}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] text-gray-400">{pay.employee?.employeeId || 'EMP-180'}</span>
                                                                <span className={clsx(
                                                                    'text-[9px] px-1.5 py-0.2 rounded-full border tracking-wide uppercase font-bold',
                                                                    isBankVerified 
                                                                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40' 
                                                                        : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40'
                                                                )}>
                                                                    {isBankVerified ? 'Bank Verified' : 'Unverified'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-right font-mono text-xs text-gray-600 dark:text-gray-300">
                                                    {currencySymbol}{(pay.baseSalary || 0).toLocaleString('en-IN')}
                                                </td>

                                                <td className="px-6 py-4 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    +{currencySymbol}{(pay.bonuses || 0).toLocaleString('en-IN')}
                                                </td>

                                                <td className="px-6 py-4 text-right font-mono text-xs text-rose-500 font-semibold">
                                                    -{currencySymbol}{(pay.deductions || 0).toLocaleString('en-IN')}
                                                </td>

                                                <td className="px-6 py-4 text-right font-mono text-xs">
                                                    <span className="font-black text-purple-700 dark:text-purple-400 text-sm">
                                                        {currencySymbol}{(pay.netSalary || pay.amount || 0).toLocaleString('en-IN')}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className={clsx(
                                                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                        cfg.cls
                                                    )}>
                                                        <Icon className="w-3 h-3" />
                                                        {cfg.label}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                                        {pay.status === 'hr_approved' && (
                                                            <button 
                                                                onClick={() => handleFinalApproveSalary(pay.id)} 
                                                                className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" /> Final Approve
                                                            </button>
                                                        )}
                                                        {(pay.status === 'approved' || pay.status === 'hr_approved') && (
                                                            <>
                                                                {isBankVerified ? (
                                                                    <button 
                                                                        onClick={() => handleInitiateSalaryPayout(pay.id)} 
                                                                        className="text-xs text-purple-600 hover:text-purple-800 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                                                                    >
                                                                        <Send className="w-3.5 h-3.5" /> Payout
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleVerifyBank(pay.employee?.id)}
                                                                        className="text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-lg transition-colors border text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200"
                                                                    >
                                                                        <AlertCircle className="w-3.5 h-3.5" /> Verify Bank
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={() => handleMarkSalaryPaid(pay.id)} 
                                                                    className="text-xs text-emerald-600 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                                                                </button>
                                                            </>
                                                        )}
                                                        <button 
                                                            onClick={() => setSelectedSalary(pay)}
                                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition-colors"
                                                            title="View Itemized Breakdown"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* MASTER LEDGER TRANSACTIONS TABLE */
                <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/60 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                    <th className="pl-6 pr-2 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={transactions.length > 0 && transactions.every(t => selectedTxIds.includes((t.id || t._id || t.rawId)!))}
                                            ref={(el) => {
                                                if (el) {
                                                    const count = transactions.filter(t => selectedTxIds.includes((t.id || t._id || t.rawId)!)).length;
                                                    el.indeterminate = count > 0 && count < transactions.length;
                                                }
                                            }}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    handleSelectAll();
                                                } else {
                                                    handleDeselectAll();
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            aria-label="Select all transactions"
                                        />
                                    </th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">DATE</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">DESCRIPTION & CATEGORY</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">TYPE</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">COUNTERPARTY / REF</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">PAYMENT RAIL</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">AMOUNT</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">STATUS</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-16 text-center">
                                            <div className="max-w-sm mx-auto space-y-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 mx-auto">
                                                    <History className="w-6 h-6" />
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">No transactions match your filters</p>
                                                <p className="text-xs text-gray-400">
                                                    Try adjusting your date range, movement type, or search terms, or record a new transaction.
                                                </p>
                                                <button
                                                    onClick={() => setOpenRecordTxDrawer(true)}
                                                    className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 mt-2"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Record New Entry
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx, idx) => {
                                        const txId = (tx.id || tx._id || tx.rawId || `tx-${idx}`) as string;
                                        const isSelected = selectedTxIds.includes(txId);
                                        const creditMovement = isCredit(tx);
                                        const partyName = tx.entityCompany || tx.entityName || tx.counterparty || tx.clientId?.company || tx.clientId?.name || 'Commercial Partner';
                                        const categoryLabel = tx.category || tx.referenceModel || 'General Ledger Entry';

                                        return (
                                            <tr 
                                                key={txId}
                                                onClick={() => setSelectedTransaction(tx)}
                                                className={clsx(
                                                    "transition-colors group cursor-pointer",
                                                    isSelected 
                                                        ? "bg-indigo-50/70 dark:bg-indigo-950/40" 
                                                        : "hover:bg-gray-50/70 dark:hover:bg-gray-700/40"
                                                )}
                                            >
                                                <td className="pl-6 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => toggleSelectTx(txId, e as any)}
                                                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        aria-label={`Select transaction ${txId}`}
                                                    />
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                                                        {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-mono truncate max-w-[100px] block mt-0.5">
                                                        #{tx.id || tx._id}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold text-gray-900 dark:text-white max-w-[220px] truncate">
                                                            {tx.description || categoryLabel}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/80 px-2 py-0.5 rounded-full w-fit">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                            {categoryLabel}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className={clsx(
                                                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                                        creditMovement 
                                                            ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40"
                                                            : "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40"
                                                    )}>
                                                        {creditMovement ? '↙ CREDIT' : '↗ DEBIT'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white max-w-[180px] truncate">
                                                        <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{partyName}</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 capitalize pl-5">
                                                        {tx.entityRole || (creditMovement ? 'Client' : 'Beneficiary')}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg uppercase tracking-wider">
                                                        {tx.provider || tx.paymentMethod || 'Gateway'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-right font-mono font-bold text-xs">
                                                    <span className={creditMovement ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-rose-600 dark:text-rose-400 font-black"}>
                                                        {creditMovement ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className={clsx(
                                                        "status-badge inline-flex items-center gap-1 text-[10px] font-bold",
                                                        tx.status === 'completed' ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300" :
                                                        tx.status === 'pending' ? "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300" : "text-rose-700 bg-rose-50"
                                                    )}>
                                                        {tx.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                                                        tx.status === 'pending' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        <span className="capitalize">{tx.status}</span>
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTransaction(tx);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                                                        title="View Double-Entry Receipt"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Page <span className="font-bold text-gray-900 dark:text-white">{page}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalPages}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                    aria-label="Previous Page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                    aria-label="Next Page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Bulk Action Bar */}
            <BulkActionBar
                selectedCount={selectedTxIds.length}
                totalCount={transactions.length}
                itemLabel="transactions"
                sublabel={selectedTxIds.length > 0 ? `${selectedTxIds.length} entry${selectedTxIds.length > 1 ? 's' : ''} selected` : undefined}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onSelectAmount={handleSelectAmount}
                onDeleteSelected={handleBulkDelete}
                isDeleting={isBulkDeleting}
                deleteModalTitle={`Void & Delete ${selectedTxIds.length} Transaction${selectedTxIds.length > 1 ? 's' : ''}`}
                deleteModalMessage={`Are you sure you want to permanently void and delete ${selectedTxIds.length} selected transaction record(s) from the company ledger? This double-entry ledger action cannot be undone.`}
            />

            {/* Interactive Drawers */}
            <SalaryDetailDrawer
                isOpen={!!selectedSalary}
                onClose={() => setSelectedSalary(null)}
                salary={selectedSalary}
                currencySymbol={currencySymbol}
                onInitiatePayout={handleInitiateSalaryPayout}
                onMarkPaid={handleMarkSalaryPaid}
            />

            <PayoutBreakdownDrawer
                isOpen={openPayoutDrawer}
                onClose={() => setOpenPayoutDrawer(false)}
                stats={stats}
                onOpenRecordTx={() => setOpenRecordTxDrawer(true)}
            />

            <RevenueBreakdownDrawer
                isOpen={openRevenueDrawer}
                onClose={() => setOpenRevenueDrawer(false)}
                stats={stats}
            />

            <NetBalanceBreakdownDrawer
                isOpen={openNetDrawer}
                onClose={() => setOpenNetDrawer(false)}
                stats={stats}
            />

            <PendingItemsDrawer
                isOpen={openPendingDrawer}
                onClose={() => setOpenPendingDrawer(false)}
                stats={stats}
                onRefresh={() => {
                    fetchStats();
                    fetchLedger(true);
                }}
            />

            <TransactionDetailsDrawer
                transaction={selectedTransaction}
                open={!!selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                onDeleted={() => {
                    swrCacheRef.current.clear();
                    setSelectedTransaction(null);
                    fetchLedger(true);
                }}
            />

            <AddTransactionDrawer
                open={openRecordTxDrawer}
                onClose={() => setOpenRecordTxDrawer(false)}
                onSuccess={() => {
                    swrCacheRef.current.clear();
                    fetchLedger(true);
                }}
            />
        </div>
    );
}
