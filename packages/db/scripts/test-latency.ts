import { basePrisma, getCompanyPrisma } from '../src/index.js';

async function runBenchmark() {
  console.log('Starting latency benchmark...');
  const companyId = 'test-company-id-' + Date.now();
  
  // 1. Warm up the connection
  try {
    await basePrisma.$queryRaw`SELECT 1`;
  } catch (e) {
    console.error('Failed to connect to database', e);
    process.exit(1);
  }

  const QUERY_COUNT = 50;
  
  console.log(`\n--- BENCHMARK 1: basePrisma (${QUERY_COUNT} queries) ---`);
  const startBase = performance.now();
  for (let i = 0; i < QUERY_COUNT; i++) {
    // A simple query on a model that has companyId
    await basePrisma.task.findMany({ take: 1 });
  }
  const endBase = performance.now();
  const timeBase = endBase - startBase;
  console.log(`basePrisma Total Time: ${timeBase.toFixed(2)}ms`);
  console.log(`basePrisma Avg Per Query: ${(timeBase / QUERY_COUNT).toFixed(2)}ms`);

  console.log(`\n--- BENCHMARK 2: getCompanyPrisma (${QUERY_COUNT} queries) ---`);
  const companyPrisma = getCompanyPrisma(companyId);
  const startCompany = performance.now();
  for (let i = 0; i < QUERY_COUNT; i++) {
    // The same query, but wrapped in proxy
    await companyPrisma.task.findMany({ take: 1 });
  }
  const endCompany = performance.now();
  const timeCompany = endCompany - startCompany;
  console.log(`getCompanyPrisma Total Time: ${timeCompany.toFixed(2)}ms`);
  console.log(`getCompanyPrisma Avg Per Query: ${(timeCompany / QUERY_COUNT).toFixed(2)}ms`);
  
  console.log('\n--- RESULTS ---');
  console.log(`Overhead for ${QUERY_COUNT} proxy queries: ${(timeCompany - timeBase).toFixed(2)}ms`);
  console.log(`Overhead per query: ${((timeCompany - timeBase) / QUERY_COUNT).toFixed(2)}ms`);

  process.exit(0);
}

runBenchmark().catch(console.error);
