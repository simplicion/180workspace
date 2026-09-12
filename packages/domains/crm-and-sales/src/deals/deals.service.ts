// @ts-nocheck
import { CrmCalculationService } from '../sales/crm-calculation.service';
import { EmailService, paginateWithCursor, extractPaginationParams } from '@workspace/backend-infra';
const emailService = EmailService;

import { prisma } from '@workspace/db';
import moment from 'moment';

export class DealsService {
    static async enrichDealsWithClients(deals: any[]) {
        if (!Array.isArray(deals) || deals.length === 0) return deals;

        try {
            const rawPhones = deals.map(d => d.lead?.phone || d.client?.phone).filter(Boolean);
            const emails = deals.map(d => d.lead?.email || d.client?.email).filter((e: any) => e && typeof e === 'string' && e.trim().length > 0);
            
            // Query clients with matching phone or email
            const [matchedClients, allRecentClients] = await Promise.all([
                prisma.client.findMany({
                    where: {
                        OR: [
                            ...(rawPhones.length > 0 ? [{ phone: { in: rawPhones } }] : []),
                            ...(emails.length > 0 ? [{ email: { in: emails } }] : [])
                        ]
                    }
                }).catch(() => []),
                prisma.client.findMany({
                    where: { phone: { not: null } },
                    take: 300
                }).catch(() => [])
            ]);

            const allClientsMap = new Map<string, any>();
            matchedClients.forEach((c: any) => allClientsMap.set(c.id, c));
            allRecentClients.forEach((c: any) => allClientsMap.set(c.id, c));

            const clientByCleanPhone = new Map<string, any>();
            const clientByRawPhone = new Map<string, any>();
            const clientByEmail = new Map<string, any>();

            allClientsMap.forEach((c: any) => {
                if (c.phone) {
                    clientByRawPhone.set(c.phone.trim(), c);
                    const digits = c.phone.replace(/\D/g, '');
                    if (digits.length >= 7) {
                        clientByCleanPhone.set(digits.slice(-10), c);
                    }
                }
                if (c.email) {
                    clientByEmail.set(c.email.trim().toLowerCase(), c);
                }
            });

            return deals.map((deal: any) => {
                let resolvedClient = deal.client;
                
                // If client is missing, or is a generic placeholder like "Unknown Company"
                const isGenericClient = !resolvedClient || 
                    resolvedClient.name === 'Unknown Company' || 
                    resolvedClient.companyName === 'Unknown Company';

                const phoneToMatch = deal.lead?.phone || deal.client?.phone;
                const emailToMatch = deal.lead?.email || deal.client?.email;

                if (isGenericClient && (phoneToMatch || emailToMatch)) {
                    let matched: any = null;
                    if (phoneToMatch) {
                        const raw = phoneToMatch.trim();
                        const digits = raw.replace(/\D/g, '');
                        const last10 = digits.length >= 7 ? digits.slice(-10) : null;
                        matched = clientByRawPhone.get(raw) || (last10 ? clientByCleanPhone.get(last10) : null);
                    }
                    if (!matched && emailToMatch) {
                        matched = clientByEmail.get(emailToMatch.trim().toLowerCase());
                    }

                    if (matched && matched.name && matched.name !== 'Unknown Company') {
                        resolvedClient = matched;
                    }
                }

                const clientName = resolvedClient && resolvedClient.name !== 'Unknown Company' 
                    ? (resolvedClient.name || resolvedClient.contactPersonName) 
                    : (deal.lead?.contactName && deal.lead.contactName !== deal.lead.name ? deal.lead.contactName : null);

                return {
                    ...deal,
                    client: resolvedClient,
                    contactName: clientName || deal.contactName || null,
                    phone: resolvedClient?.phone || deal.lead?.phone || null,
                    email: resolvedClient?.email || deal.lead?.email || null
                };
            });
        } catch (err) {
            console.error('Error in enrichDealsWithClients:', err);
            return deals;
        }
    }

