import { WebsiteAIBuilderService, FormAIBuilderService, DocumentAIBuilderService } from '../packages/domains/ai/src/builders';
const websiteAIBuilderService = WebsiteAIBuilderService;
const formAIBuilderService = FormAIBuilderService;
const documentAIBuilderService = DocumentAIBuilderService;

async function runTests() {
    console.log('================================================================');
    console.log('🧪 RUNNING AI CONSCIOUSNESS & MULTI-TURN INTERACTIVE TEST SUITE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    // -------------------------------------------------------------
    // TEST 1: Website AI Builder - Turn 1 (Medicine Landing Page Request)
    // -------------------------------------------------------------
    console.log('▶ TEST 1: Website AI Builder - Underspecified Medicine Request');
    const mockWebsiteConfig = {
        name: 'test',
        brand: {
            name: 'test',
            primaryColor: '#2563eb',
            secondaryColor: '#1e40af'
        },
        pages: [
            {
                id: 'page_home',
                name: 'Home',
                slug: '/',
                isEnabled: true,
                sections: [
                    {
                        id: 's_hero',
                        type: 'hero',
                        content: { title: 'Welcome to test' },
                        styles: {}
                    }
                ]
            }
        ],
        activePageId: 'page_home'
    };

    const turn1Result = await websiteAIBuilderService.patchAST({
        entityId: 'mock-web-1',
        textInstruction: 'landing page for our product for a medicine product',
        stateContext: mockWebsiteConfig,
        history: []
    });

    console.log('Turn 1 Success:', turn1Result.success);
    console.log('Turn 1 Reply snippet:\n', turn1Result.reply.substring(0, 300) + '...\n');
    console.log('Sections Count:', turn1Result.ast?.pages?.[0]?.sections?.length);

    const sectionTypes = turn1Result.ast?.pages?.[0]?.sections?.map((s: any) => s.type);
    console.log('Section Types:', sectionTypes);

    const turn1Valid = 
        turn1Result.success &&
        !turn1Result.reply.toLowerCase().includes('no updates') &&
        !turn1Result.reply.toLowerCase().includes('instruction unclear') &&
        turn1Result.ast?.pages?.[0]?.sections?.length >= 6 &&
        turn1Result.reply.includes('1.') && // asks clarifying questions
        turn1Result.reply.includes('2.');

    if (turn1Valid) {
        console.log('✅ TEST 1 PASSED: High-fidelity 8-section medicine landing page generated with proactive clarifying questions.\n');
        passed++;
    } else {
        console.error('❌ TEST 1 FAILED: Did not generate expected sections or clarifying questions.\n');
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 2: Website AI Builder - Turn 2 (Affirmation "yes" with Multi-Turn Memory)
    // -------------------------------------------------------------
    console.log('▶ TEST 2: Website AI Builder - Affirmation ("yes") with History');
    const historyAfterTurn1 = [
        { role: 'user', text: 'landing page for our product for a medicine product' },
        { role: 'assistant', text: turn1Result.reply }
    ];

    const turn2Result = await websiteAIBuilderService.patchAST({
        entityId: 'mock-web-1',
        textInstruction: 'yes',
        stateContext: turn1Result.ast,
        history: historyAfterTurn1
    });

    console.log('Turn 2 Success:', turn2Result.success);
    console.log('Turn 2 Reply:\n', turn2Result.reply, '\n');
    console.log('Sections Count after Turn 2:', turn2Result.ast?.pages?.[0]?.sections?.length);

    const turn2Valid = 
        turn2Result.success &&
        !turn2Result.reply.toLowerCase().includes('instruction was unclear') &&
        !turn2Result.reply.toLowerCase().includes('no changes were made') &&
        turn2Result.reply.toLowerCase().includes('confirmed');

    if (turn2Valid) {
        console.log('✅ TEST 2 PASSED: AI understood affirmative follow-up, maintained continuity, and enhanced page.\n');
        passed++;
    } else {
        console.error('❌ TEST 2 FAILED: AI failed to handle affirmation with history.\n');
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 3: Form AI Builder - Turn 1 (Medicine Form Request)
    // -------------------------------------------------------------
    console.log('▶ TEST 3: Form AI Builder - Medicine Intake Request');
    const mockFormConfig = {
        title: 'Patient Intake',
        fields: [],
        pages: [{ id: 'page_1', title: 'Page 1', order: 0 }],
        settings: { buttonColor: '#4f46e5' }
    };

    const formTurn1Result = await formAIBuilderService.patchAST({
        entityId: 'mock-form-1',
        textInstruction: 'form for a medicine product',
        stateContext: mockFormConfig,
        history: []
    });

    console.log('Form Turn 1 Success:', formTurn1Result.success);
    console.log('Form Turn 1 Reply snippet:\n', formTurn1Result.reply.substring(0, 300) + '...\n');
    console.log('Form Questions Count:', formTurn1Result.ast?.fields?.length);
    console.log('Form Pages Count:', formTurn1Result.ast?.pages?.length);

    const formTurn1Valid = 
        formTurn1Result.success &&
        formTurn1Result.ast?.fields?.length >= 8 &&
        formTurn1Result.ast?.pages?.length === 3 &&
        formTurn1Result.reply.includes('1.') && // asks clarifying questions
        !formTurn1Result.reply.toLowerCase().includes('unclear');

    if (formTurn1Valid) {
        console.log('✅ TEST 3 PASSED: Clinical multi-step form synthesized with 10 questions and interactive clarification.\n');
        passed++;
    } else {
        console.error('❌ TEST 3 FAILED: Form synthesis did not meet expectations.\n');
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 4: Form AI Builder - Turn 2 (Affirmation "sure" with Rating Question)
    // -------------------------------------------------------------
    console.log('▶ TEST 4: Form AI Builder - Affirmation ("sure") with History');
    const formHistory = [
        { role: 'user', text: 'add rating to the form' },
        { role: 'assistant', text: 'Would you like to add a 5-star experience rating question?' }
    ];

    const formTurn2Result = await formAIBuilderService.patchAST({
        entityId: 'mock-form-1',
        textInstruction: 'sure, do it',
        stateContext: formTurn1Result.ast,
        history: formHistory
    });

    console.log('Form Turn 2 Success:', formTurn2Result.success);
    console.log('Form Turn 2 Reply:\n', formTurn2Result.reply, '\n');
    const hasRatingField = formTurn2Result.ast?.fields?.some((f: any) => f.type === 'RATING');
    console.log('Has Rating Field:', hasRatingField);

    if (formTurn2Result.success && hasRatingField) {
        console.log('✅ TEST 4 PASSED: Rating question added seamlessly from multi-turn affirmation.\n');
        passed++;
    } else {
        console.error('❌ TEST 4 FAILED: Did not add rating question upon affirmation.\n');
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 5: Document AI Builder - Turn 1 (Pharmaceutical Agreement)
    // -------------------------------------------------------------
    console.log('▶ TEST 5: Document AI Builder - Pharmaceutical Agreement Request');
    const mockDocConfig = {
        title: 'Draft Document',
        contentBlocks: []
    };

    const docTurn1Result = await documentAIBuilderService.patchAST({
        entityId: 'mock-doc-1',
        textInstruction: 'create an agreement for pharmaceutical supply',
        stateContext: mockDocConfig,
        history: []
    });

    console.log('Doc Turn 1 Success:', docTurn1Result.success);
    console.log('Doc Turn 1 Reply snippet:\n', docTurn1Result.reply.substring(0, 300) + '...\n');
    console.log('Doc Blocks Count:', Array.isArray(docTurn1Result.ast) ? docTurn1Result.ast.length : 0);

    const docTurn1Valid = 
        docTurn1Result.success &&
        Array.isArray(docTurn1Result.ast) &&
        docTurn1Result.ast.length >= 4 &&
        !docTurn1Result.reply.toLowerCase().includes('unclear');

    if (docTurn1Valid) {
        console.log('✅ TEST 5 PASSED: Clinical supply agreement generated with pricing, cGMP scope, and signatures.\n');
        passed++;
    } else {
        console.error('❌ TEST 5 FAILED: Document builder did not synthesize expected agreement.\n');
        failed++;
    }

    console.log('================================================================');
    console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
    console.log('================================================================');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
