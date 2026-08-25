'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { Users, MousePointer2, Clock, ArrowDownRight, Globe, ExternalLink, Calendar, RefreshCcw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.color }}>
                    {p.name}: <span className="font-bold">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

export default function WebsiteAnalyticsPage() {
    const [stats, setStats] = useState<any>(null);
    const [period, setPeriod] = useState('30d');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/api/analytics/plausible', {
                params: { period }
            });
            setStats(data);
        } catch (e: any) {
            console.error('Failed to fetch stats:', e);
            setError(e.response?.data?.error || 'Failed to fetch analytics. Please check your Plausible configuration in Settings.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [period]);

    if (error) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Analytics Error</h2>
                    <p className="text-gray-500 mt-2">{error}</p>
                    <button
                        onClick={() => window.location.href = '/settings?tab=integrations'}
                        className="btn-primary mt-6 inline-flex items-center gap-2"
                    >
                        Check Settings
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    const aggregate = stats?.aggregate || {};

    const KPI = [
        {
            label: 'Unique Visitors',
            value: aggregate.visitors?.value || 0,
            change: aggregate.visitors?.change || 0,
            icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50',
        },
        {
            label: 'Total Pageviews',
            value: aggregate.pageviews?.value || 0,
            change: aggregate.pageviews?.change || 0,
            icon: MousePointer2, color: 'text-blue-600', bg: 'bg-blue-50',
        },
        {
            label: 'Bounce Rate',
            value: aggregate.bounce_rate?.value ? `${aggregate.bounce_rate.value}%` : '0%',
            change: aggregate.bounce_rate?.change || 0,
            icon: ArrowDownRight, color: 'text-emerald-600', bg: 'bg-emerald-50',
            inverse: true // Lower is better for bounce rate
        },
        {
            label: 'Visit Duration',
            value: aggregate.visit_duration?.value ? `${Math.floor(aggregate.visit_duration.value / 60)}m ${aggregate.visit_duration.value % 60}s` : '0s',
            change: aggregate.visit_duration?.change || 0,
            icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="page-header !mb-0">
                    <h1 className="page-title flex items-center gap-2">
                        <Globe className="w-6 h-6 text-indigo-600" />
                        Website Analytics
                    </h1>
                    <p className="page-subtitle">Track your platform&apos;s traffic and user behavior via Plausible</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-gray-100 p-1 rounded-xl shadow-sm">
                        {[
                            { id: '7d', label: '7 Days' },
                            { id: '30d', label: '30 Days' },
                            { id: '6mo', label: '6 Months' },
                            { id: '12mo', label: 'Year' },
                        ].map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={clsx(
                                    "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                                    period === p.id
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                        : "text-gray-500 hover:bg-gray-50"
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all text-gray-500 shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCcw className={clsx("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    {stats?.siteId && (
                        <a
                            href={`https://plausible.io/${stats.siteId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all shadow-sm"
                            title="Open Plausible Dashboard"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {KPI.map((k) => {
                    const Icon = k.icon;
                    const isPositive = k.change > 0;
                    const isGood = k.inverse ? !isPositive : isPositive;

                    return (
                        <div key={k.label} className="card p-5 relative overflow-hidden group">
                            <div className={`inline-flex w-10 h-10 rounded-xl items-center justify-center mb-3 ${k.bg} transition-transform group-hover:scale-110 duration-300`}>
                                <Icon className={`w-5 h-5 ${k.color}`} />
                            </div>

                            {loading ? (
                                <LogoLoader className="w-6 h-6 animate-spin text-gray-300 mb-2" />
                            ) : (
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{k.value}</h3>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{k.label}</p>
                                        <div className={clsx(
                                            "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                            k.change === 0 ? "bg-gray-100 text-gray-500" :
                                                isGood ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {k.change !== 0 && (isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />)}
                                            {Math.abs(k.change)}%
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Traffic Chart */}
                <div className="card p-6 lg:col-span-2 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                            Visit Statistics
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Visitors
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[300px]">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50/50 rounded-2xl animate-pulse">
                                <LogoLoader className="w-8 h-8 animate-spin text-indigo-200" />
                            </div>
                        ) : stats?.timeseries ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.timeseries}>
                                    <defs>
                                        <linearGradient id="gTraffic" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        tickFormatter={(str) => {
                                            const d = new Date(str);
                                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    />
                                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                                    <Area
                                        type="monotone"
                                        dataKey="visitors"
                                        name="Visitors"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fill="url(#gTraffic)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm italic">
                                No timeseries data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Data: Top Sources */}
                <div className="space-y-6">
                    <div className="card p-6 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <RefreshCcw className="w-4 h-4 text-emerald-600" />
                            Traffic Sources
                        </h3>

                        <div className="space-y-4">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex items-center gap-3 animate-pulse">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-gray-100 rounded-full w-24" />
                                            <div className="h-2 bg-gray-50 rounded-full w-full" />
                                        </div>
                                    </div>
                                ))
                            ) : stats?.topSources?.length > 0 ? (
                                stats.topSources.map((s: any, i: number) => (
                                    <div key={s.source} className="space-y-1.5 group">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-gray-700">{s.source}</span>
                                            <span className="font-bold text-indigo-600">{s.visitors}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000 group-hover:bg-indigo-600"
                                                style={{ width: `${(s.visitors / (stats?.aggregate?.visitors?.value || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-8 text-gray-400 text-sm italic">No sources detected</p>
                            )}
                        </div>
                    </div>

                    <div className="card p-6 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <MousePointer2 className="w-4 h-4 text-blue-600" />
                            Top Pages
                        </h3>

                        <div className="space-y-3">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                                ))
                            ) : stats?.topPages?.length > 0 ? (
                                stats.topPages.map((p: any, i: number) => (
                                    <div key={p.page} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-gray-800 truncate">{p.page}</p>
                                        </div>
                                        <div className="ml-4 flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                {p.visitors} visits
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-8 text-gray-400 text-sm italic">No pages tracked</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
