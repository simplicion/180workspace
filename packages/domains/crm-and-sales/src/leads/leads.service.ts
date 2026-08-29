// @ts-nocheck
import { CrmCalculationService } from '../sales/crm-calculation.service';
import { EmailService } from '@workspace/backend-infra';
const emailService = EmailService;

import { prisma } from '@workspace/db';
import moment from 'moment';
import * as salesMath from '../utils/salesMath';
import { SalesRuleEngineService as SalesRuleEngine } from '../sales/sales-rule-engine.service';
const bcrypt = require('bcryptjs');

export class LeadsService {
static async getLeads(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        
        const leads = await prisma.lead.findMany({
            include: { assignedSalesRep: { select: { name: true, email: true } } },
            orderBy: { leadScore: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await prisma.lead.count();
        return { leads, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createLead(data, userId) {
        const leadData = {
            name: data.name || data.contactName || data.title || 'Unknown Lead',
            email: data.email || data.contactEmail || null,
            phone: data.phone || data.contactPhone || null,
            company: data.company || data.companyName || null,
            companyName: data.companyName || data.company || null,
            industry: data.industry || null,
            companySize: data.companySize || data.employeeCount ? parseInt(data.companySize || data.employeeCount) : null,
            source: data.source || null,
            status: data.status || data.stage || 'new',
            value: data.value ? parseFloat(data.value) : 0,
            engagementScore: data.engagementScore || 50,
            assignedSalesRepId: data.owner || data.ownerId || data.assignedSalesRepId || userId,
            notes: data.notes || null,
            followUpDate: data.followUpDate ? new Date(data.followUpDate) : null
        };
        const lead = await prisma.lead.create({ data: leadData });

        let existingClient = null;
        if (data.clientId) {
            existingClient = await prisma.client.findUnique({ where: { id: data.clientId } });
        } else if (leadData.phone || leadData.email) {
            existingClient = await prisma.client.findFirst({
                where: {
                    OR: [
                        ...(leadData.phone ? [{ phone: leadData.phone }] : []),
                        ...(leadData.email ? [{ email: leadData.email }] : [])
                    ]
                }
            });
        }

        if (!existingClient) {
            await prisma.client.create({
                data: {
                    name: leadData.name,
                    email: leadData.email,
                    phone: leadData.phone,
                    companyName: leadData.company,
                    industry: leadData.industry,
                    employeeCount: leadData.companySize ? leadData.companySize.toString() : null,
                    assignedManager: leadData.assignedSalesRepId,
                    status: 'Active',
                    leadSource: leadData.source
                }
            });
        }

        await prisma.salesActivity.create({ data: {
            type: 'note',
            leadId: lead.id,
            notes: `New lead created: ${lead.name} from ${lead.company}`,
            ownerId: userId
        } });

        const settings = await prisma.settings.findFirst();
        
        const newScore = CrmCalculationService.scoreLead(lead, settings?.salesConfig?.leadScoring);
        await prisma.lead.update({ where: { id: lead.id }, data: { leadScore: newScore } });

        
        await SalesRuleEngine.onLeadCreated(lead.id);

        try {
            
            await triggerN8nWebhook('new-lead', {
                leadId: lead.id,
                name: lead.name,
                company: lead.company,
                assignedSalesRep: lead.assignedSalesRep
            });
        } catch (err) {}

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
        if (updateData.companySize !== undefined || updateData.employeeCount !== undefined) sanitizedData.companySize = parseInt(updateData.companySize || updateData.employeeCount);
        if (updateData.source !== undefined) sanitizedData.source = updateData.source;
        if (updateData.status !== undefined || updateData.stage !== undefined) sanitizedData.status = updateData.status || updateData.stage;
        if (updateData.value !== undefined) sanitizedData.value = parseFloat(updateData.value);
        if (updateData.engagementScore !== undefined) sanitizedData.engagementScore = updateData.engagementScore;
        if (updateData.owner || updateData.ownerId || updateData.assignedSalesRepId) sanitizedData.assignedSalesRepId = updateData.owner || updateData.ownerId || updateData.assignedSalesRepId;
        if (updateData.notes !== undefined) sanitizedData.notes = updateData.notes;
        if (updateData.followUpDate !== undefined) sanitizedData.followUpDate = updateData.followUpDate ? new Date(updateData.followUpDate) : null;

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
            const settings = await prisma.settings.findFirst();
            await this.calculateLeadScore(updatedLead, settings);
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

static async importLeads(leads, userId) {
        if (!Array.isArray(leads) || leads.length === 0) {
            throw new Error('No leads provided');
        }

        const newLeads = leads.map(l => ({
            ...l,
            assignedSalesRep: l.assignedSalesRep || userId,
        }));

        const inserted = await prisma.lead.createMany({ data: newLeads });
        const settings = await prisma.settings.findFirst();
        
        

        // Note: Using findMany to get the inserted leads for scoring/triggers would be better, 
        // but skipping for now to match old behavior exactly.
        
        return inserted.length;
    }

static async convertLead(id: string, userId: string) {
        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) throw new Error('Lead not found');
        if (lead.status === 'converted') throw new Error('This lead has already been converted.');

        // Use interactive transaction
        return await prisma.$transaction(async (prisma) => {
            const companyName = lead.company || lead.companyName || 'Unknown Company';
            
            let account = await prisma.client.findFirst({ where: { companyName: { equals: companyName.trim(), mode: 'insensitive' } } });
            
            if (!account) {
                account = await prisma.client.create({ data: {
                    companyName: companyName.trim(),
                    name: companyName.trim(),
                    industry: lead.industry,
                    employeeCount: lead.companySize ? String(lead.companySize) : undefined,
                    assignedManager: userId
                } });
            }

            let contact = await prisma.client.findFirst({ where: { 
                companyName: { equals: companyName.trim(), mode: 'insensitive' },
                OR: [
                    { email: lead.email || undefined },
                    { name: lead.name }
                ].filter(c => c.email !== undefined || (c as any).name !== undefined)
            } });

            if (!contact) {
                contact = await prisma.client.create({ data: {
                    companyName: account.companyName,
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone
                } });
            }

            const opp = await prisma.deal.create({ data: {
                title: `Deal with ${companyName}`,
                clientId: account.id,
                leadId: lead.id,
                value: lead.value || 0,
                stage: 'Qualified',
                ownerId: userId,
                priorityScore: (lead.leadScore || 0)
            } });

            await prisma.lead.update({ where: { id: lead.id }, data: { status: 'converted' } });

            await prisma.salesActivity.create({ data: {
                type: 'task',
                leadId: lead.id,
                relatedClientId: account.id,
                dealId: opp.id,
                notes: `Converted lead into account and opportunity: ${opp.title}`,
                ownerId: userId
            } });

            return { account, contact, opportunity: opp };
        });
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
