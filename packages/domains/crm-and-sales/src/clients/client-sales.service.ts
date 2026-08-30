// @ts-nocheck
import { CrmCalculationService } from '../sales/crm-calculation.service';
import { EmailService } from '@workspace/backend-infra';
const emailService = EmailService;

import { prisma } from '@workspace/db';
import moment from 'moment';
import * as salesMath from '../utils/salesMath';
const bcrypt = require('bcryptjs');

export class ClientSalesService {
static async getAccounts(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Account = prisma.client;
        const accountsRaw = await Account.findMany({
            orderBy: { clv: 'desc' },
            skip: skip,
            take: limit
        });

        const Contact = prisma.client;
        const moment = require('moment');
        

        const accounts = await Promise.all(accountsRaw.map(async acc => {
            const [lostDeals, staleContacts] = await Promise.all([
                prisma.deal.count({ where: { clientId: acc.id, stage: 'ClosedLost' } }),
                Contact.count({ where: {
                    clientId: acc.id,
                    lastContacted: { lt: moment().subtract(60, 'days').toDate() }
                } })
            ]);

            const riskIndex = CrmCalculationService.calculateCustomerRiskIndex(lostDeals, staleContacts);
            let healthStatus = 'Healthy';
            if (riskIndex > 60) healthStatus = 'At Risk';
            if (riskIndex > 90) healthStatus = 'Churned';

            return { ...acc, riskIndex, healthStatus };
        }));

        const total = await Account.count();
        return { accounts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

static async createAccount(data, userId) {
        const Account = prisma.client;
        const account = await Account.create({ data: {
            ...data,
            assignedManager: userId
        } });
        return account;
    }

static async updateAccount(id, data) {
        const Account = prisma.client;
        const account = await Account.update({ where: { id }, data });
        if (!account) throw new Error('Account not found');
        return account;
    }

static async deleteAccount(id) {
        const Account = prisma.client;
        const account = await Account.delete({ where: { id } });
        if (!account) throw new Error('Account not found');
        return account;
    }

static async getContacts(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Contact = prisma.client;
        const contacts = await Contact.findMany({
            skip: skip,
            take: limit
        });

        const total = await Contact.count();
        return { contacts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

static async getContact(id) {
        const Contact = prisma.client;
        const contact = await Contact.findUnique({ 
            where: { id }
        });

        if (!contact) throw new Error('Contact not found');

        const opportunities = await prisma.deal.findMany({
            where: { clientId: contact.clientId || contact.id },
            select: { title: true, value: true, stage: true, probability: true, expectedCloseDate: true }
        });

        const SalesActivity = prisma.salesActivity;
        const activities = await SalesActivity.findMany({
            where: {
                relatedClientId: contact.id
            },
            include: { owner: { select: { name: true } } },
            orderBy: { timestamp: 'desc' },
            take: 20
        });

        return { contact, opportunities, activities };
    }

static async createContact(data) {
        const Contact = prisma.client;

        if (data.email) {
            const existingByEmail = await Contact.findFirst({ where: { email: data.email.trim().toLowerCase() } });
            if (existingByEmail) {
                const err = new Error('A contact with this email already exists.');
                err.status = 400;
                err.duplicateId = existingByEmail.id;
                throw err;
            }
        }

        if (data.clientId && data.name) {
            const existingByName = await Contact.findFirst({ where: {
                clientId: data.clientId,
                name: { equals: data.name.trim(), mode: 'insensitive' }
            } });
            if (existingByName) {
                const err = new Error('A contact with this name already exists in this account.');
                err.status = 400;
                err.duplicateId = existingByName.id;
                throw err;
            }
        }

        const contact = await Contact.create({ data });
        return contact;
    }

static async updateContact(id, data) {
        const Contact = prisma.client;
        const contact = await Contact.update({ where: { id }, data });
        if (!contact) throw new Error('Contact not found');
        return contact;
    }

static async deleteContact(id) {
        const Contact = prisma.client;
        const contact = await Contact.delete({ where: { id } });
        if (!contact) throw new Error('Contact not found');
        return contact;
    }

}
