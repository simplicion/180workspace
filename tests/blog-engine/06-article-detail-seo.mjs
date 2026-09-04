import assert from 'assert';

const ARTICLE_URL = 'http://localhost:3004/blog/cost-of-software-fragmentation';

export async function runTest() {
  console.log('--- TEST 06: Article Detail Page On-Page SEO & Social Meta ---');

  const res = await fetch(ARTICLE_URL);
  assert.strictEqual(res.status, 200, `Expected 200 from ${ARTICLE_URL}`);

  const html = await res.text();

  // 1. Single H1 Verification
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  assert.strictEqual(h1Matches.length, 1, `Expected exactly 1 <h1> tag, found ${h1Matches.length}`);
  assert.ok(h1Matches[0].includes('Software Tool Fragmentation'), 'Expected H1 to contain article title');
  console.log('✓ Article H1 tag validated');

  // 2. Canonical URL Verification
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  assert.ok(canonicalMatch, 'Expected canonical link tag');
  assert.strictEqual(canonicalMatch[1], 'https://180workspace.com/blog/cost-of-software-fragmentation');
  console.log(`✓ Canonical link confirmed: ${canonicalMatch[1]}`);

  // 3. OpenGraph Social Tags
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogType = html.match(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i);
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  assert.ok(ogTitle, 'Expected og:title tag');
  assert.ok(ogType, 'Expected og:type tag');
  assert.strictEqual(ogType[1], 'article', 'Expected og:type to be "article"');
  assert.ok(ogDesc, 'Expected og:description tag');
  console.log(`✓ OpenGraph tags validated (type: ${ogType[1]}, title: "${ogTitle[1].substring(0, 45)}...")`);

  // 4. Twitter Card Tags
  const twCard = html.match(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i);
  assert.ok(twCard, 'Expected twitter:card tag');
  console.log(`✓ Twitter Card tag validated (card: ${twCard[1]})`);

  // 5. Breadcrumb & Reading Time
  assert.ok(html.includes('Home') && html.includes('Blog') && html.includes('Operations'), 'Expected breadcrumb links');
  assert.ok(html.includes('min read'), 'Expected reading time badge');
  console.log('✓ Breadcrumb hierarchy and reading time badge confirmed');

  console.log('✅ TEST 06 PASSED: Article Detail page satisfies full On-Page SEO & Social metadata.\n');
  return true;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 06 FAILED:', err.message);
    process.exit(1);
  });
}