    static async getDeals(pageOrQuery: any = 1, limit = 100, pipelineType) {
        if (typeof pageOrQuery === 'object' && pageOrQuery !== null) {
            const params = extractPaginationParams(pageOrQuery);
            const whereClause: any = {};
            if (pageOrQuery.pipelineType) whereClause.pipelineType = pageOrQuery.pipelineType;
            if (pageOrQuery.status) whereClause.status = pageOrQuery.status;
            if (pageOrQuery.search) {
                whereClause.OR = [
                    { title: { contains: pageOrQuery.search, mode: 'insensitive' } },
                    { notes: { contains: pageOrQuery.search, mode: 'insensitive' } }
                ];
            }

            if (params.cursor) {
                const result = await paginateWithCursor(prisma.deal, {
                    where: whereClause,
                    cursor: params.cursor,
                    limit: params.limit,
                    direction: params.direction,
                    sortField: params.sortField || 'createdAt',
                    sortOrder: params.sortOrder || 'desc',
                    include: { 
                        owner: { select: { name: true, email: true } }, 
                        client: true,
                        lead: { select: { name: true, companyName: true, company: true, email: true, phone: true } }
                    },
                    includeTotalCount: true
                });

                const enrichedItems = await this.enrichDealsWithClients(result.items);

                return {
                    deals: enrichedItems,
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

            const [deals, total] = await Promise.all([
                prisma.deal.findMany({
                    where: whereClause,
                    include: { 
                        owner: { select: { name: true, email: true } }, 
                        client: true,
                        lead: { select: { name: true, companyName: true, company: true, email: true, phone: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: safeLimit
                }),
                prisma.deal.count({ where: whereClause })
            ]);

            const enrichedDeals = await this.enrichDealsWithClients(deals);

            return { deals: enrichedDeals, pagination: { total, page, limit: safeLimit, pages: Math.ceil(total / safeLimit) } };
        }

        const page = typeof pageOrQuery === 'number' ? pageOrQuery : 1;
        const safeLimit = Math.min(limit, 100);
        const skip = (page - 1) * safeLimit;
        
        const whereClause = {};
        if (pipelineType) {
            whereClause.pipelineType = pipelineType;
        }

        const [deals, total] = await Promise.all([
            prisma.deal.findMany({ 
                where: whereClause,
                include: { 
                    owner: { select: { name: true, email: true } }, 
                    client: true,
                    lead: { select: { name: true, companyName: true, company: true, email: true, phone: true } }
                }, 
                orderBy: { priorityScore: 'desc' },
                skip: skip,
                take: safeLimit
            }),
            prisma.deal.count({ where: whereClause })
        ]);

        const enrichedDeals = await this.enrichDealsWithClients(deals);

        return { deals: enrichedDeals, pagination: { total, page, limit: safeLimit, pages: Math.ceil(total / safeLimit) } };
    }

    static async createDeal(data, userId) {
        
        const followUpDate = data.followUpDate;
        const followUpTime = data.followUpTime;
        const notes = data.notes;
        
        if (data.followUpDate) {
            let combinedDate = data.followUpDate;
            if (followUpTime && !combinedDate.includes('T')) combinedDate += 'T' + followUpTime;
            data.followUpDate = new Date(combinedDate).toISOString();
        } else {
            data.followUpDate = null; // Important for prisma if undefined/null is passed
        }
        delete data.followUpTime;


        if (typeof data.value === 'string') {
            data.value = parseFloat(data.value.replace(/,/g, ''));
        }

        if (data.owner) {
            data.ownerId = data.owner;
        } else {
            data.ownerId = userId;
        }
        delete data.owner;
        
        if (data.expectedCloseDate) {
            data.expectedCloseDate = new Date(data.expectedCloseDate).toISOString();
        }

        if (!data.clientId && (data.companyName || data.contactEmail)) {
            const Client = prisma.client;
            let client = null;
            if (data.companyName) {
                client = await Client.findFirst({ where: { companyName: data.companyName } });
            }
            if (!client && data.contactEmail) {
                client = await Client.findFirst({ where: { email: data.contactEmail } });
            }

            if (!client) {
                client = await Client.create({
                    data: {
                        name: data.contactName || data.companyName || 'Unknown Lead',
                        companyName: data.companyName || null,
                        email: data.contactEmail || null,
                        phone: data.contactPhone || null,
                        industry: data.industry || null,
                        status: 'active',
                        website: data.website || null,
                        taxId: data.taxId || null,
                        billingAddress: data.billingAddress || null,
                        location: data.location || null,
                        employeeCount: data.employeeCount || null,
                        annualRevenue: data.annualRevenue ? parseFloat(data.annualRevenue) : 0,
                        country: data.country || null
                    }
                });
            }
            data.clientId = client.id;
        }
        delete data.contactName;
        delete data.contactEmail;
        delete data.contactPhone;
        delete data.companyName;
        delete data.industry;
        delete data.website;
        delete data.taxId;
        delete data.billingAddress;
        delete data.location;
        delete data.employeeCount;
        delete data.annualRevenue;
        delete data.country;
        delete data.currency;
        delete data.name; // ensure 'name' isn't accidentally passed into Deal model which only has 'title'
        delete data.category;
        delete data.clientCategory;
        delete data.createClient;
        delete data.leadCategory;
        delete data.accountId;

        if (data.clientId) {
            data.client = { connect: { id: data.clientId } };
            delete data.clientId;
        }
        if (data.leadId) {
            data.lead = { connect: { id: data.leadId } };
            delete data.leadId;
        }
        if (data.ownerId) {
            data.owner = { connect: { id: data.ownerId } };
            delete data.ownerId;
        }
        
        const deal = await prisma.deal.create({ data: { ...data } });

        if (notes) {
            await prisma.salesActivity.create({ data: {
                type: 'note',
                deal: { connect: { id: deal.id } },
                relatedClient: deal.clientId ? { connect: { id: deal.clientId } } : undefined,
                notes: notes,
                owner: userId ? { connect: { id: userId } } : undefined
            } });
        }

        if (followUpDate) {
            let combinedDate = followUpDate;
            if (followUpTime) combinedDate += 'T' + followUpTime;
            await prisma.salesTask.create({
                data: {
                    description: `Follow up on deal: ${deal.title}`,
                    dueDate: new Date(combinedDate),
                    assignedTo: deal.ownerId || userId,
                    deal: { connect: { id: deal.id } },
                }
            });
        }

        await prisma.salesActivity.create({ data: {
            type: 'task',
            deal: { connect: { id: deal.id } },
            relatedClient: deal.clientId ? { connect: { id: deal.clientId } } : undefined,
            notes: `New deal created: ${deal.title}`,
            owner: userId ? { connect: { id: userId } } : undefined
        } });

        const settings = await prisma.settings.findFirst();
        
        deal.probability = CrmCalculationService.calculateWinProbability(deal.stage, deal.engagementScore, settings?.salesConfig?.opportunityStages);
        
        await prisma.deal.update({ where: { id: deal.id }, data: { probability: deal.probability } });

        return deal;
    }

    static async updateDeal(id, data) {
        if (typeof data.value === 'string') {
            data.value = parseFloat(data.value.replace(/,/g, ''));
        }

        const oldDeal = await prisma.deal.findUnique({ where: { id }, include: { client: true } });
        if (!oldDeal) throw new Error('Deal not found');

        if (data.owner) {
            data.ownerId = data.owner;
            delete data.owner;
        }

        const followUpDate = data.followUpDate;
        const followUpTime = data.followUpTime;
        const notes = data.notes;
        
        if (data.followUpDate) {
            let combinedDate = data.followUpDate;
            if (followUpTime && !combinedDate.includes('T')) combinedDate += 'T' + followUpTime;
            data.followUpDate = new Date(combinedDate).toISOString();
        } else {
            data.followUpDate = null;
        }
        delete data.followUpTime;


        if (data.expectedCloseDate) {
            data.expectedCloseDate = new Date(data.expectedCloseDate).toISOString();
        }

        if (data.contactName !== undefined || data.contactEmail !== undefined || data.contactPhone !== undefined || data.companyName !== undefined || data.industry !== undefined || data.location !== undefined || data.website !== undefined || data.taxId !== undefined || data.billingAddress !== undefined || data.employeeCount !== undefined || data.annualRevenue !== undefined || data.country !== undefined) {
            if (oldDeal.clientId) {
                await prisma.client.update({
                    where: { id: oldDeal.clientId },
                    data: {
                        name: data.contactName !== undefined ? data.contactName : undefined,
                        email: data.contactEmail !== undefined ? data.contactEmail : undefined,
                        phone: data.contactPhone !== undefined ? data.contactPhone : undefined,
                        companyName: data.companyName !== undefined ? data.companyName : undefined,
                        industry: data.industry !== undefined ? data.industry : undefined,
                        location: data.location !== undefined ? data.location : undefined,
                        website: data.website !== undefined ? data.website : undefined,
                        taxId: data.taxId !== undefined ? data.taxId : undefined,
                        billingAddress: data.billingAddress !== undefined ? data.billingAddress : undefined,
                        employeeCount: data.employeeCount !== undefined ? data.employeeCount : undefined,
                        annualRevenue: data.annualRevenue !== undefined ? parseFloat(data.annualRevenue) : undefined,
                        country: data.country !== undefined ? data.country : undefined,
                    }
                });
            } else if (data.companyName || data.contactEmail || data.contactName) {
                const Client = prisma.client;
                let client = null;
                if (data.companyName) {
                    client = await Client.findFirst({ where: { companyName: data.companyName } });
                }
                if (!client && data.contactEmail) {
                    client = await Client.findFirst({ where: { email: data.contactEmail } });
                }

                if (!client) {
                    client = await Client.create({
                        data: {
                            name: data.contactName || data.companyName || 'Unknown Lead',
                            companyName: data.companyName || null,
                            email: data.contactEmail || null,
                            phone: data.contactPhone || null,
                            industry: data.industry || null,
                            status: 'active',
                            website: data.website || null,
                            taxId: data.taxId || null,
                            billingAddress: data.billingAddress || null,
                            location: data.location || null,
                            employeeCount: data.employeeCount || null,
                            annualRevenue: data.annualRevenue ? parseFloat(data.annualRevenue) : 0,
                            country: data.country || null
                        }
                    });
                } else {
                    await Client.update({
                        where: { id: client.id },
                        data: {
                            name: data.contactName !== undefined ? data.contactName : undefined,
                            phone: data.contactPhone !== undefined ? data.contactPhone : undefined,
                            industry: data.industry !== undefined ? data.industry : undefined,
                            location: data.location !== undefined ? data.location : undefined,
                            website: data.website !== undefined ? data.website : undefined,
                            taxId: data.taxId !== undefined ? data.taxId : undefined,
                            billingAddress: data.billingAddress !== undefined ? data.billingAddress : undefined,
                            employeeCount: data.employeeCount !== undefined ? data.employeeCount : undefined,
                            annualRevenue: data.annualRevenue !== undefined ? parseFloat(data.annualRevenue) : undefined,
                            country: data.country !== undefined ? data.country : undefined,
                        }
                    });
                }
                data.clientId = client.id;
            }
        }
        delete data.contactName;
        delete data.contactEmail;
        delete data.contactPhone;
        delete data.companyName;
        delete data.industry;
        delete data.location;
        delete data.website;
        delete data.taxId;
        if (data.clientId) {
            data.client = { connect: { id: data.clientId } };
            delete data.clientId;
        }
        if (data.leadId) {
            data.lead = { connect: { id: data.leadId } };
            delete data.leadId;
        }
        if (data.ownerId) {
            data.owner = { connect: { id: data.ownerId } };
            delete data.ownerId;
        }

        const deal = await prisma.deal.update({ where: { id }, data });

        const activitiesToCreate = [];
        if (data.value !== undefined && oldDeal.value !== data.value) {
            activitiesToCreate.push({
                type: 'note',
                dealId: deal.id,
                notes: `Deal value updated from $${oldDeal.value || 0} to $${data.value || 0}`,
                ownerId: deal.ownerId
            });
        }
        if (data.stage !== undefined && oldDeal.stage !== data.stage) {
            activitiesToCreate.push({
                type: 'note',
                dealId: deal.id,
                notes: `Deal stage changed from ${oldDeal.stage} to ${data.stage}`,
                ownerId: deal.ownerId
            });
        }
        
        if (activitiesToCreate.length > 0) {
            try {
                for (const act of activitiesToCreate) {
                    await prisma.salesActivity.create({
                        data: {
                            type: act.type,
                            notes: act.notes,
                            deal: { connect: { id: act.dealId } },
                            owner: act.ownerId ? { connect: { id: act.ownerId } } : undefined
                        }
                    });
                }
            } catch (actErr) {
                console.error('Failed to create sales activity for deal update', actErr);
            }
        }

        if (notes) {
            await prisma.salesActivity.create({ data: {
                type: 'note',
                deal: { connect: { id: deal.id } },
                relatedClient: deal.clientId ? { connect: { id: deal.clientId } } : undefined,
                notes: notes,
                owner: deal.ownerId ? { connect: { id: deal.ownerId } } : undefined
            } });
        }

        if (followUpDate) {
            let combinedDate = followUpDate;
            if (followUpTime) combinedDate += 'T' + followUpTime;
            await prisma.salesTask.create({
                data: {
                    description: `Follow up on deal: ${deal.title}`,
                    dueDate: new Date(combinedDate),
                    assignedTo: deal.ownerId,
                    deal: { connect: { id: deal.id } },
                }
            });
        }

        const settings = await prisma.settings.findFirst();
        
        deal.probability = CrmCalculationService.calculateWinProbability(deal.stage, deal.engagementScore, settings?.salesConfig?.opportunityStages);
        
        await prisma.deal.update({ where: { id: deal.id }, data: { probability: deal.probability } });

        let message = 'Deal updated successfully';
        if (data.stage === 'ClosedWon' && oldDeal.stage !== 'ClosedWon' && !deal.projectId) {
            message = 'Deal marked as Closed Won. You can now convert it to a project.';
        }

        return { deal, message };
    }

    static async deleteDeal(id) {
        await prisma.salesActivity.deleteMany({ where: { dealId: id } });
        await prisma.salesTask.deleteMany({ where: { dealId: id } });
        const deal = await prisma.deal.delete({ where: { id } });
        if (!deal) throw new Error('Deal not found');
        return deal;
    }

    static async deleteMultipleDeals(ids: string[]) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        await prisma.salesActivity.deleteMany({ where: { dealId: { in: ids } } });
        await prisma.salesTask.deleteMany({ where: { dealId: { in: ids } } });
        const result = await prisma.deal.deleteMany({ where: { id: { in: ids } } });
        return { count: result.count };
    }

    static async updateMultipleDealsStage(ids: string[], stage: string) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        const result = await prisma.deal.updateMany({
            where: { id: { in: ids } },
            data: { stage }
        });
        return { count: result.count };
    }


    static async importDeals(dealsData, userId) {
        let count = 0;
        for (const deal of dealsData) {
            await prisma.deal.create({
                data: {
                    title: deal.title || deal.name || 'Unknown Deal',
                    source: deal.source || 'outbound',
                    stage: deal.stage || 'kickoff',
                    value: deal.value ? parseFloat(deal.value) : 0,
                    ownerId: userId
                }
            });
            count++;
        }
        return count;
    }

    static async createProjectFromDeal(id, userId) {
        const Project = prisma.project;

        const deal = await prisma.deal.findUnique({ where: { id } });
        if (!deal) throw new Error('Deal not found');

        if (deal.projectId) {
            throw new Error('Project already exists for this deal');
        }

        const project = await Project.create({ data: {
            name: deal.title,
            description: `Project created from CRM Deal: ${deal.title}`,
            status: 'Proposed',
            budget: deal.value || 0,
            ownerId: userId,
            accountId: deal.clientId,
            memberIds: [userId],
            clientIds: [] 
        } });

        const updatedDeal = await prisma.deal.update({ where: { id }, data: { projectId: project.id } });

        return { project, deal: updatedDeal };
    }

    static async rankDeals() {
        const deals = await prisma.deal.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } }
        });

        for (const deal of deals) {
            const priorityScore = ((deal.value || 0) * (deal.probability || 0) * (deal.engagementScore || 1)) / 10000;
            await prisma.deal.update({
                where: { id: deal.id },
                data: { priorityScore }
            });
        }

        const updatedDeals = await prisma.deal.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } },
            orderBy: { priorityScore: 'desc' }
        });
        return updatedDeals;
    }

    static async determineNextBestAction(dealId) {
        const deal = await prisma.deal.findUnique({ where: { id: dealId } });
        if (!deal) return 'No action';

        const daysSinceUpdate = moment().diff(moment(deal.updatedAt), 'days');
        if (daysSinceUpdate > 7) return 'Follow up email';
        if (deal.stage === 'Proposal') return 'Schedule negotiation call';
        if (deal.stage === 'Qualified') return 'Send product demo link';
        return 'Monitor engagement';
    }
}
