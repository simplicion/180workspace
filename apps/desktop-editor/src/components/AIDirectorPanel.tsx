import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Scissors,
  Camera,
  Subtitles,
  Flame,
  Coffee,
  Building,
  Wand2,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Volume2,
  Cpu,
} from "lucide-react";
import { DirectorStylePreset } from "@workspace/video-contracts";
import { CompanyAIStatus } from "../services/tauri-bridge";

interface AIDirectorPanelProps {
  currentPreset: DirectorStylePreset;
  onSelectPreset: (preset: DirectorStylePreset) => void;
  onApplyPrompt: (prompt: string) => void;
  isProcessing: boolean;
  companyAIStatus?: CompanyAIStatus | null;
  onRefreshAIStatus?: () => void;
}

const PRESET_CARDS: {
  id: DirectorStylePreset;
  title: string;
  desc: string;
  icon: any;
  color: string;
  badge: string;
}[] = [
  {
    id: "MRBEAST_FAST",
    title: "MrBeast Fast",
    desc: "Hyper-retention jump cuts, 1.35x snappy zoom punches, sound FX sync.",
    icon: Flame,
    color: "from-amber-500/20 to-red-500/20 text-amber-400 border-amber-500/40",
    badge: "1.3x Speed / Viral",
  },
  {
    id: "ALI_ABDAAL_CLEAN",
    title: "Ali Abdaal Clean",
    desc: "Thoughtful pacing, smooth spring camera zooms, minimal lower thirds.",
    icon: Coffee,
    color: "from-blue-500/20 to-teal-500/20 text-teal-400 border-teal-500/40",
    badge: "1.0x Pacing / Elegant",
  },
  {
    id: "HORMOZI_PUNCH",
    title: "Hormozi Punch",
    desc: "High vocal energy emphasis, bold word-by-word highlighted captions.",
    icon: Zap,
    color: "from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/40",
    badge: "Kinetic Captions / Bold",
  },
  {
    id: "SAAS_DEMO",
    title: "SaaS Product Demo",
    desc: "Auto-zoom on cursor focus, smooth camera pans, UI spotlighting.",
    icon: Building,
    color: "from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/40",
    badge: "Screen Focus / 60 FPS",
  },
];

export const AIDirectorPanel: React.FC<AIDirectorPanelProps> = ({
  currentPreset,
  onSelectPreset,
  onApplyPrompt,
  isProcessing,
  companyAIStatus,
  onRefreshAIStatus,
}) => {
  const [prompt, setPrompt] = useState("");

  const isAIConfigured = Boolean(companyAIStatus?.isConfigured);

  const quickActions = [
    { label: "Trim all silences > 400ms", icon: Scissors },
    { label: "Auto-zoom on speaker key points", icon: Camera },
    { label: "Add Hormozi kinetic captions", icon: Subtitles },
    { label: "Enhance pacing & B-roll timing", icon: Wand2 },
    { label: "Auto-duck background music (-18dB)", icon: Volume2 },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;
    if (!isAIConfigured) return;
    onApplyPrompt(prompt);
  };

  const handleOpenSettings = () => {
    window.open("http://localhost:3002/settings/system-configs", "_blank");
  };

  return (
    <div className="w-full flex-1 flex flex-col select-none relative bg-[#0E1118]">
      {/* Panel Header */}
      <div className="p-3 border-b border-[#222838] bg-[#0E1118]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2 text-indigo-400">
            <div className="p-1 rounded-md bg-indigo-500/10 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="font-semibold text-xs uppercase tracking-wider text-gray-200">AI Creative Director</span>
          </div>

          {onRefreshAIStatus && (
            <button
              onClick={onRefreshAIStatus}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1C2230] transition"
              title="Refresh AI Status"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Deterministic video intelligence powered by your company's platform AI configuration.
        </p>
      </div>

      {/* AI Configuration Status Card */}
      <div className="px-3 py-2.5 border-b border-[#222838] bg-[#141822]/50">
        {isAIConfigured ? (
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-emerald-300 block truncate">
                  {companyAIStatus?.model || "Platform AI Active"}
                </span>
                <span className="text-[9px] text-gray-400 block truncate">
                  Tenant: {companyAIStatus?.companyName || "180 Workspace"}
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              ONLINE
            </span>
          </div>
        ) : (
          /* Warning Banner if AI is NOT configured */
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1.5">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-amber-300 block">AI Not Configured</span>
                <p className="text-[10px] text-gray-300 leading-relaxed mt-0.5">
                  Your workspace requires an AI API key (OpenAI, Anthropic Claude, or Google Gemini) to direct videos.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center justify-center space-x-1.5 py-1 px-2.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] transition"
            >
              <span>Configure in Platform Settings</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Preset Cards List */}
      <div className="p-3 overflow-y-auto flex-1 space-y-2">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
          Director Style Presets
        </span>

        {PRESET_CARDS.map((card) => {
          const Icon = card.icon;
          const isSelected = currentPreset === card.id;

          return (
            <div
              key={card.id}
              onClick={() => onSelectPreset(card.id)}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "bg-[#1C2230] border-indigo-500 ring-1 ring-indigo-500/40"
                  : "bg-[#141822] border-[#222838] hover:border-[#38435C] hover:bg-[#1C2230]"
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded-md bg-[#0E1118] border border-[#222838] ${isSelected ? "text-indigo-400" : "text-gray-400"}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-100">{card.title}</span>
                </div>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed mb-1.5">{card.desc}</p>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#0E1118] border border-[#222838] text-gray-300">
                {card.badge}
              </span>
            </div>
          );
        })}

        {/* Quick Macro Actions */}
        <div className="pt-2">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
            Quick Directives
          </span>
          <div className="space-y-1">
            {quickActions.map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onApplyPrompt(action.label)}
                  disabled={isProcessing || !isAIConfigured}
                  className="w-full flex items-center space-x-2 p-1.5 rounded-md bg-[#141822] hover:bg-[#1C2230] border border-[#222838] text-left text-[11px] text-gray-300 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ActionIcon className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive AI Command Prompt Bar */}
      <div className="p-2.5 border-t border-[#222838] bg-[#141822]/70">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              isAIConfigured
                ? "Direct AI: e.g., 'Trim pauses, add kinetic zoom'..."
                : "Configure AI key above to start directing..."
            }
            disabled={isProcessing || !isAIConfigured}
            className="w-full bg-[#0E1118] text-xs text-gray-200 placeholder-gray-500 pl-2.5 pr-8 py-2 rounded-lg border border-[#222838] focus:border-indigo-500 focus:outline-none transition disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isProcessing || !isAIConfigured}
            className="absolute right-1 top-1 p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white disabled:opacity-30 transition shadow-sm"
            title="Send directive to AI Director"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[9px] text-gray-500 mt-1 px-0.5">
          <span>{companyAIStatus?.provider ? `${companyAIStatus.provider.toUpperCase()} ENGINE` : "180 WORKSPACE AI"}</span>
          <span>&lt;800 tokens</span>
        </div>
      </div>
    </div>
  );
};
