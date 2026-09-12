'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import api from '@/lib/api';
import {
    BarChart2, Download, Users, Calendar, DollarSign, FolderKanban,
    TrendingUp, TrendingDown, CheckCircle2, Clock, Package,
    Receipt, Target, Star, AlertCircle, Activity, UserCheck,
    Globe, Server, Printer, Share2, Copy, Check, Search,
    Building2, FileText, PieChart, ShieldCheck, Sparkles,
    CreditCard, ArrowUpRight, ArrowDownRight, Layers, HelpCircle
} from 'lucide-react';
import { SkeletonStatsCard, SkeletonTable } from "@workspace/ui";
import { useSettings } from '@/lib/settings-context';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type ReportTab = 
    | 'summary'
    | 'attendance'
    | 'payroll'
    | 'invoices'
    | 'expenses'
    | 'projects'
    | 'leaves'
    | 'goals'
    | 'assets'
    | 'employees';

function downloadCSV(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function StatCard({ 
    label, 
    value, 
    sub, 
    icon: Icon, 
    color,
    trend 
}: { 
    label: string; 
    value: string | number; 
    sub?: string; 
    icon: any; 
    color: string;
    trend?: { label: string; positive: boolean };
}) {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <span className={clsx(
                        'text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5',
                        trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    )}>
                        {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trend.label}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5 font-medium">{sub}</p>}
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mt-1">{label}</p>
        </div>
    );
}

function AttendanceBar({ rate }: { rate: number }) {
    const roundedRate = Math.min(Math.max(Math.round(rate || 0), 0), 100);
    return (
        <div className="flex items-center gap-2">
            <div 
                className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden" 
                role="progressbar" 
                aria-valuenow={roundedRate} 
                aria-valuemin={0} 
                aria-valuemax={100}
                aria-label={`Attendance rate: ${roundedRate}%`}
            >
                <div 
                    className={clsx(
                        'h-full rounded-full transition-all duration-500', 
                        roundedRate >= 80 ? 'bg-emerald-500' : roundedRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    )} 
                    style={{ width: `${roundedRate}%` }} 
                />
            </div>
            <span className={clsx(
                'text-xs font-bold w-10 text-right', 
                roundedRate >= 80 ? 'text-emerald-600' : roundedRate >= 60 ? 'text-amber-600' : 'text-red-600'
            )}>
                {roundedRate}%
            </span>
        </div>
    );
}

function EmptyState({ icon: Icon, message, submessage }: { icon: any; message: string; submessage?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 my-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm mb-3">
                <Icon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold text-base">{message}</p>
            {submessage && <p className="text-gray-400 text-xs mt-1 max-w-sm">{submessage}</p>}
        </div>
    );
}

