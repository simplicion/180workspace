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
    const [data, setData] = useState<SalesDashboardStats | null>(null);
    const [forecastingData, setForecastingData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            api.get('/api/sales/dashboard'),
            api.get('/api/sales/forecasting')
        ])
            .then(([dashRes, forecastRes]) => {
                setData(dashRes.data);
                setForecastingData(forecastRes.data);
            })
            .catch(() => setError('Failed to load Sales Dashboard & Forecasting stats'))
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

            {/* --- ADVANCED AI FORECASTING SECTION --- */}
            <div className="mt-8 pt-6 border-t border-gray-200 space-y-6">
                <div className="flex justify-between items-end pb-2">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                            <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
                            Advanced AI Forecasting
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Data-driven quarterly and yearly pipeline expectations backed by machine intelligence.</p>
                    </div>
                </div>

                {/* Historical Context Bar */}
                {!loading && forecastingData?.metrics && (
                    <div className="card text-sm flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-500">Historical Win Rate:</span>
                            <span className="font-bold text-gray-800">{forecastingData.metrics.historicalWinRate}%</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span className="text-gray-500">Total Closed Deals:</span>
                            <span className="font-bold text-gray-800">{forecastingData.metrics.totalClosed}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            <span className="text-gray-500">Total Historical Revenue:</span>
                            <span className="font-bold text-gray-800">${(forecastingData.metrics.wonValue || 0).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Core Pipeline Prediction */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Quarterly View */}
                    <div className="card p-5 overflow-hidden relative group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Current Quarter</h3>
                            </div>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton height="60px" />
                                <Skeleton height="60px" />
                            </div>
                        ) : (
                            <div className="space-y-3 relative z-10">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Expected Pipeline</p>
                                        <p className="text-xl font-black text-gray-900">
                                            ${(forecastingData?.quarterly?.expected || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-gray-400">Total Active</span>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">Weighted Forecast</p>
                                        <p className="text-xl font-black text-indigo-700">
                                            ${(forecastingData?.quarterly?.weighted || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-indigo-400 font-medium tracking-wide">Probability Adjusted</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Yearly View */}
                    <div className="card p-5 overflow-hidden relative group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Current Year</h3>
                            </div>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton height="60px" />
                                <Skeleton height="60px" />
                            </div>
                        ) : (
                            <div className="space-y-3 relative z-10">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Expected Pipeline</p>
                                        <p className="text-xl font-black text-gray-900">
                                            ${(forecastingData?.yearly?.expected || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-gray-400">Total Active</span>
                                    </div>
                                </div>
                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">Weighted Forecast</p>
                                        <p className="text-xl font-black text-emerald-700">
                                            ${(forecastingData?.yearly?.weighted || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-emerald-400 font-medium tracking-wide">Probability Adjusted</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Advanced Analysis Module */}
                {forecastingData?.aiForecast && (
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-1 shadow-2xl mb-8">
                        <div className="bg-white/5 rounded-[22px] p-8 h-full">
                            <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                                <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center backdrop-blur-md border border-indigo-500/30">
                                    <BrainCircuit className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">AI Prophet Analysis</h3>
                                    <p className="text-indigo-200/70 text-sm mt-1">Deep-learning derived insights based on historic run-rate and active deal dynamics.</p>
                                </div>
                                
                                <div className="ml-auto text-right">
                                    <span className="block text-xs text-indigo-300/60 uppercase tracking-widest font-bold mb-1">Confidence Score</span>
                                    <span className={clsx("text-xl font-black", forecastingData.aiForecast.confidenceScore > 75 ? "text-emerald-400" : forecastingData.aiForecast.confidenceScore > 50 ? "text-amber-400" : "text-rose-400")}>
                                        {forecastingData.aiForecast.confidenceScore}%
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Predictions */}
                                <div className="lg:col-span-1 space-y-4">
                                    <h4 className="text-sm font-bold text-white/90 uppercase tracking-wider mb-4">Predicted Outcomes</h4>
                                    
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
                                        <p className="text-sm text-indigo-300 font-medium mb-1">AI Predicted Quarter</p>
                                        <p className="text-3xl font-black text-white">${(forecastingData.aiForecast.aiPredictedQuarterlyRevenue || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
                                        <p className="text-sm text-indigo-300 font-medium mb-1">AI Predicted Year</p>
                                        <p className="text-3xl font-black text-white">${(forecastingData.aiForecast.aiPredictedYearlyRevenue || 0).toLocaleString()}</p>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex justify-between items-center backdrop-blur-sm mt-4">
                                        <span className="text-sm text-indigo-300 font-medium">Trajectory:</span>
                                        <span className={clsx(
                                            "px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider",
                                            forecastingData.aiForecast.growthTrajectory === 'Accelerating' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
                                            forecastingData.aiForecast.growthTrajectory === 'Stable' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                                            "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                        )}>
                                            {forecastingData.aiForecast.growthTrajectory}
                                        </span>
                                    </div>
                                </div>

                                {/* Intelligent Insights & Risks */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-white/90 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-emerald-400" /> Strategic Insights
                                        </h4>
                                        <ul className="space-y-3">
                                            {forecastingData.aiForecast.keyInsights?.map((insight: string, idx: number) => (
                                                <li key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4 text-indigo-100 text-sm leading-relaxed flex items-start gap-3 shadow-inner">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                                                    {insight}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-bold text-white/90 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <ShieldAlert className="w-4 h-4 text-amber-400" /> Discovered Risks
                                            </h4>
                                            <ul className="space-y-2 text-sm text-white/70">
                                                {forecastingData.aiForecast.riskFactors?.map((risk: string, idx: number) => (
                                                    <li key={idx} className="flex gap-2 items-start bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                                        <span className="text-amber-500 shrink-0">•</span> {risk}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-white/90 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-blue-400" /> Recommended Actions
                                            </h4>
                                            <ul className="space-y-2 text-sm text-white/70">
                                                {forecastingData.aiForecast.recommendedActions?.map((action: string, idx: number) => (
                                                    <li key={idx} className="flex gap-2 items-start bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                                        <span className="text-blue-500 shrink-0">→</span> {action}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

