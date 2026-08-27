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

}
