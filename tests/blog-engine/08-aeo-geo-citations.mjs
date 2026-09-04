import assert from 'assert';

const ARTICLE_URL = 'http://localhost:3004/blog/cost-of-software-fragmentation';

export async function runTest() {
  console.log('--- TEST 08: AEO & GEO (AI Answer & Generative Engine Optimization) ---');

  const res = await fetch(ARTICLE_URL);
  assert.strictEqual(res.status, 200);
  const html = await res.text();

  // 1. Key Takeaways Box Verification (AI Overview / SearchGPT Citation Format)
  assert.ok(
    html.includes('Key Takeaways & Executive Summary') || html.includes('Key Takeaways'),
    'Expected Key Takeaways callout box for AI engine extraction'
  );
  console.log('✓ Key Takeaways & Executive Summary callout box found');

  // Verify bullet points within takeaways
  const takeawayItemMatches = html.match(/<li[^>]*>[\s\S]*?✓[\s\S]*?<\/li>/gi) || [];
  assert.ok(takeawayItemMatches.length >= 3, `Expected at least 3 bullet points in takeaways, found ${takeawayItemMatches.length}`);
  console.log(`✓ Verified ${takeawayItemMatches.length} structured takeaway bullet points with checkmarks`);

  // 2. Table of Contents (TOC) with In-Page Anchor Links (Google Sitelinks)
  assert.ok(html.includes('Table of Contents'), 'Expected Table of Contents section');
  const tocAnchorMatches = html.match(/<a\s+href="#([^"]+)"\s+class="[^"]*block[^"]*">/gi) || [];
  assert.ok(tocAnchorMatches.length >= 2, `Expected at least 2 TOC anchor links, found ${tocAnchorMatches.length}`);
  console.log(`✓ Table of Contents active with ${tocAnchorMatches.length} anchor links`);

  // Verify headings have matching ID targets
  assert.ok(html.includes('id="the-silent-margin-killer'), 'Expected matching heading ID for TOC anchor');
  console.log('✓ Heading anchor IDs present for smooth in-page jumping');

  // 3. Interactive FAQ Accordion Elements (<details> and <summary>)
  const faqDetailsMatches = html.match(/<details[^>]*>[\s\S]*?<summary[^>]*>/gi) || [];
  assert.ok(faqDetailsMatches.length >= 2, `Expected at least 2 interactive FAQ accordion details, found ${faqDetailsMatches.length}`);
  console.log(`✓ Found ${faqDetailsMatches.length} interactive FAQ accordion <details> elements`);

  // 4. In-Article Work Graph Product CTA Card
  assert.ok(
    html.includes('/signup?plan=momentum'),
    'Expected in-article CTA linking directly to Momentum plan ($12)'
  );
  console.log('✓ In-article Work Graph CTA present and linked to /signup?plan=momentum');

  console.log('✅ TEST 08 PASSED: AEO & GEO architecture verified for Google AI Overviews and SearchGPT citations.\n');
  return true;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 08 FAILED:', err.message);
    process.exit(1);
  });
}
