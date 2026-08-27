import { Router } from 'express';
import { getAuditLogs } from './audit.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

// Apply auth middleware if not already applied at a higher level, 
// though index.routes.ts applies it to /system in most cases? Wait, the /system route isn't protected in index.routes.ts.
// Let's protect it here just in case.
router.use(protect);

router.get('/', getAuditLogs);

export default router;
