"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PhoneCall, ArrowLeft, RefreshCw, Search, ArrowUpRight, 
  Clock, IndianRupee, Bot, CheckCircle2, XCircle, AlertCircle, Download
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';

export default function VoiceforceCallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
    const matchesSearch = c.recipientPhone?.includes(search) || c.recipientName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportCsv = () => {
    if (filteredCalls.length === 0) {
      toast.error('No calls to export');
      return;
    }

    const headers = ['Call ID', 'Phone Number', 'Customer Name', 'Status', 'Agent Name', 'Duration (Seconds)', 'Cost (INR)', 'Outcome', 'Sentiment', 'Created At'];
    const rows = filteredCalls.map(c => [
      `"${c.id}"`,
      `"${c.recipientPhone || ''}"`,
      `"${(c.recipientName || '').replace(/"/g, '""')}"`,
      `"${c.status || ''}"`,
      `"${(c.voiceAgent?.name || '').replace(/"/g, '""')}"`,
      c.durationSeconds || 0,
      c.estimatedCostInr || 0,
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
    toast.success(`Exported ${filteredCalls.length} call records to CSV!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/voiceforce" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight">Call Stream & Transcripts</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Review detailed conversation recordings, AI execution logs, and customer sentiments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchCalls}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            title="Refresh Call Stream"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search phone or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'completed', 'in_progress', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === st ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10">
          <PhoneCall className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-white">No Call Sessions Found</h3>
          <p className="text-xs text-slate-400 mt-1">No call records match your current filter criteria.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-xl">
          <div className="divide-y divide-white/5">
            {filteredCalls.map((call) => (
              <div key={call.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`p-2.5 rounded-xl text-xs font-semibold ${
                    call.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    call.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    <PhoneCall className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{call.recipientPhone}</span>
                      {call.recipientName && (
                        <span className="text-xs text-slate-400">({call.recipientName})</span>
                      )}
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-white/5 text-slate-300">
                        {call.direction}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Employee: <span className="text-indigo-300 font-medium">{call.voiceAgent?.name || 'Voice Agent'}</span> • {new Date(call.createdAt).toLocaleString()}
                    </p>
                    {call.summary && (
                      <p className="text-xs text-slate-300 mt-1 italic line-clamp-1">
                        "{call.summary}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5">
                  {call.sentiment && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      call.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                      call.sentiment === 'negative' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-slate-500/10 text-slate-300'
                    }`}>
                      {call.sentiment}
                    </span>
                  )}

                  <div className="text-right">
                    <span className="text-sm font-medium text-white">{call.durationSeconds || 0}s</span>
                    <p className="text-xs text-slate-400">₹{call.estimatedCostInr || '0.00'}</p>
                  </div>

                  <Link
                    href={`/voiceforce/calls/${call.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
