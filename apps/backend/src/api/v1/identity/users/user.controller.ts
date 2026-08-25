import { Request, Response, NextFunction } from 'express';
import { UserService } from '@workspace/identity';

export class UserController {
    static async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserService.getUsers(req.query);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async getUserById(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserService.getUserById(req.params.id, (req as any).user.role);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserService.updateUser(req.params.id, req.body, (req as any).user, req);
            res.json(result);
        } catch (err: any) { 
            if (err.message === 'User not found' || (err.code && err.code === 'P2025')) return res.status(404).json({ error: 'User not found' });
            next(err); 
        }
    }

    static async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserService.deleteUser(req.params.id, (req as any).user, req);
            res.json(result);
        } catch (err: any) { 
            if (err.message === 'Cannot delete your own account') return res.status(400).json({ error: err.message });
            if (err.message === 'User not found') return res.status(404).json({ error: err.message });
            next(err); 
        }
    }

    static async updatePhoto(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserService.updatePhoto(req.params.id, (req as any).storageResult);
            res.json(result);
        } catch (err: any) { 
            if (err.message === 'Photo upload failed') return res.status(400).json({ error: err.message });
            if (err.message === 'User not found' || (err.code && err.code === 'P2025')) return res.status(404).json({ error: 'User not found' });
            next(err); 
        }
    }

    static async getProfileStats(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserService.getProfileStats(req.params.id);
            res.json(result);
        } catch (err: any) { 
            if (err.message === 'Invalid User ID format') return res.status(400).json({ error: err.message });
            next(err); 
        }
    }

    static async toggleFollow(req: Request, res: Response, next: NextFunction) {
        try {
            const sockets = require('../../../../system-configs/sockets/index');
            const io = sockets.getIo();
            const result = await UserService.toggleFollow(req.params.id, (req as any).user.id, io);
            res.json(result);
        } catch (err: any) { 
            if (err.message === 'Cannot follow yourself') return res.status(400).json({ error: err.message });
            if (err.message === 'User not found') return res.status(404).json({ error: err.message });
            next(err); 
        }
    }

    static async getFollowers(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserService.getFollowers(req.params.id);
            res.json(result);
        } catch (err: any) { 
            if (err.message === 'User not found') return res.status(404).json({ error: err.message });
            next(err); 
        }
    }

    static async getFollowing(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserService.getFollowing(req.params.id);
            res.json(result);
        } catch (err: any) { 
            if (err.message === 'User not found') return res.status(404).json({ error: err.message });
            next(err); 
        }
    }

    static async searchMentions(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserService.searchMentions(req.query.q as string);
            res.json(result);
        } catch (err) { next(err); }
    }
}
