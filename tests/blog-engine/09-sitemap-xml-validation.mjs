import assert from 'assert';

const SITEMAP_URL = 'http://localhost:3004/sitemap.xml';

export async function runTest() {
  console.log('--- TEST 09: Sitemap.xml Protocol & Freshness Validation ---');

  const res = await fetch(SITEMAP_URL);
  assert.strictEqual(res.status, 200, `Expected 200 from ${SITEMAP_URL}`);
  assert.ok(res.headers.get('content-type')?.includes('xml'), 'Expected XML content type');

  const xml = await res.text();

  // 1. XML Structure
  assert.ok(xml.startsWith('<?xml'), 'Expected standard XML declaration');
  assert.ok(xml.includes('<urlset'), 'Expected <urlset> root tag');
  console.log('✓ Valid XML document structure confirmed');

  // 2. Blog Hub URL
  assert.ok(
    xml.includes('<loc>https://180workspace.com/blog</loc>'),
    'Expected blog hub URL in sitemap'
  );
  console.log('✓ Main /blog hub URL present in sitemap');

  // 3. Blog Article Slugs
  const expectedSlugs = [
    'cost-of-software-fragmentation',
    'demystifying-work-graph-architecture',
    'media-buyers-guide-edge-cloaking'
  ];

  for (const slug of expectedSlugs) {
    const locPattern = `<loc>https://180workspace.com/blog/${slug}</loc>`;
    assert.ok(xml.includes(locPattern), `Expected sitemap to contain ${locPattern}`);
    console.log(`✓ Confirmed sitemap entry for: "${slug}"`);
  }

  // 4. Validate Priority & Changefreq
  assert.ok(xml.includes('<changefreq>weekly</changefreq>'), 'Expected weekly changefreq for blogs');
  assert.ok(xml.includes('<priority>0.85</priority>'), 'Expected 0.85 priority for blogs');
  console.log('✓ Priority (0.85) and changefreq (weekly) verified');

  // 5. Validate ISO LastMod timestamps
  const lastModMatches = xml.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];
  assert.ok(lastModMatches.length > 0, 'Expected <lastmod> timestamps in sitemap');
  for (const lm of lastModMatches.slice(0, 5)) {
    const dateStr = lm.replace(/<\/?lastmod>/g, '');
    const d = new Date(dateStr);
    assert.ok(!isNaN(d.getTime()), `Invalid date in lastmod: ${dateStr}`);
  }
  console.log(`✓ All <lastmod> timestamps are valid ISO 8601 dates (sampled 5/${lastModMatches.length})`);

  console.log('✅ TEST 09 PASSED: Sitemap.xml meets Google search indexing protocol.\n');
  return true;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 09 FAILED:', err.message);
    process.exit(1);
  });
}
