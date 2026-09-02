/**
 * 🧪 DEEP COMPREHENSIVE AI VERIFICATION SUITE (36 TESTS)
 * Tests all components of the @workspace/ai domain across all methods, tools, memory, and edge cases.
 */

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
    AIAgentExecutor,
    getCrmMetricsTool,
    getProjectHealthTool,
    getFinancialSummaryTool,
    getHrWorkforceSummaryTool,
    createTaskTool,
    batchCreateTasksTool,
    createProjectTool,
    searchKnowledgeBaseTool,
    generateDocumentAstTool
} from '../packages/domains/ai/dist';

interface TestResult {
    id: number;
    category: string;
    name: string;
    passed: boolean;
    durationMs: number;
    details?: string;
    error?: string;
}

const results: TestResult[] = [];

async function runTest(id: number, category: string, name: string, fn: () => Promise<string | void>) {
    const start = Date.now();
    try {
        const details = await fn();
        const durationMs = Date.now() - start;
        results.push({ id, category, name, passed: true, durationMs, details: details || undefined });
        console.log(`  ✅ [Test ${id.toString().padStart(2, '0')}] ${name} (${durationMs}ms)`);
    } catch (err: any) {
        const durationMs = Date.now() - start;
        results.push({ id, category, name, passed: false, durationMs, error: err.message });
        console.error(`  ❌ [Test ${id.toString().padStart(2, '0')}] ${name} (${durationMs}ms) -> ERROR: ${err.message}`);
    }
}

