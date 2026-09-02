// @ts-nocheck
import { prisma } from '../packages/db/src';
import { UniversalBuilderRegistry, aiToolRegistry } from '../packages/domains/ai/src';

async function runComprehensive10AppsSuite() {
    console.log('🚀 Starting Universal 10-App Autonomous Lifecycle Test Suite...\n');

    const company = await prisma.company.findFirst();
    if (!company) {
        console.error('❌ No company found in DB');
        return;
    }

    let user = await prisma.user.findFirst({ where: { companyId: company.id } });
    if (!user) {
        user = await prisma.user.findFirst();
    }
    console.log(`👤 Using context user: ${user.name} (${user.email}) | Company: ${company.name}`);

    const adminContext = {
        companyId: company.id,
        userId: user.id,
        userRole: 'admin',
        userPermissions: ['all']
    };

    const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

    // Test 1: Hire Employee (HRMS)
    try {
        console.log('\n--- 1. Testing HRMS: Hire Employee with Offer Letter ---');
        const hireRes = await aiToolRegistry.executeTool('hire_employee', {
            name: 'Aarav Sharma',
            email: 'aarav.sharma@test180.internal',
            role: 'Senior Staff Engineer',
            department: 'AI Systems',
            salaryAmount: 180000
        }, adminContext);

        console.log('Hire Result:', hireRes.message);
        if (hireRes.success && hireRes.documentId) {
            results.push({ test: 'HRMS Hire Employee & Offer Letter', status: 'PASS', details: `Created Aarav Sharma, Doc ID: ${hireRes.documentId}` });
        } else {
            results.push({ test: 'HRMS Hire Employee & Offer Letter', status: 'FAIL', details: JSON.stringify(hireRes) });
        }
    } catch (e: any) {
        results.push({ test: 'HRMS Hire Employee & Offer Letter', status: 'FAIL', details: e.message });
    }

    // Test 2: Terminate Employee (Interactive Selector Directive)
    try {
        console.log('\n--- 2. Testing HRMS: Terminate Employee (Interactive Selector Directive) ---');
        const termSelectorRes = await aiToolRegistry.executeTool('terminate_employee', {}, adminContext);
        console.log('Selector Directive:', termSelectorRes.directive, 'Options Count:', termSelectorRes.options?.length);

        if (termSelectorRes.directive === 'entity_selector' && Array.isArray(termSelectorRes.options) && termSelectorRes.options.length > 0) {
            results.push({ test: 'HRMS Terminate Employee Directive', status: 'PASS', details: `Returned ${termSelectorRes.options.length} employee selection options` });
        } else {
            results.push({ test: 'HRMS Terminate Employee Directive', status: 'FAIL', details: JSON.stringify(termSelectorRes) });
        }
    } catch (e: any) {
        results.push({ test: 'HRMS Terminate Employee Directive', status: 'FAIL', details: e.message });
    }

    // Test 3: Terminate Employee with Specific ID & Experience Certificate
    try {
        console.log('\n--- 3. Testing HRMS: Terminate Employee Execution & Relieving Certificate ---');
        const termExecRes = await aiToolRegistry.executeTool('terminate_employee', {
            employeeName: 'Aarav Sharma',
            reason: 'Project contract completion'
        }, adminContext);

        console.log('Relieving Result:', termExecRes.message);
        if (termExecRes.success && termExecRes.documentId) {
            results.push({ test: 'HRMS Relieving Certificate Generation', status: 'PASS', details: `Doc ID: ${termExecRes.documentId}` });
        } else {
            results.push({ test: 'HRMS Relieving Certificate Generation', status: 'FAIL', details: JSON.stringify(termExecRes) });
        }
    } catch (e: any) {
        results.push({ test: 'HRMS Relieving Certificate Generation', status: 'FAIL', details: e.message });
    }

    // Test 4: Create CRM Lead (CRM & Sales)
    try {
        console.log('\n--- 4. Testing CRM: Create Lead & Pipeline Deal ---');
        const leadRes = await aiToolRegistry.executeTool('create_lead', {
            name: 'Nexus Cloud Technologies',
            companyName: 'Nexus Cloud',
            email: 'sales@nexuscloud.io',
            dealValue: 250000,
            source: 'Inbound Organic Ads'
        }, adminContext);

        console.log('Lead Result:', leadRes.message);
        if (leadRes.success && leadRes.leadId) {
            results.push({ test: 'CRM Create Lead', status: 'PASS', details: `Lead ID: ${leadRes.leadId}` });
        } else {
            results.push({ test: 'CRM Create Lead', status: 'FAIL', details: JSON.stringify(leadRes) });
        }
    } catch (e: any) {
        results.push({ test: 'CRM Create Lead', status: 'FAIL', details: e.message });
    }

    // Test 5: Convert Lead to Client & Draft Contract
    try {
        console.log('\n--- 5. Testing CRM: Convert Lead to Client & Service Contract ---');
        const convRes = await aiToolRegistry.executeTool('convert_lead_to_client', {
            leadName: 'Nexus Cloud Technologies',
            contractAmount: 300000
        }, adminContext);

        console.log('Convert Result:', convRes.message);
        if (convRes.success && convRes.documentId && convRes.projectId) {
            results.push({ test: 'CRM Convert Lead to Client & Contract', status: 'PASS', details: `Project: ${convRes.projectId}, Doc: ${convRes.documentId}` });
        } else {
            results.push({ test: 'CRM Convert Lead to Client & Contract', status: 'FAIL', details: JSON.stringify(convRes) });
        }
    } catch (e: any) {
        results.push({ test: 'CRM Convert Lead to Client & Contract', status: 'FAIL', details: e.message });
    }

    // Test 6: Delete CRM Lead
    try {
        console.log('\n--- 6. Testing CRM: Delete Lead ---');
        const delRes = await aiToolRegistry.executeTool('delete_lead', {
            name: 'Nexus Cloud Technologies'
        }, adminContext);

        console.log('Delete Lead Result:', delRes.message);
        if (delRes.success) {
            results.push({ test: 'CRM Delete Lead', status: 'PASS', details: delRes.message });
        } else {
            results.push({ test: 'CRM Delete Lead', status: 'FAIL', details: JSON.stringify(delRes) });
        }
    } catch (e: any) {
        results.push({ test: 'CRM Delete Lead', status: 'FAIL', details: e.message });
    }

    // Test 7: Advertising Website Builder: Diwali Festival Offer Campaign
    try {
        console.log('\n--- 7. Testing Advertising: Diwali Festival Offer Website Layout ---');
        const diwaliSite = await UniversalBuilderRegistry.compile('website', {
            prompt: 'Build a high converting website for our marketing agency to run ads promoting our Diwali offer with packages and discounts',
            companyId: company.id,
            userId: user.id
        });

        console.log('Diwali Site Title:', diwaliSite.title);
        console.log('Diwali AST Sections Count:', diwaliSite.ast?.length);
        const hasCampaignHero = diwaliSite.ast?.some((s: any) => s.type === 'hero_campaign');

        if (diwaliSite.success && hasCampaignHero) {
            results.push({ test: 'Advertising Diwali Festival Website Builder', status: 'PASS', details: `Title: ${diwaliSite.title}, Sections: ${diwaliSite.ast?.length}` });
        } else {
            results.push({ test: 'Advertising Diwali Festival Website Builder', status: 'FAIL', details: JSON.stringify(diwaliSite) });
        }
    } catch (e: any) {
        results.push({ test: 'Advertising Diwali Festival Website Builder', status: 'FAIL', details: e.message });
    }

    // Test 8: Social Media Management
    try {
        console.log('\n--- 8. Testing Social Media: Multi-Platform Post Scheduling ---');
        const socialRes = await aiToolRegistry.executeTool('schedule_social_post', {
            content: '🚀 Excited to launch our Q4 AI Copilot upgrades across 180 Workspace! #AI #Innovation #Productivity',
            platforms: ['LinkedIn', 'Twitter/X', 'Facebook']
        }, adminContext);

        console.log('Social Post Result:', socialRes.message);
        if (socialRes.success) {
            results.push({ test: 'Social Media Multi-Platform Schedule', status: 'PASS', details: socialRes.message });
        } else {
            results.push({ test: 'Social Media Multi-Platform Schedule', status: 'FAIL', details: JSON.stringify(socialRes) });
        }
    } catch (e: any) {
        results.push({ test: 'Social Media Multi-Platform Schedule', status: 'FAIL', details: e.message });
    }

    // Test 9: Service Desk Support Ticket
    try {
        console.log('\n--- 9. Testing Service Desk: Ticket Dispatch ---');
        const ticketRes = await aiToolRegistry.executeTool('create_support_ticket', {
            subject: 'OAuth SSO Callback Latency in Production',
            description: 'Users reporting 2s delay on SSO callback redirect.',
            priority: 'high'
        }, adminContext);

        console.log('Support Ticket Result:', ticketRes.message);
        if (ticketRes.success && ticketRes.ticketId) {
            results.push({ test: 'Service Desk Ticket Creation', status: 'PASS', details: `Ticket ID: ${ticketRes.ticketId}` });
        } else {
            results.push({ test: 'Service Desk Ticket Creation', status: 'FAIL', details: JSON.stringify(ticketRes) });
        }
    } catch (e: any) {
        results.push({ test: 'Service Desk Ticket Creation', status: 'FAIL', details: e.message });
    }

    // Test 10: Communications: Video Meeting Scheduler
    try {
        console.log('\n--- 10. Testing Communications: Video Meeting Scheduler ---');
        const meetRes = await aiToolRegistry.executeTool('schedule_meeting', {
            title: 'Q4 Product Roadmap & Sprint Demo',
            agenda: 'Review 10-app AI autonomy and AST synthesizer release.'
        }, adminContext);

        console.log('Meeting Result:', meetRes.message);
        if (meetRes.success && meetRes.meetingUrl) {
            results.push({ test: 'Communications Meeting Scheduler', status: 'PASS', details: `Meeting URL: ${meetRes.meetingUrl}` });
        } else {
            results.push({ test: 'Communications Meeting Scheduler', status: 'FAIL', details: JSON.stringify(meetRes) });
        }
    } catch (e: any) {
        results.push({ test: 'Communications Meeting Scheduler', status: 'FAIL', details: e.message });
    }

    // Print summary table
    console.log('\n======================================================');
    console.log('📊 UNIVERSAL 10-APP AUTONOMOUS LIFECYCLE TEST RESULTS');
    console.log('======================================================');
    let passCount = 0;
    results.forEach((r, idx) => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        if (r.status === 'PASS') passCount++;
        console.log(`${icon} [${idx + 1}] ${r.test} -> ${r.status}${r.details ? ` (${r.details})` : ''}`);
    });
    console.log('======================================================');
    console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${results.length - passCount}`);
    console.log('======================================================\n');
}

runComprehensive10AppsSuite().catch(console.error);
