// @ts-nocheck
import { CrmCalculationService } from '../sales/crm-calculation.service';
import { EmailService, paginateWithCursor, extractPaginationParams } from '@workspace/backend-infra';
const emailService = EmailService;

import { prisma } from '@workspace/db';
import moment from 'moment';
import * as salesMath from '../utils/salesMath';
import { SalesRuleEngineService as SalesRuleEngine } from '../sales/sales-rule-engine.service';
const bcrypt = require('bcryptjs');

export class LeadsService {
    static async getLeads(pageOrQuery: any = 1, limit = 100) {
        // If passed request query object or cursor is present
        if (typeof pageOrQuery === 'object' && pageOrQuery !== null) {
            const params = extractPaginationParams(pageOrQuery);
            const where: any = {};
            if (pageOrQuery.status) where.status = pageOrQuery.status;
            if (pageOrQuery.category) where.category = pageOrQuery.category;
            if (pageOrQuery.search) {
                where.OR = [
                    { name: { contains: pageOrQuery.search, mode: 'insensitive' } },
                    { company: { contains: pageOrQuery.search, mode: 'insensitive' } },
                    { email: { contains: pageOrQuery.search, mode: 'insensitive' } },
                    { category: { contains: pageOrQuery.search, mode: 'insensitive' } }
                ];
            }

            if (params.cursor) {
                const result = await paginateWithCursor(prisma.lead, {
                    where,
                    cursor: params.cursor,
                    limit: params.limit,
                    direction: params.direction,
                    sortField: params.sortField || 'createdAt',
                    sortOrder: params.sortOrder || 'desc',
                    include: { assignedSalesRep: { select: { name: true, email: true } } },
                    includeTotalCount: true
                });

                return {
                    leads: result.items,
                    pageInfo: result.pageInfo,
                    pagination: {
                        total: result.pageInfo.totalCount || result.items.length,
                        hasMore: result.pageInfo.hasNextPage,
                        endCursor: result.pageInfo.endCursor
                    }
                };
            }

            const page = params.page || 1;
            const safeLimit = Math.min(params.limit || 50, 100);
            const skip = (page - 1) * safeLimit;

            const [leads, total] = await Promise.all([
                prisma.lead.findMany({
                    where,
                    include: { assignedSalesRep: { select: { name: true, email: true } } },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: safeLimit
                }),
                prisma.lead.count({ where })
            ]);

            return { leads, pagination: { total, page, limit: safeLimit, pages: Math.ceil(total / safeLimit) } };
        }

        const page = typeof pageOrQuery === 'number' ? pageOrQuery : 1;
        const safeLimit = Math.min(limit, 100);
        const skip = (page - 1) * safeLimit;
        
        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                include: { assignedSalesRep: { select: { name: true, email: true } } },
                orderBy: { leadScore: 'desc' },
                skip: skip,
                take: safeLimit
            }),
            prisma.lead.count()
        ]);

        return { leads, pagination: { total, page, limit: safeLimit, pages: Math.ceil(total / safeLimit) } };
    }

    static async getCategories() {
        const defaultCategories = ['Enterprise', 'SMB', 'VIP Client', 'Retail', 'Wholesale', 'Partner', 'Government', 'Tech & Media', 'Healthcare', 'Inbound Prospect', 'Outbound Lead'];
        
        let dbCategories: { name: string }[] = [];
        try {
            dbCategories = await prisma.clientCategory.findMany({ select: { name: true } }).catch(() => []);
        } catch (e) {}

        let leadCategories: { category: string }[] = [];
        try {
            leadCategories = await prisma.lead.findMany({
                where: { category: { not: null } },
                select: { category: true },
                distinct: ['category']
            });
        } catch (e) {}

        const allCatNames = [
            ...defaultCategories,
            ...dbCategories.map((c: any) => c.name),
            ...leadCategories.map((c: any) => c.category).filter(Boolean)
        ];

        return Array.from(new Set(allCatNames)).sort((a: string, b: string) => a.localeCompare(b));
    }

    static async createLead(data, userId) {
        const leadCategory = data.category || data.leadCategory || data.clientCategory || null;
        
        let validFollowUpDate = null;
        if (data.followUpDate) {
            const d = new Date(data.followUpDate);
            if (!isNaN(d.getTime())) {
                validFollowUpDate = d;
            }
        }

        const compId = data.companyId || (prisma as any)?._companyId;
        const leadData: any = {
            name: data.name || data.contactName || data.title || 'Unknown Lead',
            email: data.email || data.contactEmail || null,
            phone: data.phone || data.contactPhone || null,
            company: data.company || data.companyName || null,
            companyName: data.companyName || data.company || null,
            industry: data.industry || null,
            category: leadCategory,
            companySize: data.companySize || data.employeeCount ? parseInt(data.companySize || data.employeeCount) : null,
            source: data.source || null,
            status: data.status || data.stage || 'new',
            value: data.value ? parseFloat(data.value) : 0,
            engagementScore: data.engagementScore || 50,
            notes: data.notes || null,
            followUpDate: validFollowUpDate,
            ...(compId ? { tenantCompany: { connect: { id: compId } } } : {})
        };
        const ownerId = data.owner || data.ownerId || data.assignedSalesRepId || userId;
        if (ownerId && typeof ownerId === 'string' && ownerId.length > 5) {
            const userExists = await prisma.user.findUnique({ where: { id: ownerId } }).catch(() => null);
            if (userExists) {
                leadData.assignedSalesRep = { connect: { id: ownerId } };
            }
        }
        const lead = await prisma.lead.create({ data: leadData });

        let existingClient = null;
        if (data.clientId) {
            existingClient = await prisma.client.findUnique({ where: { id: data.clientId } }).catch(() => null);
        } else if (leadData.phone || leadData.email) {
            existingClient = await prisma.client.findFirst({
                where: {
                    OR: [
                        ...(leadData.phone ? [{ phone: leadData.phone }] : []),
                        ...(leadData.email ? [{ email: leadData.email }] : [])
                    ]
                }
            }).catch(() => null);
        }

        const shouldCreateClient = data.createClient === true || data.createClient === 'true' || data.createClient === 1;
        const clientCategory = data.clientCategory || data.category || data.leadCategory || leadCategory || null;

        if (clientCategory && typeof clientCategory === 'string' && clientCategory.trim().length > 0) {
            const catName = clientCategory.trim();
            if (compId) {
                await prisma.clientCategory.upsert({
                    where: { companyId_name: { companyId: compId, name: catName } },
                    update: {},
                    create: { name: catName, company: { connect: { id: compId } } }
                }).catch(() => {});
            } else {
                const existing = await prisma.clientCategory.findFirst({ where: { name: catName } }).catch(() => null);
                if (!existing) {
                    await prisma.clientCategory.create({ data: { name: catName } }).catch(() => {});
                }
            }
        }

        if (shouldCreateClient) {
            try {
                if (!existingClient) {
                    await prisma.client.create({
                        data: {
                            name: data.contactName || leadData.name,
                            email: leadData.email,
                            phone: leadData.phone,
                            companyName: leadData.company,
                            industry: leadData.industry,
                            category: clientCategory,
                            employeeCount: leadData.companySize ? leadData.companySize.toString() : null,
                            assignedManager: ownerId,
                            status: 'Active',
                            leadSource: leadData.source,
                            ...(compId ? { company: { connect: { id: compId } } } : {})
                        }
                    });
                } else if (clientCategory) {
                    await prisma.client.update({
                        where: { id: existingClient.id },
                        data: { category: clientCategory }
                    });
                }
            } catch (clientErr) {
                console.error('Failed to create client from lead', clientErr);
            }
        }

        try {
            let validActivityOwner: string | null = null;
            if (userId && typeof userId === 'string' && userId.length > 5) {
                const u = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
                if (u) validActivityOwner = u.id;
            }

            await prisma.salesActivity.create({ data: {
                type: 'note',
                lead: { connect: { id: lead.id } },
                notes: `New lead created: ${lead.name} from ${lead.company || 'Unknown'}`,
                owner: validActivityOwner ? { connect: { id: validActivityOwner } } : undefined,
                ...(compId ? { company: { connect: { id: compId } } } : {})
            } });
        } catch (actErr) {
            console.error('Failed to create sales activity', actErr);
        }

        try {
            const settings = (prisma as any).platformSettings ? await (prisma as any).platformSettings.findFirst().catch(() => null) : null;
            if (settings) {
                const newScore = CrmCalculationService.scoreLead(lead, settings?.salesConfig?.leadScoring);
                await prisma.lead.update({ where: { id: lead.id }, data: { leadScore: newScore } }).catch(() => {});
            }
        } catch (scoringErr) {}

        try {
            await SalesRuleEngine.onLeadCreated(lead.id);
        } catch (ruleErr) {
            console.error('Failed onLeadCreated rule', ruleErr);
        }

        return lead;
    }

    static async updateLead(id, updateData) {
        
        let lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) throw new Error('Lead not found');

        const oldLead = lead;
        
        const sanitizedData: any = {};
        if (updateData.name !== undefined || updateData.contactName !== undefined || updateData.title !== undefined) sanitizedData.name = updateData.name || updateData.contactName || updateData.title;
        if (updateData.email !== undefined || updateData.contactEmail !== undefined) sanitizedData.email = updateData.email || updateData.contactEmail;
        if (updateData.phone !== undefined || updateData.contactPhone !== undefined) sanitizedData.phone = updateData.phone || updateData.contactPhone;
        if (updateData.company !== undefined || updateData.companyName !== undefined) sanitizedData.company = updateData.company || updateData.companyName;
        if (updateData.companyName !== undefined || updateData.company !== undefined) sanitizedData.companyName = updateData.companyName || updateData.company;
        if (updateData.industry !== undefined) sanitizedData.industry = updateData.industry;
        if (updateData.category !== undefined || updateData.leadCategory !== undefined) sanitizedData.category = updateData.category || updateData.leadCategory;
        if (updateData.companySize !== undefined || updateData.employeeCount !== undefined) sanitizedData.companySize = parseInt(updateData.companySize || updateData.employeeCount);
        if (updateData.source !== undefined) sanitizedData.source = updateData.source;
        if (updateData.status !== undefined || updateData.stage !== undefined) sanitizedData.status = updateData.status || updateData.stage;
        if (updateData.value !== undefined) sanitizedData.value = parseFloat(updateData.value);
        if (updateData.engagementScore !== undefined) sanitizedData.engagementScore = updateData.engagementScore;
        if (updateData.owner !== undefined || updateData.ownerId !== undefined || updateData.assignedSalesRepId !== undefined) {
            const ownerId = updateData.owner || updateData.ownerId || updateData.assignedSalesRepId;
            if (ownerId) {
                sanitizedData.assignedSalesRep = { connect: { id: ownerId } };
            } else {
                sanitizedData.assignedSalesRep = { disconnect: true };
            }
        }
        if (updateData.notes !== undefined) sanitizedData.notes = updateData.notes;
        if (updateData.followUpDate !== undefined) sanitizedData.followUpDate = updateData.followUpDate ? new Date(updateData.followUpDate) : null;

        if (sanitizedData.category && typeof sanitizedData.category === 'string' && sanitizedData.category.trim().length > 0) {
            const catName = sanitizedData.category.trim();
            const catId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await prisma.$executeRawUnsafe(
                `INSERT INTO "ClientCategory" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("name") DO NOTHING`,
                catId,
                catName
            ).catch(() => {});
        }

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: sanitizedData
        });

        // Track value or status changes in SalesActivity
        const activitiesToCreate = [];
        if (updateData.value !== undefined && oldLead.value !== updateData.value) {
            activitiesToCreate.push({
                type: 'note',
                leadId: lead.id,
                notes: `Lead value updated from â‚¹${oldLead.value || 0} to â‚¹${updateData.value || 0}`,
                ownerId: lead.assignedSalesRepId
            });
        }
        if (updateData.status !== undefined && oldLead.status !== updateData.status) {
            activitiesToCreate.push({
                type: 'note',
                leadId: lead.id,
                notes: `Lead status changed from ${oldLead.status} to ${updateData.status}`,
                ownerId: lead.assignedSalesRepId
            });
        }
        
        if (activitiesToCreate.length > 0) {
            try {
                await prisma.salesActivity.createMany({ data: activitiesToCreate });
            } catch (actErr) {
                console.error('Failed to create sales activity for lead update', actErr);
            }
        }

        try {
            const settings = (prisma as any).platformSettings ? await (prisma as any).platformSettings.findFirst().catch(() => null) : null;
            if (settings) {
                await this.calculateLeadScore(updatedLead, settings);
            }
        } catch (scoringErr) {}

        try {
            
            triggerN8nWebhook('update-lead', {
                leadId: updatedLead.id,
                name: updatedLead.name,
                company: updatedLead.company,
                status: updatedLead.status,
                assignedSalesRep: updatedLead.assignedSalesRepId
            });
        } catch (err) {}

        return updatedLead;
    }

    static async deleteLead(id: string) {
        await prisma.salesActivity.deleteMany({ where: { leadId: id } });
        await prisma.salesTask.deleteMany({ where: { leadId: id } });
        await prisma.lead.delete({ where: { id } });
    }

    static async deleteMultipleLeads(ids: string[]) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        await prisma.salesActivity.deleteMany({ where: { leadId: { in: ids } } });
        await prisma.salesTask.deleteMany({ where: { leadId: { in: ids } } });
        const result = await prisma.lead.deleteMany({ where: { id: { in: ids } } });
        return { count: result.count };
    }

    static async updateMultipleLeadsStatus(ids: string[], status: string) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        const result = await prisma.lead.updateMany({
            where: { id: { in: ids } },
            data: { status }
        });
        return { count: result.count };
    }


