import { Router } from 'express';
import { getChatSessions, getChatSession, deleteChatSession, chatWithAI } from '../controllers/ai.controller';

const router = Router();

router.get('/sessions', getChatSessions);
router.get('/sessions/:id', getChatSession);
router.delete('/sessions/:id', deleteChatSession);
router.post('/chat', chatWithAI);

export default router;
