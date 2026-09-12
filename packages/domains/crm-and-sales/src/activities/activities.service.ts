// @ts-nocheck
import { CrmCalculationService } from '../sales/crm-calculation.service';
import { EmailService } from '@workspace/backend-infra';
const emailService = EmailService;

import { prisma } from '@workspace/db';
import moment from 'moment';
import * as salesMath from '../utils/salesMath';
const bcrypt = require('bcryptjs');

export class ActivitiesService {
static async getActivities(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const SalesActivity = prisma.salesActivity;
        const activities = await SalesActivity.findMany({
            include: { 
                lead: { select: { name: true, company: true } },
                deal: { select: { title: true, value: true } },
                relatedClient: { select: { name: true, email: true } },
                owner: { select: { name: true } }
            },
            orderBy: { timestamp: 'desc' },
            skip: skip,
            take: limit
        });

        const mappedActivities = activities.map(act => ({
            ...act,
            relatedLead: act.lead,
            relatedDeal: act.deal,
            relatedAccount: act.relatedClient,
        }));

        const total = await SalesActivity.count();
        return { activities: mappedActivities, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

static async createActivity(data, userId) {
        const SalesActivity = prisma.salesActivity;
        
        const createData = { ...data };
        if (createData.relatedLead) {
            createData.leadId = createData.relatedLead;
            delete createData.relatedLead;
        }
        if (createData.relatedDeal) {
            createData.dealId = createData.relatedDeal;
            delete createData.relatedDeal;
        }
        if (createData.relatedAccount) {
            createData.relatedClientId = createData.relatedAccount;
            delete createData.relatedAccount;
        }

        const activity = await SalesActivity.create({ data: {
            ...createData,
            ownerId: userId
        } });

        const populatedActivity = await SalesActivity.findUnique({ 
            where: { id: activity.id },
            include: { 
                lead: { select: { name: true, company: true } },
                deal: { select: { title: true, value: true } },
                relatedClient: { select: { name: true, email: true } },
                owner: { select: { name: true } }
            }
        });

        return {
            ...populatedActivity,
            relatedLead: populatedActivity?.lead,
            relatedDeal: populatedActivity?.deal,
            relatedAccount: populatedActivity?.relatedClient,
        };
    }

    static async reviewActivity(id: string, status: string, reviewComment: string, reviewerId: string) {
        const SalesActivity = prisma.salesActivity;
        const updatedActivity = await SalesActivity.update({
            where: { id },
            data: {
                status,
                reviewComment,
                reviewedById: reviewerId,
                reviewedAt: new Date()
            },
            include: {
                owner: { select: { name: true, email: true } },
                lead: { select: { name: true } },
                deal: { select: { title: true } },
                relatedClient: { select: { name: true } }
            }
        });
        return updatedActivity;
    }

    static async getSalesActivityFeed(companyId?: string) {
        try {
            const whereClause = companyId ? { companyId } : {};
            
            const [salesActs, recentDeals, recentLeads, recentClients] = await Promise.all([
                prisma.salesActivity.findMany({
                    where: whereClause,
                    take: 30,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        lead: true,
                        deal: { include: { lead: true, client: true } },
                        owner: { select: { id: true, name: true, email: true, role: true, photoUrl: true, image: true } },
                        relatedClient: true
                    }
                }).catch(() => []),
                prisma.deal.findMany({
                    where: whereClause,
                    take: 15,
                    orderBy: { updatedAt: 'desc' },
                    include: {
                        lead: true,
                        client: true,
                        owner: { select: { id: true, name: true, email: true, photoUrl: true } }
                    }
                }).catch(() => []),
                prisma.lead.findMany({
                    where: whereClause,
                    take: 15,
                    orderBy: { updatedAt: 'desc' },
                    include: {
                        assignedSalesRep: { select: { id: true, name: true, email: true, photoUrl: true } }
                    }
                }).catch(() => []),
                prisma.client.findMany({
                    where: { phone: { not: null } },
                    take: 300
                }).catch(() => [])
            ]);

            // Build client lookup maps
            const clientByPhone = new Map<string, any>();
            const clientByEmail = new Map<string, any>();
            recentClients.forEach((c: any) => {
                if (c.phone) {
                    const digits = c.phone.replace(/\D/g, '');
                    if (digits.length >= 7) clientByPhone.set(digits.slice(-10), c);
                    clientByPhone.set(c.phone.trim(), c);
                }
                if (c.email) {
                    clientByEmail.set(c.email.trim().toLowerCase(), c);
                }
            });

            const resolveClient = (phone?: string | null, email?: string | null, fallbackObj?: any) => {
                if (phone) {
                    const digits = phone.replace(/\D/g, '');
                    const matched = (digits.length >= 7 ? clientByPhone.get(digits.slice(-10)) : null) || clientByPhone.get(phone.trim());
                    if (matched && matched.name && matched.name !== 'Unknown Company') return matched.name;
                }
                if (email) {
                    const matched = clientByEmail.get(email.trim().toLowerCase());
                    if (matched && matched.name && matched.name !== 'Unknown Company') return matched.name;
                }
                if (fallbackObj?.name && fallbackObj.name !== 'Unknown Company' && fallbackObj.name !== 'Unknown') return fallbackObj.name;
                if (fallbackObj?.contactPersonName) return fallbackObj.contactPersonName;
                if (fallbackObj?.companyName && fallbackObj.companyName !== 'Unknown Company') return fallbackObj.companyName;
                if (fallbackObj?.company && fallbackObj.company !== 'Unknown Company') return fallbackObj.company;
                return null;
            };

            const STAGE_LABELS: Record<string, string> = {
                'ContractPending': 'Contract Review',
                'ContractSigned': 'Contract Signed',
                'InDelivery': 'In Delivery',
                'Invoiced': 'Invoiced',
                'ClosedPaid': 'Paid & Settled',
                'Qualified': 'Qualified Lead',
                'Demo': 'Demo / Meeting',
                'Lead': 'New Lead',
                'new': 'New Inquiry',
                'Proposal': 'Proposal Sent',
                'Negotiation': 'Negotiation',
                'converted': 'Converted',
                'ClosedWon': 'Won'
            };

            const activities: any[] = [];
            const seenKeys = new Set<string>();

            // 1. Process explicit SalesActivities logged
            for (const act of salesActs) {
                const lead = act.lead;
                const deal = act.deal;
                const client = act.relatedClient;
                const notes = act.notes || '';
                const ownerName = act.owner?.name || 'Sales Team';
                const ownerAvatar = act.owner?.photoUrl || act.owner?.image || null;

                const phone = lead?.phone || deal?.lead?.phone || client?.phone;
                const email = lead?.email || deal?.lead?.email || client?.email;
                const clientName = resolveClient(phone, email, client || lead) || 'Client';

                let action = 'Logged milestone note';
                let type = act.type || 'note';
                let stage = deal?.stage || lead?.status || 'Lead';
                let dealTitle = deal?.title ? deal.title.replace(/^Deal\s*-\s*/i, '') : (lead?.name || 'Client Engagement');
                let value = deal?.value || lead?.value || null;

                if (notes.includes('Deal stage changed')) {
                    const toMatch = notes.match(/to\s+(\w+)/);
                    const targetStage = toMatch ? toMatch[1] : 'ContractSigned';
                    stage = targetStage;
                    type = 'stage_change';
                    action = `Moved deal to ${STAGE_LABELS[targetStage] || targetStage}`;
                } else if (notes.includes('Converted lead into account')) {
                    action = 'Won & converted lead to active deal';
                    type = 'conversion';
                    stage = deal?.stage || 'ContractSigned';
                } else if (notes.includes('New lead created')) {
                    action = 'Captured new prospective client inquiry';
                    type = 'lead_created';
                    stage = lead?.status || 'Lead';
                    dealTitle = lead?.name || notes.replace(/New lead created:\s*/i, '').split(' from ')[0];
                } else if (notes.trim()) {
                    action = notes.length > 60 ? notes.slice(0, 57) + '...' : notes;
                }

                const dedupeKey = `${type}_${dealTitle}_${stage}_${new Date(act.createdAt).toISOString().slice(0, 13)}`;
                if (!seenKeys.has(dedupeKey)) {
                    seenKeys.add(dedupeKey);
                    activities.push({
                        id: act.id,
                        actor: ownerName,
                        actorAvatar: ownerAvatar,
                        action,
                        target: dealTitle,
                        client: clientName,
                        value: value ? Number(value) : null,
                        stage,
                        stageLabel: STAGE_LABELS[stage] || stage,
                        type,
                        time: act.createdAt
                    });
                }
            }

            // 2. Add deal events if not already present
            for (const deal of recentDeals) {
                const dealTitle = deal.title ? deal.title.replace(/^Deal\s*-\s*/i, '') : 'Active Deal';
                const stage = deal.stage || 'ContractPending';
                const dedupeKey = `deal_${deal.id}_${stage}`;
                
                if (!seenKeys.has(dedupeKey)) {
                    seenKeys.add(dedupeKey);
                    const clientName = resolveClient(deal.lead?.phone || deal.client?.phone, deal.lead?.email || deal.client?.email, deal.client || deal.lead) || 'Client';
                    const ownerName = deal.owner?.name || 'Simplicion';
                    
                    let action = `In execution: ${STAGE_LABELS[stage] || stage}`;
                    if (stage === 'ContractSigned') action = 'Secured signed client agreement';
                    else if (stage === 'InDelivery') action = 'Progressed project to fulfillment';
                    else if (stage === 'Invoiced') action = 'Issued delivery milestone invoice';
                    else if (stage === 'ClosedPaid') action = 'Payment confirmed & deal closed';

                    activities.push({
                        id: 'deal_' + deal.id,
                        actor: ownerName,
                        actorAvatar: deal.owner?.photoUrl || null,
                        action,
                        target: dealTitle,
                        client: clientName,
                        value: deal.value ? Number(deal.value) : null,
                        stage,
                        stageLabel: STAGE_LABELS[stage] || stage,
                        type: 'deal',
                        time: deal.updatedAt
                    });
                }
            }

            // 3. Add lead events if not already present
            for (const lead of recentLeads) {
                const leadTitle = lead.name || 'Sales Inquiry';
                const status = lead.status || lead.stage || 'new';
                const dedupeKey = `lead_${lead.id}_${status}`;

                if (!seenKeys.has(dedupeKey)) {
                    seenKeys.add(dedupeKey);
                    const clientName = resolveClient(lead.phone, lead.email, lead) || lead.contactName || lead.company || 'Client';
                    const ownerName = lead.assignedSalesRep?.name || 'Sales Team';

                    let action = 'New inbound lead inquiry';
                    if (status === 'Qualified') action = 'Qualified requirements & budget';
                    else if (status === 'Demo') action = 'Scheduled product demo & discovery';
                    else if (status === 'Proposal') action = 'Shared commercial proposal';
                    else if (status === 'converted' || status === 'ClosedWon') action = 'Successfully converted to deal';

                    activities.push({
                        id: 'lead_' + lead.id,
                        actor: ownerName,
                        actorAvatar: lead.assignedSalesRep?.photoUrl || null,
                        action,
                        target: leadTitle,
                        client: clientName,
                        value: lead.value || lead.estimatedValue ? Number(lead.value || lead.estimatedValue) : null,
                        stage: status,
                        stageLabel: STAGE_LABELS[status] || status,
                        type: 'lead',
                        time: lead.updatedAt
                    });
                }
            }

            // Sort by latest timestamp first and limit to 20
            return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);
        } catch (error) {
            console.error('Error in getSalesActivityFeed:', error);
            return [];
        }
    }

}
