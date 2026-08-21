import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '@workspace/identity';

export class ProfileController {
    static async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.getProfile(req.params.userId, (req as any).user.id);
            res.json(result);
        } catch (err: any) {
            if (err.message === 'User not found') return res.status(404).json({ message: err.message });
            next(err);
        }
    }

    static async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.updateProfile((req as any).user.id, req.body);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    static async getUploadUrl(req: Request, res: Response, next: NextFunction) {
        try {
            const { fileType, contentType, extension } = req.body; 
            const result = await ProfileService.getUploadUrl((req as any).user.id, fileType, contentType, extension, process.env.REELS_CDN_URL as string);
            res.json(result);
        } catch (err: any) {
            if (err.message === 'Invalid file type') return res.status(400).json({ message: err.message });
            next(err);
        }
    }

    // --- Experiences ---
    static async addExperience(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.addExperience((req as any).user.id, req.body);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async updateExperience(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.updateExperience(req.params.id, (req as any).user.id, req.body);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async deleteExperience(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.deleteExperience(req.params.id, (req as any).user.id);
            res.json(result);
        } catch (err) { next(err); }
    }

    // --- Education ---
    static async addEducation(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.addEducation((req as any).user.id, req.body);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async updateEducation(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.updateEducation(req.params.id, (req as any).user.id, req.body);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async deleteEducation(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.deleteEducation(req.params.id, (req as any).user.id);
            res.json(result);
        } catch (err) { next(err); }
    }

    // --- Skills ---
    static async searchSkills(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.searchSkills(req.query.q as string);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async addSkill(req: Request, res: Response, next: NextFunction) {
        try {
            const { skillName, isCustom } = req.body;
            const result = await ProfileService.addSkill((req as any).user.id, skillName, isCustom);
            res.json(result);
        } catch (err: any) {
            if (err.message === 'Skill already added') return res.status(400).json({ message: err.message });
            next(err);
        }
    }

    static async deleteSkill(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.deleteSkill(req.params.id, (req as any).user.id);
            res.json(result);
        } catch (err) { next(err); }
    }

    // --- Resumes ---
    static async addResume(req: Request, res: Response, next: NextFunction) {
        try {
            const { fileUrl, fileName } = req.body;
            const result = await ProfileService.addResume((req as any).user.id, fileUrl, fileName);
            res.json(result);
        } catch (err: any) {
            if (err.message === 'Maximum of 3 resumes allowed.') return res.status(400).json({ message: err.message });
            next(err);
        }
    }

    static async deleteResume(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.deleteResume(req.params.id, (req as any).user.id, process.env.REELS_CDN_URL as string);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async followProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.followProfile(req.params.userId, (req as any).user.id);
            res.json(result);
        } catch (err: any) {
            if (err.message === 'User not found') return res.status(404).json({ message: err.message });
            if (err.message === 'Cannot follow yourself') return res.status(400).json({ message: err.message });
            next(err);
        }
    }

    static async getNetwork(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.getNetwork(req.params.userId, (req as any).user.id);
            res.json(result);
        } catch(err: any) { 
            if (err.message === 'User not found') return res.status(404).json({ message: err.message });
            next(err); 
        }
    }

    // Projects
    static async addProject(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.addProject((req as any).user.id, req.body);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async updateProject(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.updateProject(req.params.id, (req as any).user.id, req.body);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async deleteProject(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.deleteProject(req.params.id, (req as any).user.id);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async getAllNetworkProfiles(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await ProfileService.getAllNetworkProfiles((req as any).user.id);
            res.json(result);
        } catch (err) { next(err); }
    }
}
