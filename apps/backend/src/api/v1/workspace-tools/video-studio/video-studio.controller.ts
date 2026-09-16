import { Request, Response } from "express";
import { VideoStudioService } from "./video-studio.service";

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
    try {
      const companyId = req.user?.companyId || req.headers["x-company-id"] || req.body?.companyId || req.query?.companyId || "default_company";
      const { prompt, stylePreset, telemetry } = req.body;

      if (!prompt) {
        return res.status(400).json({ success: false, error: "Missing prompt parameter" });
      }

      const result = await VideoStudioService.executeAIDirector({
        prompt,
        companyId,
        stylePreset,
        telemetry,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
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
}
