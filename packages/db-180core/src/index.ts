'use strict';

import { PrismaClient } from '../generated/client';

export * from '../generated/client';

function getCoreDatabaseUrl(): string {
  return (
    process.env.CORE_DATABASE_URL ||
    process.env.DEVELOPERS_DATABASE_URL ||
    process.env.IDENTITY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/180developers_db?schema=public'
  );
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
