import assert from 'assert';

const BASE_URL = 'http://localhost:3004';

export async function runTest() {
  console.log('--- TEST 10: LLM Discovery & AI Crawler Protocol (/llms.txt & /llms-full.txt) ---');

  // 1. Check /llms.txt
  const resShort = await fetch(`${BASE_URL}/llms.txt`);
  assert.strictEqual(resShort.status, 200, 'Expected 200 from /llms.txt');
  const textShort = await resShort.text();
  assert.ok(textShort.includes('Engineering & Growth Blog: https://180workspace.com/blog'), 'Expected blog link in /llms.txt');
  console.log('✓ /llms.txt includes active reference to Engineering & Growth Blog');

  // 2. Check /llms-full.txt
  const resFull = await fetch(`${BASE_URL}/llms-full.txt`);
  assert.strictEqual(resFull.status, 200, 'Expected 200 from /llms-full.txt');
  const textFull = await resFull.text();

  assert.ok(
    textFull.includes('Thought Leadership & Technical Publications (Blog)'),
    'Expected blog deep dive section in /llms-full.txt'
  );
  console.log('✓ /llms-full.txt includes dedicated Thought Leadership & Technical Publications section');

  // 3. Verify All 3 Core Architectural Deep Dives
  const expectedArticles = [
    'The True Cost of Software Tool Fragmentation',
    'Demystifying Work Graph Architecture',
    'The Media Buyer\'s Guide to Edge Cloaking'
  ];

  for (const title of expectedArticles) {
    assert.ok(textFull.includes(title), `Expected /llms-full.txt to contain article "${title}"`);
    console.log(`✓ Confirmed AI knowledge indexing for: "${title}"`);
  }

  // 4. Verify Canonical Markdown URLs in /llms-full.txt
  assert.ok(textFull.includes('https://180workspace.com/blog/cost-of-software-fragmentation'));
  assert.ok(textFull.includes('https://180workspace.com/blog/demystifying-work-graph-architecture'));
  assert.ok(textFull.includes('https://180workspace.com/blog/media-buyers-guide-edge-cloaking'));
  console.log('✓ All 3 article URLs formatted and indexable for AI crawlers (Perplexity / SearchGPT)');

  console.log('✅ TEST 10 PASSED: AI Crawler protocol (/llms.txt & /llms-full.txt) fully compliant.\n');
  return true;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 10 FAILED:', err.message);
    process.exit(1);
  });
}
