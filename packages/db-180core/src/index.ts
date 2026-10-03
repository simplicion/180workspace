'use strict';

import { PrismaClient, Prisma } from '../generated/client/index.js';

export { PrismaClient, Prisma };

function getCoreDatabaseUrl(): string {
  let url = (
    process.env.CORE_DATABASE_URL ||
    process.env.DEVELOPERS_DATABASE_URL ||
    process.env.IDENTITY_DATABASE_URL ||
    'postgresql://pitchin_admin:Pitchin180Admin!23@pitchin-db.csne8mek4dog.us-east-1.rds.amazonaws.com:5432/180core_db?sslmode=require'
  );

  // Redirect legacy 180developers_db to isolated 180core_db
  if (url.includes('180developers_db')) {
    url = url.replace('180developers_db', '180core_db');
  }

  // If a config mistakenly passed 180workspace_db to 180 Core services, redirect to dedicated 180core_db
  if (url.includes('180workspace_db')) {
    url = url.replace('180workspace_db', '180core_db');
    url = url.replace(/[?&]schema=[^&]*/, '');
  }

  return url;
}

const globalForCorePrisma = globalThis as unknown as {
  corePrisma?: PrismaClient;
};

export const corePrisma =
  globalForCorePrisma.corePrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getCoreDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

export const db180core = corePrisma;
export const developersPrisma = corePrisma;

if (process.env.NODE_ENV !== 'production') {
  globalForCorePrisma.corePrisma = corePrisma;
}

export default corePrisma;
