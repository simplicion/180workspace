import { Router } from 'express';
import { list, getOne, reply, updateStatus } from '../controllers/ticket.controller';

const router = Router();

router.get('/', list);
router.get('/:id', getOne);
router.post('/:id/reply', reply);
router.put('/:id/status', updateStatus);

export default router;
