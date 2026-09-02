const {
    AIProviderService,
    AICompanyConfigService,
    ContextAggregatorService,
    AIDocumentArchitectService,
    AIDocumentChatService,
    AINavigationAgentService,
    Mem0MemoryService
} = require('../packages/domains/ai/dist/index.js');
const { prisma } = require('../packages/db/dist/index.js') || require('../packages/db');

async function runCentralizedAITests() {
    console.log('🧪 Starting Centralized @workspace/ai Domain & Architecture Tests...\n');

    // Find or prepare test company
    let company = await prisma.company.findFirst();
    if (!company) {
        company = await prisma.company.create({
            data: {
                name: '180 Enterprise Labs',
                slug: '180-labs-' + Date.now(),
                metadata: {
                    aiProvider: 'gemini',
                    geminiKey: 'AIzaSyDemoValidFormatKey1234567890Test',
                    lastAiTestStatus: 'success',
                    lastAiTestDate: new Date()
                }
            }
        });
    }

    // Test 1: AICompanyConfigService Status Check
    console.log('--- Test 1: AICompanyConfigService.getStatus ---');
    const status = await AICompanyConfigService.getStatus(company.id);
    console.log('Company AI Status:', status);
    if (status.isConfigured && status.provider === 'gemini' && status.status === 'connected') {
        console.log('✅ Test 1 Passed: Correctly resolved company AI credentials.\n');
    } else {
        throw new Error('Test 1 Failed');
    }

    // Test 2: ContextAggregatorService (God-Level Context Gathering)
    console.log('--- Test 2: ContextAggregatorService.getCompanyContext ---');
    const context = await ContextAggregatorService.getCompanyContext(company.id);
    console.log('Aggregated Workspace Context:', {
        companyName: context.companyName,
        activeProjects: context.activeProjectsCount,
        openTasks: context.openTasksCount,
        clientsSampleCount: context.clients.length,
        employeesSampleCount: context.employees.length
    });
    if (context.companyName && typeof context.activeProjectsCount === 'number') {
        console.log('✅ Test 2 Passed: Successfully aggregated cross-domain workspace snapshot.\n');
    } else {
        throw new Error('Test 2 Failed');
    }

    // Test 3: AIDocumentArchitectService Clarification Intent
    console.log('--- Test 3: AIDocumentArchitectService ("i want to create a contract") ---');
    const clarifyRes = await AIDocumentArchitectService.generate({
        prompt: 'i want to create a contract',
        companyId: company.id
    });
    console.log('Clarification Result:', {
        intent: clarifyRes.intent,
        mode: clarifyRes.mode,
        explanation: clarifyRes.explanation?.substring(0, 90) + '...'
    });
    if (clarifyRes.intent === 'clarify' && clarifyRes.explanation?.includes('Who is the client')) {
        console.log('✅ Test 3 Passed: Interactive multi-turn clarification initiated.\n');
    } else {
        throw new Error('Test 3 Failed');
    }

    // Test 4: AIDocumentArchitectService Detailed Generation
    console.log('--- Test 4: AIDocumentArchitectService ("Create a tax invoice with 18% GST") ---');
    const invoiceRes = await AIDocumentArchitectService.generate({
        prompt: 'Create a tax invoice for software consulting with 18% GST and Razorpay payment button',
        documentType: 'INVOICE',
        companyId: company.id
    });
    console.log('Invoice Generation Result:', {
        intent: invoiceRes.intent,
        mode: invoiceRes.mode,
        title: invoiceRes.title,
        blocksCount: invoiceRes.blocks?.length,
        blockTypes: invoiceRes.blocks?.map((b: any) => b.type)
    });
    if (invoiceRes.success && invoiceRes.blocks?.length > 0) {
        console.log('✅ Test 4 Passed: Schema-strict document synthesized with commercial elements.\n');
    } else {
        throw new Error('Test 4 Failed');
    }

    // Test 5: AIDocumentArchitectService Rollback Intent
    console.log('--- Test 5: AIDocumentArchitectService ("no delte that") ---');
    const rollbackRes = await AIDocumentArchitectService.generate({
        prompt: 'no delte that',
        companyId: company.id,
        existingBlocks: invoiceRes.blocks
    });
    console.log('Rollback Result:', {
        intent: rollbackRes.intent,
        mode: rollbackRes.mode,
        blocksCount: rollbackRes.blocks?.length
    });
    if (rollbackRes.intent === 'delete' && rollbackRes.mode === 'clear' && rollbackRes.blocks?.length === 0) {
        console.log('✅ Test 5 Passed: Conversational rollback cleared canvas accurately.\n');
    } else {
        throw new Error('Test 5 Failed');
    }

    // Test 6: AIDocumentChatService (Uploaded Doc / PDF Analysis)
    console.log('--- Test 6: AIDocumentChatService.analyzeDocument ---');
    const chatDocRes = await AIDocumentChatService.analyzeDocument({
        fileName: 'Master_Services_Agreement_2026.pdf',
        fileText: 'Section 4: Payment Terms. Client shall pay invoices within Net 15 business days. Late payments accrue interest at 1.5% per month. Section 9: IP Rights. Intellectual property transfers upon final payment settlement.',
        query: 'What are the payment terms and interest penalty in this contract?',
        companyId: company.id
    });
    console.log('Doc Analysis Result:', {
        success: chatDocRes.success,
        answer: chatDocRes.answer?.substring(0, 110) + '...'
    });
    if (chatDocRes.success && (chatDocRes.answer.includes('Net 15') || chatDocRes.answer.includes('Payment Terms') || chatDocRes.answer.includes('1.5%'))) {
        console.log('✅ Test 6 Passed: Successfully analyzed document text & extracted terms.\n');
    } else {
        throw new Error('Test 6 Failed');
    }

    // Test 7: AINavigationAgentService (Voice/Mic Command Routing)
    console.log('--- Test 7: AINavigationAgentService.interpretVoiceCommand ---');
    const voiceRes = await AINavigationAgentService.interpretVoiceCommand('Hey AI, create a new contract for Acme Corp', company.id);
    console.log('Voice Command Result:', {
        speechReply: voiceRes.speechReply,
        action: voiceRes.action
    });
    if (voiceRes.success && voiceRes.action?.type === 'NAVIGATE' && voiceRes.action?.targetRoute === '/document-editor') {
        console.log('✅ Test 7 Passed: Successfully routed voice command to Document Editor.\n');
    } else {
        throw new Error('Test 7 Failed');
    }

    console.log('\n🎉 ALL 7/7 CENTRALIZED @workspace/ai DOMAIN & ARCHITECTURE TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
}

runCentralizedAITests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
