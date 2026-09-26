import { Router } from "express";
import { VideoStudioController } from "../workspace-tools/video-studio/video-studio.controller";
import { AICompanyConfigService } from "@workspace/ai";
import { requireDesktopDevice, requireNativeDevice } from "../desktop/desktop-device";
import { audioUpload, transcribeHandler } from "./media-transcription";
import { directorContextHandler } from "./director-context";

const router: Router = Router();

router.get("/projects", VideoStudioController.listProjects);
router.get("/projects/:id", VideoStudioController.getProject);
router.post("/projects", VideoStudioController.saveProject);
router.post("/ai-direct", requireDesktopDevice, VideoStudioController.executeAIDirector);
// Mobile: word-level STT for on-device clips (audio upload only; no server-side media processing).
router.post("/transcribe", requireNativeDevice, audioUpload, transcribeHandler);
// Brand + calendar-script context and greeting (no media, no LLM). See AI_DIRECTOR_CONTRACT.md §2.5.
router.get("/director-context", directorContextHandler());
router.post("/generate-from-prompt", requireDesktopDevice, VideoStudioController.generateFromPrompt);
// No POST /render: server-side rendering was removed (media is processed on the device only).

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
      DirectorToolRegistry,
      BgmSearchTool,
    } = require("@workspace/video-engine-runtime");

    // Audio-only searches (music / sfx) must not return (or wait on) video and photo providers,
    // and `type=audio` used to search nothing at all: it now searches music.
    const wantsMusic = type === "audio" || type === "music" || type === "all";
    const wantsSfx = type === "sfx" || type === "all";
    const audioOnly = type === "audio" || type === "music" || type === "sfx";
    const emptyPexels = { videos: [], photos: [], totalResults: 0 };
    const emptyPixabay = {
      query,
      totalHits: 0,
      page: 1,
      perPage: 12,
      videos: [],
      photos: [],
      illustrations: [],
      vectors: [],
      rateLimit: { limit: 100, remaining: 100, resetSeconds: 60 },
    };

    const pexelsPromise = audioOnly ? Promise.resolve(emptyPexels) : PexelsClient.searchStock({
      query,
      type: type as any,
      orientation: orientation as any,
      perPage: parseInt(perPage as string, 10) || 12,
      page: parseInt(page as string, 10) || 1,
    }).catch(() => ({ videos: [], photos: [], totalResults: 0 }));

    const pixabayOrientation =
      orientation === "portrait" ? "vertical" : orientation === "landscape" ? "horizontal" : "all";

    const pixabayPromise = audioOnly ? Promise.resolve(emptyPixabay) : PixabayClient.searchStock({
      query,
      orientation: orientation as any,
      perPage: parseInt(perPage as string, 10) || 12,
      page: parseInt(page as string, 10) || 1,
    }).catch(() => emptyPixabay);

    const registry = DirectorToolRegistry.getInstance();
    const freesoundTool = registry.get("freesound_search");
    const os = require("os");
    const dummyCtx = { tempDir: os.tmpdir(), artifacts: new Map(), log: () => {} };

    const freesoundPromise = wantsSfx && freesoundTool
      ? freesoundTool.execute({ query, maxResults: 6 }, dummyCtx).catch(() => ({ effects: [] }))
      : Promise.resolve({ effects: [] });

    const musicPromise = wantsMusic
      ? BgmSearchTool.searchTracks({ query, limit: parseInt(perPage as string, 10) || 12 }).catch((err: any) => ({ tracks: [], warnings: [err?.message || String(err)] }))
      : Promise.resolve({ tracks: [], warnings: [] });

    const [pexels, pixabay, freesound, music] = await Promise.all([pexelsPromise, pixabayPromise, freesoundPromise, musicPromise]);

    // FreesoundSfxTool returns `effects` (the old code read a non-existent `sfx` key, so audio was
    // always empty). Only real HTTPS previews are listed, never its local synthesized fallback.
    const sfxAudio = ((freesound as any).effects || [])
      .filter((e: any) => typeof e.downloadUrl === "string" && /^https:\/\//i.test(e.downloadUrl))
      .map((e: any) => ({ kind: "sfx", title: e.name, url: e.downloadUrl, durationSec: e.durationSec, license: null, provider: "freesound" }));
    const musicAudio = ((music as any).tracks || []).map((t: any) => ({ kind: "music", ...t }));

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
      music,
      unifiedVideos: [...(pexels.videos || []), ...(pixabay.videos || [])],
      unifiedPhotos: [...(pexels.photos || []), ...(pixabay.photos || [])],
      unifiedIllustrations: [...(pixabay.illustrations || []), ...(pixabay.vectors || [])],
      unifiedAudio: [...musicAudio, ...sfxAudio],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Royalty-free background music for the phone's AI Director / manual editor.
// Metadata + HTTPS URLs only: nothing is downloaded, transcoded or processed on the server.
// Auth: same as the other /stock routes (`protect` + `moduleGuard('media-editor')` on the mount).
router.get("/stock/music", async (req, res) => {
  try {
    const { query, limit = "10", minDurationSec } = req.query;
    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ success: false, error: "QUERY_REQUIRED", message: "Query parameter is required (mood/genre keywords, e.g. 'upbeat energetic')" });
    }
    if (query.length > 120) {
      return res.status(400).json({ success: false, error: "QUERY_TOO_LONG", message: "Query must be at most 120 characters" });
    }
    const minDur = typeof minDurationSec === "string" ? parseFloat(minDurationSec) : NaN;
    const { BgmSearchTool } = require("@workspace/video-engine-runtime");
    const result = await BgmSearchTool.searchTracks({
      query,
      limit: parseInt(limit as string, 10) || 10,
      minDurationSec: Number.isFinite(minDur) && minDur > 0 ? minDur : undefined,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "MUSIC_SEARCH_FAILED", message: err?.message || String(err) });
  }
});

// Real-time Company AI Configuration Status
router.get("/ai-status", async (req, res) => {
  try {
    // Only the caller's own company (verified JWT); never a query/header value.
    const companyId = (req as any).user?.companyId;
    if (!companyId) return res.status(401).json({ success: false, error: "UNAUTHENTICATED", message: "Authentication required" });
    const status = await AICompanyConfigService.getStatus(companyId);
    return res.status(200).json({ success: true, ...status });
  } catch (err: any) {
    console.error("[media-editor] ai-status failed:", err?.message || err);
    return res.status(500).json({ success: false, error: "INTERNAL", message: "Unexpected error" });
  }
});

// Installer downloads are served by `/download/:platform` in routes/index.routes.ts (a real release URL or an honest 404).
// A second copy of that route used to live here and answered with a text file named like an installer; it was
// unreachable dead code and has been removed so it cannot come back.

export default router;

