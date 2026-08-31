"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GitFork, Link as LinkIcon, Activity, ShieldCheck, Globe, 
  Smartphone, Plus, Play, ExternalLink, RefreshCw, Bot, Users
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSubscription } from '@/lib/useSubscription';
import { LogoLoader, FeatureLock } from '@workspace/ui';
import CreateLinkModal from '../_components/CreateLinkModal';

export default function TrafficDirectorOverviewPage() {
  const { companyConfig, loading: subLoading } = useSubscription();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
  const hasApp = enabledApps.includes('traffic-director') || enabledApps.includes('marketing') || enabledApps.includes('advertising') || enabledApps.length === 0;

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/traffic-director/overview');
      setStats(res.data?.data || null);
    } catch (error: any) {
      console.error('Failed to fetch traffic stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasApp) {
      fetchOverview();
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchOverview()}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
            <GitFork className="w-3.5 h-3.5" /> Edge Routing Engine
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Traffic Director</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            High-speed conditional traffic routing, multi-variant landing page delivery, device targeting, and real-time bot differential inspection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/traffic-director/simulator"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 text-sm font-semibold border border-gray-200 dark:border-gray-700 transition active:scale-95"
          >
            <Play className="w-4 h-4 text-emerald-500" />
            Routing Simulator
          </Link>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Smart Link
          </button>
        </div>
      </div>

      {/* Anomaly Alert Banner */}
      {stats?.anomalyDetected && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3.5 text-rose-900 dark:text-rose-200">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="font-bold text-sm">Ad Traffic Anomaly Alert</span>
            <p className="text-rose-700 dark:text-rose-300">
              {stats.anomalyMessage || 'Unusual surge in automated crawler and cloud datacenter ASN traffic detected.'}
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Traffic */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Traffic</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {(stats?.totalRequests || 0).toLocaleString()}
            </span>
            <span className="text-xs text-indigo-500 font-semibold">routed</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full w-full" />
          </div>
        </div>

        {/* Human Traffic */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Human Traffic</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {(stats?.totalHumans || 0).toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-emerald-500">
              {stats?.totalRequests > 0 ? Math.round(((stats?.totalHumans || 0) / stats.totalRequests) * 100) : 100}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${stats?.totalRequests > 0 ? Math.round(((stats?.totalHumans || 0) / stats.totalRequests) * 100) : 100}%` }}
            />
          </div>
        </div>

        {/* Bot & Crawlers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Bot & Scrapers</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {(stats?.totalBots || 0).toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-amber-500">
              {stats?.botRatio || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all"
              style={{ width: `${stats?.botRatio || 0}%` }}
            />
          </div>
        </div>

        {/* Datacenter ASNs */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Datacenter ASNs</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {(stats?.totalDatacenter || 0).toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-rose-500">
              {stats?.datacenterRatio || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all"
              style={{ width: `${stats?.datacenterRatio || 0}%` }}
            />
          </div>
        </div>

        {/* Active Links */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Links</span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <LinkIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {stats?.activeLinks || 0}
            </span>
            <span className="text-xs text-purple-500 font-semibold">
              / {stats?.totalLinks || 0} total
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{
                width: `${stats?.totalLinks > 0 ? Math.round(((stats?.activeLinks || 0) / stats.totalLinks) * 100) : 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid: Geographies & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Geographies */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Top Geographies (Countries)
              </h2>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              {stats?.topCountries?.length || 0} active regions
            </span>
          </div>

          {stats?.topCountries && stats.topCountries.length > 0 ? (
            <div className="space-y-3">
              {stats.topCountries.map((c: any, idx: number) => {
                const total = stats?.totalRequests || 1;
                const pct = Math.round((c.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-900 dark:text-white font-semibold">{c.country}</span>
                      <span className="text-gray-400">{c.count} visits ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">No geographic data recorded yet.</div>
          )}
        </div>

        {/* Device Classification */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Device Classification
              </h2>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              Hardware & OS split
            </span>
          </div>

          {stats?.topDevices && stats.topDevices.length > 0 ? (
            <div className="space-y-3">
              {stats.topDevices.map((d: any, idx: number) => {
                const total = stats?.totalRequests || 1;
                const pct = Math.round((d.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-900 dark:text-white font-semibold capitalize">{d.device}</span>
                      <span className="text-gray-400">{d.count} requests ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">No device data recorded yet.</div>
          )}
        </div>
      </div>

      {/* Recent Traffic Stream */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Traffic Log Activity</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Live differential routing executions across your Smart Links</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchOverview}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/traffic-director/logs"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              View All Logs <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {stats?.recentLogs && stats.recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Link / Slug</th>
                  <th className="py-3 px-4">Country & IP</th>
                  <th className="py-3 px-4">Device & Browser</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Routed Destination</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.recentLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                    <td className="py-3 px-4 text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[11px]">
                        /r/{log.link?.slug || 'unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">{log.country || 'US'}</span> · <span className="font-mono text-gray-400">{log.ipAddress || '127.0.0.1'}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      <span className="capitalize">{log.deviceType || 'desktop'}</span> · {log.browser || 'Chrome'}
                    </td>
                    <td className="py-3 px-4">
                      {log.isBot ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                          <Bot className="w-3 h-3" /> {log.botName || 'Crawler'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                          <ShieldCheck className="w-3 h-3" /> Human
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 truncate max-w-[200px]" title={log.destinationUrl}>
                      {log.destinationUrl}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-500">
                      {log.latencyMs || 2}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400 space-y-3">
            <GitFork className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm">No traffic recorded yet. Create a Smart Link and start routing!</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Create your first Smart Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
