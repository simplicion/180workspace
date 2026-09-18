import React, { useState } from "react";
import {
  Sparkles,
  Sliders,
  Folder,
  ChevronsLeft,
  ChevronsRight,
  Bot,
  Video,
  Layers,
  Wand2,
} from "lucide-react";
import { EditIR, DirectorStylePreset, VideoClip, Transition } from "@workspace/video-contracts";
import { AIDirectorPanel, DirectorChatMessage } from "./AIDirectorPanel";
import { ClipInspector } from "./ClipInspector";
import { AICriticDrawer } from "./AICriticDrawer";
import { CompanyAIStatus, AIDirectorProgressEvent } from "../services/tauri-bridge";

export type LeftSidebarTab = "director" | "inspector" | "critic";

interface LeftSidebarDockProps {
  activeTab: LeftSidebarTab;
  onTabChange: (tab: LeftSidebarTab) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  width: number;
  // Director Props
  currentPreset?: DirectorStylePreset;
  onSelectPreset?: (preset: DirectorStylePreset) => void;
  onApplyPrompt: (prompt: string) => Promise<void> | void;
  isAiProcessing: boolean;
  aiProgress?: AIDirectorProgressEvent | null;
  companyAIStatus?: CompanyAIStatus | null;
  onRefreshAIStatus?: () => void;
  aiMessages: DirectorChatMessage[];
  onRevertToAiMessage?: (msg: DirectorChatMessage) => void;
  onClearAiMessages?: () => void;
  currentAspect?: "16:9" | "9:16" | "1:1";
  timelineDurationSec?: number;
  clipsCount?: number;
  userProfile?: {
    name?: string;
    photoUrl?: string;
    email?: string;
  } | null;
  onConfirmAutonomousEdit?: (msg: DirectorChatMessage) => void;
  onCancelAutonomousEdit?: (msg: DirectorChatMessage) => void;
  // Inspector Props
  selectedClip: VideoClip | null;
  selectedClipId: string | null;
  currentTimeSeconds?: number;
  onUpdateTransform?: (transform: any) => void;
  onUpdateSpeed?: (speed: number) => void;
  onUpdateVolume?: (vol: number) => void;
  onUpdateTransitions?: (transitionIn?: Transition, transitionOut?: Transition) => void;
  onDetachAudio?: () => void;
  onDuplicateClip?: () => void;
  onDeleteClip?: () => void;
  onCloseInspector?: () => void;
  // Critic Props
  editIR: EditIR;
  onApplyCriticRepairs?: (repairs: any[]) => void;
}

