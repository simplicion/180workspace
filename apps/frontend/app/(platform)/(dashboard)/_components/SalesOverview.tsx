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
  ChevronDown,
  Briefcase,
  DollarSign,
  Layers,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from "@workspace/ui";
import { useGetDashboardStatsQuery } from '@/redux/api/dashboardApi';
import { useGetLeadsQuery, useGetDealsQuery } from '@/redux/api/crmApi';
import { useSettings } from '@/lib/settings-context';
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

const LEAD_PIE_COLORS = [
  '#4f46e5', // Indigo (New Lead)
  '#f59e0b', // Amber (Contacted)
  '#10b981', // Emerald (Qualified)
  '#3b82f6', // Blue (Demo / Meeting)
  '#8b5cf6', // Violet (Other)
];

const DEAL_PIE_COLORS = [
  '#6366f1', // Indigo (Discovery / Lead)
  '#ec4899', // Pink (Proposal)
  '#f97316', // Orange (Negotiation)
  '#06b6d4', // Cyan (Contract Signed)
  '#10b981', // Emerald (In Delivery / Won)
  '#94a3b8', // Slate (Lost / Other)
];

type LeadTimeFilter = 'today' | 'week' | 'month';

export default function SalesOverview({ isLocked }: { isLocked?: boolean }) {
  const [chartView, setChartView] = useState<'both' | 'daily' | 'status'>('both');
  const [isChartsCollapsed, setIsChartsCollapsed] = useState(false);
  const [leadTimeRange, setLeadTimeRange] = useState<LeadTimeFilter>('today');

  const { company } = useSettings();
  const currencySymbol = company?.currencySymbol || '₹';

  const formatCurrency = (val: number | undefined): string => {
    if (!val || isNaN(val)) return `${currencySymbol}0`;
    if (val >= 10000000) return `${currencySymbol}${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `${currencySymbol}${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${currencySymbol}${(val / 1000).toFixed(1)}k`;
    return `${currencySymbol}${Math.round(val).toLocaleString()}`;
  };

  // 1. Dashboard summary stats
  const { data: dashboardData, isLoading: loadingDashboard } = useGetDashboardStatsQuery(undefined, {
    skip: isLocked,
    pollingInterval: 30000,
  });

  // 2. Full leads dataset
  const { data: leadsResponse, isLoading: loadingLeads } = useGetLeadsQuery(undefined, {
    skip: isLocked,
  });

  // 3. Full deals dataset
  const { data: dealsResponse, isLoading: loadingDeals } = useGetDealsQuery(undefined, {
    skip: isLocked,
  });

  const loading = loadingDashboard || loadingLeads || loadingDeals;
  const leads = useMemo(() => leadsResponse?.leads || [], [leadsResponse]);
  const deals = useMemo(() => {
    if (Array.isArray(dealsResponse)) return dealsResponse;
    return dealsResponse?.deals || dealsResponse?.leads || [];
  }, [dealsResponse]);

  // ── Executive KPI Metrics (Combined Leads + Deals) ───────────────────────────
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

    // Deals calculations
    let activeDealsCount = 0;
    let totalPipelineValue = 0;
    let proposalDeals = 0;
    let negotiationDeals = 0;
    let contractDeals = 0;
    let wonDealsCount = 0;
    let wonRevenue = 0;

    deals.forEach((d: any) => {
      const stage = (d.stage || d.status || 'discovery').toLowerCase();
      const val = Number(d.value || d.amount || 0);

      if (stage === 'closedwon' || stage === 'won' || stage === 'indelivery' || stage === 'closedpaid') {
        wonDealsCount++;
        wonRevenue += val;
      } else if (stage !== 'closedlost' && stage !== 'lost') {
        activeDealsCount++;
        totalPipelineValue += val;

        if (stage.includes('proposal')) proposalDeals++;
        else if (stage.includes('negot')) negotiationDeals++;
        else if (stage.includes('contract')) contractDeals++;
      }
    });

    const fallbackNew = dashboardData?.metrics?.pendingLeads || 0;
    const fallbackContacted = dashboardData?.metrics?.activeLeads || 0;
    const fallbackTotal = dashboardData?.metrics?.totalLeads || 0;
    const conversionRate = dashboardData?.funnel?.dealWinRate || (deals.length > 0 && leads.length > 0 ? (deals.length / leads.length) * 100 : 0);
    const winRate = deals.length > 0 ? (wonDealsCount / deals.length) * 100 : 0;

    return {
      today: todayCount,
      week: weekCount,
      month: monthCount,
      newLeads: leads.length > 0 ? newCount : fallbackNew,
      contacted: leads.length > 0 ? contactedCount : fallbackContacted,
      qualified: leads.length > 0 ? qualifiedCount : 0,
      totalLeads: leads.length > 0 ? leads.length : fallbackTotal,
      cvr: Math.round(conversionRate * 10) / 10,
      // Deals metrics
      totalDeals: deals.length,
      activeDealsCount: deals.length > 0 ? activeDealsCount : (dashboardData?.metrics?.activeOpportunities || 0),
      totalPipelineValue,
      proposalDeals,
      negotiationDeals,
      contractDeals,
      wonDealsCount,
      wonRevenue,
      winRate: Math.round(winRate * 10) / 10
    };
  }, [leads, deals, dashboardData]);

  // ── Daily Combined Trend Chart Data (Leads & Deals in Current Month) ────────
  const dailyChartData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayMap: Record<number, {
      day: string;
      dateStr: string;
      newLeads: number;
      contacted: number;
      dealsCreated: number;
      dealsWon: number;
      dealValue: number;
    }> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      dayMap[d] = {
        day: `${month + 1}/${d}`,
        dateStr: new Date(year, month, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        newLeads: 0,
        contacted: 0,
        dealsCreated: 0,
        dealsWon: 0,
        dealValue: 0
      };
    }

    // Populate leads
    leads.forEach((l: any) => {
      const d = new Date(l.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (dayMap[day]) {
          const st = (l.status || 'new').toLowerCase();
          if (st.includes('contact')) {
            dayMap[day].contacted += 1;
          } else {
            dayMap[day].newLeads += 1;
          }
        }
      }
    });

    // Populate deals
    deals.forEach((dl: any) => {
      const d = new Date(dl.createdAt || dl.updatedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (dayMap[day]) {
          const st = (dl.stage || dl.status || '').toLowerCase();
          const val = Number(dl.value || dl.amount || 0);

          if (st === 'closedwon' || st === 'won' || st === 'indelivery') {
            dayMap[day].dealsWon += 1;
          } else {
            dayMap[day].dealsCreated += 1;
          }
          dayMap[day].dealValue += val;
        }
      }
    });

    return Object.values(dayMap);
  }, [leads, deals]);

  // ── Leads Stage Breakdown Donut Data ───────────────────────────────────────
  const leadsPieData = useMemo(() => {
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

  // ── Deals Stage Breakdown Donut Data ───────────────────────────────────────
  const dealsPieData = useMemo(() => {
    const counts: Record<string, number> = {};

    const DEAL_STAGE_LABELS: Record<string, string> = {
      'discovery': 'Discovery',
      'lead': 'Discovery',
      'inbound': 'Discovery',
      'proposalsent': 'Proposal Sent',
      'proposal': 'Proposal Sent',
      'negotiation': 'Negotiation',
      'contractsigned': 'Contract Signed',
      'contract': 'Contract Signed',
      'indelivery': 'In Delivery / Won',
      'closedwon': 'In Delivery / Won',
      'won': 'In Delivery / Won',
      'closedlost': 'Lost / Closed',
      'lost': 'Lost / Closed'
    };

    deals.forEach((d: any) => {
      const raw = (d.stage || d.status || 'discovery').toLowerCase().replace(/\s+/g, '');
      const label = DEAL_STAGE_LABELS[raw] || (raw.charAt(0).toUpperCase() + raw.slice(1));
      counts[label] = (counts[label] || 0) + 1;
    });

    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    if (data.length === 0) {
      return [{ name: 'No Deals', value: 1 }];
    }
    return data;
  }, [deals]);

  // Get active leads inflow count based on selected filter
  const currentLeadInflow = useMemo(() => {
    if (leadTimeRange === 'today') return metrics.today;
    if (leadTimeRange === 'week') return metrics.week;
    return metrics.month;
  }, [leadTimeRange, metrics]);

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
        {/* ── 1. COMPRESSED DUAL PIPELINE KPI METRICS (LEADS & DEALS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2.5">
          {/* CARD 1: Leads Inflow with Interactive Time Toggle */}
          <div className="p-3 bg-zinc-50/90 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Leads Inflow</span>
              {/* Inline Time Filter Toggle */}
              <div className="flex items-center bg-zinc-200/60 dark:bg-zinc-700/60 p-0.5 rounded-md text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => setLeadTimeRange('today')}
                  className={clsx(
                    "px-1.5 py-0.2 rounded transition-all cursor-pointer",
                    leadTimeRange === 'today'
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                  )}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setLeadTimeRange('week')}
                  className={clsx(
                    "px-1.5 py-0.2 rounded transition-all cursor-pointer",
                    leadTimeRange === 'week'
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                  )}
                >
                  7D
                </button>
                <button
                  type="button"
                  onClick={() => setLeadTimeRange('month')}
                  className={clsx(
                    "px-1.5 py-0.2 rounded transition-all cursor-pointer",
                    leadTimeRange === 'month'
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                  )}
                >
                  Month
                </button>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              {loading ? <Skeleton className="h-6 w-10" /> : (
                <>
                  <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{currentLeadInflow}</span>
                  <span className="text-[10px] text-zinc-400 font-medium">inbound ({leadTimeRange})</span>
                </>
              )}
            </div>
          </div>

          {/* CARD 2: Leads Pipeline by Status */}
          <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/70 dark:border-indigo-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
              <span>Leads Status</span>
              <Users className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{metrics.newLeads}</span>
                <span className="text-[9px] text-indigo-500/80 ml-0.5">New</span>
              </div>
              <span className="text-indigo-200 dark:text-indigo-800">•</span>
              <div>
                <span className="font-extrabold text-amber-600 dark:text-amber-400">{metrics.contacted}</span>
                <span className="text-[9px] text-amber-500/80 ml-0.5">Contact</span>
              </div>
              <span className="text-indigo-200 dark:text-indigo-800">•</span>
              <div>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.qualified}</span>
                <span className="text-[9px] text-emerald-500/80 ml-0.5">Qual</span>
              </div>
            </div>
          </div>

          {/* CARD 3: Total Leads & Conversion Rate */}
          <div className="p-3 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-100/70 dark:border-purple-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-tight">
              <span>Total Leads</span>
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              {loading ? <Skeleton className="h-6 w-12" /> : (
                <>
                  <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{metrics.totalLeads}</span>
                  <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-900/60 px-1.5 py-0.2 rounded">
                    {metrics.cvr}% CVR
                  </span>
                </>
              )}
            </div>
          </div>

          {/* CARD 4: Deals in Pipeline (Count + Total Value) */}
          <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-100/70 dark:border-blue-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
              <span>Deals in Pipeline</span>
              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              {loading ? <Skeleton className="h-6 w-14" /> : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{metrics.activeDealsCount}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">deals</span>
                  </div>
                  <span className="text-[11px] font-black font-mono text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-1.5 py-0.2 rounded">
                    {formatCurrency(metrics.totalPipelineValue)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* CARD 5: Deals by Stage Breakdown */}
          <div className="p-3 bg-teal-50/40 dark:bg-teal-950/20 rounded-xl border border-teal-100/70 dark:border-teal-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-tight">
              <span>Deals in Stage</span>
              <Layers className="w-3.5 h-3.5 text-teal-500" />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold text-pink-600 dark:text-pink-400">{metrics.proposalDeals}</span>
                <span className="text-[9px] text-pink-500/80 ml-0.5">Prop</span>
              </div>
              <span className="text-teal-200 dark:text-teal-800">•</span>
              <div>
                <span className="font-extrabold text-orange-600 dark:text-orange-400">{metrics.negotiationDeals}</span>
                <span className="text-[9px] text-orange-500/80 ml-0.5">Negot</span>
              </div>
              <span className="text-teal-200 dark:text-teal-800">•</span>
              <div>
                <span className="font-extrabold text-cyan-600 dark:text-cyan-400">{metrics.contractDeals}</span>
                <span className="text-[9px] text-cyan-500/80 ml-0.5">Signed</span>
              </div>
            </div>
          </div>

          {/* CARD 6: Deals Won & Closed Revenue */}
          <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/70 dark:border-emerald-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
              <span>Won Deals</span>
              <Award className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              {loading ? <Skeleton className="h-6 w-14" /> : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{metrics.wonDealsCount}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">won</span>
                  </div>
                  <span className="text-[11px] font-black font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded">
                    {formatCurrency(metrics.wonRevenue)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. INTERACTIVE LEAD & DEAL VOLUME WITH DUAL STAGE INTELLIGENCE ── */}
        <div className="bg-zinc-50/60 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Sales & Deals Velocity</h4>
                <p className="text-[10px] text-zinc-400">Combined trajectory and dual stage distribution for Leads & Deals</p>
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
                  Stage Pies
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
              {/* Daily Trend Area & Line Chart (Combined Leads + Deals) */}
              {(chartView === 'both' || chartView === 'daily') && (
                <div className={clsx("flex flex-col justify-between", chartView === 'both' ? "xl:col-span-7" : "xl:col-span-12")}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-indigo-500" /> Daily Inflow & Deal Conversion
                    </span>
                    <div className="flex items-center gap-2.5 text-[9px]">
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> New Leads
                      </span>
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Contacted
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Deals
                      </span>
                      <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> Won
                      </span>
                    </div>
                  </div>

                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyChartData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashboardNewLeadGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="dashboardDealsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-zinc-900/95 text-white p-2.5 rounded-xl border border-zinc-700 shadow-xl text-xs space-y-1 min-w-[140px]">
                                  <p className="font-bold border-b border-zinc-800 pb-1 text-[11px] text-zinc-300">{d.dateStr}</p>
                                  <div className="flex justify-between gap-3 text-indigo-400">
                                    <span>New Leads:</span> <span className="font-bold">{d.newLeads}</span>
                                  </div>
                                  <div className="flex justify-between gap-3 text-amber-400">
                                    <span>Contacted:</span> <span className="font-bold">{d.contacted}</span>
                                  </div>
                                  <div className="flex justify-between gap-3 text-emerald-400">
                                    <span>Deals Created:</span> <span className="font-bold">{d.dealsCreated}</span>
                                  </div>
                                  <div className="flex justify-between gap-3 text-teal-400">
                                    <span>Deals Won:</span> <span className="font-bold">{d.dealsWon}</span>
                                  </div>
                                  {d.dealValue > 0 && (
                                    <div className="flex justify-between gap-3 text-emerald-300 border-t border-zinc-800 pt-1 font-mono font-bold">
                                      <span>Value:</span> <span>{formatCurrency(d.dealValue)}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
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
                          strokeWidth={1.5}
                          fillOpacity={0}
                        />
                        <Area
                          type="monotone"
                          dataKey="dealsCreated"
                          name="Deals"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#dashboardDealsGradient)"
                        />
                        <Area
                          type="monotone"
                          dataKey="dealsWon"
                          name="Won"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          fillOpacity={0}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* DUAL STAGE BREAKDOWN: LEADS PIE + DEALS PIE SIDE-BY-SIDE */}
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
                      {metrics.totalLeads} Leads • {metrics.totalDeals} Deals
                    </span>
                  </div>

                  {/* Dual Donut Charts Side-by-Side */}
                  <div className="grid grid-cols-2 gap-2 h-44 items-center">
                    {/* 1. LEADS DONUT */}
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/60 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800/60 h-full">
                      <div className="flex items-center justify-between w-full px-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Lead
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400">
                          {metrics.totalLeads}
                        </span>
                      </div>
                      <div className="w-full h-24 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={leadsPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={22}
                              outerRadius={40}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {leadsPieData.map((_, index) => (
                                <Cell key={`lead-cell-${index}`} fill={LEAD_PIE_COLORS[index % LEAD_PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                fontSize: '10px',
                                color: '#fff'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Mini Legend */}
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 mt-1 text-[8px] text-zinc-500 font-semibold max-w-full truncate">
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]" /> New
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> Contacted
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Qual
                        </span>
                      </div>
                    </div>

                    {/* 2. DEALS DONUT */}
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/60 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800/60 h-full">
                      <div className="flex items-center justify-between w-full px-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Deal
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400">
                          {metrics.totalDeals}
                        </span>
                      </div>
                      <div className="w-full h-24 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={dealsPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={22}
                              outerRadius={40}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {dealsPieData.map((_, index) => (
                                <Cell key={`deal-cell-${index}`} fill={DEAL_PIE_COLORS[index % DEAL_PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                fontSize: '10px',
                                color: '#fff'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Mini Legend */}
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 mt-1 text-[8px] text-zinc-500 font-semibold max-w-full truncate">
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" /> Disc
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899]" /> Prop
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Won
                        </span>
                      </div>
                    </div>
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
