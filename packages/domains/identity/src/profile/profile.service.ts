// @ts-nocheck
import { prisma } from '@workspace/db';
import { v4 as uuidv4 } from 'uuid';
import { getCompanyPrisma } from '@workspace/db';
import { clearCache, getCachedData, setCachedData, logAction, getPresignedUploadUrl, deleteFromR2 } from '@workspace/backend-infra';

export class ProfileService {

    static async getProfile(companyPrisma: any, userId: string, currentUserId: string) {
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        
        const user = await companyPrisma.user.findFirst({
            where: isValidUUID ? { id: userId } : { username: userId },
            include: {
                experiences: { orderBy: { startDate: 'desc' } },
                educations: { orderBy: { startDate: 'desc' } },
                userProjects: { orderBy: { startDate: 'desc' } },
                skills: { select: { skillName: true } },
                resumes: { orderBy: { uploadedAt: 'desc' } },
                _count: { select: { followers: true, following: true } },
                followers: { where: { id: currentUserId }, select: { id: true } },
            }
        });

        if (!user) throw new Error('User not found');

        const safeProfile = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            title: user.title,
            companyName: user.companyName,
            photoUrl: user.photoUrl,
            bannerImage: user.bannerImage,
            headline: user.headline,
            bio: user.bio,
            city: user.city,
            country: user.country,
            socialLinks: user.socialLinks,
            experiences: user.experiences,
            educations: user.educations,
            userProjects: user.userProjects,
            skills: user.skills,
            resumes: user.resumes,
            createdAt: user.createdAt,
            _count: user._count,
            isFollowing: user.followers && user.followers.length > 0,
        };

