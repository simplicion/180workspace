import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Zap,
  Scissors,
  Camera,
  Subtitles,
  Volume2,
  Send,
  RotateCcw,
  Trash2,
  Undo2,
  Smartphone,
  Monitor,
  Film,
  Bot,
  User,
  Clock,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { DirectorStylePreset, EditIR } from "@workspace/video-contracts";
import { CompanyAIStatus } from "../services/tauri-bridge";

export interface DirectorChatMessage {
  id: string;
  sender: "user" | "director";
  text: string;
  timestamp: string;
  actions?: string[];
  snapshotEditIR?: EditIR;
}

interface AIDirectorPanelProps {
  currentPreset?: DirectorStylePreset;
  onSelectPreset?: (preset: DirectorStylePreset) => void;
  onApplyPrompt: (prompt: string) => Promise<void> | void;
  isProcessing: boolean;
  companyAIStatus?: CompanyAIStatus | null;
  onRefreshAIStatus?: () => void;
  messages: DirectorChatMessage[];
  onRevertToMessage?: (message: DirectorChatMessage) => void;
  onClearMessages?: () => void;
  currentAspect?: "16:9" | "9:16" | "1:1";
  timelineDurationSec?: number;
  clipsCount?: number;
}

const QUICK_PROMPTS = [
  {
    label: "📱 Instagram Reel (9:16 vertical & energetic)",
    prompt: "Create this video for Instagram reels, make sure it feels energetic, starts with a strong hook, trims dead pauses, and syncs bouncing captions.",
    icon: Smartphone,
  },
  {
    label: "✂️ Trim all silences & dead air (>400ms)",
    prompt: "Trim all silent pauses and dead air greater than 400ms across all clips.",
    icon: Scissors,
  },
  {
    label: "🎥 Add dynamic spring camera zooms",
    prompt: "Add spring camera zoom punches with motion blur on key speaker emphasis beats.",
    icon: Camera,
  },
  {
    label: "💬 Hormozi kinetic bouncing captions",
    prompt: "Generate Hormozi-style bouncing kinetic word-by-word captions with high contrast.",
    icon: Subtitles,
  },
  {
    label: "🔊 Auto-duck background music (-18dB)",
    prompt: "Auto-duck background music tracks -18dB whenever speech is active.",
    icon: Volume2,
  },
  {
    label: "🎬 Format for YouTube Widescreen (16:9)",
    prompt: "Format this video for YouTube widescreen 16:9 with smooth pacing and clean camera pans.",
    icon: Monitor,
  },
];

