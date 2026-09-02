// @ts-nocheck
import { prisma, basePrisma } from '../packages/db/src';
import { UniversalBuilderRegistry } from '../packages/domains/ai/src/builders';
import { aiToolRegistry } from '../packages/domains/ai/src/tools/ai-tool-registry';
import '../packages/domains/ai/src/tools/builtin-tools';

async function runWebsiteSynthesisTests() {
    console.log('\n========================================================================');
    console.log('🚀 180 WORKSPACE AI WEBSITE BUILDER & LIVE SYNTHESIS TEST SUITE');
    console.log('========================================================================\n');

    let passed = 0;
    let total = 0;

    function assert(condition: boolean, testName: string, detail?: string) {
        total++;
        if (condition) {
            passed++;
            console.log(`  ✅ [PASS] ${testName}`);
            if (detail) console.log(`     └─ ${detail}`);
        } else {
            console.error(`  ❌ [FAIL] ${testName}`);
            if (detail) console.error(`     └─ Reason: ${detail}`);
        }
    }

    // 1. Setup Test Workspace Context
    const company = await prisma.company.findFirst() || await prisma.company.create({
        data: { name: 'Website Test Org', slug: 'website-test-org' }
    });

    const user = await prisma.user.findFirst({ where: { companyId: company.id } }) || await prisma.user.create({
        data: {
            email: `webmaster_${Date.now()}@example.com`,
            name: 'Web Architect',
            role: 'ADMIN',
            companyId: company.id
        }
    });

    const context = {
        companyId: company.id,
        userId: user.id,
        userRole: 'admin',
        userPermissions: ['all']
    };

    // -------------------------------------------------------------------------
    // TEST 1: Compile New SaaS Website via UniversalBuilderRegistry
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 1: Compile SaaS Landing Page with AST Persistence ---');
    const compileRes = await UniversalBuilderRegistry.compile('website', {
        prompt: 'Build a high-converting SaaS landing page for Apex Cloud',
        companyId: company.id,
        userId: user.id
    });

    assert(compileRes.success === true, 'Website compilation succeeded', compileRes.title);
    assert(compileRes.entityId && compileRes.entityId.length > 10, 'Valid PostgreSQL UUID entityId returned', compileRes.entityId);
    assert(compileRes.editUrl === `/advertising/${compileRes.entityId}/edit`, 'editUrl links directly to editor', compileRes.editUrl);

    // Verify DB record
    const dbWebsite = await prisma.website.findUnique({ where: { id: compileRes.entityId } });
    assert(dbWebsite !== null, 'Website record saved in PostgreSQL prisma.website', dbWebsite?.name);
    assert(dbWebsite?.config?.version === 2, 'Website config has valid v2 multi-page AST schema');
    assert(Array.isArray(dbWebsite?.config?.pages?.[0]?.sections) && dbWebsite?.config?.pages[0]?.sections.length >= 4, 'Config has rich sections array (Hero, Features, Pricing, CTA, Floating)', `Sections count: ${dbWebsite?.config?.pages[0]?.sections.length}`);

    // Verify Domain Registry
    const domainRecord = await basePrisma.domainRegistry.findFirst({ where: { targetId: compileRes.entityId } });
    assert(domainRecord !== null && domainRecord.domain === dbWebsite?.slug, 'Subdomain registered in basePrisma.domainRegistry', domainRecord?.domain);

    // -------------------------------------------------------------------------
    // TEST 2: Compile Festive Diwali Campaign Website
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Compile Festive Diwali Campaign Website ---');
    const diwaliRes = await UniversalBuilderRegistry.compile('website', {
        prompt: 'Create Diwali special festive offer website with 40% discount',
        companyId: company.id,
        userId: user.id
    });

    assert(diwaliRes.success === true, 'Diwali campaign site compiled successfully', diwaliRes.title);
    const diwaliDbSite = await prisma.website.findUnique({ where: { id: diwaliRes.entityId } });
    assert(diwaliDbSite?.config?.brand?.primaryColor === '#f59e0b', 'Festive amber primary color (#f59e0b) applied to brand');
    assert(diwaliDbSite?.config?.pages[0]?.sections.some((s: any) => s.id.includes('offers')), 'Offers packages grid present in sections AST');

    // -------------------------------------------------------------------------
    // TEST 3: Patch Website Live via patchAST (Conversational Section & Theme Updates)
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Live Patching Existing Website ---');
    const patchRes = await UniversalBuilderRegistry.patch('website', compileRes.entityId, 'Add a customer testimonials review section and switch theme to emerald green', {
        companyId: company.id,
        userId: user.id
    });

    assert(patchRes.success === true, 'Website live patch succeeded', patchRes.reply);
    const updatedDbSite = await prisma.website.findUnique({ where: { id: compileRes.entityId } });
    assert(updatedDbSite?.config?.brand?.primaryColor === '#10b981', 'Emerald green color (#10b981) patched in DB config');
    assert(updatedDbSite?.config?.pages[0]?.sections.some((s: any) => s.id.includes('testimonials')), 'Testimonials section inserted into live sections AST');

    // -------------------------------------------------------------------------
    // TEST 4: Tool Calling Execution via aiToolRegistry
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Tool Calling Execution via create_website ---');
    const toolRes = await aiToolRegistry.executeTool('create_website', {
        title: 'Quantum AI Studio',
        prompt: 'Modern minimalist creative agency website'
    }, context);

    assert(toolRes.success === true, 'create_website tool executed successfully', toolRes.title);
    assert(toolRes.editUrl?.includes('/advertising/'), 'Tool returned valid /advertising/[id]/edit URL', toolRes.editUrl);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 WEBSITE BUILDER TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
    console.log('========================================================================\n');

    if (passed === total) {
        console.log('🎉 ALL WEBSITE SYNTHESIS & LIVE DRAWER TESTS PASSED SUCCESSFULLY!\n');
    } else {
        throw new Error(`Website synthesis test suite failed with ${total - passed} errors.`);
    }
}

runWebsiteSynthesisTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
