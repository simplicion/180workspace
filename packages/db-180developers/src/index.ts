'use strict';

import { PrismaClient } from '../generated/client';

export * from '../generated/client';

function getDevelopersDatabaseUrl(): string {
  return (
    process.env.DEVELOPERS_DATABASE_URL ||
    process.env.IDENTITY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/180developers_db?schema=public'
  );
}

const globalForDevelopersPrisma = globalThis as unknown as {
  developersPrisma?: PrismaClient;
};

export const developersPrisma =
  globalForDevelopersPrisma.developersPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDevelopersDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDevelopersPrisma.developersPrisma = developersPrisma;
}

export default developersPrisma;
