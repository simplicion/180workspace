import { performance } from 'perf_hooks';

const tests = [
  { id: '01', name: 'SuperAdmin Auth Guard Enforcement', file: './01-superadmin-auth-guard.mjs' },
  { id: '02', name: 'SuperAdmin CRUD & Publishing Lifecycle', file: './02-superadmin-crud-lifecycle.mjs' },
  { id: '03', name: 'Public Blogs Feed & Category Filtering', file: './03-public-blogs-feed.mjs' },
  { id: '04', name: 'Public Slug Retrieval & Views Telemetry', file: './04-public-slug-viewcount.mjs' },
  { id: '05', name: 'Marketing Blog Listing Page SEO', file: './05-marketing-listing-seo.mjs' },
  { id: '06', name: 'Article Detail Page On-Page SEO & Social', file: './06-article-detail-seo.mjs' },
  { id: '07', name: 'Schema.org JSON-LD Structured Data Mesh', file: './07-schema-org-structured-data.mjs' },
  { id: '08', name: 'AEO & GEO (AI Answer Engine Optimization)', file: './08-aeo-geo-citations.mjs' },
  { id: '09', name: 'Sitemap.xml Protocol & Freshness', file: './09-sitemap-xml-validation.mjs' },
  { id: '10', name: 'LLM Discovery & AI Crawler Protocol', file: './10-llms-discovery-crawler.mjs' },
];

async function runAll() {
  console.log('================================================================');
  console.log('  180WORKSPACE BLOG & SEO/AEO ENGINE — COMPREHENSIVE TEST SUITE ');
  console.log('================================================================\n');

  const results = [];
  const overallStart = performance.now();

  for (const test of tests) {
    const start = performance.now();
    try {
      const module = await import(test.file);
      await module.runTest();
      const duration = (performance.now() - start).toFixed(0);
      results.push({ ...test, status: 'PASSED', duration: `${duration}ms` });
    } catch (err) {
      const duration = (performance.now() - start).toFixed(0);
      results.push({ ...test, status: 'FAILED', duration: `${duration}ms`, error: err.message });
      console.error(`❌ ${test.name} failed:`, err.message, '\n');
    }
  }

  const overallDuration = ((performance.now() - overallStart) / 1000).toFixed(2);
  const passedCount = results.filter(r => r.status === 'PASSED').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;

  console.log('================================================================');
  console.log('                       EXECUTIVE QA SUMMARY                     ');
  console.log('================================================================');
  console.table(results.map(r => ({
    'Test #': r.id,
    'Test Suite Name': r.name,
    'Status': r.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED',
    'Duration': r.duration,
  })));

  console.log(`Total Tests Executed: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total Runtime: ${overallDuration}s`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('⚠️ One or more tests failed. Check log outputs above.');
    process.exit(1);
  } else {
    console.log('🎉 ALL 10 TESTS PASSED WITH 100% SUCCESS RATE!');
    process.exit(0);
  }
}

runAll();
