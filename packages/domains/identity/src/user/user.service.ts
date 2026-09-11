// @ts-nocheck
import { prisma, requestContext } from '@workspace/db';
import { clearCache, setCachedData } from '@workspace/backend-infra';
import { logAction } from '@workspace/backend-infra';
import { deleteFromCloudinary } from '@workspace/backend-infra';

export class UserService {
    static async getUsers(queryParams: any, explicitCompanyId?: string) {
        const User = prisma.user;
        const { search, role, page = 1, limit = 50 } = queryParams;
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        
        const query: any = {
            deletedAt: null
        };
        
        if (companyId) {
            query.companyId = companyId;
        }
        
        if (search) {
            query.AND = [
                {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { employeeId: { contains: search, mode: 'insensitive' } }
                    ]
                }
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

    static async getUserById(id: string, currentUserRole: string, explicitCompanyId?: string) {
        const User = prisma.user;
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        const where: any = { id, deletedAt: null };
        if (companyId) where.companyId = companyId;

        const user = await User.findFirst({ where });
        
        if (!user) throw new Error('User not found');
        
        if (!['admin', 'manager'].includes(currentUserRole)) {
            delete user.apiKey;
            delete user.apiKeyEnabled;
            delete user.mfaSecret;
            delete user.bankAccount;
        }

        return { user };
    }

    static async updateUser(id: string, body: any, currentUser: any, reqObj: any, explicitCompanyId?: string) {
        const User = prisma.user;
        const forbidden = ['password', 'email', 'refreshTokens', 'mfaSecret'];
        
        if (currentUser.role !== 'admin') {
            forbidden.push('roles', 'role', 'salary', 'employeeId', 'permissions');
        }
        forbidden.forEach((f) => delete body[f]);

        const existingUser = await User.findUnique({ where: { id } });
        if (!existingUser || existingUser.deletedAt !== null) throw new Error('User not found');

        const companyId = explicitCompanyId || existingUser.companyId || (requestContext.getStore()?.companyId as string);
        if (companyId && existingUser.companyId && existingUser.companyId !== companyId) {
            throw new Error('User does not belong to this company workspace');
        }

        if (body.employeeId !== undefined && body.employeeId !== null && body.employeeId !== '') {
            const trimmedEmpId = String(body.employeeId).trim();
            if (companyId) {
                const duplicate = await User.findFirst({
                    where: {
                        companyId,
                        employeeId: trimmedEmpId,
                        id: { not: id }
                    }
                });
                if (duplicate) {
                    throw new Error(`Employee ID "${trimmedEmpId}" is already assigned to another team member in this workspace.`);
                }
            }
            body.employeeId = trimmedEmpId;
        }

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

        if (body.photo !== undefined) {
            body.photoUrl = body.photo;
            delete body.photo;
        }

        if (body.designationId !== undefined) {
            if (body.designationId && typeof body.designationId === 'string' && body.designationId.trim()) {
                const desVal = body.designationId.trim();
                const Designation = prisma.designation;
                if (Designation) {
                    const compId = companyId || (requestContext.getStore()?.companyId as string);
                    let existing = await Designation.findFirst({ 
                        where: { 
                            name: { equals: desVal, mode: 'insensitive' },
                            OR: [{ companyId: compId }, { companyId: null }]
                        } 
                    });
                    if (!existing) {
                        const byId = await Designation.findFirst({
                            where: {
                                id: desVal,
                                OR: [{ companyId: compId }, { companyId: null }]
                            }
                        });
                        if (byId) {
                            existing = byId;
                        } else {
                            existing = await Designation.create({ 
                                data: { name: desVal, isCustom: true, companyId: compId } 
                            });
                        }
                    }
                    body.designation = { connect: { id: existing.id } };
                }
            } else {
                body.designation = { disconnect: true };
            }
            delete body.designationId;
        }

        if (body.managerId !== undefined) {
            if (body.managerId && typeof body.managerId === 'string' && body.managerId.trim()) {
                body.manager = { connect: { id: body.managerId.trim() } };
            } else {
                body.manager = { disconnect: true };
            }
            delete body.managerId;
        }

        if (body.companyId !== undefined) {
            if (body.companyId && typeof body.companyId === 'string' && body.companyId.trim()) {
                body.company = { connect: { id: body.companyId.trim() } };
            }
            delete body.companyId;
        }

        const user = await User.update({
            where: { id },
            data: body
        });

        await logAction(currentUser.id, 'UPDATE_USER', 'user', id, {}, reqObj);
        return { user };
    }

    static async deleteUser(id: string, currentUser: any, reqObj: any, explicitCompanyId?: string) {
        const User = prisma.user;
        const reqUserId = currentUser.id;

        if (id === String(reqUserId)) {
            throw new Error('Cannot delete your own account');
        }

        const targetUser = await User.findUnique({ where: { id } });
        if (!targetUser || targetUser.deletedAt !== null) throw new Error('User not found');

        const companyId = explicitCompanyId || currentUser.companyId || (requestContext.getStore()?.companyId as string);
        if (companyId && targetUser.companyId && targetUser.companyId !== companyId) {
            throw new Error('User does not belong to this company workspace');
        }

        const originalEmail = targetUser.email;

        if (targetUser.photoUrl) {
            try {
                const publicId = targetUser.photoUrl.split('/').pop().split('.')[0];
                await deleteFromCloudinary(publicId);
            } catch (_) { }
        }

        // Try hard delete first if no constraints, fallback to scrub and soft-delete
        try {
            await User.delete({ where: { id } });
        } catch (_) {
            const scrubbed = {
                name: `Deleted User`,
                email: `deleted_${id}_${Date.now()}@removed.invalid`,
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
        }

        await logAction(reqUserId, 'DELETE_USER', 'user', id, { originalEmail }, reqObj);
        return { success: true, message: 'Employee deleted successfully.' };
    }

    static async bulkDeleteUsers(ids: string[], currentUser: any, reqObj: any, explicitCompanyId?: string) {
        const User = prisma.user;
        const reqUserId = String(currentUser.id);

        const validIds = (ids || []).filter(id => id && String(id) !== reqUserId);
        if (validIds.length === 0) {
            throw new Error('Cannot delete your own account or no valid employee IDs provided');
        }

        const companyId = explicitCompanyId || currentUser.companyId || (requestContext.getStore()?.companyId as string);
        const whereClause: any = {
            id: { in: validIds },
            deletedAt: null
        };
        if (companyId) {
            whereClause.companyId = companyId;
        }

        const targetUsers = await User.findMany({ where: whereClause });
        if (!targetUsers || targetUsers.length === 0) {
            throw new Error('No matching employees found in this workspace');
        }

        let deletedCount = 0;
        for (const targetUser of targetUsers) {
            const id = targetUser.id;
            if (targetUser.photoUrl) {
                try {
                    const publicId = targetUser.photoUrl.split('/').pop().split('.')[0];
                    await deleteFromCloudinary(publicId);
                } catch (_) { }
            }

            try {
                await User.delete({ where: { id } });
                deletedCount++;
            } catch (_) {
                const scrubbed = {
                    name: `Deleted User`,
                    email: `deleted_${id}_${Date.now()}@removed.invalid`,
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
                deletedCount++;
            }
        }

        await logAction(currentUser.id, 'BULK_DELETE_USERS', 'user', 'bulk', { count: deletedCount, ids: targetUsers.map(u => u.id) }, reqObj);
        return { success: true, count: deletedCount, message: `Successfully deleted ${deletedCount} employee(s).` };
    }

    static async updatePhoto(id: string, storageResult: any) {
        const User = prisma.user;
        if (!storageResult) throw new Error('Photo upload failed');
        
        const user = await User.update({ 
            where: { id }, 
            data: { photoUrl: storageResult.fileUrl } 
        });
        
        return { user, photoUrl: storageResult.fileUrl };
    }

    static async getProfileStats(id: string) {
        if (!/^[0-9a-fA-F]{24}$/.test(id) && !id) {
            throw new Error('Invalid User ID format');
        }

        const Task = prisma.task;
        const Project = prisma.project;

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

    static async toggleFollow(targetId: string, currentUserId: string, io: any) {
        if (targetId === String(currentUserId)) {
            throw new Error('Cannot follow yourself');
        }

        const User = prisma.user;
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

    static async getFollowers(id: string) {
        const User = prisma.user;
        const user = await User.findUnique({
            where: { id },
            include: { followers: { select: { id: true, name: true, photoUrl: true, headline: true } } }
        });
        if (!user) throw new Error('User not found');
        return { followers: user.followers };
    }

    static async getFollowing(id: string) {
        const User = prisma.user;
        const user = await User.findUnique({
            where: { id },
            include: { following: { select: { id: true, name: true, photoUrl: true, headline: true } } }
        });
        if (!user) throw new Error('User not found');
        return { following: user.following };
    }

    static async searchMentions(q: string) {
        if (!q) return { users: [] };
        const User = prisma.user;
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

