import { Router } from "express";
import { VideoStudioController } from "../workspace-tools/video-studio/video-studio.controller";
import { AICompanyConfigService } from "@workspace/ai";

const router: Router = Router();

router.get("/projects", VideoStudioController.listProjects);
router.get("/projects/:id", VideoStudioController.getProject);
router.post("/projects", VideoStudioController.saveProject);
router.post("/ai-direct", VideoStudioController.executeAIDirector);

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
    windows: "180MediaStudio-Setup-x64.exe",
    win: "180MediaStudio-Setup-x64.exe",
    msi: "180MediaStudio-Enterprise.msi",
    mac: "180MediaStudio-arm64.dmg",
    mac_intel: "180MediaStudio-x64.dmg",
    linux: "180MediaStudio.AppImage",
  };
  const fileName = fileNameMap[platform] || "180MediaStudio-Setup-x64.exe";

  if (platform === "windows" || platform === "win") {
    const fs = require("fs");
    const path = require("path");
    const candidatePaths = [
      path.resolve(__dirname, "../../../downloads/180MediaStudio-Setup-x64.exe"),
      path.resolve(__dirname, "../../../../desktop-editor/native-windows/180MediaStudio-Setup-x64.exe"),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
        return res.sendFile(p);
      }
    }
  }

  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  return res.send(
    Buffer.from(
      `180 Workspace Native Studio Installer Package: ${fileName}\nArchitecture: x86_64 / ARM64\nEngine: Tauri v2 + Rust\nProtocol: workspace180://\n`
    )
  );
});

export default router;
