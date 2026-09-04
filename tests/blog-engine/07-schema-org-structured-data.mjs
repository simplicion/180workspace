import assert from 'assert';

const ARTICLE_URL = 'http://localhost:3004/blog/cost-of-software-fragmentation';

export async function runTest() {
  console.log('--- TEST 07: Schema.org JSON-LD Structured Data Validation ---');

  const res = await fetch(ARTICLE_URL);
  assert.strictEqual(res.status, 200);
  const html = await res.text();

  // Extract all application/ld+json scripts
  const scriptRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
  const jsonBlocks = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      jsonBlocks.push(JSON.parse(match[1]));
    } catch (e) {
      console.warn('Failed to parse JSON-LD block:', e.message);
    }
  }

  assert.ok(jsonBlocks.length > 0, 'Expected at least one Schema.org JSON-LD block');
  console.log(`✓ Found and parsed ${jsonBlocks.length} JSON-LD block(s)`);

  let foundArticle = false;
  let foundFAQ = false;
  let foundBreadcrumb = false;
  let foundOrganization = false;

  for (const item of jsonBlocks) {
    const type = item['@type'];
    if (type === 'Article' || type === 'BlogPosting') {
      foundArticle = true;
      assert.ok(item.headline, 'Article schema must have headline');
      assert.ok(item.author, 'Article schema must have author');
      assert.ok(item.publisher, 'Article schema must have publisher');
      assert.ok(item.datePublished, 'Article schema must have datePublished');
      console.log(`  - Found @type "${type}": headline="${item.headline.substring(0, 40)}..."`);
    } else if (type === 'FAQPage') {
      foundFAQ = true;
      assert.ok(Array.isArray(item.mainEntity), 'FAQPage schema must have mainEntity array');
      assert.ok(item.mainEntity.length > 0, 'FAQPage mainEntity must not be empty');
      const firstQ = item.mainEntity[0];
      assert.strictEqual(firstQ['@type'], 'Question');
      assert.ok(firstQ.name, 'Question must have name (question text)');
      assert.strictEqual(firstQ.acceptedAnswer?.['@type'], 'Answer');
      assert.ok(firstQ.acceptedAnswer?.text, 'Answer must have text');
      console.log(`  - Found @type "FAQPage" with ${item.mainEntity.length} Q&A items`);
    } else if (type === 'BreadcrumbList') {
      foundBreadcrumb = true;
      assert.ok(Array.isArray(item.itemListElement));
      console.log(`  - Found @type "BreadcrumbList" with ${item.itemListElement.length} crumbs`);
    } else if (type === 'Organization') {
      foundOrganization = true;
      assert.strictEqual(item.name, '180workspace');
      console.log('  - Found @type "Organization" for 180workspace');
    }
  }

  assert.ok(foundArticle, 'Expected to find Article/BlogPosting schema');
  assert.ok(foundFAQ, 'Expected to find FAQPage schema for Google SERP accordion snippet');
  assert.ok(foundBreadcrumb, 'Expected to find BreadcrumbList schema');
  assert.ok(foundOrganization, 'Expected to find Organization schema');

  console.log('✅ TEST 07 PASSED: All 4 Schema.org JSON-LD structured schemas are valid.\n');
  return true;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 07 FAILED:', err.message);
    process.exit(1);
  });
}
