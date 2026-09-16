"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  UploadCloud,
  FileVideo,
  Music,
  Image as ImageIcon,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useSubscription } from "@/lib/useSubscription";
import { UniversalSkeleton, FeatureLock } from "@workspace/ui";
import { ProjectStorageService, CloudMediaAsset } from "../services/project-storage";
import toast from "react-hot-toast";

export default function MediaEditorAssetsPage() {
  const router = useRouter();
  const { companyConfig, loading: subLoading } = useSubscription();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "video" | "audio" | "image">("all");
  const [assets, setAssets] = useState<CloudMediaAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = () => {
    const cloudAssets = ProjectStorageService.getCloudAssets();
    // Also aggregate any assets present in saved projects
    const savedProjects = ProjectStorageService.getProjects();
    const projectAssets: CloudMediaAsset[] = [];
    savedProjects.forEach((p) => {
      p.manifest.assets?.forEach((a) => {
        if (!cloudAssets.some((c) => c.name === a.name)) {
          const isAudio = a.mimeType?.startsWith("audio/");
          const isImage =
            a.mimeType?.startsWith("image/") ||
            Boolean(a.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i));
          const type: "video" | "audio" | "image" = isAudio ? "audio" : isImage ? "image" : "video";
          const sizeMb = (a.fileSizeBytes / (1024 * 1024)).toFixed(1);
          projectAssets.push({
            id: a.id,
            name: a.name,
            type,
            duration: a.durationSeconds
              ? `${Math.floor(a.durationSeconds / 60)}:${String(
                  Math.floor(a.durationSeconds % 60)
                ).padStart(2, "0")}`
              : undefined,
            size: `${sizeMb} MB`,
            resolution: a.width && a.height ? `${a.width}x${a.height}` : undefined,
            uploadedAt: "Project Asset",
            url: a.filePath,
          });
        }
      });
    });
    setAssets([...cloudAssets, ...projectAssets]);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    toast.loading("Processing media assets...", { id: "upload-asset" });

    try {
      const fileList = Array.from(files);
      for (const file of fileList) {
        const isAudio = file.type.startsWith("audio/");
        const isImage =
          file.type.startsWith("image/") ||
          Boolean(file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i));
        const type: "video" | "audio" | "image" = isAudio ? "audio" : isImage ? "image" : "video";

        let sizeFormatted = "";
        if (file.size > 1024 * 1024 * 1024) {
          sizeFormatted = `${(file.size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        } else if (file.size > 1024 * 1024) {
          sizeFormatted = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        } else {
          sizeFormatted = `${Math.round(file.size / 1024)} KB`;
        }

        const objectUrl = URL.createObjectURL(file);
        let durationStr: string | undefined;
        let resolutionStr: string | undefined;

        if (type === "video") {
          await new Promise<void>((resolve) => {
            const tempVideo = document.createElement("video");
            tempVideo.preload = "metadata";
            tempVideo.src = objectUrl;
            tempVideo.onloadedmetadata = () => {
              const mins = Math.floor(tempVideo.duration / 60);
              const secs = Math.floor(tempVideo.duration % 60);
              durationStr = `${mins}:${String(secs).padStart(2, "0")}`;
              resolutionStr = `${tempVideo.videoWidth}x${tempVideo.videoHeight}`;
              resolve();
            };
            tempVideo.onerror = () => resolve();
          });
        } else if (type === "image") {
          await new Promise<void>((resolve) => {
            const tempImg = new Image();
            tempImg.src = objectUrl;
            tempImg.onload = () => {
              resolutionStr = `${tempImg.naturalWidth}x${tempImg.naturalHeight}`;
              resolve();
            };
            tempImg.onerror = () => resolve();
          });
        } else if (type === "audio") {
          await new Promise<void>((resolve) => {
            const tempAudio = new Audio();
            tempAudio.src = objectUrl;
            tempAudio.onloadedmetadata = () => {
              const mins = Math.floor(tempAudio.duration / 60);
              const secs = Math.floor(tempAudio.duration % 60);
              durationStr = `${mins}:${String(secs).padStart(2, "0")}`;
              resolve();
            };
            tempAudio.onerror = () => resolve();
          });
        }

        const newAsset: CloudMediaAsset = {
          id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type,
          size: sizeFormatted,
          duration: durationStr,
          resolution: resolutionStr,
          uploadedAt: new Date().toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          url: objectUrl,
        };

        ProjectStorageService.saveCloudAsset(newAsset);
      }

      loadAssets();
      toast.dismiss("upload-asset");
      toast.success(
        `Successfully uploaded ${files.length} asset${files.length > 1 ? "s" : ""}!`
      );
    } catch (err: any) {
      toast.dismiss("upload-asset");
      toast.error("Failed to process asset: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAsset = (id: string, name: string) => {
    ProjectStorageService.deleteCloudAsset(id);
    loadAssets();
    toast.success(`Removed "${name}" from Cloud Assets`);
  };

  const handleUseInEditor = (asset: CloudMediaAsset) => {
    router.push(`/media-editor?mode=studio`);
    toast.success(`Opening Studio with ${asset.name}...`);
  };

  const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
  const hasApp =
    enabledApps.includes("media-editor") ||
    enabledApps.includes("video-studio") ||
    enabledApps.length === 0;

  if (subLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <UniversalSkeleton type="projects" />
      </div>
    );
  }

  if (!hasApp) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <FeatureLock
          title="Cloud Media Assets"
          requiredApp="180 Media Editor"
          description="Unlock shared team b-roll bins, sound effect collections, and cloud asset syncing across 180 Media Studio."
        />
      </div>
    );
  }

  const filteredAssets = assets.filter((a) => {
    if (activeTab !== "all" && a.type !== activeTab) return false;
    if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto select-none">
      {/* Hidden File Input for Real Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <FolderOpen className="w-6 h-6 text-indigo-500" />
            <span>Cloud Media Asset Hub</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Centralized b-roll, audio stems, sound effects, and brand templates synced with your local native editors.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-500/20 transition active:scale-95 shrink-0"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>Upload Media Asset</span>
            </>
          )}
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <div className="flex items-center space-x-2">
          {(["all", "video", "audio", "image"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                activeTab === tab
                  ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/40"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent"
              }`}
            >
              {tab} {tab === "all" ? `(${assets.length})` : `(${assets.filter((a) => a.type === tab).length})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search assets by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Asset Grid or Empty State */}
      {filteredAssets.length === 0 ? (
        <div className="p-16 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
            <FolderOpen className="w-7 h-7" />
          </div>
          {searchTerm ? (
            <>
              <p className="text-sm font-bold text-gray-900 dark:text-white">No Assets Found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No media matches your search query "{searchTerm}".
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-gray-900 dark:text-white">No Media Assets in Hub</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                Upload your b-roll footage, audio stems, sound effects, or brand templates to use across all your video projects.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Media Asset</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group relative"
            >
              <div className="space-y-3">
                <div className="h-28 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 flex items-center justify-center relative overflow-hidden">
                  {asset.type === "image" && asset.url ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : asset.type === "video" ? (
                    <FileVideo className="w-8 h-8 text-indigo-500" />
                  ) : asset.type === "audio" ? (
                    <Music className="w-8 h-8 text-pink-500" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-emerald-500" />
                  )}
                  {asset.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-gray-200">
                      {asset.duration}
                    </span>
                  )}

                  {/* Quick Delete Overlay Button */}
                  <button
                    onClick={() => handleDeleteAsset(asset.id, asset.name)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition shadow"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between">
                    <span>{asset.size}</span>
                    {asset.resolution && <span>{asset.resolution}</span>}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>{asset.uploadedAt}</span>
                <button
                  onClick={() => handleUseInEditor(asset)}
                  className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition"
                >
                  <span>Use in Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
