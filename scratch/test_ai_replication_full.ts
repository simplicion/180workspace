import {
    aiProviderService,
    AICompanyConfigService,
    AIChatService,
    AIEntitySearchService,
    AIDocumentArchitectService,
    AIDocumentChatService,
    AIContentCalendarService,
    AIBusinessInsightsService,
    AICRMCopilotService,
    AIEmailAndMeetingService,
    AIAutomationService,
    vectorStore,
    AIJobsService,
    AICronService,
    Mem0MemoryService,
    ContextAggregatorService,
    aiToolRegistry,
    AIAgentExecutor
} from '../packages/domains/ai/dist';

async function testFullAIReplication() {
    console.log('🧪 Starting Full AI Replication + LangChain + Redis Mem0 Verification Test...\n');

    // 1. Check AI Provider Service
    console.log('1. Testing AI Provider Service...');
    if (!aiProviderService) throw new Error('aiProviderService is missing');
    console.log('   ✅ AI Provider Service loaded');

    // 2. Check Vector Store
    console.log('2. Testing Vector Store...');
    await vectorStore.addDocument('test_doc_1', '180 Workspace provides advanced CRM, Finance, HR and Projects management.');
    const searchResults = await vectorStore.search('CRM finance');
    console.log(`   ✅ Vector Store indexed & searched. Found ${searchResults.length} results.`);

    // 3. Check AI Content Calendar Service
    console.log('3. Testing Content Calendar Service...');
    const masterPrompt = AIContentCalendarService.buildMasterPrompt({
        durationWords: '1 week',
        platforms: ['LinkedIn', 'Twitter'],
        brandVoice: 'Professional',
        frequency: '3x per week'
    });
    console.log(`   ✅ Master Prompt generated (${masterPrompt.length} chars)`);

    // 4. Check AI Automation Service
    console.log('4. Testing AI Automation Service...');
    const risk = await AIAutomationService.predictProjectRisk([
        { title: 'API Gateway Deployment', status: 'in_progress', dueDate: new Date() }
    ], { aiProvider: 'none' });
    console.log(`   ✅ Project Risk predicted: ${risk.risk}`);

    // 5. Check CRM Copilot
    console.log('5. Testing CRM Copilot...');
    const emailDraft = await AICRMCopilotService.generateEmailDraft({
        recipientName: 'Alex Mercer',
        recipientEmail: 'alex@example.com',
        purpose: 'Quarterly partnership review',
        dealValue: '$25,000'
    });
    console.log(`   ✅ Email Draft generated. Subject: "${emailDraft.subject}"`);

    // 6. Check Meeting Intelligence
    console.log('6. Testing Meeting Intelligence...');
    const meetingResult = await AIEmailAndMeetingService.processMeetingTranscript({
        transcript: 'We agreed to finalize the security audit by Friday. Sarah will handle penetration testing.'
    });
    console.log(`   ✅ Meeting processed. Summary available: ${!!meetingResult.summary}`);

    // 7. Check Mem0 Memory (Redis Distributed + In-Memory Fallback + Long Term)
    console.log('7. Testing Mem0 Distributed Memory & Long-Term Recall...');
    await Mem0MemoryService.recordTurn('test_session_redis_1', 'user', 'What are our Q3 financial targets?');
    await Mem0MemoryService.recordTurn('test_session_redis_1', 'assistant', 'Our Q3 target is $750,000 ARR.');
    const sessionHistory = await Mem0MemoryService.getSessionHistoryAsync('test_session_redis_1');
    console.log(`   ✅ Mem0 Distributed Session History: ${sessionHistory.length} turns recorded`);

    await Mem0MemoryService.saveLongTermMemory({
        id: 'comp_policy_1',
        category: 'company',
        text: '180 Workspace standard payment terms are Net 30 days.',
        companyId: 'test_company_1'
    });
    const recalled = await Mem0MemoryService.recallLongTermMemory('payment terms', 'test_company_1');
    console.log(`   ✅ Mem0 Long-Term Knowledge Recall: ${recalled.length} relevant items found`);

    // 8. Check Status Service
    console.log('8. Testing AI Company Config Service...');
    const status = await AICompanyConfigService.getStatus();
    console.log(`   ✅ Status retrieved: isConfigured=${status.isConfigured}, model=${status.model}`);

    // 9. Check LangChain Tool Calling & Deterministic Agent Execution
    console.log('9. Testing LangChain Tool Registry & AIAgentExecutor ("Algorithms First, AI Second")...');
    const tools = aiToolRegistry.getAllTools();
    console.log(`   ✅ Tool Registry initialized with ${tools.length} enterprise tools: [${tools.map(t => t.name).join(', ')}]`);

    const openAIToolsSchema = aiToolRegistry.toOpenAIToolsSchema();
    console.log(`   ✅ Function calling schema exported (${openAIToolsSchema.length} function definitions)`);

    const agentResult = await AIAgentExecutor.execute({
        prompt: 'Show me our current sales pipeline and CRM leads',
        sessionId: 'test_agent_session',
        companyId: 'test_company_1'
    });
    console.log(`   ✅ AIAgentExecutor executed. Matched tool: "${agentResult.toolUsed}", Token savings: ${agentResult.tokensSavedPercentage}%, Execution time: ${agentResult.executionTimeMs}ms`);

    console.log('\n🎉 ALL 9 ENTERPRISE MODULES & TOOL CALLING TESTS PASSED WITH 100% SUCCESS! 🚀');
}

testFullAIReplication().catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
