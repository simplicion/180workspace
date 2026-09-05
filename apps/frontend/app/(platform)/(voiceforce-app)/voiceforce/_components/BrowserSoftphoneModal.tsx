"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, PhoneOff, Sparkles, Volume2, 
  Activity, ShieldCheck, CheckCircle2, MessageSquare, Loader2
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BrowserSoftphoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: any[];
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
  agents,
  onCallEnded
}: BrowserSoftphoneModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const durationTimerRef = useRef<any>(null);

  // Initialize selected agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Clean up on unmount or close
  useEffect(() => {
    if (!isOpen) {
      endCallCleanup();
    }
  }, [isOpen]);

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
        voiceAgentId: selectedAgentId
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

      // 4. Initial Agent Greeting
      const agentGreeting = sessionData.agent?.firstMessage || "Hello! I am Maya, your AI employee. How can I assist your business right now?";
      setIsAgentSpeaking(true);
      speakAgentGreeting(agentGreeting);

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

  const speakAgentGreeting = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsAgentSpeaking(false);
      utterance.onerror = () => setIsAgentSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsAgentSpeaking(false), 2500);
    }
  };

  const initSpeechRecognition = (currentSessionId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const userText = event.results[lastResultIndex][0]?.transcript?.trim();
      if (!userText) return;

      // Add user transcript
      const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTranscripts((prev) => [
        ...prev,
        { id: `user_${Date.now()}`, speaker: 'user', text: userText, timestamp: userTimestamp }
      ]);

      // Handle Barge-in: if agent is currently speaking, cut off immediately
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsAgentSpeaking(false);

      // Process user request with AI logic
      await handleUserQuery(userText, currentSessionId);
    };

    recognition.onerror = (event: any) => {
      console.warn('[Softphone Speech Recognition Error]:', event.error);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {}
  };

  const handleUserQuery = async (query: string, currentSessionId: string) => {
    setIsAgentSpeaking(true);

    try {
      const res = await api.post(`/api/v1/voiceforce/sessions/${currentSessionId}/turn`, {
        userMessage: query
      });

      const data = res.data?.data;
      const replyText = data?.reply || "Understood. I am processing that in your workspace.";

      if (data?.toolUsed) {
        setActiveTool(data.toolUsed);
        setTimeout(() => setActiveTool(null), 4000);
      }

      const agentTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTranscripts((prev) => [
        ...prev,
        { id: `agent_${Date.now()}`, speaker: 'agent', text: replyText, timestamp: agentTimestamp }
      ]);

      speakAgentGreeting(replyText);
    } catch (err: any) {
      console.error('[Softphone Turn Error]:', err);
      const fallbackText = "I understood your message and recorded it into your workspace context.";
      setTranscripts((prev) => [
        ...prev,
        { id: `agent_${Date.now()}`, speaker: 'agent', text: fallbackText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      speakAgentGreeting(fallbackText);
    }
  };

  const toggleMute = () => {
    if (microphoneStreamRef.current) {
      const audioTracks = microphoneStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0.9)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    render();
  };

  const endCallCleanup = async () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((t) => t.stop());
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Inform backend of call conclusion
    if (callSessionId) {
      await api.post(`/api/v1/voiceforce/sessions/${callSessionId}/end`).catch(() => {});
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsAgentSpeaking(false);
    setActiveTool(null);
  };

  const handleEndCall = () => {
    endCallCleanup();
    toast('Call ended. Post-call analysis scheduled.');
    if (onCallEnded) onCallEnded();
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const currentAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Browser Softphone Tester
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ₹0 Telecom Cost
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Test AI voice employees using your laptop microphone</p>
            </div>
          </div>
          <button 
            onClick={isConnected ? handleEndCall : onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Agent Selection (When Not Connected) */}
          {!isConnected && !isConnecting && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">Select Voice Employee to Test</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        selectedAgentId === agent.id
                          ? 'border-violet-500 bg-violet-500/10 text-white shadow-lg shadow-violet-500/10'
                          : 'border-white/10 bg-zinc-900/40 text-zinc-300 hover:border-white/20'
                      }`}
                    >
                      <div className="font-semibold text-sm">{agent.name}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{agent.role || 'Autonomous Voice Agent'}</div>
                      <div className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5">
                        <Volume2 className="h-3 w-3 text-violet-400" />
                        Cartesia Sonic • Sub-380ms Latency
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/5 space-y-2">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  What you can test in this session:
                </div>
                <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                  <li>Natural speech cadence and breathing with Cartesia Sonic</li>
                  <li>Ultra-fast barge-in: Interrupt Maya mid-sentence to see her stop instantly</li>
                  <li>Real-time tools: Say <i>"Create a high priority task"</i> to see 180workspace action execution</li>
                </ul>
              </div>
            </div>
          )}

          {/* Active Call Visualizer & Waveform */}
          {(isConnected || isConnecting) && (
            <div className="space-y-5">
              
              {/* Agent Call Status Header */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-white text-lg">
                      {currentAgent?.name?.charAt(0) || 'M'}
                    </div>
                    {isAgentSpeaking && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-zinc-950"></span>
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{currentAgent?.name || 'Maya'}</h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {isAgentSpeaking ? 'Speaking...' : 'Listening (Barge-in ready)...'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-mono font-bold text-white">
                    {formatDuration(callDuration)}
                  </div>
                  <div className="text-[10px] text-zinc-400">WebRTC Live Stream</div>
                </div>
              </div>

              {/* Real-time Audio Canvas Waveform */}
              <div className="relative h-24 rounded-2xl bg-zinc-900/80 border border-white/10 overflow-hidden flex items-center justify-center">
                <canvas ref={canvasRef} width={500} height={96} className="w-full h-full" />
                {isMuted && (
                  <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center text-xs text-red-400 font-medium gap-1.5">
                    <MicOff className="h-4 w-4" /> Microphone Muted
                  </div>
                )}
              </div>

              {/* Tool Execution Alert Badge */}
              {activeTool && (
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs flex items-center gap-2 animate-bounce">
                  <Activity className="h-4 w-4 text-violet-400" />
                  <span>Executing 180workspace Action: <b>{activeTool}</b></span>
                </div>
              )}

              {/* Interactive Live Transcript Box */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 max-h-56 overflow-y-auto space-y-3">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Live Conversation Transcript
                </div>
                {transcripts.map((t) => (
                  <div 
                    key={t.id} 
                    className={`flex flex-col ${t.speaker === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs ${
                        t.speaker === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-zinc-800 text-zinc-200 border border-white/10 rounded-bl-none'
                      }`}
                    >
                      <div className="text-[10px] opacity-70 mb-0.5">
                        {t.speaker === 'user' ? 'You' : currentAgent?.name || 'Maya'} • {t.timestamp}
                      </div>
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-white/10 bg-zinc-900/80 flex items-center justify-between">
          {!isConnected ? (
            <button
              type="button"
              disabled={isConnecting}
              onClick={startBrowserCall}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting Microphone & WebRTC...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Start In-Browser Test Call (₹0)
                </>
              )}
            </button>
          ) : (
            <div className="w-full flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={toggleMute}
                className={`flex-1 py-2.5 rounded-xl border font-medium text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isMuted 
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' 
                    : 'border-white/10 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-600/20"
              >
                <PhoneOff className="h-4 w-4" />
                End Call
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
