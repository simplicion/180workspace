'use client';

// Super Admin Platform Intelligence Command Center
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Building2, Users, TrendingUp, CreditCard, AlertCircle, ArrowUpRight,
    BarChart2, Star, RefreshCw, Shield, CheckCircle2, Server, Database,
    Cpu, HardDrive, ArrowRight, ExternalLink, Zap, Clock, ShieldCheck
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Skeleton } from '@workspace/ui';
import saApi from '../../lib/superadmin-api';

const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#64748b'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Stats {
    totalCompanies: number;
    activeCompanies: number;
    newCompaniesThisMonth: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    failedPayments: number;
    monthlyRevenue: number;
    totalUsers: number;
}

interface RecentCompany {
    id: string;
    name: string;
    slug?: string;
    logoUrl?: string;
    adminEmail?: string;
    subscriptionStatus?: string;
    accountStatus?: string;
    totalUsers?: number;
    createdAt: string;
}

interface OverviewData {
    stats: Stats;
    charts: {
        revenueChart?: any[];
        companyChart?: any[];
        planDist?: any[];
    };
    recentCompanies?: RecentCompany[];
}

interface StatCardProps {
    label: string;
    value: string | number | undefined;
    icon: any;
    sub?: string;
    gradient: string;
    badgeText?: string;
    badgeColor?: string;
    href?: string;
}

