'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
    Video, ExternalLink, Copy, Check, ArrowLeft, Sparkles, Send,
    FileText, CheckSquare, Users, MessageSquare, Mic, MicOff, RefreshCw, Save,
    PhoneOff, Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { LogoLoader, ConfirmModal } from '@workspace/ui';

export default function MeetingHub() {
    const params = useParams();
    const roomId = params?.roomId as string;
    const router = useRouter();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [meetingInfo, setMeetingInfo] = useState<any>(null);
    const [meetingLogId, setMeetingLogId] = useState<string | null>(null);

    // Live Notes & Agenda State
    const [notes, setNotes] = useState('');
    const [agenda, setAgenda] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [copied, setCopied] = useState(false);

    // AI Meeting Assistant & Transcription
    const [transcriptInput, setTranscriptInput] = useState('');
    const [aiProcessing, setAiProcessing] = useState(false);
    const [aiSummary, setAiSummary] = useState<any>(null);
    const [aiChatMessages, setAiChatMessages] = useState<{ role: string; content: string }[]>([]);
    const [aiInput, setAiInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Finish modal
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [finishing, setFinishing] = useState(false);

    // Audio Transcription (optional helper)
    const [isTranscribing, setIsTranscribing] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (!roomId || !user) return;
        initializeMeeting();

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
        };
    }, [roomId, user]);

    async function initializeMeeting() {
        setLoading(true);
        try {
            // Validate access, retrieve room details, and check for existing AI summary in parallel
            const [validateRes, detailsRes, summaryRes] = await Promise.allSettled([
                api.get(`/api/meeting/validate/${roomId}`),
                api.get(`/api/meeting/room/${roomId}/details`),
                api.get(`/api/meeting/ai/summary/${roomId}`)
            ]);

            let info: any = {};
            if (validateRes.status === 'fulfilled') {
                info = { ...info, ...validateRes.value.data };
            }
            if (detailsRes.status === 'fulfilled' && detailsRes.value.data.log) {
                const log = detailsRes.value.data.log;
                info = { ...info, ...log };
                if (log.notes) setNotes(log.notes);
                if (log.agenda) setAgenda(log.agenda);
            }
            if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
                setAiSummary(summaryRes.value.data);
            }

            setMeetingInfo(info);

            // Log join
            const joinRes = await api.post('/api/meeting/log/join', {
                roomId,
                meetingId: info.meetingId || info.id || null
            });
            if (joinRes.data?.logId) {
                setMeetingLogId(joinRes.data.logId);
            }
        } catch (err: any) {
            console.error('Failed to initialize meeting:', err);
            toast.error(err?.response?.data?.error || 'Unable to access meeting');
            router.push('/meeting');
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveNotes() {
        setSavingNotes(true);
        try {
            await api.patch(`/api/meeting/${roomId}`, { notes, agenda });
            toast.success('Notes & agenda saved!');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to save notes');
        } finally {
            setSavingNotes(false);
        }
    }

    function copyMeetLink() {
        const link = meetingInfo?.meetingLink || `${window.location.origin}/meeting/${roomId}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Google Meet link copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
    }

    function launchGoogleMeet() {
        const link = meetingInfo?.meetingLink;
        if (link) {
            window.open(link, '_blank', 'noopener,noreferrer');
        } else {
            toast.error('No Google Meet link available');
        }
    }

    // Live browser transcription helper
    function toggleAudioTranscription() {
        if (isTranscribing) {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
                recognitionRef.current = null;
            }
            setIsTranscribing(false);
            toast.success('Live transcription paused');
            return;
        }

        try {
            const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRec) {
                toast.error('Web Speech API is not supported in this browser. You can paste notes directly into the box.');
                return;
            }

            const rec = new SpeechRec();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';

            rec.onresult = (e: any) => {
                let text = '';
                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    if (e.results[i].isFinal) {
                        text += e.results[i][0].transcript + ' ';
                    }
                }
                if (text) {
                    setTranscriptInput(prev => (prev ? prev + '\n' + text.trim() : text.trim()));
                }
            };

            rec.onerror = (err: any) => {
                console.warn('Speech recognition error:', err);
                setIsTranscribing(false);
            };

            rec.start();
            recognitionRef.current = rec;
            setIsTranscribing(true);
            toast.success('Microphone listening... Speaking will append to transcript below.', { icon: '🎙️' });
        } catch (err) {
            toast.error('Could not activate speech recognition.');
            setIsTranscribing(false);
        }
    }

    // AI Processing: Summarize and generate Work Graph project tasks
    async function handleProcessTranscript() {
        const fullContent = [
            notes ? `MEETING NOTES:\n${notes}` : '',
            transcriptInput ? `TRANSCRIPT / CONVERSATION:\n${transcriptInput}` : ''
        ].filter(Boolean).join('\n\n');

        if (!fullContent || fullContent.length < 15) {
            toast.error('Please enter notes or a transcript first (at least 15 characters).');
            return;
        }

        setAiProcessing(true);
        const toastId = toast.loading('AI is analyzing discussion & generating project tasks...');
        try {
            const { data } = await api.post('/api/meeting/ai/process', {
                roomId,
                transcript: fullContent,
                title: meetingInfo?.title || 'Meeting',
                participants: [user?.name || 'Host']
            });

            setAiSummary(data.data);
            toast.success('Meeting analyzed! Action items converted to Project Tasks.', { id: toastId });
        } catch (err: any) {
            console.error('AI processing error:', err);
            toast.error(err?.response?.data?.error || 'Failed to analyze meeting with AI', { id: toastId });
        } finally {
            setAiProcessing(false);
        }
    }

    // AI Copilot Chat
    async function handleSendAiChat(e: React.FormEvent) {
        e.preventDefault();
        const text = aiInput.trim();
        if (!text || isAiLoading) return;

        setAiInput('');
        setAiChatMessages(prev => [...prev, { role: 'user', content: text }]);
        setIsAiLoading(true);

        try {
            const contextText = [
                `Title: ${meetingInfo?.title || 'Meeting'}`,
                agenda ? `Agenda: ${agenda}` : '',
                notes ? `Notes: ${notes}` : '',
                transcriptInput ? `Transcript: ${transcriptInput}` : ''
            ].filter(Boolean).join('\n\n');

            const { data } = await api.post('/api/meeting/ai-chat', {
                meetingLogId: meetingLogId || roomId,
                message: `${text}\n\n[CONTEXT]:\n${contextText}`
            });

            setAiChatMessages(prev => [...prev, { role: 'ai', content: data.reply || 'No response.' }]);
        } catch (err: any) {
            toast.error('AI Assistant failed to respond');
        } finally {
            setIsAiLoading(false);
        }
    }

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiChatMessages]);

    async function confirmFinishMeeting() {
        setFinishing(true);
        try {
            await handleSaveNotes();
            await api.post('/api/meeting/log/leave', { roomId });
            setMeetingInfo((prev: any) => ({ ...prev, status: 'completed' }));
            toast.success('Meeting concluded & all records saved!');
        } catch (err: any) {
            toast.error('Failed to conclude meeting');
        } finally {
            setFinishing(false);
            setShowFinishModal(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
                <LogoLoader className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Loading Meeting Command Center...</p>
            </div>
        );
    }

    const meetLink = meetingInfo?.meetingLink || '';
    const attendees = meetingInfo?.attendees || meetingInfo?.participants || [];

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Top Navigation & Status Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/meeting')}
                        className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Back to Meetings"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
                                {meetingInfo?.title || 'Meeting Workspace'}
                            </h1>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono mt-0.5">
                            Room: {roomId}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={copyMeetLink}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    {meetLink && (
                        <a
                            href={meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                            <Video className="w-4 h-4" />
                            <span>Join Google Meet</span>
                            <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                    )}
                    <button
                        onClick={() => setShowFinishModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-800/40 text-xs font-semibold transition-colors cursor-pointer"
                    >
                        <PhoneOff className="w-3.5 h-3.5" />
                        <span>Finish & Save</span>
                    </button>
                </div>
            </div>

            {/* Google Meet Hero Launcher */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-xl shadow-emerald-950/10 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 backdrop-blur-3xl transform skew-x-12 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold uppercase tracking-wider text-white">
                            <Video className="w-3.5 h-3.5" />
                            <span>Native Google Meet Session</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Live Google Meet Room Ready
                        </h2>
                        <p className="text-emerald-50 text-xs sm:text-sm leading-relaxed">
                            Click <span className="font-semibold text-white">Join Google Meet</span> to start the video call in a new tab. Keep this 180workspace window active to track the agenda, capture collaborative notes, and let AI automatically convert action items into Work Graph project tasks.
                        </p>
                        {meetLink && (
                            <p className="text-xs text-white/80 font-mono bg-black/20 px-3 py-1.5 rounded-lg inline-block">
                                {meetLink}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        {meetLink ? (
                            <a
                                href={meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-sm shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                            >
                                <Video className="w-5 h-5 text-emerald-600" />
                                <span>Join on Google Meet</span>
                                <ExternalLink className="w-4 h-4 text-emerald-600" />
                            </a>
                        ) : (
                            <button
                                onClick={copyMeetLink}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition-all"
                            >
                                Share Room Link
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid: Workspace Notes (2/3) + Sidebar Copilot & Attendees (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ─── Left Column (2/3): Notes, Agenda, AI Summaries ─── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Live Collaborative Notes & Agenda */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-sm">Meeting Agenda & Live Notes</h3>
                            </div>
                            <button
                                onClick={handleSaveNotes}
                                disabled={savingNotes}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                            >
                                {savingNotes ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>Save Notes</span>
                            </button>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 block">
                                Meeting Agenda
                            </label>
                            <input
                                type="text"
                                value={agenda}
                                onChange={e => setAgenda(e.target.value)}
                                placeholder="Key discussion goals or agenda points..."
                                className="input text-xs dark:bg-zinc-950 dark:border-zinc-700"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 block">
                                Live Meeting Notes & Discussion Points
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={6}
                                placeholder="Document decisions, key discussion points, and takeaways in real-time..."
                                className="input text-xs dark:bg-zinc-950 dark:border-zinc-700 resize-none font-sans leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* AI Meeting Intelligence & Task Generator */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-zinc-800">
                            <div>
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                    <Sparkles className="w-4 h-4" />
                                    <span>AI Intelligence & Task Conversion</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                    Analyze live notes or transcripts to automatically extract summaries and create project tasks in 180workspace.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleAudioTranscription}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                                        isTranscribing
                                            ? "bg-red-50 text-red-600 border-red-300 dark:bg-red-950/40 dark:border-red-800 animate-pulse"
                                            : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 hover:bg-gray-50"
                                    )}
                                    title="Listen via microphone"
                                >
                                    {isTranscribing ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                                    <span>{isTranscribing ? 'Listening...' : 'Record Voice'}</span>
                                </button>
                                <button
                                    onClick={handleProcessTranscript}
                                    disabled={aiProcessing}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                                >
                                    {aiProcessing ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    <span>Generate AI Tasks</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 block">
                                Transcript / Discussion Log (Paste or auto-captured)
                            </label>
                            <textarea
                                value={transcriptInput}
                                onChange={e => setTranscriptInput(e.target.value)}
                                rows={5}
                                placeholder="Paste Google Meet transcription or let voice recording capture it here..."
                                className="input text-xs dark:bg-zinc-950 dark:border-zinc-700 resize-none font-mono"
                            />
                        </div>

                        {/* AI Summary Results (if generated) */}
                        {aiSummary && (
                            <div className="mt-4 p-5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                                        Executive Agenda & Summary
                                    </h4>
                                    <p className="text-xs text-gray-800 dark:text-zinc-200 leading-relaxed">
                                        {aiSummary.summary?.agenda || 'No summary agenda generated.'}
                                    </p>
                                </div>

                                {aiSummary.summary?.highlights && aiSummary.summary.highlights.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1.5">
                                            Discussion Highlights
                                        </h4>
                                        <ul className="list-disc list-inside text-xs text-gray-700 dark:text-zinc-300 space-y-1">
                                            {aiSummary.summary.highlights.map((h: string, i: number) => (
                                                <li key={i}>{h}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {aiSummary.actionItems && aiSummary.actionItems.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                                            <CheckSquare className="w-3.5 h-3.5" />
                                            <span>Converted Tasks in Projects ({aiSummary.actionItems.length})</span>
                                        </h4>
                                        <div className="space-y-2">
                                            {aiSummary.actionItems.map((task: any, idx: number) => (
                                                <div key={idx} className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-200/60 dark:border-emerald-800/40 flex items-start justify-between gap-3 shadow-xs">
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">{task.title}</p>
                                                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">{task.description}</p>
                                                    </div>
                                                    <span className={clsx(
                                                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md whitespace-nowrap",
                                                        task.priority === 'high' || task.priority === 'critical'
                                                            ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                    )}>
                                                        {task.priority || 'Medium'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Right Column (1/3): Attendees & AI Meeting Copilot ─── */}
                <div className="space-y-6">
                    {/* Attendees & Host Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-500" />
                                <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-sm">Meeting Host & Team</h3>
                            </div>
                            <span className="text-xs font-medium text-gray-400">
                                {attendees.length > 0 ? `${attendees.length} invited` : 'Direct Session'}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/60">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                                    {(meetingInfo?.createdBy?.name || user?.name || 'H')[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                                        {meetingInfo?.createdBy?.name || user?.name || 'Host'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 truncate">Meeting Organizer</p>
                                </div>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    Host
                                </span>
                            </div>

                            {attendees.map((att: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                                    <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                        {(att.name || att.email || 'A')[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800 dark:text-zinc-200 truncate">{att.name || att.email}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{att.email || 'Invited'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={copyMeetLink}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share Google Meet Link</span>
                        </button>
                    </div>

                    {/* Real-Time AI Meeting Copilot */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-col h-[420px]">
                        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-zinc-800">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-sm">Meeting AI Copilot</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto py-3 space-y-3 custom-scrollbar">
                            {aiChatMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                    <Sparkles className="w-8 h-8 text-indigo-300 dark:text-indigo-600 mb-2" />
                                    <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                        Ask AI anything about this meeting
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        e.g., &quot;Summarize the top 3 action items&quot; or &quot;Draft a follow-up email to attendees&quot;
                                    </p>
                                </div>
                            ) : (
                                aiChatMessages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={clsx(
                                            "flex flex-col text-xs leading-relaxed max-w-[88%]",
                                            msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                                        )}
                                    >
                                        <div
                                            className={clsx(
                                                "p-3 rounded-2xl shadow-xs",
                                                msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white rounded-br-xs'
                                                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-bl-xs'
                                            )}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isAiLoading && (
                                <div className="flex items-center gap-2 text-xs text-gray-400 p-2">
                                    <LogoLoader className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                    <span>AI is drafting answer...</span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleSendAiChat} className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex gap-2">
                            <input
                                type="text"
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                placeholder="Ask about meeting, notes, tasks..."
                                className="input flex-1 text-xs py-2 dark:bg-zinc-950 dark:border-zinc-700"
                                disabled={isAiLoading}
                            />
                            <button
                                type="submit"
                                disabled={isAiLoading || !aiInput.trim()}
                                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Finish Meeting Confirm Modal */}
            <ConfirmModal
                isOpen={showFinishModal}
                title="Finish Meeting & Save Report"
                message="Are you sure you want to conclude this meeting? Your notes and logs will be permanently saved to your workspace records."
                confirmText="Finish & Save"
                variant="info"
                loading={finishing}
                onConfirm={confirmFinishMeeting}
                onCancel={() => setShowFinishModal(false)}
            />
        </div>
    );
}
