// @ts-nocheck
import { prisma, requestContext } from '@workspace/db';

export interface EntitySearchResult {
    id: string;
    name: string;
    subtitle: string;
}

export class AIEntitySearchService {
    /**
     * Searches entities (Clients, Employees, Projects) by query and type
     */
    static async searchEntities(user: any, type: string, query: string): Promise<EntitySearchResult[]> {
        if (!query || query.length < 1) return [];

        const companyId = (requestContext.getStore()?.companyId as string) || user?.companyId;
        let results: EntitySearchResult[] = [];

        if (type === 'C' && (prisma as any).client) {
            const clients = await (prisma as any).client.findMany({
                where: { name: { contains: query, mode: 'insensitive' }, companyId },
                take: 5,
                select: { id: true, name: true, industry: true }
            });
            results = clients.map((c: any) => ({ id: c.id, name: c.name, subtitle: c.industry || 'Client' }));
        } else if (type === 'E') {
            const employees = await prisma.user.findMany({
                where: { name: { contains: query, mode: 'insensitive' }, companyId },
                take: 5,
                select: { id: true, name: true, role: true }
            });
            results = employees.map((e: any) => ({ id: e.id, name: e.name, subtitle: e.role }));
        } else if (type === 'P') {
            const whereClause: any = { name: { contains: query, mode: 'insensitive' }, companyId };
            if (!['admin', 'hr', 'manager', 'owner'].includes(user?.role?.toLowerCase())) {
                whereClause.memberIds = { has: user?.id };
            }
            const projects = await prisma.project.findMany({
                where: whereClause,
                take: 5,
                select: { id: true, name: true, status: true }
            });
            results = projects.map((p: any) => ({ id: p.id, name: p.name, subtitle: p.status }));
        }

        return results;
    }
}
