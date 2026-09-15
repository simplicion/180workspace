"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Film,
  FolderOpen,
  Activity,
  UploadCloud,
  FileVideo,
  Music,
  Image as ImageIcon,
  Search,
  Plus,
} from "lucide-react";
import { useSubscription } from "@/lib/useSubscription";
import { UniversalSkeleton, FeatureLock } from "@workspace/ui";
import toast from "react-hot-toast";

interface MediaAsset {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  duration?: string;
  size: string;
  resolution?: string;
  uploadedAt: string;
}

const SAMPLE_ASSETS: MediaAsset[] = [
  {
    id: "asset_01",
    name: "Product_Hero_Walkthrough_4K.mp4",
    type: "video",
    duration: "02:14",
    size: "348 MB",
    resolution: "3840x2160",
    uploadedAt: "Yesterday at 4:20 PM",
  },
  {
    id: "asset_02",
    name: "Cyber_Kinetic_Whoosh_Transition.wav",
    type: "audio",
    duration: "00:03",
    size: "1.2 MB",
    uploadedAt: "3 days ago",
  },
  {
    id: "asset_03",
    name: "Founder_Keynote_Interview_A_Cam.mp4",
    type: "video",
    duration: "14:32",
    size: "2.1 GB",
    resolution: "1920x1080",
    uploadedAt: "Sep 12, 2026",
  },
  {
    id: "asset_04",
    name: "Lower_Third_Logo_Watermark_Transparent.png",
    type: "image",
    size: "420 KB",
    resolution: "1080x1080",
    uploadedAt: "Aug 30, 2026",
  },
];

export default function MediaEditorAssetsPage() {
  const { companyConfig, loading: subLoading } = useSubscription();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "video" | "audio" | "image">("all");

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

  const filteredAssets = SAMPLE_ASSETS.filter((a) => {
    if (activeTab !== "all" && a.type !== activeTab) return false;
    if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto select-none">
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
          onClick={() => toast.success("Select files to upload into Cloud Asset Hub")}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition active:scale-95 shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Media Asset</span>
        </button>
      </div>

      {/* 3. Filter & Search Controls */}
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
              {tab}
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

      {/* 4. Asset Grid */}
      {filteredAssets.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm text-center space-y-3">
          <FolderOpen className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-900 dark:text-white">No Assets Found</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No media matches your search term "{searchTerm}".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="h-28 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 flex items-center justify-center relative overflow-hidden">
                  {asset.type === "video" ? (
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
                  onClick={() => toast.success(`Inserted ${asset.name} into active timeline!`)}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition"
                >
                  Use in Editor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
