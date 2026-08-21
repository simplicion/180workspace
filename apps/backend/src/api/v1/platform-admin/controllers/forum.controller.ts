import { Request, Response, NextFunction } from 'express';
// const { ForumService } = require('@workspace/community'); // External domain
const ForumService = {
    listPosts: async () => ({}),
    deletePost: async () => ({}),
    deleteReply: async () => ({})
};

export const listPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const posts = await ForumService.listPosts(req.query);
        res.json(posts);
    } catch (error: any) {
  next(error);
}
};

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const postId = req.params.id || req.params.postId;
        const result = await ForumService.deletePost(postId, (req as any).user);
        res.json(result);
    } catch (error: any) {
  next(error);
}
};

export const deleteReply = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ForumService.deleteReply(req.params.id);
        res.json(result);
    } catch (error: any) {
  next(error);
}
};
