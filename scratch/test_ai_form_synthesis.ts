// @ts-nocheck
import { prisma } from '../packages/db/src';
import { UniversalBuilderRegistry } from '../packages/domains/ai/src/builders';
import { aiToolRegistry } from '../packages/domains/ai/src/tools/ai-tool-registry';
import '../packages/domains/ai/src/tools/builtin-tools';

async function runFormSynthesisTests() {
    console.log('\n========================================================================');
    console.log('🚀 180 WORKSPACE AI FORM BUILDER & LIVE SYNTHESIS TEST SUITE');
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
        data: { name: 'Forms Test Org', slug: 'forms-test-org' }
    });

    const user = await prisma.user.findFirst({ where: { companyId: company.id } }) || await prisma.user.create({
        data: {
            email: `form_architect_${Date.now()}@example.com`,
            name: 'Form Architect',
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
    // TEST 1: Compile Candidate Job Application Form
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 1: Compile Candidate Job Application Form ---');
    const jobFormRes = await UniversalBuilderRegistry.compile('form', {
        prompt: 'Create a candidate job application form with resume file upload, experience, and role select',
        companyId: company.id,
        userId: user.id
    });

    assert(jobFormRes.success === true, 'Job application form compilation succeeded', jobFormRes.title);
    assert(jobFormRes.entityId && jobFormRes.entityId.length > 10, 'Valid PostgreSQL UUID entityId returned', jobFormRes.entityId);
    assert(jobFormRes.editUrl === `/forms/${jobFormRes.entityId}`, 'editUrl links directly to /forms/[id]', jobFormRes.editUrl);

    // Verify DB record
    const dbForm = await prisma.form.findUnique({
        where: { id: jobFormRes.entityId },
        include: { fields: true }
    });
    assert(dbForm !== null, 'Form record saved in PostgreSQL prisma.form', dbForm?.title);
    assert(Array.isArray(dbForm?.fields) && dbForm?.fields.length >= 6, 'Form contains rich questions in prisma.formField', `Questions count: ${dbForm?.fields.length}`);
    assert(dbForm?.fields.some(f => f.type === 'FILE_UPLOAD'), 'Resume File Upload question included in form fields');

    // -------------------------------------------------------------------------
    // TEST 2: Compile Festive Diwali Contest & Lead Pass Form
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Compile Festive Diwali Special Contest Form ---');
    const diwaliFormRes = await UniversalBuilderRegistry.compile('form', {
        prompt: 'Build a festive Diwali promotional contest form with 40% discount vouchers and WhatsApp number',
        companyId: company.id,
        userId: user.id
    });

    assert(diwaliFormRes.success === true, 'Diwali contest form compiled successfully', diwaliFormRes.title);
    const diwaliDbForm = await prisma.form.findUnique({
        where: { id: diwaliFormRes.entityId },
        include: { fields: true }
    });
    assert(diwaliDbForm?.settings?.buttonColor === '#ea580c', 'Festive amber/orange primary accent color applied');
    assert(diwaliDbForm?.fields.some(f => f.type === 'PHONE'), 'WhatsApp Phone number field included');

    // -------------------------------------------------------------------------
    // TEST 3: Live Patching Form (Adding 5-Star Rating & Switching to Emerald Green)
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Live Patching Existing Form ---');
    const patchRes = await UniversalBuilderRegistry.patch('form', jobFormRes.entityId, 'Switch theme to emerald green and add a 5-star experience rating question', {
        companyId: company.id,
        userId: user.id
    });

    assert(patchRes.success === true, 'Form live patch succeeded', patchRes.reply);
    const updatedDbForm = await prisma.form.findUnique({
        where: { id: jobFormRes.entityId },
        include: { fields: true }
    });
    assert(updatedDbForm?.settings?.buttonColor === '#059669', 'Emerald green color (#059669) patched in DB settings');
    assert(updatedDbForm?.fields.some(f => f.type === 'RATING'), 'Rating question successfully added to form in DB');

    // -------------------------------------------------------------------------
    // TEST 4: Tool Calling Execution via create_form
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Tool Calling Execution via create_form ---');
    const toolRes = await aiToolRegistry.executeTool('create_form', {
        title: 'Customer NPS Survey',
        prompt: 'Build a customer NPS and feedback satisfaction survey'
    }, context);

    assert(toolRes.success === true, 'create_form tool executed successfully', toolRes.title);
    assert(toolRes.editUrl?.startsWith('/forms/'), 'Tool returned valid /forms/[id] URL', toolRes.editUrl);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 FORM BUILDER TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
    console.log('========================================================================\n');

    if (passed === total) {
        console.log('🎉 ALL FORM SYNTHESIS & LIVE DRAWER TESTS PASSED SUCCESSFULLY!\n');
    } else {
        throw new Error(`Form synthesis test suite failed with ${total - passed} errors.`);
    }
}

runFormSynthesisTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
