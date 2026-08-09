'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
    Target, Magnet, PieChart as PieChartIcon, TrendingUp, AlertTriangle, FileText, CheckCircle2, ChevronRight,
    Calendar, BrainCircuit, Activity, BarChart3, ShieldAlert
} from 'lucide-react';
import { Skeleton,  SkeletonStatsCard, SkeletonChart  } from "@workspace/ui";
import Link from 'next/link';
import clsx from 'clsx';
import nextDynamic from 'next/dynamic';

const SalesTrendAreaChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/SalesTrendAreaChart'), { ssr: false, loading: () => <SkeletonChart /> });
const SalesPipelinePieChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/SalesPipelinePieChart'), { ssr: false, loading: () => <SkeletonChart /> });
const SalesRevenueBarChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/SalesRevenueBarChart'), { ssr: false, loading: () => <SkeletonChart /> });

interface SalesDashboardStats {
    metrics: {
        totalLeads: number;
        activeOpportunities: number;
        totalAccounts: number;
        openPipelineValue: number;
        weightedPipelineValue: number;
        wonRevenue: number;
    };
    forecast: {
        currentMonth: any;
    };
    recentActivities: any[];
    anomalies: any[];
    recommendations: any[];
    charts?: {
        trendData: any[];
        pipelineByStage: any[];
        revenueByRep: any[];
    };
    funnel: {
        leadConversionRate: number;
        proposalConversionRate: number;
        dealWinRate: number;
    };
}

