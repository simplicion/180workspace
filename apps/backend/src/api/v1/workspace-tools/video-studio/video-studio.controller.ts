import { Request, Response } from "express";
import { VideoStudioService } from "./video-studio.service";
import { MobileAIDirectRequestSchema, brandStyleDefaults, describeDirectorContext } from "@workspace/video-contracts";
import { loadDirectorContext } from "../../media-editor/director-context";

/**
 * The tenant decides whose AI key and credits are used, so it comes only from the verified JWT (`req.user`), never
 * from a header, body or query value, and there is no "default_company" fallback: no company means 401.
 */
function companyOf(req: any, res: Response): string | null {
  const companyId = req.user?.companyId;
  if (!companyId) {
    res.status(401).json({ success: false, error: "UNAUTHENTICATED", message: "Authentication required" });
    return null;
  }
  return String(companyId);
}

/** Unexpected errors are logged server-side; the client gets a generic message (no internals). */
function sendInternal(res: Response, scope: string, err: any) {
  console.error(`[VideoStudio] ${scope} failed:`, err?.message || err);
  return res.status(500).json({ success: false, error: "INTERNAL", message: "Unexpected error" });
}

export class VideoStudioController {
  static async listProjects(req: any, res: Response) {
    const companyId = companyOf(req, res);
    if (!companyId) return;
    try {
      const projects = await VideoStudioService.listProjects(companyId);
      return res.status(200).json({ success: true, data: projects });
    } catch (err: any) {
      return sendInternal(res, "listProjects", err);
    }
  }

  static async getProject(req: any, res: Response) {
    const companyId = companyOf(req, res);
    if (!companyId) return;
    try {
      const project = await VideoStudioService.getProject(req.params.id, companyId);
      if (!project) {
        return res.status(404).json({ success: false, error: "Project not found" });
      }
      return res.status(200).json({ success: true, data: project });
    } catch (err: any) {
      return sendInternal(res, "getProject", err);
    }
  }

  static async saveProject(req: any, res: Response) {
    const companyId = companyOf(req, res);
    if (!companyId) return;
    try {
      const { id, name, editIR, templatePreset } = req.body;

      if (!name || !editIR) {
        return res.status(400).json({ success: false, error: "Missing name or editIR payload" });
      }

      const project = await VideoStudioService.saveProject(companyId, {
        id,
        name,
        editIR,
        templatePreset,
      });

      return res.status(200).json({ success: true, data: project });
    } catch (err: any) {
      return sendInternal(res, "saveProject", err);
    }
  }

  static async executeAIDirector(req: any, res: Response) {
    // Mobile form: the client supplies its own media analysis (media never leaves the device).
    if (req.body && typeof req.body === "object" && req.body.media !== undefined) {
      return VideoStudioController.executeMobileAIDirector(req, res);
    }
    const companyId = companyOf(req, res);
    if (!companyId) return;
    try {
      const { prompt, stylePreset, telemetry, currentEditIR, availableAssets, selectedClipId, playheadSec, projectId, calendarPieceId, postId } = req.body;

      if (!prompt) {
        return res.status(400).json({ success: false, error: "Missing prompt parameter" });
      }

      // Brand + script context for the web Media Studio (only the verified company is trusted).
      const str = (v: any) => (typeof v === "string" && v.length > 0 && v.length <= 128 ? v : undefined);
      const ctx = await loadDirectorContext({ companyId, projectId: str(projectId), calendarPieceId: str(calendarPieceId), postId: str(postId) }).catch(() => ({ warnings: [] as string[] }));
      const contextSections = (ctx as any).brand || (ctx as any).piece ? describeDirectorContext(ctx as any, brandStyleDefaults((ctx as any).brand)) : undefined;

      const result = await VideoStudioService.executeAIDirector({
        contextSections,
        prompt,
        companyId,
        stylePreset,
        telemetry,
        currentEditIR,
        availableAssets,
        selectedClipId,
        playheadSec,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return sendInternal(res, "executeAIDirector", err);
    }
  }

  static async executeMobileAIDirector(req: any, res: Response) {
    const parsed = MobileAIDirectRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "INVALID_REQUEST",
        issues: parsed.error.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
      });
    }
    // AI keys are per workspace: only trust the authenticated user's company, never a header/body value.
    const companyId = companyOf(req, res);
    if (!companyId) return;
    try {
      const { projectId, calendarPieceId, postId } = parsed.data;
      const context = await loadDirectorContext({ companyId, projectId, calendarPieceId, postId });
      const data = await VideoStudioService.executeMobileAIDirector(parsed.data, companyId, context);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error("[AI Director][mobile]", err?.message || err);
      if (err?.code === "COMPANY_NOT_FOUND") return res.status(404).json({ success: false, error: "COMPANY_NOT_FOUND" });
      return res.status(500).json({ success: false, error: "AI_DIRECTOR_FAILED", message: "The AI Director could not process this request. Please try again." });
    }
  }

  // POST /render was removed: it rendered on the server and accepted a client-chosen `outputPath` (arbitrary file
  // write). Media processing runs only on the user's device (desktop app / phone); no client called this route.

  static async generateFromPrompt(req: any, res: Response) {
    const companyId = companyOf(req, res);
    if (!companyId) return;
    try {
      const userId = req.user?.id;
      const { prompt, targetAspect, customStyleKey, skillId } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ success: false, error: "Prompt parameter is required" });
      }

      const result = await VideoStudioService.generateFromPrompt({
        prompt,
        companyId,
        userId,
        targetAspect,
        customStyleKey,
        skillId,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err?.message?.includes("INSUFFICIENT_AI_CREDITS")) {
        return res.status(402).json({ success: false, error: "INSUFFICIENT_AI_CREDITS", message: "Not enough AI credits for this request." });
      }
      return sendInternal(res, "generateFromPrompt", err);
    }
  }
}
