import { PrismaClient as DevsPrisma } from '../packages/db-180core/generated/client/index.js';

const oldDbUrl = process.env.DEVELOPERS_DATABASE_URL;
const coreDbUrl = process.env.CORE_DATABASE_URL || process.env.DATABASE_URL;

if (!oldDbUrl || !coreDbUrl) {
  console.error('❌ DEVELOPERS_DATABASE_URL and CORE_DATABASE_URL must be defined in your environment.');
  process.exit(1);
}

const oldDb = new DevsPrisma({
  datasources: {
    db: { url: oldDbUrl }
  }
});

const coreDb = new DevsPrisma({
  datasources: {
    db: { url: coreDbUrl }
  }
});

async function main() {
  // 1. Get Simplicion user in coreDb (production schema)
  const prodUser = await coreDb.user.findFirst({
    where: { email: { equals: 'simplicion.com@gmail.com', mode: 'insensitive' } }
  });
  console.log('Production Simplicion user:', prodUser?.id, prodUser?.email);

  // 2. Get apps from oldDb
  const oldApps = await oldDb.oAuthApp.findMany();
  console.log(`Found ${oldApps.length} apps in old 180developers_db`);

  for (const app of oldApps) {
    const existingInProd = await coreDb.oAuthApp.findFirst({
      where: {
        OR: [
          { clientId: app.clientId },
          { id: app.id }
        ]
      }
    });

    if (existingInProd) {
      console.log(`[SKIPPED] App already in production: ${app.name} (${app.clientId})`);
    } else {
      console.log(`[SYNCING] App to production: ${app.name} (${app.clientId})`);
      const { id, createdAt, updatedAt, userId, ...rest } = app;
      await coreDb.oAuthApp.create({
        data: {
          ...rest,
          id,
          userId: prodUser.id,
        }
      });
      console.log(`[SYNCED] Successfully synced ${app.name} (${app.clientId}) into 180workspace_db (schema 180core)`);
    }
  }

  // Check total apps in production now
  const prodApps = await coreDb.oAuthApp.findMany({
    where: { userId: prodUser.id }
  });
  console.log(`Total apps owned by Simplicion in production: ${prodApps.length}`);
  console.log('Production apps list:', prodApps.map(a => ({ id: a.id, name: a.name, clientId: a.clientId })));
}

main()
  .catch(console.error)
  .finally(async () => {
    await oldDb.$disconnect();
    await coreDb.$disconnect();
  });
