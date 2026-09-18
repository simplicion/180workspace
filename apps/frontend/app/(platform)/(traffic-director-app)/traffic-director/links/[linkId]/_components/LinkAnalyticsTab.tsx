"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BarChart3, Activity, ShieldCheck, ShieldAlert, Globe, Smartphone, Monitor, Tablet, 
  Bot, Cpu, Flame, Clock, RefreshCw, Download, Calendar, Filter, ArrowUpRight, 
  ArrowDownRight, Layers, ExternalLink, Check, Copy, ChevronDown, Sparkles, X, Search, 
  Zap, Eye, Compass, MousePointerClick, Shield, HelpCircle
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader, UniversalDateTimePicker } from '@workspace/ui';
import { Drawer } from '@/components/ui/Drawer';
import InfoTooltip from '@/components/ui/InfoTooltip';

interface LinkAnalyticsTabProps {
  linkId: string;
  linkData: any;
}

export default function LinkAnalyticsTab({ linkId, linkData }: LinkAnalyticsTabProps) {
  // State for Filters (Default to 'all' or 'today')
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'yesterday' | '24h' | '7d' | '30d' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [routingAction, setRoutingAction] = useState<'all' | 'target_offer' | 'safe_page' | 'bot' | 'datacenter'>('all');
  
  // Data state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // SWR Cache for sub-second reactive switching
  const cacheRef = useRef<Map<string, { data: any; ts: number }>>(new Map());

  const cacheKey = `${linkId}:${timeRange}:${customStartDate}:${customEndDate}:${selectedCountry}:${routingAction}`;

  const fetchAnalytics = async (isBackground = false) => {
    if (!isBackground && !cacheRef.current.has(cacheKey)) {
      setLoading(true);
    }

    try {
      const params: any = { timeRange };
      if (timeRange === 'custom') {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }
      if (selectedCountry) params.country = selectedCountry;
      if (routingAction !== 'all') params.routingAction = routingAction;

      const [analyticsResult, logsResult] = await Promise.allSettled([
        api.get(`/api/v1/traffic-director/links/${linkId}/analytics`, { params }),
        api.get(`/api/v1/traffic-director/logs`, {
          params: {
            linkId,
            timeRange,
            startDate: timeRange === 'custom' ? customStartDate : undefined,
            endDate: timeRange === 'custom' ? customEndDate : undefined,
            country: selectedCountry || undefined,
            action: routingAction !== 'all' ? routingAction : undefined,
            limit: 30
          }
        })
      ]);

      const aData = analyticsResult.status === 'fulfilled' ? analyticsResult.value.data?.data : null;
      const lData = logsResult.status === 'fulfilled' ? logsResult.value.data?.data?.logs || [] : [];

      if (aData) {
        setAnalyticsData(aData);
        setLogs(lData);
        cacheRef.current.set(cacheKey, { data: { analytics: aData, logs: lData }, ts: Date.now() });
      } else if (analyticsResult.status === 'rejected') {
        throw analyticsResult.reason;
      }
    } catch (error: any) {
      console.error('Failed to fetch link analytics:', error);
      if (!isBackground) {
        toast.error('Failed to load analytics');
      }
    } finally {
      setLoading(false);
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    // Check cached data first
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setAnalyticsData(cached.data.analytics);
      setLogs(cached.data.logs);
      setLoading(false);
      fetchAnalytics(true); // background revalidate
    } else {
      fetchAnalytics(false);
    }
  }, [cacheKey]);

  // Live Auto-Refresh (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, cacheKey]);

  // CSV Export
  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast.error('No traffic log records to export');
      return;
    }

    const headers = ['Timestamp', 'IP Address', 'Country', 'City', 'Device', 'OS', 'Browser', 'Decision Status', 'Destination URL', 'Reason / Trigger', 'Network Type', 'Latency (ms)'];
    const rows = logs.map(l => {
      const isTarget = l.destinationUrl && l.destinationUrl !== linkData?.fallbackUrl && !l.isBot;
      return [
        `"${new Date(l.timestamp).toISOString()}"`,
        `"${l.ipAddress || '127.0.0.1'}"`,
        `"${l.country || 'US'}"`,
        `"${l.city || 'Unknown'}"`,
        `"${l.deviceType || 'Desktop'}"`,
        `"${l.os || 'Unknown OS'}"`,
        `"${l.browser || 'Unknown Browser'}"`,
        `"${isTarget ? 'TARGET_OFFER' : 'SAFE_PAGE'}"`,
        `"${l.destinationUrl || ''}"`,
        `"${l.botName || (isTarget ? 'Rule Matched' : 'Fallback')}"`,
        `"${l.networkType || 'residential'}"`,
        l.latencyMs || 0
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `traffic_analytics_${linkData?.slug || 'link'}_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Analytics CSV report downloaded!');
  };

  const kpis = analyticsData?.kpis || {
    totalViews: 0,
    targetViews: 0,
    safeViews: 0,
    targetRate: 0,
    botViews: 0,
    botRate: 0,
    datacenterViews: 0,
    datacenterRate: 0,
    avgLatencyMs: 0
  };

  const timeseries = analyticsData?.timeseries || [];
  const cloakingReasons = analyticsData?.cloakingReasons || [];
  const countryDistribution = analyticsData?.countryDistribution || [];
  const deviceBreakdown = analyticsData?.deviceBreakdown || [];
  const osBreakdown = analyticsData?.osBreakdown || [];
  const browserBreakdown = analyticsData?.browserBreakdown || [];
  const referrerBreakdown = analyticsData?.referrerBreakdown || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Filter Toolbar & Control Header ─────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Time Range Quick Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/70 rounded-xl">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '24h', label: 'Last 24h' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setTimeRange(tab.id as any);
                  if (tab.id === 'custom') {
                    setIsCustomModalOpen(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action & Secondary Dimension Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Routing Action Filter */}
            <select
              value={routingAction}
              onChange={(e) => setRoutingAction(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Routing Decisions</option>
              <option value="target_offer">🎯 Target Offer Only</option>
              <option value="safe_page">🛡️ Safe Page Origin</option>
              <option value="bot">🤖 Automated Bots Drop</option>
              <option value="datacenter">🏢 Datacenter ASN Filter</option>
            </select>

            {/* Country Quick Filter */}
            {countryDistribution.length > 0 && (
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">All Countries ({countryDistribution.length})</option>
                {countryDistribution.map((c: any) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.total})
                  </option>
                ))}
              </select>
            )}

            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                autoRefresh
                  ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title={autoRefresh ? 'Streaming live traffic (5s poll)' : 'Live stream paused'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>{autoRefresh ? 'Live Feed' : 'Paused'}</span>
            </button>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs font-semibold transition cursor-pointer"
              title="Download filtered decision analytics as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Active Badge */}
        {timeRange === 'custom' && (
          <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Custom Window: <strong>{customStartDate ? new Date(customStartDate).toLocaleString() : 'Start'}</strong> &rarr; <strong>{customEndDate ? new Date(customEndDate).toLocaleString() : 'Now'}</strong>
              </span>
            </div>
            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Modify Dates
            </button>
          </div>
        )}

        {/* Historical Traffic Context Banner */}
        {timeRange === 'today' && (kpis.totalViews || 0) === 0 && (linkData?.totalClicks || 0) > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 px-4 rounded-xl bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-indigo-50/90 dark:from-indigo-950/50 dark:via-purple-950/30 dark:to-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                Active filter is <strong>Today</strong> (0 hits so far today). You have <strong>{(linkData?.totalClicks || 0).toLocaleString()} lifetime hits</strong> recorded on this link.
              </span>
            </div>
            <button
              onClick={() => setTimeRange('all')}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer shrink-0 transition self-start sm:self-auto"
            >
              Switch to All Time ({(linkData?.totalClicks || 0).toLocaleString()} hits) &rarr;
            </button>
          </div>
        )}
      </div>

      {/* ─── Custom Date Modal Popover ───────────────────────────────────── */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Custom Analytics Time Window</h3>
              </div>
              <button onClick={() => setIsCustomModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Start Date & Time</label>
                <UniversalDateTimePicker
                  value={customStartDate}
                  onChange={(val) => setCustomStartDate(val || '')}
                  mode="datetime"
                  placeholder="Select start datetime..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">End Date & Time</label>
                <UniversalDateTimePicker
                  value={customEndDate}
                  onChange={(val) => setCustomEndDate(val || '')}
                  mode="datetime"
                  placeholder="Select end datetime..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsCustomModalOpen(false);
                  fetchAnalytics();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Top KPI Scorecards Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Volume */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Volume</span>
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">
              {(kpis.totalViews || 0).toLocaleString()}
            </span>
            {kpis.viewsDeltaPct !== null && kpis.viewsDeltaPct !== undefined && (
              <span className={`text-[10px] font-bold flex items-center ${
                kpis.viewsDeltaPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {kpis.viewsDeltaPct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(kpis.viewsDeltaPct)}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 truncate">Total inbound edge requests</p>
        </div>

        {/* 2. Target Offer Views */}
        <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Target Offers</span>
            <div className="p-1 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300">
              <MousePointerClick className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
              {(kpis.targetViews || 0).toLocaleString()}
            </span>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
              {kpis.targetRate}%
            </span>
          </div>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 truncate">Qualified human traffic</p>
        </div>

        {/* 3. Compliant Safe Page Views */}
        <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100/70 dark:border-purple-900/40 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Safe Page Views</span>
            <div className="p-1 rounded-lg bg-purple-100/70 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-purple-700 dark:text-purple-300">
              {(kpis.safeViews || 0).toLocaleString()}
            </span>
            <span className="text-xs font-extrabold text-purple-600 bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 rounded">
              {kpis.totalViews > 0 ? Math.round((kpis.safeViews / kpis.totalViews) * 100) : 0}%
            </span>
          </div>
          <p className="text-[10px] text-purple-600/70 dark:text-purple-400/60 truncate">Cloaked, warmup & fallbacks</p>
        </div>

        {/* 4. Automated Bot / Crawler */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Bots & Spiders</span>
            <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {(kpis.botViews || 0).toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-gray-400">
              {kpis.botRate}%
            </span>
          </div>
          <p className="text-[10px] text-gray-400 truncate">Google, Meta, TikTok bots</p>
        </div>

        {/* 5. Datacenter ASN Firewall */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cloud ASN Proxy</span>
            <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
              {(kpis.datacenterViews || 0).toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-gray-400">
              {kpis.datacenterRate}%
            </span>
          </div>
          <p className="text-[10px] text-gray-400 truncate">AWS, GCP, Azure subnets</p>
        </div>

        {/* 6. Evaluation Latency */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Edge Latency</span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">
              {kpis.avgLatencyMs || 1} <span className="text-xs font-normal text-gray-400">ms</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
              Ultra Fast
            </span>
          </div>
          <p className="text-[10px] text-gray-400 truncate">V8 edge evaluation time</p>
        </div>
      </div>

      {/* ─── Main Timeseries Chart & Cloaking Decision Donut ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timeseries Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Traffic & Differential Routing Progression
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Hourly / daily chronological breakdown of total hits vs target offers vs cloaked safe pages
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Total Hits
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Target Offer
              </span>
              <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Safe Page
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {timeseries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#9ca3af" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={11} 
                    tickLine={false} 
                    allowDecimals={false} 
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const targetPct = data.total > 0 ? Math.round((data.target / data.total) * 100) : 0;
                        return (
                          <div className="bg-gray-900/95 text-white p-3 rounded-xl shadow-xl border border-gray-700 text-xs space-y-1.5 backdrop-blur-md">
                            <p className="font-bold text-gray-300 border-b border-gray-700 pb-1">{data.label} (Total: {data.total})</p>
                            <div className="flex items-center justify-between gap-4 text-emerald-400">
                              <span>🎯 Target Offer:</span>
                              <span className="font-mono font-bold">{data.target} ({targetPct}%)</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-purple-400">
                              <span>🛡️ Safe Page Origin:</span>
                              <span className="font-mono font-bold">{data.safe} ({100 - targetPct}%)</span>
                            </div>
                            {data.bot > 0 && (
                              <div className="flex items-center justify-between gap-4 text-rose-400">
                                <span>🤖 Bot / Scrapers:</span>
                                <span className="font-mono font-bold">{data.bot}</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  <Area type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTarget)" />
                  <Area type="monotone" dataKey="safe" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorSafe)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No timeseries traffic recorded for this window.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Cloaking & Routing Reasons */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Cloaking Decision Matrix
              </h3>
            </div>
            <InfoTooltip content="Exact decision triggers explaining why visitors were routed to the Target Offer vs Compliant Safe Page." />
          </div>

          {cloakingReasons.length > 0 ? (
            <div className="space-y-3 pt-1">
              {cloakingReasons.map((reason: any) => (
                <div key={reason.reasonKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 truncate max-w-[180px]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: reason.color }} />
                      <span className="truncate">{reason.label}</span>
                    </span>
                    <span className="font-mono font-bold text-gray-600 dark:text-gray-400 shrink-0">
                      {reason.count.toLocaleString()} ({reason.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(reason.percentage, 2)}%`,
                        backgroundColor: reason.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-gray-400">
              No cloaking triggers recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* ─── Geographies & Referrers Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Country Leaderboard */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Geographic Traffic Split
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {countryDistribution.length} active countries
            </span>
          </div>

          {countryDistribution.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {countryDistribution.map((c: any, idx: number) => (
                <div key={c.code} className="p-2.5 rounded-xl bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{c.name}</span>
                      <span className="font-mono text-[10px] text-gray-400">({c.code})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">
                        {c.total.toLocaleString()} visits ({c.percentage}%)
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold">
                        {c.targetRatePct}% offer
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${c.targetRatePct}%` }}
                      title={`Target Offer: ${c.target}`}
                    />
                    <div
                      className="bg-purple-500 h-full transition-all"
                      style={{ width: `${100 - c.targetRatePct}%` }}
                      title={`Safe Page: ${c.safe}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">
              No country telemetry data recorded.
            </div>
          )}
        </div>

        {/* Referrers & Acquisition Sources */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Traffic Acquisition Channels & Referrers
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              Top Sources
            </span>
          </div>

          {referrerBreakdown.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {referrerBreakdown.map((r: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                      <span className="w-4 text-gray-400 font-mono text-[11px]">#{idx + 1}</span>
                      {r.name}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 font-mono">
                      {r.count.toLocaleString()} visits ({r.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.max(r.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">
              No referrer source data recorded.
            </div>
          )}
        </div>
      </div>

      {/* ─── Device, OS & Browser Split ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device Types */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Device Form Factor
            </h4>
          </div>
          <div className="space-y-2.5 pt-1">
            {deviceBreakdown.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
                  {d.name.toLowerCase().includes('mobile') ? <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> : <Monitor className="w-3.5 h-3.5 text-indigo-500" />}
                  {d.name}
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{d.count} ({d.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operating Systems */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-500" />
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Operating Systems
            </h4>
          </div>
          <div className="space-y-2.5 pt-1">
            {osBreakdown.slice(0, 5).map((o: any) => (
              <div key={o.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[150px]">{o.name}</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{o.count} ({o.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* In-App & Standard Browsers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Browsers & In-App WebViews
            </h4>
          </div>
          <div className="space-y-2.5 pt-1">
            {browserBreakdown.slice(0, 5).map((b: any) => (
              <div key={b.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[150px]">{b.name}</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{b.count} ({b.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Real-Time Live Decision Log Feed ─────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Live Decision Stream & Telemetry Inspector
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Click any event row to inspect full request headers, hardware probes, and rule match telemetry
            </p>
          </div>
          <span className="text-xs text-gray-400">
            Showing latest {logs.length} evaluated requests
          </span>
        </div>

        {logs.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Origin / Country</th>
                  <th className="py-3 px-4">Client Telemetry</th>
                  <th className="py-3 px-4">Decision Action</th>
                  <th className="py-3 px-4">Trigger Reason</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log) => {
                  const isTarget = log.destinationUrl && log.destinationUrl !== linkData?.fallbackUrl && !log.isBot;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 text-gray-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>{getCountryFlag(log.country)}</span>
                          <span className="font-semibold">{log.country || 'US'}</span>
                          <span className="text-gray-400 font-mono text-[11px]">({log.ipAddress || '127.0.0.1'})</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{log.deviceType || 'Desktop'}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500">{log.browser || 'Browser'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isTarget ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                            🎯 TARGET OFFER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-bold text-[11px] border border-purple-200 dark:border-purple-800">
                            🛡️ SAFE PAGE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-400">
                        {log.botName || (isTarget ? 'Rule Matched' : 'Fallback')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {log.latencyMs || 1}ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-gray-400">
            No live traffic records matching the active filters.
          </div>
        )}
      </div>

      {/* ─── Deep Inspection Drawer for Individual Request ──────────────── */}
      <Drawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Edge Routing Decision & Telemetry Details"
      >
        {selectedLog && (
          <div className="space-y-5 text-xs">
            {/* Header Badge */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Routing Decision</span>
                <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                  {selectedLog.destinationUrl !== linkData?.fallbackUrl && !selectedLog.isBot ? 'TARGET OFFER ROUTED' : 'SAFE PAGE ORIGIN (CLOAKED)'}
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                {selectedLog.latencyMs || 1}ms Latency
              </span>
            </div>

            {/* Destination URL */}
            <div className="space-y-1">
              <span className="font-bold text-gray-400 uppercase text-[10px]">Delivered Destination URL</span>
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 font-mono text-indigo-600 dark:text-indigo-400 break-all text-xs flex items-center justify-between">
                <span>{selectedLog.destinationUrl}</span>
                <a href={selectedLog.destinationUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600 ml-2 shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Telemetry Matrix */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">IP Address</span>
                <p className="font-mono font-bold text-gray-900 dark:text-white">{selectedLog.ipAddress || '127.0.0.1'}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Location</span>
                <p className="font-bold text-gray-900 dark:text-white">{getCountryFlag(selectedLog.country)} {selectedLog.city ? `${selectedLog.city}, ` : ''}{selectedLog.country || 'US'}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Device & OS</span>
                <p className="font-bold text-gray-900 dark:text-white">{selectedLog.deviceType || 'Desktop'} · {selectedLog.os || 'OS'}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Browser</span>
                <p className="font-bold text-gray-900 dark:text-white">{selectedLog.browser || 'Browser'}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Network Classification</span>
                <p className="font-bold capitalize text-gray-900 dark:text-white">{selectedLog.networkType || 'residential'}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Trigger / Shield Reason</span>
                <p className="font-bold text-indigo-600 dark:text-indigo-400">{selectedLog.botName || 'Rule Evaluated'}</p>
              </div>
            </div>

            {/* User-Agent String */}
            {selectedLog.userAgent && (
              <div className="space-y-1">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Raw User-Agent</span>
                <p className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 font-mono text-[11px] text-gray-600 dark:text-gray-300 break-all">
                  {selectedLog.userAgent}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
