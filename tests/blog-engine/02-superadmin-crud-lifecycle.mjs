import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function runTest() {
  console.log('--- TEST 02: SuperAdmin CRUD & Publishing Lifecycle ---');

  const { BlogService } = await import('../../packages/domains/platform-admin/dist/index.js');

  const testSlug = `automated-test-article-${Date.now()}`;
  let createdId = null;

  try {
    // 1. CREATE Article
    console.log(`Creating test article: "${testSlug}"...`);
    const newArticle = await BlogService.create({
      title: 'Automated Test Article for Work Graph',
      slug: testSlug,
      category: 'Operations',
      seoTitle: 'Automated Test Article SEO Title',
      seoDescription: 'Automated test meta description with optimized length for search.',
      keywords: ['testing', 'workgraph', 'automation'],
      contentMarkdown: '## Section 1\n\nTesting body content.\n\n## Section 2\n\nMore testing.',
      authorName: 'Antigravity QA Bot',
      authorRole: 'Senior QA Architect',
      keyTakeaways: ['Test insight 1', 'Test insight 2'],
      faqs: [{ question: 'Is this a test?', answer: 'Yes, automated verification.' }],
      published: false,
    });

    assert.ok(newArticle?.id, 'Expected newArticle to have an id');
    createdId = newArticle.id;
    assert.strictEqual(newArticle.slug, testSlug);
    assert.strictEqual(newArticle.published, false);
    console.log(`✓ Created article with ID: ${createdId}, Published: ${newArticle.published}`);

    // 2. READ by ID
    const fetched = await BlogService.getById(createdId);
    assert.ok(fetched, 'Expected to fetch created article by ID');
    assert.strictEqual(fetched.title, 'Automated Test Article for Work Graph');
    console.log('✓ Successfully retrieved article by ID');

    // 3. UPDATE Article
    console.log('Updating article title and category...');
    const updated = await BlogService.update(createdId, {
      title: 'Updated Test Article Title',
      category: 'Architecture'
    });
    assert.strictEqual(updated.title, 'Updated Test Article Title');
    assert.strictEqual(updated.category, 'Architecture');
    console.log('✓ Successfully updated article');

    // 4. TOGGLE PUBLISH (Draft -> Published)
    console.log('Toggling publish status (false -> true)...');
    const publishedArticle = await BlogService.togglePublish(createdId);
    assert.strictEqual(publishedArticle.published, true);
    console.log('✓ Successfully published article');

    // 5. TOGGLE PUBLISH AGAIN (Published -> Draft)
    console.log('Toggling publish status back (true -> false)...');
    const unpublishedArticle = await BlogService.togglePublish(createdId);
    assert.strictEqual(unpublishedArticle.published, false);
    console.log('✓ Successfully unpublished article');

    // 6. DELETE Article
    console.log('Cleaning up: deleting test article...');
    await BlogService.remove(createdId);
    const postDelete = await BlogService.getById(createdId);
    assert.strictEqual(postDelete, null, 'Expected article to be null after deletion');
    console.log('✓ Test article deleted cleanly');

    console.log('✅ TEST 02 PASSED: SuperAdmin CRUD & Publishing Lifecycle works flawlessly.\n');
    return true;
  } catch (err) {
    if (createdId) {
      try {
        const { BlogService } = await import('../../packages/domains/platform-admin/dist/index.js');
        await BlogService.remove(createdId);
      } catch (_) {}
    }
    throw err;
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runTest().catch(err => {
    console.error('❌ TEST 02 FAILED:', err.message);
    process.exit(1);
  });
}