static async importLeads(leads, userId) {
        if (!Array.isArray(leads) || leads.length === 0) {
            throw new Error('No leads provided');
        }

        const newLeads = leads.map(l => ({
            ...l,
            assignedSalesRep: l.assignedSalesRep || userId,
        }));

        const settings = (prisma as any).platformSettings ? await (prisma as any).platformSettings.findFirst().catch(() => null) : null;
        
        

        // Note: Using findMany to get the inserted leads for scoring/triggers would be better, 
        // but skipping for now to match old behavior exactly.
        
        return inserted.length;
    }

static async convertLead(id: string, userId: string) {
        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) throw new Error('Lead not found');
        if (lead.status === 'converted') throw new Error('This lead has already been converted.');

        // Use interactive transaction with 30s timeout for remote cloud DB latency
        return await prisma.$transaction(async (tx: any) => {
            const companyName = lead.company || lead.companyName || 'Unknown Company';
            
            let account = await tx.client.findFirst({ where: { companyName: { equals: companyName.trim(), mode: 'insensitive' } } });
            
            const compId = lead.companyId || (prisma as any)?._companyId;
            if (!account) {
                account = await tx.client.create({ data: {
                    companyName: companyName.trim(),
                    name: companyName.trim(),
                    industry: lead.industry,
                    employeeCount: lead.companySize ? String(lead.companySize) : undefined,
                    assignedManager: userId,
                    ...(compId ? { company: { connect: { id: compId } } } : {})
                } });
            }

            let contact = await tx.client.findFirst({ where: { 
                companyName: { equals: companyName.trim(), mode: 'insensitive' },
                OR: [
                    { email: lead.email || undefined },
                    { name: lead.name }
                ].filter(c => c.email !== undefined || (c as any).name !== undefined)
            } });

            if (!contact) {
                contact = await tx.client.create({ data: {
                    companyName: account.companyName,
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone,
                    ...(compId ? { company: { connect: { id: compId } } } : {})
                } });
            }

            let validOwnerId: string | null = null;
            if (userId) {
                const ownerUser = await tx.user.findUnique({ where: { id: userId } });
                if (ownerUser) validOwnerId = ownerUser.id;
            }
            if (!validOwnerId && lead.assignedSalesRepId) {
                const repUser = await tx.user.findUnique({ where: { id: lead.assignedSalesRepId } });
                if (repUser) validOwnerId = repUser.id;
            }

            const opp = await tx.deal.create({ data: {
                title: lead.name ? `Deal - ${lead.name}` : `Deal with ${companyName}`,
                client: account ? { connect: { id: account.id } } : undefined,
                lead: { connect: { id: lead.id } },
                value: lead.value || 0,
                stage: 'ContractPending',
                owner: validOwnerId ? { connect: { id: validOwnerId } } : undefined,
                priorityScore: (lead.leadScore || 0),
                ...(compId ? { company: { connect: { id: compId } } } : {})
            } });

            await tx.lead.update({ where: { id: lead.id }, data: { status: 'converted' } });

            await tx.salesActivity.create({ data: {
                type: 'task',
                lead: { connect: { id: lead.id } },
                relatedClient: account ? { connect: { id: account.id } } : undefined,
                deal: opp ? { connect: { id: opp.id } } : undefined,
                notes: `Converted lead into account and opportunity: ${opp.title}`,
                owner: validOwnerId ? { connect: { id: validOwnerId } } : undefined,
                ...(compId ? { company: { connect: { id: compId } } } : {})
            } });

            return { account, contact, opportunity: opp };
        }, { maxWait: 10000, timeout: 30000 });
    };

static async findDuplicateLeads(leadName, email) {
        const leads = await prisma.lead.findMany({
            where: { status: { not: 'converted' } }
        });
        let duplicates = [];
        for (let l of leads) {
            let similarity = salesMath.stringSimilarity(leadName, l.name);
            if (email && l.email === email) similarity = 1.0;
            if (similarity > 0.85) duplicates.push({ leadId: l.id, similarity });
        }
        return duplicates;
    }

static async suggestRepForLead() {
        const leads = await prisma.lead.findMany({
            where: { status: { in: ['new', 'contacted'] } }
        });

        const repMap = {};
        leads.forEach(l => {
            if (l.assignedSalesRepId) {
                repMap[l.assignedSalesRepId] = (repMap[l.assignedSalesRepId] || 0) + 1;
            }
        });

        let minRep = null;
        let minCount = Infinity;
        for (const [repId, count] of Object.entries(repMap)) {
            if (count < minCount) {
                minCount = count;
                minRep = repId;
            }
        }
        return minRep;
    }

}
