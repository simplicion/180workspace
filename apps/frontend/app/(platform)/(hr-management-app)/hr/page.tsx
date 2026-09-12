'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic_import from 'next/dynamic';
import api from '@/lib/api';
import {
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    Plus,
    FileText,
    Users,
    TrendingUp,
    Wallet,
    Calendar,
    Search,
    ChevronRight,
    ArrowUpRight,
    CheckCircle,
    Building2,
    Briefcase,
    Loader2,
    Mail,
    Link2,
    Share2,
    Check
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import CustomSelect from '@/components/ui/CustomSelect';
import { LogoLoader } from '@workspace/ui';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend
} from 'recharts';

// Lazy load drawers
const PayslipDrawer = dynamic_import(() => import('@/app/(platform)/(hr-management-app)/_components/PayslipDrawer'), {
    loading: () => (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <LogoLoader className="w-8 h-8 animate-spin text-white" />
        </div>
    ),
    ssr: false
});

const ReviewSalaryDrawer = dynamic_import(() => import('@/app/(platform)/(hr-management-app)/_components/ReviewSalaryDrawer'), {
    ssr: false
});

const GeneratePayrollDrawer = dynamic_import(() => import('@/app/(platform)/(hr-management-app)/_components/GeneratePayrollDrawer'), {
    ssr: false
});

