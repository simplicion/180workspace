import { Router } from 'express';
import { PlatformAiAdminController } from '../controllers/ai.controller';

const router = Router();

router.get('/', PlatformAiAdminController.getAiConfig);
router.post('/key', PlatformAiAdminController.saveKey);
router.patch('/metadata', PlatformAiAdminController.updateMetadata);
router.post('/test', PlatformAiAdminController.testConnection);
router.post('/default', PlatformAiAdminController.setDefaultProvider);
router.delete('/key/:provider', PlatformAiAdminController.deleteKey);

export default router;
