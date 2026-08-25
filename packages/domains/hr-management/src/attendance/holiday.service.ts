import { prisma } from '@workspace/db';

export class HolidayService {
    static async getHolidays(year?: string) {
        const filter: any = {};
        if (year) {
            filter.date = {
                gte: new Date(`${year}-01-01T00:00:00.000Z`),
                lte: new Date(`${year}-12-31T23:59:59.999Z`)
            };
        }
        return await prisma.holiday.findMany({
            where: filter,
            orderBy: { date: 'asc' }
        });
    }

    static async createHoliday(data: { name: string; date: string; type?: string; description?: string }) {
        return await prisma.holiday.create({
            data: {
                name: data.name,
                date: new Date(data.date),
                type: data.type,
                description: data.description
            }
        });
    }

    static async updateHoliday(id: string, data: { name?: string; date?: string; type?: string; description?: string }) {
        const existingHoliday = await prisma.holiday.findUnique({ where: { id } });
        if (!existingHoliday) {
            throw new Error('Holiday not found');
        }

        const update: any = { name: data.name, type: data.type, description: data.description };
        if (data.date) update.date = new Date(data.date);

        return await prisma.holiday.update({
            where: { id },
            data: update
        });
    }

    static async deleteHoliday(id: string) {
        const existingHoliday = await prisma.holiday.findUnique({ where: { id } });
        if (!existingHoliday) {
            throw new Error('Holiday not found');
        }

        await prisma.holiday.delete({ where: { id } });
        return { message: 'Holiday deleted' };
    }
}
