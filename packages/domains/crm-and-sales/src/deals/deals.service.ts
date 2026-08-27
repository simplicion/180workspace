// @ts-nocheck
import { CrmCalculationService } from '../sales/crm-calculation.service';
import { EmailService } from '@workspace/backend-infra';
const emailService = EmailService;

import { prisma } from '@workspace/db';
import moment from 'moment';

export class DealsService {
    static async getDeals(page = 1, limit = 100, pipelineType) {
        const skip = (page - 1) * limit;
        
        const whereClause = {};
        if (pipelineType) {
            whereClause.pipelineType = pipelineType;
        }

        const deals = await prisma.deal.findMany({ 
            where: whereClause,
            include: { owner: { select: { name: true, email: true } }, client: true }, 
            orderBy: { priorityScore: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await prisma.deal.count({ where: whereClause });
        return { deals, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createDeal(data, userId) {
        
        const followUpDate = data.followUpDate;
        const followUpTime = data.followUpTime;
        const notes = data.notes;
        
        delete data.followUpDate;
        delete data.followUpTime;
        delete data.notes;

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
                        clientType: data.clientType || 'Lead',
                        status: 'active',
                        website: data.website || null,
                        taxId: data.taxId || null,
                        billingAddress: data.billingAddress || null,
                        location: data.location || null,
                        employeeCount: data.employeeCount || null,
                        annualRevenue: data.annualRevenue ? parseFloat(data.annualRevenue) : 0,
                        customIndustry: data.customIndustry || null,
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
        delete data.clientType;
        delete data.website;
        delete data.taxId;
        delete data.billingAddress;
        delete data.location;
        delete data.employeeCount;
        delete data.annualRevenue;
        delete data.customIndustry;
        delete data.country;
        delete data.currency;
        delete data.name; // ensure 'name' isn't accidentally passed into Deal model which only has 'title'
        
        const deal = await prisma.deal.create({ data: { ...data } });

        if (notes) {
            await prisma.salesActivity.create({ data: {
                type: 'note',
                dealId: deal.id,
                relatedClientId: deal.clientId,
                notes: notes,
                ownerId: userId
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
                    dealId: deal.id,
                }
            });
        }

        await prisma.salesActivity.create({ data: {
            type: 'task',
            dealId: deal.id,
            relatedClientId: deal.clientId,
            notes: `New deal created: ${deal.title}`,
            ownerId: userId
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
        
        delete data.followUpDate;
        delete data.followUpTime;
        delete data.notes;

        if (data.expectedCloseDate) {
            data.expectedCloseDate = new Date(data.expectedCloseDate).toISOString();
        }

        if (data.contactName !== undefined || data.contactEmail !== undefined || data.contactPhone !== undefined || data.companyName !== undefined || data.industry !== undefined || data.location !== undefined || data.clientType !== undefined || data.website !== undefined || data.taxId !== undefined || data.billingAddress !== undefined || data.employeeCount !== undefined || data.annualRevenue !== undefined || data.customIndustry !== undefined || data.country !== undefined) {
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
                        clientType: data.clientType !== undefined ? data.clientType : undefined,
                        website: data.website !== undefined ? data.website : undefined,
                        taxId: data.taxId !== undefined ? data.taxId : undefined,
                        billingAddress: data.billingAddress !== undefined ? data.billingAddress : undefined,
                        employeeCount: data.employeeCount !== undefined ? data.employeeCount : undefined,
                        annualRevenue: data.annualRevenue !== undefined ? parseFloat(data.annualRevenue) : undefined,
                        customIndustry: data.customIndustry !== undefined ? data.customIndustry : undefined,
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
                            clientType: data.clientType || 'Lead',
                            status: 'active',
                            website: data.website || null,
                            taxId: data.taxId || null,
                            billingAddress: data.billingAddress || null,
                            location: data.location || null,
                            employeeCount: data.employeeCount || null,
                            annualRevenue: data.annualRevenue ? parseFloat(data.annualRevenue) : 0,
                            customIndustry: data.customIndustry || null,
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
                            clientType: data.clientType !== undefined ? data.clientType : undefined,
                            website: data.website !== undefined ? data.website : undefined,
                            taxId: data.taxId !== undefined ? data.taxId : undefined,
                            billingAddress: data.billingAddress !== undefined ? data.billingAddress : undefined,
                            employeeCount: data.employeeCount !== undefined ? data.employeeCount : undefined,
                            annualRevenue: data.annualRevenue !== undefined ? parseFloat(data.annualRevenue) : undefined,
                            customIndustry: data.customIndustry !== undefined ? data.customIndustry : undefined,
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
        delete data.clientType;
        delete data.website;
        delete data.taxId;
        delete data.billingAddress;
        delete data.employeeCount;
        delete data.annualRevenue;
        delete data.customIndustry;
        delete data.country;
        delete data.currency;
        delete data.name; // Ensure name is deleted

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
                await prisma.salesActivity.createMany({ data: activitiesToCreate });
            } catch (actErr) {
                console.error('Failed to create sales activity for deal update', actErr);
            }
        }

        if (notes) {
            await prisma.salesActivity.create({ data: {
                type: 'note',
                dealId: deal.id,
                relatedClientId: deal.clientId,
                notes: notes,
                ownerId: deal.ownerId
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
                    dealId: deal.id,
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