        return safeProfile;
    }

    static async updateProfile(companyPrisma: any, userId: string, body: any) {
        const { name, headline, title, companyName, phone, bio, city, country, socialLinks, highlights, photoUrl, bannerImage } = body;

        const updatedUser = await companyPrisma.user.update({
            where: { id: userId },
            data: {
                name,
                headline,
                title,
                companyName,
                phone,
                bio,
                city,
                country,
                socialLinks,
                highlights,
                ...(photoUrl && { photoUrl }),
                ...(bannerImage && { bannerImage })
            }
        });

        return updatedUser;
    }

    static async getUploadUrl(userId: string, fileType: string, contentType: string, extension: string, cdnUrl: string) {
        if (!['avatar', 'banner', 'resume'].includes(fileType)) {
            throw new Error('Invalid file type');
        }

        const key = `profiles/${userId}/${fileType}_${uuidv4()}.${extension}`;
        const url = await getPresignedUploadUrl(key, contentType);
        const publicUrl = `${cdnUrl}/${key}`;
        
        return { uploadUrl: url, key, publicUrl };
    }

    static async addExperience(companyPrisma: any, userId: string, data: any) {
        return await companyPrisma.userExperience.create({ data: { ...data, userId } });
    }

    static async updateExperience(companyPrisma: any, id: string, userId: string, data: any) {
        return await companyPrisma.userExperience.update({
            where: { id, userId },
            data
        });
    }

    static async deleteExperience(companyPrisma: any, id: string, userId: string) {
        await companyPrisma.userExperience.delete({
            where: { id, userId }
        });
        return { success: true };
    }

    static async addEducation(companyPrisma: any, userId: string, data: any) {
        return await companyPrisma.userEducation.create({ data: { ...data, userId } });
    }

    static async updateEducation(companyPrisma: any, id: string, userId: string, data: any) {
        return await companyPrisma.userEducation.update({
            where: { id, userId },
            data
        });
    }

    static async deleteEducation(companyPrisma: any, id: string, userId: string) {
        await companyPrisma.userEducation.delete({
            where: { id, userId }
        });
        return { success: true };
    }

    static async searchSkills(companyPrisma: any, q: string) {
        if (!q) return [];
        return await companyPrisma.skill.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            take: 10
        });
    }

    static async addSkill(companyPrisma: any, userId: string, skillName: string, isCustom: boolean) {
        const existing = await companyPrisma.userSkill.findFirst({
            where: { userId, skillName: { equals: skillName, mode: 'insensitive' } }
        });

        if (existing) throw new Error('Skill already added');

        return await companyPrisma.userSkill.create({
            data: { userId, skillName, isCustom: !!isCustom }
        });
    }

    static async deleteSkill(companyPrisma: any, id: string, userId: string) {
        await companyPrisma.userSkill.delete({
            where: { id, userId }
        });
        return { success: true };
    }

    static async addResume(companyPrisma: any, userId: string, fileUrl: string, fileName: string) {
        const count = await companyPrisma.userResume.count({ where: { userId } });
        if (count >= 3) throw new Error('Maximum of 3 resumes allowed.');

        return await companyPrisma.userResume.create({
            data: { userId, fileUrl, fileName }
        });
    }

    static async deleteResume(companyPrisma: any, id: string, userId: string, cdnBaseUrl: string) {
        const resume = await companyPrisma.userResume.findUnique({
            where: { id, userId }
        });
        if (resume && resume.fileUrl) {
            const cdnBase = cdnBaseUrl?.replace(/\/$/, "");
            if (cdnBase && resume.fileUrl.startsWith(cdnBase)) {
                const key = resume.fileUrl.slice(cdnBase.length + 1);
                await deleteFromR2(key).catch((e: any) => console.error("Failed to delete from R2", e));
            }
        }

        await companyPrisma.userResume.delete({
            where: { id, userId }
        });
        return { success: true };
    }

    static async followProfile(companyPrisma: any, userId: string, currentUserId: string) {
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        const targetUser = await companyPrisma.user.findFirst({
            where: isValidUUID ? { id: userId } : { username: userId }
        });
        if (!targetUser) throw new Error("User not found");
        const resolvedUserId = targetUser.id;

        if (resolvedUserId === currentUserId) throw new Error("Cannot follow yourself");

        const user = await companyPrisma.user.findUnique({
            where: { id: currentUserId },
            include: { following: { where: { id: resolvedUserId }, select: { id: true } } }
        });

        const isFollowing = user.following.length > 0;

        if (isFollowing) {
            await companyPrisma.user.update({
                where: { id: currentUserId },
                data: { following: { disconnect: { id: resolvedUserId } } }
            });
            return { following: false };
        } else {
            await companyPrisma.user.update({
                where: { id: currentUserId },
                data: { following: { connect: { id: resolvedUserId } } }
            });
            return { following: true };
        }
    }

    static async getNetwork(companyPrisma: any, userId: string, currentUserId: string) {
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        const user = await companyPrisma.user.findFirst({
            where: isValidUUID ? { id: userId } : { username: userId },
            include: {
                followers: { select: { id: true, username: true, name: true, photoUrl: true, headline: true } },
                following: { select: { id: true, username: true, name: true, photoUrl: true, headline: true } }
            }
        });

        if (!user) throw new Error("User not found");

        const followers = user.followers || [];
        const following = user.following || [];
        const resolvedUserId = user.id;
        
        let common = [];
        if (currentUserId === resolvedUserId) {
            common = followers.filter((f: any) => following.some((fw: any) => fw.id === f.id));
        } else {
            const currentUser = await companyPrisma.user.findUnique({
                where: { id: currentUserId },
                include: { following: { select: { id: true } } }
            });
            const myFollowingIds = (currentUser.following || []).map((u: any) => u.id);
            common = followers.filter((f: any) => myFollowingIds.includes(f.id));
        }

        return { followers, following, common };
    }

    static async addProject(companyPrisma: any, userId: string, data: any) {
        return await companyPrisma.userProject.create({ data: { ...data, userId } });
    }

    static async updateProject(companyPrisma: any, id: string, userId: string, data: any) {
        return await companyPrisma.userProject.update({
            where: { id, userId },
            data
        });
    }

    static async deleteProject(companyPrisma: any, id: string, userId: string) {
        await companyPrisma.userProject.delete({
            where: { id, userId }
        });
        return { success: true };
    }

    static async getAllNetworkProfiles(companyPrisma: any, currentUserId: string) {
        const users = await companyPrisma.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                headline: true,
                companyName: true,
                photoUrl: true,
                role: true,
                city: true,
                country: true,
                skills: { select: { skillName: true } },
                _count: { select: { followers: true, following: true } },
                followers: { where: { id: currentUserId }, select: { id: true } }
            },
            take: 50
        });

        const safeProfiles = users.map((user: any) => ({
            id: user.id,
            name: user.name,
            headline: user.headline || '',
            location: [user.city, user.country].filter(Boolean).join(', '),
            company: user.companyName || 'PitchIn',
            role: user.role || 'Member',
            type: user.role === 'Founder' || user.role === 'Investor' || user.role === 'Mentor' ? user.role : 'Member',
            profilePicture: user.photoUrl || 'https://i.pravatar.cc/150',
            tags: (user.skills || []).slice(0, 3).map((s: any) => s.skillName),
            isFollowing: user.followers && user.followers.length > 0,
            _count: user._count || { followers: 0, following: 0 },
            mutualConnections: []
        }));

        const companies = await companyPrisma.company.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                bannerUrl: true,
                oneLineDescription: true,
                industry: true,
                teamSize: true,
                country: true,
                headquarters: true,
                startupStage: true,
                followersCount: true
            },
            take: 50
        });

        const safeCompanies = companies.map((company: any) => ({
            id: company.id,
            name: company.name,
            slug: company.slug || company.id,
            type: 'Company',
            profilePicture: company.logoUrl || null,
            bannerUrl: company.bannerUrl || null,
            headline: company.oneLineDescription || '',
            industry: company.industry || '',
            teamSize: company.teamSize || '',
            country: company.country || company.headquarters || '',
            startupStage: company.startupStage || '',
            followersCount: company.followersCount || 0,
            tags: [company.industry, company.teamSize, company.startupStage].filter(Boolean),
        }));

        return { profiles: [...safeProfiles, ...safeCompanies] };
    }
}

