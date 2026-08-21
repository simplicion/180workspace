// @ts-nocheck
import { prisma } from '@workspace/db';
import { clearCache, setCachedData } from '@workspace/backend-infra';
import { logAction } from '@workspace/backend-infra';
import { deleteFromCloudinary } from '@workspace/backend-infra'; // Adjust if cloudinary is in common
import { getCompanyPrisma, prisma as globalPrisma } from '@workspace/db';

export class UserService {
    static async getUsers(companyPrisma: any, queryParams: any) {
        const User = companyPrisma.user;
        const { search, role, page = 1, limit = 50 } = queryParams;
        const query: any = {};
        
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

        return { users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
    }

    static async getUserById(companyPrisma: any, id: string, currentUserRole: string) {
        const User = companyPrisma.user;
        const user = await User.findUnique({ where: { id } });
        
        if (!user) throw new Error('User not found');
        
        if (!['admin', 'manager'].includes(currentUserRole)) {
            delete user.apiKey;
            delete user.apiKeyEnabled;
            delete user.mfaSecret;
            delete user.bankAccount;
        }

        return { user };
    }

    static async updateUser(companyPrisma: any, id: string, body: any, currentUser: any, company: any, reqObj: any) {
        const User = companyPrisma.user;
        const forbidden = ['password', 'email', 'refreshTokens', 'mfaSecret'];
        
        if (!['admin', 'ceo'].includes(currentUser.role)) {
            forbidden.push('roles', 'role', 'salary', 'employeeId', 'permissions');
        }
        forbidden.forEach((f) => delete body[f]);

        const existingUser = await User.findUnique({ where: { id } });
        if (!existingUser) throw new Error('User not found');

        if (body.designationId === "") body.designationId = null;
        if (body.managerId === "") body.managerId = null;
        if (body.salary !== undefined) body.salary = parseFloat(body.salary) || 0;
        if (body.leaveBalance !== undefined) body.leaveBalance = parseFloat(body.leaveBalance) || 0;
        
        if (body.roles && Array.isArray(body.roles)) {
            body.role = body.roles[0] || 'employee';
            delete body.roles;
        }
        if (body.joiningDate) {
            body.joinDate = new Date(body.joiningDate);
            delete body.joiningDate;
        }
        if (body.joinDate && typeof body.joinDate === 'string') {
            body.joinDate = new Date(body.joinDate);
        }

        if (body.designationId) {
            const designationId = body.designationId;
            const Designation = companyPrisma.designation;
            if (Designation) {
                let existing = await Designation.findFirst({ 
                    where: { 
                        name: { equals: designationId, mode: 'insensitive' },
                        OR: [{ companyId: company?.id }, { companyId: null }]
                    } 
                });
                if (!existing) {
                    existing = await Designation.create({ 
                        data: { name: designationId, isCustom: true, companyId: company?.id } 
                    });
                }
                body.designationId = existing.id;
            }
        }

        const user = await User.update({
            where: { id },
            data: body
        });

        await logAction(currentUser.id, 'UPDATE_USER', 'user', id, {}, reqObj);
        return { user };
    }

    static async deleteUser(companyPrisma: any, id: string, currentUser: any, reqObj: any) {
        const User = companyPrisma.user;
        const reqUserId = currentUser.id;

        if (id === String(reqUserId)) {
            throw new Error('Cannot delete your own account');
        }

        const targetUser = await User.findUnique({ where: { id } });
        if (!targetUser) throw new Error('User not found');

        const originalEmail = targetUser.email;

        if (targetUser.photoUrl) {
            try {
                const publicId = targetUser.photoUrl.split('/').pop().split('.')[0];
                await deleteFromCloudinary(publicId);
            } catch (_) { }
        }

        const scrubbed = {
            name: `Deleted User`,
            email: `deleted_${id}@removed.invalid`,
            password: 'REDACTED',
            phone: '',
            photoUrl: '',
            emergencyContact: '',
            mfaEnabled: false,
            mfaSecret: null,
            apiKey: null,
            apiKeyEnabled: false,
            bankAccount: '',
            isActive: false,
            deletedAt: new Date(),
        };

        await User.update({ where: { id }, data: scrubbed });
        await logAction(reqUserId, 'DELETE_USER', 'user', id, { originalEmail }, reqObj);
        return { message: 'User account and personal data deleted successfully. Company data has been retained.' };
    }

    static async updatePhoto(companyPrisma: any, id: string, storageResult: any) {
        const User = companyPrisma.user;
        if (!storageResult) throw new Error('Photo upload failed');
        
        const user = await User.update({ 
            where: { id }, 
            data: { photoUrl: storageResult.fileUrl } 
        });
        
        return { user, photoUrl: storageResult.fileUrl };
    }

    static async getProfileStats(companyPrisma: any, id: string) {
        if (!/^[0-9a-fA-F]{24}$/.test(id) && !id) {
            throw new Error('Invalid User ID format');
        }

        const Task = companyPrisma.task;
        const Project = companyPrisma.project;

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
            completed: allTasks.filter((t: any) => t.status === 'done').length,
            completedOnTime: allTasks.filter((t: any) => t.completedOnTime === true).length,
            completedLate: allTasks.filter((t: any) => t.status === 'done' && t.completedOnTime === false).length,
            pending: allTasks.filter((t: any) => t.status !== 'done').length,
            overdue: allTasks.filter((t: any) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length,
        };

        const projectsWithRole = projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            progress: p.progress,
            deadline: p.deadline,
            startDate: p.startDate,
            priority: p.priority,
            role: p.ownerId === id ? 'owner' : 'member',
        }));

        return { taskStats, projects: projectsWithRole };
    }

    static async toggleFollow(companyPrisma: any, targetId: string, currentUserId: string, io: any) {
        if (targetId === String(currentUserId)) {
            throw new Error('Cannot follow yourself');
        }

        const User = companyPrisma.user;
        const targetUser = await User.findUnique({
            where: { id: targetId },
            include: { followers: true }
        });

        if (!targetUser) throw new Error('User not found');

        const isFollowing = targetUser.followers.some((f: any) => f.id === String(currentUserId));

        if (isFollowing) {
            await User.update({
                where: { id: targetId },
                data: { followers: { disconnect: { id: currentUserId } } }
            });
            io.emit('profile:follow_updated', { targetId, currentUserId, following: false });
            return { message: 'Unfollowed user successfully', following: false };
        } else {
            await User.update({
                where: { id: targetId },
                data: { followers: { connect: { id: currentUserId } } }
            });
            io.emit('profile:follow_updated', { targetId, currentUserId, following: true });
            return { message: 'Followed user successfully', following: true };
        }
    }

    static async getFollowers(companyPrisma: any, id: string) {
        const User = companyPrisma.user;
        const user = await User.findUnique({
            where: { id },
            include: { followers: { select: { id: true, name: true, photoUrl: true, headline: true } } }
        });
        if (!user) throw new Error('User not found');
        return { followers: user.followers };
    }

    static async getFollowing(companyPrisma: any, id: string) {
        const User = companyPrisma.user;
        const user = await User.findUnique({
            where: { id },
            include: { following: { select: { id: true, name: true, photoUrl: true, headline: true } } }
        });
        if (!user) throw new Error('User not found');
        return { following: user.following };
    }

    static async searchMentions(companyPrisma: any, q: string) {
        if (!q) return { users: [] };
        const User = companyPrisma.user;
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
        return { users: users.map((u: any) => ({ id: u.id, display: u.name, ...u })) };
    }
}

