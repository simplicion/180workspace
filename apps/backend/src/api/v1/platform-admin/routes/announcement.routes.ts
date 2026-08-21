import { Router } from 'express';
import { list, listActive, create, update, remove } from '../controllers/announcement.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { createAnnouncementSchema, updateAnnouncementSchema } from '../validation/announcement.validation';

const router = Router();

router.get('/', list);
router.get('/active', listActive);
router.post('/', validateRequest(createAnnouncementSchema), create);
router.put('/:id', validateRequest(updateAnnouncementSchema), update);
router.delete('/:id', remove);

export default router;
