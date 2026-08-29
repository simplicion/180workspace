import { Request, Response } from 'express';
import { AppError } from '../../../../system-configs/middleware/system/error';

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const action = req.query.action as string;

        const where: any = {};
        
        if (action) {
            where.action = { contains: action, mode: 'insensitive' };
        }

        const prismaClient = (req as any).prisma;
        if (!prismaClient) {
            return res.status(500).json({ error: 'Database connection not established for this workspace' });
        }

        const [logs, total] = await Promise.all([
            prismaClient.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaClient.auditLog.count({ where })
        ]);

        const mappedLogs = logs.map((log: any) => ({
            id: log.id,
            timestamp: log.createdAt,
            eventType: log.action,
            description: log.details && typeof log.details === 'object' && 'description' in log.details ? (log.details as any).description : log.action,
            triggeredBy: log.user ? {
                name: log.user.name,
                role: log.user.role,
                email: log.user.email
            } : null,
            details: log.details,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            location: log.details && typeof log.details === 'object' && 'location' in log.details ? (log.details as any).location : null
        }));

        res.json({
            logs: mappedLogs,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};
