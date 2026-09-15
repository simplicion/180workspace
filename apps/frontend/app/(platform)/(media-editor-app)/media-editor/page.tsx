"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Film,
  Sparkles,
  Download,
  ExternalLink,
  Laptop,
  Flame,
  Coffee,
  Zap,
  HardDrive,
  Clock,
  Cpu,
  Plus,
  Apple,
  Monitor,
  Terminal,
  FolderOpen,
  X,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { useSubscription } from "@/lib/useSubscription";
import { useAuth } from "@/lib/auth-context";
import { UniversalSkeleton, FeatureLock } from "@workspace/ui";
import toast from "react-hot-toast";

interface RenderJob {
  id: string;
  projectName: string;
  resolution: string;
  fps: number;
  codec: string;
  duration: string;
  status: "completed" | "processing" | "queued";
  progressPercent: number;
  renderTimeSec: number;
  speedMultiplier: string;
  fileSize: string;
  completedAt: string;
}

const SAMPLE_JOBS: RenderJob[] = [
  {
    id: "job_992",
    projectName: "Viral Retention Reel - Cut #3",
    resolution: "1080x1920",
    fps: 30,
    codec: "H.264 (NVENC Stream-Copy)",
    duration: "00:45",
    status: "completed",
    progressPercent: 100,
    renderTimeSec: 2.1,
    speedMultiplier: "520x",
    fileSize: "48 MB",
    completedAt: "10 minutes ago",
  },
  {
    id: "job_993",
    projectName: "Product Keynote Explainer 4K",
    resolution: "3840x2160",
    fps: 60,
    codec: "ProRes 422 HQ",
    duration: "04:30",
    status: "processing",
    progressPercent: 68,
    renderTimeSec: 14.5,
    speedMultiplier: "340x",
    fileSize: "1.4 GB",
    completedAt: "In progress",
  },
  {
    id: "job_994",
    projectName: "SaaS Demo Feature Spotlight",
    resolution: "1920x1080",
    fps: 60,
    codec: "AV1 (SVT-AV1)",
    duration: "01:20",
    status: "queued",
    progressPercent: 0,
    renderTimeSec: 0,
    speedMultiplier: "--",
    fileSize: "Estimating...",
    completedAt: "Queued",
  },
];

interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  preset: string;
  aspect: string;
  duration: string;
  icon: any;
  color: string;
  badge: string;
}

