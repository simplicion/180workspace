const fs = require('fs');
const path = require('path');

// Load environment variables directly from apps/backend/.env
try {
  const envContent = fs.readFileSync('C:/Users/saavi/OneDrive/Desktop/180workspace/apps/backend/.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
} catch (e) {}

const http = require('http');
const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('C:/Users/saavi/OneDrive/Desktop/180workspace/node_modules/@prisma/client');
const { FormsService } = require('C:/Users/saavi/OneDrive/Desktop/180workspace/packages/domains/advertising/src/forms/forms.service');

async function run() {
  const prisma = new PrismaClient();

  console.log('================================================================');
  console.log('   🧪 AUDIT: SALES LEAD PIPELINE VS GENERAL DATA CAPTURE      ');
  console.log('================================================================\n');

  const company = await prisma.company.findFirst();
  if (!company) throw new Error('No company found in database.');

  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  const genCode = () => {
    let c = '';
    for (let i = 0; i < 10; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  };

  // 1. CREATE GENERAL DATA CAPTURE ENDPOINT (isSalesActivity: false)
  console.log('--- TEST 1: Create General Data Capture Endpoint (No CRM Deals) ---');
  const code1 = genCode();
  const generalForm = await prisma.form.create({
    data: {
      title: 'Website General Feedback & Survey',
      slug: code1,
      formCode: code1,
      apiKey: `fkey_${crypto.randomBytes(20).toString('hex')}`,
      formType: 'HEADLESS_ENDPOINT',
      companyId: company.id,
      isActive: true,
      settings: {
        isHeadless: true,
        isSalesActivity: false,
        salesSettings: { isSalesActivity: false }
      }
    }
  });
  console.log(`✅ Created General Capture Endpoint: #${generalForm.formCode} (ID: ${generalForm.id})`);

  // Start Express Ingestion test server
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.post('/api/public/capture/:identifier', async (req, res) => {
    try {
      const result = await FormsService.ingestHeadlessSubmission(
        req.params.identifier,
        req.body,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          referrer: req.headers['referer'] || req.headers['origin']
        }
      );
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  const server = app.listen(9994);

  // 2. Submit to General Capture Endpoint
  console.log('\n--- TEST 2: Submit to General Capture Endpoint ---');
  const res1 = await fetch(`http://127.0.0.1:9994/api/public/capture/${generalForm.formCode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice General User',
      email: 'alice.general@example.com',
      feedback_rating: 5,
      comment: 'Great website design!'
    })
  });
  const data1 = await res1.json();
  console.log('Submission Response:', data1);

  if (data1.success && data1.dealId === null) {
    console.log('✅ Passed: General Data Capture ingested data WITHOUT creating CRM Deal (dealId is null).');
  } else {
    console.error('❌ Failed: Deal was unexpectedly created for general capture:', data1);
    server.close();
    process.exit(1);
  }

  // 3. CREATE SALES LEAD CAPTURE ENDPOINT (isSalesActivity: true)
  console.log('\n--- TEST 3: Create Sales Lead Capture Endpoint (Live CRM Sync) ---');
  const code2 = genCode();
  const salesForm = await prisma.form.create({
    data: {
      title: 'Website Inbound Demo Booking Leads',
      slug: code2,
      formCode: code2,
      apiKey: `fkey_${crypto.randomBytes(20).toString('hex')}`,
      formType: 'HEADLESS_ENDPOINT',
      companyId: company.id,
      isActive: true,
      settings: {
        isHeadless: true,
        isSalesActivity: true,
        salesSettings: {
          isSalesActivity: true,
          targetStage: 'Lead',
          defaultDealValue: 5000,
          autoCreateActivity: true
        }
      }
    }
  });
  console.log(`✅ Created Sales Capture Endpoint: #${salesForm.formCode} (ID: ${salesForm.id})`);

  // 4. Submit to Sales Capture Endpoint
  console.log('\n--- TEST 4: Submit to Sales Capture Endpoint ---');
  const res2 = await fetch(`http://127.0.0.1:9994/api/public/capture/${salesForm.formCode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Sales Prospect',
      email: 'bob.prospect@enterprise.com',
      company_name: 'Enterprise Corp',
      budget: 15000
    })
  });
  const data2 = await res2.json();
  console.log('Submission Response:', data2);

  if (data2.success && data2.dealId) {
    console.log(`✅ Passed: Sales Lead Capture ingested data and created CRM Deal #${data2.dealId} in Lead Pipeline!`);
  } else {
    console.error('❌ Failed: Deal was not created for sales capture:', data2);
    server.close();
    process.exit(1);
  }

  // 5. Cleanup & Close Server
  server.close();
  await prisma.form.deleteMany({
    where: { id: { in: [generalForm.id, salesForm.id] } }
  });

  console.log('\n================================================================');
  console.log('   🎯 AUDIT COMPLETE: SALES VS GENERAL ROUTING 100% VERIFIED   ');
  console.log('================================================================\n');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
