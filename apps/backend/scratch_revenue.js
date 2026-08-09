require('dotenv').config({ path: '.env' });
const { prisma } = require('@workspace/db');
const SalesService = require('./src/app-registry/crm-and-sales-app/sales/sales.service');

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