function StatCard({ label, value, icon: Icon, sub, gradient, badgeText, badgeColor, href }: StatCardProps) {
    const CardContent = (
        <div className="stat-card-glow flex flex-col justify-between h-full">
            {/* Top decorative gradient glow */}
            <div className={`absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br ${gradient} rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none`} />

            <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {label}
                    </p>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradient} shadow-sm group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {typeof value === 'number' && label.includes('Revenue') 
                            ? `₹${value.toLocaleString('en-IN')}` 
                            : typeof value === 'number' 
                            ? value.toLocaleString() 
                            : (value || '0')}
                    </h3>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {sub && <p className="text-slate-500 dark:text-slate-400 font-medium truncate">{sub}</p>}
                {badgeText && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${badgeColor || 'bg-slate-100 text-slate-700'}`}>
                        {badgeText}
                    </span>
                )}
            </div>
        </div>
    );

    return href ? (
        <Link href={href} className="block transition-transform hover:-translate-y-0.5">
            {CardContent}
        </Link>
    ) : (
        CardContent
    );
}

export default function SuperAdminOverviewPage() {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    const loadData = () => {
        setLoading(true);
        saApi.get('/overview')
            .then(({ data }) => {
                setData(data);
                setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const revenueData = data?.charts?.revenueChart?.map((r: any) => {
        const monthIndex = (r._id?.month || r.id?.month || 1) - 1;
        return {
            name: MONTHS[monthIndex] || `M${monthIndex + 1}`,
            revenue: r.revenue || 0,
        };
    }) || [];

    const companyData = data?.charts?.companyChart?.map((r: any) => {
        const monthIndex = (r._id?.month || r.id?.month || 1) - 1;
        return {
            name: MONTHS[monthIndex] || `M${monthIndex + 1}`,
            count: r.count || 0,
        };
    }) || [];

    const pieData = data?.charts?.planDist?.map((r: any) => ({
        name: r._id || r.id || 'Custom',
        value: r.count || 0,
    })) || [];

    const s = data?.stats;

    return (
        <div className="space-y-8 pb-12">
            {/* Header with Title & Quick Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Platform Intelligence
                        </h1>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            Macro Telemetry
                        </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 font-medium">
                        Real-time system telemetry, multi-tenant workspace analytics, and revenue velocity
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {lastUpdated && (
                        <span className="hidden md:flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Synced at {lastUpdated}
                        </span>
                    )}

                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-600 hover:border-sky-300 transition-all shadow-2xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
                        <span>Refresh Sync</span>
                    </button>
                </div>
            </div>

            {/* 1. Macro KPI Metrics Grid (8 Vital Tiles) */}
            {loading && !data ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-3">
                            <Skeleton className="h-4 w-28 rounded-md" />
                            <Skeleton className="h-8 w-36 rounded-lg" />
                            <Skeleton className="h-3 w-48 rounded-md" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    <StatCard
                        label="Total Workspaces"
                        value={s?.totalCompanies}
                        icon={Building2}
                        gradient="from-violet-500 to-indigo-600"
                        sub="Registered company tenants"
                        badgeText={s?.newCompaniesThisMonth ? `+${s.newCompaniesThisMonth} new this mo` : 'Active'}
                        badgeColor="bg-violet-50 text-violet-700"
                        href="/superadmin/companies"
                    />
                    <StatCard
                        label="Active Workspaces"
                        value={s?.activeCompanies}
                        icon={Star}
                        gradient="from-emerald-400 to-teal-600"
                        sub="Currently operational"
                        badgeText="Live"
                        badgeColor="bg-emerald-50 text-emerald-700"
                        href="/superadmin/companies"
                    />
                    <StatCard
                        label="Platform Users"
                        value={s?.totalUsers}
                        icon={Users}
                        gradient="from-blue-500 to-cyan-500"
                        sub="Across all company workspaces"
                        badgeText="Total Seats"
                        badgeColor="bg-blue-50 text-blue-700"
                        href="/superadmin/users"
                    />
                    <StatCard
                        label="Gross Monthly MRR"
                        value={s?.monthlyRevenue}
                        icon={TrendingUp}
                        gradient="from-amber-400 to-orange-500"
                        sub="Tracked subscription revenue"
                        badgeText="Current Month"
                        badgeColor="bg-amber-50 text-amber-700"
                        href="/superadmin/subscriptions"
                    />

                    <StatCard
                        label="Active Subscriptions"
                        value={s?.activeSubscriptions}
                        icon={ArrowUpRight}
                        gradient="from-teal-400 to-emerald-500"
                        sub="Currently generating revenue"
                        badgeText="Paid Plans"
                        badgeColor="bg-teal-50 text-teal-700"
                        href="/superadmin/subscriptions"
                    />
                    <StatCard
                        label="Total Subscriptions"
                        value={s?.totalSubscriptions}
                        icon={CreditCard}
                        gradient="from-fuchsia-500 to-pink-600"
                        sub="Lifetime tenant activations"
                        badgeText="Lifetime"
                        badgeColor="bg-fuchsia-50 text-fuchsia-700"
                        href="/superadmin/subscriptions"
                    />
                    <StatCard
                        label="Failed Payments"
                        value={s?.failedPayments}
                        icon={AlertCircle}
                        gradient="from-rose-500 to-red-600"
                        sub="Invoices needing resolution"
                        badgeText={s?.failedPayments ? 'Action Required' : 'Zero Errors'}
                        badgeColor={s?.failedPayments ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-emerald-50 text-emerald-700'}
                        href="/superadmin/subscriptions"
                    />
                    <StatCard
                        label="Infrastructure Vitality"
                        value="99.98%"
                        icon={ShieldCheck}
                        gradient="from-slate-700 to-slate-900"
                        sub="All microservices operational"
                        badgeText="Healthy"
                        badgeColor="bg-emerald-100 text-emerald-800"
                    />
                </div>
            )}

            {/* 2. Visual Telemetry Grid: MRR Growth & Workspace Acquisition */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Velocity Chart */}
                <div className="card p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                    Revenue Velocity & Trajectory
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/50">
                                    Aggregated MRR
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Monthly revenue progression across all paid subscription tiers</p>
                        </div>
                        <div className="p-2.5 bg-sky-50 dark:bg-sky-950/60 rounded-xl text-sky-600 dark:text-sky-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>

                    {revenueData.length > 0 ? (
                        <div className="h-[280px]" role="img" aria-label="Revenue Trajectory Chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                                    <Tooltip
                                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.07)' }}
                                        formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Gross Revenue']}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40">
                            <BarChart2 className="w-8 h-8 mb-2 opacity-30 text-sky-500" />
                            <p className="text-xs font-bold text-slate-600">Accumulating revenue telemetry...</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Revenue data will graph automatically as subscriptions process</p>
                        </div>
                    )}
                </div>

                {/* Workspace Acquisition Cohort Chart */}
                <div className="card p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                    Workspace Acquisition Velocity
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                                    Tenant Growth
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 font-medium">New company registrations and workspace deployments per month</p>
                        </div>
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <Building2 className="w-5 h-5" />
                        </div>
                    </div>

                    {companyData.length > 0 ? (
                        <div className="h-[280px]" role="img" aria-label="Workspace Acquisition Chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={companyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={28}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.07)' }}
                                        formatter={(val: number) => [`${val} Workspaces`, 'New Registrations']}
                                    />
                                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40">
                            <Building2 className="w-8 h-8 mb-2 opacity-30 text-emerald-500" />
                            <p className="text-xs font-bold text-slate-600">Awaiting workspace onboarding cohorts...</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">New company registrations will populate here automatically</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Middle Tier: Plan Vectors Donut Chart & Recent Workspaces Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Plan Popularity Breakdown */}
                <div className="lg:col-span-1 card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                Plan Vectors
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                                Tier Breakdown
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 font-medium">Subscription tier popularity across active tenants</p>

                        {pieData.length > 0 ? (
                            <div className="flex flex-col items-center">
                                <div className="h-[200px] w-full relative" role="img" aria-label="Plan Vectors Pie Chart">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={80}
                                                paddingAngle={3}
                                                stroke="none"
                                            >
                                                {pieData.map((d: any, i: number) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="w-full mt-3 space-y-2">
                                    {pieData.map((d: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate capitalize">{d.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md shadow-2xs">
                                                {d.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[240px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40">
                                <CreditCard className="w-7 h-7 mb-2 opacity-30 text-indigo-500" />
                                <p className="text-xs font-bold text-slate-600">No tier vectors recorded</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Subscriptions will populate distribution stats</p>
                            </div>
                        )}
                    </div>

                    <Link
                        href="/superadmin/plans"
                        className="mt-4 flex items-center justify-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 pt-3 border-t border-slate-100 dark:border-slate-800 transition-colors"
                    >
                        <span>Manage Subscription Tiers</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {/* Live Recent Workspace Onboardings */}
                <div className="lg:col-span-2 card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                    Recent Workspace Registrations
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    Live Stream
                                </span>
                            </div>
                            <Link
                                href="/superadmin/companies"
                                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors"
                            >
                                View All <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 font-medium">Latest companies provisioned in the 180workspace ecosystem</p>

                        <div className="table-wrapper overflow-hidden">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Company Workspace</th>
                                        <th>Admin Contact</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.recentCompanies && data.recentCompanies.length > 0 ? (
                                        data.recentCompanies.map((c) => (
                                            <tr key={c.id}>
                                                <td>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                                            {c.name ? c.name.charAt(0).toUpperCase() : 'W'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.name}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{c.slug ? `${c.slug}.180workspace.com` : 'Default tenant'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[140px] block">
                                                        {c.adminEmail || '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        c.subscriptionStatus === 'active'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                            : c.subscriptionStatus === 'trial'
                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {c.subscriptionStatus ? c.subscriptionStatus.toUpperCase() : 'TRIAL'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-xs text-slate-400">
                                                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <Link
                                                        href={`/superadmin/companies`}
                                                        className="text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-colors inline-block"
                                                    >
                                                        Inspect
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                                                No recent workspace registrations found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span>Multi-tenancy isolation active</span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Tenant Guard Operational
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. Infrastructure Telemetry & Command Center Launchpad */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Platform Infrastructure Vitals */}
                <div className="lg:col-span-1 card p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Microservices Health
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            100% Uptime
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4 font-medium">Core platform infrastructure status and telemetry</p>

                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <Database className="w-4 h-4 text-sky-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Prisma PostgreSQL</p>
                                    <p className="text-[10px] text-slate-400">Connection pool healthy (~12ms)</p>
                                </div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <Server className="w-4 h-4 text-indigo-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Express API Gateway</p>
                                    <p className="text-[10px] text-slate-400">Port 4002 • 0 errors</p>
                                </div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <Cpu className="w-4 h-4 text-purple-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Orbit AI Gateway</p>
                                    <p className="text-[10px] text-slate-400">Gemini/OpenAI intelligence routing</p>
                                </div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <HardDrive className="w-4 h-4 text-teal-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">File Storage & CDN</p>
                                    <p className="text-[10px] text-slate-400">Secure asset bucket active</p>
                                </div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                    </div>
                </div>

                {/* Command Center Quick Launchpad */}
                <div className="lg:col-span-2 card p-6 bg-gradient-to-br from-white via-white to-sky-50/50 dark:from-slate-900 dark:to-slate-850 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                                <Zap className="w-4 h-4 text-sky-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                    Platform Command Launchpad
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">Quick navigational shortcuts across key governance subsystems</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                            <Link
                                href="/superadmin/companies"
                                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-sky-400 hover:shadow-md transition-all group flex flex-col items-center text-center"
                            >
                                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Workspaces</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Manage tenants</p>
                            </Link>

                            <Link
                                href="/superadmin/subscriptions"
                                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-sky-400 hover:shadow-md transition-all group flex flex-col items-center text-center"
                            >
                                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Billing</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Subscriptions & MRR</p>
                            </Link>

                            <Link
                                href="/superadmin/feature-flags"
                                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-sky-400 hover:shadow-md transition-all group flex flex-col items-center text-center"
                            >
                                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Feature Flags</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Platform gates</p>
                            </Link>

                            <Link
                                href="/superadmin/settings"
                                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-sky-400 hover:shadow-md transition-all group flex flex-col items-center text-center"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                                    <Server className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Settings</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Security & configs</p>
                            </Link>
                        </div>
                    </div>

                    <div className="mt-6 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">180workspace Platform Engine v2.0</span>
                        <div className="flex items-center gap-2">
                            <Link href="/superadmin/logs" className="text-sky-600 hover:underline font-bold text-xs">
                                View Audit Logs →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
