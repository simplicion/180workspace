import { prisma } from '../packages/db/src/index';
import { FormsService } from '../packages/domains/advertising/src/forms/forms.service';
import assert from 'assert';

async function runFormBuilderTests() {
  console.log('🚀 Starting Enterprise Form Builder Test Suite...\n');
  let testForm: any = null;

  try {
    // ─── TEST 1: Form Creation with Enterprise Fields & API Key ───────────────
    console.log('📌 Test 1: Creating Form with Enterprise Fields & Auto-generated API Key...');
    
    // Find or create test company
    let testCompany = await prisma.company.findFirst();
    if (!testCompany) {
      testCompany = await prisma.company.create({
        data: { name: 'Test Agency Corp', slug: 'test-agency-' + Date.now() }
      });
    }

    testForm = await FormsService.createForm({
      title: 'Enterprise Lead & Intake Form',
      description: 'Test intake form with modern field types and settings',
      companyId: testCompany.id,
      settings: {
        buttonColor: '#059669',
        submitButtonText: 'Claim Free Strategy Session',
        redirectUrl: 'https://example.com/thank-you',
        pixelEventName: 'Lead',
        webhookUrl: 'https://webhook.site/test-180workspace',
        successMessage: 'We received your application!'
      },
      fields: [
        { label: 'Applicant Details', type: 'HEADING', order: 0 },
        { label: 'Full Name', type: 'TEXT', required: true, placeholder: 'John Doe', order: 1 },
        { label: 'Work Email', type: 'EMAIL', required: true, placeholder: 'john@acme.com', order: 2 },
        { label: 'Monthly Ad Budget ($)', type: 'NUMBER', required: true, placeholder: '5000', order: 3 },
        { label: 'Target Launch Date', type: 'DATE', required: false, order: 4 },
        { label: 'Service Level Rating', type: 'RATING', required: false, order: 5 },
        { label: 'Brand Guidelines / Deck', type: 'FILE_UPLOAD', required: false, order: 6 },
        { label: 'Business Vertical', type: 'SELECT', required: true, options: ['E-Commerce', 'B2B SaaS', 'Healthcare', 'Local Service'], order: 7 }
      ]
    });

    assert.ok(testForm.id, 'Form should be created with an ID');
    assert.ok(testForm.apiKey, 'Form should automatically receive a secure apiKey');
    assert.ok(testForm.apiKey.startsWith('fkey_'), 'API key must start with fkey_ prefix');
    assert.strictEqual(testForm.fields.length, 8, 'Form should have exactly 8 fields');
    console.log(`   ✅ Form created successfully: ID=${testForm.id}, API_KEY=${testForm.apiKey}, Slug=${testForm.slug}\n`);

    // ─── TEST 2: Analytics & Page View Counter ─────────────────────────────────
    console.log('📌 Test 2: Public Form View & View Counter Increment...');
    const initialView = await FormsService.getFormBySlug(testForm.slug, true);
    assert.ok(initialView, 'Public form should be found by slug');
    
    // Allow async view counter increment
    await new Promise(r => setTimeout(r, 400));
    const updatedForm = await FormsService.getFormById(testForm.id);
    assert.ok(updatedForm.viewsCount >= 1, `Views count should be >= 1, got ${updatedForm.viewsCount}`);
    console.log(`   ✅ View tracked: viewsCount=${updatedForm.viewsCount}\n`);

    // ─── TEST 3: Public Submission Flow with Rich Field Types ──────────────────
    console.log('📌 Test 3: Submitting Form with File Upload & Rich Values...');
    
    const nameField = testForm.fields.find((f: any) => f.label === 'Full Name');
    const emailField = testForm.fields.find((f: any) => f.label === 'Work Email');
    const budgetField = testForm.fields.find((f: any) => f.label === 'Monthly Ad Budget ($)');
    const fileField = testForm.fields.find((f: any) => f.label === 'Brand Guidelines / Deck');
    const ratingField = testForm.fields.find((f: any) => f.label === 'Service Level Rating');
    const selectField = testForm.fields.find((f: any) => f.label === 'Business Vertical');

    const submissionValues = {
      [nameField.id]: 'Sarah Connor',
      [emailField.id]: 'sarah.connor@sky.net',
      [budgetField.id]: '15000',
      [fileField.id]: { url: 'https://storage.180workspace.com/uploads/pitch-deck.pdf', name: 'pitch-deck.pdf' },
      [ratingField.id]: 5,
      [selectField.id]: 'B2B SaaS'
    };

    const submitResult = await FormsService.submitForm(testForm.slug, submissionValues, {
      ipAddress: '203.0.113.195',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      referrer: 'https://google.com/search?q=agency'
    });

    assert.ok(submitResult.submissionId, 'Submission should return a submissionId');
    assert.strictEqual(submitResult.redirectUrl, 'https://example.com/thank-you', 'Should return custom redirectUrl');
    assert.strictEqual(submitResult.pixelEventName, 'Lead', 'Should return custom pixelEventName');
    console.log(`   ✅ Submission recorded: submissionId=${submitResult.submissionId}, redirect=${submitResult.redirectUrl}\n`);

    // ─── TEST 4: Secure External REST API Submissions Fetching ─────────────────
    console.log('📌 Test 4: External CRM Submissions Fetch API via API Key...');

    // 4a. Without API Key -> Expect Error
    try {
      await FormsService.getFormSubmissionsByApiKey(testForm.id, 'invalid_key');
      assert.fail('Should have thrown an error for invalid API key');
    } catch (err: any) {
      assert.ok(err.message.includes('Invalid') || err.message.includes('Unauthorized'));
      console.log('   ✅ Unauthorized access rejected correctly');
    }

    // 4b. With Valid API Key -> Expect Formatted JSON Data
    const apiResult = await FormsService.getFormSubmissionsByApiKey(testForm.id, testForm.apiKey, { page: 1, limit: 10 });
    assert.strictEqual(apiResult.form.id, testForm.id);
    assert.strictEqual(apiResult.submissions.length, 1);
    assert.strictEqual(apiResult.submissions[0].data['full_name'], 'Sarah Connor');
    assert.strictEqual(apiResult.submissions[0].data['monthly_ad_budget'], '15000');
    assert.ok(apiResult.submissions[0].data['brand_guidelines_deck'].url.includes('pitch-deck.pdf'));
    console.log('   ✅ Submissions JSON payload parsed correctly for external CRMs');

    // ─── TEST 5: API Key Regeneration ──────────────────────────────────────────
    console.log('📌 Test 5: Regenerating Form API Key...');
    const oldApiKey = testForm.apiKey;
    const newApiKey = await FormsService.regenerateApiKey(testForm.id);
    assert.notStrictEqual(oldApiKey, newApiKey, 'New API key must differ from old one');
    assert.ok(newApiKey.startsWith('fkey_'), 'New API key must have fkey_ prefix');
    console.log(`   ✅ Key regenerated: Old=${oldApiKey.slice(0, 12)}... New=${newApiKey.slice(0, 12)}...\n`);

    // ─── TEST 6: CSV Export Engine ─────────────────────────────────────────────
    console.log('📌 Test 6: Generating Submissions CSV Export...');
    const { filename, csv } = await FormsService.exportSubmissionsCsv(testForm.id);
    assert.ok(filename.endsWith('.csv'), 'Filename should end with .csv');
    assert.ok(csv.includes('Submission ID'), 'CSV should contain header Submission ID');
    assert.ok(csv.includes('Sarah Connor'), 'CSV should contain submitted value Sarah Connor');
    assert.ok(csv.includes('pitch-deck.pdf'), 'CSV should contain file attachment link');
    console.log(`   ✅ CSV generated (${csv.split('\n').length} lines), Filename=${filename}\n`);

    // ─── TEST 7: Conversion Rate Calculation ───────────────────────────────────
    console.log('📌 Test 7: Conversion Rate (CVR%) Calculation...');
    const formsList = await FormsService.getForms(testCompany.id);
    const targetFormInList = formsList.find((f: any) => f.id === testForm.id);
    assert.ok(targetFormInList, 'Form should be found in list');
    assert.ok(targetFormInList.conversionRate > 0, `Conversion rate should be calculated, got ${targetFormInList.conversionRate}%`);
    console.log(`   ✅ CVR calculated: ${targetFormInList.conversionRate}%\n`);

    console.log('🎉 ALL 7 ENTERPRISE FORM BUILDER TESTS PASSED PERFECTLY!\n');
  } catch (error) {
    console.error('❌ Test Suite Failed:', error);
    process.exit(1);
  } finally {
    if (testForm) {
      console.log('🧹 Cleaning up test form...');
      await FormsService.deleteForm(testForm.id).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runFormBuilderTests().catch(console.error);
