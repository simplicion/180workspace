import { corePrisma } from '../packages/db-180core/src/index.ts';
import { prisma } from '../packages/db/src/index.ts';

async function seed() {
  console.log('--- Seeding 180workspace Plans into 180 Pay & Workspace Database ---');

  // 1. Locate 180workspace OAuthApp in db-180core
  const app = await corePrisma.oAuthApp.findFirst({
    where: {
      OR: [
        { clientId: '180_client_70d751541f05347fe803ec8e128f5e83' },
        { id: '8bc81b3e-8510-4144-8c47-c43fe46d71a3' },
        { name: '180workspace' }
      ]
    }
  });

  if (!app) {
    throw new Error('OAuthApp for 180workspace not found in db-180core!');
  }

  console.log(`Found 180workspace app: ${app.name} (${app.id}, clientId: ${app.clientId})`);

  // Ensure enablePay is true
  if (!app.enablePay) {
    await corePrisma.oAuthApp.update({
      where: { id: app.id },
      data: { enablePay: true }
    });
    console.log('Enabled 180 Pay for 180workspace app');
  }

  // 2. Deactivate any legacy plans like 180-kickstart in db-180core
  await corePrisma.subscriptionPlan.updateMany({
    where: {
      appId: app.id,
      planCode: '180-kickstart'
    },
    data: {
      isActive: false
    }
  });
  console.log('Deactivated legacy plan: 180-kickstart');

  // 3. Define the 2 active paid plans: Momentum ($17) and Limitless ($20)
  const plansData = [
    {
      planCode: '180-momentum',
      name: '180 Momentum',
      description: 'Expanded application capacity, AI copilot intelligence, and custom workflows for growing businesses.',
      amount: 17,
      yearlyAmount: 163,
      currency: 'USD',
      interval: 'MONTHLY',
      trialDays: 15,
      isPopular: true,
      badgeText: 'Most Popular',
      badgeColor: 'indigo',
      buttonText: 'Start 15-Day Free Trial',
      features: [
        { text: 'Access to 8 Applications (Projects, CRM, Finance, Web Builder, Voice Force, etc.)', included: true },
        { text: 'Up to 5 Team Members', included: true },
        { text: 'Up to 5 Active Projects', included: true },
        { text: '1 GB High-Speed Cloud Storage', included: true },
        { text: 'Orbit AI Copilot Access', included: true },
        { text: 'Custom Email SMTP Integration', included: true },
        { text: 'Priority Email & Ticket Support', included: true },
        { text: 'Cross-App Event Triggers & Workflows', included: true }
      ],
      featureKeys: [
        '8_apps',
        '5_team_members',
        '5_projects',
        '1gb_storage',
        'orbit_ai_access',
        'custom_smtp',
        'priority_support',
        'cross_app_triggers'
      ]
    },
    {
      planCode: '180-limitless',
      name: '180 Limitless',
      description: 'Complete unrestricted access to all platform applications, 20 team seats, 20 projects, and sub-5ms edge traffic routing.',
      amount: 20,
      yearlyAmount: 192,
      currency: 'USD',
      interval: 'MONTHLY',
      trialDays: 15,
      isPopular: false,
      badgeText: 'Complete Suite',
      badgeColor: 'violet',
      buttonText: 'Start 15-Day Free Trial',
      features: [
        { text: 'Unlimited Access to All Platform Applications (including HR, Advertising & Traffic Director)', included: true },
        { text: 'Up to 20 Team Members Included', included: true },
        { text: 'Up to 20 Active Projects', included: true },
        { text: '5 GB High-Speed Cloud Storage', included: true },
        { text: 'Sub-5ms Traffic Director & Bot Shield', included: true },
        { text: 'Dedicated Team & Priority Support', included: true },
        { text: 'Orbit AI Copilot Full Capabilities', included: true },
        { text: 'Custom Email SMTP & Webhook Integrations', included: true },
        { text: 'Enterprise Multi-Tenant Security & RBAC', included: true }
      ],
      featureKeys: [
        'all_apps_unlimited',
        '20_team_members',
        '20_projects',
        '5gb_storage',
        'traffic_director_edge',
        'dedicated_support',
        'orbit_ai_full',
        'smtp_webhooks',
        'enterprise_rbac'
      ]
    }
  ];

  // 4. Upsert into corePrisma.subscriptionPlan (180 Pay Recurring Engine)
  for (const p of plansData) {
    await corePrisma.subscriptionPlan.upsert({
      where: {
        appId_planCode: {
          appId: app.id,
          planCode: p.planCode
        }
      },
      update: {
        name: p.name,
        description: p.description,
        amount: p.amount,
        currency: p.currency,
        interval: p.interval,
        trialDays: p.trialDays,
        isActive: true,
        metadata: {
          features: p.features,
          featureKeys: p.featureKeys,
          isPopular: p.isPopular,
          badgeText: p.badgeText,
          badgeColor: p.badgeColor,
          buttonText: p.buttonText,
          trialDays: p.trialDays,
          yearlyAmount: p.yearlyAmount
        }
      },
      create: {
        appId: app.id,
        planCode: p.planCode,
        name: p.name,
        description: p.description,
        amount: p.amount,
        currency: p.currency,
        interval: p.interval,
        trialDays: p.trialDays,
        isActive: true,
        metadata: {
          features: p.features,
          featureKeys: p.featureKeys,
          isPopular: p.isPopular,
          badgeText: p.badgeText,
          badgeColor: p.badgeColor,
          buttonText: p.buttonText,
          trialDays: p.trialDays,
          yearlyAmount: p.yearlyAmount
        }
      }
    });
    console.log(`✓ Seeded 180 Pay plan: ${p.name} ($${p.amount}/mo)`);
  }

  // 5. Upsert into corePrisma.pricingTableConfig (Exclusively 2 Plans)
  await corePrisma.pricingTableConfig.upsert({
    where: { appId: app.id },
    update: {
      headline: '180workspace Plans & Pricing',
      subheadline: 'Choose the sovereign plan tailored for your growth with 15-day full access free trial.',
      theme: 'auto',
      accentColor: '#6366f1',
      billingIntervals: ['MONTHLY', 'YEARLY'],
      yearlyDiscountPct: 20,
      planCards: plansData.map(p => ({
        planCode: p.planCode,
        name: p.name,
        description: p.description,
        amount: p.amount,
        yearlyAmount: p.yearlyAmount,
        currency: p.currency,
        interval: p.interval,
        trialDays: p.trialDays,
        isPopular: p.isPopular,
        badgeText: p.badgeText,
        badgeColor: p.badgeColor,
        features: p.features,
        featureKeys: p.featureKeys,
        buttonText: p.buttonText,
        isFree: false
      })),
      customCss: ''
    },
    create: {
      appId: app.id,
      headline: '180workspace Plans & Pricing',
      subheadline: 'Choose the sovereign plan tailored for your growth with 15-day full access free trial.',
      theme: 'auto',
      accentColor: '#6366f1',
      billingIntervals: ['MONTHLY', 'YEARLY'],
      yearlyDiscountPct: 20,
      planCards: plansData.map(p => ({
        planCode: p.planCode,
        name: p.name,
        description: p.description,
        amount: p.amount,
        yearlyAmount: p.yearlyAmount,
        currency: p.currency,
        interval: p.interval,
        trialDays: p.trialDays,
        isPopular: p.isPopular,
        badgeText: p.badgeText,
        badgeColor: p.badgeColor,
        features: p.features,
        featureKeys: p.featureKeys,
        buttonText: p.buttonText,
        isFree: false
      })),
      customCss: ''
    }
  });
  console.log('✓ Seeded PricingTableConfig for 180workspace in 180 Pay Studio');

  // 6. Deactivate legacy 180 Kickstart in workspace db
  await prisma.plan.updateMany({
    where: {
      OR: [
        { planName: { contains: 'Kickstart', mode: 'insensitive' } },
        { providerPlanId: '180-kickstart' }
      ]
    },
    data: {
      isActive: false
    }
  });
  console.log('Deactivated legacy plan in workspace db: 180 Kickstart');

  // 7. Upsert active plans into workspace database Plan table in @workspace/db
  const workspaceDbPlans = [
    {
      planName: '180 Free Starter',
      providerPlanId: '180-free-starter',
      price: 0,
      currency: 'USD',
      billingCycle: 'monthly',
      maxUsers: 1,
      maxWebsites: 0,
      maxApps: 5,
      maxStorageBytes: 512 * 1024 * 1024, // 512 MB
      features: [
        'Access to Default Apps (Projects, Tools, Communications)',
        '1 Team Member Seat',
        'Up to 2 Active Projects',
        '512 MB Cloud Storage',
        'Unified Work Graph Isolation'
      ],
      isActive: true,
      trialDays: 0
    },
    {
      planName: '180 Momentum',
      providerPlanId: '180-momentum',
      price: 17,
      currency: 'USD',
      billingCycle: 'monthly',
      maxUsers: 5,
      maxWebsites: 5,
      maxApps: 8,
      maxStorageBytes: 1 * 1024 * 1024 * 1024, // 1 GB
      features: [
        'Access to 8 Applications (Projects, CRM, Finance, Website Builder, Voice Force, etc.)',
        'Up to 5 Team Members',
        'Up to 5 Active Projects',
        '1 GB High-Speed Cloud Storage',
        'Priority Support',
        'AI Copilot Access',
        'Custom Email SMTP'
      ],
      isActive: true,
      trialDays: 15
    },
    {
      planName: '180 Limitless',
      providerPlanId: '180-limitless',
      price: 20,
      currency: 'USD',
      billingCycle: 'monthly',
      maxUsers: 20,
      maxWebsites: -1,
      maxApps: 999,
      maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
      features: [
        'Unlimited Access to All Platform Applications (including HR, Advertising & Traffic Director)',
        'Up to 20 Team Members',
        'Up to 20 Active Projects',
        '5 GB High-Speed Cloud Storage',
        'Sub-5ms Traffic Director & Bot Shield',
        'Dedicated Team Support',
        'Full AI Assistant & Agent Access'
      ],
      isActive: true,
      trialDays: 15
    }
  ];

  for (const wp of workspaceDbPlans) {
    const existing = await prisma.plan.findFirst({
      where: {
        OR: [
          { planName: wp.planName },
          { providerPlanId: wp.providerPlanId }
        ]
      }
    });

    if (existing) {
      await prisma.plan.update({
        where: { id: existing.id },
        data: wp
      });
      console.log(`✓ Updated workspace db plan: ${wp.planName} -> $${wp.price}/mo`);
    } else {
      await prisma.plan.create({
        data: wp
      });
      console.log(`✓ Created workspace db plan: ${wp.planName} -> $${wp.price}/mo`);
    }
  }

  console.log('=== All 180workspace plans seeded successfully ===');
}

seed()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await corePrisma.$disconnect();
    await prisma.$disconnect();
  });
