import express from 'express';
import { SupportController } from './support.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { SupportValidation } from './support.validation';

const router = express.Router();

router.use(protect);

router.post('/', validateRequest(SupportValidation.createTicket), SupportController.createTicket);
router.get('/', SupportController.listTickets);
router.get('/:id', SupportController.getTicket);
router.post('/:id/reply', validateRequest(SupportValidation.addReply), SupportController.addReply);
router.put('/:id', validateRequest(SupportValidation.editTicket), SupportController.editTicket);
router.delete('/:id', SupportController.deleteTicket);

export const supportRoutes = router;
