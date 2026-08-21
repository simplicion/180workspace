import { Request, Response, NextFunction } from 'express';
import { JobService } from '@workspace/hr-management';

export const getJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobs = await JobService.getJobs((req as any).user.companyId);
        res.json({ jobs });
    } catch (err) { next(err); }
};

export const getPublicJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const job = await JobService.getPublicJob(req.params.id);
        res.json({ job });
    } catch (err: any) { 
        if (err.message === 'Job not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

export const createJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const job = await JobService.createJob((req as any).user.companyId, req.body);
        res.status(201).json({ job });
    } catch (err) { next(err); }
};

export const updateJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const job = await JobService.updateJob(req.params.id, req.body).catch(() => null);
        res.json({ job });
    } catch (err) { next(err); }
};

export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await JobService.deleteJob(req.params.id).catch(() => null);
        res.json({ message: 'Job deleted' });
    } catch (err) { next(err); }
};

export const getApplications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const applications = await JobService.getApplications(req.params.jobId);
        res.json({ applications });
    } catch (err) { next(err); }
};

export const createApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const app = await JobService.createApplication(req.params.jobId, req.body);
        res.status(201).json({ application: app });
    } catch (err) { next(err); }
};

export const updateApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const app = await JobService.updateApplication(req.params.appId, (req as any).user.companyId, req.body).catch(() => null);
        if (!app) return res.status(404).json({ error: 'Application not found' });
        res.json({ application: app });
    } catch (err) { next(err); }
};
