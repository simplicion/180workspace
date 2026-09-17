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
  initialProjectId?: string;
  initialTemplate?: string;
  onNavigateHome?: () => void;
}

export const MediaStudioWorkspace: React.FC<MediaStudioWorkspaceProps> = ({
  initialProjectId,
  initialTemplate,
  onNavigateHome,
}) => {
  const [activeView, setActiveView] = useState<"home" | "editor">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("project")) return "editor";
    }
    return initialProjectId ? "editor" : "home";
  });

  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(360);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(288);
  const [timelineHeight, setTimelineHeight] = useState<number>(280);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState<"assets" | "ai">("assets");

  const [project, setProject] = useState<ProjectPackageManifest | null>(null);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState<AIDirectorProgressEvent | null>(null);

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
      isAuthenticated: Boolean(resolvedToken || userName),
    });

    fetchCompanyAIStatus(resolvedCompany);

    const initialManifest = projId ? ProjectStorageService.loadProjectManifest(projId) : null;
    if (initialManifest) {
      setProject(initialManifest);
      setHistory([initialManifest.editIR]);
      setHistoryIndex(0);
      setActiveView("editor");
    } else {
      engineBridge.openProject(projId || undefined).then((proj) => {
        if (template) {
          proj.editIR.directorStyle.preset = template as any;
        }
        if (projId) {
          proj.project.id = projId;
          proj.project.name = `Project ${projId.substring(0, 8)}`;
        }
        setProject(proj);
        setHistory([proj.editIR]);
        setHistoryIndex(0);
        if (projId) setActiveView("editor");
      });
    }
  }, [initialProjectId, initialTemplate]);

  const handleOpenProjectFromHome = (projectId: string) => {
    const loaded = ProjectStorageService.loadProjectManifest(projectId);
    if (loaded) {
      setProject(loaded);
      setHistory([loaded.editIR]);
      setHistoryIndex(0);
      setCurrentTimeSeconds(0);
      setIsPlaying(false);
      setSelectedClipId(null);
      setActiveView("editor");
    } else {
      engineBridge.openProject(projectId).then((proj) => {
        setProject(proj);
        setHistory([proj.editIR]);
        setHistoryIndex(0);
        setCurrentTimeSeconds(0);
        setIsPlaying(false);
        setSelectedClipId(null);
        setActiveView("editor");
      });
    }
  };

  const handleNavigateHome = () => {
    if (project) {
      ProjectStorageService.saveProject(project);
      engineBridge.saveProject(project);
    }
    setIsPlaying(false);
    if (onExit) {
      onExit();
    } else {
      setActiveView("home");
    }
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

  const pushHistory = (newEditIR: EditIR) => {
    if (!project) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEditIR);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    if (newEditIR.meta?.targetAspect) {
      setAspectRatio(newEditIR.meta.targetAspect as any);
    }
    setProject({
      ...project,
      editIR: newEditIR,
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0 && project) {
      const targetIndex = historyIndex - 1;
      const targetIR = history[targetIndex];
      setHistoryIndex(targetIndex);
      if (targetIR.meta?.targetAspect) {
        setAspectRatio(targetIR.meta.targetAspect as any);
      }
      setProject({
        ...project,
        editIR: targetIR,
      });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && project) {
      const targetIndex = historyIndex + 1;
      const targetIR = history[targetIndex];
      setHistoryIndex(targetIndex);
      if (targetIR.meta?.targetAspect) {
        setAspectRatio(targetIR.meta.targetAspect as any);
      }
      setProject({
        ...project,
        editIR: targetIR,
      });
    }
  };

  const handleSelectPreset = (preset: DirectorStylePreset) => {
    if (!project) return;
    setIsAiProcessing(true);
    setTimeout(() => {
      const updated: EditIR = {
        ...project.editIR,
        directorStyle: {
          ...project.editIR.directorStyle,
          preset,
          pacingMultiplier: preset === "MRBEAST_FAST" ? 1.3 : 1.0,
          zoomAggressiveness: preset === "MRBEAST_FAST" ? 0.8 : 0.4,
        },
      };
      pushHistory(updated);
      setIsAiProcessing(false);
    }, 500);
  };

  const handleApplyAiPrompt = async (promptText: string) => {
    if (!project) return;

    const trimmed = promptText.trim();
    const isConsent = /^(yes|proceed|apply|go\s*ahead|looks\s*good|do\s*it|sure|ok|confirm|let's\s*do\s*it|yes\s*go)[!?.]*$/i.test(trimmed);
    const lastPendingMessage = [...aiMessages].reverse().find((m) => m.pendingConfirmation);

    // If user is confirming an active proposal
    if (isConsent && lastPendingMessage?.pendingConfirmation?.targetEditIR) {
      handleConfirmAutonomousEdit(lastPendingMessage);
      const userMsg: DirectorChatMessage = {
        id: `msg_user_${Date.now()}`,
        sender: "user",
        text: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const confirmReply: DirectorChatMessage = {
        id: `msg_dir_${Date.now() + 1}`,
        sender: "director",
        text: "✨ Done! I've applied the edit plan to your timeline. Your cuts, camera zooms, and visual styling are now active.\n\nPress **Space** to preview the playback, and let me know if you want to tweak anything!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setAiMessages((prev) => [...prev, userMsg, confirmReply]);
      return;
    }

    setIsAiProcessing(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: DirectorChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: "user",
      text: promptText,
      timestamp: timeStr,
    };

    setAiMessages((prev) => [...prev, userMsg]);
    const previousEditIRSnapshot = JSON.parse(JSON.stringify(project.editIR));

    try {
      const result = await (engineBridge as any).executeAutonomousPipeline(
        project.assets[0]?.filePath || "",
        project.editIR.directorStyle.preset,
        promptText,
        authSession.companyId,
        project.editIR,
        {
          availableAssets: project.assets,
          selectedClipId,
          playheadSec: currentTimeSeconds,
          onProgress: (evt: AIDirectorProgressEvent) => setAiProgress(evt),
        }
      );

      if (result) {
        if (result.requiresConfirmation && result.confirmationDetails) {
          // PROPOSAL: Wait for user consent before changing timeline!
          const directorMsg: DirectorChatMessage = {
            id: `msg_dir_${Date.now()}`,
            sender: "director",
            text: result.reply || "I analyzed your media and timeline. Here is the proposed edit plan:",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actions: result.actions && result.actions.length > 0 ? result.actions : undefined,
            snapshotEditIR: previousEditIRSnapshot,
            pendingConfirmation: {
              whatFound: result.confirmationDetails.whatFound,
              whatWillChange: result.confirmationDetails.whatWillChange,
              assumptions: result.confirmationDetails.assumptions,
              targetEditIR: result.editIR,
            },
          };
          setAiMessages((prev) => [...prev, directorMsg]);
        } else if (result.actions && result.actions.length > 0 && result.editIR) {
          // DIRECT SPECIFIC COMMAND: Apply immediately
          pushHistory(result.editIR);

          const directorMsg: DirectorChatMessage = {
            id: `msg_dir_${Date.now()}`,
            sender: "director",
            text: result.reply || "Applied the edit to your timeline.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actions: result.actions,
            snapshotEditIR: previousEditIRSnapshot,
          };

          setAiMessages((prev) => [...prev, directorMsg]);
        } else {
          // CONVERSATIONAL CHAT / GREETING (0 operations):
          // No timeline change! Pure conversational reply.
          const directorMsg: DirectorChatMessage = {
            id: `msg_dir_${Date.now()}`,
            sender: "director",
            text: result.reply || "Hey! I'm here to help you brainstorm ideas, structure hooks, and direct your edit. What kind of video are we creating today?",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setAiMessages((prev) => [...prev, directorMsg]);
        }
      }
    } catch (err) {
      console.error("AI Director pipeline failed:", err);
      const errorMsg: DirectorChatMessage = {
        id: `msg_dir_err_${Date.now()}`,
        sender: "director",
        text: "I encountered an issue discussing that. Let's try again—tell me how you'd like to edit your clips!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setAiMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiProcessing(false);
      setAiProgress(null);
    }

  };

  const handleConfirmAutonomousEdit = (message: DirectorChatMessage) => {
    if (message.pendingConfirmation?.targetEditIR) {
      pushHistory(message.pendingConfirmation.targetEditIR);
      setAiMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                pendingConfirmation: undefined,
                text: `${m.text}\n\n✅ Edit plan applied to timeline.`,
              }
            : m
        )
      );
    }
  };

  const handleCancelAutonomousEdit = (message: DirectorChatMessage) => {
    setAiMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              pendingConfirmation: undefined,
              text: `${m.text}\n\n❌ Edit plan cancelled.`,
            }
          : m
      )
    );
  };

  const handleRevertToAiMessage = (msg: DirectorChatMessage) => {
    if (msg.snapshotEditIR) {
      pushHistory(msg.snapshotEditIR);
    }
  };

  const handleClearAiMessages = () => {
    setAiMessages([]);
  };

  const handleImportFiles = async (files: FileList | File[]) => {
    if (!project) return;
    const fileList = Array.from(files);
    const newAssets: MediaAssetDescriptor[] = [];

    for (const file of fileList) {
      try {
        const probed = await engineBridge.probeBrowserFile(file);
        newAssets.push(probed);
      } catch (err) {
        console.error("Failed to probe media file:", file.name, err);
      }
    }

    if (newAssets.length === 0) return;

    const currentClips = project.editIR.tracks.videoTracks[0]?.clips || [];
    const isTimelineEmptyOrDummy =
      currentClips.length === 0 ||
      currentClips[0]?.id === "clip_01" ||
      currentClips[0]?.id === "clip_showcase_1";

    let updatedClips: VideoClip[] = isTimelineEmptyOrDummy ? [] : [...currentClips];
    let currentOffsetSec = isTimelineEmptyOrDummy
      ? 0
      : currentClips.reduce((acc, c) => {
          const end = RationalTimeMath.toSeconds(c.timelineRange.start) + RationalTimeMath.toSeconds(c.timelineRange.duration);
          return Math.max(acc, end);
        }, 0);

    const createdClips: VideoClip[] = [];

    for (let i = 0; i < newAssets.length; i++) {
      const asset = newAssets[i];
      const clipDurationSec = Math.max(1, asset.durationSeconds || 5.0);
      const clipDuration = RationalTimeMath.fromSeconds(clipDurationSec);
      const clipStart = RationalTimeMath.fromSeconds(currentOffsetSec);

      const newClip: VideoClip = {
        id: safeUUID(),
        assetId: asset.id,
        sourcePath: asset.filePath,
        sourceRange: { start: RationalTimeMath.fromSeconds(0), duration: clipDuration },
        timelineRange: { start: clipStart, duration: clipDuration },
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

      updatedClips.push(newClip);
      createdClips.push(newClip);
      currentOffsetSec += clipDurationSec;
    }

    const newTotalDuration = RationalTimeMath.fromSeconds(Math.max(currentOffsetSec, 1));

    const updatedIR: EditIR = {
      ...project.editIR,
      meta: {
        ...project.editIR.meta,
        totalDuration: newTotalDuration,
      },
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [
          {
            ...project.editIR.tracks.videoTracks[0],
            clips: updatedClips,
          },
        ],
      },
    };

    setProject({
      ...project,
      assets: [...project.assets, ...newAssets],
      editIR: updatedIR,
    });
    pushHistory(updatedIR);

    if (createdClips.length > 0) {
      setSelectedClipId(createdClips[0].id);
      const startSec = RationalTimeMath.toSeconds(createdClips[0].timelineRange.start);
      setCurrentTimeSeconds(startSec);
    }
  };

  const handleSplitClip = () => {
    if (!project) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    if (!mainTrack) return;

    const clipToSplit = mainTrack.clips.find((c) => {
      const s = RationalTimeMath.toSeconds(c.timelineRange.start);
      const e = s + RationalTimeMath.toSeconds(c.timelineRange.duration);
      return currentTimeSeconds > s && currentTimeSeconds < e;
    });

    if (!clipToSplit) return;

    const clipStartSec = RationalTimeMath.toSeconds(clipToSplit.timelineRange.start);
    const splitPointRelSec = currentTimeSeconds - clipStartSec;

    const firstHalfDuration = RationalTimeMath.fromSeconds(splitPointRelSec);
    const secondHalfDuration = RationalTimeMath.fromSeconds(
      RationalTimeMath.toSeconds(clipToSplit.timelineRange.duration) - splitPointRelSec
    );

    const firstClip: VideoClip = {
      ...clipToSplit,
      id: safeUUID(),
      sourceRange: {
        start: clipToSplit.sourceRange.start,
        duration: firstHalfDuration,
      },
      timelineRange: {
        start: clipToSplit.timelineRange.start,
        duration: firstHalfDuration,
      },
    };

    const secondClip: VideoClip = {
      ...clipToSplit,
      id: safeUUID(),
      sourceRange: {
        start: RationalTimeMath.fromSeconds(
          RationalTimeMath.toSeconds(clipToSplit.sourceRange.start) + splitPointRelSec
        ),
        duration: secondHalfDuration,
      },
      timelineRange: {
        start: RationalTimeMath.fromSeconds(currentTimeSeconds),
        duration: secondHalfDuration,
      },
    };

    const newClips = mainTrack.clips.flatMap((c) => (c.id === clipToSplit.id ? [firstClip, secondClip] : [c]));

    const updatedIR: EditIR = {
      ...project.editIR,
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [{ ...mainTrack, clips: newClips }],
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

  // Pro Video Editor Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Space -> Toggle Play / Pause
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }

      // ArrowLeft / ArrowRight -> Step 1 frame (or jump 1s with Shift)
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

      // Home / End -> Jump playhead
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

      // S key -> Split Clip at playhead
      if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplitClip();
      }

      // Delete or Backspace -> Ripple Delete Selected Clip
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteSelectedClip();
        }
      }

      // Ctrl+Z / Cmd+Z / Ctrl+Y / Cmd+Shift+Z -> Undo / Redo
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

      // Ctrl+E -> Open Export Dialog
      if ((e.ctrlKey || e.metaKey) && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        setIsExportModalOpen(true);
      }

      // ? key -> Open Keyboard Shortcuts Reference
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }

      // Escape -> Close active modals
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
      alert("Export failed: " + err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!project) {
    return (
      <div className="h-full w-full bg-[#07090E] flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400">Initializing 180 Media Studio Engine...</span>
        </div>
      </div>
    );
  }

  if (activeView === "home") {
    return (
      <HomeScreen
        onOpenProject={handleOpenProjectFromHome}
        companyAIStatus={companyAIStatus}
      />
    );
  }

  return (
    <div className="h-full w-full bg-[#07090E] text-white flex flex-col select-none overflow-hidden font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleImportFiles(e.target.files)}
      />

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
        onOpenCaptions={() => setIsCaptionsModalOpen(true)}
        onOpenMixer={() => setIsMixerModalOpen(true)}
        onOpenProxies={() => setIsProxyModalOpen(true)}
        onOpenPlugins={() => setIsPluginModalOpen(true)}
        onOpenCache={() => setIsCacheModalOpen(true)}
        onOpenCritic={() => setIsCriticDrawerOpen(true)}
        onExportOtio={() => {
          OtioService.exportToOtioFile(project.editIR, `${project.project.name}.otio`);
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
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div
          style={{ width: isLeftPanelOpen ? `${leftPanelWidth}px` : "48px" }}
          className="h-full border-r border-[#1F1F24] bg-[#0E0E10] flex flex-col shrink-0 transition-all"
        >
          {isLeftPanelOpen ? (
            <div className="h-full flex flex-col">
              <div className="flex border-b border-[#1F1F24] bg-[#0B0B0C]">
                <button
                  onClick={() => setLeftSidebarTab("assets")}
                  className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${
                    leftSidebarTab === "assets"
                      ? "border-indigo-500 text-white bg-[#141417]"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  Asset Bins
                </button>
                <button
                  onClick={() => setLeftSidebarTab("ai")}
                  className={`flex-1 py-2 text-xs font-semibold border-b-2 transition flex items-center justify-center space-x-1.5 ${
                    leftSidebarTab === "ai"
                      ? "border-indigo-500 text-white bg-[#141417]"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Director</span>
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {leftSidebarTab === "assets" ? (
                  <AssetBin
                    assets={project.assets}
                    onImportFiles={handleImportFiles}
                    onAddClipToTimeline={(asset) => {
                      const durationSec = Math.max(1, asset.durationSeconds || 5.0);
                      const clipDuration = RationalTimeMath.fromSeconds(durationSec);
                      const isAudio = asset.mimeType?.startsWith("audio/") || Boolean(asset.name.match(/\.(mp3|wav|aac|m4a|flac)$/i));

                      if (isAudio) {
                        const existingAudioTracks = project.editIR.tracks.audioTracks || [];
                        let targetAudioTrack = existingAudioTracks.find((t) => t.type === "BGM") || existingAudioTracks[0];

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
                          timelineRange: { start: RationalTimeMath.fromSeconds(currentTimeSeconds), duration: clipDuration },
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
                          timelineRange: { start: RationalTimeMath.fromSeconds(currentTimeSeconds), duration: clipDuration },
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
                          tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: [...track.clips, newClip] }] },
                        });
                        setSelectedClipId(newClip.id);
                      }
                    }}
                    onRemoveAsset={(id) => setProject({ ...project, assets: project.assets.filter((a) => a.id !== id) })}
                  />
                ) : (
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

                )}
              </div>
            </div>
          ) : (
            <div className="p-2 flex flex-col items-center space-y-4">
              <button
                onClick={() => setIsLeftPanelOpen(true)}
                className="p-2 rounded hover:bg-[#1F1F24] text-gray-400 hover:text-white"
              >
                <Folder className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Center Viewport & Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#07090E]">
          <div className="flex-1 overflow-hidden">
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
              onOpenImport={() => fileInputRef.current?.click()}
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
              onSelectClip={setSelectedClipId}
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
              onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
            />
          </div>
        </div>

        {/* Right Inspector */}
        <div style={{ width: `${rightPanelWidth}px` }} className="h-full border-l border-[#1F1F24] bg-[#0E0E10] flex flex-col shrink-0">
          <ClipInspector
            selectedClip={project.editIR.tracks.videoTracks[0]?.clips.find((c) => c.id === selectedClipId) || null}
            onUpdateTransform={(transform) => {
              if (!selectedClipId) return;
              const track = project.editIR.tracks.videoTracks[0];
              if (!track) return;
              const updated = track.clips.map((c) => (c.id === selectedClipId ? { ...c, transform } : c));
              pushHistory({
                ...project.editIR,
                tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: updated }] },
              });
            }}
            onUpdateSpeed={(speed) => {
              if (!selectedClipId) return;
              const track = project.editIR.tracks.videoTracks[0];
              if (!track) return;
              const updated = track.clips.map((c) => (c.id === selectedClipId ? { ...c, speedMultiplier: speed } : c));
              pushHistory({
                ...project.editIR,
                tracks: { ...project.editIR.tracks, videoTracks: [{ ...track, clips: updated }] },
              });
            }}
            onClose={() => setSelectedClipId(null)}
          />
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
      />

      <ProxyGeneratorModal isOpen={isProxyModalOpen} onClose={() => setIsProxyModalOpen(false)} assets={project.assets} />
      <PluginManagerModal isOpen={isPluginModalOpen} onClose={() => setIsPluginModalOpen(false)} />
      <CacheManagerModal isOpen={isCacheModalOpen} onClose={() => setIsCacheModalOpen(false)} />
      <KeyboardShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />
      <AICriticDrawer
        isOpen={isCriticDrawerOpen}
        onClose={() => setIsCriticDrawerOpen(false)}
        editIR={project.editIR}
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
              const track = updated.tracks.videoTracks.find((t) => t.id === cmd.trackId) || updated.tracks.videoTracks[0];
              if (track) track.clips.push(cmd.clip);
            } else if (cmd.type === "REMOVE_CLIP") {
              const track = updated.tracks.videoTracks.find((t) => t.id === cmd.trackId) || updated.tracks.videoTracks[0];
              if (track) track.clips = track.clips.filter((c) => c.id !== cmd.clipId);
            }
          }
          pushHistory(updated);
          setIsCriticDrawerOpen(false);
        }}
      />
    </div>
  );
};
