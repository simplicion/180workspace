"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  PhoneCall, ArrowLeft, Bot, Clock, IndianRupee, ShieldCheck, 
  Sparkles, CheckCircle2, AlertCircle, Wrench, Play, Pause, Volume2,
  VolumeX, Download, Trash2, Search, User, Copy, Check, Radio, 
  Headphones, ListChecks, CheckSquare, Square, ArrowUpRight, Gauge, Calculator
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { locationService } from '@/lib/location-service';
import { UniversalSkeleton, ConfirmModal } from '@workspace/ui';
import clsx from 'clsx';

/**
 * 180 Voiceforce: Call Detail & Autonomous Intelligence Screen
 * 
 * Capabilities:
 * - Real-time Cartesia Ink-2 / Sonic-3 turn-by-turn dialogue transcript
 * - Post-call autonomous extraction via Groq Llama 3.3 (summary, sentiment, outcome)
 * - Autonomous Action Items checklist linked to enterprise tasks
 * - Executed Business Tools inspection (duration, arguments, JSON result)
 * - Custom HTML5 Audio Player for call recordings with scrubber and 1x/1.25x/1.5x speeds
 * - Telephony architecture metadata (Telnyx SIP + LiveKit SFU + Cartesia TTS)
 */
export default function VoiceforceCallDetailPage() {
  const { company } = useAuth();
  const { id } = useParams();
  const router = useRouter();
  const [call, setCall] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'transcript' | 'forensic'>('transcript');
  const [loading, setLoading] = useState(true);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Checked Action Items
  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({});

  const fetchCall = async () => {
    try {
      setLoading(true);
      const [res, auditRes] = await Promise.all([
        api.get(`/api/v1/voiceforce/calls/${id}`),
        api.get(`/api/v1/voiceforce/calls/${id}/audit-trail`).catch(() => ({ data: { logs: [] } }))
      ]);
      setCall(res.data?.data || null);
      setAuditLogs(auditRes.data?.logs || []);
    } catch (err: any) {
      toast.error('Failed to load call details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCall();
  }, [id]);

  const handleCopyId = () => {
    if (call?.id) {
      navigator.clipboard.writeText(call.id);
      setCopiedId(true);
      toast.success('Call ID copied to clipboard');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const toggleActionItem = (idx: number) => {
    setCompletedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Audio Player Handlers
  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDownloadTranscript = () => {
    if (!call?.transcripts || call.transcripts.length === 0) {
      toast.error('No transcripts to download for this session');
      return;
    }

    const content = [
      `==================================================`,
      `180 WORKSPACE VOICEFORCE - CALL TRANSCRIPT`,
      `==================================================`,
      `Call ID: ${call.id}`,
      `Date: ${new Date(call.createdAt).toLocaleString()}`,
      `Recipient: ${call.recipientPhone} (${call.recipientName || 'Customer'})`,
      `AI Employee: ${call.voiceAgent?.name || 'AI Voice Agent'}`,
      `Duration: ${call.durationSeconds || 0} seconds`,
      `Estimated Cost: ${call?.companyCurrencySymbol || '$'}${call.estimatedCostInr ? Number(call.estimatedCostInr).toFixed(2) : '0.00'}`,
      `Call Outcome: ${call.callOutcome || 'Completed'}`,
      `Sentiment: ${call.sentiment || 'Neutral'}`,
      `Summary: ${call.summary || 'N/A'}`,
      `--------------------------------------------------`,
      ``,
      ...call.transcripts.map((t: any) => {
        const speaker = t.speaker === 'agent' ? (call.voiceAgent?.name || 'AI Employee') : 'Customer';
        const interrupted = t.interrupted ? ' [Customer Interrupted]' : '';
        const time = t.startTimeMs ? `[${(t.startTimeMs / 1000).toFixed(1)}s]` : '[0.0s]';
        return `${time} ${speaker}${interrupted}:\n${t.text}\n`;
      })
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceforce-call-${call.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript exported successfully');
  };

  const handleDeleteCall = async () => {
    try {
      setDeleting(true);
      await api.delete(`/api/v1/voiceforce/calls/${call.id}`);
      toast.success('Call session deleted.');
      setIsDeleteModalOpen(false);
      router.push('/voiceforce/calls');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete call session');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm max-w-7xl mx-auto">
        <UniversalSkeleton type="detail" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Call Session Not Found</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          This call session ID does not exist or may have been deleted.
        </p>
        <Link 
          href="/voiceforce/calls" 
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm shadow-indigo-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Call Stream</span>
        </Link>
      </div>
    );
  }

  const filteredTranscripts = (call?.transcripts || []).filter((t: any) => {
    if (!transcriptSearch.trim()) return true;
    return t.text?.toLowerCase().includes(transcriptSearch.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'in_progress':
      case 'dialing':
      case 'ringing':
        return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 animate-pulse';
      case 'queued':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    }
  };

  // Extract action items (parse JSON if needed)
  const actionItemsList: string[] = Array.isArray(call.actionItems)
    ? call.actionItems
    : typeof call.actionItems === 'string'
      ? JSON.parse(call.actionItems || '[]')
      : [];

  // Combine executed tools from call.toolExecutions or call.toolCalls
  const toolExecutionsList: any[] = call.toolExecutions || call.toolCalls || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link 
            href="/voiceforce/calls" 
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200/60 dark:border-gray-700/60 flex-shrink-0"
            title="Back to Calls"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {call.recipientPhone}
              </h1>
              {call.recipientName && (
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  ({call.recipientName})
                </span>
              )}
              <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider", getStatusBadge(call.status))}>
                {call.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 uppercase">
                {call.direction || 'OUTBOUND'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
              <span className="flex items-center gap-1.5">
                Call ID: 
                <span className="font-mono text-gray-700 dark:text-gray-300 font-semibold">{call.id.slice(0, 16)}...</span>
                <button 
                  onClick={handleCopyId} 
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer p-0.5"
                  title="Copy full Call ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(call.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Top Header Actions & Cost */}
        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          <div className="text-right pr-2 border-r border-gray-100 dark:border-gray-800 hidden sm:block">
            <div className="text-base font-bold text-gray-900 dark:text-white flex items-center justify-end gap-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{call?.companyCurrencySymbol || '$'}</span>
              <span>{call.estimatedCostInr ? Number(call.estimatedCostInr).toFixed(2) : '0.00'}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Duration: {call.durationSeconds || 0}s ({call.billableMinutes || Math.ceil((call.durationSeconds || 0) / 60)} min)
            </p>
          </div>

          <button
            onClick={handleDownloadTranscript}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Export TXT</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800 text-xs font-semibold transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Carrier Disconnection / Failure Reason Banner */}
      {call.disconnectReason && (call.status === 'failed' || call.status === 'no_answer' || call.status === 'busy' || call.status === 'customer_declined') && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-300">Carrier Rejection / Disconnection Cause</h4>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">{call.disconnectReason}</p>
          </div>
        </div>
      )}

      {/* HTML5 Audio Waveform Player Widget (When Recording is Available) */}
      {call.recordingUrl && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 text-white shadow-md border border-indigo-800/60">
          <audio 
            ref={audioRef}
            src={call.recordingUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                className="w-12 h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 transition-transform active:scale-95 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Call Audio Recording</h3>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                    Stereo 24kHz
                  </span>
                </div>
                <p className="text-xs text-indigo-300 mt-0.5">
                  LiveKit SFU Egress Cloud Recording (Lossless SIP Audio)
                </p>
              </div>
            </div>

            {/* Playback Controls: Speeds & Scrubber */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 text-xs">
                {[1.0, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer",
                      playbackRate === speed ? "bg-white text-indigo-900 shadow-sm" : "text-indigo-200 hover:text-white"
                    )}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <button
                onClick={handleToggleMute}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <a
                href={call.recordingUrl}
                download={`call-${call.id}.mp3`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-colors cursor-pointer"
                title="Download Audio MP3"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Time Scrubber */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-mono text-indigo-300 w-10 text-right">
              {formatAudioTime(currentTime)}
            </span>
            <input 
              type="range"
              min="0"
              max={audioDuration || call.durationSeconds || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-indigo-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs font-mono text-indigo-300 w-10">
              {formatAudioTime(audioDuration || call.durationSeconds || 0)}
            </span>
          </div>
        </div>
      )}

      {/* Post-Call Autonomous Intelligence Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 dark:from-gray-900 dark:via-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/90 dark:border-indigo-900/40 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
            Autonomous Post-Call Intelligence (Llama 3.3 70B)
          </span>
        </div>

        <p className="text-base font-medium text-gray-800 dark:text-gray-200 leading-relaxed max-w-4xl">
          {call.summary || 'Post-call extraction is being finalized by Llama 3.3 analyzer. Synthesis will populate upon completion.'}
        </p>

        {/* Structured Tags */}
        <div className="mt-5 pt-4 border-t border-indigo-100/60 dark:border-indigo-900/30 flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400">Outcome:</span>
            <span className="font-semibold px-2.5 py-1 rounded-lg bg-indigo-100/70 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 capitalize">
              {(call.callOutcome || 'Completed').replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400">Customer Sentiment:</span>
            <span className={clsx(
              "font-semibold px-2.5 py-1 rounded-lg",
              call.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' :
              call.sentiment === 'Negative' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300' :
              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            )}>
              {call.sentiment || 'Neutral'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400">Assigned AI Agent:</span>
            <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {call.voiceAgent?.name || 'Autonomous AI Employee'}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Dialogue Transcript & Extracted Tools/Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Full Dialogue Transcript / Forensic Decision Inspector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tab Controls */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <button
                onClick={() => setActiveTab('transcript')}
                className={clsx(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === 'transcript'
                    ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <span>Dialogue Transcript</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {call.transcripts?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('forensic')}
                className={clsx(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === 'forensic'
                    ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Forensic Decision Inspector</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {auditLogs.length}
                </span>
              </button>
            </div>

            {/* Search Dialogue Input (Only on Transcript tab) */}
            {activeTab === 'transcript' && (
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dialogue phrases..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all placeholder:text-gray-400"
                />
              </div>
            )}
          </div>

          {/* Transcript Dialogue Feed */}
          {activeTab === 'transcript' ? (
            <div className="space-y-3">
              {filteredTranscripts.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 p-12 text-center rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">No transcript turns recorded</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                    Audio segments stream in real-time as speech is recognized and processed by Cartesia Ink-2.
                  </p>
                </div>
              ) : (
                filteredTranscripts.map((t: any, idx: number) => {
                  const isAgent = t.speaker === 'agent';
                  return (
                    <div
                      key={idx}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all",
                        isAgent
                          ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-100/90 dark:border-indigo-900/40 mr-4 sm:mr-8"
                          : "bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 ml-4 sm:ml-8"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={clsx(
                            "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold",
                            isAgent 
                              ? "bg-indigo-600 text-white" 
                              : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                          )}>
                            {isAgent ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {isAgent ? (call.voiceAgent?.name || 'AI Employee') : (call.recipientName || 'Customer')}
                          </span>
                          {t.interrupted && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60">
                              Interrupted
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                          {t.startTimeMs ? `${(t.startTimeMs / 1000).toFixed(1)}s` : '0.0s'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed pl-8">
                        {t.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Forensic Decision Inspector Tab Feed */
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 p-12 text-center rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-2">
                  <ShieldCheck className="w-10 h-10 text-gray-400 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Decision Logs Found</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Action audit logs are recorded turn-by-turn as the AI employee validates safety policies and executes business tools.
                  </p>
                </div>
              ) : (
                auditLogs.map((log: any, idx: number) => (
                  <div
                    key={log.id || idx}
                    className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          Turn #{log.turnIndex}
                        </span>
                        {log.detectedIntent && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 font-semibold">
                            Intent: {log.detectedIntent}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-gray-400">
                          ⚡ {log.latencyMs}ms
                        </span>
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border",
                          log.policyCheck === 'PASSED' ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300" :
                          log.policyCheck === 'BLOCKED' ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300" :
                          "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300"
                        )}>
                          {log.policyCheck}
                        </span>
                      </div>
                    </div>

                    {/* Customer Speech & Intent */}
                    <div className="space-y-1 text-xs">
                      <div className="text-gray-500 font-semibold">Customer Speech:</div>
                      <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                        &ldquo;{log.customerSpeech}&rdquo;
                      </p>
                    </div>

                    {/* Policy Reason if blocked/overridden */}
                    {log.policyReason && (
                      <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                        <strong>Policy Enforcement:</strong> {log.policyReason}
                      </div>
                    )}

                    {/* Tool Execution if any */}
                    {log.toolName && (
                      <div className="space-y-1 text-xs pt-1">
                        <div className="flex items-center justify-between text-gray-500 font-semibold">
                          <span>Tool Action: <strong className="text-indigo-600 dark:text-indigo-400">{log.toolName}</strong></span>
                        </div>
                        {log.toolArguments && (
                          <pre className="text-[10px] font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded-xl border border-gray-200/60 dark:border-gray-700 overflow-x-auto text-gray-700 dark:text-gray-300">
                            {typeof log.toolArguments === 'object' ? JSON.stringify(log.toolArguments, null, 2) : log.toolArguments}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Spoken Output */}
                    {log.agentUtterance && (
                      <div className="space-y-1 text-xs pt-1">
                        <div className="text-gray-500 font-semibold">AI Spoken Commitment:</div>
                        <p className="text-indigo-900 dark:text-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40">
                          {log.agentUtterance}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Extracted Action Items & Executed Tools & Telephony Engine */}
        <div className="space-y-6">
          {/* Action Items Checklist Card */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ListChecks className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Action Items & Follow-ups</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Extracted autonomously by Llama 3.3</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {actionItemsList.length} Tasks
              </span>
            </div>

            {actionItemsList.length === 0 ? (
              <div className="p-5 text-center rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No post-call action items required for this conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {actionItemsList.map((item, idx) => {
                  const isDone = !!completedItems[idx];
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleActionItem(idx)}
                      className={clsx(
                        "p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5",
                        isDone 
                          ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 text-gray-500 line-through" 
                          : "bg-gray-50 dark:bg-gray-800/60 border-gray-200/60 dark:border-gray-700 text-gray-900 dark:text-white"
                      )}
                    >
                      <button type="button" className="mt-0.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                        {isDone ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                      </button>
                      <span className="text-xs leading-relaxed flex-1">
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Executed Tools Card */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-100 dark:border-violet-900/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Executed Business Tools</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Real-time tools invoked during call</p>
              </div>
            </div>

            {toolExecutionsList.length > 0 ? (
              <div className="space-y-2.5">
                {toolExecutionsList.map((tc: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700 text-xs">
                    <div className="flex items-center justify-between font-semibold text-gray-900 dark:text-white mb-1">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{tc.toolName || tc.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">
                        {tc.durationMs ? `${tc.durationMs}ms` : 'Success'}
                      </span>
                    </div>
                    {tc.arguments && (
                      <pre className="text-[10px] bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto text-gray-600 dark:text-gray-300 font-mono mt-1">
                        {typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments, null, 2)}
                      </pre>
                    )}
                    {tc.result && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-200/50 dark:border-gray-700/50 text-[11px] text-gray-500 dark:text-gray-400">
                        Result: <span className="font-medium text-gray-800 dark:text-gray-200">{typeof tc.result === 'object' ? JSON.stringify(tc.result) : tc.result}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No automated business tools invoked during this session.
                </p>
              </div>
            )}
          </div>

          {/* Itemized Dynamic Rate Ledger Card */}
          {(() => {
            const ledger = call.structuredData?.financialLedger;
            const currencyCode = (call.companyCurrency || ledger?.currency || company?.currency || 'USD').toUpperCase();
            const currencySym = call.companyCurrencySymbol || ledger?.currencySymbol || company?.currencySymbol || locationService.getCurrencySymbol(currencyCode);
            const countryName = ledger?.destinationCountry || (call.recipientPhone?.startsWith('+91') ? 'India' : call.recipientPhone?.startsWith('+1') ? 'United States' : call.recipientPhone?.startsWith('+977') ? 'Nepal' : 'International');
            const dialPrefix = ledger?.dialCode || (call.recipientPhone?.startsWith('+91') ? '+91' : call.recipientPhone?.startsWith('+1') ? '+1' : call.recipientPhone?.startsWith('+977') ? '+977' : '+');
            const carrierRate = ledger ? `$${Number(ledger.carrierCostUsd).toFixed(4)} / min` : (dialPrefix === '+1' ? '$0.0090 / min' : dialPrefix === '+977' ? '$0.2640 / min' : '$0.0200 / min');
            const engineRate = ledger ? `$${Number(ledger.engineCostUsd).toFixed(4)} / min` : '$0.0205 / min';
            const realCostUsd = ledger ? `$${Number(ledger.realCostUsd).toFixed(4)} / min` : (dialPrefix === '+1' ? '$0.0295 / min' : dialPrefix === '+977' ? '$0.2845 / min' : '$0.0405 / min');
            const isUsdSym = currencyCode === 'USD';
            const defaultCustomerRate = isUsdSym
              ? (dialPrefix === '+1' ? '$0.053 / min' : dialPrefix === '+977' ? '$0.512 / min' : '$0.073 / min')
              : (dialPrefix === '+1' ? `${currencySym}4.40 / min` : dialPrefix === '+977' ? `${currencySym}42.70 / min` : `${currencySym}6.10 / min`);
            const customerRateLocal = ledger ? `${currencySym}${Number(ledger.customerRateLocal).toFixed(2)} / min` : defaultCustomerRate;
            const multiplier = ledger?.multiplier || 1.8;

            return (
              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Telephony Rate Ledger</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">1.8× Dynamic Margin Engine</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60">
                    USD Base + FX
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Destination</span>
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{dialPrefix}</span>
                      <span>{countryName}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Carrier PSTN (Telnyx)</span>
                    <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{carrierRate}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Voice Engine (Cartesia)</span>
                    <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{engineRate}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Real Cost (Wholesale USD)</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">{realCostUsd}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                    <span className="text-indigo-700 dark:text-indigo-300 font-medium">Platform Formula</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Real Cost × {multiplier}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 mt-1">
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block">Billed Rate</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Customer presentation</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                      {customerRateLocal}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Technical Telephony Architecture */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Telephony Infrastructure</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enterprise Voice Stack</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">SIP Carrier</span>
                <span className="font-semibold text-gray-900 dark:text-white">Telnyx Global SIP</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Media Gateway</span>
                <span className="font-semibold text-gray-900 dark:text-white">LiveKit SFU (WebRTC)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Speech-to-Text</span>
                <span className="font-semibold text-gray-900 dark:text-white">Cartesia Ink-2 (Zero Lag)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Text-to-Speech</span>
                <span className="font-semibold text-gray-900 dark:text-white">Cartesia Sonic-3 (90ms)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCall}
        title="Delete Call Session"
        description="Are you sure you want to permanently delete this call record and transcript? This action cannot be undone."
        confirmText={deleting ? "Deleting..." : "Delete Permanently"}
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
