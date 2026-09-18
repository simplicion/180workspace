import { prisma, requestContext } from '@workspace/db';

export interface UpsertBrandVoiceDTO {
    tone: string;
    targetAudience: string;
    sampleViralPosts?: string[];
    forbiddenWords?: string[];
    defaultHashtags?: string[];
    standardCtas?: string[];
    metadata?: Record<string, any>;
}

export class BrandVoiceService {
    static async getBrandVoice(projectId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company context required');

        const profile = await (prisma as any).brandVoiceProfile.findFirst({
            where: { companyId, projectId }
        });

        if (!profile) {
            return {
                projectId,
                companyId,
                tone: 'Professional & Insightful',
                targetAudience: 'General Audience & Industry Peers',
                sampleViralPosts: [],
                forbiddenWords: [],
                defaultHashtags: [],
                standardCtas: ['Visit our website to learn more.', 'Drop a comment below with your thoughts!'],
                metadata: {}
            };
        }

        return profile;
    }

    static async upsertBrandVoice(projectId: string, data: UpsertBrandVoiceDTO) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company context required');

        const profile = await (prisma as any).brandVoiceProfile.upsert({
            where: { projectId },
            update: {
                tone: data.tone,
                targetAudience: data.targetAudience,
                sampleViralPosts: data.sampleViralPosts || [],
                forbiddenWords: data.forbiddenWords || [],
                defaultHashtags: data.defaultHashtags || [],
                standardCtas: data.standardCtas || [],
                metadata: data.metadata || {}
            },
            create: {
                companyId,
                projectId,
                tone: data.tone || 'Professional & Insightful',
                targetAudience: data.targetAudience || 'General Audience',
                sampleViralPosts: data.sampleViralPosts || [],
                forbiddenWords: data.forbiddenWords || [],
                defaultHashtags: data.defaultHashtags || [],
                standardCtas: data.standardCtas || [],
                metadata: data.metadata || {}
            }
        });

        return profile;
    }
}
