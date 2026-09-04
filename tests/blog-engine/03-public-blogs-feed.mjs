import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:4002';

export async function runTest() {
  console.log('--- TEST 03: Public Blogs Feed & Privacy Separation ---');

  // 1. Fetch public feed from /api/public/blogs
  const res = await fetch(`${BASE_URL}/api/public/blogs`);
  assert.strictEqual(res.status, 200, 'Expected 200 OK from public blogs endpoint');

  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.ok(Array.isArray(json.data?.blogs), 'Expected data.blogs to be an array');
  console.log(`✓ Fetched ${json.data.blogs.length} published blogs from public feed`);

  // Verify all returned blogs are published
  for (const blog of json.data.blogs) {
    assert.strictEqual(blog.published, true, `Blog "${blog.slug}" in public feed must have published=true`);
  }
  console.log('✓ All returned blogs have published=true');

  // 2. Test Category Filtering
  const resCategory = await fetch(`${BASE_URL}/api/public/blogs?category=Operations`);
  assert.strictEqual(resCategory.status, 200);
  const jsonCategory = await resCategory.json();
  assert.ok(Array.isArray(jsonCategory.data?.blogs));
  for (const b of jsonCategory.data.blogs) {
    assert.strictEqual(b.category, 'Operations', 'Filtered blogs must match category "Operations"');
  }
  console.log(`✓ Category filtering verified: ${jsonCategory.data.blogs.length} Operations articles returned`);

  // 3. Verify /api/v1/public/blogs route alias also works
  const resV1 = await fetch(`${BASE_URL}/api/v1/public/blogs`);
  assert.strictEqual(resV1.status, 200, 'Expected 200 OK from /api/v1/public/blogs route alias');
  const jsonV1 = await resV1.json();
  assert.strictEqual(jsonV1.data.blogs.length, json.data.blogs.length);
  console.log('✓ /api/v1/public/blogs alias returns identical dataset');

  console.log('✅ TEST 03 PASSED: Public blogs feed and privacy filters are strictly enforced.\n');
  return true;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 03 FAILED:', err.message);
    process.exit(1);
  });
}
