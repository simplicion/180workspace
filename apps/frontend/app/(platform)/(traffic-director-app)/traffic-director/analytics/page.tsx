"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GitFork, BarChart3, Activity, ShieldCheck, Globe, 
  Smartphone, Bot, RefreshCw, Layers, ArrowUpRight, 
  ExternalLink, Sparkles, Play, ShieldAlert, Cpu
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSubscription } from '@/lib/useSubscription';
import { LogoLoader, FeatureLock } from '@workspace/ui';
import CreateLinkModal from '../../_components/CreateLinkModal';

export default function TrafficDirectorAnalyticsPage() {
  const { companyConfig, loading: subLoading } = useSubscription();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
  const hasApp = enabledApps.includes('traffic-director') || enabledApps.includes('marketing') || enabledApps.includes('advertising') || enabledApps.length === 0;

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/traffic-director/overview');
      setStats(res.data?.data || null);
    } catch (error: any) {
      console.error('Failed to fetch traffic analytics:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasApp) {
      fetchAnalytics();
    }
  }, [hasApp]);

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
            <BarChart3 className="w-3.5 h-3.5" /> Differential Traffic Analytics
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Traffic Analytics & Insights</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            In-depth differential inspection of visitor traffic, automated bots, datacenter proxies, device telemetry, and geographic routing patterns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold border border-gray-200 dark:border-gray-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <p className="text-[11px] text-gray-400">Total edge-evaluated inbound hits</p>
        </div>

        {/* Human Percentage */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Humans</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {humanPct}%
            </span>
            <span className="text-xs text-gray-400 font-medium">({(stats?.totalHumans || 0).toLocaleString()} hits)</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${humanPct}%` }} />
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

      {/* Anomaly Sentinel Status */}
      {stats?.anomalyDetected ? (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-rose-950 dark:text-rose-200">Traffic Anomaly Sentinel Triggered</h3>
            <p className="text-xs text-rose-800 dark:text-rose-300">
              {stats.anomalyMessage || 'High volume of automated bot or cloud ASN traffic detected. Safe Page proxy mode or IP warmup safeguards recommended.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Traffic Sentinel Status: Normal operations, zero active anomaly triggers.</span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Health 100%</span>
        </div>
      )}

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
                        {c.country || 'Unknown'}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
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

        {/* Device Breakdown */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Client Device Telemetry
              </h2>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              OS & Platform distribution
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
                        <span className="w-5 text-gray-400 font-mono text-[11px]">#{idx + 1}</span>
                        {d.device || 'Desktop'}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {d.count.toLocaleString()} requests ({pct}%)
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
              No device classification telemetry recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/traffic-director/links"
          className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition">Smart Links & Rules</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Manage conditional routing destinations and safe pages</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition" />
        </Link>

        <Link
          href="/traffic-director/simulator"
          className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800/60 transition group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 transition">Routing Simulator</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Test and evaluate routing rules against simulated IP and headers</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition" />
        </Link>

        <Link
          href="/traffic-director/logs"
          className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800/60 transition group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition">Live Stream Logs</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Inspect real-time request headers, latency, and matched rules</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition" />
        </Link>
      </div>
    </div>
  );
}
