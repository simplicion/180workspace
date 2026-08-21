import { z } from 'zod';

export const ProfileValidation = {
    updateProfile: z.object({
        bio: z.string().optional(),
        headline: z.string().optional(),
        location: z.string().optional(),
        website: z.string().url().optional().or(z.literal(''))
    }).passthrough(),
    getUploadUrl: z.object({
        fileType: z.enum(['image', 'resume']),
        contentType: z.string(),
        extension: z.string()
    }),
    addExperience: z.object({
        title: z.string(),
        company: z.string(),
        startDate: z.string(),
        endDate: z.string().optional().nullable(),
        current: z.boolean().optional(),
        description: z.string().optional()
    }).passthrough(),
    addEducation: z.object({
        school: z.string(),
        degree: z.string(),
        fieldOfStudy: z.string(),
        startDate: z.string(),
        endDate: z.string().optional().nullable(),
        current: z.boolean().optional()
    }).passthrough(),
    addSkill: z.object({
        skillName: z.string(),
        isCustom: z.boolean().optional()
    }),
    addProject: z.object({
        title: z.string(),
        description: z.string().optional(),
        projectUrl: z.string().url().optional().or(z.literal(''))
    }).passthrough(),
    addResume: z.object({
        fileUrl: z.string().url(),
        fileName: z.string()
    })
};
