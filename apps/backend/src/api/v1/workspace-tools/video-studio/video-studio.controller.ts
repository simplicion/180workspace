import { Request, Response } from "express";
import { VideoStudioService } from "./video-studio.service";
import { MobileAIDirectRequestSchema, brandStyleDefaults, describeDirectorContext } from "@workspace/video-contracts";
import { loadDirectorContext } from "../../media-editor/director-context";

export class VideoStudioController {
  static async listProjects(req: any, res: Response) {
    try {
      const companyId = req.user?.companyId || req.headers["x-company-id"] || "default_company";
      const projects = await VideoStudioService.listProjects(companyId);
      return res.status(200).json({ success: true, data: projects });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getProject(req: any, res: Response) {
    try {
      const companyId = req.user?.companyId || req.headers["x-company-id"] || "default_company";
      const project = await VideoStudioService.getProject(req.params.id, companyId);
      if (!project) {
        return res.status(404).json({ success: false, error: "Project not found" });
      }
      return res.status(200).json({ success: true, data: project });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async saveProject(req: any, res: Response) {
    try {
      const companyId = req.user?.companyId || req.headers["x-company-id"] || "default_company";
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
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async executeAIDirector(req: any, res: Response) {
    // Mobile form: the client supplies its own media analysis (media never leaves the device).
    if (req.body && typeof req.body === "object" && req.body.media !== undefined) {
      return VideoStudioController.executeMobileAIDirector(req, res);
    }
    try {
      const companyId = req.user?.companyId || req.headers["x-company-id"] || req.body?.companyId || req.query?.companyId || "default_company";
      const { prompt, stylePreset, telemetry, currentEditIR, availableAssets, selectedClipId, playheadSec, projectId, calendarPieceId, postId } = req.body;

      if (!prompt) {
        return res.status(400).json({ success: false, error: "Missing prompt parameter" });
      }

      // Brand + script context for the web Media Studio (only the verified company is trusted).
      const str = (v: any) => (typeof v === "string" && v.length > 0 && v.length <= 128 ? v : undefined);
      const ctx = await loadDirectorContext({ companyId: req.user?.companyId, projectId: str(projectId), calendarPieceId: str(calendarPieceId), postId: str(postId) }).catch(() => ({ warnings: [] as string[] }));
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
      return res.status(500).json({ success: false, error: err.message });
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
    const companyId: string | undefined = req.user?.companyId;
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

  static async renderProject(req: any, res: Response) {
    try {
      const { editIR, outputPath } = req.body;
      if (!editIR) {
        return res.status(400).json({ success: false, error: "Missing editIR payload" });
      }
      const path = require("path");
      const os = require("os");
      const targetOut = outputPath || path.join(os.tmpdir(), `render_${Date.now()}.mp4`);
      const tempDir = path.join(os.tmpdir(), `.render_tmp_${Date.now()}`);

      const { LosslessSplicer } = require("@workspace/video-engine-runtime");
      await LosslessSplicer.render(editIR, targetOut, tempDir);

      return res.status(200).json({ success: true, outputPath: targetOut });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async generateFromPrompt(req: any, res: Response) {
    try {
      const companyId = req.user?.companyId || req.headers["x-company-id"] || req.body?.companyId || "default_company";
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
      const status = err.message?.includes("INSUFFICIENT_AI_CREDITS") ? 402 : 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  }
}
