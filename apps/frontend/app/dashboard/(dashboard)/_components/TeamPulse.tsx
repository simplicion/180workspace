'use client';

import { useEffect, useState } from 'react';
import { Users, FileText, Receipt, ChevronRight, FolderKanban } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface TeamPulseProps {
    stats: any;
    getStatValue: (key: string) => string | number;
    getSubText: (key: string) => string;
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

export default function TeamPulse({ stats, getStatValue, getSubText }: TeamPulseProps) {
    const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
    const [pendingExpenses, setPendingExpenses] = useState<ExpenseRecord[]>([]);
    const [todayOnLeave, setTodayOnLeave] = useState<LeaveRequest[]>([]);

    useEffect(() => {
        // Fetch pending leave requests
        api.get('/api/leaves?status=pending')
            .then(({ data }) => setPendingLeaves(data.leaves || []))
            .catch(() => setPendingLeaves([]));

        // Fetch approved leaves to find who's on leave today
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

        // Fetch pending expenses
        api.get('/api/expenses?status=pending')
            .then(({ data }) => setPendingExpenses(data.expenses || []))
            .catch(() => setPendingExpenses([]));
    }, []);

    // Helper to get employee name from leave record
    const getEmployeeName = (leave: LeaveRequest): string => {
        if (leave.employee?.name) return leave.employee.name;
        if (typeof leave.employeeId === 'object' && leave.employeeId?.name) return leave.employeeId.name;
        return 'Employee';
    };

    // Get initials from a name
    const getInitials = (name: string): string => {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    // The first pending leave to show as the primary actionable item
    const firstPendingLeave = pendingLeaves[0];

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-0">
                <h2 className="text-xs font-bold flex items-center gap-2 text-gray-400 uppercase tracking-wider mb-4">
                    <Users className="w-3.5 h-3.5" /> Team & Approvals
                </h2>
            </div>
            
            <div className="overflow-hidden">
                {/* Team Pulse */}
                <div className="px-5 pb-4 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Box 1: Attendance Today */}
                        <div className="bg-emerald-50/60 border border-emerald-100/60 rounded-xl p-4 relative overflow-hidden group">
                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Attendance Today</p>
                            <div className="flex items-baseline gap-1.5">
                                <p className="text-2xl font-black text-gray-900">{getStatValue('attendance')}</p>
                                <p className="text-xs font-semibold text-emerald-600/70">/ {getStatValue('employees')}</p>
                            </div>
                            <Users className="w-8 h-8 text-emerald-100 absolute -bottom-1 -right-1 group-hover:text-emerald-200 transition-colors" />
                        </div>
                        
                        {/* Box 2: Pending Expenses */}
                        <div className="bg-amber-50/60 border border-amber-100/60 rounded-xl p-4 relative overflow-hidden group">
                            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">Pending Expenses</p>
                            <div className="flex items-baseline gap-1.5">
                                <p className="text-2xl font-black text-gray-900">{pendingExpenses.length}</p>
                                <p className="text-xs font-bold text-gray-500">to approve</p>
                            </div>
                            <Receipt className="w-8 h-8 text-amber-100 absolute -bottom-1 -right-1 group-hover:text-amber-200 transition-colors" />
                        </div>
                    </div>
                    {/* On Leave Today */}
                    <div className="flex justify-between items-center bg-gray-50/80 border border-gray-100 px-3.5 py-2.5 rounded-xl">
                        <p className="text-[11px] font-semibold text-gray-600">
                            {todayOnLeave.length > 0 
                                ? `${todayOnLeave.length} on leave today` 
                                : 'No one on leave today'}
                        </p>
                        {todayOnLeave.length > 0 && (
                            <div className="flex -space-x-1.5">
                                {todayOnLeave.slice(0, 3).map((leave, i) => {
                                    const name = getEmployeeName(leave);
                                    return (
                                        <div 
                                            key={leave.id || leave.id || i} 
                                            className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-600"
                                            style={{ zIndex: 10 - i }}
                                            title={name}
                                        >
                                            {getInitials(name)}
                                        </div>
                                    );
                                })}
                                {todayOnLeave.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-600 z-0">
                                        +{todayOnLeave.length - 3}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Approval Items */}
                <div className="border-t border-gray-100">
                    {/* Leave Requests */}
                    {pendingLeaves.length > 0 ? (
                        <div className="px-5 py-3.5 bg-orange-50/40 flex items-center justify-between hover:bg-orange-50/60 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                                    <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900">
                                        {pendingLeaves.length === 1
                                            ? `Leave: ${getEmployeeName(firstPendingLeave!)}`
                                            : `${pendingLeaves.length} Leave Requests`}
                                    </p>
                                    <p className="text-[10px] text-orange-500 font-semibold mt-0.5">Needs Approval</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </div>
                    ) : (
                        <div className="px-5 py-3.5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-900">No Pending Leaves</p>
                                <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">All caught up</p>
                            </div>
                        </div>
                    )}

                    {/* Expenses to Approve */}
                    {pendingExpenses.length > 0 ? (
                        <div className="px-5 py-3.5 bg-slate-50/40 flex items-center justify-between border-t border-gray-100 hover:bg-slate-50/60 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                    <Receipt className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900">{pendingExpenses.length} Expenses To Approve</p>
                                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Needs Approval</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </div>
                    ) : (
                        <div className="px-5 py-3.5 flex items-center gap-3 border-t border-gray-100">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                <Receipt className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-900">No Pending Expenses</p>
                                <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">All caught up</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
