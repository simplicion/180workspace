'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import api from '@/lib/api';
import {
    Target, Magnet, PieChart as PieChartIcon, TrendingUp, AlertTriangle, FileText, CheckCircle2, ChevronRight,
    Calendar, BrainCircuit, Activity as ActivityLucide, BarChart3, ShieldAlert
} from 'lucide-react';
import {
    MoneyRecive, TrendUp, DocumentDownload, ArrowRight2, ArchiveBook, Activity as ActivityIconsax,
    Layer, People, Cup, InfoCircle
} from 'iconsax-react';
import { Skeleton,  SkeletonStatsCard, SkeletonChart  } from "@workspace/ui";
import Link from 'next/link';
import clsx from 'clsx';
import nextDynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';

const SalesTrendAreaChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/SalesTrendAreaChart'), { ssr: false, loading: () => <SkeletonChart /> });
const SalesPipelinePieChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/SalesPipelinePieChart'), { ssr: false, loading: () => <SkeletonChart /> });
const SalesRevenueBarChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/SalesRevenueBarChart'), { ssr: false, loading: () => <SkeletonChart /> });

const RevenueTrendAreaChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueTrendAreaChart'), { ssr: false, loading: () => <SkeletonChart /> });
const RevenueDealsLineChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueDealsLineChart'), { ssr: false, loading: () => <SkeletonChart /> });
const DailyActivityLineChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/DailyActivityLineChart'), { ssr: false, loading: () => <SkeletonChart /> });
const RevenueWinLossPieChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueWinLossPieChart'), { ssr: false, loading: () => <SkeletonChart /> });

