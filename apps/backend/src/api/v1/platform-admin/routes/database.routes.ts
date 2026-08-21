import { Router } from 'express';
import { list, testConnection } from '../controllers/database.controller';

const router = Router();

router.get('/', list);
router.post('/:id/test', testConnection);

export default router;
