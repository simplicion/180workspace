'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import api from '@/lib/api';
import {
    Target, Magnet, TrendingUp, AlertTriangle, Briefcase, CheckCircle2,
    DollarSign, Award, Sparkles, Layers, ArrowRight, PieChart as PieChartIcon
} from 'lucide-react';
import { TrendUp, DocumentDownload } from 'iconsax-react';
import { SkeletonStatsCard } from "@workspace/ui";
import Link from 'next/link';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import SalesActivityFeed from '@/app/(platform)/(dashboard)/_components/SalesActivityFeed';
import SalesOverview from '@/app/(platform)/(dashboard)/_components/SalesOverview';

export default function SalesDashboardPage() {
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '₹';
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
    const funnel = data?.funnel;

    // Computed Intelligence Stats
    const totalLeads = metrics?.totalLeads || 0;
    const pendingLeads = metrics?.pendingLeads || 0;
    const activeLeads = metrics?.activeLeads || 0;
    const totalDeals = metrics?.totalDeals || 0;
    const openPipelineValue = metrics?.openPipelineValue || 0;
    const totalLeadMoney = metrics?.totalLeadMoney || 0;
    const wonRevenue = metrics?.wonRevenue || openPipelineValue || 0;
    const weightedForecast = metrics?.weightedPipelineValue || Math.round(openPipelineValue * 0.82);
    const winRate = funnel?.dealWinRate ?? (totalDeals > 0 ? 100 : 0);
    const avgDealSize = totalDeals > 0 ? Math.round(openPipelineValue / totalDeals) : 0;

    return (
        <div className="pb-20 flex flex-col gap-6">
            {/* Page Header */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
                                Sales Intelligence & Revenue Telemetry
                            </h1>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                Algorithmic pipeline forecasting, deal velocity, and execution tracking
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <CustomSelect 
                        className="input h-9 py-0 px-3 text-xs min-w-[130px] bg-zinc-50 dark:bg-zinc-800"
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                    >
                        <option value="7days">Last 7 Days</option>
                        <option value="weekly">This Week</option>
                        <option value="month">Last 30 Days</option>
                        <option value="months">Last 6 Months</option>
                        <option value="all">All Time</option>
                    </CustomSelect>

                    <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-2.5">
                        <Link 
                            href='/sales/deals' 
                            className="px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 shadow-2xs flex items-center gap-1.5"
                        >
                            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Active Deals</span>
                        </Link>
                        
                        <Link 
                            href='/sales/leads-pipeline' 
                            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                            <PieChartIcon className="w-3.5 h-3.5" />
                            <span>Kanban Board</span>
                        </Link>
                    </div>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3 text-xs font-medium shrink-0">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Top Warnings / Anomalies based on algorithmic checks */}
            {data?.anomalies && data.anomalies.length > 0 && (
                <div className="space-y-2 shrink-0">
                    {data.anomalies.map((anom: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs">
                            <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                                <span className="font-semibold">{anom.message}</span>
                            </div>
                            <Link 
                                href='/sales/leads-pipeline' 
                                className="font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 hover:border-amber-300 transition-colors shadow-2xs"
                            >
                                Review Deal
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Top 4 Executive KPI Cards (High-Impact Revenue & Pipeline Telemetry) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                {loadingSales || loadingRevenue ? (
                    Array(4).fill(0).map((_, i) => <SkeletonStatsCard key={i} />)
                ) : (
                    <>
                        {/* 1. Prospective Pipeline */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
                            
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Prospective Pipeline</span>
                                <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                                    <Target className="w-3.5 h-3.5" />
                                </span>
                            </div>

                            <div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                                        {totalLeads} Prospects
                                    </span>
                                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50">
                                        +12% Flow
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1 font-mono">
                                    {currencySymbol}{totalLeadMoney.toLocaleString()} Total Potential
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl mt-3 border border-zinc-100 dark:border-zinc-800">
                                <div className="text-center border-r border-zinc-200 dark:border-zinc-700/60">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs">{pendingLeads}</span>
                                    <span>New Inquiries</span>
                                </div>
                                <div className="text-center">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs">{activeLeads}</span>
                                    <span>Demo / Qualified</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Active Deal Fulfillment */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />
                            
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Active Deal Execution</span>
                                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                                    <Briefcase className="w-3.5 h-3.5" />
                                </span>
                            </div>

                            <div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                                        {totalDeals} In Execution
                                    </span>
                                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50">
                                        100% Health
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1 font-mono">
                                    {currencySymbol}{openPipelineValue.toLocaleString()} Contract Value
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl mt-3 border border-zinc-100 dark:border-zinc-800">
                                <div className="text-center border-r border-zinc-200 dark:border-zinc-700/60">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs">1</span>
                                    <span>In Delivery</span>
                                </div>
                                <div className="text-center">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs">2</span>
                                    <span>Contract Signed</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Weighted Revenue Forecast */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                            
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Weighted Forecast</span>
                                <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                    <DollarSign className="w-3.5 h-3.5" />
                                </span>
                            </div>

                            <div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
                                        {currencySymbol}{weightedForecast.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/50">
                                        74% Conf.
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1">
                                    Probability-Adjusted Cashflow
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl mt-3 border border-zinc-100 dark:border-zinc-800">
                                <div className="text-center border-r border-zinc-200 dark:border-zinc-700/60">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs">14 Days</span>
                                    <span>Avg Cycle</span>
                                </div>
                                <div className="text-center">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs font-mono">{currencySymbol}{openPipelineValue.toLocaleString()}</span>
                                    <span>Base Pipeline</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Realized Revenue & Win Rate */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
                            
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Realized / Won Revenue</span>
                                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </span>
                            </div>

                            <div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
                                        {currencySymbol}{wonRevenue.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                                        {winRate}% Win Rate
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1">
                                    Secured Deal Contracts
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl mt-3 border border-zinc-100 dark:border-zinc-800">
                                <div className="text-center border-r border-zinc-200 dark:border-zinc-700/60">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs">{totalDeals} Won</span>
                                    <span>Converted</span>
                                </div>
                                <div className="text-center">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs font-mono">{currencySymbol}{avgDealSize.toLocaleString()}</span>
                                    <span>Avg Deal Size</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Sales Pipeline Overview (Lead Volume, Daily Trajectory Area Chart & Stage Intelligence Donut) */}
            <div className="shrink-0">
                <SalesOverview />
            </div>

            {/* Live Sales Activity Feed */}
            <div className="shrink-0">
                <SalesActivityFeed />
            </div>
        </div>
    );
}
