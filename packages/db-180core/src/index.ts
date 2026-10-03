'use strict';

import { PrismaClient, Prisma } from '../generated/client/index.js';

export { PrismaClient, Prisma };

function getCoreDatabaseUrl(): string {
  let url = (
    process.env.CORE_DATABASE_URL ||
    process.env.DEVELOPERS_DATABASE_URL ||
    process.env.IDENTITY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://pitchin_admin:Pitchin180Admin!23@pitchin-db.csne8mek4dog.us-east-1.rds.amazonaws.com:5432/180workspace_db?sslmode=require&schema=180core'
  );

  // If pointing to obsolete 180developers_db, automatically redirect to canonical 180workspace_db with schema=180core
  if (url.includes('180developers_db')) {
    url = url.replace('180developers_db', '180workspace_db');
  }

  // Ensure schema=180core is enforced on 180workspace_db
  if (url.includes('180workspace_db') && !url.includes('schema=180core')) {
    if (url.includes('schema=')) {
      url = url.replace(/schema=[^&]*/, 'schema=180core');
    } else {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}schema=180core`;
    }
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
