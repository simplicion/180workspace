import bcrypt from 'bcryptjs';
// @ts-nocheck
import { prisma } from '@workspace/db';


export class ClientService {
  static async getClients(queryParams: any) {
    const { search, page = 1, limit = 50 } = queryParams;
    const query: any = {};

        if (search) {
            query.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where: query,
                skip,
                take,
                orderBy: { name: 'asc' }
            }),
            prisma.client.count({ where: query }),
        ]);

        const mappedClients = clients.map((c: any) => ({
            ...c,
            _id: c.id
        }));

        return { clients: mappedClients, total };
    }

  static async createClient(data: any, userId: string) {
    const createData = { ...data };
    
    if (createData.email && createData.email.trim() !== '') {
      const existingClient = await prisma.client.findFirst({ where: { email: createData.email } });
            if (existingClient) {
                throw new Error('A client with this email already exists.');
            }
        }

        if (!createData.clientId) {
            const count = await prisma.client.count();
            createData.clientId = `CLT-${String(count + 1).padStart(4, '0')}`;
        }
        
    if (createData.company !== undefined) {
      createData.companyName = createData.company;
      delete createData.company;
    }

        const givePortalAccess = createData.givePortalAccess === true || createData.givePortalAccess === 'true';
        const password = createData.password;
        
        delete createData.givePortalAccess;
        delete createData.password;
        delete createData.linkedin;

        if (typeof createData.annualRevenue === 'string') {
            createData.annualRevenue = createData.annualRevenue.trim() === '' ? null : parseFloat(createData.annualRevenue.replace(/,/g, ''));
        }

        if (createData.category && typeof createData.category === 'string' && createData.category.trim() !== '') {
            const catName = createData.category.trim();
            const catId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await prisma.$executeRawUnsafe(
                `INSERT INTO "ClientCategory" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("name") DO NOTHING`,
                catId,
                catName
            ).catch(() => {});
        }

        const client = await prisma.client.create({
            data: createData
        });

        return { client, givePortalAccess, password };
    }

  static async getCategories() {
    const defaultCategories = ['Enterprise', 'SMB', 'VIP Client', 'Retail', 'Wholesale', 'Partner', 'Government', 'Tech & Media', 'Healthcare'];
    
    let dbCategories: { name: string }[] = [];
    try {
      dbCategories = await prisma.$queryRawUnsafe(`SELECT name FROM "ClientCategory"`);
    } catch (e) {}

    let clientCategories: { category: string }[] = [];
    try {
      clientCategories = await prisma.client.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category']
      });
    } catch (e) {}

    const allCatNames = [
      ...defaultCategories,
      ...dbCategories.map((c: any) => c.name),
      ...clientCategories.map((c: any) => c.category).filter(Boolean)
    ];

    const uniqueSet = Array.from(new Set(allCatNames));
    return uniqueSet.sort((a, b) => a.localeCompare(b));
  }

  static async getClientById(id: string) {
    const client = await prisma.client.findFirst({
      where: { id }
    });
        if (!client) throw new Error('Client not found');

        const mappedClient = {
            ...client,
            _id: client.id,
            projectIds: [],
            projects: []
        };
        return mappedClient;
    }

  static async updateClient(id: string, data: any) {
    const existing = await prisma.client.findFirst({ where: { id } });
        if (!existing) throw new Error('Client not found');

        const updateData = { ...data };
        delete updateData.id;
        delete updateData._id;

        if (updateData.company !== undefined) {
            updateData.companyName = updateData.company;
            delete updateData.company;
        }

        if (updateData.email && updateData.email.trim() !== '') {
      const existingClient = await prisma.client.findFirst({ 
        where: { 
          email: updateData.email,
          id: { not: id }
        } 
      });
            if (existingClient) {
                throw new Error('A client with this email already exists.');
            }
        }

        if (typeof updateData.annualRevenue === 'string') {
            updateData.annualRevenue = updateData.annualRevenue.trim() === '' ? null : parseFloat(updateData.annualRevenue.replace(/,/g, ''));
        }

        if (updateData.category && typeof updateData.category === 'string' && updateData.category.trim() !== '') {
            const catName = updateData.category.trim();
            const catId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await prisma.$executeRawUnsafe(
                `INSERT INTO "ClientCategory" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("name") DO NOTHING`,
                catId,
                catName
            ).catch(() => {});
        }

        delete updateData.givePortalAccess;
        delete updateData.password;
        delete updateData.linkedin;

        const client = await prisma.client.update({
            where: { id },
            data: updateData
        });

        return client;
    }

  static async deleteClient(id: string) {
    const existing = await prisma.client.findFirst({ where: { id } });
        if (!existing) throw new Error('Client not found');

        await prisma.client.delete({
            where: { id }
        });
    }

  static async getCommunications(clientId: string) {
    const client = await prisma.client.findFirst({ where: { id: clientId } });
        if (!client) throw new Error('Client not found');

        const communications = await prisma.clientCommunication.findMany({
            where: { clientId },
            include: {
                loggedBy: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        return communications.map((c: any) => ({
            ...c,
            _id: c.id,
            loggedBy: { name: c.loggedByName || c.loggedBy?.name || 'System' }
        }));
    }

  static async createCommunication(clientId: string, data: any, user: any) {
    const client = await prisma.client.findFirst({ where: { id: clientId } });
        if (!client) throw new Error('Client not found');

        const { type, subject, summary, date } = data;

        if (!subject) throw new Error('Subject is required');

        const comm = await prisma.clientCommunication.create({
            data: {
                clientId,
                type: type || 'note',
                subject,
                summary: summary || '',
                date: date ? new Date(date) : new Date(),
                loggedById: user.id,
                loggedByName: user.name,
            }
        });

        return comm;
    }

  static async deleteCommunication(commId: string) {
    const comm = await prisma.clientCommunication.findUnique({
      where: { id: commId },
      include: { client: true }
    });
    if (!comm) throw new Error('Communication not found');

        await prisma.clientCommunication.delete({
            where: { id: commId }
        });
    }

  static async getActivity(clientId: string) {
    const client = await prisma.client.findFirst({ where: { id: clientId } });
        if (!client) throw new Error('Client not found');

        const logs = await prisma.auditLog.findMany({
            where: { resourceId: clientId },
            include: {
                user: {
                    select: { name: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return logs.map((log: any) => ({
            id: log.id,
            action: log.action,
            content: this.formatActivityContent(log),
            date: log.createdAt,
            user: log.user?.name || 'System',
            role: log.user?.role || 'system',
        }));
    }

    private static formatActivityContent(log: any) {
        const map: any = {
            'CREATE_CLIENT': 'Client profile created',
            'UPDATE_CLIENT': 'Client profile updated',
            'DELETE_CLIENT': 'Client removed',
            'CREATE_CLIENT_COMM': `Interaction logged: ${log.details?.subject || ''}`,
            'CREATE_INVOICE': `Invoice created: ${log.details?.invoiceNumber || ''}`,
            'UPDATE_INVOICE': `Invoice status updated`,
            'CREATE_PROJECT': `Project linked: ${log.details?.name || ''}`,
        };
        return map[log.action] || log.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase());
    }
    static async createPortalUser(client: any, password: string) {

        const User = prisma.user;
        const existingUser = await User.findFirst({ where: { email: client.email } });
        if (!existingUser) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            return await User.create({
                data: {
                    name: client.name,
                    email: client.email,
                    password: hashedPassword,
                    role: 'client',
                    isActive: true
                }
            });
        }
        return null;
    }


}


