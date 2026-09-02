// @ts-nocheck
import { prisma } from '../packages/db/src';
import { aiToolRegistry, AIRole } from '../packages/domains/ai/src/tools/ai-tool-registry';
import '../packages/domains/ai/src/tools/builtin-tools'; // Registers all 39 tools

async function runRBACTestSuite() {
    console.log('\n========================================================================');
    console.log('🚀 180 WORKSPACE ZERO-TRUST AI RBAC & DUAL-PERSONA TEST SUITE');
    console.log('========================================================================\n');

    let passedTests = 0;
    let totalTests = 0;

    function assert(condition: boolean, testName: string, detail?: string) {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  ✅ [PASS] ${testName}`);
            if (detail) console.log(`     └─ ${detail}`);
        } else {
            console.error(`  ❌ [FAIL] ${testName}`);
            if (detail) console.error(`     └─ Reason: ${detail}`);
        }
    }

    // 1. Setup Test Workspace & Ensure Real DB Personas
    const company = await prisma.company.findFirst() || await prisma.company.create({
        data: { name: 'Dual Persona Test Org', slug: 'dual-persona-test' }
    });

    const adminUser = await prisma.user.upsert({
        where: { email: 'ceo@testorg.com' },
        update: { role: 'ADMIN', companyId: company.id },
        create: {
            email: 'ceo@testorg.com',
            name: 'Alex Executive',
            role: 'ADMIN',
            companyId: company.id
        }
    });

    const employeeUser = await prisma.user.upsert({
        where: { email: 'emma.developer@testorg.com' },
        update: { role: 'EMPLOYEE', companyId: company.id },
        create: {
            email: 'emma.developer@testorg.com',
            name: 'Emma Engineer',
            role: 'EMPLOYEE',
            companyId: company.id
        }
    });

    const adminContext = {
        companyId: company.id,
        userId: adminUser.id,
        userRole: 'admin' as AIRole,
        userPermissions: ['all']
    };

    const employeeContext = {
        companyId: company.id,
        userId: employeeUser.id,
        userRole: 'employee' as AIRole,
        userPermissions: ['employee:read', 'employee:self_service']
    };

    // -------------------------------------------------------------------------
    // TEST 1: Tool Registry Role Filtering & Prompt Masking
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 1: Role-Based Tool Visibility & Prompt Masking ---');
    const adminTools = aiToolRegistry.getToolsForUser(adminContext.userRole, adminContext.userPermissions);
    const employeeTools = aiToolRegistry.getToolsForUser(employeeContext.userRole, employeeContext.userPermissions);

    assert(adminTools.length >= 35, 'Admin gets all platform tools in tool registry', `Admin tool count: ${adminTools.length}`);
    assert(employeeTools.length < adminTools.length, 'Employee gets restricted tool subset', `Employee tool count: ${employeeTools.length}`);

    const employeePrompt = aiToolRegistry.toSystemPromptDescriptionForUser(employeeContext.userRole, employeeContext.userPermissions);
    assert(!employeePrompt.includes('terminate_employee'), 'Employee prompt does not reveal "terminate_employee"');
    assert(!employeePrompt.includes('get_payroll_summary'), 'Employee prompt does not reveal "get_payroll_summary"');
    assert(!employeePrompt.includes('delete_project'), 'Employee prompt does not reveal "delete_project"');
    assert(employeePrompt.includes('get_my_tasks'), 'Employee prompt includes self-service "get_my_tasks"');
    assert(employeePrompt.includes('feature_navigation_guide'), 'Employee prompt includes "feature_navigation_guide"');

    // -------------------------------------------------------------------------
    // TEST 2: Executive Admin Autonomous Execution
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Executive Admin Full Autonomous Powers ---');
    const adminTaskRes = await aiToolRegistry.executeTool('create_task', {
        title: 'Executive Architecture Review',
        description: 'Review Q4 scaling roadmap with engineering leads',
        priority: 'high'
    }, adminContext);
    assert(adminTaskRes.success === true, 'Admin can create platform tasks', adminTaskRes.message);

    const adminPayrollRes = await aiToolRegistry.executeTool('get_payroll_summary', {}, adminContext);
    assert(adminPayrollRes.success === true && adminPayrollRes.unauthorized !== true, 'Admin can view company payroll summary', adminPayrollRes.message);

    // -------------------------------------------------------------------------
    // TEST 3: Employee Self-Service & Workplace Companion
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Employee Self-Service & Companion Operations ---');
    
    // Seed an assigned task for Emma
    await prisma.task.create({
        data: {
            title: 'Implement OAuth2 PKCE Flow',
            description: 'Add standard PKCE authorization for mobile clients',
            priority: 'high',
            status: 'in_progress',
            companyId: company.id,
            creatorId: adminUser.id,
            assigneeId: employeeUser.id
        }
    }).catch(() => null);

    const myTasksRes = await aiToolRegistry.executeTool('get_my_tasks', {}, employeeContext);
    assert(myTasksRes.success === true, 'Employee can fetch their personal assigned tasks', myTasksRes.message);
    assert(myTasksRes.message?.includes('OAuth2 PKCE Flow') || (myTasksRes.tasks && myTasksRes.tasks.length > 0) || myTasksRes.count > 0, 'Personal tasks accurately returned for employee');

    const leaveBalanceRes = await aiToolRegistry.executeTool('check_my_leave_balance', {}, employeeContext);
    assert(leaveBalanceRes.success === true && leaveBalanceRes.remainingDays !== undefined, 'Employee can check remaining leave balance', leaveBalanceRes.message);

    const timeLogRes = await aiToolRegistry.executeTool('log_my_timesheet', {
        description: 'Refactored backend auth service',
        hoursSpent: 4
    }, employeeContext);
    assert(timeLogRes.success === true, 'Employee can log their own timesheet hours', timeLogRes.message);

    // -------------------------------------------------------------------------
    // TEST 4: Employee Interactive Feature Walkthrough Guide
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Interactive Feature Walkthrough Guide ---');
    const guideRes = await aiToolRegistry.executeTool('feature_navigation_guide', {
        featureName: 'tasks'
    }, employeeContext);
    assert(guideRes.directive === 'feature_guide', 'Feature guide tool returns structured "feature_guide" directive', guideRes.title);
    assert(Array.isArray(guideRes.steps) && guideRes.steps.length > 0, 'Feature guide provides step-by-step walkthrough array', `Steps count: ${guideRes.steps?.length}`);
    assert(guideRes.url === '/tasks', 'Feature guide provides direct application deep link', `URL: ${guideRes.url}`);

    // -------------------------------------------------------------------------
    // TEST 5: Non-Bypassable Server-Side Zero-Trust Security Gates
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Zero-Trust Security Guard Rejection on Employee Attacks ---');
    
    // Attack 1: Standard Employee attempts to terminate someone
    const terminateAttack = await aiToolRegistry.executeTool('terminate_employee', {
        employeeName: 'Bob Builder',
        reason: 'Malicious employee injection'
    }, employeeContext);
    assert(terminateAttack.success === false && terminateAttack.unauthorized === true, 'Server blocks standard employee from terminating employees', terminateAttack.message);

    // Attack 2: Standard Employee attempts to read company payroll
    const payrollAttack = await aiToolRegistry.executeTool('get_payroll_summary', {}, employeeContext);
    assert(payrollAttack.success === false && payrollAttack.unauthorized === true, 'Server blocks standard employee from viewing company payroll', payrollAttack.message);

    // Attack 3: Standard Employee attempts to delete a project
    const deleteProjectAttack = await aiToolRegistry.executeTool('delete_project', {
        name: 'Dual Persona Test Org'
    }, employeeContext);
    assert(deleteProjectAttack.success === false && deleteProjectAttack.unauthorized === true, 'Server blocks standard employee from deleting projects', deleteProjectAttack.message);

    // -------------------------------------------------------------------------
    // TEST 6: Employee with Departmental Permission Pack (e.g. HR Representative)
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Employee with Granular HR Permission Pack ---');
    const hrEmployeeContext = {
        companyId: company.id,
        userId: employeeUser.id,
        userRole: 'employee' as AIRole,
        userPermissions: ['hrms:all', 'hrms:hire']
    };

    // 1. HR Employee has permission to hire an employee
    const hrHireRes = await aiToolRegistry.executeTool('hire_employee', {
        name: 'Tara Joshi',
        email: 'tara.joshi@testorg.com',
        role: 'Frontend Engineer',
        department: 'Engineering'
    }, hrEmployeeContext);
    assert(hrHireRes.success === true && hrHireRes.unauthorized !== true, 'Employee with HR permission pack can execute hire_employee', hrHireRes.message);

    // 2. HR Employee is STILL BLOCKED from destructive root admin actions (e.g., delete_project)
    const hrDeleteProjectAttack = await aiToolRegistry.executeTool('delete_project', {
        name: 'Dual Persona Test Org'
    }, hrEmployeeContext);
    assert(hrDeleteProjectAttack.success === false && hrDeleteProjectAttack.unauthorized === true, 'Employee with HR pack is still strictly blocked from deleting projects', hrDeleteProjectAttack.message);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('========================================================================\n');

    if (passedTests === totalTests) {
        console.log('🎉 ALL ZERO-TRUST RBAC & DUAL-PERSONA TESTS COMPLETED SUCCESSFULLY!\n');
    } else {
        throw new Error(`Test suite failed with ${totalTests - passedTests} failures.`);
    }
}

runRBACTestSuite().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
