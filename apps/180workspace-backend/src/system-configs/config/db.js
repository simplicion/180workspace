'use strict';

const { prisma } = require('@workspace/db');

async function connectDB() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('âœ… PostgreSQL connected via Prisma Client');
        return true;
    } catch (err) {
        console.error(`âŒ PostgreSQL connection failed: ${err.message}`);
        // Do not crash the server in dev/test modes
        return false;
    }
}

async function testAndConnectDB() {
    return true;
}

module.exports = {
    connectDB,
    testAndConnectDB
};
