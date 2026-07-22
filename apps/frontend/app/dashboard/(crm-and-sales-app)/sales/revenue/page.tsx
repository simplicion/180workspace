'use client';


import { useState, useEffect } from 'react';
import {
    MoneyRecive, TrendUp, DocumentDownload, ArrowRight2, ArchiveBook, Activity,
    Layer, People, Calendar, Cup, InfoCircle
} from 'iconsax-react';
import { Download } from 'lucide-react';
import { SkeletonStatsCard, SkeletonChart } from '@workspace/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import nextDynamic from 'next/dynamic';

const RevenueTrendAreaChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueCharts').then(mod => mod.RevenueTrendAreaChart), { ssr: false, loading: () => <SkeletonChart /> });
const RevenueDealsLineChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueCharts').then(mod => mod.RevenueDealsLineChart), { ssr: false, loading: () => <SkeletonChart /> });
const RevenuePipelineBarChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueCharts').then(mod => mod.RevenuePipelineBarChart), { ssr: false, loading: () => <SkeletonChart /> });
const RevenueWinLossPieChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueCharts').then(mod => mod.RevenueWinLossPieChart), { ssr: false, loading: () => <SkeletonChart /> });

export default function RevenueDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [timeframe, setTimeframe] = useState('months');

    useEffect(() => {
        const fetchRevenue = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/sales/revenue?timeframe=${timeframe}`);
                setStats(res.data);
            } catch (error) {
                toast.error('Failed to load revenue metrics');
            } finally {
                setLoading(false);
            }
        };
        fetchRevenue();
    }, [timeframe]);

    if (loading) {
        return (
            <div className="space-y-6 pb-20 animate-in fade-in duration-500">
                {/* Header Skeleton */}
                <div className="page-header flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-3 w-64 bg-gray-100 rounded-md animate-pulse" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
                        <div className="h-10 w-36 bg-gray-200 rounded-xl animate-pulse" />
                    </div>
                </div>

                {/* KPI Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array(4).fill(0).map((_, i) => <SkeletonStatsCard key={i} />)}
                </div>

                {/* Charts Row Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 card p-4">
                        <div className="space-y-3 mb-4">
                            <div className="h-5 w-48 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-3 w-72 bg-gray-100 rounded-md animate-pulse" />
                        </div>
                        <SkeletonChart />
                    </div>
                    <div className="card p-4">
                        <div className="space-y-3 mb-4">
                            <div className="h-5 w-32 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-3 w-48 bg-gray-100 rounded-md animate-pulse" />
                        </div>
                        <SkeletonChart />
                    </div>
                </div>

                {/* Secondary Row Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 card p-4">
                        <div className="space-y-3 mb-4">
                            <div className="h-5 w-40 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-3 w-64 bg-gray-100 rounded-md animate-pulse" />
                        </div>
                        <SkeletonChart />
                    </div>
                    <div className="card p-4">
                        <div className="space-y-3 mb-4">
                            <div className="h-5 w-36 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-3 w-52 bg-gray-100 rounded-md animate-pulse" />
                        </div>
                        <SkeletonChart />
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const { overview, monthlyTrend, pipelineByStage, pipelineTrend, topDeals } = stats;
    
    // Win/Loss Chart Data
    const totalDeals = (overview.wonDeals || 0) + (overview.lostDeals || 0);
    const winLossData = totalDeals > 0 ? [
        { name: 'Won', value: overview.wonDeals },
        { name: 'Lost', value: overview.lostDeals }
    ] : [];

    const hasTrendData = monthlyTrend && monthlyTrend.length > 0;
    const hasPipelineData = pipelineByStage && pipelineByStage.length > 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="page-header flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                        <MoneyRecive size="28" variant="TwoTone" color="#fff" />
                    </div>
                    <div>
                        <h1 className="page-title">Revenue Analytics</h1>
                        <p className="page-subtitle">Real-time financial performance and deal tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select 
                        className="input h-10 py-0 px-3"
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                    >
                        <option value="7days">Last 7 Days</option>
                        <option value="weekly">This Week</option>
                        <option value="months">Last 6 Months</option>
                        <option value="all">All Time</option>
                    </select>
                    <button className="btn btn-secondary flex items-center gap-2">
                        <DocumentDownload size="18" variant="TwoTone" /> Export Report
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Total Revenue</p>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                ${overview.totalRevenue?.toLocaleString()}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                            <TrendUp size="20" variant="TwoTone" color="#059669" />
                        </div>
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <TrendUp size="14" variant="TwoTone" color="#059669" /> +12.5% vs last period
                    </div>
                </div>

                <div className="card p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Estimated ARR</p>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                ${(overview.arr || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                            <Activity size="20" variant="TwoTone" color="#2563eb" />
                        </div>
                    </div>
                    <div className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                        Based on total won deals
                    </div>
                </div>

                <div className="card p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Estimated MRR</p>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                ${(overview.mrr || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                            <Layer size="20" variant="TwoTone" color="#4f46e5" />
                        </div>
                    </div>
                    <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                        Simulated recurring average
                    </div>
                </div>

                <div className="card p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Open Pipeline</p>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                ${(overview.pipelineValue || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
                            <ArchiveBook size="22" variant="TwoTone" color="#d97706" />
                        </div>
                    </div>
                    <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        Potential upcoming revenue
                    </div>
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Trend Chart */}
                <div className="lg:col-span-2 card p-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Revenue Realization Trend</h2>
                            <p className="text-sm text-gray-500">Total revenue generated from won deals over time</p>
                        </div>
                    </div>
                    
                    {!hasTrendData ? (
                        <div className="w-full h-80 relative rounded-xl overflow-hidden bg-gray-50/50 flex items-center justify-center">
                            {/* Abstract Chart Background Graphic */}
                            <div className="absolute inset-0 opacity-10 flex items-end px-4 pb-4 gap-2">
                                <div className="w-1/6 bg-indigo-600 rounded-t-md h-1/4"></div>
                                <div className="w-1/6 bg-indigo-600 rounded-t-md h-2/4"></div>
                                <div className="w-1/6 bg-indigo-600 rounded-t-md h-1/3"></div>
                                <div className="w-1/6 bg-indigo-600 rounded-t-md h-3/4"></div>
                                <div className="w-1/6 bg-indigo-600 rounded-t-md h-full"></div>
                                <div className="w-1/6 bg-indigo-600 rounded-t-md h-2/3"></div>
                            </div>
                            
                            {/* Glassmorphism Foreground Card */}
                            <div className="relative z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-64 text-center">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                                    <InfoCircle size="24" variant="TwoTone" color="#6366f1" />
                                </div>
                                <p className="text-gray-900 font-bold text-sm mb-1">No Trend Data</p>
                                <p className="text-gray-500 text-xs">Close some deals to see your revenue trend.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-80">
                            <RevenueTrendAreaChart monthlyTrend={monthlyTrend} />
                        </div>
                    )}
                </div>

                {/* Deals Won Line Chart */}
                <div className="card p-4 flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-gray-900">Deals Won</h2>
                        <p className="text-sm text-gray-500">Monthly conversion volume</p>
                    </div>
                    
                    {!hasTrendData ? (
                        <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-50/50 flex items-center justify-center min-h-[320px]">
                            {/* Decorative Line Chart Graphic */}
                            <div className="absolute inset-0 opacity-10">
                                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M0 100 L 20 80 L 40 90 L 60 40 L 80 60 L 100 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" />
                                </svg>
                            </div>
                            
                            <div className="relative z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-56 text-center">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                                    <Cup size="24" variant="TwoTone" color="#10b981" />
                                </div>
                                <p className="text-gray-900 font-bold text-sm mb-1">No Deals Won</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-[250px]">
                            <RevenueDealsLineChart monthlyTrend={monthlyTrend} />
                        </div>
                    )}
                </div>

            </div>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pipeline by Stage Bar Chart */}
                <div className="lg:col-span-2 card p-4">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-gray-900">Pipeline by Stage</h2>
                        <p className="text-sm text-gray-500">Value of open opportunities in each pipeline stage</p>
                    </div>

                    {!hasPipelineData ? (
                        <div className="w-full h-72 relative rounded-xl overflow-hidden bg-gray-50/50 flex items-center justify-center">
                            <div className="absolute inset-0 opacity-10 flex flex-col justify-end p-4 gap-2">
                                <div className="w-full h-4 bg-blue-600 rounded-full"></div>
                                <div className="w-3/4 h-4 bg-blue-500 rounded-full"></div>
                                <div className="w-1/2 h-4 bg-blue-400 rounded-full"></div>
                                <div className="w-1/4 h-4 bg-blue-300 rounded-full"></div>
                            </div>
                            
                            <div className="relative z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-64 text-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                                    <Layer size="24" variant="TwoTone" color="#3b82f6" />
                                </div>
                                <p className="text-gray-900 font-bold text-sm mb-1">Empty Pipeline</p>
                                <p className="text-gray-500 text-xs">Create deals to build your pipeline.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-72">
                            <RevenuePipelineBarChart pipelineTrend={pipelineTrend} />
                        </div>
                    )}
                </div>

                {/* Win / Loss Ratio Pie Chart */}
                <div className="card p-4 flex flex-col">
                    <div className="mb-2">
                        <h2 className="text-lg font-bold text-gray-900">Win vs Loss Ratio</h2>
                        <p className="text-sm text-gray-500">Overall closing performance</p>
                    </div>

                    {winLossData.length === 0 ? (
                        <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-50/50 flex items-center justify-center mt-4 min-h-[250px]">
                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                <div className="w-32 h-32 rounded-full border-[16px] border-amber-500 border-r-emerald-500 transform rotate-45"></div>
                            </div>
                            
                            <div className="relative z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-56 text-center">
                                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                                    <Cup size="24" variant="TwoTone" color="#f59e0b" />
                                </div>
                                <p className="text-gray-900 font-bold text-sm mb-1">No Closed Deals</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-[250px] relative">
                            <RevenueWinLossPieChart winLossData={winLossData} />
                            {/* Central Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                                <span className="text-3xl font-black text-gray-900">{overview.wonDeals}</span>
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Won</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Top Deals Section - Optional added value */}
            {topDeals && topDeals.length > 0 && (
                <div className="card p-4">
                    <div className="mb-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Recent Big Wins</h2>
                            <p className="text-sm text-gray-500">Top closed won deals</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                                    <th className="pb-3 font-semibold">Deal Title</th>
                                    <th className="pb-3 font-semibold">Close Date</th>
                                    <th className="pb-3 font-semibold text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topDeals.map((deal: any, i: number) => (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 font-medium text-gray-900 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                <Cup size="16" variant="TwoTone" color="#059669" />
                                            </div>
                                            {deal.title}
                                        </td>
                                        <td className="py-4 text-sm text-gray-500">
                                            {new Date(deal.expectedCloseDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 text-right font-bold text-emerald-600">
                                            ${deal.value?.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Add extra padding at the bottom so it's not sticking */}
            <div className="h-10"></div>
        </div>
    );
}
