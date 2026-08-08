'use strict';

const { logAction } = require('../../system-configs/middleware/audit/audit.js');
const { deleteFromCloudinary } = require('../../system-configs/config/cloudinary.js');
const { prisma: globalPrisma } = require('@workspace/db');

exports.getUsers = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        const { search, role, page = 1, limit = 50 } = req.query;
        const query = {};
        
        if (search) {
            query.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { employeeId: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (role) query.role = role;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [users, total] = await Promise.all([
            User.findMany({
                where: query,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: { designation: true }
            }),
            User.count({ where: query })
        ]);

        res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    } catch (err) { next(err); }
};

exports.getUserById = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        
        // Prisma fetches all fields by default, so we don't need to conditionally add +apiKey etc.
        // We can just fetch the user.
        const user = await User.findUnique({ where: { id: req.params.id } });
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // If not admin, we might want to manually strip sensitive fields
        if (!['admin', 'manager'].includes(req.user.role)) {
            delete user.apiKey;
            delete user.apiKeyEnabled;
            delete user.mfaSecret;
            delete user.bankAccount;
        }

        res.json({ user });
    } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        const { id } = req.params;
        const forbidden = ['password', 'email', 'refreshTokens', 'mfaSecret'];
        
        if (!['admin', 'ceo'].includes(req.user.role)) {
            forbidden.push('roles', 'role', 'salary', 'employeeId', 'permissions');
        }
        forbidden.forEach((f) => delete req.body[f]);

        const existingUser = await User.findUnique({ where: { id } });
        if (!existingUser) return res.status(404).json({ error: 'User not found' });

        if (req.body.designationId === "") req.body.designationId = null;
        if (req.body.managerId === "") req.body.managerId = null;
        if (req.body.salary !== undefined) req.body.salary = parseFloat(req.body.salary) || 0;
        if (req.body.leaveBalance !== undefined) req.body.leaveBalance = parseFloat(req.body.leaveBalance) || 0;
        if (req.body.joinDate) req.body.joinDate = new Date(req.body.joinDate);

        if (req.body.designationId) {
            const designationId = req.body.designationId;
            const Designation = req.prisma.designation;
            if (Designation) {
                // Find or create designation
                let existing = await Designation.findFirst({ 
                    where: { 
                        name: { equals: designationId, mode: 'insensitive' },
                        OR: [{ companyId: req.company?.id }, { companyId: null }]
                    } 
                });
                if (!existing) {
                    existing = await Designation.create({ 
                        data: { name: designationId, isCustom: true, companyId: req.company?.id } 
                    });
                }
                req.body.designationId = existing.id;
            }
        }

        const user = await User.update({
            where: { id },
            data: req.body
        });

        await logAction(req.user.id, 'UPDATE_USER', 'user', id, {}, req);
        res.json({ user });
    } catch (err) { 
        if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
        next(err); 
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        const { id } = req.params;
        const reqUserId = req.user.id;

        if (id === String(reqUserId)) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const targetUser = await User.findUnique({ where: { id } });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const originalEmail = targetUser.email;

        // 1. Delete photo from Cloudinary if exists
        if (targetUser.photoUrl) {
            try {
                const publicId = targetUser.photoUrl.split('/').pop().split('.')[0];
                await deleteFromCloudinary(publicId);
            } catch (_) { /* non-critical */ }
        }

        // 2. Scrub ALL PII from the user document, keep _id & company-data fields
        const scrubbed = {
            name: `Deleted User`,
            email: `deleted_${id}@removed.invalid`,
            passwordHash: 'REDACTED', // Assuming passwordHash in Prisma
            phone: '',
            photoUrl: '',
            emergencyContact: '',
            refreshTokens: [], // Make sure your Prisma schema accepts empty arrays or Json here
            mfaEnabled: false,
            mfaSecret: null,
            apiKey: null,
            apiKeyEnabled: false,
            bankAccount: '',
            bankDetails: {
                accountHolderName: '',
                accountNumber: '',
                ifscCode: '',
                bankName: '',
                verificationStatus: 'unverified',
                verificationId: ''
            },
            isActive: false,
            deletedAt: new Date(),
        };

        await User.update({ where: { id }, data: scrubbed });

        await logAction(reqUserId, 'DELETE_USER', 'user', id, { originalEmail }, req);
        res.json({ message: 'User account and personal data deleted successfully. Company data has been retained.' });
    } catch (err) { next(err); }
};