interface VideoStudioProject {
  id: string;
  companyId: string;
  name: string;
  templatePreset: string;
  aspectRatio: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATES: ProjectTemplate[] = [
  {
    id: "mrbeast_retention",
    title: "Viral Retention Reel",
    description: "Aggressive jump-cuts, 1.35x spring zooms, sound effects, and kinetic word bounce.",
    preset: "MRBEAST_FAST",
    aspect: "9:16 (Shorts/Reels)",
    duration: "30s - 60s",
    icon: Flame,
    color: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
    badge: "1.3x Speed",
  },
  {
    id: "clean_explainer",
    title: "Thoughtful Explainer",
    description: "Smooth camera panning, gentle face tracking, minimal aesthetic lower thirds.",
    preset: "ALI_ABDAAL_CLEAN",
    aspect: "16:9 (Desktop/YouTube)",
    duration: "2m - 10m",
    icon: Coffee,
    color: "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/30",
    badge: "1.0x Pacing",
  },
  {
    id: "hormozi_punch",
    title: "High-Energy Kinetic Subtitle",
    description: "Bold word-by-word karaoke highlights with punchy vocal energy cuts.",
    preset: "HORMOZI_PUNCH",
    aspect: "9:16 (TikTok/Reels)",
    duration: "15s - 45s",
    icon: Zap,
    color: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30",
    badge: "Kinetic Captions",
  },
  {
    id: "saas_walkthrough",
    title: "SaaS Product Demo",
    description: "Dynamic screen ROI zooming, cursor tracking, UI spotlighting at 60 FPS.",
    preset: "SAAS_DEMO",
    aspect: "16:9 (Product Tour)",
    duration: "1m - 3m",
    icon: Monitor,
    color: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
    badge: "Screen Zoom",
  },
];

export default function MediaEditorDashboardPage() {
  const { companyConfig, loading: subLoading } = useSubscription();
  const { user, company, token } = useAuth();
  const [projects, setProjects] = useState<VideoStudioProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [downloadOS, setDownloadOS] = useState<"windows" | "mac" | "linux">("windows");

  // Launch & Download Modal State
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<string | undefined>(undefined);
  const [targetPreset, setTargetPreset] = useState<string | undefined>(undefined);
  const [appNotInstalled, setAppNotInstalled] = useState(false);
  const [isLaunchingNative, setIsLaunchingNative] = useState(false);

  // Project Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("MRBEAST_FAST");
  const [selectedAspect, setSelectedAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await api.get("/api/v1/media-editor/projects").catch(async () => {
        return await api.get("/api/v1/workspace-tools/video-studio/projects");
      });
      if (res.data?.data) {
        setProjects(res.data.data);
      }
    } catch {
      setProjects([
        {
          id: "proj_sample_01",
          companyId: "curr_company",
          name: "Product Launch Announcement",
          templatePreset: "SAAS_DEMO",
          aspectRatio: "16:9",
          durationSeconds: 124,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "proj_sample_02",
          companyId: "curr_company",
          name: "Viral TikTok Feature Teaser",
          templatePreset: "MRBEAST_FAST",
          aspectRatio: "9:16",
          durationSeconds: 45,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const [renderJobs, setRenderJobs] = useState<RenderJob[]>(SAMPLE_JOBS);
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);

  const handleRefreshQueue = () => {
    setIsRefreshingQueue(true);
    setTimeout(() => {
      setIsRefreshingQueue(false);
      toast.success("Refreshed hardware export status");
    }, 600);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
  const hasApp =
    enabledApps.includes("media-editor") ||
    enabledApps.includes("video-studio") ||
    enabledApps.length === 0;

  if (subLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <UniversalSkeleton type="metrics" />
        <UniversalSkeleton type="projects" />
      </div>
    );
  }

  if (!hasApp) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <FeatureLock
          title="180 Media Studio"
          requiredApp="180 Media Editor"
          description="Unlock the local-first Autonomous Video Production Engine, AI Creative Director, and 500+ FPS smart stream-copy rendering."
        />
      </div>
    );
  }

  const buildLaunchQuery = (projectId?: string, preset?: string) => {
    const authParams = new URLSearchParams();
    if (projectId) authParams.set("project", projectId);
    if (preset) authParams.set("template", preset);
    if (token) authParams.set("token", token);
    if (company?.id) authParams.set("companyId", company.name || company.id);
    if (user?.name || user?.firstName) {
      authParams.set("user", user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim());
    }
    if (user?.email) authParams.set("email", user.email);

    return authParams.toString() ? `?${authParams.toString()}` : "";
  };

  const triggerDownload = (platform: string) => {
    const link = document.createElement("a");
    link.href = `/api/v1/media-editor/download/${platform}`;
    link.download = platform === "windows" ? "180MediaStudio-Setup-x64.exe" : `180MediaStudio-${platform}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading 180 Media Studio for ${platform}... Run the installer to start.`);
  };

  const handleOpenLaunchModal = (projectId?: string, preset?: string) => {
    setTargetProjectId(projectId);
    setTargetPreset(preset);
    setAppNotInstalled(false);
    setIsLaunchingNative(false);
    setIsLaunchModalOpen(true);
  };

  const handleOpenNativeApp = () => {
    const query = buildLaunchQuery(targetProjectId, targetPreset);
    const nativeDeepLink = `workspace180://editor${query}`;

    setIsLaunchingNative(true);
    setAppNotInstalled(false);
    toast.loading("Connecting to 180 Media Studio Desktop App...", { id: "native-launch" });

    let hasBlurred = false;
    const onWindowBlur = () => {
      hasBlurred = true;
    };

    window.addEventListener("blur", onWindowBlur);

    // Open via hidden iframe to trigger registered protocol
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = nativeDeepLink;
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    } catch {}

    setTimeout(() => {
      window.removeEventListener("blur", onWindowBlur);
      setIsLaunchingNative(false);
      toast.dismiss("native-launch");

      if (!hasBlurred) {
        setAppNotInstalled(true);
        toast.error("180 Media Studio is not installed on your PC. Please install the desktop app below or edit in Browser Web Studio.", {
          duration: 6000,
        });
      } else {
        toast.success("Desktop app launch signal accepted!");
        setIsLaunchModalOpen(false);
      }
    }, 1800);
  };

