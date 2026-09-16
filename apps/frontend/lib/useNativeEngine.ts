"use client";

import { useState, useEffect } from "react";

export type SupportedPlatform = "windows" | "macos" | "linux" | "android" | "ios" | "web";

export interface NativeSystemSpecs {
  isNative: boolean;
  isCapacitorMobile: boolean;
  isPWA: boolean;
  platform: SupportedPlatform;
  gpuAdapter: string;
  hasHardwareAcceleration: boolean;
  streamCopyEnabled: boolean;
  engineVersion: string;
  cpuCores?: number;
  memoryGb?: number;
  mobileAcceleration?: {
    encoder: "MediaCodec" | "VideoToolbox" | "Software";
    compositor: "WebGL2" | "WebGPU" | "Vulkan" | "Metal";
  };
}

export interface NativeEngineHook {
  isNativeDesktop: boolean;
  isCapacitorMobile: boolean;
  isPWA: boolean;
  platform: SupportedPlatform;
  specs: NativeSystemSpecs;
  isLoading: boolean;
  launchNativeApp: (routeOrProject?: string) => Promise<boolean>;
  getDownloadUrl: (targetPlatform?: SupportedPlatform) => string;
}

export function useNativeEngine(): NativeEngineHook {
  const [specs, setSpecs] = useState<NativeSystemSpecs>({
    isNative: false,
    isCapacitorMobile: false,
    isPWA: false,
    platform: "web",
    gpuAdapter: "Web Browser Canvas API",
    hasHardwareAcceleration: false,
    streamCopyEnabled: false,
    engineVersion: "web-fallback",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let detectedPlatform: SupportedPlatform = "web";
    let isPwaMode = false;
    let isCapacitor = false;

    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes("android")) detectedPlatform = "android";
      else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) detectedPlatform = "ios";
      else if (ua.includes("win")) detectedPlatform = "windows";
      else if (ua.includes("mac")) detectedPlatform = "macos";
      else if (ua.includes("linux")) detectedPlatform = "linux";

      // PWA display mode detection
      if (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      ) {
        isPwaMode = true;
      }

      // Capacitor Mobile runtime detection
      if ((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.getPlatform?.() === "android" || (window as any).Capacitor?.getPlatform?.() === "ios") {
        isCapacitor = true;
      }
    }

    // Check if running inside 180 Workspace Native Container (Desktop or Mobile)
    const isDesktopNative = typeof window !== "undefined" && (
      "__180_NATIVE__" in window ||
      "__TAURI_INTERNALS__" in window ||
      window.location.hostname.includes(".local") ||
      window.location.protocol === "tauri:" ||
      window.location.protocol === "workspace180:"
    );

    if (isDesktopNative) {
      const nativeObj = (window as any).__180_NATIVE__;
      if (nativeObj && typeof nativeObj.getSpecs === "function") {
        try {
          const s = nativeObj.getSpecs();
          setSpecs({
            isNative: true,
            isCapacitorMobile: false,
            isPWA: false,
            platform: s.platform || detectedPlatform,
            gpuAdapter: s.gpuAdapter || "DirectX 12 / Vulkan / Metal Hardware Compositor",
            hasHardwareAcceleration: true,
            streamCopyEnabled: true,
            engineVersion: s.version || "2.0.0-native",
            cpuCores: navigator.hardwareConcurrency || 8,
          });
          setIsLoading(false);
          return;
        } catch {}
      }

      setSpecs({
        isNative: true,
        isCapacitorMobile: false,
        isPWA: false,
        platform: detectedPlatform,
        gpuAdapter: "wgpu Universal Native Pipeline (Vulkan / Metal / DX12)",
        hasHardwareAcceleration: true,
        streamCopyEnabled: true,
        engineVersion: "2.0.0-native",
        cpuCores: navigator.hardwareConcurrency || 8,
      });
    } else if (isCapacitor) {
      setSpecs({
        isNative: false,
        isCapacitorMobile: true,
        isPWA: false,
        platform: detectedPlatform,
        gpuAdapter: detectedPlatform === "android" ? "Android MediaCodec + Adreno/Mali WebGL2" : "Apple VideoToolbox + Metal WKWebView",
        hasHardwareAcceleration: true,
        streamCopyEnabled: true,
        engineVersion: "2.0.0-capacitor",
        cpuCores: navigator.hardwareConcurrency || 8,
        mobileAcceleration: {
          encoder: detectedPlatform === "android" ? "MediaCodec" : "VideoToolbox",
          compositor: detectedPlatform === "android" ? "WebGL2" : "Metal",
        }
      });
    } else {
      setSpecs({
        isNative: false,
        isCapacitorMobile: false,
        isPWA: isPwaMode,
        platform: detectedPlatform,
        gpuAdapter: isPwaMode ? "Progressive Web App (Accelerated WebGL Canvas)" : "Web Browser Sandbox Canvas (Install Native Desktop for GPU NVENC)",
        hasHardwareAcceleration: isPwaMode,
        streamCopyEnabled: false,
        engineVersion: isPwaMode ? "pwa-v2" : "web-hybrid",
        cpuCores: typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
      });
    }

    setIsLoading(false);
  }, []);

  const launchNativeApp = async (routeOrProject?: string): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    let deepLink = "workspace180://media-editor";
    if (routeOrProject) {
      if (routeOrProject.startsWith("workspace180://")) {
        deepLink = routeOrProject;
      } else if (routeOrProject.startsWith("/")) {
        deepLink = `workspace180:/${routeOrProject}`;
      } else if (routeOrProject.includes("?")) {
        deepLink = `workspace180://media-editor${routeOrProject.startsWith("?") ? "" : "/"}${routeOrProject}`;
      } else {
        deepLink = `workspace180://media-editor?project=${encodeURIComponent(routeOrProject)}`;
      }
    }

    try {
      window.location.href = deepLink;
      return true;
    } catch {
      return false;
    }
  };

  const getDownloadUrl = (targetPlatform?: SupportedPlatform): string => {
    const p = targetPlatform || specs.platform;
    if (p === "macos") {
      return "/downloads/180Workspace-Universal.dmg";
    } else if (p === "linux") {
      return "/downloads/180Workspace-x86_64.AppImage";
    } else if (p === "android") {
      return "/downloads/180Workspace-v1.0.apk";
    }
    return "/downloads/180Workspace-Setup-x64.exe";
  };

  return {
    isNativeDesktop: specs.isNative,
    isCapacitorMobile: specs.isCapacitorMobile,
    isPWA: specs.isPWA,
    platform: specs.platform,
    specs,
    isLoading,
    launchNativeApp,
    getDownloadUrl,
  };
}
