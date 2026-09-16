"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Laptop, Download, ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react";

export default function DownloadAutoDetectPage() {
  const [detectedOS, setDetectedOS] = useState<"windows" | "macos" | "linux" | "android" | "ios">("windows");
  const [hasTriggered, setHasTriggered] = useState(false);

  const downloadFiles: Record<string, { label: string; file: string; url: string; ext: string }> = {
    windows: {
      label: "Windows 10 / 11",
      file: "180Workspace-Setup-x64.exe",
      url: "/downloads/180Workspace-Setup-x64.exe",
      ext: ".exe",
    },
    macos: {
      label: "macOS (Apple Silicon & Intel)",
      file: "180Workspace-Universal.dmg",
      url: "/api/download/mac",
      ext: ".dmg",
    },
    linux: {
      label: "Linux Universal",
      file: "180Workspace-x86_64.AppImage",
      url: "/api/download/linux",
      ext: ".AppImage",
    },
    android: {
      label: "Android Mobile",
      file: "180Workspace-v1.0.apk",
      url: "/api/download/android",
      ext: ".apk",
    },
  };

  const triggerDownload = (osKey: string) => {
    const info = downloadFiles[osKey] || downloadFiles.windows;
    const link = document.createElement("a");
    link.href = info.url;
    link.download = info.file;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      let os: "windows" | "macos" | "linux" | "android" | "ios" = "windows";
      if (ua.includes("android")) os = "android";
      else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) os = "ios";
      else if (ua.includes("mac")) os = "macos";
      else if (ua.includes("linux")) os = "linux";
      else os = "windows";

      setDetectedOS(os);

      if (os !== "ios") {
        // Automatically start download for detected OS after a brief delay
        const timer = setTimeout(() => {
          triggerDownload(os);
          setHasTriggered(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const currentInfo = downloadFiles[detectedOS] || downloadFiles.windows;

  return (
    <div className="min-h-screen bg-[#090A0E] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full rounded-2xl bg-[#11131C] border border-[#1F2230] shadow-2xl p-8 space-y-6 relative z-10 text-center">
        {/* Logo/Icon */}
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
          <Download className="w-7 h-7 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Downloading 180 Workspace
          </h1>
          <p className="text-xs text-gray-400">
            Detected Operating System: <span className="text-indigo-400 font-semibold">{currentInfo.label}</span>
          </p>
        </div>

        {/* Status Box */}
        <div className="p-4 rounded-xl bg-[#171A26] border border-[#232738] space-y-2">
          <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {hasTriggered ? "Your download has started!" : "Starting your download..."}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            If your download didn't begin automatically, click the button below:
          </p>
          <button
            onClick={() => triggerDownload(detectedOS)}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition active:scale-95 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download {currentInfo.file} ({currentInfo.ext})</span>
          </button>
        </div>

        {/* Other Platforms */}
        <div className="space-y-2 pt-2 border-t border-[#1C1F2E]">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 block">
            Looking for another platform?
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {Object.entries(downloadFiles).map(([key, item]) => (
              <button
                key={key}
                onClick={() => triggerDownload(key)}
                className={`p-2 rounded-lg border text-center transition ${
                  detectedOS === key
                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                    : "bg-[#141620] border-[#1F2230] text-gray-400 hover:text-white hover:bg-[#1A1D2A]"
                }`}
              >
                <span className="block font-semibold capitalize">{key}</span>
                <span className="text-[10px] text-gray-500 font-mono">{item.ext}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Return to App */}
        <div className="pt-2">
          <Link
            href="/media-editor"
            className="text-xs font-medium text-gray-400 hover:text-indigo-400 transition inline-flex items-center space-x-1"
          >
            <span>Return to 180 Media Studio Web</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
