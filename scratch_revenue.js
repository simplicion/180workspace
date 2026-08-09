require('dotenv').config({ path: './apps/backend/.env' });
const { PrismaClient } = require('@prisma/client');
const SalesService = require('./apps/backend/src/app-registry/crm-and-sales-app/sales/sales.service');

const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Fetching revenue stats...");
        const result = await SalesService.getRevenueStats(prisma, 'months');
        console.log("Success:", result);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
