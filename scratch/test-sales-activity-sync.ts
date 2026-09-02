import { prisma } from '../packages/db/src/index';
import { FormsService } from '../packages/domains/advertising/src/forms/forms.service';

async function runSalesActivityTestSuite() {
  console.log('🚀 Starting Sales Activity Form & CRM Pipeline Test Suite...\n');

  let surveyFormId: string | null = null;
  let salesFormId: string | null = null;
  let createdClientId: string | null = null;
  let createdDealId: string | null = null;

  try {
    // 0. Get a test company
    const company = await prisma.company.findFirst();
    if (!company) throw new Error('No company found in database for testing');
    console.log(`🏢 Using Company: ${company.name} (${company.id})`);

    // ──────────────────────────────────────────────────────────────────────────
    // 📌 Test 1: General Survey Form - NO CRM Clutter
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test 1: Testing General Survey Form (No CRM Pollution)...');
    const surveyForm = await FormsService.createForm({
      companyId: company.id,
      title: 'Customer Satisfaction Survey 2026',
      formType: 'GENERAL_SURVEY',
      settings: {
        isSalesActivity: false
      },
      fields: [
        { label: 'Full Name', type: 'TEXT', required: true, mapping: 'name' },
        { label: 'Email', type: 'EMAIL', required: true, mapping: 'email' },
        { label: 'Feedback Rating', type: 'RATING', required: false }
      ]
    });
    surveyFormId = surveyForm.id;
    console.log(`   ✅ Survey Form Created: ID=${surveyForm.id}, FormCode=${surveyForm.formCode}, Type=${surveyForm.formType}`);

    // Submit Survey Form
    const surveySubRes = await FormsService.submitForm(surveyForm.slug, {
      [surveyForm.fields[0].id]: 'Survey Respondent',
      [surveyForm.fields[1].id]: 'survey.user@test-example.com',
      [surveyForm.fields[2].id]: 5
    });
    console.log(`   ✅ Survey submission saved: SubmissionID=${surveySubRes.submissionId}`);

    // Verify submission has NO leadId
    const surveySubmission = await prisma.formSubmission.findUnique({
      where: { id: surveySubRes.submissionId }
    });
    if (surveySubmission?.leadId) {
      throw new Error(`Expected NO leadId for survey form, but got: ${surveySubmission.leadId}`);
    }
    console.log('   ✅ Confirmed: General Survey does NOT create unwanted CRM Deals or pollute sales pipeline');

    // ──────────────────────────────────────────────────────────────────────────
    // 📌 Test 2: Sales Activity Form - Full Pipeline, Form ID & Timeline Log
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test 2: Testing Sales Activity Form (Auto CRM Deal & Timeline Sync)...');
    const salesForm = await FormsService.createForm({
      companyId: company.id,
      title: 'Enterprise Growth Inquiry',
      formType: 'SALES_ACTIVITY',
      formCode: 'FORM-GROWTH-2026',
      settings: {
        isSalesActivity: true,
        salesSettings: {
          isSalesActivity: true,
          targetStage: 'Qualified',
          defaultDealValue: 7500,
          autoCreateActivity: true
        }
      },
      fields: [
        { label: 'Contact Name', type: 'TEXT', required: true, mapping: 'name' },
        { label: 'Business Email', type: 'EMAIL', required: true, mapping: 'email' },
        { label: 'Phone', type: 'PHONE', required: false, mapping: 'phone' },
        { label: 'Company Name', type: 'TEXT', required: false, mapping: 'company' },
        { label: 'Estimated Monthly Budget', type: 'NUMBER', required: false, mapping: 'budget' },
        { label: 'Project Scope', type: 'TEXTAREA', required: false }
      ]
    });
    salesFormId = salesForm.id;
    console.log(`   ✅ Sales Activity Form Created: ID=${salesForm.id}, Code=${salesForm.formCode}, Type=${salesForm.formType}`);

    // Submit Sales Activity Form
    const salesSubRes = await FormsService.submitForm(salesForm.slug, {
      [salesForm.fields[0].id]: 'Marcus Vance',
      [salesForm.fields[1].id]: 'marcus.vance@acmecorp.com',
      [salesForm.fields[2].id]: '+1 (555) 789-0123',
      [salesForm.fields[3].id]: 'Acme Robotics Corp',
      [salesForm.fields[4].id]: 12000,
      [salesForm.fields[5].id]: 'Looking to scale Google & Meta ad campaigns by 300% in Q3.'
    }, {
      ipAddress: '198.51.100.42',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      referrer: 'https://google.com/search?q=enterprise+ad+agency'
    });

    console.log(`   ✅ Sales Form Submitted: SubmissionID=${salesSubRes.submissionId}`);

    // Verify submission is linked to Client & Deal
    const salesSubmission = await prisma.formSubmission.findUnique({
      where: { id: salesSubRes.submissionId }
    });

    if (!salesSubmission?.leadId || !salesSubmission?.clientId) {
      throw new Error(`Expected linked leadId and clientId, got: leadId=${salesSubmission?.leadId}, clientId=${salesSubmission?.clientId}`);
    }
    createdDealId = salesSubmission.leadId;
    createdClientId = salesSubmission.clientId;
    console.log(`   ✅ Submission successfully linked: DealID=${createdDealId}, ClientID=${createdClientId}`);

    // ──────────────────────────────────────────────────────────────────────────
    // 📌 Test 3: Verify Deal in CRM Kanban Pipeline with Form Attribution Tags
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test 3: Verifying Deal Attributes & Form Tags in CRM Pipeline...');
    const deal = await prisma.deal.findUnique({
      where: { id: createdDealId }
    });

    if (!deal) throw new Error('Created deal not found in database');
    console.log(`   ✅ Deal Found: Title="${deal.title}", Stage=${deal.stage}, Value=$${deal.value}`);

    if (deal.stage !== 'Qualified') {
      throw new Error(`Expected stage to be 'Qualified', but got '${deal.stage}'`);
    }

    if (deal.value !== 7500) {
      throw new Error(`Expected default deal value 7500, but got ${deal.value}`);
    }

    const tags = (deal.tags as any[]) || [];
    const formTag = tags.find(t => t.formCode === 'FORM-GROWTH-2026' || t.formId === salesForm.id);
    if (!formTag) {
      throw new Error(`Expected form attribution tag with code FORM-GROWTH-2026, got: ${JSON.stringify(tags)}`);
    }
    console.log(`   ✅ Confirmed: Deal has Form Attribution Tag: ${JSON.stringify(formTag)}`);

    // ──────────────────────────────────────────────────────────────────────────
    // 📌 Test 4: Verify SalesActivity Timeline Log
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test 4: Verifying Automated SalesActivity Timeline Entry...');
    const activity = await prisma.salesActivity.findFirst({
      where: { dealId: createdDealId, type: 'form_submission' }
    });

    if (!activity) {
      throw new Error('Expected SalesActivity entry of type "form_submission", but none found');
    }

    console.log(`   ✅ SalesActivity Log Found (ID: ${activity.id}):`);
    console.log(`      Status: ${activity.status}`);
    console.log(`      Notes Preview: ${activity.notes?.substring(0, 80)}...`);

    if (!activity.notes?.includes('FORM-GROWTH-2026') || !activity.notes?.includes('Marcus Vance')) {
      throw new Error('SalesActivity notes missing expected form code or lead details');
    }
    console.log('   ✅ Confirmed: Sales reps have full visibility into submitted answers on lead timeline');

    // ──────────────────────────────────────────────────────────────────────────
    // 📌 Test 5: External CRM API Fetch Verification
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test 5: Verifying External CRM REST API with Form Code & Type...');
    const apiResult = await FormsService.getFormSubmissionsByApiKey(salesForm.slug, salesForm.apiKey!);
    
    if (apiResult.form.formCode !== 'FORM-GROWTH-2026' || apiResult.form.formType !== 'SALES_ACTIVITY') {
      throw new Error(`API returned unexpected form metadata: ${JSON.stringify(apiResult.form)}`);
    }

    if (apiResult.submissions.length === 0 || apiResult.submissions[0].leadId !== createdDealId) {
      throw new Error('API submissions missing linked leadId');
    }
    console.log(`   ✅ External REST API verified: returned FormCode=${apiResult.form.formCode}, LeadID=${apiResult.submissions[0].leadId}`);

    console.log('\n🎉 ALL 5 SALES ACTIVITY & CRM PIPELINE TESTS PASSED PERFECTLY!\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    // Clean up test data
    console.log('🧹 Cleaning up test records...');
    if (createdDealId) {
      await prisma.salesActivity.deleteMany({ where: { dealId: createdDealId } }).catch(() => {});
      await prisma.deal.delete({ where: { id: createdDealId } }).catch(() => {});
    }
    if (createdClientId) {
      await prisma.client.delete({ where: { id: createdClientId } }).catch(() => {});
    }
    if (surveyFormId) {
      await FormsService.deleteForm(surveyFormId).catch(() => {});
    }
    if (salesFormId) {
      await FormsService.deleteForm(salesFormId).catch(() => {});
    }
    console.log('✨ Cleanup complete.\n');
  }
}

runSalesActivityTestSuite();
