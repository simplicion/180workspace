'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  PhoneCall,
  ChevronRight,
  ArrowUpRight,
  BarChart3,
  Activity,
  PieChart as PieChartIcon,
  Sparkles,
  Calendar,
  Zap,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from "@workspace/ui";
import { useGetDashboardStatsQuery } from '@/redux/api/dashboardApi';
import { useGetLeadsQuery } from '@/redux/api/crmApi';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import clsx from 'clsx';

const PIE_COLORS = [
  '#4f46e5', // Indigo (New Lead)
  '#f59e0b', // Amber (Contacted)
  '#10b981', // Emerald (Qualified)
  '#3b82f6', // Blue (Demo / Meeting)
  '#8b5cf6', // Violet (Won)
  '#ef4444', // Red (Lost)
  '#ec4899', // Pink (Proposal)
  '#06b6d4', // Cyan (Negotiation)
];

export default function SalesOverview({ isLocked }: { isLocked?: boolean }) {
  const [chartView, setChartView] = useState<'both' | 'daily' | 'status'>('both');
  const [isChartsCollapsed, setIsChartsCollapsed] = useState(false);

  // 1. Dashboard summary & activities
  const { data: dashboardData, isLoading: loadingDashboard } = useGetDashboardStatsQuery(undefined, {
    skip: isLocked,
    pollingInterval: 30000,
  });

  // 2. Full leads dataset for accurate daily trajectory & stage distribution
  const { data: leadsResponse, isLoading: loadingLeads } = useGetLeadsQuery(undefined, {
    skip: isLocked,
  });

  const loading = loadingDashboard || loadingLeads;
  const leads = useMemo(() => leadsResponse?.leads || [], [leadsResponse]);

  // ── Executive KPI Metrics ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let newCount = 0;
    let contactedCount = 0;
    let qualifiedCount = 0;

    leads.forEach((l: any) => {
      const t = new Date(l.createdAt).getTime();
      const st = (l.status || 'new').toLowerCase();

      if (t >= todayStart) todayCount++;
      if (t >= weekStart) weekCount++;
      if (t >= monthStart) monthCount++;

      if (st === 'new' || st === 'lead' || st === 'inbound') newCount++;
      else if (st.includes('contact')) contactedCount++;
      else if (st.includes('qualif') || st === 'demo' || st === 'proposal' || st === 'closedwon') qualifiedCount++;
    });

    const fallbackNew = dashboardData?.metrics?.pendingLeads || 0;
    const fallbackContacted = dashboardData?.metrics?.activeLeads || 0;
    const fallbackQualified = dashboardData?.metrics?.activeOpportunities || 0;
    const fallbackTotal = dashboardData?.metrics?.totalLeads || 0;
    const conversionRate = dashboardData?.funnel?.dealWinRate || 0;

    return {
      today: todayCount,
      week: weekCount,
      month: monthCount,
      newLeads: leads.length > 0 ? newCount : fallbackNew,
      contacted: leads.length > 0 ? contactedCount : fallbackContacted,
      qualified: leads.length > 0 ? qualifiedCount : fallbackQualified,
      total: leads.length > 0 ? leads.length : fallbackTotal,
      cvr: Math.round(conversionRate * 10) / 10
    };
  }, [leads, dashboardData]);

  // ── Daily Trend Area Chart Data (Current Month) ────────────────────────────
  const dailyChartData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayMap: Record<number, { day: string; dateStr: string; total: number; newLeads: number; contacted: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dayMap[d] = {
        day: `${month + 1}/${d}`,
        dateStr: new Date(year, month, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: 0,
        newLeads: 0,
        contacted: 0
      };
    }

    leads.forEach((l: any) => {
      const d = new Date(l.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (dayMap[day]) {
          dayMap[day].total += 1;
          const st = (l.status || 'new').toLowerCase();
          if (st.includes('contact')) {
            dayMap[day].contacted += 1;
          } else {
            dayMap[day].newLeads += 1;
          }
        }
      }
    });

    return Object.values(dayMap);
  }, [leads]);

  // ── Status Distribution Donut Chart Data ───────────────────────────────────
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};

    const STAGE_LABELS: Record<string, string> = {
      'new': 'New Leads',
      'lead': 'New Leads',
      'contacted': 'Contacted',
      'qualified': 'Qualified',
      'demo': 'Demo / Meeting',
      'proposal': 'Proposal',
      'negotiation': 'Negotiation',
      'closedwon': 'Won (Closed)',
      'closedlost': 'Lost / Closed'
    };

    leads.forEach((l: any) => {
      const raw = (l.status || 'new').toLowerCase();
      const label = STAGE_LABELS[raw] || (raw.charAt(0).toUpperCase() + raw.slice(1));
      counts[label] = (counts[label] || 0) + 1;
    });

    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    if (data.length === 0) {
      return [{ name: 'No Leads', value: 1 }];
    }
    return data;
  }, [leads]);

  return (
    <div className="card overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm">
      {/* ── CARD HEADER ── */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              Sales Pipeline
              {!loading && (
                <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> {metrics.cvr}% Conversion
                </span>
              )}
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium">Real-time sales health, lead volume & stage intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/sales/leads-pipeline"
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900"
          >
            View CRM <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* ── 1. COMPACT EXECUTIVE KPI METRICS BAR ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
          {/* Today's Leads */}
          <div className="p-2.5 bg-zinc-50/90 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500">
              <span>Today</span>
              <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                <Sparkles className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              {loading ? <Skeleton className="h-5 w-8" /> : (
                <>
                  <span className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{metrics.today}</span>
                  <span className="text-[9px] text-zinc-400 font-medium">today</span>
                </>
              )}
            </div>
          </div>

          {/* This Week */}
          <div className="p-2.5 bg-zinc-50/90 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500">
              <span>7 Days</span>
              <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                <Calendar className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              {loading ? <Skeleton className="h-5 w-8" /> : (
                <>
                  <span className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{metrics.week}</span>
                  <span className="text-[9px] text-zinc-400 font-medium">week</span>
                </>
              )}
            </div>
          </div>

          {/* This Month */}
          <div className="p-2.5 bg-zinc-50/90 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500">
              <span>Month</span>
              <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                <Activity className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              {loading ? <Skeleton className="h-5 w-8" /> : (
                <>
                  <span className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{metrics.month}</span>
                  <span className="text-[9px] text-zinc-400 font-medium">month</span>
                </>
              )}
            </div>
          </div>

          {/* New Leads */}
          <div className="p-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
              <span>New</span>
              <span className="p-1 rounded-md bg-indigo-100/70 dark:bg-indigo-900/60 text-indigo-600">
                <Users className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              {loading ? <Skeleton className="h-5 w-8" /> : (
                <>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{metrics.newLeads}</span>
                  <span className="text-[9px] text-indigo-400/80 font-medium">inbound</span>
                </>
              )}
            </div>
          </div>

          {/* Contacted */}
          <div className="p-2.5 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-100/60 dark:border-amber-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <span>Contacted</span>
              <span className="p-1 rounded-md bg-amber-100/70 dark:bg-amber-900/60 text-amber-600">
                <PhoneCall className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              {loading ? <Skeleton className="h-5 w-8" /> : (
                <>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400 tracking-tight">{metrics.contacted}</span>
                  <span className="text-[9px] text-amber-400/80 font-medium">in progress</span>
                </>
              )}
            </div>
          </div>

          {/* Qualified / Ongoing */}
          <div className="p-2.5 bg-teal-50/40 dark:bg-teal-950/20 rounded-xl border border-teal-100/60 dark:border-teal-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-semibold text-teal-600 dark:text-teal-400">
              <span>Deals / Won</span>
              <span className="p-1 rounded-md bg-teal-100/70 dark:bg-teal-900/60 text-teal-600">
                <Zap className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              {loading ? <Skeleton className="h-5 w-8" /> : (
                <>
                  <span className="text-base font-bold text-teal-600 dark:text-teal-400 tracking-tight">{metrics.qualified}</span>
                  <span className="text-[9px] text-teal-400/80 font-medium">pipeline</span>
                </>
              )}
            </div>
          </div>

          {/* Total & CVR */}
          <div className="p-2.5 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-100/60 dark:border-purple-900/40 flex flex-col justify-between col-span-2 sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-purple-600 dark:text-purple-400">
              <span>Total / CVR</span>
              <span className="p-1 rounded-md bg-purple-100/70 dark:bg-purple-900/60 text-purple-600">
                <TrendingUp className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              {loading ? <Skeleton className="h-5 w-8" /> : (
                <>
                  <span className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{metrics.total}</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">({metrics.cvr}%)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. INTERACTIVE LEAD VOLUME & STAGE INTELLIGENCE CARD ── */}
        <div className="bg-zinc-50/60 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Lead Volume & Stage Intelligence</h4>
                <p className="text-[10px] text-zinc-400">Daily trajectory and Contacted vs. New lead distribution</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700 flex items-center gap-0.5 text-[10px] font-medium shadow-2xs">
                <button
                  type="button"
                  onClick={() => setChartView('both')}
                  className={clsx(
                    "px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                    chartView === 'both' ? "bg-indigo-50 dark:bg-zinc-700 text-indigo-600 dark:text-white font-bold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  Split View
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('daily')}
                  className={clsx(
                    "px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                    chartView === 'daily' ? "bg-indigo-50 dark:bg-zinc-700 text-indigo-600 dark:text-white font-bold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  Daily Trend
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('status')}
                  className={clsx(
                    "px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                    chartView === 'status' ? "bg-indigo-50 dark:bg-zinc-700 text-indigo-600 dark:text-white font-bold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  Status Pie
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsChartsCollapsed(!isChartsCollapsed)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors"
                title={isChartsCollapsed ? "Expand Graphs" : "Collapse Graphs"}
              >
                <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform", isChartsCollapsed ? "-rotate-90" : "")} />
              </button>
            </div>
          </div>

          {!isChartsCollapsed && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 pt-1 animate-in fade-in duration-200">
              {/* Daily Trend Area Graph */}
              {(chartView === 'both' || chartView === 'daily') && (
                <div className={clsx("flex flex-col justify-between", chartView === 'both' ? "xl:col-span-7" : "xl:col-span-12")}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-indigo-500" /> Daily Lead Volume (Current Month)
                    </span>
                    <div className="flex items-center gap-2.5 text-[9px]">
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> New Leads
                      </span>
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Contacted
                      </span>
                    </div>
                  </div>

                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyChartData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashboardNewLeadGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="dashboardContactedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.12)" />
                        <XAxis
                          dataKey="dateStr"
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '11px',
                            color: '#fff',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="newLeads"
                          name="New Leads"
                          stroke="#4f46e5"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#dashboardNewLeadGradient)"
                        />
                        <Area
                          type="monotone"
                          dataKey="contacted"
                          name="Contacted"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#dashboardContactedGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Status Breakdown Donut/Pie Chart */}
              {(chartView === 'both' || chartView === 'status') && (
                <div className={clsx(
                  "flex flex-col justify-between pt-3 xl:pt-0",
                  chartView === 'both' ? "xl:col-span-5 xl:border-l xl:border-zinc-200/60 xl:dark:border-zinc-800 xl:pl-3" : "xl:col-span-12"
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                      <PieChartIcon className="w-3 h-3 text-indigo-500" /> Stage Breakdown
                    </span>
                    <span className="text-[9px] text-zinc-400 font-mono">
                      {metrics.total} leads
                    </span>
                  </div>

                  <div className="h-40 w-full flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={54}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '11px',
                            color: '#fff'
                          }}
                        />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          iconType="circle"
                          iconSize={6}
                          wrapperStyle={{ fontSize: '10px', lineHeight: '15px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
