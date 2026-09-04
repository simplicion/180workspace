import assert from 'assert';

const MARKETING_URL = 'http://localhost:3004/blog';

export async function runTest() {
  console.log('--- TEST 05: Marketing Blog Listing Page SEO & Semantic Hierarchy ---');

  const res = await fetch(MARKETING_URL);
  assert.strictEqual(res.status, 200, `Expected 200 from ${MARKETING_URL}`);

  const html = await res.text();

  // 1. Single H1 Verification
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  assert.strictEqual(h1Matches.length, 1, `Expected exactly 1 <h1> tag, found ${h1Matches.length}`);
  console.log('✓ Exactly one <h1> tag found on page');

  // 2. Title Tag Verification
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  assert.ok(titleMatch, 'Expected <title> tag in HTML');
  assert.ok(titleMatch[1].includes('180workspace'), 'Expected brand name "180workspace" in title');
  console.log(`✓ Valid <title> tag: "${titleMatch[1]}"`);

  // 3. Meta Description Verification
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  assert.ok(metaDescMatch, 'Expected <meta name="description"> tag');
  const metaDesc = metaDescMatch[1];
  assert.ok(metaDesc.length >= 40 && metaDesc.length <= 250, `Expected meta description length between 40-250 chars (got ${metaDesc.length})`);
  console.log(`✓ Valid meta description (${metaDesc.length} chars): "${metaDesc.substring(0, 70)}..."`);

  // 4. Canonical URL Verification
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  assert.ok(canonicalMatch, 'Expected <link rel="canonical"> tag');
  assert.strictEqual(canonicalMatch[1], 'https://180workspace.com/blog');
  console.log(`✓ Canonical URL verified: ${canonicalMatch[1]}`);

  // 5. Category Filter Tabs & Bento Grid Elements
  assert.ok(html.includes('category-tab'), 'Expected category filter buttons');
  assert.ok(html.includes('articles-grid'), 'Expected articles grid container');
  console.log('✓ Category filters and bento article grid components verified');

  console.log('✅ TEST 05 PASSED: Marketing Blog Listing page meets all core SEO standards.\n');
  return true;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 05 FAILED:', err.message);
    process.exit(1);
  });
}