export default function SalesDashboardPage() {
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    const [data, setData] = useState<any>(null);
    const [revenueStats, setRevenueStats] = useState<any>(null);
    const [timeframe, setTimeframe] = useState('month');
    
    const [loadingSales, setLoadingSales] = useState(true);
    const [loadingRevenue, setLoadingRevenue] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoadingSales(true);
        api.get(`/api/sales/dashboard?timeframe=${timeframe}`)
            .then((dashRes) => {
                setData(dashRes.data);
            })
            .catch(() => setError('Failed to load Sales Dashboard stats'))
            .finally(() => setLoadingSales(false));
    }, [timeframe]);

    useEffect(() => {
        setLoadingRevenue(true);
        api.get(`/api/sales/revenue?timeframe=${timeframe}`)
            .then((res) => {
                setRevenueStats(res.data);
            })
            .catch(() => toast.error('Failed to load revenue metrics'))
            .finally(() => setLoadingRevenue(false));
    }, [timeframe]);

    const metrics = data?.metrics;
    const overview = revenueStats?.overview || {};

    const statCards = [
        { key: 'total_revenue', label: 'Total Revenue', value: overview.totalRevenue ? `${currencySymbol}${overview.totalRevenue.toLocaleString()}` : `${currencySymbol}0`, icon: TrendUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600', isIconsax: true },
        { key: 'leads', label: 'Total Leads', value: metrics?.totalLeads || 0, icon: Target, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
        { key: 'opportunities', label: 'Active Opportunities', value: metrics?.activeOpportunities || 0, icon: Magnet, bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
    ];

    const chartData = data?.charts?.trendData || [];
    const pipelineData = data?.charts?.pipelineByStage || [];
    const repData = data?.charts?.revenueByRep || [];
    const COLORS = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#f87171'];
    
    // Revenue specific charts
    const monthlyTrend = revenueStats?.monthlyTrend;
    const pipelineByStage = revenueStats?.pipelineByStage;
    const pipelineTrend = revenueStats?.pipelineTrend;
    const topDeals = revenueStats?.topDeals;
    const hasTrendData = monthlyTrend && monthlyTrend.length > 0;
    const hasPipelineData = pipelineByStage && pipelineByStage.length > 0;
    
    const totalDeals = (overview.wonDeals || 0) + (overview.lostDeals || 0);
    const winLossData = totalDeals > 0 ? [
        { name: 'Won', value: overview.wonDeals },
        { name: 'Lost', value: overview.lostDeals }
    ] : [];

    return (
        <div className="pb-20">
            <div className="page-header flex justify-between items-start mb-6">
                <div>
                    <h1 className="page-title text-indigo-900 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                        Sales Intelligence
                    </h1>
                    <p className="page-subtitle mt-1">Algorithmic pipeline insights and revenue forecasting.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                        <CustomSelect 
                            className="input h-10 py-0 px-3 min-w-[140px]"
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="weekly">This Week</option>
                            <option value="month">Last 30 Days</option>
                            <option value="months">Last 6 Months</option>
                            <option value="all">All Time</option>
                        </CustomSelect>
                        <button className="btn btn-secondary flex items-center gap-2 h-10">
                            <DocumentDownload size="18" variant="TwoTone" /> Export
                        </button>
                    </div>
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                        <Link href="/dashboard/sales/deals" className="btn-secondary h-10">Leads</Link>
                        <Link href="/dashboard/sales/leads-pipeline" className="btn-primary flex items-center gap-2 h-10">
                            <PieChartIcon className="w-4 h-4" />
                            Kanban
                        </Link>
                    </div>
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
                    {data.anomalies.map((anom: any, idx: number) => (
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

            {/* Combined Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {loadingSales || loadingRevenue ? (
                    Array(4).fill(0).map((_, i) => <SkeletonStatsCard key={i} />)
                ) : (
                    <>
                        {/* Block 1: Leads Pipeline */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg transition-shadow flex flex-col relative">
                            <div className="absolute top-4 right-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                <TrendUp size="14" className="mr-1" /> +12%
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-blue-50 text-blue-600">
                                    <Target className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{metrics?.totalLeads || 0}</p>
                                    <p className="text-sm text-gray-500 font-medium">Total Leads</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 py-2 px-3 rounded-xl mt-auto w-full">
                                <div className="flex flex-col items-center flex-1 border-r border-gray-200">
                                    <span className="font-bold text-gray-700 text-sm">{metrics?.pendingLeads || 0}</span>
                                    <span>Pending</span>
                                </div>
                                <div className="flex flex-col items-center flex-1">
                                    <span className="font-bold text-gray-700 text-sm">{metrics?.activeLeads || 0}</span>
                                    <span>Active</span>
                                </div>
                            </div>
                        </div>

                        {/* Block 2: Deals Pipeline */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg transition-shadow flex flex-col relative">
                            <div className="absolute top-4 right-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                <TrendUp size="14" className="mr-1" /> +8%
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-indigo-50 text-indigo-600">
                                    <Magnet className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{metrics?.totalDeals || 0}</p>
                                    <p className="text-sm text-gray-500 font-medium">Deals Pipeline</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 py-2 px-3 rounded-xl mt-auto w-full">
                                <div className="flex flex-col items-center flex-1 border-r border-gray-200">
                                    <span className="font-bold text-gray-700 text-sm">{metrics?.activeOpportunities || 0}</span>
                                    <span>In Progress</span>
                                </div>
                                <div className="flex flex-col items-center flex-1">
                                    <span className="font-bold text-gray-700 text-sm">{metrics?.completedDeals || 0}</span>
                                    <span>Completed</span>
                                </div>
                            </div>
                        </div>

                        {/* Block 3: Leads Money & Conversion */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg transition-shadow flex flex-col relative">
                            <div className="absolute top-4 right-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                <TrendUp size="14" className="mr-1" /> +5%
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-amber-50 text-amber-600">
                                    <MoneyRecive size="24" variant="TwoTone" color="currentColor" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{currencySymbol}{(metrics?.totalLeadMoney || 0).toLocaleString()}</p>
                                    <p className="text-sm text-gray-500 font-medium">Leads Money</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 py-2 px-3 rounded-xl mt-auto w-full">
                                <div className="flex flex-col items-center flex-1 border-r border-gray-200">
                                    <span className="font-bold text-gray-700 text-sm">{data?.funnel?.dealWinRate ? Math.round(data.funnel.dealWinRate) : 0}%</span>
                                    <span>Win Rate</span>
                                </div>
                                <div className="flex flex-col items-center flex-1">
                                    <span className="font-bold text-gray-700 text-sm">{currencySymbol}{(metrics?.openPipelineValue || 0).toLocaleString()}</span>
                                    <span>Expected</span>
                                </div>
                            </div>
                        </div>

                        {/* Block 4: Money in Deal Pipeline */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg transition-shadow flex flex-col relative">
                            <div className="absolute top-4 right-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                <TrendUp size="14" className="mr-1" /> +24%
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-emerald-50 text-emerald-600">
                                    <TrendUp size="24" variant="TwoTone" color="currentColor" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{currencySymbol}{(metrics?.totalPipelineValue || 0).toLocaleString()}</p>
                                    <p className="text-sm text-gray-500 font-medium">Deals Money</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 py-2 px-3 rounded-xl mt-auto w-full">
                                <div className="flex flex-col items-center flex-1 border-r border-gray-200">
                                    <span className="font-bold text-gray-700 text-sm">{currencySymbol}{(metrics?.openPipelineValue || 0).toLocaleString()}</span>
                                    <span>Progress</span>
                                </div>
                                <div className="flex flex-col items-center flex-1">
                                    <span className="font-bold text-gray-700 text-sm">{currencySymbol}{(metrics?.wonRevenue || 0).toLocaleString()}</span>
                                    <span>Won</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                
                {/* Daily Activity Trend (Full width) */}
                <div className="lg:col-span-3">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="font-semibold text-gray-900">Daily Sales Activity (Current Month)</h3>
                        </div>
                        <div className="card-body">
                            {loadingRevenue ? (
                                <SkeletonChart />
                            ) : (!revenueStats?.dailyActivityTrend || revenueStats.dailyActivityTrend.length === 0) ? (
                                <div className="w-full h-80 relative rounded-xl overflow-hidden bg-gray-50/50 flex items-center justify-center">
                                    <p className="text-gray-400 font-medium">No activity data for this month</p>
                                </div>
                            ) : (
                                <div className="w-full h-80">
                                    <DailyActivityLineChart data={revenueStats.dailyActivityTrend} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Left Column: Forecasts & Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <div className="card-header flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Pipeline vs Revenue Trend</h3>
                        </div>
                        <div className="card-body">
                            {loadingSales ? (
                                <SkeletonChart />
                            ) : (
                                <SalesTrendAreaChart chartData={chartData} currencySymbol={currencySymbol} />
                            )}
                        </div>
                    </div>


                </div>

                {/* Right Column: Top Deals */}
                <div className="space-y-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="font-semibold text-gray-900">Recent Sales Activity</h3>
                        </div>
                        <div className="card-body">
                            {loadingSales ? (
                                <div className="space-y-4">
                                    <Skeleton variant="text" height={40} />
                                    <Skeleton variant="text" height={40} />
                                    <Skeleton variant="text" height={40} />
                                </div>
                            ) : data?.recentActivities?.length ? (
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                    {data.recentActivities.map((activity: any, idx: number) => {
                                        const clientName = activity.relatedClient?.company || activity.relatedClient?.name || activity.lead?.company || activity.lead?.name || activity.deal?.companyName || 'Unknown Client';
                                        const source = activity.relatedClient?.source || activity.lead?.source || activity.deal?.source || 'Direct';
                                        const addedBy = activity.owner?.name || 'System';

                                        return (
                                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-100 text-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                {activity.type === 'call' ? <FileText className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                                                <div className="flex items-center justify-between space-x-2 mb-2">
                                                    <div className="font-semibold text-sm text-gray-900 truncate">{activity.type.toUpperCase()}</div>
                                                    <time className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                                        {new Date(activity.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </time>
                                                </div>
                                                <div className="text-xs text-gray-700 mb-2 truncate">{activity.notes || 'Activity completed'}</div>
                                                
                                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-[11px]">
                                                    <div>
                                                        <span className="block text-gray-400 mb-0.5">Added By</span>
                                                        <span className="font-medium text-gray-700 flex items-center gap-1">
                                                            <People size="12" className="text-gray-400" />
                                                            {addedBy}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-gray-400 mb-0.5">Client / Lead</span>
                                                        <span className="font-medium text-gray-700 truncate">{clientName}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="block text-gray-400 mb-0.5">Source</span>
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-indigo-700 bg-indigo-50 font-medium">
                                                            {source}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
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