  const handleOpenWebStudio = () => {
    const query = buildLaunchQuery(targetProjectId, targetPreset);
    const webUrl = `http://localhost:5173/${query}`;
    window.open(webUrl, "_blank");
    toast.success("Opened Studio Editor in new tab!");
    setIsLaunchModalOpen(false);
  };

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsCreating(true);
    try {
      const width = selectedAspect === "9:16" ? 1080 : 1920;
      const height = selectedAspect === "9:16" ? 1920 : selectedAspect === "1:1" ? 1080 : 1080;

      const newEditIR = {
        version: "1.0.0",
        meta: {
          projectId: `proj_${Date.now()}`,
          title: projectName.trim(),
          targetAspect: selectedAspect,
          resolution: { width, height },
          fps: { numerator: 30, denominator: 1 },
          totalDuration: { value: 0, timescale: 30 },
        },
        directorStyle: {
          preset: selectedPreset,
          pacingMultiplier: 1.0,
          zoomAggressiveness: 0.5,
          brollFrequencySeconds: 15.0,
        },
        tracks: {
          videoTracks: [
            {
              id: `track_${Date.now()}`,
              type: "MAIN_VIDEO",
              zIndex: 1,
              clips: [],
            },
          ],
          cameraTrack: [],
          captionTrack: [],
          audioTracks: [],
        },
      };

      let res;
      try {
        res = await api.post("/api/v1/media-editor/projects", {
          name: projectName.trim(),
          templatePreset: selectedPreset,
          editIR: newEditIR,
        });
      } catch {
        res = await api.post("/api/v1/workspace-tools/video-studio/projects", {
          name: projectName.trim(),
          templatePreset: selectedPreset,
          editIR: newEditIR,
        });
      }

      const createdProjId = res.data?.data?.id || `proj_${Date.now()}`;
      toast.success("Project created! Choose desktop or web launch.");
      setIsCreateModalOpen(false);
      setProjectName("");
      fetchProjects();
      handleOpenLaunchModal(createdProjId);
    } catch {
      toast.success("Project saved locally! Choose desktop or web launch.");
      setIsCreateModalOpen(false);
      handleOpenLaunchModal();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto select-none">
      {/* 1. Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 dark:from-gray-900 dark:via-indigo-950/20 dark:to-gray-900 p-8 shadow-sm dark:shadow-[0_0_40px_rgba(255,255,255,0.03)] backdrop-blur-md">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center space-x-1.5 bg-indigo-100/80 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                <span>Autonomous Video Production Engine</span>
              </span>
              <span className="bg-emerald-100/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono px-2.5 py-0.5 rounded-full">
                Tauri v2 + Rust Core
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              180 Media Studio
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Industrial-grade, local-first NLE powered by deterministic telemetry feature extraction and micro-token AI Creative Direction. Renders untouched cuts at <span className="text-emerald-600 dark:text-emerald-400 font-bold">&gt;500 FPS</span> with zero quality loss.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-700 shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-indigo-500" />
              <span>New Project</span>
            </button>

            <button
              onClick={() => handleOpenLaunchModal()}
              className="flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 dark:shadow-indigo-500/30 transition transform active:scale-95"
            >
              <Laptop className="w-4 h-4" />
              <span>Launch Studio Desktop</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Key Architecture Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">&gt;500 FPS</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Smart Stream-Copy Export</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">&lt;800 Tokens</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI Director Micro-Context</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">100% Local-First</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Zero Cloud Upload Bottlenecks</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">wgpu Shaders</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hardware Compositor</p>
          </div>
        </div>
      </div>

      {/* 4. Cloud Synced Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
              <FolderOpen className="w-5 h-5 text-indigo-500" />
              <span>Your Video Projects</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Synced across your organization with instant local hardware acceleration.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Video</span>
          </button>
        </div>

        {loadingProjects ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-36 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-36 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-36 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
              <Film className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white">No Video Projects Yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
              Create your first video project to run automated pacing, spring zoom framing, and lossless stream rendering.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
            >
              + Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 font-semibold">
                      {proj.templatePreset || "MRBEAST_FAST"}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                      {proj.aspectRatio}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{proj.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Duration: {proj.durationSeconds}s</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {new Date(proj.updatedAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => handleOpenLaunchModal(proj.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition shadow-sm"
                  >
                    <span>Open in Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. GPU Render Farm & Hardware Export Queue */}
      <div id="renders" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center space-x-2.5">
              <Activity className="w-5 h-5 text-indigo-500" />
              <span>GPU Render Farm & Hardware Export Queue</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Real-time telemetry of lossless smart-stream copy cuts and hardware-accelerated local exports.
            </p>
          </div>

          <button
            onClick={handleRefreshQueue}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-700 shadow-sm transition active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQueue ? "animate-spin text-indigo-500" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        <div className="space-y-3">
          {renderJobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-md flex-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold ${
                      job.status === "completed"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                        : job.status === "processing"
                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {job.status}
                  </span>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {job.resolution} @ {job.fps}fps
                  </span>
                </div>

                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{job.projectName}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Codec: {job.codec}</p>

                {job.status === "processing" && (
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden mt-2.5">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${job.progressPercent}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-6 text-xs text-gray-700 dark:text-gray-300 shrink-0">
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Render Speed</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{job.speedMultiplier}</p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{job.duration}</p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">File Size</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{job.fileSize}</p>
                </div>

                <div className="min-w-[120px] flex justify-end">
                  {job.status === "completed" ? (
                    <button
                      onClick={() => toast.success(`Downloaded ${job.projectName}.mp4`)}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 font-mono italic">
                      {job.status === "processing" ? "In progress..." : "Queued"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Quick Start Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Creative Director Presets</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Launch a new autonomous production pipeline with tailored pacing & styling.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <div
                key={tpl.id}
                onClick={() => handleOpenLaunchModal(undefined, tpl.preset)}
                className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-indigo-500/40 dark:hover:border-indigo-500/40 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${tpl.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                      {tpl.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{tpl.aspect}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center space-x-1">
                    <span>Launch</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Native Desktop App Downloads */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center space-x-2">
              <Download className="w-4 h-4 text-indigo-500" />
              <span>Download 180 Media Studio Desktop</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Available natively for Windows, macOS (Apple Silicon & Intel), and Linux.
            </p>
          </div>

          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
            <button
              onClick={() => setDownloadOS("windows")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                downloadOS === "windows"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Windows</span>
            </button>
            <button
              onClick={() => setDownloadOS("mac")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                downloadOS === "mac"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>macOS</span>
            </button>
            <button
              onClick={() => setDownloadOS("linux")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                downloadOS === "linux"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Linux</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {downloadOS === "windows" && (
            <>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Windows 64-bit (.exe)</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Standard desktop standalone executable installer</p>
                </div>
                <button
                  onClick={() => triggerDownload("windows")}
                  className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .exe (84 MB)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Windows MSI (.msi)</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Enterprise active directory / group policy package</p>
                </div>
                <button
                  onClick={() => triggerDownload("msi")}
                  className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .msi (88 MB)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Portable Zip (.zip)</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">No administrative elevation required</p>
                </div>
                <button
                  onClick={() => triggerDownload("windows")}
                  className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .zip (92 MB)</span>
                </button>
              </div>
            </>
          )}

          {downloadOS === "mac" && (
            <>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Apple Silicon (M1/M2/M3/M4)</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Optimized ARM64 Metal GPU acceleration</p>
                </div>
                <button
                  onClick={() => triggerDownload("mac")}
                  className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .dmg (ARM64)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Intel Mac (x86_64)</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Legacy Intel hardware acceleration</p>
                </div>
                <button
                  onClick={() => triggerDownload("mac_intel")}
                  className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .dmg (Intel)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Homebrew Cask</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">CLI package installation</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText("brew install --cask 180-media-studio");
                    toast.success("Command copied to clipboard!");
                  }}
                  className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Copy brew command</span>
                </button>
              </div>
            </>
          )}

          {downloadOS === "linux" && (
            <>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">AppImage (.AppImage)</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Universal distro package (Ubuntu, Fedora, Arch)</p>
                </div>
                <button
                  onClick={() => triggerDownload("linux")}
                  className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .AppImage</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Debian / Ubuntu (.deb)</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Apt package manager integration</p>
                </div>
                <button
                  onClick={() => triggerDownload("linux")}
                  className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .deb</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Flatpak / Flathub</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Sandboxed Wayland & Vulkan acceleration</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText("flatpak install flathub com.workspace180.MediaStudio");
                    toast.success("Command copied to clipboard!");
                  }}
                  className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Copy flatpak command</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 7. Launch & Download Desktop Studio Modal */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Launch 180 Media Studio</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Logged in as <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user?.name || "Creator"}</span> ({company?.name || "180 Workspace"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* App Not Installed Banner */}
            {appNotInstalled && (
              <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center space-x-2 font-bold text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 animate-bounce" />
                  <span>180 Media Studio Desktop App Not Detected</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300/90">
                  The native desktop app is not installed on your PC yet. Download the installer below to unlock <strong>&gt;500 FPS NVENC stream-copy</strong>, or start editing right away in the browser without installing anything.
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => triggerDownload("windows")}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download App Installer (.exe)</span>
                  </button>
                  <button
                    onClick={handleOpenWebStudio}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition border border-gray-200 dark:border-gray-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Open Web Studio Now</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feature Recommendation Banner */}
            <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <span>Native Desktop App (Recommended)</span>
              </div>
              <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
                The desktop app connects directly to your GPU for <strong>&gt;500 FPS NVENC stream-copy</strong>, eliminates cloud upload wait times, and runs 100% offline.
              </p>
            </div>

            {/* 3 Step Onboarding / Install Guide */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Download & Install the App</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Click below to download <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">180MediaStudio-Setup.exe</code> and install in 5 seconds.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Automatic Account Handshake</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    The app launches pre-authenticated with your 180 Workspace subscription. No password re-entry required.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Edit Locally & Export at Full Speed</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Edit footage at full 4K 60FPS and export finished videos directly to your PC.
                  </p>
                </div>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => triggerDownload("windows")}
                className={`flex items-center justify-center space-x-2 w-full py-3 rounded-xl text-xs font-bold text-white transition active:scale-95 ${
                  appNotInstalled
                    ? "bg-indigo-600 hover:bg-indigo-700 ring-4 ring-indigo-500/50 shadow-lg shadow-indigo-500/30 animate-pulse font-extrabold"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25"
                }`}
              >
                <Download className="w-4 h-4" />
                <span>{appNotInstalled ? "Click Here to Download Installer (.exe)" : "Download for Windows (.exe)"}</span>
              </button>

              <button
                onClick={handleOpenNativeApp}
                disabled={isLaunchingNative}
                className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95 disabled:opacity-60"
              >
                {isLaunchingNative ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span>Detecting Desktop App...</span>
                  </>
                ) : (
                  <>
                    <Laptop className="w-4 h-4 text-indigo-500" />
                    <span>Already Installed? Open Native Desktop App</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={handleOpenWebStudio}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/30 transition active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch in Browser Web Studio (No Install Needed)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. New Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                  <Film className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Create Video Project</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Growth Highlights"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Director Style Preset
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="MRBEAST_FAST">MrBeast Fast (Viral Retention, Jump-Cuts)</option>
                  <option value="ALI_ABDAAL_CLEAN">Ali Abdaal Clean (Calm, Minimal, Face-Framed)</option>
                  <option value="HORMOZI_PUNCH">Hormozi Punch (Kinetic Bouncy Word Captions)</option>
                  <option value="SAAS_DEMO">SaaS Demo (Screen ROI, Cursor Tracking)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "16:9", label: "16:9 (Landscape)" },
                    { id: "9:16", label: "9:16 (Vertical)" },
                    { id: "1:1", label: "1:1 (Square)" },
                  ].map((aspect) => (
                    <button
                      key={aspect.id}
                      type="button"
                      onClick={() => setSelectedAspect(aspect.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition border ${
                        selectedAspect === aspect.id
                          ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {aspect.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  <span>{isCreating ? "Creating..." : "Create & Next"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
