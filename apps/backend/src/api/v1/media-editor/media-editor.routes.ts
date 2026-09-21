import { Router } from "express";
import { VideoStudioController } from "../workspace-tools/video-studio/video-studio.controller";
import { AICompanyConfigService } from "@workspace/ai";
import { requireDesktopDevice } from "../desktop/desktop-device";

const router: Router = Router();

router.get("/projects", VideoStudioController.listProjects);
router.get("/projects/:id", VideoStudioController.getProject);
router.post("/projects", VideoStudioController.saveProject);
router.post("/ai-direct", requireDesktopDevice, VideoStudioController.executeAIDirector);
router.post("/generate-from-prompt", requireDesktopDevice, VideoStudioController.generateFromPrompt);
router.post("/render", requireDesktopDevice, VideoStudioController.renderProject);

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

// Installer downloads are served by `/download/:platform` in routes/index.routes.ts (a real release URL or an honest 404).
// A second copy of that route used to live here and answered with a text file named like an installer; it was
// unreachable dead code and has been removed so it cannot come back.

export default router;

