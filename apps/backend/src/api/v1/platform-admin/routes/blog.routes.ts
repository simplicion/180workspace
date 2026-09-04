import { Router } from 'express';
import { list, getById, create, update, togglePublish, remove } from '../controllers/blog.controller';

const router = Router();

router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id/toggle-publish', togglePublish);
router.delete('/:id', remove);

export default router;
