'use strict';

import { PublicService } from '@workspace/public';
import { Request, Response, NextFunction } from 'express';

/**
 * Get all open job postings (API Key protected)
 */
export const getPublicJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.company ? (req as any).company.id : undefined;
        const protocol = req.protocol;
        const host = req.get('host');

        const result = await PublicService.getPublicJobs(companyId, protocol, host);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * Get a single job's details for the public application form
 */
export const getPublicJobDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const queryCompanyId = req.query.companyId;
        const companyContextId = req.company ? (req as any).company.id : undefined;

        const result = await PublicService.getPublicJobDetails(id, companyContextId, queryCompanyId);
        res.json(result);
    } catch (err) {
        if (err.message === 'Job not found or already closed') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

/**
 * Submit a job application (Public)
 */
export const submitApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { jobId, applicantName, applicantEmail, phone, resumeUrl, coverLetter, customFields } = req.body;
        const result = await PublicService.submitApplication(jobId, applicantName, applicantEmail, phone, resumeUrl, coverLetter, customFields);
        res.status(201).json(result);
    } catch (err) {
        if (err.message === 'Missing required applicant fields') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Job is no longer open for applications') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

/**
 * Manage API Key (Platform Internal)
 */
export const getApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).company?.id;
        const result = await PublicService.getApiKey(companyId);
        res.json(result);
    } catch (err) {
        if (err.message === 'Company context required') return res.status(401).json({ error: err.message });
        next(err);
    }
};

export const generateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).company?.id;
        const result = await PublicService.generateApiKey(companyId);
        res.json(result);
    } catch (err) {
        if (err.message === 'Company context required') return res.status(401).json({ error: err.message });
        next(err);
    }
};

/**
 * Get Platform Branding (Public)
 */
export const getBranding = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspace = (req as any).subdomain || req.query.workspace || null;
        const result = await PublicService.getBranding(workspace);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * Fetch all open jobs across all companies for Pitchin Explore tab
 */
export const getExploreJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.company ? (req as any).company.id : undefined;
        const result = await PublicService.getExploreJobs(companyId);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * Fetch job applications submitted by the logged-in user
 */
export const getMyApplications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const result = await PublicService.getMyApplications(userId);
        res.status(200).json(result);
    } catch (err) {
        if (err.message === 'User not authenticated') return res.status(401).json({ error: err.message });
        next(err);
    }
};

/**
 * Get all upcoming public events globally
 */
export const getPublicEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.company ? (req as any).company.id : undefined;
        const result = await PublicService.getPublicEvents(companyId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * Get public event details
 */
export const getPublicEventDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const companyId = req.company ? (req as any).company.id : undefined;
        const result = await PublicService.getPublicEventDetails(id, companyId);
        res.json(result);
    } catch (err) {
        if (err.message === 'Event not found') return res.status(404).json({ success: false, message: err.message });
        next(err);
    }
};

/**
 * Check if a user is registered for an event
 */
export const checkRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { eventId } = req.params;
        const { email } = req.query;
        const companyId = req.company ? (req as any).company.id : undefined;
        
        const result = await PublicService.checkRegistration(eventId, email, companyId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * Register for an event
 */
export const submitEventRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { eventId } = req.params;
        const registrationData = req.body;
        const companyId = req.company ? (req as any).company.id : undefined;
        
        const result = await PublicService.submitEventRegistration(eventId, registrationData, companyId);
        res.status(201).json(result);
    } catch (err) {
        if (err.message === 'Event not found') return res.status(404).json({ success: false, message: err.message });
        if (err.message === 'You have already registered for this event.') return res.status(400).json({ success: false, message: err.message });
        next(err);
    }
};

