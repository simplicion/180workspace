import { Request, Response, NextFunction } from 'express';
import { PlatformAuthService } from '@workspace/platform-admin';

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const result = await PlatformAuthService.login(email, password);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {

    res.json({ superAdmin: PlatformAuthService.toSafeObject((req as any).superAdmin) });

  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body;
        const superAdmin = await PlatformAuthService.updateProfile((req as any).superAdmin.id, email, name);
        res.json({ message: 'Profile updated successfully', superAdmin });
    } catch (err: any) {
  next(err);
}
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { currentPassword, newPassword } = req.body;
        await PlatformAuthService.changePassword((req as any).superAdmin.id, currentPassword, newPassword);
        res.json({ message: 'Password updated successfully' });
    } catch (err: any) {
  next(err);
}
};

export const logout = (req: Request, res: Response) => {
    res.json({ message: 'Logged out successfully' });
};