exports.updatePhoto = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        if (!req.storageResult) {
            return res.status(400).json({ error: 'Photo upload failed' });
        }
        
        const user = await User.update({ 
            where: { id: req.params.id }, 
            data: { photoUrl: req.storageResult.fileUrl } 
        });
        
        res.json({ user, photoUrl: req.storageResult.fileUrl });
    } catch (err) { 
        if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
        next(err); 
    }
};

exports.getProfileStats = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!/^[0-9a-fA-F]{24}$/.test(id) && !id) {
            // Simplified validation fallback if not using ObjectId
            return res.status(400).json({ error: 'Invalid User ID format' });
        }

        const Task = req.prisma.task;
        const Project = req.prisma.project;

        const [allTasks, projects] = await Promise.all([
            Task.findMany({
                where: { assigneeId: id, deletedAt: null },
                select: { title: true, status: true, dueDate: true, completedOnTime: true, completedAt: true, projectId: true, priority: true, project: { select: { name: true } } }
            }),
            Project.findMany({
                where: {
                    OR: [
                        { ownerId: id },
                        { memberIds: { has: id } }
                    ],
                    deletedAt: null
                },
                select: { id: true, name: true, status: true, progress: true, deadline: true, startDate: true, ownerId: true, priority: true }
            })
        ]);

        const taskStats = {
            total: allTasks.length,
            completed: allTasks.filter(t => t.status === 'done').length,
            completedOnTime: allTasks.filter(t => t.completedOnTime === true).length,
            completedLate: allTasks.filter(t => t.status === 'done' && t.completedOnTime === false).length,
            pending: allTasks.filter(t => t.status !== 'done').length,
            overdue: allTasks.filter(t =>
                t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()
            ).length,
        };

        const projectsWithRole = projects.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            progress: p.progress,
            deadline: p.deadline,
            startDate: p.startDate,
            priority: p.priority,
            role: p.ownerId === id ? 'owner' : 'member',
        }));

        res.json({ taskStats, projects: projectsWithRole });
    } catch (err) { next(err); }
};

exports.toggleFollow = async (req, res, next) => {
    try {
        const { id: targetId } = req.params;
        const currentUserId = req.user.id;

        if (targetId === String(currentUserId)) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const User = req.prisma.user;
        const targetUser = await User.findUnique({
            where: { id: targetId },
            include: { followers: true }
        });

        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const isFollowing = targetUser.followers.some(f => f.id === String(currentUserId));

        const sockets = require('../../system-configs/sockets/index.js');
        const io = sockets.getIo();

        if (isFollowing) {
            await User.update({
                where: { id: targetId },
                data: { followers: { disconnect: { id: currentUserId } } }
            });
            io.emit('profile:follow_updated', { targetId, currentUserId, following: false });
            res.json({ message: 'Unfollowed user successfully', following: false });
        } else {
            await User.update({
                where: { id: targetId },
                data: { followers: { connect: { id: currentUserId } } }
            });
            io.emit('profile:follow_updated', { targetId, currentUserId, following: true });
            res.json({ message: 'Followed user successfully', following: true });
        }
    } catch (err) { next(err); }
};

exports.getFollowers = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        const user = await User.findUnique({
            where: { id: req.params.id },
            include: { followers: { select: { id: true, name: true, photoUrl: true, headline: true } } }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ followers: user.followers });
    } catch (err) { next(err); }
};

exports.getFollowing = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        const user = await User.findUnique({
            where: { id: req.params.id },
            include: { following: { select: { id: true, name: true, photoUrl: true, headline: true } } }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ following: user.following });
    } catch (err) { next(err); }
};

exports.searchMentions = async (req, res, next) => {
    try {
        const User = req.prisma.user;
        const { q } = req.query;
        if (!q) return res.json({ users: [] });

        const users = await User.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { username: { contains: q, mode: 'insensitive' } }
                ]
            },
            take: 10,
            select: { id: true, name: true, username: true, photoUrl: true }
        });

        res.json({ users: users.map(u => ({ id: u.id, display: u.name, ...u })) });
    } catch (err) { next(err); }
};
