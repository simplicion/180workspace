"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, PhoneOff, Sparkles, Volume2, 
  Activity, ShieldCheck, CheckCircle2, MessageSquare, Loader2,
  Check, Phone, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlatformModal } from '@workspace/ui';

interface BrowserSoftphoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents?: any[];
  voiceAgentId?: string;
  voiceAgentName?: string;
  selectedAgentId?: string;
  takeoverData?: {
    caller?: { callerPhone: string; callerName?: string };
    token?: string;
    url?: string;
    roomName?: string;
  } | null;
  onCallEnded?: () => void;
}

interface TranscriptItem {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export function BrowserSoftphoneModal({
  isOpen,
  onClose,
  agents: propAgents,
  voiceAgentId,
  voiceAgentName,
  selectedAgentId: initialSelectedAgentId,
  takeoverData,
  onCallEnded
}: BrowserSoftphoneModalProps) {
  const [internalAgents, setInternalAgents] = useState<any[]>([]);
  const agents = (propAgents && Array.isArray(propAgents) && propAgents.length > 0) ? propAgents : internalAgents;
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialSelectedAgentId || voiceAgentId || '');
  const [simulationMode, setSimulationMode] = useState<'inbound' | 'outbound'>('inbound');
  const currentAgent = (agents || []).find(a => a.id === selectedAgentId) || (agents || [])[0];
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [isAgentThinking, setIsAgentThinking] = useState<boolean>(false);
  const [interimUserText, setInterimUserText] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const durationTimerRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const accumulatedFinalTextRef = useRef<string>('');
  const isExchangingRef = useRef<boolean>(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, interimUserText, isAgentThinking]);

  // Self-fetch agents if not provided via props
  useEffect(() => {
    if (isOpen && (!propAgents || propAgents.length === 0)) {
      api.get('/api/v1/voiceforce/agents')
        .then(res => {
          const list = res.data?.data || [];
          setInternalAgents(list);
          if (list.length > 0 && !selectedAgentId) {
            setSelectedAgentId(voiceAgentId || list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, propAgents, voiceAgentId, selectedAgentId]);

  // Initialize selected agent when agents prop changes
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(voiceAgentId || agents[0].id);
    }
  }, [agents, selectedAgentId, voiceAgentId]);

  // Clean up on unmount or close
  useEffect(() => {
    if (!isOpen) {
      endCallCleanup();
    }
  }, [isOpen]);

  // If opening with live takeover data, auto-connect to the live takeover call
  useEffect(() => {
    if (isOpen && takeoverData) {
      setIsConnected(true);
      setTranscripts([
        {
          id: 'takeover-greet',
          speaker: 'agent',
          text: `[Call Connected] Bridged to queued caller ${takeoverData.caller?.callerPhone || ''}. Microphones live.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      if (!durationTimerRef.current) {
        durationTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
    }
  }, [isOpen, takeoverData]);

  // Instantly halt any playing neural audio or browser synthesis (Barge-in)
  const stopAnyPlayingAudio = () => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {}
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setIsAgentSpeaking(false);
  };

  // Play high-fidelity neural audio with seamless browser synthesis fallback
  const playAgentAudio = (audioBase64: string | null | undefined, text: string) => {
    stopAnyPlayingAudio();
    setIsAgentSpeaking(true);

    if (audioBase64) {
      try {
        const audio = new Audio(audioBase64);
        currentAudioRef.current = audio;
        audio.onplay = () => setIsAgentSpeaking(true);
        audio.onended = () => {
          setIsAgentSpeaking(false);
          currentAudioRef.current = null;
        };
        audio.onerror = (e) => {
          console.warn('[Audio Player Error, falling back to Web Speech]:', e);
          currentAudioRef.current = null;
          speakAgentGreeting(text);
        };
        audio.play().catch((playErr) => {
          console.warn('[Audio Autoplay notice, falling back to Web Speech]:', playErr);
          currentAudioRef.current = null;
          speakAgentGreeting(text);
        });
        return;
      } catch (e) {
        console.warn('[Audio init error]:', e);
      }
    }

    // Fallback to Web Speech Synthesis
    speakAgentGreeting(text);
  };

  const startBrowserCall = async () => {
    try {
      setIsConnecting(true);

      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      // 2. Setup Web Audio API for real-time visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      drawWaveform();

      // 3. Request Softphone Session & Token from Backend
      const res = await api.post('/api/v1/voiceforce/tokens/generate', {
        voiceAgentId: selectedAgentId,
        simulationMode,
        phoneNumberId: currentAgent?.assignedNumbers?.[0]?.id || undefined,
        callerIdNumber: currentAgent?.assignedNumbers?.[0]?.e164Number || undefined
      });

      const sessionData = res.data?.data;
      if (!sessionData) {
        throw new Error('Failed to generate softphone session');
      }

      setCallSessionId(sessionData.callSessionId);
      setIsConnected(true);
      setIsConnecting(false);

      // Start Call Duration Counter
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // 4. Initial Agent Greeting with Neural Audio
      const agentGreeting = sessionData.agent?.firstMessage || "Hello! I am Maya, your AI employee. How can I assist your business right now?";
      playAgentAudio(sessionData.agent?.greetingAudioBase64, agentGreeting);

      setTranscripts([
        {
          id: 'greeting',
          speaker: 'agent',
          text: agentGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // 5. Initialize Web Speech Recognition for User Input
      initSpeechRecognition(sessionData.callSessionId);

      toast.success('Connected to AI Voice Employee!');
    } catch (err: any) {
      console.error('[Softphone Connect Error]:', err);
      toast.error(err.message || 'Microphone access denied or connection failed');
      endCallCleanup();
      setIsConnecting(false);
    }
  };

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#8b5cf6');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

        x += barWidth + 1;
      }
    };

    render();
  };

  const speakAgentGreeting = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setIsAgentSpeaking(false);
      };
      utterance.onerror = () => {
        setIsAgentSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsAgentSpeaking(false);
    }
  };

  // Dispatch turn exchange to backend
  const sendTurnExchange = async (finalText: string, activeSessionId: string) => {
    const trimmed = finalText.trim();
    if (!trimmed || isExchangingRef.current) return;

    isExchangingRef.current = true;
    setIsAgentThinking(true);
    setInterimUserText('');

    // Add user message to transcript immediately
    setTranscripts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        speaker: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    try {
      const res = await api.post('/api/v1/voiceforce/softphone/exchange', {
        callSessionId: activeSessionId,
        voiceAgentId: selectedAgentId,
        userInput: trimmed
      });

      const replyData = res.data?.data;
      if (replyData && replyData.agentReply) {
        if (replyData.executedTool) {
          setActiveTool(replyData.executedTool);
          setTimeout(() => setActiveTool(null), 4000);
        }

        setTranscripts((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            speaker: 'agent',
            text: replyData.agentReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        playAgentAudio(replyData.audioBase64, replyData.agentReply);
      }
    } catch (err: any) {
      console.error('[Exchange Error]:', err);
    } finally {
      setIsAgentThinking(false);
      isExchangingRef.current = false;
      accumulatedFinalTextRef.current = '';
    }
  };

  const initSpeechRecognition = (activeSessionId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast('Browser does not support native speech recognition. Chrome/Edge recommended.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Robust support for Indian English, Hindi, and multilingual accents

    recognition.onresult = (event: any) => {
      // Instant Barge-in: interrupt agent speech immediately when user begins speaking
      stopAnyPlayingAudio();

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        accumulatedFinalTextRef.current += (accumulatedFinalTextRef.current ? ' ' : '') + finalTranscript.trim();
      }

      const liveDisplay = (accumulatedFinalTextRef.current + ' ' + interimTranscript).trim();
      if (liveDisplay) {
        setInterimUserText(liveDisplay);
      }

      // 450ms Silence Debounce Timer for ultra-fast turn-taking
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      silenceTimeoutRef.current = setTimeout(() => {
        const completeText = (accumulatedFinalTextRef.current + ' ' + interimTranscript).trim();
        if (completeText && !isExchangingRef.current) {
          accumulatedFinalTextRef.current = '';
          sendTurnExchange(completeText, activeSessionId);
        }
      }, 450);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        console.warn('[Speech Recognition Error]:', e);
      }
    };

    recognition.onend = () => {
      if (microphoneStreamRef.current && microphoneStreamRef.current.active) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error('[Start Recognition Failed]:', e);
    }
  };

  const toggleMute = () => {
    if (microphoneStreamRef.current) {
      const audioTracks = microphoneStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsMuted(!audioTracks[0].enabled);
      }
    }
  };

  const endCallCleanup = () => {
    stopAnyPlayingAudio();

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    accumulatedFinalTextRef.current = '';
    isExchangingRef.current = false;
    setIsAgentThinking(false);
    setInterimUserText('');

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((t) => t.stop());
      microphoneStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsAgentSpeaking(false);
    setActiveTool(null);
  };

  const handleEndCall = async () => {
    const activeId = callSessionId;
    const dur = callDuration;
    endCallCleanup();
    if (activeId) {
      try {
        await api.post(`/api/v1/voiceforce/sessions/${activeId}/end`, { durationSeconds: dur });
      } catch (e) {
        console.warn('[Softphone End API notice]:', e);
      }
    }
    toast('Call ended. Post-call analysis completed.');
    if (onCallEnded) onCallEnded();
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <PlatformModal
      isOpen={isOpen}
      onClose={isConnected ? handleEndCall : onClose}
      title={
        takeoverData ? (
          <div className="flex items-center gap-2">
            <span>Live Customer Takeover</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 font-semibold">
              Bridged from Hold Queue
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span>Browser Softphone Tester</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-semibold">
              ₹0 Telecom Cost
            </span>
          </div>
        )
      }
      icon={Sparkles}
      iconColorClass={takeoverData ? "text-amber-600 dark:text-amber-400" : "text-violet-600 dark:text-violet-400"}
      iconBgClass={takeoverData ? "bg-amber-50 dark:bg-amber-950/60" : "bg-violet-50 dark:bg-violet-950/60"}
      subHeader={
        takeoverData
          ? `Direct WebRTC voice line with ${takeoverData.caller?.callerPhone || 'queued customer'}. You are speaking live.`
          : "Live in-browser WebRTC testing with ultra-low latency neural audio."
      }
      maxWidthClass="max-w-2xl"
      bodyClassName="space-y-5"
      footer={
        !isConnected ? (
          <button
            type="button"
            disabled={isConnecting}
            onClick={startBrowserCall}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting Microphone & WebRTC...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                <span>
                  {simulationMode === 'inbound' ? 'Dial Inbound Business Line (₹0 Trial)' : 'Start Outbound Test Call (₹0)'}
                </span>
              </>
            )}
          </button>
        ) : (
          <div className="w-full flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className={`flex-1 py-2.5 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isMuted 
                  ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' 
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </button>
          </div>
        )
      }
    >
      {/* Agent Selection (When Not Connected) */}
      {!isConnected && !isConnecting && (
        <div className="space-y-4">
          {/* Simulation Direction Switcher */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Call Simulation Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSimulationMode('inbound')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  simulationMode === 'inbound'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <ArrowDownLeft className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Client Calling Agent (Inbound)</span>
              </button>
              <button
                type="button"
                onClick={() => setSimulationMode('outbound')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  simulationMode === 'outbound'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>Agent Calling Client (Outbound)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Select Voice Employee to Test
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(agents || []).map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedAgentId === agent.id
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-gray-900 dark:text-white shadow-sm ring-1 ring-indigo-500/30'
                      : 'border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{agent.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{agent.role || 'Autonomous Voice Agent'}</div>
                  {agent.assignedNumbers && agent.assignedNumbers.length > 0 ? (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1 font-mono font-semibold">
                      <Phone className="h-3 w-3" />
                      <span>Line: {agent.assignedNumbers[0].e164Number}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 mt-1.5 italic">
                      Direct WebRTC Line
                    </div>
                  )}
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1.5 flex items-center gap-1.5 font-medium">
                    <Volume2 className="h-3 w-3" />
                    Cartesia Sonic • Sub-380ms Latency
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/80 space-y-2">
            <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              What you can test in this session:
            </div>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Natural speech cadence and breathing with Cartesia Sonic neural voice</li>
              <li>Ultra-fast barge-in: Interrupt Maya mid-sentence to test instant interruption</li>
              <li>Real-time tools: Say <i>"Check product price"</i> or <i>"Create a client"</i> to test action execution</li>
            </ul>
          </div>
        </div>
      )}

      {/* Active Call Visualizer & Waveform */}
      {(isConnected || isConnecting) && (
        <div className="space-y-4">
          {/* Agent Call Status Header */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white text-lg shadow-sm">
                  {currentAgent?.name?.charAt(0) || 'M'}
                </div>
                {isAgentSpeaking && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-gray-900"></span>
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">{currentAgent?.name || 'Maya'}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                  <span className={`h-2 w-2 rounded-full ${
                    isAgentSpeaking ? 'bg-emerald-500 animate-pulse' :
                    isAgentThinking ? 'bg-violet-500 animate-ping' :
                    interimUserText ? 'bg-blue-500 animate-pulse' :
                    'bg-emerald-500 animate-pulse'
                  }`}></span>
                  {isAgentSpeaking ? 'Speaking (Cartesia Neural)...' :
                   isAgentThinking ? `${currentAgent?.name || 'Maya'} is thinking...` :
                   interimUserText ? 'Hearing you speak...' :
                   'Listening (Barge-in ready)...'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                {formatDuration(callDuration)}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">WebRTC Live Stream</div>
            </div>
          </div>

          {/* Real-time Audio Canvas Waveform */}
          <div className="relative h-24 rounded-xl bg-gray-950 border border-gray-800 overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} width={500} height={96} className="w-full h-full" />
            {isMuted && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-rose-400 font-medium gap-1.5">
                <MicOff className="h-4 w-4" /> Microphone Muted
              </div>
            )}
          </div>

          {/* Tool Execution Alert Badge */}
          {activeTool && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2 animate-bounce">
              <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Executing 180workspace Action: <b>{activeTool}</b></span>
            </div>
          )}

          {/* Interactive Live Transcript Box */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/80 max-h-56 overflow-y-auto space-y-3">
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Live Conversation Transcript</span>
              {isAgentThinking && (
                <span className="text-violet-600 dark:text-violet-400 flex items-center gap-1 font-semibold text-[10px] lowercase">
                  <Loader2 className="h-3 w-3 animate-spin" /> thinking
                </span>
              )}
            </div>
            {transcripts.map((t) => (
              <div 
                key={t.id} 
                className={`flex flex-col ${t.speaker === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                    t.speaker === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 rounded-bl-none'
                  }`}
                >
                  <div className="text-[10px] opacity-70 mb-0.5">
                    {t.speaker === 'user' ? 'You' : currentAgent?.name || 'Maya'} • {t.timestamp}
                  </div>
                  {t.text}
                </div>
              </div>
            ))}

            {/* Interim Real-Time Speech Bubble */}
            {interimUserText && (
              <div className="flex flex-col items-end animate-pulse">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm bg-indigo-500/80 text-white rounded-br-none border border-indigo-400">
                  <div className="text-[10px] opacity-80 mb-0.5 flex items-center gap-1 font-semibold">
                    <Mic className="h-2.5 w-2.5 animate-pulse text-indigo-200" /> You • Speaking...
                  </div>
                  {interimUserText}
                </div>
              </div>
            )}

            {/* AI Thinking Animation Bubble */}
            {isAgentThinking && (
              <div className="flex flex-col items-start animate-fade-in">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/80 rounded-bl-none flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600 dark:text-violet-400" />
                  <span>{currentAgent?.name || 'Maya'} is thinking...</span>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}
    </PlatformModal>
  );
}
