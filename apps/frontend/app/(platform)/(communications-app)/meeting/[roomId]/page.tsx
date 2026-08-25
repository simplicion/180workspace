'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Users, MessageSquare, Radio, Circle, Download, X, Languages, FileText, Send, Sparkles, ArrowLeft, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useModal } from '@/lib/modal-context';
import { useSettings } from '@/lib/settings-context';
import { useMeeting } from '@/lib/meeting-context';

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
    const params = useParams();
    const roomId = params?.roomId;
    const router = useRouter();
    const { user } = useAuth();
    const modal = useModal();
    const { platform } = useSettings();
    const { startMeeting, minimizeMeeting, endMeeting: endMeetingCtx, meeting: meetingState, jitsiContainerRef, jitsiApiRef } = useMeeting();
    const pName = platform?.platformName || 'System';
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [meetingInfo, setMeetingInfo] = useState<any>(null);

    // Refs
    const fullscreenContainerRef = useRef<HTMLDivElement>(null);
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

    const [meetingLogId, setMeetingLogId] = useState<string | null>(null);
    const meetingLogIdRef = useRef<string | null>(null);
    const [aiChatMessages, setAiChatMessages] = useState<{role: string, content: string}[]>([]);
    const [aiInput, setAiInput] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!roomId || !user) return;

        // If meeting is already active in the context (returning from PiP), just reattach
        if (meetingState.isActive && meetingState.roomId === roomId && jitsiApiRef.current) {
            setIsValid(true);
            setMeetingInfo({ title: meetingState.title });
            setLoading(false);
            // Reattach container after render
            requestAnimationFrame(() => {
                if (jitsiContainerRef.current && fullscreenContainerRef.current) {
                    fullscreenContainerRef.current.appendChild(jitsiContainerRef.current);
                }
            });
            return;
        }

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
            const title = data.meeting?.title || data.title || 'Direct Call';
            setMeetingInfo({ ...(data.meeting || {}), title, isCreator: data.isCreator });
            startMeeting(roomId as string, title);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Access denied');
            router.push('/calendar');
        } finally {
            setLoading(false);
        }
    };

    // Load Jitsi script only after the component has rendered the fullscreenContainerRef
    useEffect(() => {
        if (isValid && !loading && !jitsiApiRef.current) {
            const loadJitsiScript = () => {
                if (window.JitsiMeetExternalAPI) {
                    initJitsi();
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://meet.ffmuc.net/external_api.js';
                script.async = true;
                script.onload = () => initJitsi();
                document.body.appendChild(script);
            };
            loadJitsiScript();
        }
    }, [isValid, loading]);

    const initJitsi = () => {
        if (!jitsiContainerRef.current || !fullscreenContainerRef.current) return;

        // Attach the persistent container to the fullscreen slot
        fullscreenContainerRef.current.appendChild(jitsiContainerRef.current);

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
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                SHOW_BRAND_WATERMARK: false,
                BRAND_WATERMARK_LINK: '',
                DEFAULT_LOGO_URL: '',
                DEFAULT_WELCOME_PAGE_LOGO_URL: '',
                HIDE_INVITE_MORE_HEADER: true
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

    // Reattach jitsi container when returning from PiP to fullscreen
    useEffect(() => {
        if (meetingState.isActive && !meetingState.isMinimized && jitsiContainerRef.current && fullscreenContainerRef.current) {
            if (jitsiContainerRef.current.parentNode !== fullscreenContainerRef.current) {
                fullscreenContainerRef.current.appendChild(jitsiContainerRef.current);
            }
        }
    }, [meetingState.isActive, meetingState.isMinimized]);

    const handleJoin = async () => {
        try {
            const { data } = await api.post('/api/meeting/log/join', {
                roomId,
                meetingId: meetingInfo?.id || null
            });
            if (data.logId) {
                setMeetingLogId(data.logId);
                meetingLogIdRef.current = data.logId;
                startAutoTranscription();
            }
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
            endMeetingCtx();
            router.back();
        }
    };

    const handleMinimize = () => {
        minimizeMeeting();
        router.back();
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

    const startAutoTranscription = () => {
        if (recognitionRef.current) return;
        
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                console.warn('Web Speech API is not supported in this browser. AI Transcription disabled.');
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
                // Always restart to keep recording the whole meeting
                recognition.start();
            };

            recognition.start();
            recognitionRef.current = recognition;
            setIsTranscribing(true);
            toast.success('Live AI transcription started automatically.', { icon: '🤖' });
        } catch (err) {
            console.error('Transcription start failed:', err);
        }
    };

    const addTranscriptEntry = async (name: string, text: string) => {
        setTranscripts(prev => [...prev, {
            name,
            text,
            timestamp: new Date()
        }]);

        if (meetingLogIdRef.current) {
            try {
                await api.post('/api/meeting/transcript', {
                    meetingLogId: meetingLogIdRef.current,
                    text
                });
            } catch (err) {
                console.error('Failed to save transcript:', err);
            }
        }
    };

    const sendAiMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiInput.trim() || !meetingLogId) return;

        const userText = aiInput.trim();
        setAiInput('');
        setAiChatMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsAiLoading(true);

        try {
            const { data } = await api.post('/api/meeting/ai-chat', {
                meetingLogId,
                message: userText
            });
            setAiChatMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
        } catch (err) {
            console.error('AI chat failed:', err);
            toast.error('AI Assistant failed to respond');
        } finally {
            setIsAiLoading(false);
        }
    };

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [aiChatMessages]);

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
            
            // Wait a moment then go to details page
            setTimeout(async () => {
                try { await api.post('/api/meeting/log/leave', { roomId }); } catch (e) {}
                endMeetingCtx();
                router.push('/meeting/${roomId}/details');
            }, 1000);
        } catch (err: any) {
            console.error('Failed to process meeting:', err);
            toast.error(err?.response?.data?.error || 'Failed to process meeting', { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
                <LogoLoader className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                <p className="text-xl font-medium">Preparing your meeting room...</p>
            </div>
        );
    }

    if (!isValid) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="h-14 bg-slate-800/90 backdrop-blur-lg border-b border-slate-700/50 flex items-center justify-between px-4 z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleMinimize}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-700/60 text-slate-300 hover:bg-slate-600 hover:text-white transition-all text-sm font-medium"
                        title="Minimize meeting"
                    >
                        <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Back</span>
                    </button>
                    <div className="h-6 w-px bg-slate-600" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h1 className="text-white font-semibold text-sm leading-tight truncate max-w-[200px]">{meetingInfo?.title || `${pName} Meeting`}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowTranscript(prev => !prev)}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                            showTranscript ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        )}
                    >
                        <Sparkles className="w-4 h-4" />
                        AI Assistant
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
                        onClick={handleMinimize}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 text-slate-300 hover:bg-slate-600 hover:text-white rounded-xl text-sm font-medium transition-all"
                        title="Minimize to PiP"
                    >
                        <Minimize2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Minimize</span>
                    </button>
                    {meetingInfo?.isCreator ? (
                        <button
                            onClick={handleFinishMeeting}
                            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-sm font-medium transition-all"
                        >
                            <PhoneOff className="w-4 h-4" />
                            End Call
                        </button>
                    ) : (
                        <button
                            onClick={handleLeave}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 text-slate-300 hover:bg-slate-600 hover:text-white rounded-xl text-sm font-medium transition-all"
                        >
                            <PhoneOff className="w-4 h-4" />
                            Leave Call
                        </button>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 relative bg-black" ref={fullscreenContainerRef} />

                {/* AI Assistant Panel */}
                <aside className={clsx(
                    "bg-slate-800 border-slate-700 flex flex-col transition-all duration-300 relative z-20 shadow-2xl",
                    showTranscript ? "w-80 lg:w-96 translate-x-0 border-l" : "w-0 translate-x-full overflow-hidden border-l-0"
                )}>
                    <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/90 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center gap-2 text-white font-semibold">
                            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                            </div>
                            <span>AI Assistant</span>
                        </div>
                        <button onClick={() => setShowTranscript(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-800/50">
                        {aiChatMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 opacity-70 mt-10">
                                <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-2">
                                    <Sparkles className="w-8 h-8 text-indigo-400/50" />
                                </div>
                                <p className="text-sm text-center max-w-[200px] leading-relaxed">
                                    I am actively transcribing this meeting in the background. Ask me to summarize or pull out key points at any time!
                                </p>
                            </div>
                        ) : (
                            aiChatMessages.map((msg, i) => (
                                <div key={i} className={clsx(
                                    "flex flex-col space-y-1 max-w-[90%]",
                                    msg.role === 'user' ? "items-end self-end ml-auto" : "items-start"
                                )}>
                                    <div className={clsx(
                                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                                        msg.role === 'user' 
                                            ? "bg-indigo-600 text-white rounded-br-sm" 
                                            : "bg-slate-700 text-slate-200 rounded-bl-sm border border-slate-600/50"
                                    )}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}
                        {isAiLoading && (
                            <div className="flex space-y-1 max-w-[85%] items-start">
                                <div className="px-4 py-3 rounded-2xl bg-slate-700 text-slate-200 rounded-bl-sm border border-slate-600/50 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-4 bg-slate-800 border-t border-slate-700">
                        <form onSubmit={sendAiMessage} className="relative flex items-center">
                            <input
                                type="text"
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder="Ask AI about the meeting..."
                                className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500 shadow-inner"
                                disabled={isAiLoading || !meetingLogId}
                            />
                            <button
                                type="submit"
                                disabled={isAiLoading || !aiInput.trim()}
                                className="absolute right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </aside>
            </div>
        </div>
    );
}
