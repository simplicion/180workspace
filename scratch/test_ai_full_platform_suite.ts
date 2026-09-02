// @ts-nocheck
import { 
    UniversalBuilderRegistry, 
    aiToolRegistry,
    getPayrollAndSalarySummaryTool, 
    sendDocumentToClientTool,
    generateDocumentAstTool,
    generateFormAstTool,
    createTaskTool,
    batchCreateTasksTool,
    createProjectTool,
    getCrmMetricsTool,
    getFinancialSummaryTool,
    getHrWorkforceSummaryTool,
    searchKnowledgeBaseTool
} from '../packages/domains/ai/src';
import { prisma } from '../packages/db/src';

async function runTestSuite() {
    console.log('========================================================================');
    console.log('🚀 RUNNING COMPREHENSIVE AI FULL-PLATFORM READ/WRITE SUITE');
    console.log('========================================================================\n');

    let passed = 0;
    let failed = 0;

    const company = await prisma.company.findFirst();
    if (!company) {
        console.error('❌ No company found in DB');
        return;
    }
    const user = await prisma.user.findFirst({ where: { companyId: company.id } });
    const context = { companyId: company.id, userId: user?.id, userRole: 'admin' };

    // --- TEST 1: HR & PAYROLL INTELLIGENCE ---
    try {
        console.log('🔹 Test 1: Payroll & Salary 360° Intelligence...');
        const salaryRes = await getPayrollAndSalarySummaryTool.execute({}, context);
        if (salaryRes.authorized && typeof salaryRes.totalMonthlySalaryExpense === 'number') {
            console.log('   ✅ PASS: Payroll Summary retrieved. Active Employees:', salaryRes.totalActiveEmployees, 'Monthly Expense:', salaryRes.totalMonthlySalaryExpense);
            passed++;
        } else {
            console.error('   ❌ FAIL:', salaryRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 2: DOCUMENT AST BUILDER (WRITE) ---
    let testDocId = '';
    try {
        console.log('\n🔹 Test 2: Universal Document Builder (Create AST)...');
        const docRes = await UniversalBuilderRegistry.compile('document', {
            prompt: 'Create 6-month consulting agreement for Acme Inc for 75,000 INR',
            companyId: company.id,
            userId: user?.id
        });
        if (docRes.success && docRes.entityId && docRes.ast.length > 0) {
            testDocId = docRes.entityId;
            console.log('   ✅ PASS: Document created in DB with ID:', testDocId, 'Blocks:', docRes.ast.length);
            passed++;
        } else {
            console.error('   ❌ FAIL:', docRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 3: DOCUMENT AST PATCH (EDIT/MUTATE) ---
    try {
        console.log('\n🔹 Test 3: Universal Document Builder (Patch/Edit AST Block)...');
        const patchRes = await UniversalBuilderRegistry.patch('document', testDocId, 'Add clause for 15-day termination notice', {
            companyId: company.id,
            userId: user?.id
        });
        if (patchRes.success && patchRes.ast.length > 0) {
            console.log('   ✅ PASS: Document patched successfully. New Blocks Count:', patchRes.ast.length);
            passed++;
        } else {
            console.error('   ❌ FAIL:', patchRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 4: DOCUMENT SEND / DISPATCH (SEND) ---
    try {
        console.log('\n🔹 Test 4: Document Send & Dispatch Tool...');
        const sendRes = await sendDocumentToClientTool.execute({
            documentId: testDocId,
            recipientEmail: 'partner@acme.com'
        }, context);
        if (sendRes.success && sendRes.shareUrl) {
            console.log('   ✅ PASS: Document dispatched with token link:', sendRes.shareUrl);
            passed++;
        } else {
            console.error('   ❌ FAIL:', sendRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 5: FORM AST BUILDER (WRITE) ---
    let testFormId = '';
    try {
        console.log('\n🔹 Test 5: Universal Form Builder (Create Form AST)...');
        const formRes = await UniversalBuilderRegistry.compile('form', {
            prompt: 'Create developer onboarding intake form with GitHub URL and experience level',
            companyId: company.id,
            userId: user?.id
        });
        if (formRes.success && formRes.entityId && formRes.ast.length > 0) {
            testFormId = formRes.entityId;
            console.log('   ✅ PASS: Form created in DB with ID:', testFormId, 'Fields:', formRes.ast.length);
            passed++;
        } else {
            console.error('   ❌ FAIL:', formRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 6: WEBSITE AST BUILDER (WRITE) ---
    try {
        console.log('\n🔹 Test 6: Universal Website Builder (Create Layout AST)...');
        const siteRes = await UniversalBuilderRegistry.compile('website', {
            prompt: 'Generate SaaS product landing page with dark theme',
            companyId: company.id,
            userId: user?.id
        });
        if (siteRes.success && siteRes.ast.length > 0) {
            console.log('   ✅ PASS: Website layout synthesized. Sections:', siteRes.ast.length);
            passed++;
        } else {
            console.error('   ❌ FAIL:', siteRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 7: PROJECT & TASKS CREATION (WRITE) ---
    try {
        console.log('\n🔹 Test 7: Project & Task Creation Tools...');
        const projRes = await createProjectTool.execute({
            name: 'AI Full Platform System Q3',
            description: 'Engineering unified autonomous AI operating system across all 180 modules'
        }, context);
        
        const tasksRes = await batchCreateTasksTool.execute({
            tasks: [
                { title: 'Implement Universal AST Builder', priority: 'high' },
                { title: 'Connect Live Payroll Aggregation', priority: 'high' },
                { title: 'Build Interactive Action Cards', priority: 'medium' }
            ]
        }, context);

        if (projRes.projectId && tasksRes.count === 3) {
            console.log('   ✅ PASS: Project created ID:', projRes.projectId, 'Batch Tasks Created:', tasksRes.count);
            passed++;
        } else {
            console.error('   ❌ FAIL:', { projRes, tasksRes });
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 8: CRM & FINANCIAL HEALTH (READ) ---
    try {
        console.log('\n🔹 Test 8: CRM & Financial Health Radar Tools...');
        const [crmRes, finRes, hrRes] = await Promise.all([
            getCrmMetricsTool.execute({}, context),
            getFinancialSummaryTool.execute({}, context),
            getHrWorkforceSummaryTool.execute({}, context)
        ]);
        if (typeof crmRes.totalLeads === 'number' && typeof finRes.totalInvoicesCount === 'number' && typeof hrRes.totalActiveEmployees === 'number') {
            console.log('   ✅ PASS: Full workspace metrics retrieved (Leads:', crmRes.totalLeads, 'Invoices:', finRes.totalInvoicesCount, 'Employees:', hrRes.totalActiveEmployees, ')');
            passed++;
        } else {
            console.error('   ❌ FAIL:', { crmRes, finRes, hrRes });
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 9: ADD EMPLOYEE WITH SALARY (HR WRITE) ---
    let testEmpEmail = `test_engineer_${Date.now()}@example.com`;
    try {
        console.log('\n🔹 Test 9: Add Employee & Salary Configuration Tool...');
        const empRes = await (await import('../packages/domains/ai/src')).addEmployeeTool.execute({
            name: 'Alex Rivera',
            email: testEmpEmail,
            role: 'Senior Fullstack Engineer',
            department: 'Engineering',
            salaryAmount: 95000,
            currency: 'INR'
        }, context);
        if (empRes.success && empRes.employeeId) {
            console.log('   ✅ PASS: Employee added ID:', empRes.employeeId, 'Salary:', empRes.monthlySalary);
            passed++;
        } else {
            console.error('   ❌ FAIL:', empRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 10: CREATE FORMAL INVOICE (FINANCE WRITE) ---
    let testInvoiceId = '';
    try {
        console.log('\n🔹 Test 10: Create Client Invoice Tool...');
        const invRes = await (await import('../packages/domains/ai/src')).createInvoiceTool.execute({
            clientName: 'Nova Global LLC',
            clientEmail: 'billing@novaglobal.com',
            amount: 140000,
            currency: 'INR',
            description: 'AI Autonomous Systems Implementation Milestone 1'
        }, context);
        if (invRes.success && invRes.invoiceId) {
            testInvoiceId = invRes.invoiceId;
            console.log('   ✅ PASS: Invoice created:', invRes.invoiceNumber, 'Amount:', invRes.totalAmount);
            passed++;
        } else {
            console.error('   ❌ FAIL:', invRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 11: LOG EXPENSE TRANSACTION (FINANCE WRITE) ---
    try {
        console.log('\n🔹 Test 11: Log Business Expense Transaction Tool...');
        const expRes = await (await import('../packages/domains/ai/src')).logExpenseTransactionTool.execute({
            title: 'AWS Cloud Infrastructure Q3',
            amount: 12500,
            currency: 'INR',
            category: 'software',
            notes: 'Compute instances and Redis caches'
        }, context);
        if (expRes.success && expRes.expenseId) {
            console.log('   ✅ PASS: Expense logged:', expRes.title, 'Amount:', expRes.amount);
            passed++;
        } else {
            console.error('   ❌ FAIL:', expRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 12: CREATE CRM CLIENT / LEAD (CRM WRITE) ---
    try {
        console.log('\n🔹 Test 12: Create CRM Client / Lead Tool...');
        const clientRes = await (await import('../packages/domains/ai/src')).createCrmClientTool.execute({
            name: 'Sophia Bennett',
            email: `sophia_${Date.now()}@vortex.io`,
            companyName: 'Vortex Dynamics',
            industry: 'SaaS & Enterprise AI',
            status: 'lead'
        }, context);
        if (clientRes.success && clientRes.clientId) {
            console.log('   ✅ PASS: CRM Client created:', clientRes.name, '(', clientRes.companyName, ')');
            passed++;
        } else {
            console.error('   ❌ FAIL:', clientRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 13: UPDATE TASK STATUS (OPERATIONS WRITE) ---
    try {
        console.log('\n🔹 Test 13: Update Task Status & Assignee Tool...');
        const updateTaskRes = await (await import('../packages/domains/ai/src')).updateTaskStatusTool.execute({
            taskTitle: 'Implement Universal AST Builder',
            status: 'done',
            priority: 'high'
        }, context);
        if (updateTaskRes.success) {
            console.log('   ✅ PASS: Task updated to:', updateTaskRes.status);
            passed++;
        } else {
            console.error('   ❌ FAIL:', updateTaskRes);
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    // --- TEST 14: UNIVERSAL CLEANUP / TEARDOWN ---
    try {
        console.log('\n🔹 Test 14: Universal Entity Teardown (Delete/Cleanup)...');
        const [docDel, formDel] = await Promise.all([
            UniversalBuilderRegistry.delete('document', testDocId, company.id),
            UniversalBuilderRegistry.delete('form', testFormId, company.id)
        ]);
        if (docDel.success && formDel.success) {
            console.log('   ✅ PASS: Cleaned up test artifacts (Document & Form deleted from DB)');
            passed++;
        } else {
            console.error('   ❌ FAIL:', { docDel, formDel });
            failed++;
        }
    } catch (e: any) {
        console.error('   ❌ FAIL (Exception):', e.message);
        failed++;
    }

    console.log('\n========================================================================');
    console.log(`📊 FINAL SUITE RESULTS: ${passed} PASSED / ${failed} FAILED (Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log('========================================================================\n');
}

runTestSuite().catch(console.error);