export const AIDirectorPanel: React.FC<AIDirectorPanelProps> = ({
  currentPreset,
  onSelectPreset,
  onApplyPrompt,
  isProcessing,
  companyAIStatus,
  onRefreshAIStatus,
  messages,
  onRevertToMessage,
  onClearMessages,
  currentAspect = "16:9",
  timelineDurationSec = 0,
  clipsCount = 0,
}) => {
  const [prompt, setPrompt] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isCloudConnected = companyAIStatus?.status === "connected";

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isProcessing) return;
    const currentPrompt = prompt.trim();
    setPrompt("");
    onApplyPrompt(currentPrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickPromptClick = (quickPromptText: string) => {
    if (isProcessing) return;
    onApplyPrompt(quickPromptText);
  };

  return (
    <div className="w-full flex-1 flex flex-col select-none relative bg-[#090A0D] text-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#1A1C23] bg-[#0C0E14] shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600/30 to-purple-600/20 border border-indigo-500/30 text-indigo-400 shadow-sm shadow-indigo-950">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-xs tracking-wide text-white">AI Creative Director</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Co-Pilot
                </span>
              </div>
              <span className="text-[9px] text-gray-400 block font-normal">
                Compiles deterministic Timeline AST • Zero pixel hallucination
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {onClearMessages && messages.length > 0 && (
              <button
                onClick={onClearMessages}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-[#1A1C23] transition text-xs"
                title="Clear conversation history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onRefreshAIStatus && (
              <button
                onClick={onRefreshAIStatus}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#1A1C23] transition"
                title="Refresh Engine Status"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Timeline Telemetry Bar */}
        <div className="flex items-center space-x-2 pt-1.5 border-t border-[#161820] text-[10px] text-gray-400">
          <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#13151D] border border-[#1F222E]">
            {currentAspect === "9:16" ? (
              <Smartphone className="w-3 h-3 text-pink-400" />
            ) : (
              <Monitor className="w-3 h-3 text-cyan-400" />
            )}
            <span className="font-medium text-gray-300">{currentAspect} Canvas</span>
          </div>

          <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#13151D] border border-[#1F222E]">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{timelineDurationSec.toFixed(1)}s</span>
          </div>

          <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#13151D] border border-[#1F222E]">
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>{clipsCount} {clipsCount === 1 ? "Clip" : "Clips"}</span>
          </div>

          <div className="ml-auto flex items-center space-x-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? "bg-emerald-400 animate-pulse" : "bg-indigo-400"}`} />
            <span className="text-[9px] font-mono text-gray-400">
              {isCloudConnected ? "Cloud LLM" : "Offline AST"}
            </span>
          </div>
        </div>
      </div>

      {/* Conversational Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin scrollbar-thumb-[#1F222E] scrollbar-track-transparent">
        {/* Welcome Greeting from Director */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/30 via-[#10121A] to-[#0D0F16] border border-indigo-500/20 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-indigo-200">Creative Director Ready</span>
              <span className="text-[9px] text-gray-400 block font-mono">100% Non-Destructive Video Direction</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            Upload your clips, then talk to me in normal conversation. Tell me how you want your video styled (e.g. <span className="text-indigo-300 italic">"Create this for Instagram reels, energetic pacing, hook the viewer, and sync bounce captions"</span>).
          </p>
          <div className="mt-2.5 pt-2 border-t border-indigo-500/15 flex items-center space-x-1.5 text-[10px] text-indigo-300/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Zero pixel hallucination: I compile edits directly into your timeline AST.</span>
          </div>
        </div>

        {/* Message Thread */}
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
            >
              <div className="flex items-center space-x-1.5 px-1 text-[9px] text-gray-500">
                {isUser ? (
                  <>
                    <span>{msg.timestamp}</span>
                    <span className="font-semibold text-gray-400">You</span>
                    <User className="w-3 h-3 text-gray-400" />
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span className="font-semibold text-indigo-300">Director</span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[92%] rounded-xl p-3 text-xs leading-relaxed transition shadow-sm ${
                  isUser
                    ? "bg-indigo-600/20 text-indigo-100 border border-indigo-500/30 rounded-tr-sm"
                    : "bg-[#12141C] text-gray-200 border border-[#1E212D] rounded-tl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Director AST Action Badges */}
                {!isUser && msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#1C1F2B] space-y-1.5">
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 block">
                      Compiled AST Directives:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {msg.actions.map((act, aIdx) => (
                        <span
                          key={aIdx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-[#0A0B0F] border border-[#232736] text-indigo-300 font-medium inline-flex items-center space-x-1"
                        >
                          <span>{act}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Undo / Revert Button */}
                {!isUser && msg.snapshotEditIR && onRevertToMessage && (
                  <div className="mt-2.5 pt-1.5 flex justify-end">
                    <button
                      onClick={() => onRevertToMessage(msg)}
                      className="inline-flex items-center space-x-1 text-[10px] text-gray-400 hover:text-indigo-300 transition py-0.5 px-1.5 rounded hover:bg-[#1A1C27]"
                      title="Revert timeline back to before this prompt"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>Revert this step</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center space-x-1.5 px-1 text-[9px] text-gray-500">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
              <span className="font-semibold text-indigo-300">Director</span>
              <span>Thinking...</span>
            </div>
            <div className="rounded-xl p-3 bg-[#12141C] border border-indigo-500/30 rounded-tl-sm flex items-center space-x-2 text-xs text-indigo-300">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-[11px] text-gray-300">Analyzing cadence & compiling Timeline AST...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Conversational Starters Chips */}
      <div className="px-3 pt-2 pb-1.5 border-t border-[#171922] bg-[#0A0C12] shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-500">
            Quick Directives
          </span>
          <span className="text-[9px] text-gray-600">Click to direct</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_PROMPTS.map((qp, idx) => {
            const QPIcon = qp.icon;
            return (
              <button
                key={idx}
                onClick={() => handleQuickPromptClick(qp.prompt)}
                disabled={isProcessing}
                className="whitespace-nowrap flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#12141D] hover:bg-indigo-950/40 hover:border-indigo-500/50 border border-[#1F2230] text-[10px] text-gray-300 hover:text-indigo-200 transition active:scale-95 disabled:opacity-40 shrink-0"
              >
                <QPIcon className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversational Input Bar */}
      <div className="p-2.5 border-t border-[#1A1C24] bg-[#0D0F17] shrink-0">
        <form onSubmit={handleSubmit} className="relative flex flex-col space-y-1.5">
          <div className="relative flex items-center">
            <textarea
              ref={textareaRef}
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Direct AI: e.g., 'Make this an energetic Instagram Reel with hook & bounce captions'..."
              disabled={isProcessing}
              className="w-full bg-[#12141D] text-xs text-gray-100 placeholder-gray-500 pl-3 pr-10 py-2 rounded-xl border border-[#202434] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 focus:outline-none transition resize-none disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isProcessing}
              className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-95 text-white disabled:opacity-30 transition shadow-md shadow-indigo-950/50 flex items-center justify-center"
              title="Send directive to AI Director (Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[9px] text-gray-500 px-1">
            <span className="flex items-center space-x-1">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              <span>Directs native engine AST • Non-destructive</span>
            </span>
            <span className="font-mono text-gray-500">Press Enter ↵</span>
          </div>
        </form>
      </div>
    </div>
  );
};
