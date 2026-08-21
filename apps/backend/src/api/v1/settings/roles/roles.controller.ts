import { Request, Response, NextFunction } from 'express';
import { RoleService } from '@workspace/settings';

export class RolesController {
    static async getMatrix(req: Request, res: Response, next: NextFunction) {
        try {
            const users = await RoleService.getMatrix();
            res.json({ users });
        } catch (err) {
            next(err);
        }
    }

    static async bulkUpdate(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId, role, permissions } = req.body;
            const updatedUser = await RoleService.bulkUpdate(userId, role, permissions, (req as any).user);
            res.json({ user: updatedUser, message: 'User access updated successfully' });
        } catch (err: any) {
            if (err.message.includes('userId is required') || err.message.includes('cannot change your own role') || err.message.includes('Invalid role')) {
                return res.status(400).json({ error: err.message });
            }
            if (err.message === 'User not found') {
                return res.status(404).json({ error: 'User not found' });
            }
            next(err);
        }
    }
}