export default function SalesDashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/api/sales/dashboard')
            .then((dashRes) => {
                setData(dashRes.data);
            })
            .catch(() => setError('Failed to load Sales Dashboard stats'))
            .finally(() => setLoading(false));
    }, []);

    const metrics = data?.metrics;

    const statCards = [
        { key: 'leads', label: 'Total Leads', value: metrics?.totalLeads || 0, icon: Target, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
        { key: 'opportunities', label: 'Active Opportunities', value: metrics?.activeOpportunities || 0, icon: Magnet, bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
        { key: 'pipeline', label: 'Open Pipeline', value: `$${(metrics?.openPipelineValue || 0).toLocaleString()}`, icon: PieChartIcon, bg: 'bg-purple-50', iconColor: 'text-purple-600' },
        { key: 'weighted', label: 'Weighted Forecast', value: `$${(metrics?.weightedPipelineValue || 0).toLocaleString()}`, icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    ];

    const chartData = data?.charts?.trendData || [];
    const pipelineData = data?.charts?.pipelineByStage || [];
    const repData = data?.charts?.revenueByRep || [];
    const COLORS = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#f87171'];

    return (
        <div>
            <div className="page-header flex justify-between items-start">
                <div>
                    <h1 className="page-title text-indigo-900 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                        Sales Intelligence
                    </h1>
                    <p className="page-subtitle mt-1">Algorithmic pipeline insights and revenue forecasting.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/sales/deals" className="btn-secondary">View Leads</Link>
                    <Link href="/dashboard/sales/leads-pipeline" className="btn-primary flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4" />
                        Kanban Board
                    </Link>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Top Warnings / Anomalies based on algorithmic checks */}
            {data?.anomalies && data.anomalies.length > 0 && (
                <div className="mb-6 space-y-3">
                    {data.anomalies.map((anom: any, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-orange-50 border border-orange-200">
                            <div className="flex items-center gap-3 text-orange-800">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-600" />
                                <div>
                                    <p className="text-sm font-semibold">{anom.message}</p>
                                </div>
                            </div>
                            <Link href="/dashboard/sales/leads-pipeline" className="text-sm font-medium text-orange-700 hover:text-orange-900 bg-white px-3 py-1.5 rounded-lg border border-orange-200 hover:border-orange-300 transition-colors">
                                Review Deal
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {loading ? (
                    Array(4).fill(0).map((_, i) => <SkeletonStatsCard key={i} />)
                ) : (
                    statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div key={index} className="stat-card hover:shadow-lg transition-shadow">
                                <div className={clsx("stat-icon", stat.bg, stat.iconColor)}>
                                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                    <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>


            {/* Charts & Timeline Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Forecasts & Charts */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <div className="card-header flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Pipeline vs Revenue Trend</h3>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <SkeletonChart />
                            ) : (
                                <SalesTrendAreaChart chartData={chartData} />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="font-semibold text-gray-900">Pipeline by Stage</h3>
                            </div>
                            <div className="card-body">
                                {loading ? <SkeletonChart /> : <SalesPipelinePieChart pipelineData={pipelineData} COLORS={COLORS} />}
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="font-semibold text-gray-900">Top Reps by Revenue</h3>
                            </div>
                            <div className="card-body">
                                {loading ? <SkeletonChart /> : <SalesRevenueBarChart repData={repData} />}
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-r from-indigo-50 to-white">
                        <div className="p-4 border-b border-indigo-100">
                            <h3 className="font-semibold text-indigo-900 text-sm">Funnel & Conversions</h3>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-xl font-bold text-indigo-700">{Math.round(data?.funnel?.leadConversionRate || 0)}%</p>
                                    <p className="text-[11px] text-indigo-500 font-medium">Lead to Qualified</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-indigo-700">{Math.round(data?.funnel?.proposalConversionRate || 0)}%</p>
                                    <p className="text-[11px] text-indigo-500 font-medium">Proposal to Won</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-indigo-700">{Math.round(data?.funnel?.dealWinRate || 0)}%</p>
                                    <p className="text-[11px] text-indigo-500 font-medium">Overall Deal Win Rate</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity Timeline & Next Best Actions */}
                <div className="space-y-6">

                    {/* Next Best Actions Widget */}
                    <div className="card bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                        <div className="card-header border-b-indigo-100/50 flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700">
                                <Target className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-indigo-900">Next Best Actions</h3>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="space-y-3">
                                    <Skeleton variant="rectangular" height={60} />
                                    <Skeleton variant="rectangular" height={60} />
                                </div>
                            ) : data?.recommendations?.length ? (
                                <div className="space-y-3">
                                    {data.recommendations.map((rec: any, idx) => (
                                        <div key={idx} className="card border-indigo-100 p-3 hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>
                                            <div className="pl-2">
                                                <h4 className="text-sm font-semibold text-gray-900">{rec.title}</h4>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{rec.description}</p>
    
                                                <div className="flex items-center justify-between mt-3 text-xs">
                                                    <span className="text-gray-400 font-medium whitespace-nowrap">Due: {new Date(rec.dueDate).toLocaleDateString()}</span>
                                                    <button className="text-indigo-600 font-semibold hover:underline bg-indigo-50 px-2 py-1 rounded">Action</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No pressing actions recommended right now.</p>
                            )}
                        </div>
                    </div>

                    <div className="card h-full">
                        <div className="card-header">
                            <h3 className="font-semibold text-gray-900">Recent Sales Activity</h3>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="space-y-4">
                                    <Skeleton variant="text" height={40} />
                                    <Skeleton variant="text" height={40} />
                                    <Skeleton variant="text" height={40} />
                                </div>
                            ) : data?.recentActivities?.length ? (
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                    {data.recentActivities.map((activity, idx) => (
                                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-100 text-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                {activity.type === 'call' ? <FileText className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                                                <div className="flex items-center justify-between space-x-2 mb-1">
                                                    <div className="font-semibold text-sm text-gray-900 truncate">{activity.subject || activity.type}</div>
                                                    <time className="text-xs text-gray-400 font-medium">
                                                        {new Date(activity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </time>
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">{activity.notes || 'Activity completed'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    <FileText className="w-8 h-8 opacity-20 mx-auto mb-3" />
                                    <p className="text-sm">No recent activities found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>


        </div>
    );
}