export const LeftSidebarDock: React.FC<LeftSidebarDockProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onToggleOpen,
  width,
  currentPreset,
  onSelectPreset,
  onApplyPrompt,
  isAiProcessing,
  aiProgress,
  companyAIStatus,
  onRefreshAIStatus,
  aiMessages,
  onRevertToAiMessage,
  onClearAiMessages,
  currentAspect = "16:9",
  timelineDurationSec = 0,
  clipsCount = 0,
  userProfile,
  onConfirmAutonomousEdit,
  onCancelAutonomousEdit,
  selectedClip,
  selectedClipId,
  currentTimeSeconds = 0,
  onUpdateTransform,
  onUpdateSpeed,
  onUpdateVolume,
  onUpdateTransitions,
  onDetachAudio,
  onDuplicateClip,
  onDeleteClip,
  onCloseInspector,
  editIR,
  onApplyCriticRepairs,
}) => {
  if (!isOpen) {
    return (
      <div className="w-11 border-r border-[#1C1C22] bg-[#090A0F] flex flex-col items-center py-3 space-y-3 shrink-0 select-none z-20">
        {/* Expand Button with 180 Logo */}
        <button
          onClick={onToggleOpen}
          className="p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-[#181824] border border-indigo-500/20 transition flex flex-col items-center space-y-1 group"
          title="Expand Side Menu (<>)"
        >
          <img
            src="/white-icon.svg"
            onError={(e) => {
              e.currentTarget.src = "/white icon.svg";
            }}
            alt="180 AI"
            className="w-4 h-4 object-contain"
          />
          <ChevronsRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <div className="w-5 h-px bg-[#1C1C22]" />

        {/* Quick Tab Selectors when collapsed */}
        <button
          onClick={() => {
            onTabChange("director");
            onToggleOpen();
          }}
          className={`p-2 rounded-lg transition ${
            activeTab === "director"
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-[#15151C]"
          }`}
          title="Creative Director AI"
        >
          <Wand2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            onTabChange("inspector");
            onToggleOpen();
          }}
          className={`p-2 rounded-lg transition relative ${
            activeTab === "inspector"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-[#15151C]"
          }`}
          title="Clip Inspector"
        >
          <Sliders className="w-4 h-4" />
          {selectedClipId && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />
          )}
        </button>

        <button
          onClick={() => {
            onTabChange("critic");
            onToggleOpen();
          }}
          className={`p-2 rounded-lg transition ${
            activeTab === "critic"
              ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-[#15151C]"
          }`}
          title="AICritic QA & Retention"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ width: `${width}px` }}
      className="h-full border-r border-[#1C1C22] bg-[#090A0F] flex flex-col shrink-0 relative select-none overflow-hidden"
    >
      {/* 1. Universal Top Navigation Bar with 3 Tabs + Collapse Toggle */}
      <div className="h-11 border-b border-[#1C1C22] bg-[#0C0D14] flex items-center justify-between px-2 shrink-0">
        {/* Tab Pills */}
        <div className="flex items-center space-x-1 bg-[#12131C] p-0.5 rounded-lg border border-[#1F202B]">
          {/* Tab 1: Creative Director */}
          <button
            onClick={() => onTabChange("director")}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              activeTab === "director"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#181926]"
            }`}
            title="AI Creative Director"
          >
            <img
              src="/white-icon.svg"
              onError={(e) => {
                e.currentTarget.src = "/white icon.svg";
              }}
              alt="AI"
              className="w-3.5 h-3.5 object-contain"
            />
            <span>Director</span>
          </button>

          {/* Tab 2: Inspector */}
          <button
            onClick={() => onTabChange("inspector")}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition relative ${
              activeTab === "inspector"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#181926]"
            }`}
            title="Clip Transform & Audio Inspector"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Inspector</span>
            {selectedClipId && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>

          {/* Tab 3: Critic */}
          <button
            onClick={() => onTabChange("critic")}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              activeTab === "critic"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#181926]"
            }`}
            title="AICritic Retention QA"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Critic</span>
          </button>
        </div>

        {/* Collapse Button (<>) */}
        <button
          onClick={onToggleOpen}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#181926] border border-[#1F202B] transition"
          title="Collapse Side Menu (<>)"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Body based on activeTab */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "director" && (
          <AIDirectorPanel
            currentPreset={currentPreset}
            onSelectPreset={onSelectPreset}
            onApplyPrompt={onApplyPrompt}
            isProcessing={isAiProcessing}
            currentProgress={aiProgress}
            companyAIStatus={companyAIStatus}
            onRefreshAIStatus={onRefreshAIStatus}
            messages={aiMessages}
            onRevertToMessage={onRevertToAiMessage}
            onClearMessages={onClearAiMessages}
            currentAspect={currentAspect}
            timelineDurationSec={timelineDurationSec}
            clipsCount={clipsCount}
            selectedClipId={selectedClipId}
            userProfile={userProfile}
            onToggleCollapse={onToggleOpen}
            onConfirmAutonomousEdit={onConfirmAutonomousEdit}
            onCancelAutonomousEdit={onCancelAutonomousEdit}
          />
        )}

        {activeTab === "inspector" && (
          <div className="h-full flex flex-col overflow-y-auto">
            {selectedClip ? (
              <ClipInspector
                selectedClip={selectedClip}
                currentTimeSeconds={currentTimeSeconds}
                onUpdateTransform={onUpdateTransform || (() => {})}
                onUpdateSpeed={onUpdateSpeed || (() => {})}
                onUpdateVolume={onUpdateVolume || (() => {})}
                onUpdateTransitions={onUpdateTransitions}
                onDetachAudio={onDetachAudio || (() => {})}
                onDuplicateClip={onDuplicateClip || (() => {})}
                onDeleteClip={onDeleteClip || (() => {})}
                onClose={onCloseInspector || (() => {})}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#141419] border border-[#22222A] flex items-center justify-center text-zinc-500">
                  <Sliders className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-200">No Clip Selected</h4>
                <p className="text-xs text-zinc-500 max-w-[220px]">
                  Click any clip on the Remotion timeline to adjust scale, position, rotation, speed, and audio volume.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "critic" && (
          <div className="h-full flex flex-col overflow-y-auto">
            <AICriticDrawer
              isOpen={true}
              onClose={onToggleOpen}
              editIR={editIR}
              onExecutePrompt={onApplyPrompt}
              onApplyRepairs={onApplyCriticRepairs || (() => {})}
            />
          </div>
        )}
      </div>
    </div>
  );
};