const STATUS_CONFIG: Record<string, { cls: string; label: string; icon: any }> = {
    pending: { cls: 'badge-orange', label: 'Pending', icon: Clock },
    hr_approved: { cls: 'badge-blue', label: 'HR Approved', icon: CheckCircle2 },
    approved: { cls: 'badge-blue', label: 'Approved', icon: CheckCircle2 },
    paid: { cls: 'badge-green', label: 'Paid', icon: CheckCircle },
    rejected: { cls: 'badge-red', label: 'Rejected', icon: AlertCircle },
};

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function HRPage() {
    const [salaries, setSalaries] = useState<any[]>([]);
    const [allHistoricalSalaries, setAllHistoricalSalaries] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const monthStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;

    const [showGenerate, setShowGenerate] = useState(false);
    const [payslipSalary, setPayslipSalary] = useState<any>(null);
    const [reviewSalary, setReviewSalary] = useState<any>(null);
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '₹';

    const canManageHR = ['admin', 'ceo', 'super_admin'].includes(user?.role || '') || (user?.permissions && user.permissions.includes('can_manage_hr'));

    // Load salaries for selected month & all employees
    function loadData() {
        setLoading(true);

        const currentMonthSalariesPromise = api.get('/api/salary', { params: { month: monthStr } })
            .then(({ data }) => setSalaries(data.salaries || []))
            .catch(() => setSalaries([]));

        const allSalariesPromise = api.get('/api/salary')
            .then(({ data }) => setAllHistoricalSalaries(data.salaries || []))
            .catch(() => setAllHistoricalSalaries([]));

        const employeesPromise = api.get('/api/users')
            .then(({ data }) => setEmployees(data.users || []))
            .catch(() => setEmployees([]));

        Promise.allSettled([currentMonthSalariesPromise, allSalariesPromise, employeesPromise])
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
    }, [monthStr]);

    // Handle marking salary as paid directly from table & syncing with Financial Expenses
    async function handleMarkPaid(id: string) {
        setMarkingPaidId(id);
        try {
            const { data } = await api.put(`/api/salary/${id}/mark-paid`);
            toast.success('Salary marked as Paid & registered in Financial Expenses!', { duration: 4000 });
            setSalaries(prev => prev.map(s => s.id === id ? { ...s, status: 'paid', paidAt: new Date() } : s));
            setAllHistoricalSalaries(prev => prev.map(s => s.id === id ? { ...s, status: 'paid', paidAt: new Date() } : s));
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to mark salary as paid');
        } finally {
            setMarkingPaidId(null);
        }
    }

    // Direct email dispatch from table
    async function handleSendEmail(s: any) {
        const emp = s.employee || s.employeeId;
        if (!emp?.email) {
            toast.error(`No email address on profile for ${emp?.name || 'employee'}. You can copy the sharable link instead.`);
            return;
        }

        setSendingEmailId(s.id);
        try {
            const { data } = await api.post(`/api/salary/${s.id}/send-email`);
            toast.success(data?.message || `Payslip emailed to ${emp.email}!`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to send payslip email');
        } finally {
            setSendingEmailId(null);
        }
    }

    // Direct copy sharable link from table
    function handleCopyPayslipLink(s: any) {
        const url = typeof window !== 'undefined' ? `${window.location.origin}/payslip/${s.id}` : `/payslip/${s.id}`;
        navigator.clipboard.writeText(url);
        setCopiedId(s.id);
        toast.success('Sharable payslip link copied!');
        setTimeout(() => setCopiedId(null), 2500);
    }

    // Set to current month
    const handleSetCurrentMonth = () => {
        const curDate = new Date();
        setSelectedYear(curDate.getFullYear());
        setSelectedMonth(curDate.getMonth() + 1);
    };

    // Calculate core metrics
    const totalEmployeesCount = employees.length;

    // Monthly baseline liability (from all active employee base salaries)
    const totalMonthlyContractedLiability = useMemo(() => {
        return employees.reduce((sum, emp) => {
            const sal = Number(emp.baseSalary || emp.salary || 0);
            return sum + sal;
        }, 0);
    }, [employees]);

    // Actual generated metrics for selected month
    const totalGeneratedNet = useMemo(() => {
        return salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
    }, [salaries]);

    const paidSalaries = useMemo(() => salaries.filter(s => s.status === 'paid'), [salaries]);
    const totalPaidAmount = useMemo(() => paidSalaries.reduce((sum, s) => sum + (s.netSalary || 0), 0), [paidSalaries]);
    const paidCount = paidSalaries.length;

    const pendingSalaries = useMemo(() => salaries.filter(s => s.status === 'pending' || s.status === 'hr_approved' || s.status === 'approved'), [salaries]);
    const totalPendingAmount = useMemo(() => pendingSalaries.reduce((sum, s) => sum + (s.netSalary || 0), 0), [pendingSalaries]);
    const pendingCount = pendingSalaries.length;

    const approvedCount = useMemo(() => salaries.filter(s => s.status === 'approved' || s.status === 'hr_approved').length, [salaries]);

    // Monthly effective liability: use generated net if exists, else fallback to contracted liability
    const effectiveMonthlyLiability = totalGeneratedNet > 0 ? totalGeneratedNet : totalMonthlyContractedLiability;
    const paidPercentage = effectiveMonthlyLiability > 0 ? Math.min(100, Math.round((totalPaidAmount / effectiveMonthlyLiability) * 100)) : 0;

    // Compute 6-Month Comparison Data for Employee Count vs Salary vs Last Month
    const chartData = useMemo(() => {
        const monthsData: { name: string; fullMonth: string; salary: number; lastMonthSalary: number; employees: number }[] = [];
        
        // Generate past 6 months up to selected month
        for (let i = 5; i >= 0; i--) {
            const targetDate = new Date(selectedYear, selectedMonth - 1 - i, 1);
            const y = targetDate.getFullYear();
            const m = targetDate.getMonth() + 1;
            const mKey = `${y}-${m.toString().padStart(2, '0')}`;
            const mLabel = `${MONTH_NAMES[m - 1]} '${String(y).slice(-2)}`;

            // Previous month key for benchmark comparison
            const prevTargetDate = new Date(y, m - 2, 1);
            const prevMKey = `${prevTargetDate.getFullYear()}-${(prevTargetDate.getMonth() + 1).toString().padStart(2, '0')}`;

            // Calculate month total from historical records
            const mSalaries = allHistoricalSalaries.filter(s => s.month === mKey);
            const mTotal = mSalaries.reduce((acc, s) => acc + (s.netSalary || s.baseSalary || 0), 0);

            const prevSalaries = allHistoricalSalaries.filter(s => s.month === prevMKey);
            const prevTotal = prevSalaries.reduce((acc, s) => acc + (s.netSalary || s.baseSalary || 0), 0);

            // If no records in historical for that month, provide realistic baseline projection from employee base
            const effectiveSalary = mTotal > 0 ? mTotal : (totalMonthlyContractedLiability || 120000);
            const effectiveLastMonthSalary = prevTotal > 0 ? prevTotal : Math.round(effectiveSalary * 0.96);
            const effectiveEmployees = mSalaries.length > 0 ? mSalaries.length : (totalEmployeesCount || 1);

            monthsData.push({
                name: mLabel,
                fullMonth: mKey,
                salary: effectiveSalary,
                lastMonthSalary: effectiveLastMonthSalary,
                employees: effectiveEmployees
            });
        }
        return monthsData;
    }, [allHistoricalSalaries, selectedYear, selectedMonth, totalMonthlyContractedLiability, totalEmployeesCount]);

    // Filtered salaries for display in table
    const filteredSalaries = useMemo(() => {
        return salaries.filter(s => {
            const empName = (s.employee?.name || s.employeeId?.name || '').toLowerCase();
            const empDept = (s.employee?.department || s.employeeId?.department || '').toLowerCase();
            const matchesSearch = searchQuery === '' || empName.includes(searchQuery.toLowerCase()) || empDept.includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'paid' && s.status === 'paid') ||
                (statusFilter === 'pending' && s.status === 'pending') ||
                (statusFilter === 'approved' && (s.status === 'approved' || s.status === 'hr_approved'));

            return matchesSearch && matchesStatus;
        });
    }, [salaries, searchQuery, statusFilter]);

    const getInitials = (name: string): string => {
        if (!name) return 'EM';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="space-y-6">
            {/* Drawers */}
            <GeneratePayrollDrawer
                open={showGenerate}
                onClose={() => setShowGenerate(false)}
                onSuccess={() => { setShowGenerate(false); loadData(); }}
            />
            <PayslipDrawer open={!!payslipSalary} salary={payslipSalary} onClose={() => setPayslipSalary(null)} />
            <ReviewSalaryDrawer
                open={!!reviewSalary}
                salary={reviewSalary}
                onClose={() => setReviewSalary(null)}
                onSuccess={() => { setReviewSalary(null); loadData(); }}
            />

            {/* Page Header */}
            <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-2.5">
                        <Wallet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        HR & Payroll Operations
                    </h1>
                    <p className="page-subtitle">
                        Monthly compensation liability, salary disbursements, and headcount trajectory
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    {canManageHR && (
                        <button onClick={() => setShowGenerate(true)} className="btn-primary flex items-center gap-1.5 shadow-sm">
                            <Plus className="w-4 h-4" />
                            <span>Generate Salary</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 1. Executive Metric Cards Grid (4 Core High-Value Metrics) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Employees / Workforce */}
                <div className="card p-5 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/10 border border-indigo-100/80 dark:border-indigo-900/40 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                            Total Workforce
                        </p>
                        <span className="p-2 bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl group-hover:scale-110 transition-transform">
                            <Users className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-3xl font-black text-zinc-900 dark:text-white">{totalEmployeesCount}</p>
                        <span className="text-xs font-semibold text-zinc-500">Employees</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
                        Active headcount in organization
                    </p>
                </div>

                {/* Card 2: Total Monthly Salary Liability */}
                <div className="card p-5 bg-gradient-to-br from-blue-50/60 to-cyan-50/40 dark:from-blue-950/20 dark:to-cyan-950/10 border border-blue-100/80 dark:border-blue-900/40 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            Monthly Salary Liability
                        </p>
                        <span className="p-2 bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl group-hover:scale-110 transition-transform">
                            <Wallet className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{currencySymbol}</span>
                        <p className="text-3xl font-black text-zinc-900 dark:text-white">
                            {effectiveMonthlyLiability.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium truncate">
                        {totalGeneratedNet > 0 ? `Total generated for ${monthStr}` : 'Expected baseline payroll'}
                    </p>
                </div>

                {/* Card 3: Paid This Month */}
                <div className="card p-5 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100/80 dark:border-emerald-900/40 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Paid This Month
                        </p>
                        <span className="p-2 bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{currencySymbol}</span>
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            {totalPaidAmount.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                            <span className="font-bold text-emerald-600">{paidCount}</span> of {totalEmployeesCount || salaries.length} paid
                        </p>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 rounded">
                            {paidPercentage}%
                        </span>
                    </div>
                </div>

                {/* Card 4: Pending Payouts */}
                <div className="card p-5 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-100/80 dark:border-amber-900/40 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Pending Payouts
                        </p>
                        <span className="p-2 bg-amber-100/80 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl group-hover:scale-110 transition-transform">
                            <Clock className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{currencySymbol}</span>
                        <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
                            {totalPendingAmount.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-2 font-medium">
                        <span className="font-bold text-amber-600">{pendingCount}</span> awaiting disbursement
                    </p>
                </div>
            </div>

            {/* 2. Graphical Analytics: Number of Employees vs Salary vs Last Month */}
            <div className="card p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800 gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                                Headcount Velocity vs. Monthly Salary Trajectory
                            </h2>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Comparative monthly payroll outlay vs. employee headcount trend across consecutive cycles
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-zinc-600 dark:text-zinc-400">Monthly Salary ({currencySymbol})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-indigo-500" />
                            <span className="text-zinc-600 dark:text-zinc-400">Employee Headcount</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-1 bg-amber-400 rounded-full" />
                            <span className="text-zinc-600 dark:text-zinc-400">Last Month Benchmark</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-center">
                    {/* Main Trend Chart */}
                    <div className="lg:col-span-3 h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" strokeOpacity={0.5} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
                                />
                                {/* Left YAxis: Salary */}
                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#10b981', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(v) => v >= 100000 ? `${currencySymbol}${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${currencySymbol}${(v / 1000).toFixed(0)}k` : `${currencySymbol}${v}`}
                                />
                                {/* Right YAxis: Employee Count */}
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6366f1', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(v) => `${v}p`}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-zinc-900 text-white text-xs p-3 rounded-xl shadow-xl border border-zinc-800 space-y-1.5 min-w-[170px]">
                                                    <p className="font-bold border-b border-zinc-800 pb-1 text-zinc-300">{label}</p>
                                                    <div className="flex justify-between items-center text-emerald-400">
                                                        <span>Salary Outlay:</span>
                                                        <span className="font-bold">{currencySymbol}{data.salary?.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-amber-300">
                                                        <span>Last Month:</span>
                                                        <span className="font-bold">{currencySymbol}{data.lastMonthSalary?.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-indigo-400">
                                                        <span>Headcount:</span>
                                                        <span className="font-bold">{data.employees} Employees</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="salary"
                                    name="Monthly Salary"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#salaryGradient)"
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="lastMonthSalary"
                                    name="Last Month Benchmark"
                                    stroke="#f59e0b"
                                    strokeWidth={1.5}
                                    strokeDasharray="4 4"
                                    dot={false}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="employees"
                                    name="Headcount"
                                    stroke="#6366f1"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Chart Side Insights */}
                    <div className="space-y-3 bg-zinc-50/60 dark:bg-zinc-850/60 rounded-xl p-3.5 border border-zinc-200/60 dark:border-zinc-800">
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Avg. Compensation</p>
                            <p className="text-lg font-black text-zinc-900 dark:text-white mt-0.5">
                                {currencySymbol}{Math.round(effectiveMonthlyLiability / Math.max(1, totalEmployeesCount)).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-zinc-400">per active team member</p>
                        </div>

                        <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Disbursement Progress</p>
                            <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden mt-1.5 flex">
                                <div
                                    className="bg-emerald-500 h-full transition-all duration-500"
                                    style={{ width: `${paidPercentage}%` }}
                                    title={`${paidPercentage}% Disbursed`}
                                />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 mt-1">
                                <span>{paidCount} Paid</span>
                                <span>{pendingCount} Pending</span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Payroll Coverage</p>
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                                {salaries.length} of {totalEmployeesCount} Generated
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Salary Records Filter & Operations Section */}
            <div className="space-y-4">
                {/* Control bar: Month Selector + Search + Status Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
                    {/* Left: Year & Month Filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                            <CustomSelect
                                id="monthFilter"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="input w-28 h-9 text-xs font-semibold"
                            >
                                {MONTH_NAMES.map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </CustomSelect>
                            <CustomSelect
                                id="yearFilter"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="input w-24 h-9 text-xs font-semibold"
                            >
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </CustomSelect>
                        </div>

                        <button
                            onClick={handleSetCurrentMonth}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 px-2.5 py-1.5 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/60 cursor-pointer"
                        >
                            This Month
                        </button>
                    </div>

                    {/* Right: Search & Status Filters */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search employee or dept..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input h-9 pl-8 pr-3 text-xs w-48 sm:w-56"
                            />
                        </div>

                        {/* Status Filter Buttons */}
                        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={clsx(
                                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                    statusFilter === 'all'
                                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                                )}
                            >
                                All ({salaries.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('paid')}
                                className={clsx(
                                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                    statusFilter === 'paid'
                                        ? 'bg-emerald-500 text-white shadow-xs'
                                        : 'text-zinc-500 hover:text-emerald-600'
                                )}
                            >
                                Paid ({paidCount})
                            </button>
                            <button
                                onClick={() => setStatusFilter('pending')}
                                className={clsx(
                                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                    statusFilter === 'pending'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-zinc-500 hover:text-amber-600'
                                )}
                            >
                                Pending ({pendingCount})
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4. Salary Table or Empty State */}
                {loading ? (
                    <div className="card py-16 flex flex-col items-center justify-center gap-3">
                        <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-xs font-medium text-zinc-400">Loading payroll ledger for {monthStr}...</p>
                    </div>
                ) : filteredSalaries.length === 0 ? (
                    <div className="card p-12 text-center flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3.5 shadow-xs">
                            <Wallet className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                            No Salary Records for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">
                            {searchQuery || statusFilter !== 'all'
                                ? 'No payroll records match the selected filter criteria.'
                                : `Payroll has not been generated for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}. You can generate monthly salaries for your ${totalEmployeesCount} active employees now.`}
                        </p>
                        {canManageHR && !searchQuery && statusFilter === 'all' && (
                            <button
                                onClick={() => setShowGenerate(true)}
                                className="btn-primary mt-4 flex items-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Generate Payroll for {MONTH_NAMES[selectedMonth - 1]}</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="card bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Attendance & Velocity</th>
                                        <th>Base Salary</th>
                                        <th>Deductions</th>
                                        <th>Bonuses</th>
                                        <th>Net Salary</th>
                                        <th>Status</th>
                                        {canManageHR && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSalaries.map((s) => {
                                        const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                                        const StatusIcon = cfg.icon;
                                        const empName = (s.employee || s.employeeId)?.name || 'Employee';
                                        const empDept = (s.employee || s.employeeId)?.department || 'Staff';
                                        const empEmail = (s.employee || s.employeeId)?.email;
                                        const isMarkingPaid = markingPaidId === s.id;

                                        return (
                                            <tr key={s.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/50 transition-colors">
                                                {/* Employee details */}
                                                <td>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                            {getInitials(empName)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-zinc-900 dark:text-white text-sm">{empName}</p>
                                                            <p className="text-xs text-zinc-400 capitalize">{empDept}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Attendance velocity */}
                                                <td>
                                                    {s.totalDays ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                                                <span className="text-emerald-600">{s.presentDays}P</span>
                                                                <span className="text-indigo-600">{s.paidLeaves}L</span>
                                                                <span className="text-orange-500">{s.holidayCount || 0}H</span>
                                                                <span className="text-red-500">
                                                                    {Math.max(0, (s.totalDays || 0) - (s.presentDays || 0) - (s.paidLeaves || 0) - (s.holidayCount || 0))}A
                                                                </span>
                                                            </div>
                                                            <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden flex">
                                                                <div title="Present" className="h-full bg-emerald-500" style={{ width: `${((s.presentDays || 0) / s.totalDays) * 100}%` }} />
                                                                <div title="Paid Leave" className="h-full bg-indigo-400" style={{ width: `${((s.paidLeaves || 0) / s.totalDays) * 100}%` }} />
                                                                <div title="Holidays" className="h-full bg-orange-400" style={{ width: `${(((s.holidayCount || 0)) / s.totalDays) * 100}%` }} />
                                                            </div>
                                                            <span className="text-[9px] text-zinc-400 font-medium">{s.totalDays} total days</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-zinc-400 font-medium">Standard Payroll</span>
                                                    )}
                                                </td>

                                                {/* Base Salary */}
                                                <td className="text-zinc-700 dark:text-zinc-300 font-semibold text-sm">
                                                    {currencySymbol}{s.baseSalary?.toLocaleString('en-IN')}
                                                </td>

                                                {/* Deductions */}
                                                <td className="text-rose-600 dark:text-rose-400 font-semibold text-sm">
                                                    {s.deductions > 0 ? `-${currencySymbol}${s.deductions?.toLocaleString('en-IN')}` : '—'}
                                                </td>

                                                {/* Bonuses */}
                                                <td className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                                                    {s.bonuses > 0 ? `+${currencySymbol}${s.bonuses?.toLocaleString('en-IN')}` : '—'}
                                                </td>

                                                {/* Net Salary */}
                                                <td className="font-extrabold text-zinc-900 dark:text-white text-sm border-l border-zinc-100 dark:border-zinc-800 pl-4">
                                                    {currencySymbol}{s.netSalary?.toLocaleString('en-IN')}
                                                </td>

                                                {/* Status Badge */}
                                                <td>
                                                    <span className={clsx('badge gap-1 text-xs font-bold', cfg.cls)}>
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        {cfg.label}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                {canManageHR && (
                                                    <td>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {/* Mark Paid Action Button */}
                                                            {s.status !== 'paid' && (
                                                                <button
                                                                    onClick={() => handleMarkPaid(s.id)}
                                                                    disabled={isMarkingPaid}
                                                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                                    title="Mark Salary as Paid & Record Expense in Financials"
                                                                >
                                                                    {isMarkingPaid ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                                    <span>Mark Paid</span>
                                                                </button>
                                                            )}

                                                            {/* Email Payslip Quick Action */}
                                                            <button
                                                                title={empEmail ? `Email Payslip to ${empEmail}` : 'No email on profile (use Copy Link)'}
                                                                aria-label={`Email Payslip to ${empName}`}
                                                                onClick={() => handleSendEmail(s)}
                                                                disabled={sendingEmailId === s.id}
                                                                className={clsx(
                                                                    'p-1.5 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer',
                                                                    empEmail 
                                                                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80' 
                                                                        : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 opacity-60'
                                                                )}
                                                            >
                                                                {sendingEmailId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                                                            </button>

                                                            {/* Copy Sharable Link Action */}
                                                            <button
                                                                title="Copy Sharable Payslip Link"
                                                                aria-label={`Copy Sharable Payslip Link for ${empName}`}
                                                                onClick={() => handleCopyPayslipLink(s)}
                                                                className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer border border-zinc-200/80 dark:border-zinc-700"
                                                            >
                                                                {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
                                                            </button>

                                                            {/* View Payslip Button */}
                                                            <button
                                                                title="View Payslip"
                                                                aria-label={`View Payslip for ${empName}`}
                                                                onClick={() => setPayslipSalary(s)}
                                                                className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                            >
                                                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                                                <span>Payslip</span>
                                                            </button>

                                                            {/* Review Details Button */}
                                                            {s.status === 'pending' && (
                                                                <button
                                                                    title="Review Detail"
                                                                    aria-label={`Review Salary Detail for ${empName}`}
                                                                    onClick={() => setReviewSalary(s)}
                                                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                                                >
                                                                    Review
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
