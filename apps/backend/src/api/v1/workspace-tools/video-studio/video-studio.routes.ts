import { Router } from "express";
import { VideoStudioController } from "./video-studio.controller";

const router: Router = Router();

router.get("/projects", VideoStudioController.listProjects);
router.get("/projects/:id", VideoStudioController.getProject);
router.post("/projects", VideoStudioController.saveProject);
router.post("/ai-direct", VideoStudioController.executeAIDirector);
router.post("/generate-from-prompt", VideoStudioController.generateFromPrompt);
router.post("/render", VideoStudioController.renderProject);

export default router;
