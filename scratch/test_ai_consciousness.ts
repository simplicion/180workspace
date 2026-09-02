const { AIDocumentService } = require('../packages/domains/workspace-tools/dist/index.js');
const { prisma } = require('../packages/db/dist/index.js') || require('../packages/db');

async function runTests() {
    console.log('🧪 Starting Multi-Turn Consciousness, Clarification & Rollback Tests...\n');

    let testCompany = await prisma.company.findFirst();
    if (!testCompany) {
        testCompany = await prisma.company.create({
            data: {
                name: '180 Enterprise Corp',
                slug: 'test-corp-' + Date.now(),
                metadata: {
                    aiProvider: 'gemini',
                    geminiKey: 'AIzaSyDemoKey1234567890TestKey',
                    lastAiTestStatus: 'success',
                    lastAiTestDate: new Date()
                }
            }
        });
    } else {
        await prisma.company.update({
            where: { id: testCompany.id },
            data: {
                metadata: {
                    ...(typeof testCompany.metadata === 'object' ? testCompany.metadata : {}),
                    aiProvider: 'gemini',
                    geminiKey: 'AIzaSyDemoKey1234567890TestKey',
                    lastAiTestStatus: 'success',
                    lastAiTestDate: new Date()
                }
            }
        });
    }

    // Scenario 1: Broad contract request -> Clarification Intent (No canvas mutation)
    console.log('--- Scenario 1: Broad Contract Prompt ("i want to create a contract") ---');
    const clarifyRes = await AIDocumentService.generateFromPrompt({
        prompt: 'i want to create a contract',
        companyId: testCompany.id,
        existingBlocks: []
    });
    console.log('Clarify Result:', {
        intent: clarifyRes.intent,
        mode: clarifyRes.mode,
        explanation: clarifyRes.explanation?.substring(0, 95) + '...'
    });
    if (clarifyRes.intent === 'clarify' && clarifyRes.explanation?.includes('Who is the client') && clarifyRes.blocks?.length === 0) {
        console.log('✅ Scenario 1 Passed: AI initiated interactive clarification without touching canvas!\n');
    } else {
        throw new Error('Scenario 1 Failed: ' + JSON.stringify(clarifyRes));
    }

    // Scenario 2: Specific Proposal Generation
    console.log('--- Scenario 2: Detailed Document Request ("Create a project proposal for Acme Corp with 3 milestones and acceptance buttons") ---');
    const docRes = await AIDocumentService.generateFromPrompt({
        prompt: 'Create a project proposal for Acme Corp with 3 milestones and acceptance buttons',
        documentType: 'QUOTATION',
        companyId: testCompany.id,
        existingBlocks: []
    });
    console.log('Document Result:', {
        intent: docRes.intent,
        mode: docRes.mode,
        title: docRes.title,
        blocksCount: docRes.blocks?.length,
        blockTypes: docRes.blocks?.map((b: any) => b.type)
    });
    if (docRes.success && docRes.blocks?.length > 0) {
        console.log('✅ Scenario 2 Passed: Successfully synthesized customized proposal!\n');
    } else {
        throw new Error('Scenario 2 Failed: ' + JSON.stringify(docRes));
    }

    // Scenario 3: Conversational Rollback / Cancellation ("no delte that")
    console.log('--- Scenario 3: Conversational Rollback ("no delte that") ---');
    const rollbackRes = await AIDocumentService.generateFromPrompt({
        prompt: 'no delte that',
        companyId: testCompany.id,
        existingBlocks: docRes.blocks
    });
    console.log('Rollback Result:', {
        intent: rollbackRes.intent,
        mode: rollbackRes.mode,
        explanation: rollbackRes.explanation,
        blocksCount: rollbackRes.blocks?.length
    });
    if (rollbackRes.intent === 'delete' && rollbackRes.mode === 'clear' && rollbackRes.blocks?.length === 0) {
        console.log('✅ Scenario 3 Passed: AI understood conversational typo "no delte that" and cleared canvas!\n');
    } else {
        throw new Error('Scenario 3 Failed: ' + JSON.stringify(rollbackRes));
    }

    console.log('\n🎉 ALL MULTI-TURN CONSCIOUSNESS, CLARIFICATION & ROLLBACK TESTS PASSED!');
    process.exit(0);
}

runTests().catch(err => {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
});
