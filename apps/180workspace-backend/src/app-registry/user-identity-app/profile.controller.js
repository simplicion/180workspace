const { getPresignedUploadUrl, deleteFromR2 } = require('../../platform-core/platform-storage/services/r2');
const { v4: uuidv4 } = require('uuid');

// Helper to get prisma from req (tenant-aware)
const getPrisma = (req) => req.prisma;

exports.getProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const prisma = getPrisma(req);

        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        
        const user = await prisma.user.findFirst({
            where: isValidUUID ? { id: userId } : { username: userId },
            include: {
                experiences: { orderBy: { startDate: 'desc' } },
                educations: { orderBy: { startDate: 'desc' } },
                userProjects: { orderBy: { startDate: 'desc' } },
                skills: { select: { skillName: true } },
                resumes: { orderBy: { uploadedAt: 'desc' } },
                _count: { select: { followers: true, following: true } },
                followers: { where: { id: req.user.id }, select: { id: true } },
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

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

        return res.json(safeProfile);
    } catch (err) {
        next(err);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const prisma = getPrisma(req);
        const { name, headline, title, companyName, phone, bio, city, country, socialLinks, highlights, photoUrl, bannerImage } = req.body;

        const updatedUser = await prisma.user.update({
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

        return res.json(updatedUser);
    } catch (err) {
        next(err);
    }
};

exports.getUploadUrl = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { fileType, contentType, extension } = req.body; 

        if (!['avatar', 'banner', 'resume'].includes(fileType)) {
            return res.status(400).json({ message: 'Invalid file type' });
        }

        const key = `profiles/${userId}/${fileType}_${uuidv4()}.${extension}`;
        const url = await getPresignedUploadUrl(key, contentType);
        const publicUrl = `${process.env.REELS_CDN_URL}/${key}`;
        
        return res.json({ uploadUrl: url, key, publicUrl });
    } catch (err) {
        next(err);
    }
};

// --- Experiences ---
exports.addExperience = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const data = { ...req.body, userId: req.user.id };
        const exp = await prisma.userExperience.create({ data });
        res.json(exp);
    } catch (err) {
        next(err);
    }
};

exports.updateExperience = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const exp = await prisma.userExperience.update({
            where: { id: req.params.id, userId: req.user.id },
            data: req.body
        });
        res.json(exp);
    } catch (err) {
        next(err);
    }
};

exports.deleteExperience = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        await prisma.userExperience.delete({
            where: { id: req.params.id, userId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// --- Education ---
exports.addEducation = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const data = { ...req.body, userId: req.user.id };
        const edu = await prisma.userEducation.create({ data });
        res.json(edu);
    } catch (err) {
        next(err);
    }
};

exports.updateEducation = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const edu = await prisma.userEducation.update({
            where: { id: req.params.id, userId: req.user.id },
            data: req.body
        });
        res.json(edu);
    } catch (err) {
        next(err);
    }
};

exports.deleteEducation = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        await prisma.userEducation.delete({
            where: { id: req.params.id, userId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// --- Skills ---
exports.searchSkills = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const { q } = req.query;
        if (!q) return res.json([]);

        const skills = await prisma.skill.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            take: 10
        });
        res.json(skills);
    } catch (err) {
        next(err);
    }
};

exports.addSkill = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const { skillName, isCustom } = req.body;
        
        // Ensure skill isn't already added
        const existing = await prisma.userSkill.findFirst({
            where: { userId: req.user.id, skillName: { equals: skillName, mode: 'insensitive' } }
        });

        if (existing) {
            return res.status(400).json({ message: 'Skill already added' });
        }

        const skill = await prisma.userSkill.create({
            data: { userId: req.user.id, skillName, isCustom: !!isCustom }
        });
        res.json(skill);
    } catch (err) {
        next(err);
    }
};

