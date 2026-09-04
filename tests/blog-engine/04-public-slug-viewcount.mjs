import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:4002';
const TEST_SLUG = 'cost-of-software-fragmentation';

export async function runTest() {
  console.log('--- TEST 04: Public Article Retrieval & Atomic Views Counter ---');

  // 1. Fetch valid article by slug
  const res = await fetch(`${BASE_URL}/api/public/blogs/${TEST_SLUG}`);
  assert.strictEqual(res.status, 200, `Expected 200 for valid slug "${TEST_SLUG}"`);

  const json = await res.json();
  assert.strictEqual(json.success, true);
  const initialViews = json.data.blog.viewsCount ?? 0;
  console.log(`✓ Fetched article: "${json.data.blog.title}". Initial viewsCount: ${initialViews}`);

  // 2. Fetch invalid slug (expect 404)
  const resInvalid = await fetch(`${BASE_URL}/api/public/blogs/completely-non-existent-slug-${Date.now()}`);
  assert.strictEqual(resInvalid.status, 404, 'Expected 404 for non-existent slug');
  console.log('✓ Non-existent slug correctly returned 404');

  // 3. Post view counter increment
  const resView = await fetch(`${BASE_URL}/api/public/blogs/${TEST_SLUG}/view`, {
    method: 'POST'
  });
  assert.strictEqual(resView.status, 200, 'Expected 200 for view recording');
  const jsonView = await resView.json();
  assert.strictEqual(jsonView.success, true);
  assert.ok(typeof jsonView.data.viewsCount === 'number', 'Expected viewsCount number');
  console.log(`✓ View recorded. New viewsCount: ${jsonView.data.viewsCount}`);

  console.log('✅ TEST 04 PASSED: Public slug retrieval & view counter increment verified.\n');
  return true;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 04 FAILED:', err.message);
    process.exit(1);
  });
}
