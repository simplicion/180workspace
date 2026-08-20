import { prisma } from '@workspace/db';

export class RoleService {
    static async getMatrix() {
        return await prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                permissions: true,
                isActive: true,
                photoUrl: true,
                image: true,
                department: true,
                designation: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    static async bulkUpdate(userId: string, role: string, permissions: string[], currentUser: any) {
        if (!userId) {
            throw new Error('userId is required');
        }

        if (userId === currentUser.id && role !== 'admin') {
            throw new Error('You cannot change your own role.');
        }

        const validRoles = ['admin', 'manager', 'hr', 'employee', 'finance', 'sales', 'client'];
        if (role && !validRoles.includes(role)) {
            throw new Error(`Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`);
        }

        const validPermissions = [
            'can_manage_team', 'can_manage_hr', 'can_manage_finance',
            'can_manage_sales', 'can_manage_projects'
        ];
        const sanitizedPermissions = (permissions || []).filter(p => validPermissions.includes(p));

        const existingUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
            throw new Error('User not found');
        }

        const updateData: any = {};
        if (role) updateData.role = role;
        updateData.permissions = sanitizedPermissions;

        return await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                permissions: true,
                isActive: true,
            },
        });
    }
}
