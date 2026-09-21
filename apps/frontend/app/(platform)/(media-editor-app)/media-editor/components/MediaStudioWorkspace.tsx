"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ProjectPackageManifest,
  DirectorStylePreset,
  MediaAssetDescriptor,
  EditIR,
  EditCommand,
  RationalTimeMath,
  Transform,
  CaptionSegment,
  VideoClip,
} from "@workspace/video-contracts";
import { HeaderBar } from "./HeaderBar";
import { AIDirectorPanel, DirectorChatMessage } from "./AIDirectorPanel";
import { AssetBin } from "./AssetBin";
import { CanvasViewport } from "./CanvasViewport";
import { Timeline } from "./Timeline";
import { ExportModal } from "./ExportModal";
import { ClipInspector } from "./ClipInspector";
import { CaptionStudioModal } from "./CaptionStudioModal";
import { AudioMixerPanel } from "./AudioMixerPanel";
import { ProxyGeneratorModal } from "./ProxyGeneratorModal";
import { AICriticDrawer } from "./AICriticDrawer";
import { PluginManagerModal } from "./PluginManagerModal";
import { CacheManagerModal } from "./CacheManagerModal";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { ColorScopesModal } from "./ColorScopesModal";
import { SilenceRemovalModal } from "./SilenceRemovalModal";
import { HomeScreen } from "./HomeScreen";
import { ResizableSplitter } from "./ResizableSplitter";
import { ProjectStorageService } from "../services/project-storage";
import { MediaCacheService } from "../services/media-cache";
import { Folder, Sparkles, ArrowLeft, Maximize2, Minimize2, ChevronsRight } from "lucide-react";
import { OtioService } from "../services/otio-service";
import { engineBridge, CompanyAIStatus, ExportResult } from "../services/tauri-bridge";
import toast from "react-hot-toast";
import { hasNativeMedia } from "@/lib/native/desktop-media";

function safeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface MediaStudioWorkspaceProps {
  initialProjectId?: string | null;
  initialTemplate?: string | null;
  onNavigateHome?: () => void;
  onExit?: () => void;
}

import { LeftSidebarDock, LeftSidebarTab } from "./LeftSidebarDock";