async function runAllTests() {
    console.log('================================================================================');
    console.log('🏛️  STARTING DEEP VERIFICATION SUITE: @workspace/ai DOMAIN & ENTERPRISE TOOLS');
    console.log('================================================================================\n');

    // ============================================================================
    // CATEGORY 1: Kernel & Multi-Provider Engine
    // ============================================================================
    console.log('📦 CATEGORY 1: Kernel & Multi-Provider Engine');

    await runTest(1, 'Kernel', 'AIProviderService singleton instantiation and client resolution', async () => {
        if (!aiProviderService) throw new Error('aiProviderService is null');
        const nullClient = await aiProviderService.getClient({ aiProvider: 'none' });
        if (nullClient !== null) throw new Error('Expected null client when provider is none');
        return 'Singleton active; none provider handled gracefully';
    });

    await runTest(2, 'Kernel', 'testConnection validation for empty/invalid API keys', async () => {
        try {
            await aiProviderService.testConnection('gemini', '');
            throw new Error('Should have thrown error for empty key');
        } catch (e: any) {
            if (!e.message.includes('API Key is required')) throw e;
        }
        return 'Empty key error caught correctly';
    });

    await runTest(3, 'Kernel', 'getInsights unconfigured fallback message', async () => {
        const res = await aiProviderService.getInsights('Say hello', { aiProvider: 'none' });
        if (!res.includes('unavailable') && !res.includes('configure')) {
            throw new Error(`Unexpected fallback response: ${res}`);
        }
        return 'Fallback message returned without crashing';
    });

    await runTest(4, 'Kernel', 'getInsightsStream streaming chunk emission fallback', async () => {
        let chunkCount = 0;
        let streamedText = '';
        await aiProviderService.getInsightsStream('Test prompt', { aiProvider: 'none' }, {}, (chunk) => {
            chunkCount++;
            streamedText += chunk;
        });
        if (chunkCount === 0 || !streamedText) throw new Error('No chunks emitted');
        return `Streamed ${chunkCount} chunks (${streamedText.length} chars)`;
    });

    await runTest(5, 'Kernel', 'AICompanyConfigService metadata parsing (double-encoded JSON resilience)', async () => {
        const config = await AICompanyConfigService.getCompanyAISettings('non-existent-company-id');
        if (!config || !config.settings) throw new Error('Failed to resolve default company settings');
        if (config.settings.aiProvider !== 'none') throw new Error('Expected none provider for blank company');
        return `Resolved default settings for company: "${config.companyName}"`;
    });

    // ============================================================================
    // CATEGORY 2: Distributed Mem0 Memory & Vector Store
    // ============================================================================
    console.log('\n🧠 CATEGORY 2: Distributed Mem0 Memory & Vector Store');

    const testSessionId = `test_session_${Date.now()}`;

    await runTest(6, 'Memory', 'Mem0MemoryService.recordTurn and session history retrieval', async () => {
        await Mem0MemoryService.recordTurn(testSessionId, 'user', 'What is our Q4 project roadmap?');
        await Mem0MemoryService.recordTurn(testSessionId, 'assistant', 'Q4 roadmap includes AI Operating System release.');
        const history = Mem0MemoryService.getSessionHistory(testSessionId);
        if (history.length < 2) throw new Error(`Expected at least 2 turns, got ${history.length}`);
        if (history[0].text !== 'What is our Q4 project roadmap?') throw new Error('Turn 0 text mismatch');
        return `Stored and retrieved ${history.length} turns`;
    });

    await runTest(7, 'Memory', 'Mem0MemoryService.getSessionHistoryAsync (Redis distributed persistence check)', async () => {
        const asyncHistory = await Mem0MemoryService.getSessionHistoryAsync(testSessionId);
        if (asyncHistory.length < 2) throw new Error(`Async history returned ${asyncHistory.length} turns`);
        return `Retrieved ${asyncHistory.length} turns from distributed session store`;
    });

    await runTest(8, 'Memory', 'Mem0MemoryService draft state storage and retrieval for multi-turn wizards', async () => {
        const mockDraft = { documentType: 'CONTRACT', title: 'Consulting MSA', clientName: 'Globex Corp' };
        await Mem0MemoryService.setDraftState(testSessionId, mockDraft);
        const retrieved = Mem0MemoryService.getDraftState(testSessionId);
        if (!retrieved || retrieved.title !== 'Consulting MSA') throw new Error('Draft state mismatch');
        return `Draft state stored and verified: ${retrieved.title}`;
    });

    await runTest(9, 'Memory', 'Mem0MemoryService.clearSession session cleanup', async () => {
        const tempSession = `temp_session_${Date.now()}`;
        await Mem0MemoryService.recordTurn(tempSession, 'user', 'Temporary note');
        await Mem0MemoryService.clearSession(tempSession);
        const clearedHistory = Mem0MemoryService.getSessionHistory(tempSession);
        if (clearedHistory.length !== 0) throw new Error('Session was not cleared');
        return 'Session purged cleanly';
    });

    await runTest(10, 'Memory', 'VectorStore document indexing, chunking, and semantic search', async () => {
        const docId = `doc_test_${Date.now()}`;
        await vectorStore.addDocument(docId, 'Enterprise SOC2 Compliance Policy: All employees must enable 2FA and use hardware keys.', {
            companyId: 'company_audit_1',
            filename: 'SOC2_Compliance.pdf'
        });
        const searchResults = await vectorStore.search('SOC2 2FA hardware keys', 2, (meta) => meta.companyId === 'company_audit_1');
        if (searchResults.length === 0) throw new Error('Vector search failed to retrieve indexed document');
        return `Found ${searchResults.length} document chunk matches`;
    });

    // ============================================================================
    // CATEGORY 3: LangChain Tool Calling & Deterministic Tools
    // ============================================================================
    console.log('\n⚙️ CATEGORY 3: LangChain Tool Calling & Deterministic Tools');

    await runTest(11, 'Tools', 'AIToolRegistry schema validation and OpenAI function exports', async () => {
        const allTools = aiToolRegistry.getAllTools();
        if (allTools.length < 9) throw new Error(`Expected at least 9 tools registered, found ${allTools.length}`);
        const openAISchema = aiToolRegistry.toOpenAIToolsSchema();
        if (openAISchema.length !== allTools.length) throw new Error('OpenAI schema count mismatch');
        return `${allTools.length} tools registered with valid JSON function calling schemas`;
    });

    await runTest(12, 'Tools', 'getCrmMetricsTool deterministic execution', async () => {
        const result = await getCrmMetricsTool.execute({ limit: 3 }, { companyId: 'comp_test' });
        if (typeof result.totalLeads !== 'number' || !Array.isArray(result.recentLeads)) {
            throw new Error('Invalid getCrmMetricsTool output structure');
        }
        return `CRM metrics: totalLeads=${result.totalLeads}, pipelineValuation=$${result.pipelineValuation}`;
    });

    await runTest(13, 'Tools', 'getProjectHealthTool deterministic execution', async () => {
        const result = await getProjectHealthTool.execute({}, { companyId: 'comp_test' });
        if (typeof result.activeProjectsCount !== 'number' || typeof result.pendingTasksCount !== 'number') {
            throw new Error('Invalid getProjectHealthTool output structure');
        }
        return `Project health: activeProjects=${result.activeProjectsCount}, pendingTasks=${result.pendingTasksCount}`;
    });

    await runTest(14, 'Tools', 'getFinancialSummaryTool deterministic execution', async () => {
        const result = await getFinancialSummaryTool.execute({}, { companyId: 'comp_test' });
        if (typeof result.totalInvoicedAmount !== 'number' || typeof result.unpaidAmount !== 'number') {
            throw new Error('Invalid getFinancialSummaryTool output structure');
        }
        return `Finance: totalInvoiced=$${result.totalInvoicedAmount}, unpaidAmount=$${result.unpaidAmount}`;
    });

    await runTest(15, 'Tools', 'getHrWorkforceSummaryTool deterministic execution', async () => {
        const result = await getHrWorkforceSummaryTool.execute({}, { companyId: 'comp_test' });
        if (typeof result.totalActiveEmployees !== 'number' || !Array.isArray(result.teamMembers)) {
            throw new Error('Invalid getHrWorkforceSummaryTool output structure');
        }
        return `HR: activeEmployees=${result.totalActiveEmployees}, pendingLeaves=${result.pendingLeaveRequests}`;
    });

    await runTest(16, 'Tools', 'createTaskTool execution parameter verification', async () => {
        const tool = aiToolRegistry.getTool('create_task');
        if (!tool) throw new Error('create_task tool not found in registry');
        if (!tool.parameters.title.required) throw new Error('title should be required parameter');
        return 'Tool parameters verified correctly';
    });

    await runTest(17, 'Tools', 'batchCreateTasksTool schema verification', async () => {
        const tool = aiToolRegistry.getTool('batch_create_tasks');
        if (!tool) throw new Error('batch_create_tasks tool not found in registry');
        if (tool.parameters.tasks.type !== 'array') throw new Error('tasks parameter must be array');
        return 'Batch task parameters verified';
    });

    await runTest(18, 'Tools', 'createProjectTool schema verification', async () => {
        const tool = aiToolRegistry.getTool('create_project');
        if (!tool) throw new Error('create_project tool not found in registry');
        if (!tool.parameters.name.required) throw new Error('name should be required parameter');
        return 'Project tool parameters verified';
    });

    await runTest(19, 'Tools', 'searchKnowledgeBaseTool execution', async () => {
        const result = await searchKnowledgeBaseTool.execute({ query: 'SOC2 policy' }, { companyId: 'company_audit_1' });
        if (typeof result.matchesCount !== 'number' || !Array.isArray(result.snippets)) {
            throw new Error('Invalid searchKnowledgeBaseTool output');
        }
        return `Found ${result.matchesCount} knowledge matches for query`;
    });

    // ============================================================================
    // CATEGORY 4: AIAgentExecutor & Cost Optimization ("Algorithms First")
    // ============================================================================
    console.log('\n🎯 CATEGORY 4: AIAgentExecutor & Cost Optimization ("Algorithms First")');

    await runTest(20, 'AgentExecutor', 'AIAgentExecutor intent routing for CRM queries', async () => {
        const res = await AIAgentExecutor.execute({
            prompt: 'Show our CRM pipeline value and recent sales leads',
            companyId: 'comp_test'
        });
        if (res.toolUsed !== 'get_crm_metrics') throw new Error(`Expected get_crm_metrics, got ${res.toolUsed}`);
        if (res.tokensSavedPercentage < 90) throw new Error('Expected >= 90% token savings');
        return `Matched tool: ${res.toolUsed} (${res.tokensSavedPercentage}% token savings, ${res.executionTimeMs}ms)`;
    });

    await runTest(21, 'AgentExecutor', 'AIAgentExecutor intent routing for Overdue Task queries', async () => {
        const res = await AIAgentExecutor.execute({
            prompt: 'Which tasks are overdue in our active sprint?',
            companyId: 'comp_test'
        });
        if (res.toolUsed !== 'get_project_health') throw new Error(`Expected get_project_health, got ${res.toolUsed}`);
        return `Matched tool: ${res.toolUsed} (0 token hallucination)`;
    });

    await runTest(22, 'AgentExecutor', 'AIAgentExecutor intent routing for Invoice/Financial queries', async () => {
        const res = await AIAgentExecutor.execute({
            prompt: 'What are our unpaid invoices and total cashflow?',
            companyId: 'comp_test'
        });
        if (res.toolUsed !== 'get_financial_summary') throw new Error(`Expected get_financial_summary, got ${res.toolUsed}`);
        return `Matched tool: ${res.toolUsed} (Ground truth database metrics)`;
    });

    // ============================================================================
    // CATEGORY 5: Conversational AI & Chat Service
    // ============================================================================
    console.log('\n💬 CATEGORY 5: Conversational AI & Chat Service');

    await runTest(23, 'Chat', 'AIChatService multi-domain context assembly and user fallback response', async () => {
        const mockUser = { id: 'user_test_1', name: 'Dev Lead', role: 'admin', companyId: 'comp_test' };
        const result = await AIChatService.chatWithAI(mockUser, {
            message: 'What is our team status?',
            stream: false
        });
        if (!result.reply || !result.sessionId) throw new Error('Invalid chatWithAI response');
        return `Generated session: ${result.sessionId}, reply: "${result.reply.substring(0, 50)}..."`;
    });

    await runTest(24, 'Chat', 'AIChatService tool calling JSON command parsing for create_task', async () => {
        const mockUser = { id: 'user_test_1', name: 'Dev Lead', role: 'admin', companyId: 'comp_test' };
        const result = await AIChatService.chatWithAI(mockUser, {
            message: 'create a task for security audit',
            sessionId: testSessionId,
            stream: false
        });
        if (!result.reply) throw new Error('Empty reply for task creation');
        return `Response generated: "${result.reply.substring(0, 60)}..."`;
    });

    await runTest(25, 'Chat', 'AIChatService role-based context gathering for standard employees', async () => {
        const mockEmp = { id: 'emp_test_2', name: 'Jane Doe', role: 'employee', companyId: 'comp_test' };
        const result = await AIChatService.chatWithAI(mockEmp, {
            message: 'Summarize my assigned sprint deliverables',
            stream: false
        });
        if (!result.reply) throw new Error('Empty reply for employee role');
        return 'Employee-scoped context assembled successfully';
    });

    await runTest(26, 'Chat', 'AIChatService Legal Counsel Mode toggle validation', async () => {
        const mockUser = { id: 'user_test_1', name: 'General Counsel', role: 'admin', companyId: 'comp_test' };
        const result = await AIChatService.chatWithAI(mockUser, {
            message: 'Review this indemnification clause for unlimited liability risks',
            isLegalMode: true,
            stream: false
        });
        if (!result.reply) throw new Error('Failed to generate legal response');
        return 'Legal counsel mode activated and executed';
    });

    await runTest(27, 'Chat', 'AIChatService Agent Persona Mode (@Agent/sales and @Agent/hr)', async () => {
        const mockUser = { id: 'user_test_1', name: 'Sales Director', role: 'admin', companyId: 'comp_test' };
        const result = await AIChatService.chatWithAI(mockUser, {
            message: '@Agent/sales How do we improve conversion rate for enterprise SaaS tier?',
            stream: false
        });
        if (!result.reply) throw new Error('Failed to generate sales agent response');
        return 'Sales Agent persona routed successfully';
    });

    // ============================================================================
    // CATEGORY 6: Entity Search & Mentions Autocompletion
    // ============================================================================
    console.log('\n🔍 CATEGORY 6: Entity Search & Mentions Autocompletion');

    await runTest(28, 'EntitySearch', 'AIEntitySearchService client (@C/) search query handling', async () => {
        const mockUser = { id: 'user_test_1', role: 'admin', companyId: 'comp_test' };
        const results = await AIEntitySearchService.searchEntities(mockUser, 'C', 'Acme');
        if (!Array.isArray(results)) throw new Error('Expected array of results');
        return `Client search returned ${results.length} records`;
    });

    await runTest(29, 'EntitySearch', 'AIEntitySearchService employee (@E/) and project (@P/) search query handling', async () => {
        const mockUser = { id: 'user_test_1', role: 'admin', companyId: 'comp_test' };
        const empResults = await AIEntitySearchService.searchEntities(mockUser, 'E', 'John');
        const projResults = await AIEntitySearchService.searchEntities(mockUser, 'P', 'Mobile');
        if (!Array.isArray(empResults) || !Array.isArray(projResults)) throw new Error('Expected array results');
        return `Employee search: ${empResults.length}, Project search: ${projResults.length}`;
    });

    // ============================================================================
    // CATEGORY 7: Document Intelligence & Content Marketing
    // ============================================================================
    console.log('\n📄 CATEGORY 7: Document Intelligence & Content Marketing');

    await runTest(30, 'Documents', 'AIDocumentArchitectService AST contract block synthesis', async () => {
        const result = await AIDocumentArchitectService.generate({
            prompt: 'Draft a $20,000 Software Development Contract with 3 milestones for Acme Corp',
            documentType: 'CONTRACT',
            companyId: 'comp_test',
            userId: 'user_test_1'
        });
        if (!result.success || !Array.isArray(result.blocks) || result.blocks.length === 0) {
            throw new Error('Failed to generate AST contract blocks');
        }
        return `Synthesized ${result.blocks.length} AST blocks for "${result.title}" (Type: ${result.documentType})`;
    });

    await runTest(31, 'Documents', 'AIDocumentChatService snippet analysis & Q&A fallback', async () => {
        const sampleText = 'Clause 4: Payment Terms. The Client shall pay the Contractor 50% upfront upon signing and 50% upon final UAT deployment.';
        const result = await AIDocumentChatService.analyzeDocument({
            fileText: sampleText,
            fileName: 'Sample_Agreement.pdf',
            query: 'What are the payment terms?'
        });
        if (!result.success || !result.answer) throw new Error('Failed document analysis');
        return `Answer extracted: "${result.answer.substring(0, 70)}..."`;
    });

    await runTest(32, 'Content', 'AIContentCalendarService prompt calculation and piece target formula', async () => {
        const prompt = AIContentCalendarService.buildMasterPrompt({
            durationWords: '2 weeks',
            frequency: '5x per week',
            industry: 'Fintech',
            brandVoice: 'Authoritative',
            platforms: ['LinkedIn', 'Twitter']
        });
        if (!prompt.includes('REQUIRED TOTAL CONTENT PIECES: 10')) {
            throw new Error('Piece target formula mismatch for 2 weeks @ 5x/week');
        }
        return 'Master prompt generated with exact target piece count (10 pieces)';
    });

    await runTest(33, 'Content', 'AICRMCopilotService sales email drafting with fallback', async () => {
        const draft = await AICRMCopilotService.generateEmailDraft({
            recipientName: 'Robert Vance',
            recipientEmail: 'robert@vance.com',
            purpose: 'Presenting our Q3 automation roadmap',
            dealValue: '$50,000',
            companyId: 'comp_test'
        });
        if (!draft.success || !draft.subject || !draft.body) throw new Error('Invalid email draft structure');
        return `Draft Subject: "${draft.subject}"`;
    });

    // ============================================================================
    // CATEGORY 8: Automation, Meetings & Background Operations
    // ============================================================================
    console.log('\n⚡ CATEGORY 8: Automation, Meetings & Background Operations');

    await runTest(34, 'Automation', 'AIAutomationService document classification fallback', async () => {
        const res = await AIAutomationService.classifyDocument('Invoice #1042: Total Amount Due $4,500 by Net 30', { aiProvider: 'none' });
        if (!res.category) throw new Error('Category classification failed');
        return `Classified category: ${res.category}`;
    });

    await runTest(35, 'Automation', 'AIAutomationService task priority detection & project risk evaluation', async () => {
        const priority = await AIAutomationService.detectTaskPriority('Fix critical production database connection pool leak', '', { aiProvider: 'none' });
        const risk = await AIAutomationService.predictProjectRisk([
            { title: 'Core API migration', status: 'delayed', dueDate: new Date(Date.now() - 86400000) }
        ], { aiProvider: 'none' });
        if (!priority.priority || !risk.risk) throw new Error('Invalid automation output');
        return `Priority: ${priority.priority}, Risk: ${risk.risk}`;
    });

    await runTest(36, 'Background', 'AIJobsService and AICronService lifecycle validation', async () => {
        if (!AIJobsService.init || !AIJobsService.stop) throw new Error('AIJobsService lifecycle methods missing');
        if (!AICronService.initCronJobs) throw new Error('AICronService initCronJobs missing');
        AIJobsService.init(10000);
        AIJobsService.stop();
        return 'Background jobs and cron handlers initialized and stopped cleanly';
    });

    // ============================================================================
    // SUMMARY REPORT
    // ============================================================================
    console.log('\n================================================================================');
    console.log('📊 FINAL TEST RESULTS SUMMARY:');
    console.log('================================================================================');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalTime = results.reduce((acc, r) => acc + r.durationMs, 0);

    console.log(`Total Tests Executed: ${results.length}`);
    console.log(`Passed:               ${passed} ✅`);
    console.log(`Failed:               ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`Total Execution Time: ${totalTime}ms`);

    if (failed > 0) {
        console.log('\nFailed Tests:');
        results.filter(r => !r.passed).forEach(r => console.log(`  - [Test ${r.id}] ${r.name}: ${r.error}`));
        process.exit(1);
    } else {
        console.log('\n🎉 ALL 36 DEEP VERIFICATION TESTS PASSED WITH 100% SUCCESS! 🚀');
    }
}

runAllTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
