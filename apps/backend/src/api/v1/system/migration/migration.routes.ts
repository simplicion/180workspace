import { Router } from 'express';
import { getMigrationStatus, startMigration } from './migration.controller';

const router = Router();

router.get('/status', getMigrationStatus);
router.post('/start', startMigration);

export default router;
