import { Router } from 'express';
import { list, create, update, toggleActive, remove } from '../controllers/plan.controller';

const router = Router();

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.put('/:id/toggle', toggleActive);
router.delete('/:id', remove);

export default router;
