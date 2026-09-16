import React from "react";
import {
  Home,
  Sparkles,
  RotateCcw,
  RotateCw,
  Download,
  Sliders,
  Subtitles,
  FileCode,
  Save,
  CheckCircle2,
  Puzzle,
  Database,
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
  aspectRatio?: "16:9" | "9:16" | "1:1";
  onAspectRatioChange?: (aspect: "16:9" | "9:16" | "1:1") => void;
  onOpenExport: () => void;
  onOpenCaptions: () => void;
  onOpenMixer: () => void;
  onOpenProxies?: () => void;
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
  onOpenExport,
  onOpenCaptions,
  onOpenMixer,
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
    <header className="h-12 border-b border-[#1C1C22] bg-[#08080A] flex items-center justify-between px-3 z-30 select-none">
      {/* Left: Navigation, Studio Identity & Project Details */}
      <div className="flex items-center space-x-2">
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#111114] hover:bg-[#18181E] text-zinc-300 hover:text-white border border-[#1C1C22] text-xs font-medium transition active:scale-95 shadow-sm group"
            title="Return to Projects & Files"
          >
            <Home className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
            <span className="font-medium">Projects</span>
          </button>
        )}

        {onToggleLeftPanel && (
          <button
            onClick={onToggleLeftPanel}
            className={`p-1.5 rounded-md border text-xs transition ${
              isLeftPanelOpen
                ? "bg-[#181822] text-white border-zinc-600"
                : "bg-[#111114] text-zinc-400 hover:text-white border-[#1C1C22] hover:bg-[#18181E]"
            }`}
            title="Toggle Media Bin / Assets Sidebar"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-4 w-px bg-[#1C1C22]" />

        {/* 180 Media Studio Brand Mark */}
        <div className="flex items-center space-x-2">
          <img src="/white-icon.svg" alt="180" className="w-5 h-5 object-contain" />
          <span className="font-semibold text-xs tracking-tight text-white">Media Studio</span>
        </div>

        <div className="h-4 w-px bg-[#1C1C22]" />

        {/* Project Name & Saved Indicator */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-zinc-200 max-w-[140px] sm:max-w-[200px] truncate">
            {projectName}
          </span>
          <span className="text-[10px] text-emerald-400 flex items-center space-x-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Saved</span>
          </span>

          {/* Clean Tenant Workspace Badge (No duplicate names) */}
          {authSession?.isAuthenticated && (
            <div className="hidden xl:flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#111114] border border-[#1F1F24] text-zinc-300 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-medium text-zinc-300 truncate max-w-[120px]">
                {authSession.userName || authSession.companyId || "Workspace"}
              </span>
              {authSession.companyId &&
                authSession.userName &&
                authSession.companyId !== authSession.userName && (
                  <span className="text-[10px] text-zinc-500 truncate max-w-[90px]">
                    ({authSession.companyId})
                  </span>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Studio Production Workspaces & Pipelines */}
      <div className="flex items-center space-x-1 bg-[#111114] p-0.5 rounded-lg border border-[#1F1F24]">
        {/* Core Studio Editors */}
        <button
          onClick={onOpenCaptions}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#1C1C22] transition"
          title="Captions & Subtitles Studio"
        >
          <Subtitles className="w-3.5 h-3.5 text-zinc-400" />
          <span>Captions</span>
        </button>

        <button
          onClick={onOpenMixer}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#1C1C22] transition"
          title="Multitrack Audio Mixer & Ducking"
        >
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>Mixer</span>
        </button>

        <button
          onClick={onOpenCritic}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#1C1C22] transition"
          title="Pacing & Retention Review"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          <span>Critic</span>
        </button>

        <div className="h-3.5 w-px bg-[#1F1F24] mx-0.5" />

        {/* Extensions & Pipelines */}
        <button
          onClick={onOpenPlugins}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#1C1C22] transition"
          title="Sandboxed Plugins & Shaders"
        >
          <Puzzle className="w-3.5 h-3.5 text-zinc-400" />
          <span>Plugins</span>
        </button>

        <button
          onClick={onOpenCache}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#1C1C22] transition"
          title="Cache & Storage Management"
        >
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <span>Cache</span>
        </button>

        <button
          onClick={onExportOtio}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#1C1C22] transition"
          title="Export OpenTimelineIO (Premiere / DaVinci Resolve)"
        >
          <FileCode className="w-3.5 h-3.5 text-zinc-400" />
          <span>OTIO</span>
        </button>
      </div>

      {/* Right: History Undo/Redo, Engine Status & Actions */}
      <div className="flex items-center space-x-2">
        {/* Undo / Redo Group */}
        <div className="flex items-center bg-[#111114] p-0.5 rounded-lg border border-[#1F1F24]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1C1C22] disabled:opacity-25 disabled:pointer-events-none transition"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="h-3 w-px bg-[#1F1F24]" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1C1C22] disabled:opacity-25 disabled:pointer-events-none transition"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-[#1C1C22]" />

        {/* Engine Status (Clean, no vendor/OpenAI text) */}
        {isAiProcessing ? (
          <div className="flex items-center space-x-1.5 bg-[#141418] border border-[#22222A] text-zinc-300 text-xs px-2.5 py-1 rounded-md">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-zinc-300" />
            <span className="font-medium">Processing...</span>
          </div>
        ) : companyAIStatus?.isConfigured ? (
          <div
            className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 cursor-default"
            title="Studio Engine Online"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-medium text-emerald-300">Ready</span>
          </div>
        ) : (
          <button
            onClick={() => window.open("http://localhost:3002/settings/system-configs", "_blank")}
            className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-[#111114] hover:bg-[#18181E] px-2.5 py-1 rounded-md border border-[#1C1C22] transition active:scale-95"
            title="Configure Cloud Intelligence in Platform Settings"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span>Setup Engine</span>
            <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
          </button>
        )}

        {/* Save */}
        <button
          onClick={onSave}
          className="flex items-center space-x-1.5 text-xs font-medium text-zinc-200 bg-[#111114] hover:bg-[#18181E] hover:text-white px-3 py-1 rounded-md border border-[#1C1C22] transition shadow-sm active:scale-95"
          title="Save Project (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-zinc-400" />
          <span>Save</span>
        </button>

        {/* Primary Export */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 text-xs font-semibold text-black bg-white hover:bg-zinc-200 px-3.5 py-1 rounded-md shadow-sm transition active:scale-95"
          title="Export Video"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
