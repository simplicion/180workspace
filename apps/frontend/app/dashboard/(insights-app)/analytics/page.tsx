'use client';


import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Users, FolderKanban, CheckSquare, Loader2, DollarSign, ArrowUpRight, ArrowDownRight, PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.color }}>
                    {p.name}: <span className="font-bold">{p.dataKey?.toLowerCase().includes('total') || p.dataKey?.toLowerCase().includes('revenue') || p.dataKey?.toLowerCase().includes('net') ? `₹${p.value.toLocaleString()}` : p.value}</span>
                </p>
            ))}
        </div>
    );
};

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<'org' | 'fin'>('org');
    const [stats, setStats] = useState<any>(null);
    const [taskStats, setTaskStats] = useState<any[]>([]);
    const [deptStats, setDeptStats] = useState<any[]>([]);
    const [projectStats, setProjectStats] = useState<any[]>([]);
    const [salaryStats, setSalaryStats] = useState<any[]>([]);

    // Financial Data
    const [finSummary, setFinSummary] = useState<any>(null);
    const [projProfitability, setProjProfitability] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get('/api/hrms/dashboard'),
            api.get('/api/tasks', { params: { limit: 200 } }),
            api.get('/api/users', { params: { limit: 200 } }),
            api.get('/api/projects', { params: { limit: 100 } }),
            api.get('/api/salary', { params: { limit: 200 } }),
            api.get('/api/analytics/financial/stats'),
            api.get('/api/analytics/financial/projects'),
        ]).then(([dash, tasks, users, projects, salary, fin, finProjs]) => {
            setStats(dash.data);
            setFinSummary(fin.data);
            setProjProfitability(finProjs.data.reports || []);

            // Task status breakdown for pie chart
            const taskArr = tasks.data.tasks || [];
            const statuses: Record<string, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
            taskArr.forEach((t: any) => { if (statuses[t.status] !== undefined) statuses[t.status]++; });
            setTaskStats([
                { name: 'To Do', value: statuses.todo },
                { name: 'In Progress', value: statuses.in_progress },
                { name: 'In Review', value: statuses.in_review },
                { name: 'Done', value: statuses.done },
            ]);

            // Headcount by department
            const usersArr = users.data.users || [];
            const depts: Record<string, number> = {};
            usersArr.forEach((u: any) => { if (u.department) depts[u.department] = (depts[u.department] || 0) + 1; });
            setDeptStats(Object.entries(depts).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count));

            // Project status breakdown
            const projArr = projects.data.projects || [];
            const projStatus: Record<string, number> = {};
            projArr.forEach((p: any) => { projStatus[p.status] = (projStatus[p.status] || 0) + 1; });
            setProjectStats(Object.entries(projStatus).map(([name, value]) => ({ name, value })));

            // Monthly payroll trend (last 6 months)
            const salArr = salary.data.salaries || [];
            const monthMap: Record<string, number> = {};
            salArr.forEach((s: any) => { if (s.month) monthMap[s.month] = (monthMap[s.month] || 0) + (s.netSalary || 0); });
            const months = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
            setSalaryStats(months.map(([month, total]) => ({ month: month.slice(0, 7), total })));
        }).finally(() => setLoading(false));
    }, []);

    const KPI = activeTab === 'org' ? [
        {
            label: 'Project Completion Rate',
            value: stats ? `${Math.round((stats.projects?.active || 0) / Math.max(stats.projects?.total || 1, 1) * 100)}%` : '—',
            icon: FolderKanban, color: 'text-indigo-600', bg: 'bg-indigo-50',
            sub: `${stats?.projects?.active ?? '—'} active of ${stats?.projects?.total ?? '—'} total`,
        },
        {
            label: 'Task Completion Rate',
            value: stats ? `${Math.round((stats.tasks?.total - stats.tasks?.pending) / Math.max(stats.tasks?.total || 1, 1) * 100)}%` : '—',
            icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50',
            sub: `${(stats?.tasks?.total || 0) - (stats?.tasks?.pending || 0)} completed`,
        },
        {
            label: 'Attendance Rate Today',
            value: stats ? `${stats.attendance?.rate ?? 0}%` : '—',
            icon: Users, color: 'text-blue-600', bg: 'bg-blue-50',
            sub: `${stats?.attendance?.today ?? '—'} present today`,
        },
        {
            label: 'Total Workforce',
            value: stats?.employees?.total ?? '—',
            icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50',
            sub: `${stats?.employees?.active ?? '—'} active`,
        },
    ] : [
        {
            label: 'Total Revenue',
            value: finSummary ? `₹${(finSummary.summary?.totalRevenue || 0).toLocaleString()}` : '—',
            icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50',
            sub: 'Last 30 days',
        },
        {
            label: 'Total Expenses',
            value: finSummary ? `₹${(finSummary.summary?.totalExpenses || 0).toLocaleString()}` : '—',
            icon: ArrowDownRight, color: 'text-rose-600', bg: 'bg-rose-50',
            sub: 'Includes Payroll',
        },
        {
            label: 'Net Profit',
            value: finSummary ? `₹${(finSummary.summary?.netProfit || 0).toLocaleString()}` : '—',
            icon: ArrowUpRight, color: 'text-indigo-600', bg: 'bg-indigo-50',
            sub: `${Math.round(finSummary?.summary?.margin || 0)}% Operating Margin`,
        },
        {
            label: 'Cash Position',
            value: finSummary ? `₹${(finSummary.forecast?.netPosition || 0).toLocaleString()}` : '—',
            icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50',
            sub: 'Projected Net Flow',
        },
    ];

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="page-title">Analytics</h1>
                    <p className="page-subtitle">Real-time performance metrics across your organization</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl self-start">
                    <button
                        onClick={() => setActiveTab('org')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'org' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Organization
                    </button>
                    <button
                        onClick={() => setActiveTab('fin')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'fin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Financials
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {KPI.map((k) => {
                    const Icon = k.icon;
                    return (
                        <div key={k.label} className="card p-5">
                            <div className={`inline-flex w-10 h-10 rounded-xl items-center justify-center mb-3 ${k.bg}`}>
                                <Icon className={`w-5 h-5 ${k.color}`} />
                            </div>
                            {loading
                                ? <Loader2 className="w-5 h-5 animate-spin text-gray-300 mb-1" />
                                : <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                            }
                            <p className="text-sm font-medium text-gray-600">{k.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                        </div>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : activeTab === 'org' ? (
                <>
                    {/* Charts row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        {/* Payroll trend */}
                        <div className="card p-5 lg:col-span-2">
                            <h3 className="font-semibold text-gray-900 mb-4">Monthly Payroll (₹)</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={salaryStats}>
                                    <defs>
                                        <linearGradient id="gSalary" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                                        tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                                    <Area type="monotone" dataKey="total" name="Payroll ₹" stroke="#6366f1" strokeWidth={2} fill="url(#gSalary)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Task status distribution */}
                        <div className="card p-5">
                            <h3 className="font-semibold text-gray-900 mb-4">Task Status</h3>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={taskStats} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                                        {taskStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-1.5 mt-3">
                                {taskStats.map((item, i) => (
                                    <div key={item.name} className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                                        <span className="text-xs text-gray-500 truncate">{item.name}</span>
                                        <span className="text-xs font-bold text-gray-700 ml-auto">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Charts row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Project status */}
                        <div className="card p-5">
                            <h3 className="font-semibold text-gray-900 mb-4">Projects by Status</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={projectStats} barSize={30}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                                    <Bar dataKey="value" name="Projects" radius={[6, 6, 0, 0]}>
                                        {projectStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Headcount by department */}
                        <div className="card p-5">
                            <h3 className="font-semibold text-gray-900 mb-4">Headcount by Department</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={deptStats} layout="vertical" barSize={16}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                                    <Bar dataKey="count" name="Employees" radius={[0, 6, 6, 0]}>
                                        {deptStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    {/* Financial Summary Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="card p-5 lg:col-span-2">
                            <h3 className="font-semibold text-gray-900 mb-4">Profit & Loss Trend (₹)</h3>
                            {/* In a real scenario, we'd fetch multiple months here. For now, we show summary comparison. */}
                            <div className="h-[240px] flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">No historical data available for the selected period.</p>
                            </div>
                        </div>

                        <div className="card p-5">
                            <h3 className="font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={finSummary?.summary?.expenseBreakdown || []}
                                        cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="total" nameKey="_id"
                                    >
                                        {finSummary?.summary?.expenseBreakdown?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-4 space-y-2">
                                {finSummary?.summary?.expenseBreakdown?.map((item: any, i: number) => (
                                    <div key={item.id} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                            <span className="text-gray-600 capitalize">{item.id}</span>
                                        </div>
                                        <span className="font-bold text-gray-900">₹{item.total.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Project Profitability Table */}
                    <div className="card overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Project Profitability Ranking</h3>
                            <div className="flex gap-2 text-xs font-medium text-gray-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Profitable</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Over Budget</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Project Name</th>
                                        <th className="px-6 py-3">Budget</th>
                                        <th className="px-6 py-3">Revenue</th>
                                        <th className="px-6 py-3">Expenses</th>
                                        <th className="px-6 py-3">Net Profit</th>
                                        <th className="px-6 py-3">Margin</th>
                                        <th className="px-6 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {projProfitability.map((p: any) => (
                                        <tr key={p.projectId} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{p.projectName}</td>
                                            <td className="px-6 py-4 text-gray-600">₹{p.budget?.toLocaleString() || '0'}</td>
                                            <td className="px-6 py-4 text-emerald-600 font-medium">₹{p.revenue?.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-rose-600">₹{p.expenses?.toLocaleString()}</td>
                                            <td className={`px-6 py-4 font-bold ${p.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                ₹{p.netProfit?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                                                    <div
                                                        className={`h-1.5 rounded-full ${p.margin > 20 ? 'bg-emerald-500' : p.margin > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${Math.min(Math.max(p.margin, 0), 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-gray-400 mt-1 block">{Math.round(p.margin)}% Margin</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {p.isOverBudget ? (
                                                    <span className="badge badge-rose">Over Budget</span>
                                                ) : (
                                                    <span className="badge badge-emerald">On Track</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {projProfitability.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10 text-center text-gray-400 italic">No financial data available for projects</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
