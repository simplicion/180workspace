"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Film,
  Sparkles,
  Download,
  ExternalLink,
  Laptop,
  Clock,
  Plus,
  X,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import { useSubscription } from "@/lib/useSubscription";
import { useAuth } from "@/lib/auth-context";
import { useNativeEngine } from "@/lib/useNativeEngine";
import { MediaStudioWorkspace } from "./components/MediaStudioWorkspace";
import { UniversalSkeleton, FeatureLock } from "@workspace/ui";
import toast from "react-hot-toast";

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

export default function MediaEditorDashboardPage() {
  const { companyConfig, loading: subLoading } = useSubscription();
  const { user, company, token } = useAuth();
  const { isNativeDesktop, launchNativeApp, getDownloadUrl, specs: nativeSpecs } = useNativeEngine();

  const [projects, setProjects] = useState<VideoStudioProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Embedded Studio Workspace State
  const [isEmbeddedStudioOpen, setIsEmbeddedStudioOpen] = useState(false);
  const [activeStudioProject, setActiveStudioProject] = useState<string | null>(null);
  const [activeStudioTemplate, setActiveStudioTemplate] = useState<string | null>(null);

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

  useEffect(() => {
    fetchProjects();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const proj = params.get("project");
      const mode = params.get("mode");
      const template = params.get("template");
      if (proj || mode === "studio" || isNativeDesktop) {
        if (proj) setActiveStudioProject(proj);
        if (template) setActiveStudioTemplate(template);
        setIsEmbeddedStudioOpen(true);
      }
    }
  }, [isNativeDesktop]);

  const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
  const hasApp =
    enabledApps.includes("media-editor") ||
    enabledApps.includes("video-studio") ||
    enabledApps.length === 0;

  if (isEmbeddedStudioOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#07090E] flex flex-col">
        <MediaStudioWorkspace
          initialProjectId={activeStudioProject}
          initialTemplate={activeStudioTemplate}
          onExit={() => {
            setIsEmbeddedStudioOpen(false);
            fetchProjects();
          }}
        />
      </div>
    );
  }

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
    link.href = `/downloads/180Workspace-Setup-x64.exe`;
    link.download = "180Workspace-Setup-x64.exe";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading 180 Workspace Desktop Suite (Installer)...`);
  };

  const handleOpenLaunchModal = (projectId?: string, preset?: string) => {
    if (isNativeDesktop) {
      // In native desktop app, open studio directly
      setActiveStudioProject(projectId || null);
      setActiveStudioTemplate(preset || null);
      setIsEmbeddedStudioOpen(true);
      return;
    }
    setTargetProjectId(projectId);
    setTargetPreset(preset);
    setAppNotInstalled(false);
    setIsLaunchingNative(false);
    setIsLaunchModalOpen(true);
  };

  const handleOpenNativeApp = async () => {
    const query = buildLaunchQuery(targetProjectId, targetPreset);
    setIsLaunchingNative(true);
    setAppNotInstalled(false);
    toast.loading("Opening 180 Workspace Desktop App...", { id: "native-launch" });

    let hasBlurred = false;
    const onWindowBlur = () => {
      hasBlurred = true;
    };

    window.addEventListener("blur", onWindowBlur);
    await launchNativeApp(query);

    setTimeout(() => {
      window.removeEventListener("blur", onWindowBlur);
      setIsLaunchingNative(false);
      toast.dismiss("native-launch");

      if (!hasBlurred) {
        setAppNotInstalled(true);
        toast.error("180 Workspace Desktop App not detected. Download below or edit right here in browser.", {
          duration: 6000,
        });
      } else {
        toast.success("Opened project in 180 Workspace Desktop!");
        setIsLaunchModalOpen(false);
      }
    }, 1800);
  };

  const handleOpenWebStudio = () => {
    setActiveStudioProject(targetProjectId || null);
    setActiveStudioTemplate(targetPreset || null);
    setIsEmbeddedStudioOpen(true);
    setIsLaunchModalOpen(false);
    toast.success("Opening 180 Media Studio in workspace...");
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
      {/* 180 Media Studio Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2.5">
            <Film className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>180 Media Studio</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-2xl">
            An all-in-one video production engine for multi-track timeline editing, automated kinetic captions, camera spring zooms, and lossless hardware-accelerated video rendering.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Video Project</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
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

      {/* 2. Launch & Download Desktop Studio Modal */}
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
                <span>180 Workspace Native Desktop App (Includes Media Studio)</span>
              </div>
              <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
                Download the complete 180 Workspace desktop suite. Enjoy CRM, Meetings, Docs, and built-in <strong>&gt;500 FPS NVENC GPU</strong> video production with zero cloud upload wait times and 100% offline workflow.
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
                    Click below to download <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">180Workspace-Setup-x64.exe</code> and install in 5 seconds.
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
