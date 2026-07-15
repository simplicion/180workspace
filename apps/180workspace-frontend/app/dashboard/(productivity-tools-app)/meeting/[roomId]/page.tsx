'use client';


import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Loader2, Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Users, MessageSquare, Radio, Circle, Download, X, Languages, FileText, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useModal } from '@/lib/modal-context';
import { useSettings } from '@/lib/settings-context';

// Type for transcript entries
interface TranscriptEntry {
    name: string;
    text: string;
    timestamp: Date;
    isAi?: boolean;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

export default function MeetingRoom() {
    const { roomId } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const modal = useModal();
    const { platform } = useSettings();
    const pName = platform?.platformName || 'System';
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [meetingInfo, setMeetingInfo] = useState<any>(null);

    // Refs
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const jitsiApiRef = useRef<any>(null);
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // UI state
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [showParticipants, setShowParticipants] = useState(false);

    useEffect(() => {
        if (!roomId || !user) return;
        validateAccess();

        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, [roomId, user]);

    const validateAccess = async () => {
        try {
            const { data } = await api.get(`/api/meeting/validate/${roomId}`);
            setIsValid(true);
            setMeetingInfo(data.meeting || { title: 'Direct Call' });
            loadJitsiScript();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Access denied');
            router.push('/dashboard/calendar');
        } finally {
            setLoading(false);
        }
    };

    const loadJitsiScript = () => {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => initJitsi();
        document.body.appendChild(script);
    };

    const initJitsi = () => {
        if (!jitsiContainerRef.current) return;

        const domain = 'meet.jit.si';
        const options = {
            roomName: roomId,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: user?.name,
                email: user?.email
            },
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false,
                enableWelcomePage: false,
            }
        };

        const apiInstance = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = apiInstance;

        apiInstance.addEventListeners({
            readyToClose: () => handleLeave(),
            videoConferenceJoined: () => handleJoin(),
            videoConferenceLeft: () => handleLeave(),
        });
    };

    const handleJoin = async () => {
        try {
            await api.post('/api/meeting/log/join', {
                roomId,
                meetingId: meetingInfo?.id || null
            });
        } catch (err) {
            console.error('Failed to log join:', err);
        }
    };

    const handleLeave = async () => {
        try {
            await api.post('/api/meeting/log/leave', { roomId });
        } catch (err) {
            console.error('Failed to log leave:', err);
        } finally {
            router.push('/dashboard');
        }
    };

    const toggleLocalRecording = async () => {
        if (isRecording) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                setIsRecording(false);
                toast.success('Recording stopped. Saving file...');
            }
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });

                const recorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9,opus'
                });

                recordedChunksRef.current = [];
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) recordedChunksRef.current.push(e.data);
                };

                recorder.onstop = () => {
                    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `${pName}-Meeting-${roomId}-${new Date().toISOString().slice(0, 10)}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }, 100);
                    stream.getTracks().forEach(track => track.stop());
                };

                recorder.start();
                mediaRecorderRef.current = recorder;
                setIsRecording(true);
                toast.success('Local recording started. Please share your screen.');
            } catch (err) {
                console.error('Recording failed:', err);
                toast.error('Failed to start recording.');
            }
        }
    };

    const toggleTranscription = () => {
        if (isTranscribing) {
            recognitionRef.current?.stop();
            setIsTranscribing(false);
            toast.success('Transcription paused');
        } else {
            try {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    toast.error('Web Speech API is not supported in this browser.');
                    return;
                }

                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }
                    if (finalTranscript) {
                        addTranscriptEntry(user?.name || 'Me', finalTranscript);
                    }
                };

                recognition.onend = () => {
                    if (isTranscribing) recognition.start();
                };

                recognition.start();
                recognitionRef.current = recognition;
                setIsTranscribing(true);
                setShowTranscript(true);
                toast.success('AI Transcription started');
            } catch (err) {
                console.error('Transcription start failed:', err);
                toast.error('Failed to start transcription');
            }
        }
    };

    const addTranscriptEntry = (name: string, text: string) => {
        setTranscripts(prev => [...prev, {
            name,
            text,
            timestamp: new Date()
        }]);
    };

    useEffect(() => {
        if (transcriptEndRef.current) {
            transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcripts]);

    const handleFinishMeeting = async () => {
        if (transcripts.length === 0) {
            handleLeave();
            return;
        }

        const ok = await modal.confirm({
            title: 'Finish Meeting',
            message: 'Are you sure you want to finish this meeting and generate an AI summary?',
            confirmText: 'Finish & Generate',
            variant: 'info'
        });
        if (!ok) return;

        const toastId = toast.loading('Processing meeting data with AI...');
        try {
            const fullTranscript = transcripts.map(t => `${t.name}: ${t.text}`).join('\n');
            await api.post('/api/meeting/ai/process', {
                roomId,
                transcript: fullTranscript,
                title: meetingInfo?.title || `${pName} Meeting`,
                participants: [...new Set(transcripts.map(t => t.name))]
            });
            toast.success('Meeting summary saved to Google Sheets!', { id: toastId });
            setTimeout(() => handleLeave(), 2000);
        } catch (err: any) {
            console.error('Failed to process meeting:', err);
            toast.error(err?.response?.data?.error || 'Failed to process meeting', { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                <p className="text-xl font-medium">Preparing your meeting room...</p>
            </div>
        );
    }

    if (!isValid) return null;

    return (
        <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 z-30">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Video className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-tight">{meetingInfo?.title || `${pName} Platform Meeting`}</h1>
                        <p className="text-slate-400 text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live • Room: {roomId}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTranscription}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                            isTranscribing ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        )}
                    >
                        <Languages className="w-4 h-4" />
                        {isTranscribing ? 'Transcribing...' : 'AI Transcript'}
                    </button>
                    <button
                        onClick={toggleLocalRecording}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                            isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        )}
                    >
                        <Radio className="w-4 h-4" />
                        {isRecording ? 'Recording...' : 'Record'}
                    </button>
                    <button
                        onClick={handleFinishMeeting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-sm font-semibold transition-all"
                    >
                        <PhoneOff className="w-4 h-4" />
                        Finish Meeting
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 relative bg-black">
                    <div ref={jitsiContainerRef} className="absolute inset-0" />
                </div>

                {/* Transcript Panel */}
                <aside className={clsx(
                    "w-80 bg-slate-800 border-l border-slate-700 flex flex-col transition-all duration-300",
                    showTranscript ? "translate-x-0" : "translate-x-full fixed right-0 h-full w-0"
                )}>
                    <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white font-semibold">
                            <Languages className="w-5 h-5 text-indigo-400" />
                            <span>Meeting Transcript</span>
                        </div>
                        <button onClick={() => setShowTranscript(false)} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {transcripts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 opacity-50">
                                <Languages className="w-12 h-12" />
                                <p className="text-xs text-center">No transcript yet. Start AI Transcript to capture discussion.</p>
                            </div>
                        ) : (
                            transcripts.map((t, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-indigo-400 font-bold uppercase">{t.name}</span>
                                        <span className="text-slate-500">{t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-slate-200 text-sm bg-slate-700/30 p-2.5 rounded-lg border border-slate-700/50">
                                        {t.text}
                                    </p>
                                </div>
                            ))
                        )}
                        <div ref={transcriptEndRef} />
                    </div>

                    <div className="p-4 border-t border-slate-700 bg-indigo-600/5">
                        <div className="flex items-center gap-2 mb-1 text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                            <Sparkles className="w-3 h-3" /> AI Active
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            Transcripts are being processed. Notes will be generated when you finish.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