export const MediaStudioWorkspace: React.FC<MediaStudioWorkspaceProps> = ({
  initialProjectId,
  initialTemplate,
  onNavigateHome,
  onExit,
}) => {
  const [activeView, setActiveView] = useState<"home" | "editor">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("project") || params.get("projectId") || params.get("postId") || params.get("taskId")) return "editor";
    }
    return initialProjectId ? "editor" : "home";
  });

  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(360);
  const [timelineHeight, setTimelineHeight] = useState<number>(280);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState<LeftSidebarTab>("director");

  const [project, setProject] = useState<ProjectPackageManifest | null>(null);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState<any | null>(null);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCaptionsModalOpen, setIsCaptionsModalOpen] = useState(false);
  const [isMixerModalOpen, setIsMixerModalOpen] = useState(false);
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
  const [isCriticDrawerOpen, setIsCriticDrawerOpen] = useState(false);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [isCacheModalOpen, setIsCacheModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isScopesModalOpen, setIsScopesModalOpen] = useState(false);
  const [isSilenceModalOpen, setIsSilenceModalOpen] = useState(false);
  const [isDuckingEnabled, setIsDuckingEnabled] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedPath, setExportedPath] = useState<string | null>(null);
  const [exportedResult, setExportedResult] = useState<ExportResult | null>(null);
  const [companyAIStatus, setCompanyAIStatus] = useState<CompanyAIStatus | null>(null);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<EditIR[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [aiMessages, setAiMessages] = useState<DirectorChatMessage[]>([]);

  const [authSession, setAuthSession] = useState<{
    userName?: string;
    companyId?: string;
    userEmail?: string;
    isAuthenticated: boolean;
  }>({
    isAuthenticated: false,
  });

  const fetchCompanyAIStatus = async (compId?: string) => {
    try {
      const status = await engineBridge.getAIStatus(compId || authSession.companyId);
      setCompanyAIStatus(status);
    } catch (err) {
      console.warn("Failed to retrieve company AI status:", err);
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      const linkId = "google-fonts-180-studio";
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Inter:wght@400;700;900&family=Montserrat:wght@700;900&family=Outfit:wght@600;800&family=Poppins:wght@700;900&family=Roboto:wght@700;900&family=Syne:wght@700;800&display=swap";
        document.head.appendChild(link);
      }
    }

    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const projId = initialProjectId || params?.get("project");
    const template = initialTemplate || params?.get("template");
    const token = params?.get("token");
    const companyId = params?.get("companyId");
    const userName = params?.get("user");
    const userEmail = params?.get("email");

    if (token) localStorage.setItem("platform_auth_token", token);
    if (companyId) localStorage.setItem("platform_company_id", companyId);
    if (userName) localStorage.setItem("platform_user_name", userName);
    if (userEmail) localStorage.setItem("platform_user_email", userEmail);

    const resolvedUser = userName || localStorage.getItem("platform_user_name") || "Creator";
    const resolvedCompany = companyId || localStorage.getItem("platform_company_id") || "180 Workspace";
    const resolvedToken = token || localStorage.getItem("platform_auth_token");

    setAuthSession({
      userName: resolvedUser,
      companyId: resolvedCompany,
      userEmail: userEmail || localStorage.getItem("platform_user_email") || undefined,
      isAuthenticated: Boolean(resolvedToken || userName || companyId),
    });

    fetchCompanyAIStatus(resolvedCompany);

    if (projId) {
      loadProject(projId);
    } else {
      createNewProject(template || initialTemplate || "MRBEAST_FAST");
    }
  }, [initialProjectId, initialTemplate]);

  const loadProject = async (id: string) => {
    const loaded = ProjectStorageService.loadProjectManifest(id);
    if (loaded) {
      // Re-hydrate any expired browser blob URLs from IndexedDB or replace with safe offline slate
      const repaired = await MediaCacheService.verifyAndRepairProjectManifest(loaded);
      setProject(repaired);
      setHistory([repaired.editIR]);
      setHistoryIndex(0);
      const aspect = repaired.editIR.meta.targetAspect;
      if (aspect === "9:16" || aspect === "1:1" || aspect === "16:9") {
        setAspectRatio(aspect);
      } else {
        setAspectRatio("16:9");
      }
    } else {
      createNewProject("MRBEAST_FAST");
    }
  };

  const createNewProject = async (templatePreset: string) => {
    const newProj = await engineBridge.openProject();
    newProj.editIR.directorStyle.preset = (templatePreset as DirectorStylePreset) || "MRBEAST_FAST";
    const repaired = await MediaCacheService.verifyAndRepairProjectManifest(newProj);
    setProject(repaired);
    setHistory([repaired.editIR]);
    setHistoryIndex(0);
  };

  const pushHistory = (newEditIR: EditIR) => {
    if (!project) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEditIR);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    const updated = { ...project, editIR: newEditIR };
    setProject(updated);
    ProjectStorageService.saveProject(updated);
  };

  const handleUndo = () => {
    if (historyIndex > 0 && project) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      const targetIR = history[nextIndex];
      setProject({ ...project, editIR: targetIR });
      ProjectStorageService.saveProject({ ...project, editIR: targetIR });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && project) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const targetIR = history[nextIndex];
      setProject({ ...project, editIR: targetIR });
      ProjectStorageService.saveProject({ ...project, editIR: targetIR });
    }
  };

  const handleRenameProject = (newName: string) => {
    if (!project) return;
    const cleanName = newName.trim() || "Untitled Project";
    const updated = {
      ...project,
      project: {
        ...project.project,
        name: cleanName,
        updatedAt: new Date().toISOString(),
      },
      editIR: {
        ...project.editIR,
        meta: {
          ...project.editIR.meta,
          title: cleanName,
        },
      },
    };
    setProject(updated);
    ProjectStorageService.saveProject(updated);
    engineBridge.saveProject(updated);
  };

  const handleSelectPreset = (preset: DirectorStylePreset) => {
    if (!project) return;
    pushHistory({
      ...project.editIR,
      directorStyle: {
        ...project.editIR.directorStyle,
        preset,
      },
    });
  };

  const handleApplyAiPrompt = async (prompt: string) => {
    if (!project) return;
    setIsAiProcessing(true);
    setAiProgress(null);

    const userMsg: DirectorChatMessage = {
      id: safeUUID(),
      sender: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setAiMessages((prev) => [...prev, userMsg]);

    const mainTrack = project.editIR.tracks.videoTracks[0];
    const clips = mainTrack?.clips || [];
    const isZeroFootage = clips.length === 0 && (!project.assets || project.assets.length === 0);

    try {
      if (isZeroFootage) {
        // Zero-Footage Autonomous Creative Ad / Video Pipeline
        const result = await engineBridge.generateFromPrompt({
          prompt,
          companyId: authSession.companyId,
          targetAspect: aspectRatio,
          customStyleKey: project.editIR.directorStyle.preset,
          onProgress: (event: any) => setAiProgress(event),
        });

        if (result && result.editIR) {
          pushHistory(result.editIR);
          const replyMsg: DirectorChatMessage = {
            id: safeUUID(),
            sender: "director",
            text: `🎬 Autonomous Video Created Successfully!\n\n• Studio Narration: Cartesia Sonic-3.6 Neural Voiceover\n• Visual Track: Context-matched HD B-Roll cutaways (Pexels / Pixabay)\n• Audio Mix: Ducked background music & tactile SFX\n• Kinetic Subtitles: 3-word safe-zone captions with dynamic highlights`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actions: [
              "Synthesize Cartesia Voiceover",
              "Extract Whisper Timestamps",
              "Source HD B-Roll Cutaways",
              "Sidechain Duck BGM Track",
              "Burn Kinetic Subtitles",
            ],
            snapshotEditIR: result.editIR,
          };
          setAiMessages((prev) => [...prev, replyMsg]);
        }
      } else {
        const result = await engineBridge.executeAutonomousPipeline(
          project.assets[0]?.filePath || "input.mp4",
          project.editIR.directorStyle.preset,
          prompt,
          authSession.companyId,
          project.editIR,
          {
            availableAssets: project.assets,
            selectedClipId,
            playheadSec: currentTimeSeconds,
            onProgress: (event: any) => setAiProgress(event),
          }
        );

        if (result.requiresConfirmation && result.confirmationDetails) {
          const confirmMsg: DirectorChatMessage = {
            id: safeUUID(),
            sender: "director",
            text: result.reply || "I have prepared the autonomous edit based on your request. Please review the planned changes below:",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actions: result.actions,
            pendingConfirmation: {
              whatFound: result.confirmationDetails.whatFound,
              whatWillChange: result.confirmationDetails.whatWillChange,
              assumptions: result.confirmationDetails.assumptions,
              targetEditIR: result.editIR,
            },
          };
          setAiMessages((prev) => [...prev, confirmMsg]);
        } else {
          pushHistory(result.editIR);
          const replyMsg: DirectorChatMessage = {
            id: safeUUID(),
            sender: "director",
            text: result.reply || "I reviewed your project and updated the edit to match your direction.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actions: result.actions,
            snapshotEditIR: result.editIR,
          };
          setAiMessages((prev) => [...prev, replyMsg]);
        }
      }
    } catch (err: any) {
      console.error("AI Director pipeline failed:", err);
      const isCreditErr = err?.message?.includes("INSUFFICIENT_AI_CREDITS") || err?.message?.includes("Credit balance is too low");
      const errMsg: DirectorChatMessage = {
        id: safeUUID(),
        sender: "director",
        text: isCreditErr
          ? "⚠️ Insufficient AI Credits to generate this video. Please click 'Top Up' in the AI Credits widget above to recharge your balance."
          : `I encountered an issue executing that command: ${err?.message || "Internal error"}. Let me know if you want to retry with a specific instruction.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setAiMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsAiProcessing(false);
      setAiProgress(null);
    }
  };

  const handleConfirmAutonomousEdit = (message: DirectorChatMessage) => {
    if (!message.pendingConfirmation?.targetEditIR) return;
    pushHistory(message.pendingConfirmation.targetEditIR);
    setAiMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              pendingConfirmation: undefined,
              text: `${m.text}\n\n✅ *Changes confirmed and applied to timeline.*`,
              snapshotEditIR: message.pendingConfirmation!.targetEditIR,
            }
          : m
      )
    );
  };

  const handleCancelAutonomousEdit = (message: DirectorChatMessage) => {
    setAiMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              pendingConfirmation: undefined,
              text: `${m.text}\n\n❌ *Edit discarded.*`,
            }
          : m
      )
    );
  };

  const handleRevertToAiMessage = (message: DirectorChatMessage) => {
    if (message.snapshotEditIR) {
      pushHistory(message.snapshotEditIR);
    }
  };

  const handleClearAiMessages = () => {
    setAiMessages([]);
  };

  const handleImportFiles = async (files: FileList | File[]) => {
    if (!project) return;
    const newAssets: MediaAssetDescriptor[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const descriptor = await engineBridge.probeBrowserFile(file);
      newAssets.push(descriptor);
    }

    addAssetsToProject(newAssets);
  };

  /** Desktop app: native file dialog, real paths and real ffprobe metadata, so the timeline can be rendered by FFmpeg. */
  const handleImportNative = async () => {
    try {
      const { assets, failures } = await engineBridge.importNativeAssets();
      if (assets.length > 0) addAssetsToProject(assets);
      for (const f of failures) toast.error(`Could not import ${f.name}: ${f.error}`);
    } catch (err: any) {
      toast.error(err?.message || "Could not open the file picker.");
    }
  };

  const openImportDialog = () => {
    if (hasNativeMedia()) void handleImportNative();
    else fileInputRef.current?.click();
  };

  const addAssetsToProject = (newAssets: MediaAssetDescriptor[]) => {
    if (!project) return;
    const updatedAssets = [...project.assets, ...newAssets];
    let updatedEditIR = { ...project.editIR };

    // Auto-populate video track if currently empty
    const mainTrack = updatedEditIR.tracks.videoTracks[0];
    if (mainTrack && mainTrack.clips.length === 0 && newAssets.length > 0) {
      let curTime = 0;
      const newClips: VideoClip[] = [];

      for (const asset of newAssets) {
        const isAudio = asset.mimeType?.startsWith("audio/") || Boolean(asset.name.match(/\.(mp3|wav|aac|m4a|flac)$/i));
        if (isAudio) continue;

        const durSec = Math.max(1, asset.durationSeconds || 5.0);
        const clipDur = RationalTimeMath.fromSeconds(durSec);
        newClips.push({
          id: safeUUID(),
          assetId: asset.id,
          sourcePath: asset.filePath,
          sourceRange: { start: RationalTimeMath.fromSeconds(0), duration: clipDur },
          timelineRange: { start: RationalTimeMath.fromSeconds(curTime), duration: clipDur },
          transform: {
            scale: { start: 1.0, end: 1.0, easing: "spring" },
            position: { x: 0, y: 0 },
            anchor: { x: 0.5, y: 0.5 },
            rotationDeg: 0,
            opacity: 1.0,
            crop: { top: 0, bottom: 0, left: 0, right: 0 },
          },
          speedMultiplier: 1.0,
          effects: [],
        });
        curTime += durSec;
      }

      if (newClips.length > 0) {
        updatedEditIR = {
          ...updatedEditIR,
          meta: {
            ...updatedEditIR.meta,
            totalDuration: RationalTimeMath.fromSeconds(curTime),
          },
          tracks: {
            ...updatedEditIR.tracks,
            videoTracks: [{ ...mainTrack, clips: newClips }],
          },
        };
      }
    }

    const updatedProject = {
      ...project,
      assets: updatedAssets,
      editIR: updatedEditIR,
    };

    setProject(updatedProject);
    pushHistory(updatedEditIR);
    ProjectStorageService.saveProject(updatedProject);
  };

  const handleSplitClip = () => {
    if (!project) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    if (!mainTrack) return;

    let targetClip: VideoClip | undefined;
    if (selectedClipId) {
      targetClip = mainTrack.clips.find((c) => c.id === selectedClipId);
    } else {
      targetClip = mainTrack.clips.find((c) => {
        const start = RationalTimeMath.toSeconds(c.timelineRange.start);
        const dur = RationalTimeMath.toSeconds(c.timelineRange.duration);
        return currentTimeSeconds > start && currentTimeSeconds < start + dur;
      });
    }

    if (!targetClip) return;

    const clipStart = RationalTimeMath.toSeconds(targetClip.timelineRange.start);
    const clipDur = RationalTimeMath.toSeconds(targetClip.timelineRange.duration);
    const splitOffset = currentTimeSeconds - clipStart;

    if (splitOffset <= 0.05 || splitOffset >= clipDur - 0.05) return;

    const srcStart = RationalTimeMath.toSeconds(targetClip.sourceRange.start);

    const firstClip: VideoClip = {
      ...targetClip,
      sourceRange: {
        start: RationalTimeMath.fromSeconds(srcStart),
        duration: RationalTimeMath.fromSeconds(splitOffset),
      },
      timelineRange: {
        start: RationalTimeMath.fromSeconds(clipStart),
        duration: RationalTimeMath.fromSeconds(splitOffset),
      },
    };

    const secondClip: VideoClip = {
      ...targetClip,
      id: safeUUID(),
      sourceRange: {
        start: RationalTimeMath.fromSeconds(srcStart + splitOffset),
        duration: RationalTimeMath.fromSeconds(clipDur - splitOffset),
      },
      timelineRange: {
        start: RationalTimeMath.fromSeconds(currentTimeSeconds),
        duration: RationalTimeMath.fromSeconds(clipDur - splitOffset),
      },
    };

    const updatedClips = mainTrack.clips.flatMap((c) => (c.id === targetClip!.id ? [firstClip, secondClip] : [c]));

    const updatedIR: EditIR = {
      ...project.editIR,
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [{ ...mainTrack, clips: updatedClips }],
      },
    };

    pushHistory(updatedIR);
    setSelectedClipId(secondClip.id);
  };

  const handleDeleteSelectedClip = () => {
    if (!project || !selectedClipId) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    if (!mainTrack) return;

    const remaining = mainTrack.clips.filter((c) => c.id !== selectedClipId);
    let curTime = 0;
    const reindexed = remaining.map((c) => {
      const dur = RationalTimeMath.toSeconds(c.timelineRange.duration);
      const updated = {
        ...c,
        timelineRange: {
          start: RationalTimeMath.fromSeconds(curTime),
          duration: c.timelineRange.duration,
        },
      };
      curTime += dur;
      return updated;
    });

    const updatedIR: EditIR = {
      ...project.editIR,
      meta: {
        ...project.editIR.meta,
        totalDuration: RationalTimeMath.fromSeconds(Math.max(1, curTime)),
      },
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [{ ...mainTrack, clips: reindexed }],
      },
    };

    pushHistory(updatedIR);
    setSelectedClipId(null);
  };

  const handleDetachAudio = () => {
    if (!project || !selectedClipId) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    if (!mainTrack) return;

    const clip = mainTrack.clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const existingAudioTracks = [...(project.editIR.tracks.audioTracks || [])];
    let voiceTrack = existingAudioTracks.find((t) => t.type === "PRIMARY_VOICE");

    if (!voiceTrack) {
      voiceTrack = {
        id: `voice_track_${Date.now()}`,
        type: "PRIMARY_VOICE",
        volumeDb: 0.0,
        duckWithSpeech: false,
        clips: [],
      };
      existingAudioTracks.unshift(voiceTrack);
    }

    const targetVoiceTrackId = voiceTrack.id;
    const detachedAudioClip = {
      id: `aclip_detached_${Date.now()}`,
      sourcePath: clip.sourcePath,
      sourceRange: { ...clip.sourceRange },
      timelineRange: { ...clip.timelineRange },
      volumeDb: clip.volumeDb ?? 0.0,
    };

    const updatedAudioTracks = existingAudioTracks.map((t) =>
      t.id === targetVoiceTrackId ? { ...t, clips: [...t.clips, detachedAudioClip] } : t
    );

    // Mute the video clip
    const updatedClips = mainTrack.clips.map((c) =>
      c.id === selectedClipId ? { ...c, volumeDb: -60.0 } : c
    );

    const updatedIR: EditIR = {
      ...project.editIR,
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [{ ...mainTrack, clips: updatedClips }],
        audioTracks: updatedAudioTracks,
      },
    };

    pushHistory(updatedIR);
  };

  const handleAddTextOverlay = () => {
    if (!project) return;
    const isVertical = aspectRatio === "9:16";
    const newCaption: CaptionSegment = {
      id: safeUUID(),
      timeRange: {
        start: RationalTimeMath.fromSeconds(currentTimeSeconds),
        duration: RationalTimeMath.fromSeconds(3.0),
      },
      text: "NEW TITLE OVERLAY",
      words: [
        {
          word: "NEW",
          start: RationalTimeMath.fromSeconds(currentTimeSeconds),
          end: RationalTimeMath.fromSeconds(currentTimeSeconds + 0.8),
          highlight: true,
          color: isVertical ? "#FFE600" : "#FACC15",
          scaleMultiplier: 1.1,
        },
        {
          word: "TITLE",
          start: RationalTimeMath.fromSeconds(currentTimeSeconds + 0.8),
          end: RationalTimeMath.fromSeconds(currentTimeSeconds + 1.8),
          highlight: false,
          color: "#FFFFFF",
          scaleMultiplier: 1.0,
        },
        {
          word: "OVERLAY",
          start: RationalTimeMath.fromSeconds(currentTimeSeconds + 1.8),
          end: RationalTimeMath.fromSeconds(currentTimeSeconds + 3.0),
          highlight: false,
          color: "#FFFFFF",
          scaleMultiplier: 1.0,
        },
      ],
      style: {
        preset: "HORMOZI_BOUNCE",
        fontFamily: "Inter",
        fontSize: isVertical ? 52 : 46,
        textColor: "#FFFFFF",
        highlightColor: isVertical ? "#FFE600" : "#FACC15",
        position: { x: 0.5, y: isVertical ? 0.76 : 0.8 },
        shadow: true,
      },
    };

    const updatedCaptions = [...(project.editIR.tracks.captionTrack || []), newCaption];
    const totalSec = RationalTimeMath.toSeconds(project.editIR.meta.totalDuration);
    const newTotal = RationalTimeMath.fromSeconds(Math.max(totalSec, currentTimeSeconds + 3.0));

    pushHistory({
      ...project.editIR,
      meta: { ...project.editIR.meta, totalDuration: newTotal },
      tracks: { ...project.editIR.tracks, captionTrack: updatedCaptions },
    });
  };

  const handleAddMusicTrack = () => {
    openImportDialog();
  };

  // Real-time Playback Loop
  useEffect(() => {
    if (!isPlaying || !project) return;

    const totalSec = RationalTimeMath.toSeconds(project.editIR.meta.totalDuration);
    const interval = setInterval(() => {
      setCurrentTimeSeconds((prev) => {
        if (prev >= totalSec) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1 / 30;
      });
    }, 1000 / 30);

    return () => clearInterval(interval);
  }, [isPlaying, project]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 1 / 30;
        setCurrentTimeSeconds((t) => Math.max(0, t - step));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 1 / 30;
        const totalSec = project ? RationalTimeMath.toSeconds(project.editIR.meta.totalDuration) : 60;
        setCurrentTimeSeconds((t) => Math.min(totalSec, t + step));
      }

      if (e.key === "Home") {
        e.preventDefault();
        setCurrentTimeSeconds(0);
      } else if (e.key === "End") {
        e.preventDefault();
        if (project) {
          const totalSec = RationalTimeMath.toSeconds(project.editIR.meta.totalDuration);
          setCurrentTimeSeconds(totalSec);
        }
      }

      if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplitClip();
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteSelectedClip();
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleRedo();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        setIsExportModalOpen(true);
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }

      if (e.key === "Escape") {
        setIsExportModalOpen(false);
        setIsCaptionsModalOpen(false);
        setIsMixerModalOpen(false);
        setIsProxyModalOpen(false);
        setIsPluginModalOpen(false);
        setIsCacheModalOpen(false);
        setIsShortcutsModalOpen(false);
        setIsCriticDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project, historyIndex, history, selectedClipId, currentTimeSeconds]);

  const handlePerformExport = async (settings: { format: string; resolution: string; fps: number }) => {
    if (!project) return;
    setIsExporting(true);
    setExportProgress(0);
    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      const result = await engineBridge.renderExport(
        project.editIR,
        settings,
        (pct) => {
          setExportProgress(pct);
        },
        { signal: controller.signal, onNotice: (message) => toast(message, { icon: "ℹ️", duration: 9000 }) }
      );
      setExportedResult(result);
      setExportedPath(result.savedPath || result.downloadName);
    } catch (err: any) {
      if (err?.name === "RenderCancelledError") {
        toast("Export cancelled.");
      } else {
        console.error("Export failed:", err);
        toast.error(err?.message || "The export failed.", { duration: 9000 });
      }
    } finally {
      exportAbortRef.current = null;
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => exportAbortRef.current?.abort();

  const handleNavigateHome = () => {
    if (onExit) {
      onExit();
    } else if (onNavigateHome) {
      onNavigateHome();
    } else {
      setActiveView("home");
    }
  };

  if (!project) {
    return (
      <div className="h-screen w-screen bg-[#07090E] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-400">Loading 180 Media Studio...</p>
      </div>
    );
  }

  if (activeView === "home") {
    return (
      <HomeScreen
        onOpenProject={(id) => {
          loadProject(id);
          setActiveView("editor");
        }}
        companyAIStatus={companyAIStatus}
      />
    );
  }

  const selectedClip = project.editIR.tracks.videoTracks[0]?.clips.find((c) => c.id === selectedClipId) || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#07090E] text-white overflow-hidden select-none font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleImportFiles(e.target.files)}
      />

      {/* Top Header */}
      <HeaderBar
        projectName={project.project.name || project.editIR.meta.title || "Untitled Project"}
        onUpdateProjectName={handleRenameProject}
        authSession={authSession}
        companyAIStatus={companyAIStatus}
        isAiProcessing={isAiProcessing}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenCaptions={() => setIsCaptionsModalOpen(true)}
        onSave={() => {
          ProjectStorageService.saveProject(project);
          engineBridge.saveProject(project);
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNavigateHome={handleNavigateHome}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Left Side: Single Unified 3-Tab AI & Operations Dock */}
        <LeftSidebarDock
          activeTab={leftSidebarTab}
          onTabChange={setLeftSidebarTab}
          isOpen={isLeftPanelOpen}
          onToggleOpen={() => setIsLeftPanelOpen((o) => !o)}
          width={leftPanelWidth}
          currentPreset={project.editIR.directorStyle.preset}
          onSelectPreset={handleSelectPreset}
          onApplyPrompt={handleApplyAiPrompt}
          isAiProcessing={isAiProcessing}
          aiProgress={aiProgress}
          companyAIStatus={companyAIStatus}
          onRefreshAIStatus={() => fetchCompanyAIStatus(authSession.companyId)}
          aiMessages={aiMessages}
          onRevertToAiMessage={handleRevertToAiMessage}
          onClearAiMessages={handleClearAiMessages}
          currentAspect={aspectRatio}
          timelineDurationSec={RationalTimeMath.toSeconds(project.editIR.meta.totalDuration)}
          clipsCount={project.editIR.tracks.videoTracks[0]?.clips?.length || 0}
          userProfile={{
            name: authSession.userName,
            email: authSession.userEmail,
          }}
          onConfirmAutonomousEdit={handleConfirmAutonomousEdit}
          onCancelAutonomousEdit={handleCancelAutonomousEdit}
          selectedClip={selectedClip}
          selectedClipId={selectedClipId}
          currentTimeSeconds={currentTimeSeconds}
          onUpdateTransform={(transform) => {
            if (!selectedClipId) return;
            const track = project.editIR.tracks.videoTracks[0];
            if (!track) return;
            const updated = track.clips.map((c) =>
              c.id === selectedClipId ? { ...c, transform } : c
            );
            pushHistory({
              ...project.editIR,
              tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: updated }] },
            });
          }}
          onUpdateSpeed={(speed) => {
            if (!selectedClipId) return;
            const track = project.editIR.tracks.videoTracks[0];
            if (!track) return;
            const updated = track.clips.map((c) =>
              c.id === selectedClipId ? { ...c, speedMultiplier: speed } : c
            );
            pushHistory({
              ...project.editIR,
              tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: updated }] },
            });
          }}
          onUpdateVolume={(volumeDb) => {
            if (!selectedClipId) return;
            const track = project.editIR.tracks.videoTracks[0];
            if (!track) return;
            const updated = track.clips.map((c) =>
              c.id === selectedClipId ? { ...c, volumeDb } : c
            );
            pushHistory({
              ...project.editIR,
              tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: updated }] },
            });
          }}
          onUpdateTransitions={(transitionIn, transitionOut) => {
            if (!selectedClipId) return;
            const track = project.editIR.tracks.videoTracks[0];
            if (!track) return;
            const updated = track.clips.map((c) =>
              c.id === selectedClipId ? { ...c, transitionIn, transitionOut } : c
            );
            pushHistory({
              ...project.editIR,
              tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: updated }] },
            });
          }}
          onDetachAudio={handleDetachAudio}
          onDuplicateClip={() => {
            if (!selectedClipId) return;
            const track = project.editIR.tracks.videoTracks[0];
            const clip = track?.clips.find((c) => c.id === selectedClipId);
            if (!clip || !track) return;
            const startSec = RationalTimeMath.toSeconds(clip.timelineRange.start) + RationalTimeMath.toSeconds(clip.timelineRange.duration);
            const dup: VideoClip = {
              ...clip,
              id: safeUUID(),
              timelineRange: {
                ...clip.timelineRange,
                start: RationalTimeMath.fromSeconds(startSec),
              },
            };
            pushHistory({
              ...project.editIR,
              tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: [...track.clips, dup] }] },
            });
            setSelectedClipId(dup.id);
          }}
          onDeleteClip={handleDeleteSelectedClip}
          onCloseInspector={() => setSelectedClipId(null)}
          editIR={project.editIR}
          onApplyCriticRepairs={(repairs) => {
            let updated: EditIR = JSON.parse(JSON.stringify(project.editIR));
            for (const cmd of repairs) {
              if (cmd.type === "ADD_CAMERA_EVENT") {
                updated.tracks.cameraTrack = [...(updated.tracks.cameraTrack || []), cmd.event];
              } else if (cmd.type === "ADD_CAPTION") {
                updated.tracks.captionTrack = [...(updated.tracks.captionTrack || []), cmd.caption];
              } else if (cmd.type === "APPLY_STYLE") {
                updated.directorStyle.preset = cmd.preset;
                if (cmd.pacingMultiplier) updated.directorStyle.pacingMultiplier = cmd.pacingMultiplier;
                if (cmd.zoomAggressiveness) updated.directorStyle.zoomAggressiveness = cmd.zoomAggressiveness;
              } else if (cmd.type === "ADD_CLIP") {
                const track =
                  updated.tracks.videoTracks.find((t) => t.id === cmd.trackId) ||
                  updated.tracks.videoTracks[0];
                if (track) track.clips.push(cmd.clip);
              } else if (cmd.type === "REMOVE_CLIP") {
                const track =
                  updated.tracks.videoTracks.find((t) => t.id === cmd.trackId) ||
                  updated.tracks.videoTracks[0];
                if (track) track.clips = track.clips.filter((c) => c.id !== cmd.clipId);
              }
            }
            pushHistory(updated);
          }}
        />

        {isLeftPanelOpen && (
          <ResizableSplitter
            direction="horizontal"
            onResize={(delta) => setLeftPanelWidth((w) => Math.max(280, Math.min(560, w + delta)))}
          />
        )}

        {/* Center: Remotion Canvas Viewport & Multitrack Timeline (Auto-Expanding 100% Flex) */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#07090E]">
          <div className="flex-1 min-w-0 overflow-hidden">
            <CanvasViewport
              editIR={project.editIR}
              assets={project.assets}
              currentTimeSeconds={currentTimeSeconds}
              isPlaying={isPlaying}
              aspectRatio={aspectRatio}
              selectedClipId={selectedClipId}
              onUpdateTransform={(transform) => {
                if (!selectedClipId) return;
                const track = project.editIR.tracks.videoTracks[0];
                if (!track) return;
                const updated = track.clips.map((c) =>
                  c.id === selectedClipId ? { ...c, transform } : c
                );
                pushHistory({
                  ...project.editIR,
                  tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: updated }] },
                });
              }}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onSeek={setCurrentTimeSeconds}
              onStepFrame={(dir) => setCurrentTimeSeconds((t) => Math.max(0, t + dir * (1 / 30)))}
              onAspectRatioChange={setAspectRatio}
              onOpenImport={openImportDialog}
            />
          </div>

          <ResizableSplitter
            direction="vertical"
            onResize={(delta) => setTimelineHeight((h) => Math.max(160, Math.min(500, h - delta)))}
          />

          <div style={{ height: `${timelineHeight}px` }} className="border-t border-[#1F1F24] bg-[#0E0E10] shrink-0">
            <Timeline
              editIR={project.editIR}
              currentTimeSeconds={currentTimeSeconds}
              zoomLevel={zoomLevel}
              selectedClipId={selectedClipId}
              isPlaying={isPlaying}
              aspectRatio={aspectRatio}
              onSeek={setCurrentTimeSeconds}
              onZoomChange={setZoomLevel}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onStepFrame={(dir) => setCurrentTimeSeconds((t) => Math.max(0, t + dir * (1 / 30)))}
              onAspectRatioChange={setAspectRatio}
              onOpenScopes={() => setIsScopesModalOpen(true)}
              onOpenSilenceTrimmer={() => setIsSilenceModalOpen(true)}
              onSelectClip={(clipId) => {
                setSelectedClipId(clipId);
                if (clipId) {
                  setLeftSidebarTab("inspector");
                  setIsLeftPanelOpen(true);
                }
              }}
              onSplitClip={handleSplitClip}
              onDeleteSelectedClip={handleDeleteSelectedClip}
              onUpdateClipTiming={(clipId, newStart, newDur) => {
                const track = project.editIR.tracks.videoTracks[0];
                if (!track) return;
                const updated = track.clips.map((c) =>
                  c.id === clipId
                    ? {
                        ...c,
                        timelineRange: {
                          start: RationalTimeMath.fromSeconds(newStart),
                          duration: RationalTimeMath.fromSeconds(newDur),
                        },
                      }
                    : c
                );
                pushHistory({
                  ...project.editIR,
                  tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: updated }] },
                });
              }}
              onDuplicateClip={() => {
                if (!selectedClipId) return;
                const track = project.editIR.tracks.videoTracks[0];
                const clip = track?.clips.find((c) => c.id === selectedClipId);
                if (!clip || !track) return;
                const startSec = RationalTimeMath.toSeconds(clip.timelineRange.start) + RationalTimeMath.toSeconds(clip.timelineRange.duration);
                const dup: VideoClip = {
                  ...clip,
                  id: safeUUID(),
                  timelineRange: {
                    ...clip.timelineRange,
                    start: RationalTimeMath.fromSeconds(startSec),
                  },
                };
                pushHistory({
                  ...project.editIR,
                  tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: [...track.clips, dup] }] },
                });
                setSelectedClipId(dup.id);
              }}
              onAddTextOverlay={handleAddTextOverlay}
              onAddAudioTrack={handleAddMusicTrack}
              onOpenCaptions={() => setIsCaptionsModalOpen(true)}
              onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
              onUpdateClipTransition={(clipId, transitionIn, transitionOut) => {
                const track = project.editIR.tracks.videoTracks[0];
                if (!track) return;
                const updated = track.clips.map((c) =>
                  c.id === clipId ? { ...c, transitionIn, transitionOut } : c
                );
                pushHistory({
                  ...project.editIR,
                  tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: updated }] },
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        editIR={project.editIR}
        onStartExport={handlePerformExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportedPath={exportedPath}
        exportedResult={exportedResult}
        onCancelExport={handleCancelExport}
      />

      <CaptionStudioModal
        isOpen={isCaptionsModalOpen}
        onClose={() => setIsCaptionsModalOpen(false)}
        captions={project.editIR.tracks.captionTrack}
        onUpdateCaptions={(caps) => {
          pushHistory({
            ...project.editIR,
            tracks: { ...project.editIR.tracks, captionTrack: caps },
          });
        }}
      />

      <AudioMixerPanel
        isOpen={isMixerModalOpen}
        onClose={() => setIsMixerModalOpen(false)}
        audioTracks={project.editIR.tracks.audioTracks}
        onUpdateTrackVolume={(id, vol) => {
          const updated = project.editIR.tracks.audioTracks.map((t) => (t.id === id ? { ...t, volumeDb: vol } : t));
          pushHistory({ ...project.editIR, tracks: { ...project.editIR.tracks, audioTracks: updated } });
        }}
        onToggleDucking={setIsDuckingEnabled}
        isDuckingEnabled={isDuckingEnabled}
        onAutoSoundDesign={() => {
          setIsMixerModalOpen(false);
          handleApplyAiPrompt("Add auto sound design and psychoacoustic SFX");
        }}
      />

      <ProxyGeneratorModal isOpen={isProxyModalOpen} onClose={() => setIsProxyModalOpen(false)} assets={project.assets} />
      <PluginManagerModal isOpen={isPluginModalOpen} onClose={() => setIsPluginModalOpen(false)} />
      <CacheManagerModal isOpen={isCacheModalOpen} onClose={() => setIsCacheModalOpen(false)} />
      <KeyboardShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />
      <ColorScopesModal isOpen={isScopesModalOpen} onClose={() => setIsScopesModalOpen(false)} />
      <SilenceRemovalModal
        isOpen={isSilenceModalOpen}
        onClose={() => setIsSilenceModalOpen(false)}
        editIR={project.editIR}
        onApplyTrim={(newIR) => pushHistory(newIR)}
      />
    </div>
  );
};
