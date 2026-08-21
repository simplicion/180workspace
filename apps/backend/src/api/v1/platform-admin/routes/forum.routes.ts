import { Router } from 'express';
import { listPosts, deletePost, deleteReply } from '../controllers/forum.controller';

const router = Router();

router.get('/posts', listPosts);
router.delete('/posts/:id', deletePost);
router.delete('/replies/:id', deleteReply);

export default router;