exports.deleteSkill = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        await prisma.userSkill.delete({
            where: { id: req.params.id, userId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// --- Resumes ---
exports.addResume = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        
        const count = await prisma.userResume.count({ where: { userId: req.user.id } });
        if (count >= 3) {
            return res.status(400).json({ message: 'Maximum of 3 resumes allowed.' });
        }

        const { fileUrl, fileName } = req.body;
        const resume = await prisma.userResume.create({
            data: { userId: req.user.id, fileUrl, fileName }
        });
        res.json(resume);
    } catch (err) {
        next(err);
    }
};

exports.deleteResume = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const resume = await prisma.userResume.findUnique({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (resume && resume.fileUrl) {
            const cdnBase = process.env.REELS_CDN_URL?.replace(/\/$/, "");
            if (cdnBase && resume.fileUrl.startsWith(cdnBase)) {
                const key = resume.fileUrl.slice(cdnBase.length + 1);
                await deleteFromR2(key).catch(e => console.error("Failed to delete from R2", e));
            }
        }

        await prisma.userResume.delete({
            where: { id: req.params.id, userId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};



exports.followProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const prisma = getPrisma(req);

        // resolve target user
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        const targetUser = await prisma.user.findFirst({
            where: isValidUUID ? { id: userId } : { username: userId }
        });
        if (!targetUser) return res.status(404).json({ message: "User not found" });
        const resolvedUserId = targetUser.id;

        if (resolvedUserId === currentUserId) return res.status(400).json({ message: "Cannot follow yourself" });

        const user = await prisma.user.findUnique({
            where: { id: currentUserId },
            include: { following: { where: { id: resolvedUserId }, select: { id: true } } }
        });

        const isFollowing = user.following.length > 0;

        if (isFollowing) {
            await prisma.user.update({
                where: { id: currentUserId },
                data: { following: { disconnect: { id: resolvedUserId } } }
            });
            return res.json({ following: false });
        } else {
            await prisma.user.update({
                where: { id: currentUserId },
                data: { following: { connect: { id: resolvedUserId } } }
            });
            return res.json({ following: true });
        }
    } catch (err) {
        next(err);
    }
};

exports.getNetwork = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const prisma = getPrisma(req);
        
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        const user = await prisma.user.findFirst({
            where: isValidUUID ? { id: userId } : { username: userId },
            include: {
                followers: { select: { id: true, username: true, name: true, photoUrl: true, headline: true } },
                following: { select: { id: true, username: true, name: true, photoUrl: true, headline: true } }
            }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        const followers = user.followers || [];
        const following = user.following || [];
        const resolvedUserId = user.id;
        
        let common = [];
        if (currentUserId === resolvedUserId) {
            common = followers.filter(f => following.some(fw => fw.id === f.id));
        } else {
            const currentUser = await prisma.user.findUnique({
                where: { id: currentUserId },
                include: { following: { select: { id: true } } }
            });
            const myFollowingIds = (currentUser.following || []).map(u => u.id);
            common = followers.filter(f => myFollowingIds.includes(f.id));
        }

        return res.json({ followers, following, common });
    } catch(err) { 
        next(err); 
    }
};


// Projects
exports.addProject = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const data = { ...req.body, userId: req.user.id };
        const project = await prisma.userProject.create({ data });
        res.json(project);
    } catch (err) {
        next(err);
    }
};

exports.updateProject = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const project = await prisma.userProject.update({
            where: { id: req.params.id, userId: req.user.id },
            data: req.body
        });
        res.json(project);
    } catch (err) {
        next(err);
    }
};

exports.deleteProject = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        await prisma.userProject.delete({
            where: { id: req.params.id, userId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

exports.getAllNetworkProfiles = async (req, res, next) => {
    try {
        const prisma = getPrisma(req);
        const users = await prisma.user.findMany({
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
                followers: { where: { id: req.user.id }, select: { id: true } }
            },
            take: 50
        });

        const safeProfiles = users.map(user => ({
            id: user.id,
            name: user.name,
            headline: user.headline || '',
            location: [user.city, user.country].filter(Boolean).join(', '),
            company: user.companyName || 'PitchIn',
            role: user.role || 'Member',
            type: user.role === 'Founder' || user.role === 'Investor' || user.role === 'Mentor' ? user.role : 'Member',
            profilePicture: user.photoUrl || 'https://i.pravatar.cc/150',
            tags: (user.skills || []).slice(0, 3).map(s => s.skillName),
            isFollowing: user.followers && user.followers.length > 0,
            _count: user._count || { followers: 0, following: 0 },
            mutualConnections: []
        }));

        // Fetch Companies
        const companies = await prisma.company.findMany({
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

        const safeCompanies = companies.map(company => ({
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

        res.json({ profiles: [...safeProfiles, ...safeCompanies] });
    } catch (err) {
        next(err);
    }
};
