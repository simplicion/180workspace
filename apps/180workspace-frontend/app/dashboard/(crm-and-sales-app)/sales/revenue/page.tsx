'use client';


import { useState, useEffect } from 'react';
import {
    DollarSign, TrendingUp, Download, ArrowRight, Target, Activity,
    Layers, Users, Calendar, Award, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import nextDynamic from 'next/dynamic';

const RevenueTrendAreaChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueCharts').then(mod => mod.RevenueTrendAreaChart), { ssr: false });
const RevenueDealsLineChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueCharts').then(mod => mod.RevenueDealsLineChart), { ssr: false });
const RevenuePipelineBarChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueCharts').then(mod => mod.RevenuePipelineBarChart), { ssr: false });
const RevenueWinLossPieChart = nextDynamic(() => import('@/app/dashboard/(crm-and-sales-app)/components/RevenueCharts').then(mod => mod.RevenueWinLossPieChart), { ssr: false });

export default function RevenueDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchRevenue = async () => {
            try {
                const res = await api.get('/api/sales/revenue');
                setStats(res.data);
            } catch (error) {
                toast.error('Failed to load revenue metrics');
            } finally {
                setLoading(false);
            }
        };
        fetchRevenue();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-120px)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!stats) return null;

    const { overview, monthlyTrend, pipelineByStage, topDeals } = stats;
    
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
            <div className="page-header flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                        <DollarSign className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
                        <p className="text-sm text-gray-500 mt-1">Real-time financial performance and deal tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select className="input h-10 py-0 px-3 bg-gray-50 text-sm border-gray-200 text-gray-700 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                        <option>Last 6 Months</option>
                        <option>This Year</option>
                        <option>All Time</option>
                    </select>
                    <button className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-lg py-2 px-4 shadow-sm transition-all">
                        <Download className="w-4 h-4" /> Export Report
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Total Revenue</p>
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                                ${overview.totalRevenue?.toLocaleString()}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +12.5% vs last period
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Estimated ARR</p>
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                                ${(overview.arr || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
                        Based on total won deals
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Estimated MRR</p>
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                                ${(overview.mrr || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                            <Layers className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                        Simulated recurring average
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Open Pipeline</p>
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                                ${(overview.pipelineValue || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
                            <Target className="w-6 h-6" />
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
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Revenue Realization Trend</h2>
                            <p className="text-sm text-gray-500">Total revenue generated from won deals over time</p>
                        </div>
                    </div>
                    
                    {!hasTrendData ? (
                        <div className="w-full h-80 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <AlertCircle className="w-8 h-8 text-gray-400 mb-3" />
                            <p className="text-gray-500 font-medium text-sm">Not enough data to display trend</p>
                            <p className="text-gray-400 text-xs mt-1">Close some deals to see your revenue over time.</p>
                        </div>
                    ) : (
                        <div className="w-full h-80">
                            <RevenueTrendAreaChart monthlyTrend={monthlyTrend} />
                        </div>
                    )}
                </div>

                {/* Deals Won Line Chart */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Deals Won</h2>
                        <p className="text-sm text-gray-500">Monthly conversion volume</p>
                    </div>
                    
                    {!hasTrendData ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 min-h-[320px]">
                            <Target className="w-8 h-8 text-gray-400 mb-3" />
                            <p className="text-gray-500 font-medium text-sm">No deals won yet</p>
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
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Pipeline by Stage</h2>
                        <p className="text-sm text-gray-500">Value of open opportunities in each pipeline stage</p>
                    </div>

                    {!hasPipelineData ? (
                         <div className="w-full h-72 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                             <Layers className="w-8 h-8 text-gray-400 mb-3" />
                             <p className="text-gray-500 font-medium text-sm">No open pipeline data</p>
                             <p className="text-gray-400 text-xs mt-1">Create deals to see pipeline distribution.</p>
                         </div>
                    ) : (
                        <div className="w-full h-72">
                            <RevenuePipelineBarChart pipelineByStage={pipelineByStage} />
                        </div>
                    )}
                </div>

                {/* Win / Loss Ratio Pie Chart */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
                    <div className="mb-2">
                        <h2 className="text-lg font-bold text-gray-900">Win vs Loss Ratio</h2>
                        <p className="text-sm text-gray-500">Overall closing performance</p>
                    </div>

                    {winLossData.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-4 min-h-[250px]">
                            <Award className="w-8 h-8 text-gray-400 mb-3" />
                            <p className="text-gray-500 font-medium text-sm">No closed deals yet</p>
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
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <div className="mb-6 flex justify-between items-center">
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
                                                <Award className="w-4 h-4" />
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
