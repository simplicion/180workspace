"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Activity, RefreshCw, Filter, Bot, ShieldCheck, 
  ExternalLink, Search, Globe, Smartphone, X, Clock,
  Download, Calendar, Shield, MousePointerClick, Check, Copy
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader, UniversalDateTimePicker } from '@workspace/ui';
import { Drawer } from '@/components/ui/Drawer';

export default function TrafficStreamLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'yesterday' | '24h' | '7d' | '30d' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState<'all' | 'target_offer' | 'safe_page' | 'bot' | 'datacenter'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Fast In-Memory SWR Cache for Instant Switching
  const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  const cacheKey = `logs:${timeRange}:${customStartDate}:${customEndDate}:${actionFilter}:${searchQuery}`;

  const fetchLogs = async (isBackground = false) => {
    const cached = swrCacheRef.current.get(cacheKey);

    if (cached && !isBackground) {
      setLogs(cached.data || []);
      setLoading(false);
    } else if (!isBackground) {
      setLoading(true);
    }

    try {
      const params: any = {
        timeRange,
        limit: 100
      };

      if (timeRange === 'custom') {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }

      if (actionFilter !== 'all') {
        params.action = actionFilter;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/api/v1/traffic-director/logs', { params });
      const fetched = res.data.data.logs || [];
      setLogs(fetched);
      swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      if (!isBackground) toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [cacheKey]);

  // Auto-refresh every 5 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, cacheKey]);

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const headers = ['Timestamp', 'Link Slug', 'IP Address', 'Country', 'City', 'Device', 'OS', 'Browser', 'Status', 'Destination URL', 'Reason', 'Latency (ms)'];
    const rows = logs.map(l => {
      const isTarget = l.destinationUrl && l.destinationUrl !== l.link?.fallbackUrl && !l.isBot;
      return [
        `"${new Date(l.timestamp).toISOString()}"`,
        `"${l.link?.slug || ''}"`,
        `"${l.ipAddress || '127.0.0.1'}"`,
        `"${l.country || 'US'}"`,
        `"${l.city || 'Unknown'}"`,
        `"${l.deviceType || 'Desktop'}"`,
        `"${l.os || 'Unknown OS'}"`,
        `"${l.browser || 'Unknown Browser'}"`,
        `"${isTarget ? 'TARGET_OFFER' : 'SAFE_PAGE'}"`,
        `"${l.destinationUrl || ''}"`,
        `"${l.botName || (isTarget ? 'Rule Matched' : 'Fallback')}"`,
        l.latencyMs || 0
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `traffic_logs_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Logs CSV exported!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIp(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Decision Stream Logs</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time differential routing event stream, anti-bot classification, and telemetry inspector across all links
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              autoRefresh 
                ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live Streaming' : 'Stream Paused'}
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Time Range Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/70 rounded-xl">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '24h', label: 'Last 24h' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
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

          {/* Decision Action & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Routing Decisions</option>
              <option value="target_offer">🎯 Target Offer Only</option>
              <option value="safe_page">🛡️ Safe Page Origin</option>
              <option value="bot">🤖 Automated Bots Drop</option>
              <option value="datacenter">🏢 Datacenter ASN Filter</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IP, URL, Bot..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Range Popover */}
        {isCustomModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Custom Logs Time Window</h3>
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
                    fetchLogs();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      {loading && logs.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
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
                  <th className="py-3 px-4">Routing Decision</th>
                  <th className="py-3 px-4">Trigger / Rule</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log) => {
                  const isTarget = log.destinationUrl && log.destinationUrl !== log.link?.fallbackUrl && !log.isBot;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 text-gray-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                          /r/{log.link?.slug || 'link'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">{log.country || 'US'}</span> · <span className="font-mono text-gray-400">{log.ipAddress || '127.0.0.1'}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {log.deviceType || 'Desktop'} · {log.browser || 'Browser'}
                      </td>
                      <td className="py-3 px-4">
                        {isTarget ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                            🎯 TARGET OFFER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-200 dark:border-purple-800">
                            🛡️ SAFE PAGE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-400 truncate max-w-xs">
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
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-3">
          <Activity className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No traffic logs found</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            No events match the selected filters. Change your time range or trigger new test traffic.
          </p>
        </div>
      )}

      {/* Log Detail Inspection Drawer */}
      <Drawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Edge Routing Event Telemetry"
      >
        {selectedLog && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Target Action</span>
                <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                  {selectedLog.destinationUrl !== selectedLog.link?.fallbackUrl && !selectedLog.isBot ? 'TARGET OFFER ROUTED' : 'SAFE PAGE ORIGIN (CLOAKED)'}
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                {selectedLog.latencyMs || 1}ms Latency
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-gray-400 uppercase text-[10px]">Delivered Destination URL</span>
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 font-mono text-indigo-600 dark:text-indigo-400 break-all text-xs flex items-center justify-between">
                <span>{selectedLog.destinationUrl}</span>
                <a href={selectedLog.destinationUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600 ml-2 shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">IP Address</span>
                <div className="flex items-center justify-between">
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{selectedLog.ipAddress || '127.0.0.1'}</p>
                  <button onClick={() => copyToClipboard(selectedLog.ipAddress)} className="text-gray-400 hover:text-indigo-600">
                    {copiedIp === selectedLog.ipAddress ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Location</span>
                <p className="font-bold text-gray-900 dark:text-white">{selectedLog.city ? `${selectedLog.city}, ` : ''}{selectedLog.country || 'US'}</p>
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
