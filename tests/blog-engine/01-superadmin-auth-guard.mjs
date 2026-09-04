import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:4002';

export async function runTest() {
  console.log('--- TEST 01: SuperAdmin Auth Guard Enforcement ---');

  // 1. Unauthenticated GET /api/superadmin/blogs should return 401
  const resNoAuth = await fetch(`${BASE_URL}/api/superadmin/blogs`);
  console.log(`Unauthenticated GET status: ${resNoAuth.status}`);
  assert.strictEqual(resNoAuth.status, 401, 'Expected 401 Unauthorized without auth token');

  const jsonNoAuth = await resNoAuth.json();
  assert.ok(
    jsonNoAuth.error?.toLowerCase().includes('super admin authentication') ||
    jsonNoAuth.error?.toLowerCase().includes('authentication required'),
    'Expected error message indicating superadmin auth is required'
  );
  console.log('✓ Unauthenticated request rejected with 401');

  // 2. Invalid Token GET /api/superadmin/blogs should return 401
  const resBadToken = await fetch(`${BASE_URL}/api/superadmin/blogs`, {
    headers: { Authorization: 'Bearer invalid_fake_token_12345' }
  });
  assert.strictEqual(resBadToken.status, 401, 'Expected 401 for invalid JWT token');
  console.log('✓ Invalid token request rejected with 401');

  console.log('✅ TEST 01 PASSED: SuperAdmin Auth Guard works as expected.\n');
  return true;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 01 FAILED:', err.message);
    process.exit(1);
  });
}
