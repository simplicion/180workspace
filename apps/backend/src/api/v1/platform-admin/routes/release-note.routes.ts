import { Router } from 'express';
import { list, listPublished, create, update, remove } from '../controllers/release-note.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { createReleaseNoteSchema, updateReleaseNoteSchema } from '../validation/release-note.validation';

const router = Router();

router.get('/', list);
router.post('/', validateRequest(createReleaseNoteSchema), create);
router.put('/:id', validateRequest(updateReleaseNoteSchema), update);
router.delete('/:id', remove);

export default router;
