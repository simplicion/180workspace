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
import { HeaderBar } from "./components/HeaderBar";
import { AIDirectorPanel } from "./components/AIDirectorPanel";
import { AssetBin } from "./components/AssetBin";
import { CanvasViewport } from "./components/CanvasViewport";
import { Timeline } from "./components/Timeline";
import { ExportModal } from "./components/ExportModal";
import { ClipInspector } from "./components/ClipInspector";
import { CaptionStudioModal } from "./components/CaptionStudioModal";
import { AudioMixerPanel } from "./components/AudioMixerPanel";
import { ProxyGeneratorModal } from "./components/ProxyGeneratorModal";
import { AICriticDrawer } from "./components/AICriticDrawer";
import { PluginManagerModal } from "./components/PluginManagerModal";
import { CacheManagerModal } from "./components/CacheManagerModal";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { HomeScreen } from "./components/HomeScreen";
import { ResizableSplitter } from "./components/ResizableSplitter";
import { ProjectStorageService } from "./services/project-storage";
import { Folder, Sparkles } from "lucide-react";
import { OtioService } from "./services/otio-service";
import { engineBridge, CompanyAIStatus, ExportResult } from "./services/tauri-bridge";

export const App: React.FC = () => {
  // Active View: "home" screen or "editor" workspace
  const [activeView, setActiveView] = useState<"home" | "editor">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("project")) return "editor";
    }
    return "home";
  });

  // Resizable panel dimensions with localStorage persistence
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem("180_media_studio_left_width");
    return saved ? Math.max(240, Math.min(480, parseInt(saved, 10))) : 320;
  });
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem("180_media_studio_right_width");
    return saved ? Math.max(220, Math.min(420, parseInt(saved, 10))) : 288;
  });
  const [timelineHeight, setTimelineHeight] = useState<number>(() => {
    const saved = localStorage.getItem("180_media_studio_timeline_height");
    return saved ? Math.max(160, Math.min(500, parseInt(saved, 10))) : 280;
  });
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState<"assets" | "ai">("assets");

  const [project, setProject] = useState<ProjectPackageManifest | null>(null);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

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

  // Auto-authenticated cloud session state
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

  // Initial Project Load & Auto-Auth Handshake
  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const projId = params?.get("project");
    const template = params?.get("template");
    const token = params?.get("token");
    const companyId = params?.get("companyId");
    const userName = params?.get("user");
    const userEmail = params?.get("email");

    if (token) localStorage.setItem("platform_auth_token", token);
    if (companyId) localStorage.setItem("platform_company_id", companyId);
    if (userName) localStorage.setItem("platform_user_name", userName);
    if (userEmail) localStorage.setItem("platform_user_email", userEmail);

    const resolvedUser = userName || localStorage.getItem("platform_user_name") || "Authenticated Creator";
    const resolvedCompany = companyId || localStorage.getItem("platform_company_id") || "180 Workspace";
    const resolvedToken = token || localStorage.getItem("platform_auth_token");

    setAuthSession({
      userName: resolvedUser,
      companyId: resolvedCompany,
      userEmail: userEmail || localStorage.getItem("platform_user_email") || undefined,
      isAuthenticated: Boolean(resolvedToken || userName),
    });

    // Query active platform AI settings for this company
    fetchCompanyAIStatus(resolvedCompany);

    const initialManifest = projId ? ProjectStorageService.loadProjectManifest(projId) : null;
    if (initialManifest) {
      setProject(initialManifest);
      setHistory([initialManifest.editIR]);
      setHistoryIndex(0);
    } else {
      engineBridge.openProject(projId || undefined).then((proj) => {
        if (template) {
          proj.editIR.directorStyle.preset = template as any;
        }
        if (projId) {
          proj.project.id = projId;
          proj.project.name = `Synced: ${projId}`;
        }
        setProject(proj);
        setHistory([proj.editIR]);
        setHistoryIndex(0);
      });
    }
  }, []);

  const handleLeftResize = (deltaPx: number) => {
    setLeftPanelWidth((prev) => {
      const next = Math.max(240, Math.min(480, prev + deltaPx));
      localStorage.setItem("180_media_studio_left_width", String(next));
      return next;
    });
  };

  const handleRightResize = (deltaPx: number) => {
    setRightPanelWidth((prev) => {
      const next = Math.max(220, Math.min(420, prev - deltaPx));
      localStorage.setItem("180_media_studio_right_width", String(next));
      return next;
    });
  };

  const handleTimelineResize = (deltaPx: number) => {
    setTimelineHeight((prev) => {
      const next = Math.max(160, Math.min(500, prev - deltaPx));
      localStorage.setItem("180_media_studio_timeline_height", String(next));
      return next;
    });
  };

  const handleOpenProject = (projectId: string) => {
    const loaded = ProjectStorageService.loadProjectManifest(projectId);
    if (loaded) {
      setProject(loaded);
      setHistory([loaded.editIR]);
      setHistoryIndex(0);
      setCurrentTimeSeconds(0);
      setIsPlaying(false);
      setSelectedClipId(null);
      setActiveView("editor");
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", `?project=${encodeURIComponent(projectId)}`);
      }
    } else {
      engineBridge.openProject(projectId).then((proj) => {
        setProject(proj);
        setHistory([proj.editIR]);
        setHistoryIndex(0);
        setCurrentTimeSeconds(0);
        setIsPlaying(false);
        setSelectedClipId(null);
        setActiveView("editor");
        if (typeof window !== "undefined") {
          window.history.pushState(null, "", `?project=${encodeURIComponent(projectId)}`);
        }
      });
    }
  };

  const handleNavigateHome = () => {
    if (project) {
      ProjectStorageService.saveProject(project);
      engineBridge.saveProject(project);
    }
    setIsPlaying(false);
    setActiveView("home");
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", window.location.pathname);
    }
  };

  // Real-time 30 FPS Playback Loop
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "KeyS") {
        e.preventDefault();
        handleSplitClip();
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteSelectedClip();
        }
      } else if (e.key === "?" || (e.code === "Slash" && e.shiftKey)) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.code === "KeyE") {
        e.preventDefault();
        setIsExportModalOpen(true);
      } else if (e.key === "Escape") {
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
  }, [selectedClipId, currentTimeSeconds, project]);

  const pushHistory = (newEditIR: EditIR) => {
    if (!project) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEditIR);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setProject({
      ...project,
      editIR: newEditIR,
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0 && project) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setProject({
        ...project,
        editIR: history[targetIndex],
      });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && project) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setProject({
        ...project,
        editIR: history[targetIndex],
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
    }, 600);
  };

  const handleApplyAiPrompt = async (prompt: string) => {
    if (!project) return;
    setIsAiProcessing(true);

    try {
      const result = await engineBridge.executeAutonomousPipeline(
        project.assets[0]?.filePath || "",
        project.editIR.directorStyle.preset,
        prompt,
        authSession.companyId
      );
      if (result.isConfigured === false) {
        alert(result.reply || "AI is not configured for your workspace. Please configure your API key in Settings.");
        return;
      }
      pushHistory(result.editIR);
    } finally {
      setIsAiProcessing(false);
    }
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

    // Check if timeline has only dummy clip or is empty
    const currentClips = project.editIR.tracks.videoTracks[0]?.clips || [];
    let updatedVideoTracks = [...project.editIR.tracks.videoTracks];
    let newTotalDuration = project.editIR.meta.totalDuration;

    if (currentClips.length === 0 || currentClips[0]?.id === "clip_01") {
      const firstAsset = newAssets[0];
      const clipDuration = RationalTimeMath.fromSeconds(firstAsset.durationSeconds);
      const newClip: VideoClip = {
        id: `clip_${Date.now()}`,
        assetId: firstAsset.id,
        sourcePath: firstAsset.filePath,
        sourceRange: { start: RationalTimeMath.fromSeconds(0), duration: clipDuration },
        timelineRange: { start: RationalTimeMath.fromSeconds(0), duration: clipDuration },
        transform: {
          scale: { start: 1.0, end: 1.0, easing: "spring" },
          position: { x: 0, y: 0 },
          anchor: { x: 0.5, y: 0.5 },
          rotationDeg: 0,
          opacity: 1.0,
        },
        speedMultiplier: 1.0,
        effects: [],
      };

      updatedVideoTracks = [
        {
          id: "track_v1",
          type: "MAIN_VIDEO",
          zIndex: 0,
          clips: [newClip],
        },
      ];
      newTotalDuration = clipDuration;
    }

    const updatedIR: EditIR = {
      ...project.editIR,
      meta: {
        ...project.editIR.meta,
        totalDuration: newTotalDuration,
      },
      tracks: {
        ...project.editIR.tracks,
        videoTracks: updatedVideoTracks,
      },
    };

    setProject({
      ...project,
      assets: [...project.assets, ...newAssets],
      editIR: updatedIR,
    });
    pushHistory(updatedIR);
  };

  const handleRemoveAsset = (assetId: string) => {
    if (!project) return;
    setProject({
      ...project,
      assets: project.assets.filter((a) => a.id !== assetId),
    });
  };

  const handleLoadSampleDemo = () => {
    if (!project) return;
    const demoAsset: MediaAssetDescriptor = {
      id: "asset_sample_demo",
      name: "saas_platform_walkthrough.mp4",
      filePath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      fileSizeBytes: 1024 * 1024 * 18,
      mimeType: "video/mp4",
      durationSeconds: 15.0,
      width: 1920,
      height: 1080,
      fps: 30,
      hasAudio: true,
      codecVideo: "h264",
      codecAudio: "aac",
      sha256Hash: "demo_hash_999",
    };

    const duration = RationalTimeMath.fromSeconds(15.0);
    const demoClip: VideoClip = {
      id: `clip_demo_${Date.now()}`,
      assetId: demoAsset.id,
      sourcePath: demoAsset.filePath,
      sourceRange: { start: RationalTimeMath.fromSeconds(0), duration },
      timelineRange: { start: RationalTimeMath.fromSeconds(0), duration },
      transform: {
        scale: { start: 1.0, end: 1.0, easing: "spring" },
        position: { x: 0, y: 0 },
        anchor: { x: 0.5, y: 0.5 },
        rotationDeg: 0,
        opacity: 1.0,
      },
      speedMultiplier: 1.0,
      effects: [],
    };

    const updatedIR: EditIR = {
      ...project.editIR,
      meta: {
        ...project.editIR.meta,
        totalDuration: duration,
      },
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [
          {
            id: "track_v1",
            type: "MAIN_VIDEO",
            zIndex: 0,
            clips: [demoClip],
          },
        ],
      },
    };

    setProject({
      ...project,
      assets: [demoAsset, ...project.assets.filter((a) => a.id !== demoAsset.id)],
      editIR: updatedIR,
    });
    pushHistory(updatedIR);
    setCurrentTimeSeconds(0);
  };

  const handleAddClipToTimeline = (asset: MediaAssetDescriptor) => {
    if (!project) return;
    const duration = RationalTimeMath.fromSeconds(asset.durationSeconds);
    const timelineStart = project.editIR.meta.totalDuration;

    const newClip = {
      id: `clip_${Date.now()}`,
      assetId: asset.id,
      sourcePath: asset.filePath,
      sourceRange: { start: RationalTimeMath.fromSeconds(0), duration },
      timelineRange: { start: timelineStart, duration },
      transform: {
        scale: { start: 1.0, end: 1.0, easing: "spring" as const },
        position: { x: 0, y: 0 },
        anchor: { x: 0.5, y: 0.5 },
        rotationDeg: 0,
        opacity: 1.0,
      },
      speedMultiplier: 1.0,
      effects: [],
    };

    const updatedIR: EditIR = {
      ...project.editIR,
      meta: {
        ...project.editIR.meta,
        totalDuration: RationalTimeMath.add(timelineStart, duration),
      },
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [
          {
            ...project.editIR.tracks.videoTracks[0],
            clips: [...project.editIR.tracks.videoTracks[0].clips, newClip],
          },
        ],
      },
    };

    pushHistory(updatedIR);
  };

  const handleSplitClip = () => {
    if (!project) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    const clipIndex = mainTrack.clips.findIndex((clip) => {
      const start = RationalTimeMath.toSeconds(clip.timelineRange.start);
      const end = start + RationalTimeMath.toSeconds(clip.timelineRange.duration);
      return currentTimeSeconds > start && currentTimeSeconds < end;
    });

    if (clipIndex === -1) return;

    const clip = mainTrack.clips[clipIndex];
    const clipStartSec = RationalTimeMath.toSeconds(clip.timelineRange.start);
    const firstDurationSec = currentTimeSeconds - clipStartSec;
    const secondDurationSec = RationalTimeMath.toSeconds(clip.timelineRange.duration) - firstDurationSec;

    const firstClip = {
      ...clip,
      id: `clip_split_1_${Date.now()}`,
      timelineRange: {
        start: clip.timelineRange.start,
        duration: RationalTimeMath.fromSeconds(firstDurationSec),
      },
      sourceRange: {
        start: clip.sourceRange.start,
        duration: RationalTimeMath.fromSeconds(firstDurationSec),
      },
    };

    const secondClip = {
      ...clip,
      id: `clip_split_2_${Date.now()}`,
      timelineRange: {
        start: RationalTimeMath.fromSeconds(currentTimeSeconds),
        duration: RationalTimeMath.fromSeconds(secondDurationSec),
      },
      sourceRange: {
        start: RationalTimeMath.add(clip.sourceRange.start, RationalTimeMath.fromSeconds(firstDurationSec)),
        duration: RationalTimeMath.fromSeconds(secondDurationSec),
      },
    };

    const updatedClips = [...mainTrack.clips];
    updatedClips.splice(clipIndex, 1, firstClip, secondClip);

    const updatedIR: EditIR = {
      ...project.editIR,
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [
          {
            ...mainTrack,
            clips: updatedClips,
          },
        ],
      },
    };

    pushHistory(updatedIR);
  };

  const handleDeleteSelectedClip = () => {
    if (!project || !selectedClipId) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    const updatedClips = mainTrack.clips.filter((c) => c.id !== selectedClipId);

    const updatedIR: EditIR = {
      ...project.editIR,
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [
          {
            ...mainTrack,
            clips: updatedClips,
          },
        ],
      },
    };

    setSelectedClipId(null);
    pushHistory(updatedIR);
  };

  const handleUpdateTransform = (transform: Transform) => {
    if (!project || !selectedClipId) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    const updatedClips = mainTrack.clips.map((c) =>
      c.id === selectedClipId ? { ...c, transform } : c
    );

    const updatedIR: EditIR = {
      ...project.editIR,
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [
          {
            ...mainTrack,
            clips: updatedClips,
          },
        ],
      },
    };

    pushHistory(updatedIR);
  };

  const handleUpdateSpeed = (speedMultiplier: number) => {
    if (!project || !selectedClipId) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    const updatedClips = mainTrack.clips.map((c) =>
      c.id === selectedClipId ? { ...c, speedMultiplier } : c
    );

    const updatedIR: EditIR = {
      ...project.editIR,
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [
          {
            ...mainTrack,
            clips: updatedClips,
          },
        ],
      },
    };

    pushHistory(updatedIR);
  };

  const handleUpdateCaptions = (captionTrack: CaptionSegment[]) => {
    if (!project) return;
    const updatedIR: EditIR = {
      ...project.editIR,
      tracks: {
        ...project.editIR.tracks,
        captionTrack,
      },
    };
    pushHistory(updatedIR);
  };

  const handleApplyCriticRepairs = (repairs: EditCommand[]) => {
    if (!project) return;
    let updatedIR = { ...project.editIR };

    repairs.forEach((cmd) => {
      if (cmd.type === "ADD_CAMERA_EVENT") {
        updatedIR = {
          ...updatedIR,
          tracks: {
            ...updatedIR.tracks,
            cameraTrack: [...updatedIR.tracks.cameraTrack, cmd.event],
          },
        };
      }
    });

    pushHistory(updatedIR);
    setIsCriticDrawerOpen(false);
  };

  const handleUpdateClipTiming = (clipId: string, newStartSec: number, newDurationSec: number) => {
    if (!project) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    if (!mainTrack) return;

    const updatedClips = mainTrack.clips.map((clip) => {
      if (clip.id === clipId) {
        return {
          ...clip,
          timelineRange: {
            start: RationalTimeMath.fromSeconds(newStartSec),
            duration: RationalTimeMath.fromSeconds(newDurationSec),
          },
        };
      }
      return clip;
    });

    let maxSec = 0;
    updatedClips.forEach((c) => {
      const endSec =
        RationalTimeMath.toSeconds(c.timelineRange.start) +
        RationalTimeMath.toSeconds(c.timelineRange.duration);
      if (endSec > maxSec) maxSec = endSec;
    });

    const updatedIR: EditIR = {
      ...project.editIR,
      meta: {
        ...project.editIR.meta,
        totalDuration: RationalTimeMath.fromSeconds(Math.max(maxSec, 4)),
      },
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [
          {
            ...mainTrack,
            clips: updatedClips,
          },
        ],
      },
    };

    setProject({ ...project, editIR: updatedIR });
  };

  const handleCommitDragHistory = () => {
    if (!project) return;
    pushHistory(project.editIR);
  };

  const handleUpdateTrackVolume = (trackId: string, volumeDb: number) => {
    if (!project) return;
    const existing = project.editIR.tracks.audioTracks;
    let updatedAudioTracks: typeof existing;

    if (existing.some((t) => t.id === trackId)) {
      updatedAudioTracks = existing.map((t) =>
        t.id === trackId ? { ...t, volumeDb } : t
      );
    } else {
      updatedAudioTracks = [
        ...existing,
        {
          id: trackId,
          type: trackId.includes("a1") ? "PRIMARY_VOICE" : trackId.includes("a2") ? "BGM" : "SFX",
          duckWithSpeech: trackId.includes("a2"),
          clips: [],
          volumeDb,
        },
      ];
    }

    const updatedIR: EditIR = {
      ...project.editIR,
      tracks: {
        ...project.editIR.tracks,
        audioTracks: updatedAudioTracks,
      },
    };

    setProject({ ...project, editIR: updatedIR });
    pushHistory(updatedIR);
  };

  const handleDuplicateClip = () => {
    if (!project || !selectedClipId) return;
    const mainTrack = project.editIR.tracks.videoTracks[0];
    const clip = mainTrack.clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const clipStart = RationalTimeMath.toSeconds(clip.timelineRange.start);
    const clipDuration = RationalTimeMath.toSeconds(clip.timelineRange.duration);
    const dupStart = clipStart + clipDuration;

    const dupClip: VideoClip = {
      ...clip,
      id: `clip_dup_${Date.now()}`,
      timelineRange: {
        start: RationalTimeMath.fromSeconds(dupStart),
        duration: clip.timelineRange.duration,
      },
    };

    const updatedClips = [...mainTrack.clips, dupClip];
    const updatedIR: EditIR = {
      ...project.editIR,
      meta: {
        ...project.editIR.meta,
        totalDuration: RationalTimeMath.fromSeconds(
          Math.max(
            RationalTimeMath.toSeconds(project.editIR.meta.totalDuration),
            dupStart + clipDuration
          )
        ),
      },
      tracks: {
        ...project.editIR.tracks,
        videoTracks: [
          {
            ...mainTrack,
            clips: updatedClips,
          },
        ],
      },
    };

    setSelectedClipId(dupClip.id);
    pushHistory(updatedIR);
  };

  const handleStepFrame = (direction: -1 | 1) => {
    setCurrentTimeSeconds((prev) => Math.max(0, prev + direction * (1 / 30)));
  };

  const handleStartExport = async (settings: { format: string; resolution: string; fps: number }) => {
    if (!project) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportedResult(null);
    setExportedPath(null);

    try {
      const result = await engineBridge.renderExport(project.editIR, settings, (pct) => {
        setExportProgress(pct);
      });
      setExportedResult(result);
      setExportedPath(result.blobUrl || result.downloadName);
    } catch (err) {
      console.error("Export render error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (activeView === "home") {
    return <HomeScreen onOpenProject={handleOpenProject} companyAIStatus={companyAIStatus} />;
  }

  if (!project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#080A0F] text-gray-400 font-mono text-xs">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 animate-spin" />
          <span>Loading 180 Autonomous Engine...</span>
        </div>
      </div>
    );
  }

  const selectedClip =
    project.editIR.tracks.videoTracks[0]?.clips.find((c) => c.id === selectedClipId) || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#080A0F] text-gray-100 overflow-hidden font-sans select-none">
      {/* 1. Top Header Bar */}
      <HeaderBar
        projectName={project.project.name}
        authSession={authSession}
        companyAIStatus={companyAIStatus}
        isAiProcessing={isAiProcessing}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        onOpenExport={() => {
          setExportedPath(null);
          setExportProgress(null);
          setIsExportModalOpen(true);
        }}
        onOpenCaptions={() => setIsCaptionsModalOpen(true)}
        onOpenMixer={() => setIsMixerModalOpen(true)}
        onOpenProxies={() => setIsProxyModalOpen(true)}
        onOpenPlugins={() => setIsPluginModalOpen(true)}
        onOpenCache={() => setIsCacheModalOpen(true)}
        onOpenCritic={() => setIsCriticDrawerOpen(true)}
        onExportOtio={() => OtioService.exportToOtioFile(project.editIR, `${project.project.name}.otio`)}
        onSave={() => {
          ProjectStorageService.saveProject(project);
          engineBridge.saveProject(project);
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNavigateHome={handleNavigateHome}
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
      />

      {/* 2. Middle Body: Resizable Left Sidebar + Center Viewport + Resizable Right Inspector */}
      <div className="flex-1 flex min-h-0 relative bg-[#080A0F] overflow-hidden">
        {isLeftPanelOpen && (
          <>
            <div
              style={{ width: `${leftPanelWidth}px` }}
              className="h-full shrink-0 flex flex-col border-r border-[#222838] bg-[#0E1118] overflow-hidden select-none"
            >
              {/* Tab Switcher: Media Assets vs AI Director */}
              <div className="h-9 border-b border-[#222838] bg-[#141822] flex items-center px-2 space-x-1 shrink-0">
                <button
                  onClick={() => setLeftSidebarTab("assets")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition ${
                    leftSidebarTab === "assets"
                      ? "bg-[#0E1118] text-white border border-[#222838] shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Media Bin</span>
                  <span className="text-[10px] text-gray-500 font-mono ml-0.5">({project.assets.length})</span>
                </button>
                <button
                  onClick={() => setLeftSidebarTab("ai")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition ${
                    leftSidebarTab === "ai"
                      ? "bg-[#0E1118] text-white border border-[#222838] shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>AI Director</span>
                  {companyAIStatus?.isConfigured && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {leftSidebarTab === "assets" ? (
                  <AssetBin
                    assets={project.assets}
                    onImportFiles={handleImportFiles}
                    onAddClipToTimeline={handleAddClipToTimeline}
                    onRemoveAsset={handleRemoveAsset}
                    onLoadSampleDemo={handleLoadSampleDemo}
                  />
                ) : (
                  <AIDirectorPanel
                    currentPreset={project.editIR.directorStyle.preset}
                    onSelectPreset={handleSelectPreset}
                    onApplyPrompt={handleApplyAiPrompt}
                    isProcessing={isAiProcessing}
                    companyAIStatus={companyAIStatus}
                    onRefreshAIStatus={() => fetchCompanyAIStatus(authSession.companyId)}
                  />
                )}
              </div>
            </div>

            {/* Splitter between Left Sidebar and Center Viewport */}
            <ResizableSplitter
              direction="horizontal"
              onResize={handleLeftResize}
              onDoubleClick={() => setLeftPanelWidth(320)}
              title="Drag to resize Media/AI sidebar (Double-click to reset to 320px)"
            />
          </>
        )}

        {/* Global Hidden Native File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleImportFiles(e.target.files);
              e.target.value = "";
            }
          }}
          accept="video/*,audio/*,image/*"
          multiple
          className="hidden"
        />

        {/* Center Canvas Viewport */}
        <div className="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden">
          <CanvasViewport
            editIR={project.editIR}
            assets={project.assets}
            currentTimeSeconds={currentTimeSeconds}
            isPlaying={isPlaying}
            aspectRatio={aspectRatio}
            selectedClipId={selectedClipId}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSeek={(sec) => setCurrentTimeSeconds(sec)}
            onStepFrame={handleStepFrame}
            onAspectRatioChange={setAspectRatio}
            onOpenImport={() => fileInputRef.current?.click()}
          />
        </div>

        {/* Right Clip Inspector */}
        {selectedClip && (
          <>
            <ResizableSplitter
              direction="horizontal"
              onResize={handleRightResize}
              onDoubleClick={() => setRightPanelWidth(288)}
              title="Drag to resize Inspector (Double-click to reset to 288px)"
            />
            <div
              style={{ width: `${rightPanelWidth}px` }}
              className="h-full shrink-0 flex flex-col border-l border-[#222838] bg-[#0E1118] overflow-hidden"
            >
              <ClipInspector
                selectedClip={selectedClip}
                onUpdateTransform={handleUpdateTransform}
                onUpdateSpeed={handleUpdateSpeed}
                onClose={() => setSelectedClipId(null)}
              />
            </div>
          </>
        )}

        {/* AI Critic Drawer */}
        <AICriticDrawer
          isOpen={isCriticDrawerOpen}
          onClose={() => setIsCriticDrawerOpen(false)}
          editIR={project.editIR}
          onApplyRepairs={handleApplyCriticRepairs}
        />
      </div>

      {/* Splitter above Timeline */}
      <ResizableSplitter
        direction="vertical"
        onResize={handleTimelineResize}
        onDoubleClick={() => setTimelineHeight(280)}
        title="Drag to resize Timeline height (Double-click to reset to 280px)"
      />

      {/* 3. Bottom Multi-Track Timeline */}
      <Timeline
        height={timelineHeight}
        editIR={project.editIR}
        currentTimeSeconds={currentTimeSeconds}
        zoomLevel={zoomLevel}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onSeek={(sec) => setCurrentTimeSeconds(sec)}
        onZoomChange={setZoomLevel}
        onSplitClip={handleSplitClip}
        onDeleteSelectedClip={handleDeleteSelectedClip}
        onUpdateClipTiming={handleUpdateClipTiming}
        onCommitHistory={handleCommitDragHistory}
        onDuplicateClip={handleDuplicateClip}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* 4. Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        editIR={project.editIR}
        onStartExport={handleStartExport}
        exportProgress={exportProgress}
        isExporting={isExporting}
        exportedResult={exportedResult}
        exportedPath={exportedPath}
      />

      <CaptionStudioModal
        isOpen={isCaptionsModalOpen}
        onClose={() => setIsCaptionsModalOpen(false)}
        captions={project.editIR.tracks.captionTrack}
        onUpdateCaptions={handleUpdateCaptions}
      />

      <AudioMixerPanel
        isOpen={isMixerModalOpen}
        onClose={() => setIsMixerModalOpen(false)}
        audioTracks={project.editIR.tracks.audioTracks}
        onUpdateTrackVolume={handleUpdateTrackVolume}
        onToggleDucking={setIsDuckingEnabled}
        isDuckingEnabled={isDuckingEnabled}
      />

      <ProxyGeneratorModal
        isOpen={isProxyModalOpen}
        onClose={() => setIsProxyModalOpen(false)}
        assets={project.assets}
        onGenerateProxies={async () => {
          await new Promise((r) => setTimeout(r, 1500));
        }}
      />

      <PluginManagerModal
        isOpen={isPluginModalOpen}
        onClose={() => setIsPluginModalOpen(false)}
      />

      <CacheManagerModal
        isOpen={isCacheModalOpen}
        onClose={() => setIsCacheModalOpen(false)}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
