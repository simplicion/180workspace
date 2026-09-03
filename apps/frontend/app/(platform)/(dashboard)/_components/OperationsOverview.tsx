'use client';

import { useEffect, useState } from 'react';
import {
    Calendar,
    Users,
    CheckSquare,
    FolderKanban,
    Target,
    Receipt,
    FileText,
    ChevronRight,
    Briefcase,
    Clock
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

interface OperationsOverviewProps {
    stats: any;
    getStatValue: (key: string) => string | number;
    getSubText?: (key: string) => string;
    isLocked?: boolean;
}

interface CalendarEvent {
    id: string;
    title: string;
    startDate: string;
    platform?: string;
    meetingLink?: string;
}

interface Goal {
    id: string;
    title: string;
    progress?: number;
}

interface LeaveRequest {
    _id?: string;
    id?: string;
    employeeId?: { name?: string; _id?: string; id?: string } | string;
    employee?: { name?: string; id?: string };
    type?: string;
    days?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
}

interface ExpenseRecord {
    id?: string;
    _id?: string;
    title?: string;
    amount?: number;
    status?: string;
    employee?: { name?: string };
}

export default function OperationsOverview({ stats, getStatValue, getSubText, isLocked }: OperationsOverviewProps) {
    const [upcomingMeeting, setUpcomingMeeting] = useState<CalendarEvent | null>(null);
    const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
    const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
    const [pendingExpenses, setPendingExpenses] = useState<ExpenseRecord[]>([]);
    const [todayOnLeave, setTodayOnLeave] = useState<LeaveRequest[]>([]);

    useEffect(() => {
        if (isLocked) return;
        const todayStr = new Date().toISOString().slice(0, 10);
        
        // 1. Fetch upcoming meetings
        api.get(`/api/calendar?year=${todayStr.split('-')[0]}&month=${todayStr.split('-')[1]}`)
            .then(({ data }) => {
                const events = data.events || [];
                const now = new Date();
                const upcoming = events.find((e: any) => new Date(e.startDate) >= now && e.type === 'meeting');
                if (upcoming) setUpcomingMeeting(upcoming);
            })
            .catch(() => {});

        // 2. Fetch current goals
        api.get('/api/goals')
            .then(({ data }) => {
                const goals = data.goals || [];
                if (goals.length > 0) {
                    setCurrentGoal(goals[0]);
                }
            })
            .catch(() => {});

        // 3. Fetch pending leave requests
        api.get('/api/leaves?status=pending')
            .then(({ data }) => setPendingLeaves(data.leaves || []))
            .catch(() => setPendingLeaves([]));

        // 4. Fetch approved leaves to find who's on leave today
        api.get('/api/leaves?status=approved')
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

        // 5. Fetch pending expenses
        api.get('/api/expenses?status=pending')
            .then(({ data }) => setPendingExpenses(data.expenses || []))
            .catch(() => setPendingExpenses([]));
    }, [isLocked]);

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getEmployeeName = (leave: LeaveRequest): string => {
        if (leave.employee?.name) return leave.employee.name;
        if (typeof leave.employeeId === 'object' && leave.employeeId?.name) return leave.employeeId.name;
        return 'Employee';
    };

    const getInitials = (name: string): string => {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="card overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm">
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
                        <p className="text-[11px] text-zinc-400 font-medium">Daily focus, capacity velocity & pending authorizations</p>
                    </div>
                </div>

                <Link
                    href="/hrms"
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900"
                >
                    HR Hub <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
                {/* 1. Today's Focus & Active Goal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Today's Focus / Meeting */}
                    <div className="bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-indigo-500" /> Today&apos;s Focus
                        </p>
                        {upcomingMeeting ? (
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-500 flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-zinc-900 dark:text-white text-xs truncate">{upcomingMeeting.title}</p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                        <span>{formatTime(upcomingMeeting.startDate)}</span>
                                        {upcomingMeeting.platform && <span>• {upcomingMeeting.platform}</span>}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5 opacity-60">
                                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-zinc-600 dark:text-zinc-300 text-xs">No upcoming meetings</p>
                                    <p className="text-[10px] text-zinc-400">Schedule is clear</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Active Goal / Velocity */}
                    <div className="bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-1.5">
                            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Target className="w-3 h-3 text-indigo-500" /> Active Milestone
                            </p>
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {currentGoal?.progress || 82}%
                            </span>
                        </div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate mb-1.5" title={currentGoal?.title || 'Q3 Delivery Milestone'}>
                            {currentGoal?.title || 'Q3 Platform Release'}
                        </p>
                        <div className="w-full bg-zinc-200/80 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-700"
                                style={{ width: `${currentGoal?.progress || 82}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Operations & Team Key Metrics Grid (6 Metrics) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Active Clients */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Active Clients</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('clients')}</p>
                            <p className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">Total</p>
                        </div>
                        <Users className="w-6 h-6 text-emerald-200/60 dark:text-emerald-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Total Projects */}
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/70 dark:border-blue-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Total Projects</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('projects')}</p>
                            <p className="text-[10px] font-semibold text-blue-600/80 dark:text-blue-400/80">Active</p>
                        </div>
                        <FolderKanban className="w-6 h-6 text-blue-200/60 dark:text-blue-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Pending Tasks */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">Pending Tasks</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('tasks')}</p>
                            <p className="text-[10px] font-semibold text-indigo-600/80 dark:text-indigo-400/80">/ {getStatValue('tasks_total')}</p>
                        </div>
                        <CheckSquare className="w-6 h-6 text-indigo-200/60 dark:text-indigo-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
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

                    {/* Pending Salaries */}
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/70 dark:border-amber-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-1">Pending Salaries</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('salary_pending') || 0}</p>
                            <p className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-400/80">to process</p>
                        </div>
                        <Briefcase className="w-6 h-6 text-amber-200/60 dark:text-amber-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Pending Expenses */}
                    <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mb-1">Pending Expenses</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{pendingExpenses.length || getStatValue('expenses_pending') || 0}</p>
                            <p className="text-[10px] font-semibold text-rose-600/80 dark:text-rose-400/80">to approve</p>
                        </div>
                        <Receipt className="w-6 h-6 text-rose-200/60 dark:text-rose-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>
                </div>

                {/* 3. Team Approvals & On-Leave Status */}
                <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-850/40 overflow-hidden divide-y divide-zinc-200/60 dark:divide-zinc-800">
                    {/* On Leave Today Banner */}
                    <div className="px-3.5 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                {todayOnLeave.length > 0 
                                    ? `${todayOnLeave.length} team member${todayOnLeave.length > 1 ? 's' : ''} on leave today` 
                                    : 'No one on leave today'}
                            </p>
                        </div>

                        {todayOnLeave.length > 0 ? (
                            <div className="flex -space-x-1.5">
                                {todayOnLeave.slice(0, 3).map((leave, i) => {
                                    const name = getEmployeeName(leave);
                                    return (
                                        <div 
                                            key={leave.id || leave._id || i} 
                                            className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 border border-white dark:border-zinc-800 flex items-center justify-center text-[8px] font-bold text-indigo-600 dark:text-indigo-300"
                                            title={name}
                                        >
                                            {getInitials(name)}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                                Full Capacity
                            </span>
                        )}
                    </div>

                    {/* Pending Leaves & Expenses Approval Links */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/60 dark:divide-zinc-800">
                        {/* Leave Approvals */}
                        <Link
                            href="/hrms"
                            className="p-3 flex items-center justify-between hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    pendingLeaves.length > 0 
                                        ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                        {pendingLeaves.length > 0 ? `${pendingLeaves.length} Leave Requests` : 'No Pending Leaves'}
                                    </p>
                                    <p className={`text-[10px] font-medium ${
                                        pendingLeaves.length > 0 ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-zinc-400'
                                    }`}>
                                        {pendingLeaves.length > 0 ? 'Action Required' : 'All caught up'}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
                        </Link>

                        {/* Expense Approvals */}
                        <Link
                            href="/finance/expenses"
                            className="p-3 flex items-center justify-between hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    pendingExpenses.length > 0 
                                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    <Receipt className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                        {pendingExpenses.length > 0 ? `${pendingExpenses.length} Expenses To Approve` : 'No Pending Expenses'}
                                    </p>
                                    <p className={`text-[10px] font-medium ${
                                        pendingExpenses.length > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-400'
                                    }`}>
                                        {pendingExpenses.length > 0 ? 'Action Required' : 'All caught up'}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
