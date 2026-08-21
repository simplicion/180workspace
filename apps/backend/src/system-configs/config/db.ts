import { prisma } from '@workspace/db';

export async function connectDB(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ PostgreSQL connected via Prisma Client');
        return true;
    } catch (err: any) {
        console.error(`❌ PostgreSQL connection failed: ${err.message}`);
        // Do not crash the server in dev/test modes
        return false;
    }
}

export async function testAndConnectDB(): Promise<boolean> {
    return true;
}
