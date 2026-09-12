'use client';

import { useEffect, useState } from 'react';
import {
    Users,
    CheckSquare,
    FolderKanban,
    Receipt,
    FileText,
    ChevronRight,
    Briefcase,
    CheckCircle2,
    XCircle,
    Calendar,
    Clock,
    User,
    Building2,
    Sparkles,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useSettings } from '@/lib/settings-context';

interface OperationsOverviewProps {
    stats: any;
    getStatValue: (key: string) => string | number;
    getSubText?: (key: string) => string;
    isLocked?: boolean;
}

interface LeaveRequest {
    _id?: string;
    id?: string;
    employeeId?: { name?: string; _id?: string; id?: string; department?: string; email?: string } | string;
    employee?: { name?: string; id?: string; department?: string; email?: string };
    type?: string;
    days?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    appliedAt?: string;
    createdAt?: string;
}

interface ExpenseRecord {
    id?: string;
    _id?: string;
    title?: string;
    amount?: number;
    status?: string;
    type?: string;
    category?: string;
    date?: string;
    notes?: string;
    employee?: { name?: string; email?: string; department?: string };
    employeeId?: { name?: string; email?: string; department?: string } | string;
    vendor?: { name?: string };
    description?: string;
}

const LEAVE_TYPE_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
    sick: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-900/50', label: 'Sick' },
    casual: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-900/50', label: 'Casual' },
    annual: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-900/50', label: 'Annual' },
    maternity: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-900/50', label: 'Maternity' },
    paternity: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-900/50', label: 'Paternity' },
    unpaid: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300', border: 'border-zinc-200 dark:border-zinc-700', label: 'Unpaid' },
    other: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300', border: 'border-zinc-200 dark:border-zinc-700', label: 'Other' }
};

