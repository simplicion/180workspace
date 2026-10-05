import { corePrisma } from '@workspace/db-180core';
import crypto from 'crypto';

const PROJECT_ID = process.env.TRAFFIC_DIRECTOR_PROJECT_ID || '7697a348-7550-4229-9595-08ba67aa9755';
const CLIENT_ID = process.env.TRAFFIC_DIRECTOR_CLIENT_ID || '180_client_b26aee801c22cb3295f041ff2a3597db';
const CLIENT_SECRET = process.env.TRAFFIC_DIRECTOR_CLIENT_SECRET || `180_secret_${crypto.randomBytes(24).toString('hex')}`;
const WEBHOOK_SECRET = process.env.TRAFFIC_DIRECTOR_WEBHOOK_SECRET || `whsec_${crypto.randomBytes(20).toString('hex')}`;

async function main() {
  console.log('--- Setting up 180 Traffic Director Credentials & Plans in 180 Core Database ---');

  const secretHash = crypto.createHash('sha256').update(CLIENT_SECRET).digest('hex');
  console.log('Computed Secret Hash:', secretHash);

  const app = await corePrisma.oAuthApp.findFirst({
    where: {
      OR: [
        { id: PROJECT_ID },
        { clientId: CLIENT_ID },
      ],
    },
  });

  if (!app) {
    console.error('❌ Could not find OAuth app with id or clientId');
    process.exit(1);
  }

  console.log(`Found app: "${app.name}" (${app.id}) with clientId: ${app.clientId}`);

  const redirectUris = Array.from(new Set([
    ...(app.redirectUris || []),
    'http://localhost:3000/callback',
    'http://localhost:3006/callback',
    'http://localhost:3009/callback',
    'http://localhost:3002/callback',
    'https://traffic-director.180workspace.com/callback',
    'https://trafficdirector.180workspace.com/callback',
    'https://traffic.180workspace.com/callback',
    'https://*.180workspace.com/callback',
  ]));

  const allowedOrigins = Array.from(new Set([
    ...(app.allowedOrigins || []),
    'http://localhost:3000',
    'http://localhost:3006',
    'http://127.0.0.1:3006',
    'http://localhost:3009',
    'http://127.0.0.1:3009',
    'http://localhost:3002',
    'https://traffic-director.180workspace.com',
    'https://trafficdirector.180workspace.com',
    'https://traffic.180workspace.com',
    'https://*.180workspace.com',
  ]));

  const updatedApp = await corePrisma.oAuthApp.update({
    where: { id: app.id },
    data: {
      name: '180 Traffic Director',
      description: 'Enterprise Edge Traffic Router, Safe-Page Cloaker & Click Armor',
      clientSecretHash: secretHash,
      clientSecretHint: '...' + CLIENT_SECRET.slice(-4),
      redirectUris,
      allowedOrigins,
      webhookUrl: 'http://localhost:4002/api/v1/traffic-director/billing/webhook',
      webhookSecret: WEBHOOK_SECRET,
      enableAuth: true,
      enablePay: true,
      isActive: true,
      isVerified: true,
    },
  });

  console.log('✅ Updated OAuthApp details:');
  console.log('   - Name:', updatedApp.name);
  console.log('   - Client ID:', updatedApp.clientId);
  console.log('   - Client Secret Hint:', updatedApp.clientSecretHint);
  console.log('   - Redirect URIs:', updatedApp.redirectUris);
  console.log('   - Allowed Origins:', updatedApp.allowedOrigins);
  console.log('   - Webhook URL:', updatedApp.webhookUrl);
  console.log('   - Auth & Pay Enabled:', updatedApp.enableAuth, updatedApp.enablePay);

  // Now seed subscription plans
  const plans = [
    {
      planCode: 'traffic-starter',
      name: 'Traffic Director Starter',
      description: 'Max 2 Smart Links with Anycast Routing',
      amount: 25.00,
      currency: 'USD',
      interval: 'MONTHLY',
      intervalCount: 1,
      trialDays: 0,
    },
    {
      planCode: 'traffic-pro',
      name: 'Traffic Director Pro',
      description: 'Max 5 Smart Links with AdBot Cloaking',
      amount: 50.00,
      currency: 'USD',
      interval: 'MONTHLY',
      intervalCount: 1,
      trialDays: 0,
    },
    {
      planCode: 'traffic-enterprise',
      name: 'Traffic Director Enterprise',
      description: 'Unlimited Smart Links with Dedicated Tor RAM Sets',
      amount: 75.00,
      currency: 'USD',
      interval: 'MONTHLY',
      intervalCount: 1,
      trialDays: 0,
    },
  ];

  for (const p of plans) {
    const res = await corePrisma.subscriptionPlan.upsert({
      where: {
        appId_planCode: {
          appId: updatedApp.id,
          planCode: p.planCode,
        },
      },
      update: {
        name: p.name,
        description: p.description,
        amount: p.amount,
        currency: p.currency,
        interval: p.interval,
        intervalCount: p.intervalCount,
        trialDays: p.trialDays,
        isActive: true,
      },
      create: {
        appId: updatedApp.id,
        planCode: p.planCode,
        name: p.name,
        description: p.description,
        amount: p.amount,
        currency: p.currency,
        interval: p.interval,
        intervalCount: p.intervalCount,
        trialDays: p.trialDays,
        isActive: true,
      },
    });
    console.log(`✅ Configured plan: ${res.planCode} (${res.name}) - $${res.amount}/month`);
  }

  console.log('\n🎉 Successfully configured 180 Traffic Director with provided credentials!');
  await corePrisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error during setup:', e);
  await corePrisma.$disconnect();
  process.exit(1);
});
