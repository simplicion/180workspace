// @ts-nocheck
import { prisma } from '@workspace/db';

import { AnalyticsService } from '../analytics/analytics.service';
import axios from 'axios';

export class SalesRuleEngineService {
    /**
     * Triggered when a new lead is created
     */
    static async onLeadCreated(leadId) {
        if (!prisma.deal || !prisma.salesTask) return;

        const lead = await prisma.deal.findUnique({ where: { id: leadId } });
        if (!lead || !lead.assignedSalesRep) return;

        // Rule 0: Auto-create a call task for new assigned leads
        await prisma.salesTask.create({
            data: {
                title: `Initial Call with Lead: ${lead.name}`,
                description: `Automated rule: Reach out to new lead ${lead.name} from ${lead.company}.`,
                dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Due in 1 day
                relatedLeadId: lead.id,
                assignedToId: lead.assignedSalesRep,
                status: 'pending'
            }
        });
    }

    /**
     * Triggered when an opportunity stage changes.
     */
    static async onOpportunityStageChange(opportunityId, newStage, ownerId) {
        if (!prisma.deal || !prisma.salesTask) return;

        const opp = await prisma.deal.findUnique({ where: { id: opportunityId } });
        if (!opp) return;

        // Rule 1: If moved to Proposal, auto-schedule a follow-up task
        if (newStage === 'Proposal') {
            await prisma.salesTask.create({
                data: {
                    title: `Follow up on Proposal for ${opp.title}`,
                    description: 'Automatically created task. Please check if the client has reviewed the proposal.',
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                    relatedDealId: opp.id,
                    assignedToId: ownerId,
                    status: 'pending'
                }
            });

            // Trigger internal system notification
            await triggerAutomation({
                eventType: 'sales_proposal_sent',
                triggeredBy: ownerId,
                targetUser: ownerId,
                relatedItem: { itemId: opp.id, itemModel: 'Opportunity' },
                description: 'Proposal stage reached. Follow-up task scheduled.'
            }, companyPrisma);

            // External Trigger (n8n Webhook)
            await triggerN8nWebhook('sales-proposal-update', { opportunityId, stage: newStage });
        }

        // Rule 2: If ClosedWon, trigger onboarding or account handover
        if (newStage === 'ClosedWon') {
            await triggerAutomation({
                eventType: 'deal_closed_won',
                triggeredBy: ownerId,
                relatedItem: { itemId: opp.id, itemModel: 'Opportunity' },
                description: `Deal ${opp.title} was won!`
            }, companyPrisma);
            await triggerN8nWebhook('deal-closed-won', { opportunityId, value: opp.value });
        }
    }

    /**
     * Triggered on daily cron to catch stale pipelines
     */
    static async runDailyStagnationCheck() {
        if (!prisma.deal) return;
        
        // Find stagnant opportunities (> 7 days) to catch the risk early
        const stagnantOppIds = await AnalyticsService.detectStagnantOpportunities(companyPrisma, 7);

        if (stagnantOppIds.length > 0) {
            const opps = await prisma.deal.findMany({ where: { id: { in: stagnantOppIds } } });

            for (let opp of opps) {
                const lastActivityDate = opp.lastActivityDate || opp.updatedAt;
                const daysStagnant = (Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24);

                // Rule X: Late Follow-up Warning (> 10 days)
                if (daysStagnant >= 10 && opp.stage !== 'ClosedWon' && opp.stage !== 'ClosedLost') {
                    await triggerAutomation({
                        eventType: 'deal_stagnated',
                        triggeredBy: null, // System
                        targetUser: opp.owner,
                        relatedItem: { itemId: opp.id, itemModel: 'Opportunity' },
                        description: `Deal ${opp.title} has been stagnant for over 10 days. Needs follow-up.`
                    }, companyPrisma);
                }

                // Rule Y: Deal Value vs Engagement Risk Warning
                if (opp.value >= 10000 && daysStagnant >= 7 && opp.stage !== 'ClosedWon' && opp.stage !== 'ClosedLost') {
                    await triggerAutomation({
                        eventType: 'high_value_deal_at_risk',
                        triggeredBy: null, // System
                        targetUser: opp.owner,
                        relatedItem: { itemId: opp.id, itemModel: 'Opportunity' },
                        description: `Risk Alert: High value deal ${opp.title} ($${opp.value}) is dormant for ${Math.floor(daysStagnant)} days.`
                    }, companyPrisma);
                }
            }
        }
    }

    /**
     * Triggered by email webhooks (SendGrid/Mailgun)
     */
    static async handleEmailEngagementEvent(emailLogId, eventType) {
        if (!prisma.emailLog || !prisma.deal || !prisma.salesTask) return;

        const log = await prisma.emailLog.findUnique({ where: { id: emailLogId } });
        if (!log || !log.leadId) return;

        const lead = await prisma.deal.findUnique({ where: { id: log.leadId } });
        if (!lead) return;

        // Update Engagement Score algorithmically
        // Open = +1, Click = +2, Reply = +5
        let increment = 0;
        if (eventType === 'open') increment = 1;
        if (eventType === 'click') increment = 2;
        if (eventType === 'reply') increment = 5;

        const newScore = (lead.engagementScore || 0) + increment;

        await prisma.deal.update({
            where: { id: lead.id },
            data: { engagementScore: newScore }
        });

        // Rule 4: High engagement but no booked meeting -> Suggest Call
        if (eventType === 'reply' || newScore >= 10) {
            const existingTask = await prisma.salesTask.findFirst({ 
                where: { relatedLeadId: lead.id, status: 'pending' } 
            });

            if (!existingTask && lead.assignedSalesRep) {
                await prisma.salesTask.create({
                    data: {
                        title: `Call ${lead.name} due to high email engagement`,
                        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
                        relatedLeadId: lead.id,
                        assignedToId: lead.assignedSalesRep,
                        status: 'pending'
                    }
                });
            }
        }
    }
}