export default function OperationsOverview({ stats, getStatValue, getSubText, isLocked }: OperationsOverviewProps) {
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '₹';

    const [activeTab, setActiveTab] = useState<'leaves' | 'expenses'>('leaves');
    const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
    const [pendingExpenses, setPendingExpenses] = useState<ExpenseRecord[]>([]);
    const [todayOnLeave, setTodayOnLeave] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const loadData = () => {
        if (isLocked) return;
        setLoading(true);

        // 1. Fetch pending leave requests
        const leavesPendingPromise = api.get('/api/leaves', { params: { status: 'pending' } })
            .then(({ data }) => setPendingLeaves(data.leaves || []))
            .catch(() => setPendingLeaves([]));

        // 2. Fetch approved leaves for today's capacity
        const leavesApprovedPromise = api.get('/api/leaves', { params: { status: 'approved' } })
            .then(({ data }) => {
                const today = new Date().toISOString().slice(0, 10);
                const onLeave = (data.leaves || []).filter((l: LeaveRequest) => {
                    const start = l.startDate?.slice(0, 10);
                    const end = l.endDate?.slice(0, 10);
                    return start && end && start <= today && end >= today;
                });
                setTodayOnLeave(onLeave);
            })
            .catch(() => setTodayOnLeave([]));

        // 3. Fetch pending expenses & claims
        const expensesPromise = api.get('/api/expenses')
            .then(({ data }) => {
                const allExpenses = data.data?.expenses || data.expenses || [];
                const pending = allExpenses.filter((e: any) =>
                    e.status === 'pending_approval' || e.status === 'pending' || e.status === 'unpaid'
                );
                setPendingExpenses(pending);
            })
            .catch(() => setPendingExpenses([]));

        Promise.allSettled([
            leavesPendingPromise,
            leavesApprovedPromise,
            expensesPromise
        ]).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        loadData();
    }, [isLocked]);

    const getLeaveEmployeeName = (leave: LeaveRequest): string => {
        if (leave.employee?.name) return leave.employee.name;
        if (typeof leave.employeeId === 'object' && leave.employeeId?.name) return leave.employeeId.name;
        return 'Team Member';
    };

    const getLeaveDepartment = (leave: LeaveRequest): string => {
        if (leave.employee?.department) return leave.employee.department;
        if (typeof leave.employeeId === 'object' && leave.employeeId?.department) return leave.employeeId.department;
        return 'Operations';
    };

    const getExpensePayeeName = (txn: ExpenseRecord): string => {
        if (txn.employee?.name) return txn.employee.name;
        if (typeof txn.employeeId === 'object' && txn.employeeId?.name) return txn.employeeId.name;
        if (txn.vendor?.name) return txn.vendor.name;
        return 'Claimant';
    };

    const getInitials = (name: string): string => {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    // Review Leave Action
    const handleReviewLeave = async (id: string, status: 'approved' | 'rejected') => {
        setActionLoadingId(id);
        try {
            await api.put(`/api/leaves/${id}/review`, { status });
            toast.success(`Leave request ${status} successfully`);
            setPendingLeaves(prev => prev.filter(l => (l.id || l._id) !== id));
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.error || `Failed to ${status} leave`);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Approve Expense Claim
    const handleApproveExpense = async (id: string) => {
        setActionLoadingId(id);
        try {
            await api.patch(`/api/expenses/${id}/approve`);
            toast.success('Expense claim approved');
            setPendingExpenses(prev => prev.filter(e => (e.id || e._id) !== id));
        } catch (err: any) {
            // Fallback to updateStatus with status: approved
            try {
                await api.patch(`/api/expenses/${id}/status`, { status: 'approved' });
                toast.success('Expense claim approved');
                setPendingExpenses(prev => prev.filter(e => (e.id || e._id) !== id));
            } catch (fallbackErr: any) {
                toast.error(fallbackErr.response?.data?.message || fallbackErr.response?.data?.error || 'Failed to approve expense');
            }
        } finally {
            setActionLoadingId(null);
        }
    };

    // Reject Expense Claim
    const handleRejectExpense = async (id: string) => {
        setActionLoadingId(id);
        try {
            await api.patch(`/api/expenses/${id}/status`, { status: 'rejected' });
            toast.success('Expense claim rejected');
            setPendingExpenses(prev => prev.filter(e => (e.id || e._id) !== id));
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to reject expense');
        } finally {
            setActionLoadingId(null);
        }
    };

    const totalAuthorizationsCount = pendingLeaves.length + pendingExpenses.length;

    return (
        <div className="card overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm flex flex-col justify-between h-full">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            Operations & Team Approvals
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium">Daily capacity velocity & pending authorizations</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/hr"
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900"
                    >
                        HR Hub <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
                {/* 1. Operations & Team Key Metrics Grid (4 Clean Balanced Metrics) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Active Clients */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Active Clients</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('clients')}</p>
                            <p className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">Total</p>
                        </div>
                        <Users className="w-6 h-6 text-emerald-200/60 dark:text-emerald-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Total Active Projects & Tasks (Combined in One Box) */}
                    <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/60 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100/70 dark:border-blue-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Projects & Tasks</p>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded">
                                Velocity
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-black text-zinc-900 dark:text-white">{getStatValue('projects')}</span>
                                    <span className="text-[10px] font-semibold text-zinc-400">/ {getStatValue('projects_total')}</span>
                                </div>
                                <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center gap-1 mt-0.5 truncate">
                                    <FolderKanban className="w-2.5 h-2.5 shrink-0" /> Active Proj
                                </p>
                            </div>
                            <div className="border-l border-blue-200/60 dark:border-blue-800/60 pl-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-black text-zinc-900 dark:text-white">{getStatValue('tasks')}</span>
                                    <span className="text-[10px] font-semibold text-zinc-400">/ {getStatValue('tasks_total')}</span>
                                </div>
                                <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight flex items-center gap-1 mt-0.5 truncate">
                                    <CheckSquare className="w-2.5 h-2.5 shrink-0" /> Pending Tasks
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Today */}
                    <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100/70 dark:border-teal-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider mb-1">Attendance Today</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('attendance')}</p>
                            <p className="text-[10px] font-semibold text-teal-600/80 dark:text-teal-400/80">/ {getStatValue('employees')}</p>
                        </div>
                        <Users className="w-6 h-6 text-teal-200/60 dark:text-teal-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Pending Authorizations & Expenses */}
                    <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mb-1">Pending Approvals</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{totalAuthorizationsCount}</p>
                            <p className="text-[10px] font-semibold text-rose-600/80 dark:text-rose-400/80">
                                {pendingLeaves.length} leaves, {pendingExpenses.length} claims
                            </p>
                        </div>
                        <Receipt className="w-6 h-6 text-rose-200/60 dark:text-rose-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>
                </div>

                {/* 2. Interactive Applied Leaves & Claimed Expenses Authorization Hub */}
                <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-850/40 overflow-hidden flex flex-col">
                    {/* Tab Navigation Header */}
                    <div className="px-3 pt-2.5 pb-2 border-b border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between bg-zinc-100/40 dark:bg-zinc-900/40">
                        <div className="flex items-center gap-1.5">
                            {/* Leaves Tab */}
                            <button
                                onClick={() => setActiveTab('leaves')}
                                className={clsx(
                                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                                    activeTab === 'leaves'
                                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-zinc-700'
                                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/50'
                                )}
                            >
                                <FileText className="w-3.5 h-3.5 text-orange-500" />
                                <span>Applied Leaves</span>
                                <span className={clsx(
                                    'text-[10px] font-black px-1.5 py-0.2 rounded-full',
                                    pendingLeaves.length > 0
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                        : 'bg-zinc-200/70 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                                )}>
                                    {pendingLeaves.length}
                                </span>
                            </button>

                            {/* Expenses Tab */}
                            <button
                                onClick={() => setActiveTab('expenses')}
                                className={clsx(
                                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                                    activeTab === 'expenses'
                                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-zinc-700'
                                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/50'
                                )}
                            >
                                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                                <span>Claimed Expenses</span>
                                <span className={clsx(
                                    'text-[10px] font-black px-1.5 py-0.2 rounded-full',
                                    pendingExpenses.length > 0
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-zinc-200/70 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                                )}>
                                    {pendingExpenses.length}
                                </span>
                            </button>
                        </div>

                        {/* View All Link */}
                        <Link
                            href={activeTab === 'leaves' ? '/hr' : '/bills-and-expenses'}
                            className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-0.5"
                        >
                            View all <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {/* Content List Area */}
                    <div className="p-3 max-h-[220px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 custom-scrollbar">
                        {loading ? (
                            <div className="py-8 flex flex-col items-center justify-center text-zinc-400 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                <p className="text-xs font-medium">Loading authorizations...</p>
                            </div>
                        ) : activeTab === 'leaves' ? (
                            /* LEAVE REQUESTS VIEW */
                            pendingLeaves.length === 0 ? (
                                <div className="py-6 px-4 text-center flex flex-col items-center justify-center">
                                    <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">No Pending Leave Requests</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5 max-w-[260px]">
                                        All employee leave requests have been authorized. Team capacity is optimal.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {pendingLeaves.map((leave, idx) => {
                                        const leaveId = leave.id || leave._id || String(idx);
                                        const empName = getLeaveEmployeeName(leave);
                                        const dept = getLeaveDepartment(leave);
                                        const typeStyle = LEAVE_TYPE_STYLES[leave.type?.toLowerCase() || 'other'] || LEAVE_TYPE_STYLES.other;
                                        const isActionLoading = actionLoadingId === leaveId;

                                        return (
                                            <div
                                                key={leaveId}
                                                className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:shadow-xs transition-shadow"
                                            >
                                                {/* Left: Employee + Leave Type + Reason */}
                                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                        {getInitials(empName)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                                                {empName}
                                                            </p>
                                                            <span className={clsx('text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider', typeStyle.bg, typeStyle.text, typeStyle.border)}>
                                                                {leave.type || 'Leave'}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-zinc-400">
                                                                • {leave.days || 1} {((leave.days || 1) > 1) ? 'days' : 'day'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1 truncate">
                                                            <Calendar className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                                                            {leave.startDate?.slice(0, 10)} {leave.endDate && leave.endDate !== leave.startDate ? `to ${leave.endDate.slice(0, 10)}` : ''}
                                                            {leave.reason ? <span className="italic text-zinc-400 truncate ml-1">"{leave.reason}"</span> : null}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Right: Direct Approve & Reject Buttons */}
                                                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                                                    <button
                                                        onClick={() => handleReviewLeave(leaveId, 'approved')}
                                                        disabled={isActionLoading}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                        title="Approve Leave"
                                                    >
                                                        {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                                        <span>Approve</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleReviewLeave(leaveId, 'rejected')}
                                                        disabled={isActionLoading}
                                                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                        title="Reject Leave"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                                        <span>Reject</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            /* CLAIMED EXPENSES VIEW */
                            pendingExpenses.length === 0 ? (
                                <div className="py-6 px-4 text-center flex flex-col items-center justify-center">
                                    <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">No Pending Expense Claims</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5 max-w-[260px]">
                                        All reimbursement claims and vendor transactions have been authorized.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {pendingExpenses.map((txn, idx) => {
                                        const expenseId = txn.id || txn._id || String(idx);
                                        const payeeName = getExpensePayeeName(txn);
                                        const isClaim = txn.type === 'employee_claim' || !!txn.employee;
                                        const isActionLoading = actionLoadingId === expenseId;

                                        return (
                                            <div
                                                key={expenseId}
                                                className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:shadow-xs transition-shadow"
                                            >
                                                {/* Left: Payee + Title + Category */}
                                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                    <div className={clsx(
                                                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold shadow-xs',
                                                        isClaim ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                                                    )}>
                                                        {isClaim ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                                                {txn.title || 'Expense Claim'}
                                                            </p>
                                                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 uppercase tracking-wider">
                                                                {isClaim ? 'Claim' : 'Bill'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1 truncate">
                                                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{payeeName}</span>
                                                            <span>•</span>
                                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                                {currencySymbol}{txn.amount?.toLocaleString('en-IN') || txn.amount || 0}
                                                            </span>
                                                            {txn.date ? <span>• {new Date(txn.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span> : null}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Right: Direct Approve & Reject Buttons */}
                                                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                                                    <button
                                                        onClick={() => handleApproveExpense(expenseId)}
                                                        disabled={isActionLoading}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                        title="Approve Claim"
                                                    >
                                                        {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                                        <span>Approve</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectExpense(expenseId)}
                                                        disabled={isActionLoading}
                                                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                        title="Reject Claim"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                                        <span>Reject</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

