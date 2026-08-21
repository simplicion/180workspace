import { Router } from 'express';
import * as ctrl from './chat.controller';

const router = Router();

router.get('/settings', ctrl.getChatSettings);
router.put('/settings', ctrl.updateChatSettings);

router.get('/', ctrl.getChats);
router.post('/', ctrl.createOrGetChat);

router.get('/:chatId/messages', ctrl.getMessages);
router.post('/:chatId/messages', ctrl.sendMessage);
router.put('/:chatId/read', ctrl.markAsRead);
router.post('/:chatId/react', ctrl.reactToMessage);
router.post('/:chatId/pin', ctrl.pinMessage);
router.delete('/:chatId/messages/:msgId', ctrl.deleteMessage);
router.post('/:chatId/members', ctrl.addMembers);
router.delete('/:chatId/members/:memberId', ctrl.removeMember);

export default router;
