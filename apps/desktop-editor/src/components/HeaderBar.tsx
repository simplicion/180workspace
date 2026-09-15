import React from "react";
import {
  Home,
  Sparkles,
  RotateCcw,
  RotateCw,
  Download,
  Sliders,
  Subtitles,
  HardDrive,
  FileCode,
  Save,
  CheckCircle2,
  Puzzle,
  Database,
  Flame,
  AlertTriangle,
  ExternalLink,
  PanelLeft,
} from "lucide-react";
import { CompanyAIStatus } from "../services/tauri-bridge";

interface HeaderBarProps {
  projectName: string;
  authSession?: {
    userName?: string;
    companyId?: string;
    isAuthenticated?: boolean;
  };
  companyAIStatus?: CompanyAIStatus | null;
  isAiProcessing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  aspectRatio: "16:9" | "9:16" | "1:1";
  onAspectRatioChange: (aspect: "16:9" | "9:16" | "1:1") => void;
  onOpenExport: () => void;
  onOpenCaptions: () => void;
  onOpenMixer: () => void;
  onOpenProxies: () => void;
  onOpenPlugins: () => void;
  onOpenCache: () => void;
  onOpenCritic: () => void;
  onExportOtio: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onNavigateHome?: () => void;
  isLeftPanelOpen?: boolean;
  onToggleLeftPanel?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  projectName,
  authSession,
  companyAIStatus,
  isAiProcessing,
  canUndo,
  canRedo,
  aspectRatio,
  onAspectRatioChange,
  onOpenExport,
  onOpenCaptions,
  onOpenMixer,
  onOpenProxies,
  onOpenPlugins,
  onOpenCache,
  onOpenCritic,
  onExportOtio,
  onSave,
  onUndo,
  onRedo,
  onNavigateHome,
  isLeftPanelOpen = true,
  onToggleLeftPanel,
}) => {
  return (
    <header className="h-12 border-b border-[#1F1F24] bg-[#0B0B0C] flex items-center justify-between px-3.5 z-30 select-none">
      {/* Left: Home Navigation & Project Identifier */}
      <div className="flex items-center space-x-2.5">
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#141417] hover:bg-[#1F1F24] text-zinc-300 hover:text-white border border-[#1F1F24] text-xs font-medium transition active:scale-95 shadow-sm group"
            title="Return to Projects & Files Home Screen"
          >
            <Home className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Projects</span>
          </button>
        )}

        {onToggleLeftPanel && (
          <button
            onClick={onToggleLeftPanel}
            className={`p-1.5 rounded-md border text-xs transition ${
              isLeftPanelOpen
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/30"
                : "bg-[#141417] text-zinc-400 hover:text-white border-[#1F1F24]"
            }`}
            title="Toggle Left Sidebar (Media Bin / AI Director)"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-4 w-px bg-[#1F1F24]" />

        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
            180
          </div>
          <span className="font-semibold text-xs tracking-tight text-zinc-200">Media Studio</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#141417] text-zinc-400 font-mono border border-[#1F1F24]">
            v1.0
          </span>
        </div>

        <div className="h-4 w-px bg-[#1F1F24]" />

        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-zinc-200 max-w-[140px] sm:max-w-[200px] truncate">
            {projectName}
          </span>
          <span className="text-[10px] text-emerald-400 flex items-center space-x-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Saved</span>
          </span>

          {authSession?.isAuthenticated && (
            <div className="hidden lg:flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#141417] border border-[#1F1F24] text-zinc-300 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-medium text-zinc-300 truncate max-w-[100px]">{authSession.userName}</span>
              <span className="text-[9px] text-zinc-500 truncate max-w-[80px]">({authSession.companyId})</span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Tools, Aspect Ratio & History Controls */}
      <div className="flex items-center space-x-2">
        {/* Studio Modal Triggers */}
        <div className="flex items-center space-x-1 bg-[#111114] p-1 rounded-lg border border-[#1F1F24]">
          <button
            onClick={onOpenCritic}
            className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold text-pink-300 hover:bg-[#1C1C22] transition"
            title="AI Critic & Pacing Retention Score"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Critic</span>
          </button>

          <button
            onClick={onOpenCaptions}
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium text-cyan-300 hover:bg-[#1C1C22] transition"
            title="Kinetic Subtitle Studio"
          >
            <Subtitles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Captions</span>
          </button>

          <button
            onClick={onOpenMixer}
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium text-emerald-300 hover:bg-[#1C1C22] transition"
            title="Audio Mixer & Speech Ducking"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mixer</span>
          </button>

          <button
            onClick={onOpenPlugins}
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium text-purple-300 hover:bg-[#1C1C22] transition"
            title="Sandboxed Plugins & Shaders (ADR-011)"
          >
            <Puzzle className="w-3.5 h-3.5 text-purple-400" />
            <span>Plugins</span>
          </button>

          <button
            onClick={onOpenCache}
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium text-zinc-300 hover:bg-[#1C1C22] hover:text-white transition"
            title="Content-Addressed Cache Storage (ADR-010)"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cache</span>
          </button>

          <button
            onClick={onExportOtio}
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium text-zinc-300 hover:bg-[#1C1C22] hover:text-white transition"
            title="Export OpenTimelineIO (Premiere / DaVinci)"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>OTIO</span>
          </button>
        </div>

        {/* Aspect Ratio Switcher */}
        <div className="flex items-center bg-[#111114] p-1 rounded-lg border border-[#1F1F24] text-xs">
          <button
            onClick={() => onAspectRatioChange("16:9")}
            className={`px-2 py-1 rounded font-medium transition ${
              aspectRatio === "16:9"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            16:9
          </button>
          <button
            onClick={() => onAspectRatioChange("9:16")}
            className={`px-2 py-1 rounded font-medium transition ${
              aspectRatio === "9:16"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            9:16
          </button>
          <button
            onClick={() => onAspectRatioChange("1:1")}
            className={`px-2 py-1 rounded font-medium transition ${
              aspectRatio === "1:1"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            1:1
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1C1C22] disabled:opacity-25 disabled:pointer-events-none transition"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1C1C22] disabled:opacity-25 disabled:pointer-events-none transition"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: AI Director Status & Action Buttons */}
      <div className="flex items-center space-x-2.5">
        {isAiProcessing ? (
          <div className="flex items-center space-x-2 bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs px-2.5 py-1 rounded-md animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-pink-400" />
            <span className="font-semibold">AI Directing...</span>
          </div>
        ) : companyAIStatus?.isConfigured ? (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/25">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">{companyAIStatus.provider.toUpperCase()} AI</span>
            <span className="text-[10px] text-zinc-400 hidden sm:inline">({companyAIStatus.model.split('/')[0].trim()})</span>
          </div>
        ) : (
          <button
            onClick={() => window.open("http://localhost:3002/settings/system-configs", "_blank")}
            className="flex items-center space-x-1 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-md border border-amber-500/30 transition active:scale-95"
            title="Configure OpenAI, Anthropic Claude, or Google Gemini in platform settings"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Configure AI</span>
            <ExternalLink className="w-2.5 h-2.5 text-amber-400/80" />
          </button>
        )}

        <button
          onClick={onSave}
          className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-200 bg-[#141417] hover:bg-[#1F1F24] hover:text-white px-3 py-1 rounded-md border border-[#1F1F24] transition shadow-sm"
        >
          <Save className="w-3.5 h-3.5 text-zinc-400" />
          <span>Save</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1 rounded-md shadow-sm transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
