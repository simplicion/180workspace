"use client";

import { useState, useEffect } from 'react';
import { 
  Activity, RefreshCw, Filter, Bot, ShieldCheck, 
  ExternalLink, Search, Globe, Smartphone, X, Clock 
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';
import { Drawer } from '@/components/ui/Drawer';

export default function TrafficStreamLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [botFilter, setBotFilter] = useState<'all' | 'bots' | 'humans'>('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = async () => {
    try {
      const isBotParam = botFilter === 'bots' ? true : (botFilter === 'humans' ? false : undefined);
      const res = await api.get('/api/v1/traffic-director/logs', {
        params: { isBot: isBotParam, limit: 50 }
      });
      setLogs(res.data.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [botFilter]);

  // Auto-refresh every 4 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, botFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Traffic Stream</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time differential routing event stream and client inspection log
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bot Filter Tabs */}
          <div className="flex items-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs">
            <button
              onClick={() => setBotFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${botFilter === 'all' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}
            >
              All Traffic
            </button>
            <button
              onClick={() => setBotFilter('humans')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${botFilter === 'humans' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-gray-500'}`}
            >
              Humans Only
            </button>
            <button
              onClick={() => setBotFilter('bots')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${botFilter === 'bots' ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-gray-500'}`}
            >
              Bots & Crawlers
            </button>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              autoRefresh 
                ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                : 'border-gray-200 dark:border-gray-700 text-gray-500'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      {loading && logs.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <LogoLoader />
        </div>
      ) : logs.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Smart Link</th>
                  <th className="py-3 px-4">Origin & IP</th>
                  <th className="py-3 px-4">Device / Client</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                        /r/{log.link?.slug || 'link'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">{log.country || 'US'}</span> · <span className="font-mono text-gray-400">{log.ipAddress || '127.0.0.1'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {log.deviceType === 'mobile' && <Smartphone className="w-3.5 h-3.5 text-purple-500" />}
                        {log.deviceType === 'desktop' && <Globe className="w-3.5 h-3.5 text-indigo-500" />}
                        <span className="capitalize">{log.deviceType || 'desktop'}</span> · {log.browser || 'Browser'}
                      </div>
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
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 truncate max-w-[240px]" title={log.destinationUrl}>
                      {log.destinationUrl}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-500 font-semibold">
                      {log.latencyMs || 1}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-3">
          <Activity className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No live logs matching current filter</p>
          <p className="text-xs text-gray-400">Incoming requests will stream here in real-time as traffic hits your `/r/*` endpoints.</p>
        </div>
      )}

      {/* Slide-out Inspection Drawer */}
      <Drawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Request Inspection"
        description={selectedLog?.id}
        icon={<Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        maxWidth="max-w-md"
        position="right"
        footer={
          <div className="flex items-center justify-end w-full">
            <button
              onClick={() => setSelectedLog(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              Close
            </button>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-4 text-xs p-1">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Routed Destination URL
              </label>
              <a
                href={selectedLog.destinationUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 break-all"
              >
                {selectedLog.destinationUrl}
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-400 block text-[10px] uppercase">IP Address</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{selectedLog.ipAddress || '127.0.0.1'}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-400 block text-[10px] uppercase">Location</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedLog.city}, {selectedLog.country}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-400 block text-[10px] uppercase">Device & OS</span>
                <span className="font-bold text-gray-900 dark:text-white capitalize">{selectedLog.deviceType} · {selectedLog.os}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-400 block text-[10px] uppercase">Latency</span>
                <span className="font-mono font-bold text-emerald-500">{selectedLog.latencyMs || 1}ms</span>
              </div>
            </div>

            {/* Hardware & Network Telemetry */}
            <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 space-y-2.5">
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                Hardware & Network Telemetry
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Network Type</span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">{selectedLog.networkType || 'Residential'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Emulation Status</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedLog.isEmulated ? '⚠️ Emulated / Cloud' : '✅ Verified Physical'}
                  </span>
                </div>
                {selectedLog.gpuRenderer && (
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[10px]">GPU Renderer</span>
                    <span className="font-mono text-[11px] text-gray-800 dark:text-gray-200">{selectedLog.gpuRenderer}</span>
                  </div>
                )}
                {selectedLog.touchPoints !== null && selectedLog.touchPoints !== undefined && (
                  <div>
                    <span className="text-gray-400 block text-[10px]">Touch Points</span>
                    <span className="font-mono text-gray-900 dark:text-white">{selectedLog.touchPoints}</span>
                  </div>
                )}
                {selectedLog.batteryLevel !== null && selectedLog.batteryLevel !== undefined && (
                  <div>
                    <span className="text-gray-400 block text-[10px]">Battery Level</span>
                    <span className="font-mono text-gray-900 dark:text-white">{Math.round(selectedLog.batteryLevel * 100)}%</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                User-Agent Header
              </label>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 font-mono text-[11px] text-gray-700 dark:text-gray-300 break-all border border-gray-100 dark:border-gray-700/50">
                {selectedLog.userAgent || 'None'}
              </div>
            </div>

            {selectedLog.referrer && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Referrer
                </label>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 font-mono text-[11px] text-gray-700 dark:text-gray-300 break-all border border-gray-100 dark:border-gray-700/50">
                  {selectedLog.referrer}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