export default function ReportsPage() {
    const { platform, company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';

    const [tab, setTab] = useState<ReportTab>('summary');
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [searchQuery, setSearchQuery] = useState('');
    const [copied, setCopied] = useState(false);

    // Data states
    const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
    const [salaries, setSalaries] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [goals, setGoals] = useState<any[]>([]);

    const [error, setError] = useState<string | null>(null);

    // Fast In-Memory SWR Cache for Instant Tab Switching
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    const fetchTabData = useCallback(async (targetTab: ReportTab) => {
        const cacheKey = `reports:${targetTab}:${month}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            applyData(targetTab, cached.data);
            setLoading(false);
        } else {
            setLoading(true);
        }

        setError(null);
        try {
            if (targetTab === 'summary') {
                // Fetch all main reports concurrently for executive dossier
                const [attRes, salRes, invRes, projRes, empRes, expRes, astRes, lveRes, glsRes] = await Promise.allSettled([
                    api.get('/api/attendance/monthly-report', { params: { month } }),
                    api.get('/api/salary', { params: { month } }),
                    api.get('/api/invoices', { params: { limit: 200 } }),
                    api.get('/api/projects', { params: { limit: 200 } }),
                    api.get('/api/users', { params: { limit: 200 } }),
                    api.get('/api/expenses', { params: { month, limit: 200 } }),
                    api.get('/api/assets', { params: { limit: 200 } }),
                    api.get('/api/leaves', { params: { month, limit: 200 } }),
                    api.get('/api/goals', { params: { limit: 200 } }),
                ]);

                const summaryPayload = {
                    attendance: attRes.status === 'fulfilled' ? attRes.value.data : null,
                    salaries: salRes.status === 'fulfilled' ? (salRes.value.data?.salaries || []) : [],
                    invoices: invRes.status === 'fulfilled' ? (invRes.value.data?.invoices || []) : [],
                    projects: projRes.status === 'fulfilled' ? (projRes.value.data?.projects || []) : [],
                    employees: empRes.status === 'fulfilled' ? (empRes.value.data?.users || []) : [],
                    expenses: expRes.status === 'fulfilled' ? (expRes.value.data?.expenses || []) : [],
                    assets: astRes.status === 'fulfilled' ? (astRes.value.data?.assets || []) : [],
                    leaves: lveRes.status === 'fulfilled' ? (lveRes.value.data?.leaves || []) : [],
                    goals: glsRes.status === 'fulfilled' ? (glsRes.value.data?.goals || []) : [],
                };

                setAttendanceSummary(summaryPayload.attendance);
                setSalaries(summaryPayload.salaries);
                setInvoices(summaryPayload.invoices);
                setProjects(summaryPayload.projects);
                setEmployees(summaryPayload.employees);
                setExpenses(summaryPayload.expenses);
                setAssets(summaryPayload.assets);
                setLeaves(summaryPayload.leaves);
                setGoals(summaryPayload.goals);

                swrCacheRef.current.set(cacheKey, { data: summaryPayload, timestamp: Date.now() });
            } else if (targetTab === 'attendance') {
                const { data } = await api.get('/api/attendance/monthly-report', { params: { month } });
                setAttendanceSummary(data);
                swrCacheRef.current.set(cacheKey, { data, timestamp: Date.now() });
            } else if (targetTab === 'payroll') {
                const { data } = await api.get('/api/salary', { params: { month } });
                const fetched = data.salaries || [];
                setSalaries(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            } else if (targetTab === 'invoices') {
                const { data } = await api.get('/api/invoices', { params: { limit: 200 } });
                const fetched = data.invoices || [];
                setInvoices(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            } else if (targetTab === 'projects') {
                const { data } = await api.get('/api/projects', { params: { limit: 200 } });
                const fetched = data.projects || [];
                setProjects(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            } else if (targetTab === 'employees') {
                const { data } = await api.get('/api/users', { params: { limit: 200 } });
                const fetched = data.users || [];
                setEmployees(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            } else if (targetTab === 'expenses') {
                const { data } = await api.get('/api/expenses', { params: { month, limit: 200 } });
                const fetched = data.expenses || [];
                setExpenses(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            } else if (targetTab === 'assets') {
                const { data } = await api.get('/api/assets', { params: { limit: 200 } });
                const fetched = data.assets || [];
                setAssets(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            } else if (targetTab === 'leaves') {
                const { data } = await api.get('/api/leaves', { params: { month, limit: 200 } });
                const fetched = data.leaves || [];
                setLeaves(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            } else if (targetTab === 'goals') {
                const { data } = await api.get('/api/goals', { params: { limit: 200 } });
                const fetched = data.goals || [];
                setGoals(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || err.message || 'Failed to load report data';
            if (!cached) setError(msg);
        } finally {
            setLoading(false);
        }
    }, [month]);

    function applyData(targetTab: ReportTab, data: any) {
        if (targetTab === 'summary') {
            setAttendanceSummary(data.attendance);
            setSalaries(data.salaries);
            setInvoices(data.invoices);
            setProjects(data.projects);
            setEmployees(data.employees);
            setExpenses(data.expenses);
            setAssets(data.assets);
            setLeaves(data.leaves);
            setGoals(data.goals);
        } else if (targetTab === 'attendance') setAttendanceSummary(data);
        else if (targetTab === 'payroll') setSalaries(data);
        else if (targetTab === 'invoices') setInvoices(data);
        else if (targetTab === 'projects') setProjects(data);
        else if (targetTab === 'employees') setEmployees(data);
        else if (targetTab === 'expenses') setExpenses(data);
        else if (targetTab === 'assets') setAssets(data);
        else if (targetTab === 'leaves') setLeaves(data);
        else if (targetTab === 'goals') setGoals(data);
    }

    useEffect(() => {
        fetchTabData(tab);
    }, [tab, fetchTabData]);

    const tabs: { key: ReportTab; label: string; icon: any }[] = [
        { key: 'summary', label: 'Executive 360', icon: Sparkles },
        { key: 'attendance', label: 'Attendance', icon: UserCheck },
        { key: 'payroll', label: 'Payroll', icon: DollarSign },
        { key: 'invoices', label: 'Invoices & Revenue', icon: FileText },
        { key: 'expenses', label: 'Expenses & Bills', icon: Receipt },
        { key: 'projects', label: 'Projects', icon: FolderKanban },
        { key: 'leaves', label: 'Leaves', icon: Calendar },
        { key: 'goals', label: 'Goals & OKRs', icon: Target },
        { key: 'assets', label: 'Digital Assets', icon: Globe },
        { key: 'employees', label: 'Staff Directory', icon: Users },
    ];

    // ─── Computed Global Metrics ────────────────────────────────────────────────
    const totalPayroll = useMemo(() => salaries.reduce((a, s) => a + (s.netSalary || s.baseSalary || 0), 0), [salaries]);
    const totalExpense = useMemo(() => expenses.reduce((a, e) => a + (e.amount || 0), 0), [expenses]);
    const totalInvoiced = useMemo(() => invoices.reduce((a, i) => a + (i.total || i.amount || 0), 0), [invoices]);
    const totalPaidInvoices = useMemo(() => invoices.filter(i => i.status === 'paid').reduce((a, i) => a + (i.total || i.amount || 0), 0), [invoices]);
    const activeProjectsCount = useMemo(() => projects.filter(p => p.status === 'in_progress' || p.status === 'active').length, [projects]);
    const completedProjectsCount = useMemo(() => projects.filter(p => p.status === 'completed').length, [projects]);
    const totalAssetsCost = useMemo(() => assets.reduce((a, as) => a + (as.cost || 0), 0), [assets]);
    const activeStaffCount = useMemo(() => employees.filter(e => e.isActive !== false).length, [employees]);

    const deptCounts = useMemo(() => {
        return employees.reduce((acc: Record<string, number>, e) => {
            const d = e.department || 'General Operations';
            acc[d] = (acc[d] || 0) + 1;
            return acc;
        }, {});
    }, [employees]);

    // ─── Filtered Data based on Search Query ─────────────────────────────────────
    const filteredAttendance = useMemo(() => {
        if (!attendanceSummary?.summary) return [];
        if (!searchQuery.trim()) return attendanceSummary.summary;
        const q = searchQuery.toLowerCase();
        return attendanceSummary.summary.filter((s: any) => 
            s.employee?.name?.toLowerCase().includes(q) ||
            s.employee?.department?.toLowerCase().includes(q) ||
            s.employee?.employeeId?.toLowerCase().includes(q) ||
            s.employee?.role?.toLowerCase().includes(q)
        );
    }, [attendanceSummary, searchQuery]);

    const filteredSalaries = useMemo(() => {
        if (!searchQuery.trim()) return salaries;
        const q = searchQuery.toLowerCase();
        return salaries.filter(s => {
            const name = (s.employee?.name || s.employeeId?.name || s.user?.name || '').toLowerCase();
            const dept = (s.employee?.department || s.employeeId?.department || '').toLowerCase();
            const status = (s.status || '').toLowerCase();
            return name.includes(q) || dept.includes(q) || status.includes(q);
        });
    }, [salaries, searchQuery]);

    const filteredInvoices = useMemo(() => {
        if (!searchQuery.trim()) return invoices;
        const q = searchQuery.toLowerCase();
        return invoices.filter(i => 
            (i.client?.name || i.clientName || '').toLowerCase().includes(q) ||
            (i.invoiceNumber || '').toLowerCase().includes(q) ||
            (i.status || '').toLowerCase().includes(q)
        );
    }, [invoices, searchQuery]);

    const filteredExpenses = useMemo(() => {
        if (!searchQuery.trim()) return expenses;
        const q = searchQuery.toLowerCase();
        return expenses.filter(e => 
            (e.title || '').toLowerCase().includes(q) ||
            (e.category || '').toLowerCase().includes(q) ||
            (e.employee?.name || e.employeeId?.name || e.vendor?.name || '').toLowerCase().includes(q) ||
            (e.status || '').toLowerCase().includes(q)
        );
    }, [expenses, searchQuery]);

    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return projects;
        const q = searchQuery.toLowerCase();
        return projects.filter(p => 
            (p.name || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            (p.status || '').toLowerCase().includes(q) ||
            (p.priority || '').toLowerCase().includes(q)
        );
    }, [projects, searchQuery]);

    const filteredLeaves = useMemo(() => {
        if (!searchQuery.trim()) return leaves;
        const q = searchQuery.toLowerCase();
        return leaves.filter(l => 
            (l.employee?.name || l.employeeId?.name || '').toLowerCase().includes(q) ||
            (l.leaveType || l.type || '').toLowerCase().includes(q) ||
            (l.status || '').toLowerCase().includes(q) ||
            (l.reason || '').toLowerCase().includes(q)
        );
    }, [leaves, searchQuery]);

    const filteredGoals = useMemo(() => {
        if (!searchQuery.trim()) return goals;
        const q = searchQuery.toLowerCase();
        return goals.filter(g => 
            (g.title || '').toLowerCase().includes(q) ||
            (g.category || '').toLowerCase().includes(q) ||
            (g.owner?.name || g.assignedTo?.name || g.createdBy?.name || '').toLowerCase().includes(q) ||
            (g.status || '').toLowerCase().includes(q)
        );
    }, [goals, searchQuery]);

    const filteredAssets = useMemo(() => {
        if (!searchQuery.trim()) return assets;
        const q = searchQuery.toLowerCase();
        return assets.filter(a => 
            (a.name || '').toLowerCase().includes(q) ||
            (a.type || '').toLowerCase().includes(q) ||
            (a.provider || '').toLowerCase().includes(q) ||
            (a.status || '').toLowerCase().includes(q)
        );
    }, [assets, searchQuery]);

    const filteredEmployees = useMemo(() => {
        if (!searchQuery.trim()) return employees;
        const q = searchQuery.toLowerCase();
        return employees.filter(e => 
            (e.name || '').toLowerCase().includes(q) ||
            (e.email || '').toLowerCase().includes(q) ||
            (e.department || '').toLowerCase().includes(q) ||
            (e.role || '').toLowerCase().includes(q) ||
            (e.position || '').toLowerCase().includes(q) ||
            (e.employeeId || '').toLowerCase().includes(q)
        );
    }, [employees, searchQuery]);

    // ─── Export Handler ─────────────────────────────────────────────────────────
    function handleExportTab() {
        if (tab === 'summary') {
            handleExportFullDossier();
            return;
        }

        if (tab === 'attendance' && attendanceSummary?.summary) {
            downloadCSV(
                ['Employee', 'Employee ID', 'Department', 'Role', 'Present', 'Absent', 'Late', 'WFH', 'On Leave', 'Half Day', 'Attendance Rate %', 'Working Days'],
                (attendanceSummary.summary || []).map((s: any) => [
                    s.employee?.name || '—', 
                    s.employee?.employeeId || '', 
                    s.employee?.department || '', 
                    s.employee?.role || '', 
                    s.present || 0, 
                    s.absent || 0, 
                    s.late || 0, 
                    s.wfh || 0, 
                    s.onLeave || 0, 
                    s.halfDay || 0, 
                    s.attendanceRate || 0, 
                    s.workingDays || 0
                ]),
                `attendance_report_${month}.csv`
            );
            toast.success('Attendance report exported!');
        } else if (tab === 'payroll') {
            downloadCSV(
                ['Employee', 'Employee ID', 'Department', 'Base Salary', 'Deductions', 'Bonuses', 'Net Salary', 'Status', 'Month'],
                salaries.map(s => [
                    s.employee?.name || s.employeeId?.name || s.user?.name || '—',
                    s.employee?.employeeId || s.employeeId?.employeeId || '',
                    s.employee?.department || s.employeeId?.department || '—',
                    s.baseSalary || 0,
                    s.deductions || 0,
                    s.bonuses || 0,
                    s.netSalary || 0,
                    s.status || 'pending',
                    s.month || month
                ]),
                `payroll_report_${month}.csv`
            );
            toast.success('Payroll report exported!');
        } else if (tab === 'invoices') {
            downloadCSV(
                ['Invoice #', 'Client', 'Total Amount', 'Paid Amount', 'Status', 'Issue Date', 'Due Date'],
                invoices.map(i => [
                    i.invoiceNumber || '—',
                    i.client?.name || i.clientName || '—',
                    i.total || i.amount || 0,
                    i.paidAmount || 0,
                    i.status || 'draft',
                    i.issueDate ? new Date(i.issueDate).toLocaleDateString() : '',
                    i.dueDate ? new Date(i.dueDate).toLocaleDateString() : ''
                ]),
                `invoices_report.csv`
            );
            toast.success('Invoices report exported!');
        } else if (tab === 'projects') {
            downloadCSV(
                ['Project', 'Status', 'Priority', 'Members Count', 'Deadline', 'Budget'],
                projects.map(p => [
                    p.name, 
                    p.status, 
                    p.priority, 
                    p.members?.length || 0, 
                    p.deadline ? new Date(p.deadline).toLocaleDateString() : '', 
                    p.budget || ''
                ]),
                `projects_report.csv`
            );
            toast.success('Projects report exported!');
        } else if (tab === 'employees') {
            downloadCSV(
                ['Name', 'Email', 'Role', 'Department', 'Position', 'Employee ID', 'Joined', 'Status'],
                employees.map(e => [
                    e.name, 
                    e.email, 
                    e.role, 
                    e.department, 
                    e.position, 
                    e.employeeId, 
                    e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : '', 
                    e.isActive !== false ? 'Active' : 'Inactive'
                ]),
                `staff_directory_report.csv`
            );
            toast.success('Staff directory exported!');
        } else if (tab === 'expenses') {
            downloadCSV(
                ['Title', 'Category', 'Amount', 'Currency', 'Status', 'Employee/Vendor', 'Date', 'Notes'],
                expenses.map(e => [
                    e.title, 
                    e.category, 
                    e.amount, 
                    e.currency || 'USD',
                    e.status, 
                    e.employee?.name || e.employeeId?.name || e.vendor?.name || '—', 
                    new Date(e.createdAt || e.date).toLocaleDateString(), 
                    e.notes || ''
                ]),
                `expenses_report_${month}.csv`
            );
            toast.success('Expenses report exported!');
        } else if (tab === 'leaves') {
            downloadCSV(
                ['Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason'],
                leaves.map(l => [
                    l.employee?.name || l.employeeId?.name || '—', 
                    l.employee?.department || l.employeeId?.department || '—', 
                    l.leaveType || l.type, 
                    new Date(l.startDate).toLocaleDateString(), 
                    new Date(l.endDate).toLocaleDateString(), 
                    l.totalDays || l.days || 1, 
                    l.status, 
                    l.reason || ''
                ]),
                `leaves_report_${month}.csv`
            );
            toast.success('Leaves report exported!');
        } else if (tab === 'goals') {
            downloadCSV(
                ['Title', 'Category', 'Assignee / Owner', 'Status', 'Progress %', 'Due Date', 'Priority'],
                goals.map(g => [
                    g.title, 
                    g.category, 
                    g.owner?.name || g.assignedTo?.name || g.createdBy?.name || '', 
                    g.status, 
                    g.progress || 0, 
                    g.dueDate ? new Date(g.dueDate).toLocaleDateString() : '', 
                    g.priority || 'medium'
                ]),
                `goals_report.csv`
            );
            toast.success('Goals report exported!');
        } else if (tab === 'assets') {
            downloadCSV(
                ['Asset Name', 'Type', 'Provider', 'Renewal Date', 'Cost', 'Billing Cycle', 'Status', 'URL', 'Owner'],
                assets.map(a => [
                    a.name, 
                    a.type, 
                    a.provider || '', 
                    a.renewalDate ? new Date(a.renewalDate).toLocaleDateString() : '', 
                    a.cost || 0, 
                    a.billingCycle, 
                    a.status, 
                    a.url || '',
                    a.owner?.name || ''
                ]),
                `digital_assets_report.csv`
            );
            toast.success('Digital assets report exported!');
        }
    }

    function handleExportFullDossier() {
        const lines: string[] = [];

        lines.push(`180WORKSPACE COMPLETE COMPANY DOSSIER & OPERATIONAL AUDIT`);
        lines.push(`Company: ${company?.name || 'Your Company'}`);
        lines.push(`Generated On: ${new Date().toLocaleString()}`);
        lines.push(`Target Month: ${month}`);
        lines.push(``);

        // Section 1: Executive Summary
        lines.push(`=== 1. EXECUTIVE SUMMARY METRICS ===`);
        lines.push(`Active Staff Count,${activeStaffCount}`);
        lines.push(`Total Invoiced Revenue,${currencySymbol}${totalInvoiced.toLocaleString()}`);
        lines.push(`Collected Revenue,${currencySymbol}${totalPaidInvoices.toLocaleString()}`);
        lines.push(`Monthly Payroll Budget,${currencySymbol}${totalPayroll.toLocaleString()}`);
        lines.push(`Monthly Expenses & Claims,${currencySymbol}${totalExpense.toLocaleString()}`);
        lines.push(`Active Projects,${activeProjectsCount}`);
        lines.push(`Completed Projects,${completedProjectsCount}`);
        lines.push(`Digital Infrastructure Recurring Cost,${currencySymbol}${totalAssetsCost.toLocaleString()}`);
        lines.push(``);

        // Section 2: Department Breakdown
        lines.push(`=== 2. DEPARTMENT HEADCOUNT ===`);
        lines.push(`Department,Headcount`);
        Object.entries(deptCounts).forEach(([dept, count]) => {
            lines.push(`"${dept}",${count}`);
        });
        lines.push(``);

        // Section 3: Payroll Roster
        lines.push(`=== 3. PAYROLL BREAKDOWN (${month}) ===`);
        lines.push(`Employee,Employee ID,Department,Base Salary,Deductions,Bonuses,Net Salary,Status`);
        salaries.forEach(s => {
            lines.push(`"${s.employee?.name || s.employeeId?.name || s.user?.name || '—'}","${s.employee?.employeeId || ''}","${s.employee?.department || '—'}",${s.baseSalary || 0},${s.deductions || 0},${s.bonuses || 0},${s.netSalary || 0},"${s.status || 'pending'}"`);
        });
        lines.push(``);

        // Section 4: Projects Status
        lines.push(`=== 4. ACTIVE PROJECTS & WORKFLOWS ===`);
        lines.push(`Project Name,Status,Priority,Members,Deadline,Budget`);
        projects.forEach(p => {
            lines.push(`"${p.name}","${p.status}","${p.priority || 'medium'}",${p.members?.length || 0},"${p.deadline ? new Date(p.deadline).toLocaleDateString() : ''}","${p.budget || ''}"`);
        });
        lines.push(``);

        // Section 5: Digital Assets & Cloud
        lines.push(`=== 5. DIGITAL ASSETS & INFRASTRUCTURE ===`);
        lines.push(`Asset Name,Type,Provider,Cost,Billing Cycle,Renewal Date,Status`);
        assets.forEach(a => {
            lines.push(`"${a.name}","${a.type}","${a.provider || ''}",${a.cost || 0},"${a.billingCycle}","${a.renewalDate ? new Date(a.renewalDate).toLocaleDateString() : ''}","${a.status}"`);
        });

        const csvContent = lines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Full_Company_Report_${company?.name ? company.name.replace(/\s+/g, '_') : '180workspace'}_${month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Full Company Dossier downloaded successfully!');
    }

    function handleCopyBrief() {
        const brief = `
📊 *${company?.name || '180workspace'} Executive Operational Briefing (${month})*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 *Team & Staff:* ${activeStaffCount} Active Members across ${Object.keys(deptCounts).length} Departments
💰 *Invoiced Revenue:* ${currencySymbol}${totalInvoiced.toLocaleString()} (Collected: ${currencySymbol}${totalPaidInvoices.toLocaleString()})
💵 *Payroll Commitment:* ${currencySymbol}${totalPayroll.toLocaleString()}
🧾 *Monthly Expenses:* ${currencySymbol}${totalExpense.toLocaleString()}
🚀 *Projects:* ${activeProjectsCount} Active | ${completedProjectsCount} Completed
🌐 *Infrastructure Cost:* ${currencySymbol}${totalAssetsCost.toLocaleString()}/mo across ${assets.length} Assets
🎯 *Goals Tracked:* ${goals.length} Strategic OKRs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated via ${platform?.platformName || '180workspace'} Reports & Analytics Engine.
`.trim();

        navigator.clipboard.writeText(brief).then(() => {
            setCopied(true);
            toast.success('Executive briefing copied to clipboard!');
            setTimeout(() => setCopied(false), 3000);
        });
    }

    function handlePrint() {
        window.print();
    }

    return (
        <div className="space-y-6 print:p-0">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                            Enterprise Audit
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Comprehensive operational, financial, and workforce reporting across your entire workspace
                    </p>
                </div>

                {/* Header Actions */}
                <div className="flex items-center flex-wrap gap-2 print:hidden">
                    <button 
                        onClick={handleCopyBrief}
                        className="px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1.5 shadow-sm"
                        title="Copy formatted summary to clipboard"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                        <span>{copied ? 'Copied Brief' : 'Share Brief'}</span>
                    </button>

                    <button 
                        onClick={handlePrint}
                        className="px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1.5 shadow-sm"
                        title="Print or Save PDF"
                    >
                        <Printer className="w-4 h-4 text-gray-500" />
                        <span>Print / PDF</span>
                    </button>

                    <button 
                        onClick={handleExportTab}
                        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-2"
                        title="Export CSV"
                    >
                        <Download className="w-4 h-4" />
                        <span>{tab === 'summary' ? 'Export Full Dossier' : 'Export Tab CSV'}</span>
                    </button>
                </div>
            </div>

            {/* Print Header (Visible only when printing) */}
            <div className="hidden print:block mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-xl font-bold">{company?.name || '180workspace'} — Operational Audit Report</h2>
                <p className="text-xs text-gray-500">Period: {month} | Generated: {new Date().toLocaleString()}</p>
            </div>

            {/* Filter & Controls Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm print:hidden">
                {/* Tab Switcher */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                    {tabs.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={clsx(
                                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap',
                                tab === key 
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Search and Date Controls */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Live Search */}
                    <div className="relative flex-1 sm:w-56">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter records..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Month Picker for temporal tabs */}
                    {['summary', 'attendance', 'payroll', 'expenses', 'leaves'].includes(tab) && (
                        <input
                            type="month"
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-700 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            title="Select Report Month"
                            aria-label="Select report month"
                        />
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2.5 p-4 bg-red-50/80 border border-red-200 rounded-2xl text-red-700 text-sm animate-shake">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                    <span>{error}</span>
                </div>
            )}

            {/* Content Loading Skeleton */}
            {loading ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <SkeletonStatsCard key={i} />
                        ))}
                    </div>
                    <SkeletonTable rows={8} columns={6} />
                </div>
            ) : (
                <>
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 1. EXECUTIVE 360 COMPANY DOSSIER ─────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'summary' && (
                        <div className="space-y-6">
                            {/* Executive Metric Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                <StatCard 
                                    label="Total Staff" 
                                    value={activeStaffCount} 
                                    sub={`${Object.keys(deptCounts).length} Active Departments`} 
                                    icon={Users} 
                                    color="bg-indigo-50 text-indigo-600" 
                                />
                                <StatCard 
                                    label="Total Invoiced" 
                                    value={`${currencySymbol}${totalInvoiced.toLocaleString()}`} 
                                    sub={`Paid: ${currencySymbol}${totalPaidInvoices.toLocaleString()}`} 
                                    icon={FileText} 
                                    color="bg-emerald-50 text-emerald-600" 
                                    trend={{ label: `${invoices.filter(i => i.status === 'paid').length} Paid Invoices`, positive: true }}
                                />
                                <StatCard 
                                    label="Payroll Commitment" 
                                    value={`${currencySymbol}${totalPayroll.toLocaleString()}`} 
                                    sub={`Month: ${month}`} 
                                    icon={DollarSign} 
                                    color="bg-purple-50 text-purple-600" 
                                />
                                <StatCard 
                                    label="Monthly Expenses" 
                                    value={`${currencySymbol}${totalExpense.toLocaleString()}`} 
                                    sub={`${expenses.length} Logged Transactions`} 
                                    icon={Receipt} 
                                    color="bg-amber-50 text-amber-600" 
                                />
                                <StatCard 
                                    label="Active Projects" 
                                    value={activeProjectsCount} 
                                    sub={`${completedProjectsCount} Completed to Date`} 
                                    icon={FolderKanban} 
                                    color="bg-blue-50 text-blue-600" 
                                />
                                <StatCard 
                                    label="Attendance Rate" 
                                    value={`${attendanceSummary?.summary ? Math.round(attendanceSummary.summary.reduce((a: number, s: any) => a + (s.attendanceRate || 0), 0) / Math.max(attendanceSummary.summary.length, 1)) : 100}%`} 
                                    sub={`${attendanceSummary?.workingDays || 22} Working Days in ${month}`} 
                                    icon={UserCheck} 
                                    color="bg-teal-50 text-teal-600" 
                                />
                                <StatCard 
                                    label="Digital Assets" 
                                    value={assets.length} 
                                    sub={`Recurring: ${currencySymbol}${totalAssetsCost.toLocaleString()}/mo`} 
                                    icon={Globe} 
                                    color="bg-sky-50 text-sky-600" 
                                />
                                <StatCard 
                                    label="Strategic Goals" 
                                    value={goals.length} 
                                    sub={`${goals.filter(g => g.status === 'completed').length} Achieved`} 
                                    icon={Target} 
                                    color="bg-rose-50 text-rose-600" 
                                />
                            </div>

                            {/* Department Headcount Breakdown */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-base">Department Staff Distribution</h3>
                                        <p className="text-xs text-gray-500">Resource allocation across operational divisions</p>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
                                        {employees.length} Total Registered Members
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {Object.entries(deptCounts).map(([dept, count]) => (
                                        <div key={dept} className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl">
                                            <p className="text-xs font-medium text-gray-500 truncate" title={dept}>{dept}</p>
                                            <p className="text-lg font-bold text-gray-900 mt-1">{count} <span className="text-xs font-normal text-gray-400">members</span></p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Action to Download All-in-One Dossier */}
                            <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-950/20">
                                <div className="space-y-1 text-center md:text-left">
                                    <h4 className="text-base font-bold flex items-center gap-2 justify-center md:justify-start">
                                        <Layers className="w-5 h-5 text-indigo-300" />
                                        Complete Multi-Department Company Dossier
                                    </h4>
                                    <p className="text-xs text-indigo-200/80 max-w-xl">
                                        Generate an all-in-one consolidated CSV file including complete attendance, payroll records, invoices, expenses, projects, OKRs, and digital asset registries.
                                    </p>
                                </div>
                                <button
                                    onClick={handleExportFullDossier}
                                    className="px-5 py-2.5 bg-white text-indigo-950 hover:bg-indigo-50 rounded-xl font-bold text-xs tracking-wide uppercase transition-all shadow-md flex items-center gap-2 flex-shrink-0"
                                >
                                    <Download className="w-4 h-4 text-indigo-600" />
                                    Download Complete Dossier
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 2. ATTENDANCE REPORT ─────────────────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'attendance' && (
                        <div className="space-y-6">
                            {!attendanceSummary ? (
                                <EmptyState icon={UserCheck} message="No attendance data found." submessage={`No attendance logs recorded for month: ${month}`} />
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                        <StatCard label="Staff Monitored" value={attendanceSummary.employeeCount || 0} icon={Users} color="bg-indigo-50 text-indigo-600" />
                                        <StatCard label="Working Days" value={attendanceSummary.workingDays || 0} icon={Calendar} color="bg-gray-50 text-gray-600" />
                                        <StatCard label="Total Present" value={attendanceSummary.totals?.present || 0} icon={CheckCircle2} color="bg-green-50 text-green-600" />
                                        <StatCard label="Total Absent" value={attendanceSummary.totals?.absent || 0} icon={TrendingDown} color="bg-red-50 text-red-600" />
                                        <StatCard label="WFH Days" value={attendanceSummary.totals?.wfh || 0} icon={Activity} color="bg-blue-50 text-blue-600" />
                                        <StatCard label="Late Arrivals" value={attendanceSummary.totals?.late || 0} icon={Clock} color="bg-amber-50 text-amber-600" />
                                    </div>

                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-sm">Monthly Attendance Grid — {month}</h3>
                                                <p className="text-xs text-gray-400 mt-0.5">{attendanceSummary.workingDays} working days counted</p>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                                {filteredAttendance.length} records
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-50/75 text-gray-500 font-semibold border-b border-gray-100">
                                                    <tr>
                                                        <th className="py-3 px-4">Employee</th>
                                                        <th className="py-3 px-4">Dept / Role</th>
                                                        <th className="py-3 px-4 text-center">Present</th>
                                                        <th className="py-3 px-4 text-center">Absent</th>
                                                        <th className="py-3 px-4 text-center">Late</th>
                                                        <th className="py-3 px-4 text-center">WFH</th>
                                                        <th className="py-3 px-4 text-center">Leave</th>
                                                        <th className="py-3 px-4 text-center">Half Day</th>
                                                        <th className="py-3 px-4">Attendance Rate</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                                    {filteredAttendance.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={9} className="text-center text-gray-400 py-10">No matching employees found</td>
                                                        </tr>
                                                    ) : filteredAttendance.map((s: any) => (
                                                        <tr key={s.employee?._id || s.employee?.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                                                                        {s.employee?.name?.[0]?.toUpperCase() || 'U'}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-gray-900">{s.employee?.name || '—'}</p>
                                                                        <p className="text-[10px] text-gray-400">{s.employee?.employeeId || '—'}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <p className="font-medium text-gray-800">{s.employee?.department || '—'}</p>
                                                                <p className="text-[10px] text-gray-400 capitalize">{s.employee?.role || 'employee'}</p>
                                                            </td>
                                                            <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">{s.present || 0}</span></td>
                                                            <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">{s.absent || 0}</span></td>
                                                            <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">{s.late || 0}</span></td>
                                                            <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold">{s.wfh || 0}</span></td>
                                                            <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold">{s.onLeave || 0}</span></td>
                                                            <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold">{s.halfDay || 0}</span></td>
                                                            <td className="py-3 px-4 w-44">
                                                                <AttendanceBar rate={s.attendanceRate || 0} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 3. PAYROLL REPORT ────────────────────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'payroll' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Payroll" value={`${currencySymbol}${totalPayroll.toLocaleString()}`} icon={DollarSign} color="bg-emerald-50 text-emerald-600" />
                                <StatCard label="Salaries Processed" value={salaries.length} icon={Users} color="bg-indigo-50 text-indigo-600" />
                                <StatCard label="Paid Out" value={salaries.filter(s => s.status === 'paid').length} icon={CheckCircle2} color="bg-green-50 text-green-600" />
                                <StatCard label="Pending Approval" value={salaries.filter(s => s.status === 'pending' || s.status === 'draft').length} icon={Clock} color="bg-amber-50 text-amber-600" />
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {filteredSalaries.length === 0 ? (
                                    <EmptyState icon={DollarSign} message="No payroll records found." submessage={`No salary entries generated for ${month}.`} />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50/75 text-gray-500 font-semibold border-b border-gray-100">
                                                <tr>
                                                    <th className="py-3 px-4">Employee</th>
                                                    <th className="py-3 px-4">Department / ID</th>
                                                    <th className="py-3 px-4">Base Salary</th>
                                                    <th className="py-3 px-4">Deductions</th>
                                                    <th className="py-3 px-4">Bonuses</th>
                                                    <th className="py-3 px-4 font-bold text-gray-900">Net Salary</th>
                                                    <th className="py-3 px-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {filteredSalaries.map(s => (
                                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <p className="font-semibold text-gray-900">{s.employee?.name || s.employeeId?.name || s.user?.name || '—'}</p>
                                                            <p className="text-[10px] text-gray-400">{s.employee?.email || s.employeeId?.email || ''}</p>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <p className="font-medium text-gray-800">{s.employee?.department || s.employeeId?.department || '—'}</p>
                                                            <p className="text-[10px] text-gray-400">{s.employee?.employeeId || s.employeeId?.employeeId || '—'}</p>
                                                        </td>
                                                        <td className="py-3 px-4 font-medium">{currencySymbol}{(s.baseSalary || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-rose-600 font-medium">-{currencySymbol}{(s.deductions || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-emerald-600 font-medium">+{currencySymbol}{(s.bonuses || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 font-bold text-gray-900">{currencySymbol}{(s.netSalary || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={clsx(
                                                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                                s.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                                s.status === 'approved' || s.status === 'hr_approved' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-amber-100 text-amber-800'
                                                            )}>
                                                                {s.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 4. INVOICES & REVENUE REPORT ─────────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'invoices' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Invoiced" value={`${currencySymbol}${totalInvoiced.toLocaleString()}`} icon={FileText} color="bg-indigo-50 text-indigo-600" />
                                <StatCard label="Collected Revenue" value={`${currencySymbol}${totalPaidInvoices.toLocaleString()}`} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
                                <StatCard label="Paid Invoices" value={invoices.filter(i => i.status === 'paid').length} icon={CreditCard} color="bg-teal-50 text-teal-600" />
                                <StatCard label="Pending / Overdue" value={invoices.filter(i => i.status !== 'paid').length} icon={Clock} color="bg-amber-50 text-amber-600" />
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {filteredInvoices.length === 0 ? (
                                    <EmptyState icon={FileText} message="No invoices recorded." submessage="Generate invoices to monitor revenue streams." />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50/75 text-gray-500 font-semibold border-b border-gray-100">
                                                <tr>
                                                    <th className="py-3 px-4">Invoice #</th>
                                                    <th className="py-3 px-4">Client</th>
                                                    <th className="py-3 px-4">Total Amount</th>
                                                    <th className="py-3 px-4">Paid Amount</th>
                                                    <th className="py-3 px-4">Issue Date</th>
                                                    <th className="py-3 px-4">Due Date</th>
                                                    <th className="py-3 px-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {filteredInvoices.map(i => (
                                                    <tr key={i.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-3 px-4 font-mono font-bold text-gray-900">{i.invoiceNumber || '—'}</td>
                                                        <td className="py-3 px-4 font-medium text-gray-800">{i.client?.name || i.clientName || '—'}</td>
                                                        <td className="py-3 px-4 font-bold text-gray-900">{currencySymbol}{(i.total || i.amount || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-emerald-600 font-medium">{currencySymbol}{(i.paidAmount || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-gray-500">{i.issueDate ? new Date(i.issueDate).toLocaleDateString() : '—'}</td>
                                                        <td className="py-3 px-4 text-gray-500">{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '—'}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={clsx(
                                                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                                i.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                                i.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                                i.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            )}>
                                                                {i.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 5. EXPENSES REPORT ───────────────────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'expenses' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Expenses" value={`${currencySymbol}${totalExpense.toLocaleString()}`} icon={Receipt} color="bg-indigo-50 text-indigo-600" />
                                <StatCard label="Expense Records" value={expenses.length} icon={BarChart2} color="bg-gray-50 text-gray-600" />
                                <StatCard label="Approved Claims" value={expenses.filter(e => e.status === 'approved' || e.status === 'paid').length} icon={CheckCircle2} color="bg-green-50 text-green-600" />
                                <StatCard label="Pending Approval" value={expenses.filter(e => e.status === 'pending_approval' || e.status === 'pending').length} icon={Clock} color="bg-amber-50 text-amber-600" />
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {filteredExpenses.length === 0 ? (
                                    <EmptyState icon={Receipt} message="No expense transactions found." submessage={`No expenses or employee claims submitted for ${month}.`} />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50/75 text-gray-500 font-semibold border-b border-gray-100">
                                                <tr>
                                                    <th className="py-3 px-4">Title & Notes</th>
                                                    <th className="py-3 px-4">Submitter / Vendor</th>
                                                    <th className="py-3 px-4">Category</th>
                                                    <th className="py-3 px-4">Amount</th>
                                                    <th className="py-3 px-4">Date</th>
                                                    <th className="py-3 px-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {filteredExpenses.map((e: any) => (
                                                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <p className="font-semibold text-gray-900">{e.title}</p>
                                                            {e.notes && <p className="text-[10px] text-gray-400 line-clamp-1">{e.notes}</p>}
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-gray-800">
                                                            {e.employee?.name || e.employeeId?.name || e.vendor?.name || '—'}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold uppercase text-[10px]">
                                                                {e.category}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 font-bold text-gray-900">
                                                            {currencySymbol}{(e.amount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-500">
                                                            {new Date(e.createdAt || e.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={clsx(
                                                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                                e.status === 'approved' || e.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                                e.status === 'pending_approval' || e.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-rose-100 text-rose-800'
                                                            )}>
                                                                {e.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 6. PROJECTS REPORT ───────────────────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'projects' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Projects" value={projects.length} icon={FolderKanban} color="bg-indigo-50 text-indigo-600" />
                                <StatCard label="Completed" value={completedProjectsCount} icon={CheckCircle2} color="bg-green-50 text-green-600" />
                                <StatCard label="In Progress" value={activeProjectsCount} icon={TrendingUp} color="bg-blue-50 text-blue-600" />
                                <StatCard label="Overdue" value={projects.filter(p => p.deadline && new Date(p.deadline) < new Date() && p.status !== 'completed').length} icon={AlertCircle} color="bg-red-50 text-red-600" />
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {filteredProjects.length === 0 ? (
                                    <EmptyState icon={FolderKanban} message="No projects found." submessage="Create projects to track deliverable timelines and team assignments." />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50/75 text-gray-500 font-semibold border-b border-gray-100">
                                                <tr>
                                                    <th className="py-3 px-4">Project Name</th>
                                                    <th className="py-3 px-4">Status</th>
                                                    <th className="py-3 px-4">Priority</th>
                                                    <th className="py-3 px-4">Team Members</th>
                                                    <th className="py-3 px-4">Deadline</th>
                                                    <th className="py-3 px-4">Overdue?</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {filteredProjects.map(p => {
                                                    const isOverdue = p.deadline && new Date(p.deadline) < new Date() && p.status !== 'completed';
                                                    return (
                                                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <p className="font-semibold text-gray-900">{p.name}</p>
                                                                {p.description && <p className="text-[10px] text-gray-400 line-clamp-1">{p.description}</p>}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className={clsx(
                                                                    'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                                    p.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                                                    p.status === 'in_progress' || p.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                )}>
                                                                    {p.status?.replace('_', ' ')}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className={clsx(
                                                                    'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase',
                                                                    p.priority === 'critical' ? 'bg-rose-100 text-rose-800' :
                                                                    p.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                                                                    'bg-gray-100 text-gray-700'
                                                                )}>
                                                                    {p.priority || 'normal'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700 font-medium">
                                                                {p.members?.length || 0} assigned
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-500">
                                                                {p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {isOverdue ? (
                                                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md">Yes</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md">On Track</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 7. LEAVES REPORT ─────────────────────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'leaves' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Requests" value={leaves.length} icon={Calendar} color="bg-indigo-50 text-indigo-600" />
                                <StatCard label="Approved" value={leaves.filter(l => l.status === 'approved').length} icon={CheckCircle2} color="bg-green-50 text-green-600" />
                                <StatCard label="Pending" value={leaves.filter(l => l.status === 'pending').length} icon={Clock} color="bg-amber-50 text-amber-600" />
                                <StatCard label="Rejected" value={leaves.filter(l => l.status === 'rejected').length} icon={TrendingDown} color="bg-red-50 text-red-600" />
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {filteredLeaves.length === 0 ? (
                                    <EmptyState icon={Calendar} message="No leave requests found." submessage={`No employee leave applications submitted for ${month}.`} />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50/75 text-gray-500 font-semibold border-b border-gray-100">
                                                <tr>
                                                    <th className="py-3 px-4">Employee</th>
                                                    <th className="py-3 px-4">Leave Type</th>
                                                    <th className="py-3 px-4">Duration</th>
                                                    <th className="py-3 px-4">Days</th>
                                                    <th className="py-3 px-4">Status</th>
                                                    <th className="py-3 px-4">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {filteredLeaves.map((l: any) => (
                                                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <p className="font-semibold text-gray-900">{l.employee?.name || l.employeeId?.name || '—'}</p>
                                                            <p className="text-[10px] text-gray-400">{l.employee?.department || l.employeeId?.department || '—'}</p>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold uppercase text-[10px]">
                                                                {l.leaveType || l.type || 'casual'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-600">
                                                            {l.startDate ? new Date(l.startDate).toLocaleDateString() : '—'} – {l.endDate ? new Date(l.endDate).toLocaleDateString() : '—'}
                                                        </td>
                                                        <td className="py-3 px-4 font-bold text-gray-900">
                                                            {l.totalDays || l.days || 1} day{(l.totalDays || l.days) > 1 ? 's' : ''}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={clsx(
                                                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                                l.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                                                l.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-rose-100 text-rose-800'
                                                            )}>
                                                                {l.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">{l.reason || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 8. GOALS & OKRS REPORT ───────────────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'goals' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Goals" value={goals.length} icon={Target} color="bg-indigo-50 text-indigo-600" />
                                <StatCard label="Completed" value={goals.filter(g => g.status === 'completed').length} icon={CheckCircle2} color="bg-green-50 text-green-600" />
                                <StatCard label="In Progress" value={goals.filter(g => g.status === 'in_progress').length} icon={Activity} color="bg-blue-50 text-blue-600" />
                                <StatCard label="Avg Completion" value={`${Math.round(goals.reduce((a, g) => a + (g.progress || 0), 0) / Math.max(goals.length, 1))}%`} icon={TrendingUp} color="bg-purple-50 text-purple-600" />
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {filteredGoals.length === 0 ? (
                                    <EmptyState icon={Target} message="No strategic goals logged." submessage="Set company and department OKRs to track quarterly execution." />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50/75 text-gray-500 font-semibold border-b border-gray-100">
                                                <tr>
                                                    <th className="py-3 px-4">Goal & Scope</th>
                                                    <th className="py-3 px-4">Owner / Assignee</th>
                                                    <th className="py-3 px-4">Category</th>
                                                    <th className="py-3 px-4">Due Date</th>
                                                    <th className="py-3 px-4 w-40">Progress</th>
                                                    <th className="py-3 px-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {filteredGoals.map((g: any) => (
                                                    <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <p className="font-semibold text-gray-900">{g.title}</p>
                                                            {g.description && <p className="text-[10px] text-gray-400 line-clamp-1">{g.description}</p>}
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-gray-800">
                                                            {g.owner?.name || g.assignedTo?.name || g.createdBy?.name || '—'}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold uppercase text-[10px]">
                                                                {g.category || 'general'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-500">
                                                            {g.dueDate ? new Date(g.dueDate).toLocaleDateString() : '—'}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(g.progress || 0, 100)}%` }} />
                                                                </div>
                                                                <span className="font-bold text-gray-700 text-[11px] w-8 text-right">{g.progress || 0}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={clsx(
                                                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                                g.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                                                g.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            )}>
                                                                {g.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 9. DIGITAL ASSETS REPORT ─────────────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'assets' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Assets" value={assets.length} icon={Globe} color="bg-indigo-50 text-indigo-600" />
                                <StatCard label="Monthly Infra Cost" value={`${currencySymbol}${totalAssetsCost.toLocaleString()}`} icon={DollarSign} color="bg-emerald-50 text-emerald-600" />
                                <StatCard label="Active Domains" value={assets.filter(a => a.type === 'domain').length} icon={Globe} color="bg-blue-50 text-blue-600" />
                                <StatCard label="Servers & Cloud" value={assets.filter(a => a.type === 'server' || a.type === 'cloud').length} icon={Server} color="bg-purple-50 text-purple-600" />
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {filteredAssets.length === 0 ? (
                                    <EmptyState icon={Globe} message="No digital assets found." submessage="Record company domains, servers, and SaaS subscriptions in the asset ledger." />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50/75 text-gray-500 font-semibold border-b border-gray-100">
                                                <tr>
                                                    <th className="py-3 px-4">Asset Name</th>
                                                    <th className="py-3 px-4">Type</th>
                                                    <th className="py-3 px-4">Provider</th>
                                                    <th className="py-3 px-4">Renewal Date</th>
                                                    <th className="py-3 px-4">Cost</th>
                                                    <th className="py-3 px-4">Billing Cycle</th>
                                                    <th className="py-3 px-4">Owner / Contact</th>
                                                    <th className="py-3 px-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {filteredAssets.map((a: any) => (
                                                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <p className="font-semibold text-gray-900">{a.name}</p>
                                                            {a.url && <p className="text-[10px] text-gray-400 truncate max-w-xs">{a.url}</p>}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold uppercase text-[10px]">
                                                                {a.type}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-gray-800">{a.provider || '—'}</td>
                                                        <td className="py-3 px-4 text-gray-500">{a.renewalDate ? new Date(a.renewalDate).toLocaleDateString() : 'Auto-renew'}</td>
                                                        <td className="py-3 px-4 font-bold text-gray-900">{currencySymbol}{(a.cost || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 capitalize text-gray-600">{a.billingCycle || 'monthly'}</td>
                                                        <td className="py-3 px-4 text-gray-600">{a.owner?.name || '—'}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={clsx(
                                                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                                a.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                                                            )}>
                                                                {a.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {/* ── 10. STAFF DIRECTORY REPORT ───────────────────────────────────────── */}
                    {/* ═══════════════════════════════════════════════════════════════════════ */}
                    {tab === 'employees' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Staff" value={employees.length} icon={Users} color="bg-indigo-50 text-indigo-600" />
                                <StatCard label="Active" value={activeStaffCount} icon={CheckCircle2} color="bg-green-50 text-green-600" />
                                <StatCard label="Inactive" value={employees.filter(e => e.isActive === false).length} icon={TrendingDown} color="bg-red-50 text-red-600" />
                                <StatCard label="Departments" value={Object.keys(deptCounts).length} icon={BarChart2} color="bg-purple-50 text-purple-600" />
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {filteredEmployees.length === 0 ? (
                                    <EmptyState icon={Users} message="No employees found." submessage="Invite team members in company settings." />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50/75 text-gray-500 font-semibold border-b border-gray-100">
                                                <tr>
                                                    <th className="py-3 px-4">Employee</th>
                                                    <th className="py-3 px-4">Role</th>
                                                    <th className="py-3 px-4">Department</th>
                                                    <th className="py-3 px-4">Position</th>
                                                    <th className="py-3 px-4">Employee ID</th>
                                                    <th className="py-3 px-4">Joining Date</th>
                                                    <th className="py-3 px-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {filteredEmployees.map(e => (
                                                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                                                                    {e.name?.[0]?.toUpperCase() || 'U'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-gray-900">{e.name}</p>
                                                                    <p className="text-[10px] text-gray-400">{e.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold uppercase text-[10px]">
                                                                {e.role}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-gray-800">{e.department || '—'}</td>
                                                        <td className="py-3 px-4 text-gray-600">{e.position || '—'}</td>
                                                        <td className="py-3 px-4 font-mono text-gray-500">{e.employeeId || '—'}</td>
                                                        <td className="py-3 px-4 text-gray-500">{e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : '—'}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={clsx(
                                                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                                e.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                            )}>
                                                                {e.isActive !== false ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
