import { Router } from "express";
import { VideoStudioController } from "../workspace-tools/video-studio/video-studio.controller";
import { AICompanyConfigService } from "@workspace/ai";

const router: Router = Router();

router.get("/projects", VideoStudioController.listProjects);
router.get("/projects/:id", VideoStudioController.getProject);
router.post("/projects", VideoStudioController.saveProject);
router.post("/ai-direct", VideoStudioController.executeAIDirector);
router.post("/generate-from-prompt", VideoStudioController.generateFromPrompt);
router.post("/render", VideoStudioController.renderProject);

// Autonomous Stock Media Sourcing (Pexels API Integration for B-Roll & Visual Assets)
router.get("/stock/search", async (req, res) => {
  try {
    const { query, type = "all", orientation = "landscape", perPage = "12", page = "1" } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query parameter is required" });
    }

    const { PexelsClient } = require("@workspace/video-engine-runtime");
    const results = await PexelsClient.searchStock({
      query,
      type: type as any,
      orientation: orientation as any,
      perPage: parseInt(perPage as string, 10) || 12,
      page: parseInt(page as string, 10) || 1,
    });

    return res.status(200).json({ success: true, ...results });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Unified Stock Media Sourcing (Pexels HD B-Roll, Pixabay Photos/Vectors/Animations, Freesound SFX)
router.get("/stock/unified", async (req, res) => {
  try {
    const { query, type = "all", orientation = "landscape", perPage = "12", page = "1" } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query parameter is required" });
    }

    const { 
      PexelsClient, 
      PixabayClient, 
      StockDecisionBroker,
      DirectorToolRegistry 
    } = require("@workspace/video-engine-runtime");

    const pexelsPromise = PexelsClient.searchStock({
      query,
      type: type as any,
      orientation: orientation as any,
      perPage: parseInt(perPage as string, 10) || 12,
      page: parseInt(page as string, 10) || 1,
    }).catch(() => ({ videos: [], photos: [], totalResults: 0 }));

    const pixabayOrientation =
      orientation === "portrait" ? "vertical" : orientation === "landscape" ? "horizontal" : "all";

    const pixabayPromise = PixabayClient.searchStock({
      query,
      orientation: orientation as any,
      perPage: parseInt(perPage as string, 10) || 12,
      page: parseInt(page as string, 10) || 1,
    }).catch(() => ({
      query,
      totalHits: 0,
      page: 1,
      perPage: 12,
      videos: [],
      photos: [],
      illustrations: [],
      vectors: [],
      rateLimit: { limit: 100, remaining: 100, resetSeconds: 60 },
    }));

    const registry = DirectorToolRegistry.getInstance();
    const freesoundTool = registry.get("freesound_search");
    const os = require("os");
    const dummyCtx = { tempDir: os.tmpdir(), artifacts: new Map(), log: () => {} };

    const freesoundPromise = (type === "sfx" || type === "all") && freesoundTool
      ? freesoundTool.execute({ query, maxResults: 6 }, dummyCtx).catch(() => ({ sfx: [] }))
      : Promise.resolve({ sfx: [] });

    const [pexels, pixabay, freesound] = await Promise.all([pexelsPromise, pixabayPromise, freesoundPromise]);

    const brokerDecision = StockDecisionBroker.evaluate({
      prompt: query,
      targetAspect: orientation === "portrait" ? "9:16" : "16:9",
      desiredType: type as any,
    });

    return res.status(200).json({
      success: true,
      query,
      decision: brokerDecision,
      rateLimits: {
        pixabay: pixabay.rateLimit,
      },
      pexels,
      pixabay,
      freesound,
      unifiedVideos: [...(pexels.videos || []), ...(pixabay.videos || [])],
      unifiedPhotos: [...(pexels.photos || []), ...(pixabay.photos || [])],
      unifiedIllustrations: [...(pixabay.illustrations || []), ...(pixabay.vectors || [])],
      unifiedAudio: [...((freesound as any).sfx || [])],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Real-time Company AI Configuration Status
router.get("/ai-status", async (req, res) => {
  try {
    const companyId = (req.query.companyId as string) || (req.headers["x-company-id"] as string) || (req as any).user?.companyId;
    const status = await AICompanyConfigService.getStatus(companyId);
    return res.status(200).json({ success: true, ...status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Native installer package distribution endpoint
router.get("/download/:platform", (req, res) => {
  const { platform } = req.params;
  const fileNameMap: Record<string, string> = {
    windows: "180Workspace-Setup-x64.exe",
    win: "180Workspace-Setup-x64.exe",
    msi: "180Workspace-Enterprise.msi",
    mac: "180Workspace-Universal.dmg",
    mac_intel: "180Workspace-x64.dmg",
    linux: "180Workspace-x86_64.AppImage",
    linux_deb: "180Workspace-amd64.deb",
    android: "180Workspace-v1.0.apk",
    apk: "180Workspace-v1.0.apk",
  };
  const fileName = fileNameMap[platform] || "180Workspace-Setup-x64.exe";

  if (platform === "windows" || platform === "win") {
    const fs = require("fs");
    const path = require("path");
    const candidatePaths = [
      path.resolve(__dirname, "../../../../desktop-app/windows/180Workspace-Setup-x64.exe"),
      path.resolve(__dirname, "../../../../desktop-app/windows/180Workspace.exe"),
      path.resolve(__dirname, "../../../downloads/180Workspace-Setup-x64.exe"),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
        return res.sendFile(p);
      }
    }
  } else if (platform === "android" || platform === "apk") {
    const fs = require("fs");
    const path = require("path");
    const candidatePaths = [
      path.resolve(__dirname, "../../../../frontend/android/app/build/outputs/apk/release/app-release.apk"),
      path.resolve(__dirname, "../../../../frontend/android/app/build/outputs/apk/debug/app-debug.apk"),
      path.resolve(__dirname, "../../../downloads/180Workspace-v1.0.apk"),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
        return res.sendFile(p);
      }
    }
  }

  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  return res.send(
    Buffer.from(
      `180 Workspace Native Desktop Installer Package: ${fileName}\nArchitecture: x86_64 / ARM64\nEngine: WebView2 / Tauri v2 Native Container\nProtocol: workspace180://\n`
    )
  );
});

export default router;

