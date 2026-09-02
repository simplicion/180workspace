const { AIController } = require('../apps/backend/src/api/v1/ai/ai.controller.js') || require('../packages/domains/ai/dist/index.js');
const { prisma } = require('../packages/db/dist/index.js') || require('../packages/db');

async function testBackendAIRoutes() {
    console.log('🧪 Starting Backend /api/v1/ai Controller & Route Integration Tests...\n');

    let company = await prisma.company.findFirst();
    if (!company) {
        company = await prisma.company.create({
            data: {
                name: 'Test Innovation Hub',
                slug: 'test-hub-' + Date.now(),
                metadata: {
                    aiProvider: 'gemini',
                    geminiKey: 'AIzaSyTestValidFormat1234567890Key',
                    lastAiTestStatus: 'success',
                    lastAiTestDate: new Date()
                }
            }
        });
    }

    const createMockReqRes = (body = {}, query = {}, user = { companyId: company.id, id: 'test-user-id', name: 'Test Admin' }) => {
        let statusCode = 200;
        let responseData: any = null;

        const req: any = {
            body,
            query,
            user,
            headers: {}
        };

        const res: any = {
            status: (code: number) => {
                statusCode = code;
                return res;
            },
            json: (data: any) => {
                responseData = data;
                return res;
            }
        };

        return { req, res, getResult: () => ({ statusCode, responseData }) };
    };

    // Test 1: GET /api/v1/ai/status
    console.log('--- Test 1: GET /api/v1/ai/status ---');
    const { req: req1, res: res1, getResult: getRes1 } = createMockReqRes();
    await AIController.getStatus(req1, res1);
    const r1 = getRes1();
    console.log('Status Result:', r1.responseData);
    if (r1.statusCode === 200 && r1.responseData.success && r1.responseData.isConfigured) {
        console.log('✅ Test 1 Passed: AI status correctly returned.\n');
    } else {
        throw new Error('Test 1 Failed');
    }

    // Test 2: POST /api/v1/ai/test-connection
    console.log('--- Test 2: POST /api/v1/ai/test-connection ---');
    const { req: req2, res: res2, getResult: getRes2 } = createMockReqRes({
        provider: 'gemini',
        apiKey: 'AQ.Ab8RN6KMmpoX5...' // OAuth token to test diagnostic detection
    });
    await AIController.testConnection(req2, res2);
    const r2 = getRes2();
    console.log('Test Connection Result (Diagnostics Check):', {
        success: r2.responseData.success,
        message: r2.responseData.message
    });
    if (r2.responseData.message && r2.responseData.message.includes('OAuth Access Token')) {
        console.log('✅ Test 2 Passed: Diagnostic correctly intercepted invalid token format and provided Google AI Studio link.\n');
    } else {
        throw new Error('Test 2 Failed');
    }

    // Test 3: POST /api/v1/ai/chat (Workspace Copilot Mode)
    console.log('--- Test 3: POST /api/v1/ai/chat (Mode: "global") ---');
    const { req: req3, res: res3, getResult: getRes3 } = createMockReqRes({
        prompt: 'What are our active projects and pending tasks right now?',
        mode: 'global'
    });
    await AIController.chat(req3, res3);
    const r3 = getRes3();
    console.log('Chat Result:', {
        success: r3.responseData.success,
        mode: r3.responseData.mode,
        replyPreview: r3.responseData.reply?.substring(0, 100) + '...'
    });
    if (r3.statusCode === 200 && r3.responseData.success && r3.responseData.reply) {
        console.log('✅ Test 3 Passed: Global copilot responded with aggregated workspace data.\n');
    } else {
        throw new Error('Test 3 Failed');
    }

    // Test 4: POST /api/v1/ai/documents/generate (Interactive Clarification)
    console.log('--- Test 4: POST /api/v1/ai/documents/generate ("i want to create a contract") ---');
    const { req: req4, res: res4, getResult: getRes4 } = createMockReqRes({
        prompt: 'i want to create a contract',
        documentType: 'CONTRACT'
    });
    await AIController.generateDocument(req4, res4);
    const r4 = getRes4();
    console.log('Document Architect Result:', {
        intent: r4.responseData.intent,
        mode: r4.responseData.mode
    });
    if (r4.statusCode === 200 && r4.responseData.intent === 'clarify') {
        console.log('✅ Test 4 Passed: Clarification lifecycle triggered.\n');
    } else {
        throw new Error('Test 4 Failed');
    }

    // Test 5: POST /api/v1/ai/crm/email-draft
    console.log('--- Test 5: POST /api/v1/ai/crm/email-draft ---');
    const { req: req5, res: res5, getResult: getRes5 } = createMockReqRes({
        recipientName: 'Sarah Jenkins',
        recipientEmail: 'sarah@acme.corp',
        purpose: 'Follow up on MSA contract review',
        dealValue: '$50,000'
    });
    await AIController.generateEmailDraft(req5, res5);
    const r5 = getRes5();
    console.log('Email Draft Result:', {
        success: r5.responseData.success,
        subject: r5.responseData.draft?.subject
    });
    if (r5.statusCode === 200 && r5.responseData.success && r5.responseData.draft?.subject) {
        console.log('✅ Test 5 Passed: Sales email synthesized successfully.\n');
    } else {
        throw new Error('Test 5 Failed');
    }

    // Test 6: GET /api/v1/ai/analytics/dashboard
    console.log('--- Test 6: GET /api/v1/ai/analytics/dashboard ---');
    const { req: req6, res: res6, getResult: getRes6 } = createMockReqRes();
    await AIController.getDashboardInsights(req6, res6);
    const r6 = getRes6();
    console.log('Dashboard Insights Result:', {
        success: r6.responseData.success,
        healthScore: r6.responseData.insights?.healthScore,
        revenueTrend: r6.responseData.insights?.revenueTrend
    });
    if (r6.statusCode === 200 && r6.responseData.success && typeof r6.responseData.insights?.healthScore === 'number') {
        console.log('✅ Test 6 Passed: Business analytics radar calculated successfully.\n');
    } else {
        throw new Error('Test 6 Failed');
    }

    // Test 7: POST /api/v1/ai/voice/command
    console.log('--- Test 7: POST /api/v1/ai/voice/command ---');
    const { req: req7, res: res7, getResult: getRes7 } = createMockReqRes({
        command: 'Navigate to AI assistant and review health radar'
    });
    await AIController.executeVoiceCommand(req7, res7);
    const r7 = getRes7();
    console.log('Voice Command Result:', {
        success: r7.responseData.success,
        speechReply: r7.responseData.speechReply,
        action: r7.responseData.action
    });
    if (r7.statusCode === 200 && r7.responseData.success && r7.responseData.action?.targetRoute) {
        console.log('✅ Test 7 Passed: Autonomous navigation dispatcher routed command.\n');
    } else {
        throw new Error('Test 7 Failed');
    }

    console.log('🎉 ALL 7/7 BACKEND /api/v1/ai ROUTE & CONTROLLER TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
}

testBackendAIRoutes().catch(err => {
    console.error('❌ Route test failed:', err);
    process.exit(1);
});
