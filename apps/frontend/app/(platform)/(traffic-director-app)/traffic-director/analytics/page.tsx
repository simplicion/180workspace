"use client";

import { useState, useEffect } from 'react';
import { 
  BarChart3, Globe, Smartphone, Bot, Users, 
  Activity, ArrowUpRight, TrendingUp, ShieldCheck, PieChart 
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';

export default function TrafficAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/traffic-director/overview');
      setStats(res.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LogoLoader />
      </div>
    );
  }

  const totalReq = stats?.totalRequests || 1;
  const humanReq = stats?.totalHumans || 0;
  const botReq = stats?.totalBots || 0;
  const datacenterReq = stats?.totalDatacenter || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
          <TrendingUp className="w-3.5 h-3.5" /> Real-time Metrics & Anomaly Sentinel
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Traffic Analytics & Fraud Defense</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Differential traffic segmentation, cloud datacenter detection, and hardware client classification
        </p>
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

      {/* 4 Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Human Traffic</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {humanReq.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-emerald-500">
              {Math.round((humanReq / totalReq) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.round((humanReq / totalReq) * 100)}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Bot & Scrapers</span>
            <Bot className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {botReq.toLocaleString()}
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

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Datacenter ASNs</span>
            <Globe className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {datacenterReq.toLocaleString()}
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

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Evaluation Latency</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">
              &lt; 3ms
            </span>
            <span className="text-xs font-semibold text-emerald-500">P99 Edge</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full w-full" />
          </div>
        </div>
      </div>

      {/* Grid: Geographic & Device Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Top Geographies (Countries)
            </h2>
          </div>

          {stats?.topCountries && stats.topCountries.length > 0 ? (
            <div className="space-y-3">
              {stats.topCountries.map((c: any, idx: number) => {
                const pct = Math.round((c.count / totalReq) * 100);
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

        {/* Device Breakdown */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Device Classification
            </h2>
          </div>

          {stats?.topDevices && stats.topDevices.length > 0 ? (
            <div className="space-y-3">
              {stats.topDevices.map((d: any, idx: number) => {
                const pct = Math.round((d.count / totalReq) * 100);
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
    </div>
  );
}
