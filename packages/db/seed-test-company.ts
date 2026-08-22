import { PrismaClient } from './generated/client/index.js';

const prisma = new PrismaClient();

async function seedTestCompany() {
  console.log("Seeding test company...");
  
  // 1. Plan
  let plan = await prisma.plan.findFirst({ where: { planName: "Test Limitless Plan" } });
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        planName: "Test Limitless Plan",
        price: 15,
        currency: "USD",
        billingCycle: "monthly",
        maxUsers: 10,
        maxApps: 20,
        maxStorageBytes: 20 * 1024 * 1024 * 1024, // 20 GB
        features: ["All features"],
        isActive: true
      }
    });
  }

  // 2. Company
  let company = await prisma.company.findFirst({ where: { name: "Audit Test Company" } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Audit Test Company",
        slug: "audit-test-company-" + Date.now(),
        adminEmail: "audit@test.com"
      }
    });
  }

  // 3. CompanyConfig (Storage)
  let config = await prisma.companyConfig.findUnique({ where: { companyId: company.id } });
  if (!config) {
    config = await prisma.companyConfig.create({
      data: {
        companyId: company.id,
        storageUsedBytes: 5 * 1024 * 1024 * 1024 // 5 GB
      }
    });
  } else {
    await prisma.companyConfig.update({
      where: { id: config.id },
      data: { storageUsedBytes: 5 * 1024 * 1024 * 1024 }
    });
  }

  // 4. Subscription
  let sub = await prisma.subscription.findFirst({ where: { companyId: company.id } });
  if (!sub) {
    sub = await prisma.subscription.create({
      data: {
        companyId: company.id,
        planId: plan.id,
        status: "ACTIVE",
        amount: 15,
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  } else {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", planId: plan.id }
    });
  }

  // 5. Team Members (Users)
  const currentUsers = await prisma.user.count({ where: { companyId: company.id } });
  for (let i = currentUsers; i < 4; i++) {
    await prisma.user.create({
      data: {
        company: { connect: { id: company.id } },
        name: `Test User ${i}`,
        email: `user${i}@audit-test.com`,
        password: "hash"
      }
    });
  }

  // 6. Apps (Projects)
  const currentProjects = await prisma.project.count({ where: { companyId: company.id } });
  for (let i = currentProjects; i < 7; i++) {
    await prisma.project.create({
      data: {
        company: { connect: { id: company.id } },
        name: `Test App ${i}`,
        description: "Test",
        status: "active"
      }
    });
  }

  console.log("Seeded test company 'Audit Test Company' successfully.");
  console.log(`- 4 Team Members created (Limit: 10)`);
  console.log(`- 7 Apps created (Limit: 20)`);
  console.log(`- 5 GB Storage used (Limit: 20 GB)`);
  console.log(`\nRun 'npx tsx audit-billing.ts' to verify.`);
}

seedTestCompany().catch(console.error).finally(() => prisma.$disconnect());
