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
import { HomeScreen } from "./HomeScreen";
import { ResizableSplitter } from "./ResizableSplitter";
import { ProjectStorageService } from "../services/project-storage";
import { Folder, Sparkles, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { OtioService } from "../services/otio-service";
import { engineBridge, CompanyAIStatus, ExportResult } from "../services/tauri-bridge";

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

export const MediaStudioWorkspace: React.FC<MediaStudioWorkspaceProps> = ({
  initialProjectId,
  initialTemplate,
  onNavigateHome,
  onExit,
}) => {
  const [activeView, setActiveView] = useState<"home" | "editor">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("project")) return "editor";
    }
    return initialProjectId ? "editor" : "home";
  });

  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(360);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(340);
  const [timelineHeight, setTimelineHeight] = useState<number>(280);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightSidebarTab, setRightSidebarTab] = useState<
    "assets" | "inspector" | "critic" | "captions" | "mixer" | "plugins" | "cache"
  >("assets");

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
  const [isDuckingEnabled, setIsDuckingEnabled] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setProject(loaded);
      setHistory([loaded.editIR]);
      setHistoryIndex(0);
      const aspect = loaded.editIR.meta.targetAspect;
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
    setProject(newProj);
    setHistory([newProj.editIR]);
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

    try {
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
    } catch (err) {
      console.error("AI Director pipeline failed:", err);
      const errMsg: DirectorChatMessage = {
        id: safeUUID(),
        sender: "director",
        text: "I encountered an issue executing that command. Let me know if you want to retry with a specific instruction.",
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
    fileInputRef.current?.click();
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

    try {
      const result = await engineBridge.renderExport(project.editIR, settings, (pct) => {
        setExportProgress(pct);
      });
      setExportedResult(result);
      setExportedPath(result.downloadName);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

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
        projectName={project.project.name}
        authSession={authSession}
        companyAIStatus={companyAIStatus}
        isAiProcessing={isAiProcessing}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenCritic={() => {
          setIsRightPanelOpen(true);
          setRightSidebarTab("critic");
        }}
        onSave={() => {
          ProjectStorageService.saveProject(project);
          engineBridge.saveProject(project);
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNavigateHome={handleNavigateHome}
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen((o) => !o)}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={() => setIsRightPanelOpen((o) => !o)}
        activeRightTab={rightSidebarTab}
        onSelectRightTab={(tab) => {
          setRightSidebarTab(tab as any);
          setIsRightPanelOpen(true);
        }}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Left Side: Dedicated AI Director Panel */}
        {isLeftPanelOpen ? (
          <div
            style={{ width: `${leftPanelWidth}px` }}
            className="h-full border-r border-[#1F1F24] bg-[#090A0F] flex flex-col shrink-0 relative select-none"
          >
            <AIDirectorPanel
              currentPreset={project.editIR.directorStyle.preset}
              onSelectPreset={handleSelectPreset}
              onApplyPrompt={handleApplyAiPrompt}
              isProcessing={isAiProcessing}
              currentProgress={aiProgress}
              companyAIStatus={companyAIStatus}
              onRefreshAIStatus={() => fetchCompanyAIStatus(authSession.companyId)}
              messages={aiMessages}
              onRevertToMessage={handleRevertToAiMessage}
              onClearMessages={handleClearAiMessages}
              currentAspect={aspectRatio}
              timelineDurationSec={RationalTimeMath.toSeconds(project.editIR.meta.totalDuration)}
              clipsCount={project.editIR.tracks.videoTracks[0]?.clips?.length || 0}
              selectedClipId={selectedClipId}
              onConfirmAutonomousEdit={handleConfirmAutonomousEdit}
              onCancelAutonomousEdit={handleCancelAutonomousEdit}
            />
          </div>
        ) : null}

        {isLeftPanelOpen && (
          <ResizableSplitter
            direction="horizontal"
            onResize={(delta) => setLeftPanelWidth((w) => Math.max(280, Math.min(560, w + delta)))}
          />
        )}

        {/* Center: Canvas Viewport & Multitrack Timeline (Auto-Expanding 100% Flex) */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#07090E]">
          <div className="flex-1 min-w-0 overflow-hidden">
            <CanvasViewport
              editIR={project.editIR}
              assets={project.assets}
              currentTimeSeconds={currentTimeSeconds}
              isPlaying={isPlaying}
              aspectRatio={aspectRatio}
              selectedClipId={selectedClipId}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onSeek={setCurrentTimeSeconds}
              onStepFrame={(dir) => setCurrentTimeSeconds((t) => Math.max(0, t + dir * (1 / 30)))}
              onAspectRatioChange={setAspectRatio}
              onOpenImport={() => {
                setIsRightPanelOpen(true);
                setRightSidebarTab("assets");
                fileInputRef.current?.click();
              }}
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
              onSeek={setCurrentTimeSeconds}
              onZoomChange={setZoomLevel}
              onSelectClip={(clipId) => {
                setSelectedClipId(clipId);
                if (clipId) {
                  setIsRightPanelOpen(true);
                  setRightSidebarTab("inspector");
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
              onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
            />
          </div>
        </div>

        {/* Right Side Resizer when open */}
        {isRightPanelOpen && (
          <ResizableSplitter
            direction="horizontal"
            onResize={(delta) => setRightPanelWidth((w) => Math.max(260, Math.min(560, w - delta)))}
          />
        )}

        {/* Right Side Panel: File Uploads & Side Menus */}
        {isRightPanelOpen && (
          <div
            style={{ width: `${rightPanelWidth}px` }}
            className="h-full border-l border-[#1F1F24] bg-[#0B0B0E] flex flex-col shrink-0 select-none overflow-hidden"
          >
            {/* Right Panel Header & Navigation Tabs */}
            <div className="h-10 border-b border-[#1F1F24] bg-[#0E0E12] flex items-center justify-between px-2">
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setRightSidebarTab("assets")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                    rightSidebarTab === "assets"
                      ? "bg-[#181822] text-indigo-300 border border-indigo-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-[#141418]"
                  }`}
                  title="Files & Media Assets"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Files</span>
                </button>

                <button
                  onClick={() => setRightSidebarTab("inspector")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                    rightSidebarTab === "inspector"
                      ? "bg-[#181822] text-amber-300 border border-amber-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-[#141418]"
                  }`}
                  title="Clip Inspector & Transforms"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Inspector</span>
                </button>

                <button
                  onClick={() => setRightSidebarTab("critic")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                    rightSidebarTab === "critic"
                      ? "bg-[#1E1422] text-pink-300 border border-pink-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-[#141418]"
                  }`}
                  title="Critic & Retention QA"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>Critic</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsRightPanelOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#1C1C22] transition"
                title="Close Side Menu"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Panel Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {rightSidebarTab === "assets" && (
                <AssetBin
                  assets={project.assets}
                  onImportFiles={handleImportFiles}
                  onAddClipToTimeline={(asset) => {
                    const durationSec = Math.max(1, asset.durationSeconds || 5.0);
                    const clipDuration = RationalTimeMath.fromSeconds(durationSec);
                    const isAudio =
                      asset.mimeType?.startsWith("audio/") ||
                      Boolean(asset.name.match(/\.(mp3|wav|aac|m4a|flac)$/i));

                    if (isAudio) {
                      const existingAudioTracks = project.editIR.tracks.audioTracks || [];
                      let targetAudioTrack =
                        existingAudioTracks.find((t) => t.type === "BGM") || existingAudioTracks[0];

                      if (!targetAudioTrack) {
                        targetAudioTrack = {
                          id: `atrack_${Date.now()}`,
                          type: "BGM",
                          volumeDb: 0.0,
                          duckWithSpeech: true,
                          clips: [],
                        };
                        existingAudioTracks.push(targetAudioTrack);
                      }

                      const newAudioClip = {
                        id: `aclip_${Date.now()}`,
                        sourcePath: asset.filePath,
                        sourceRange: { start: RationalTimeMath.fromSeconds(0), duration: clipDuration },
                        timelineRange: {
                          start: RationalTimeMath.fromSeconds(currentTimeSeconds),
                          duration: clipDuration,
                        },
                        volumeDb: 0.0,
                      };

                      const updatedAudioTracks = existingAudioTracks.map((t) =>
                        t.id === targetAudioTrack!.id ? { ...t, clips: [...t.clips, newAudioClip] } : t
                      );

                      const endSec = currentTimeSeconds + durationSec;
                      const curTotal = RationalTimeMath.toSeconds(project.editIR.meta.totalDuration);
                      const newTotal = RationalTimeMath.fromSeconds(Math.max(curTotal, endSec));

                      pushHistory({
                        ...project.editIR,
                        meta: { ...project.editIR.meta, totalDuration: newTotal },
                        tracks: { ...project.editIR.tracks, audioTracks: updatedAudioTracks },
                      });
                    } else {
                      const newClip: VideoClip = {
                        id: safeUUID(),
                        assetId: asset.id,
                        sourcePath: asset.filePath,
                        sourceRange: { start: RationalTimeMath.fromSeconds(0), duration: clipDuration },
                        timelineRange: {
                          start: RationalTimeMath.fromSeconds(currentTimeSeconds),
                          duration: clipDuration,
                        },
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
                      };
                      const track = project.editIR.tracks.videoTracks[0];
                      if (!track) return;
                      const endSec = currentTimeSeconds + durationSec;
                      const curTotal = RationalTimeMath.toSeconds(project.editIR.meta.totalDuration);
                      const newTotal = RationalTimeMath.fromSeconds(Math.max(curTotal, endSec));

                      pushHistory({
                        ...project.editIR,
                        meta: { ...project.editIR.meta, totalDuration: newTotal },
                        tracks: {
                          ...project.editIR.tracks,
                          videoTracks: [{ ...track, clips: [...track.clips, newClip] }],
                        },
                      });
                      setSelectedClipId(newClip.id);
                    }
                  }}
                  onRemoveAsset={(id) =>
                    setProject({ ...project, assets: project.assets.filter((a) => a.id !== id) })
                  }
                />
              )}

              {rightSidebarTab === "inspector" && (
                <div className="h-full flex flex-col overflow-y-auto">
                  {selectedClip ? (
                    <ClipInspector
                      selectedClip={selectedClip}
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
                      onClose={() => setSelectedClipId(null)}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#141419] border border-[#22222A] flex items-center justify-center text-zinc-500">
                        <Folder className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-200">No Clip Selected</h4>
                      <p className="text-xs text-zinc-500 max-w-[200px]">
                        Click any clip on the timeline to inspect transformations, scale, crop, and speed.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {rightSidebarTab === "critic" && (
                <div className="h-full flex flex-col overflow-y-auto">
                  <AICriticDrawer
                    isOpen={true}
                    onClose={() => setIsRightPanelOpen(false)}
                    editIR={project.editIR}
                    onExecutePrompt={handleSendDirectorPrompt}
                    onApplyRepairs={(repairs) => {
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ultra-Slim Far-Right Action Strip (When panel is collapsed or open to quickly switch) */}
        {!isRightPanelOpen && (
          <div className="w-11 border-l border-[#1F1F24] bg-[#0A0A0D] flex flex-col items-center py-3 space-y-3 shrink-0">
            <button
              onClick={() => {
                setRightSidebarTab("assets");
                setIsRightPanelOpen(true);
              }}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#181822] transition"
              title="Open Media Files & Uploads"
            >
              <Folder className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setRightSidebarTab("inspector");
                setIsRightPanelOpen(true);
              }}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#181822] transition"
              title="Open Clip Inspector"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block" />
            </button>
            <button
              onClick={() => {
                setRightSidebarTab("critic");
                setIsRightPanelOpen(true);
              }}
              className="p-2 rounded-lg text-pink-400 hover:text-pink-300 hover:bg-[#22141E] transition"
              title="Open AI Critic QA"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        )}
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
          handleSendDirectorPrompt("Add auto sound design and psychoacoustic SFX");
        }}
      />

      <ProxyGeneratorModal isOpen={isProxyModalOpen} onClose={() => setIsProxyModalOpen(false)} assets={project.assets} />
      <PluginManagerModal isOpen={isPluginModalOpen} onClose={() => setIsPluginModalOpen(false)} />
      <CacheManagerModal isOpen={isCacheModalOpen} onClose={() => setIsCacheModalOpen(false)} />
      <KeyboardShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />
    </div>
  );
};
