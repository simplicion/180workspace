import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditBilling() {
  console.log("Starting Deep Audit for Billing, App Limits, and Storage...");

  // 1. Fetch Company
  const company = await prisma.company.findFirst({
    where: { name: "Audit Test Company" },
    include: {
      CompanyConfig: true,
      users: true
    }
  });

  if (!company) {
    console.log("No company found.");
    return;
  }

  console.log(`\n--- Company: ${company.name} ---`);
  
  // 2. Billing / Subscription Audit
  const subscription = await prisma.subscription.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' },
    include: { plan: true }
  });
  if (!subscription) {
    console.log("No subscription found.");
  } else {
    console.log(`Plan Name: ${subscription.plan.planName}`);
    console.log(`Plan Price: ${subscription.plan.price}`);
    console.log(`Billing Cycle: ${subscription.billingCycle}`);
    console.log(`Status: ${subscription.status}`);
    console.log(`Max Users allowed: ${subscription.plan.maxUsers}`);
    console.log(`Max Storage allowed: ${subscription.plan.maxStorageBytes} bytes`);
    console.log(`Max Apps allowed: ${subscription.plan.maxApps}`);
  }

  // 3. Team Member Progression Audit
  const teamMembers = await prisma.user.count({
    where: { companyId: company.id }
  });
  console.log(`\n--- Team Members Audit ---`);
  console.log(`Current Team Members Count: ${teamMembers}`);
  if (subscription) {
    console.log(`Limit: ${subscription.plan.maxUsers}`);
    if (subscription.plan.maxUsers !== -1 && teamMembers > subscription.plan.maxUsers) {
      console.log(`⚠️ WARNING: Team members exceed the plan limit!`);
    } else {
      console.log(`✅ Team member limit is respected.`);
    }
  }

  // 4. App Limits Audit
  const apps = await prisma.project.count({
    where: { companyId: company.id }
  });
  console.log(`\n--- App Limits Audit ---`);
  console.log(`Currently Enabled Apps Count: ${apps}`);
  if (subscription) {
    console.log(`Limit: ${subscription.plan.maxApps}`);
    if (subscription.plan.maxApps !== -1 && apps > subscription.plan.maxApps) {
      console.log(`⚠️ WARNING: Enabled apps exceed the plan limit!`);
    } else {
      console.log(`✅ App limit is respected.`);
    }
  }

  // 5. Storage (R2) Audit
  console.log(`\n--- Storage Audit ---`);
  const config = company.CompanyConfig;
  if (!config) {
    console.log(`⚠️ WARNING: CompanyConfig not found! Storage cannot be tracked.`);
  } else {
    const storageUsed = config.storageUsedBytes;
    console.log(`Storage Used: ${storageUsed} bytes`);
    if (subscription) {
      console.log(`Limit: ${subscription.plan.maxStorageBytes} bytes`);
      if (subscription.plan.maxStorageBytes !== -1 && storageUsed > subscription.plan.maxStorageBytes) {
        console.log(`⚠️ WARNING: Storage exceeds the plan limit!`);
      } else {
        console.log(`✅ Storage limit is respected.`);
      }
    }
  }

  console.log("\n--- Audit Complete ---");
  await prisma.$disconnect();
}

auditBilling().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
