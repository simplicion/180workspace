"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  PhoneCall, ArrowLeft, Bot, Clock, IndianRupee, ShieldCheck, 
  Sparkles, CheckCircle2, AlertCircle, Wrench, Play, Volume2,
  Download, Trash2, Search
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';

export default function VoiceforceCallDetailPage() {
  const { id } = useParams();
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCall = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/voiceforce/calls/${id}`);
      setCall(res.data?.data || null);
    } catch (err: any) {
      toast.error('Failed to load call details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCall();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-white">Call Session Not Found</h3>
        <Link href="/voiceforce/calls" className="text-xs text-indigo-400 mt-2 inline-block">
          Return to Calls
        </Link>
      </div>
    );
  }

  const router = useRouter();
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDownloadTranscript = () => {
    if (!call?.transcripts || call.transcripts.length === 0) {
      toast.error('No transcripts to download');
      return;
    }

    const content = [
      `180 WORKSPACE VOICEFORCE - CALL TRANSCRIPT`,
      `Call ID: ${call.id}`,
      `Date: ${new Date(call.createdAt).toLocaleString()}`,
      `Recipient: ${call.recipientPhone} (${call.recipientName || 'Unknown'})`,
      `Agent: ${call.voiceAgent?.name || 'AI Voice Employee'}`,
      `Duration: ${call.durationSeconds || 0} seconds`,
      `Cost: ₹${call.estimatedCostInr || '0.00'}`,
      `Outcome: ${call.callOutcome || 'Completed'}`,
      `Sentiment: ${call.sentiment || 'Neutral'}`,
      `Summary: ${call.summary || 'N/A'}`,
      `--------------------------------------------------`,
      ``,
      ...call.transcripts.map((t: any) => {
        const speaker = t.speaker === 'agent' ? (call.voiceAgent?.name || 'AI Employee') : 'Customer';
        const interrupted = t.interrupted ? ' [Interrupted]' : '';
        return `[${t.startTimeMs ? (t.startTimeMs / 1000).toFixed(1) + 's' : '0.0s'}] ${speaker}${interrupted}: ${t.text}`;
      })
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-${call.id}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded!');
  };

  const handleDeleteCall = async () => {
    if (!confirm('Are you sure you want to permanently delete this call session and transcript?')) return;
    try {
      setDeleting(true);
      await api.delete(`/api/v1/voiceforce/calls/${call.id}`);
      toast.success('Call session deleted.');
      router.push('/voiceforce/calls');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete call session');
    } finally {
      setDeleting(false);
    }
  };

  const filteredTranscripts = (call?.transcripts || []).filter((t: any) => {
    if (!transcriptSearch.trim()) return true;
    return t.text?.toLowerCase().includes(transcriptSearch.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/voiceforce/calls" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">{call.recipientPhone}</h1>
              {call.recipientName && <span className="text-sm text-slate-400">({call.recipientName})</span>}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                {call.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Call ID: <span className="font-mono text-slate-300">{call.id}</span> • {new Date(call.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            onClick={handleDownloadTranscript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export TXT</span>
          </button>

          <button
            onClick={handleDeleteCall}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>

          <div className="text-right pl-3 border-l border-white/10">
            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
              <IndianRupee className="w-4 h-4" />
              <span>₹{call.estimatedCostInr || '0.00'}</span>
            </div>
            <span className="text-xs text-slate-400">{call.durationSeconds || 0} seconds</span>
          </div>
        </div>
      </div>

      {/* Post-Call Summary Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/30 via-slate-900 to-purple-900/20 border border-indigo-500/30 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Autonomous Post-Call Extraction</h2>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed font-medium">
          {call.summary || 'Summary is being processed by Llama 3.3 analyzer...'}
        </p>

        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400">Outcome:</span>{' '}
            <span className="font-semibold text-indigo-300 capitalize">{call.callOutcome?.replace('_', ' ') || 'Completed'}</span>
          </div>
          <div>
            <span className="text-slate-400">Sentiment:</span>{' '}
            <span className={`font-semibold capitalize ${
              call.sentiment === 'positive' ? 'text-emerald-400' :
              call.sentiment === 'negative' ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {call.sentiment || 'Neutral'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">AI Employee:</span>{' '}
            <span className="font-semibold text-white">{call.voiceAgent?.name || 'Voice Agent'}</span>
          </div>
        </div>

        {Array.isArray(call.actionItems) && call.actionItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <span className="text-xs font-semibold text-slate-300">Auto-Created Tasks in 180workspace:</span>
            <ul className="mt-2 space-y-1">
              {call.actionItems.map((act: string, idx: number) => (
                <li key={idx} className="text-xs text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Audio Recording Player */}
      {call.recordingUrl && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Volume2 className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs font-semibold text-white">Call Audio Recording</div>
              <div className="text-[11px] text-emerald-400">Stored on Cloudflare R2 Object Storage (Zero-Egress CDN)</div>
            </div>
          </div>
          <audio controls src={call.recordingUrl} className="h-9 w-full sm:w-72 rounded-lg focus:outline-none" />
        </div>
      )}

      {/* Grid: Transcripts & Executed Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Synchronized Transcripts */}
        <div className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Full Conversation Transcript</h3>
              <span className="text-xs text-slate-400">({filteredTranscripts.length} turns)</span>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search dialogue..."
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {filteredTranscripts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              {transcriptSearch ? 'No dialogue matches your search.' : 'No transcript audio segments recorded for this session.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTranscripts.map((t: any) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                    t.speaker === 'agent'
                      ? 'bg-indigo-950/40 border-indigo-800/40 text-indigo-100 ml-4'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-200 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-indigo-300">
                      {t.speaker === 'agent' ? call.voiceAgent?.name || 'AI Employee' : 'Customer'}
                    </span>
                    {t.interrupted && (
                      <span className="text-rose-400 font-semibold">[Interrupted]</span>
                    )}
                  </div>
                  <p>{t.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Executed Tools & Telecom Metadata */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Executed Business Tools</h3>
            </div>

            {!call.toolExecutions || call.toolExecutions.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No tools invoked during call.</p>
            ) : (
              <div className="space-y-2">
                {call.toolExecutions.map((t: any) => (
                  <div key={t.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-indigo-300 font-mono font-semibold">
                      <span>{t.toolName}</span>
                      <span className="text-[10px] text-slate-400">{t.durationMs}ms</span>
                    </div>
                    <pre className="mt-1.5 p-2 rounded bg-black/40 text-[10px] font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(t.arguments, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-xs space-y-2">
            <h3 className="text-sm font-bold text-white mb-2">Technical Telephony Info</h3>
            <div className="flex justify-between text-slate-400">
              <span>Carrier</span>
              <span className="text-white">Telnyx SIP</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Media Engine</span>
              <span className="text-white">LiveKit SFU</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>STT Engine</span>
              <span className="text-white">Cartesia Ink-2 (Unified)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>TTS Engine</span>
              <span className="text-white">Cartesia Sonic (Unified)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
