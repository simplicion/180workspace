import { Router } from "express";
import { VideoStudioController } from "./video-studio.controller";
import { requireDesktopDevice } from "../../desktop/desktop-device";

const router: Router = Router();

router.get("/projects", VideoStudioController.listProjects);
router.get("/projects/:id", VideoStudioController.getProject);
router.post("/projects", VideoStudioController.saveProject);
router.post("/ai-direct", requireDesktopDevice, VideoStudioController.executeAIDirector);
router.post("/generate-from-prompt", requireDesktopDevice, VideoStudioController.generateFromPrompt);
router.post("/render", requireDesktopDevice, VideoStudioController.renderProject);

export default router;
