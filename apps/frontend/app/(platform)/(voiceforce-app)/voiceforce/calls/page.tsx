"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PhoneCall, ArrowLeft, RefreshCw, Search, ArrowUpRight, 
  Clock, IndianRupee, Bot, CheckCircle2, XCircle, AlertCircle, 
  Download, Filter, Play, Smartphone, User, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { UniversalSkeleton } from '@workspace/ui';
import clsx from 'clsx';

/**
 * 180 Voiceforce: Call Stream & Historical Logs
 * 
 * Features:
 * - Live and historical call logs stream with duration and cost (INR)
 * - Multi-attribute filtering by Status, Sentiment, and Conversational Outcome
 * - Search by recipient phone, contact name, or assigned AI employee
 * - Full CSV export with all structured telephony and post-call intelligence columns
 */
export default function VoiceforceCallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/voiceforce/calls');
      setCalls(res.data?.data || []);
    } catch (err: any) {
      toast.error('Failed to load call logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const filteredCalls = calls.filter((c) => {
    const matchesSearch = 
      c.recipientPhone?.includes(search) || 
      c.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
      c.voiceAgent?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesSentiment = sentimentFilter === 'all' || c.sentiment?.toLowerCase() === sentimentFilter.toLowerCase();
    const matchesOutcome = outcomeFilter === 'all' || c.callOutcome?.toLowerCase() === outcomeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSentiment && matchesOutcome;
  });

  const handleExportCsv = () => {
    if (filteredCalls.length === 0) {
      toast.error('No call records found to export');
      return;
    }

    const headers = ['Call ID', 'Phone Number', 'Customer Name', 'Direction', 'Status', 'Agent Name', 'Duration (Seconds)', 'Cost (INR)', 'Outcome', 'Sentiment', 'Created At'];
    const rows = filteredCalls.map(c => [
      `"${c.id}"`,
      `"${c.recipientPhone || ''}"`,
      `"${(c.recipientName || '').replace(/"/g, '""')}"`,
      `"${c.direction || 'outbound'}"`,
      `"${c.status || ''}"`,
      `"${(c.voiceAgent?.name || '').replace(/"/g, '""')}"`,
      c.durationSeconds || 0,
      c.estimatedCostInr ? Number(c.estimatedCostInr).toFixed(2) : '0.00',
      `"${c.callOutcome || ''}"`,
      `"${c.sentiment || ''}"`,
      `"${new Date(c.createdAt).toISOString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `voiceforce-calls-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredCalls.length} call records to CSV`);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'in_progress':
      case 'active':
      case 'dialing':
      case 'ringing':
        return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 animate-pulse';
      case 'queued':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <Link 
              href="/voiceforce" 
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200/60 dark:border-gray-700/60"
              title="Return to Voiceforce Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Call Stream & History
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Real-time telephony stream, full call transcripts, audio recordings, and autonomous post-call analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          <button
            onClick={() => fetchCalls()}
            className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700 transition-colors cursor-pointer shadow-sm"
            title="Refresh stream"
          >
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin text-indigo-600")} />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by phone, customer name, or AI employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">Dialing / In-Progress</option>
              <option value="queued">Queued</option>
              <option value="no_answer">No Answer</option>
              <option value="busy">Busy</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Sentiment & Outcome Filter Pills */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 font-medium">Sentiment:</span>
            {['all', 'positive', 'neutral', 'negative'].map((s) => (
              <button
                key={s}
                onClick={() => setSentimentFilter(s)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer",
                  sentimentFilter === s 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 font-medium">Outcome:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'order_confirmed', label: 'Order Confirmed' },
              { id: 'appointment_booked', label: 'Appointment Booked' },
              { id: 'inquiry_resolved', label: 'Inquiry Resolved' }
            ].map((o) => (
              <button
                key={o.id}
                onClick={() => setOutcomeFilter(o.id)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                  outcomeFilter === o.id 
                    ? "bg-purple-600 text-white shadow-sm" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calls List Table */}
      {loading ? (
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <UniversalSkeleton type="list" />
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <PhoneCall className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Call Sessions Found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'all' || sentimentFilter !== 'all' || outcomeFilter !== 'all'
              ? "Try adjusting your search queries or filter attributes."
              : "Launch an instant call from the dashboard or create an outbound campaign to start generating conversations."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200/80 dark:border-gray-800 text-gray-500 dark:text-gray-400 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Contact / Phone</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">AI Employee</th>
                  <th className="py-3.5 px-4">Duration & Cost</th>
                  <th className="py-3.5 px-4">Sentiment & Outcome</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                {filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-gray-900 dark:text-white">
                        {call.recipientPhone}
                      </div>
                      {call.recipientName && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {call.recipientName}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider", getStatusBadge(call.status))}>
                        {call.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                        <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{call.voiceAgent?.name || 'AI Assistant'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {call.durationSeconds || 0}s
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ₹{call.estimatedCostInr ? Number(call.estimatedCostInr).toFixed(2) : '0.00'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {call.sentiment && (
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-semibold",
                            call.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            call.sentiment === 'Negative' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          )}>
                            {call.sentiment}
                          </span>
                        )}
                        {call.callOutcome && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 capitalize">
                            {call.callOutcome.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-[11px]">
                      {new Date(call.createdAt).toLocaleDateString()}{' '}
                      <span className="text-gray-400">
                        {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/voiceforce/calls/${call.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-gray-700 text-xs font-semibold transition-all shadow-sm"
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
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
