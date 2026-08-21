import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '@workspace/projects-and-tasks-domain';

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.getProjects({
            query: req.query,
            user: (req as any).user
        });
        res.json(result);
    } catch (err) { next(err); }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const project = await ProjectService.createProject({
            data: req.body,
            user: (req as any).user
        });
        res.status(201).json({ project });
    } catch (err: any) {
        if (err.message === 'Project name is required') {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

export const getProjectById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.getProjectById(req.params.id, {
            user: (req as any).user
        });
        // Backwards compatibility for _id
        result.project._id = result.project.id;
        if (result.project.members) {
            result.project.members.forEach((m: any) => m && (m._id = m.id));
        }
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.updateProject(req.params.id, req.body, {
            user: (req as any).user
        });
        result.project._id = result.project.id;
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Access denied')) return res.status(403).json({ error: err.message });
        next(err); 
    }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.deleteProject(req.params.id, {
            user: (req as any).user
        });
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        if (err.message === 'Access denied.') return res.status(403).json({ error: err.message });
        next(err); 
    }
};

export const updateMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.updateMembers(req.params.id, req.body.memberIds, {
            user: (req as any).user
        });
        result.project._id = result.project.id;
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

export const updateClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.updateClients(req.params.id, req.body.clientIds);
        result.project._id = result.project.id;
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

export const getProjectTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.getProjectTasks(req.params.id);
        result.tasks.forEach((t: any) => t._id = t.id);
        res.json(result);
    } catch (err) { next(err); }
};

export const getProjectActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.getProjectActivity(req.params.id);
        res.json(result);
    } catch (err) { next(err); }
};

export const getProjectNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.getProjectNotes(req.params.id);
        result.notes.forEach((n: any) => { n._id = n.id; });
        res.json(result);
    } catch (err) { next(err); }
};

export const createProjectNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.createProjectNote(req.params.id, req.body.content, {
            user: (req as any).user
        });
        result.note._id = result.note.id;
        res.status(201).json(result);
    } catch (err: any) {
        if (err.message.includes('not supported')) return res.status(400).json({ error: err.message });
        next(err); 
    }
};

export const updateProjectNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.updateProjectNote(req.params.id, req.params.noteId, req.body.content, {
            user: (req as any).user
        });
        result.note._id = result.note.id;
        res.json(result);
    } catch (err: any) {
        if (err.message.includes('not supported')) return res.status(400).json({ error: err.message });
        if (err.message === 'Note not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Not authorized')) return res.status(403).json({ error: err.message });
        next(err); 
    }
};

export const deleteProjectNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ProjectService.deleteProjectNote(req.params.id, req.params.noteId, {
            user: (req as any).user
        });
        res.json(result);
    } catch (err: any) {
        if (err.message.includes('not supported')) return res.status(400).json({ error: err.message });
        if (err.message === 'Note not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Not authorized')) return res.status(403).json({ error: err.message });
        next(err); 
    }
};
