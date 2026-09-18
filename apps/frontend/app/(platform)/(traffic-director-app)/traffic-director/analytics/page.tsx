"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  GitFork, BarChart3, Activity, ShieldCheck, Globe, 
  Smartphone, Bot, RefreshCw, Layers, ArrowUpRight, 
  ExternalLink, Sparkles, Play, ShieldAlert, Cpu, Calendar, 
  X, MousePointerClick, Shield, Download, Monitor
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSubscription } from '@/lib/useSubscription';
import { LogoLoader, FeatureLock, UniversalDateTimePicker } from '@workspace/ui';
import CreateLinkModal from '../../_components/CreateLinkModal';

export default function TrafficDirectorAnalyticsPage() {
  const { companyConfig, loading: subLoading } = useSubscription();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'yesterday' | '24h' | '7d' | '30d' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
  const hasApp = enabledApps.includes('traffic-director') || enabledApps.includes('marketing') || enabledApps.includes('advertising') || enabledApps.length === 0;

  const fetchAnalytics = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const params: any = { timeRange };
      if (timeRange === 'custom') {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }
      const res = await api.get('/api/v1/traffic-director/overview', { params });
      setStats(res.data?.data || null);
    } catch (error: any) {
      console.error('Failed to fetch traffic analytics:', error);
      if (!isBackground) setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasApp) {
      fetchAnalytics();
    }
  }, [hasApp, timeRange, customStartDate, customEndDate]);

  // Live Auto-Refresh (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh || !hasApp) return;
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, hasApp, timeRange, customStartDate, customEndDate]);

  if (subLoading || (loading && !stats)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!hasApp) {
    return <FeatureLock requiredApp="Traffic Director" />;
  }

  const total = stats?.totalRequests || 0;
  const humanPct = total > 0 ? Math.round(((stats?.totalHumans || 0) / total) * 100) : 100;
  const botPct = stats?.botRatio || 0;
  const datacenterPct = stats?.datacenterRatio || 0;
  const targetPct = stats?.targetRate || 0;
  const timeseries = stats?.timeseries || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchAnalytics()}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" /> Platform Traffic Analytics
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Traffic Analytics & Cloaking Intelligence</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            In-depth inspection of visitor traffic, automated bots, cloud ASN firewalls, device telemetry, and geographic routing across all Smart Links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              autoRefresh 
                ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live Feed' : 'Paused'}
          </button>
          <Link
            href="/traffic-director/simulator"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold border border-gray-200 dark:border-gray-700 transition active:scale-95"
          >
            <Play className="w-4 h-4 text-emerald-500" />
            Simulator
          </Link>
          <Link
            href="/traffic-director/links"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition active:scale-95"
          >
            <Layers className="w-4 h-4" />
            Smart Links
          </Link>
        </div>
      </div>

      {/* Time Range Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        <span className="text-xs text-gray-400">
          Showing data for: <strong>{timeRange.toUpperCase().replace('_', ' ')}</strong>
        </span>
      </div>

      {/* Custom Date Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
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
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Routed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Volume</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {(total || 0).toLocaleString()}
            </span>
            <span className="text-xs text-indigo-500 font-semibold">requests</span>
          </div>
          <p className="text-[11px] text-gray-400">Across {stats?.activeLinks || 0} active links</p>
        </div>

        {/* Target Offer Routed */}
        <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Target Offers</span>
            <div className="p-1.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
              {targetPct}%
            </span>
            <span className="text-xs text-emerald-600 font-medium">({(stats?.targetViews || 0).toLocaleString()} hits)</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${targetPct}%` }} />
          </div>
        </div>

        {/* Human Percentage */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Humans</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {humanPct}%
            </span>
            <span className="text-xs text-gray-400 font-medium">({(stats?.totalHumans || 0).toLocaleString()} hits)</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${humanPct}%` }} />
          </div>
        </div>

        {/* Bot & Scrapers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Automated Bots</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {botPct}%
            </span>
            <span className="text-xs text-gray-400 font-medium">({(stats?.totalBots || 0).toLocaleString()} detected)</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${botPct}%` }} />
          </div>
        </div>

        {/* Datacenter Detection */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Datacenter / ASN</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {datacenterPct}%
            </span>
            <span className="text-xs text-gray-400 font-medium">({(stats?.totalDatacenter || 0).toLocaleString()} proxy)</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${datacenterPct}%` }} />
          </div>
        </div>
      </div>

      {/* Main Timeseries Volume Progression Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Cross-Link Volume Progression
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Hourly and daily progression of global edge evaluated traffic
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Total Volume
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Target Offers
            </span>
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Safe Pages
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {timeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGlobalTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGlobalTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGlobalSafe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900/95 text-white p-3 rounded-xl shadow-xl border border-gray-700 text-xs space-y-1.5 backdrop-blur-md">
                          <p className="font-bold text-gray-300 border-b border-gray-700 pb-1">{data.label} (Total: {data.total})</p>
                          <div className="flex items-center justify-between gap-4 text-emerald-400">
                            <span>🎯 Target Offer:</span>
                            <span className="font-mono font-bold">{data.target}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-purple-400">
                            <span>🛡️ Safe Page Origin:</span>
                            <span className="font-mono font-bold">{data.safe}</span>
                          </div>
                          {data.bot > 0 && (
                            <div className="flex items-center justify-between gap-4 text-rose-400">
                              <span>🤖 Bot / Scraper:</span>
                              <span className="font-mono font-bold">{data.bot}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorGlobalTotal)" />
                <Area type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGlobalTarget)" />
                <Area type="monotone" dataKey="safe" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorGlobalSafe)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              No timeseries traffic recorded for this window.
            </div>
          )}
        </div>
      </div>

      {/* Geographies & Devices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Geographic Traffic Split
              </h2>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              {stats?.topCountries?.length || 0} active countries
            </span>
          </div>

          {stats?.topCountries && stats.topCountries.length > 0 ? (
            <div className="space-y-3.5">
              {stats.topCountries.map((c: any, idx: number) => {
                const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                        <span className="w-5 text-gray-400 font-mono text-[11px]">#{idx + 1}</span>
                        <span>{c.flag || '🌐'}</span>
                        <span>{c.name || c.country}</span>
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 font-mono">
                        {c.count.toLocaleString()} visits ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-400">
              No country telemetry data recorded yet.
            </div>
          )}
        </div>

        {/* Top Devices */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Client Device Telemetry
              </h2>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              Hardware Form Factors
            </span>
          </div>

          {stats?.topDevices && stats.topDevices.length > 0 ? (
            <div className="space-y-3.5">
              {stats.topDevices.map((d: any, idx: number) => {
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-900 dark:text-white font-semibold capitalize flex items-center gap-2">
                        {d.device.toLowerCase().includes('mobile') ? <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> : <Monitor className="w-3.5 h-3.5 text-purple-500" />}
                        {d.device}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 font-mono">
                        {d.count.toLocaleString()} visits ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-400">
              No device characteristics recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Recent Evaluation Log Feed */}
      {stats?.recentLogs && stats.recentLogs.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Recent Edge Inbound Stream
              </h2>
            </div>
            <Link
              href="/traffic-director/logs"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
            >
              View Full Log Stream &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Smart Link</th>
                  <th className="py-3 px-4">Origin & Location</th>
                  <th className="py-3 px-4">Client Telemetry</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.recentLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition">
                    <td className="py-3 px-4 text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                      <Link
                        href={`/traffic-director/links/${log.linkId}`}
                        className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        /r/{log.link?.slug || 'link'}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">
                      {log.country || 'US'} · <span className="font-mono text-gray-400">{log.ipAddress || '127.0.0.1'}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {log.deviceType || 'Desktop'} · {log.browser || 'Browser'}
                    </td>
                    <td className="py-3 px-4">
                      {log.isBot ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                          🤖 Bot Detected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          ✓ Human
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {log.latencyMs || 1}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
