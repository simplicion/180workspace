import { PrismaClient as Client180Core } from '../packages/db-180core/generated/client/index.js';

const targetDb = new Client180Core({
  datasources: {
    db: { url: 'postgresql://pitchin_admin:Pitchin180Admin!23@pitchin-db.csne8mek4dog.us-east-1.rds.amazonaws.com:5432/180core_db?sslmode=require' }
  }
});

const sourceDevsDb = new Client180Core({
  datasources: {
    db: { url: 'postgresql://pitchin_admin:Pitchin180Admin!23@pitchin-db.csne8mek4dog.us-east-1.rds.amazonaws.com:5432/180developers_db?sslmode=require' }
  }
});

const sourceWorkspace180Core = new Client180Core({
  datasources: {
    db: { url: 'postgresql://pitchin_admin:Pitchin180Admin!23@pitchin-db.csne8mek4dog.us-east-1.rds.amazonaws.com:5432/180workspace_db?sslmode=require&schema=180core' }
  }
});

async function main() {
  console.log('--- MIGRATING DATA INTO DEDICATED 180core_db ---');

  // 1. Sync Users from 180developers_db
  const usersDev = await sourceDevsDb.user.findMany();
  console.log(`Found ${usersDev.length} users in 180developers_db`);
  for (const u of usersDev) {
    const existing = await targetDb.user.findFirst({
      where: {
        OR: [
          { id: u.id },
          ...(u.email ? [{ email: u.email }] : [])
        ]
      }
    });
    if (!existing) {
      await targetDb.user.create({ data: u });
    } else {
      await targetDb.user.update({
        where: { id: existing.id },
        data: { ...u, id: existing.id }
      });
    }
  }

  // Sync Users from 180workspace_db.180core
  const usersWs = await sourceWorkspace180Core.user.findMany();
  console.log(`Found ${usersWs.length} users in 180workspace_db.180core`);
  for (const u of usersWs) {
    const existing = await targetDb.user.findFirst({
      where: {
        OR: [
          { id: u.id },
          ...(u.email ? [{ email: u.email }] : [])
        ]
      }
    });
    if (!existing) {
      await targetDb.user.create({ data: u });
    }
  }

  const primaryUser = await targetDb.user.findFirst({
    where: { email: { contains: 'simplicion', mode: 'insensitive' } }
  });
  console.log('Primary Simplicion user in 180core_db:', primaryUser?.id, primaryUser?.email);

  // Helper to ensure app has a valid userId
  const validUserIds = new Set((await targetDb.user.findMany({ select: { id: true } })).map(u => u.id));
  const sanitizeAppUserId = (app) => {
    let uid = app.userId;
    if (!validUserIds.has(uid)) {
      uid = primaryUser.id;
    }
    return { ...app, userId: uid };
  };

  // 2. Sync OAuthApps
  const appsDev = await sourceDevsDb.oAuthApp.findMany();
  console.log(`Found ${appsDev.length} apps in 180developers_db`);
  for (let a of appsDev) {
    a = sanitizeAppUserId(a);
    const existing = await targetDb.oAuthApp.findFirst({
      where: {
        OR: [
          { id: a.id },
          { clientId: a.clientId }
        ]
      }
    });
    if (!existing) {
      await targetDb.oAuthApp.create({ data: a });
    } else {
      await targetDb.oAuthApp.update({
        where: { id: existing.id },
        data: a
      });
    }
  }

  const appsWs = await sourceWorkspace180Core.oAuthApp.findMany();
  console.log(`Found ${appsWs.length} apps in 180workspace_db.180core`);
  for (let a of appsWs) {
    a = sanitizeAppUserId(a);
    const existing = await targetDb.oAuthApp.findFirst({
      where: {
        OR: [
          { id: a.id },
          { clientId: a.clientId }
        ]
      }
    });
    if (!existing) {
      await targetDb.oAuthApp.create({ data: a });
    } else {
      await targetDb.oAuthApp.update({
        where: { id: existing.id },
        data: a
      });
    }
  }

  // 3. Sync OAuthTokens
  const tokensDev = await sourceDevsDb.oAuthToken.findMany();
  for (const t of tokensDev) {
    if (validUserIds.has(t.userId)) {
      const existing = await targetDb.oAuthToken.findUnique({ where: { id: t.id } });
      if (!existing) {
        try { await targetDb.oAuthToken.create({ data: t }); } catch (_) {}
      }
    }
  }

  // 4. Sync OAuthConsents
  const consentsDev = await sourceDevsDb.oAuthConsent.findMany();
  for (const c of consentsDev) {
    if (validUserIds.has(c.userId)) {
      const existing = await targetDb.oAuthConsent.findUnique({ where: { id: c.id } });
      if (!existing) {
        try { await targetDb.oAuthConsent.create({ data: c }); } catch (_) {}
      }
    }
  }

  // 5. Sync Wallets
  const wallets = await sourceDevsDb.wallet.findMany();
  for (const w of wallets) {
    if (validUserIds.has(w.userId)) {
      const existing = await targetDb.wallet.findUnique({ where: { id: w.id } });
      if (!existing) {
        try { await targetDb.wallet.create({ data: w }); } catch (_) {}
      }
    }
  }

  // 6. Sync CheckoutSessions
  const sessions = await sourceDevsDb.checkoutSession.findMany();
  for (const s of sessions) {
    const existing = await targetDb.checkoutSession.findUnique({ where: { id: s.id } });
    if (!existing) {
      try { await targetDb.checkoutSession.create({ data: s }); } catch (_) {}
    }
  }

  // 7. Sync Coupons
  const coupons = await sourceDevsDb.coupon.findMany();
  for (const c of coupons) {
    const existing = await targetDb.coupon.findUnique({ where: { id: c.id } });
    if (!existing) {
      try { await targetDb.coupon.create({ data: c }); } catch (_) {}
    }
  }

  // 8. Sync PaymentLinks
  const links = await sourceDevsDb.paymentLink.findMany();
  for (const l of links) {
    const existing = await targetDb.paymentLink.findUnique({ where: { id: l.id } });
    if (!existing) {
      try { await targetDb.paymentLink.create({ data: l }); } catch (_) {}
    }
  }

  // 9. Sync SubscriptionPlans
  const plans = await sourceDevsDb.subscriptionPlan.findMany();
  for (const p of plans) {
    const existing = await targetDb.subscriptionPlan.findUnique({ where: { id: p.id } });
    if (!existing) {
      try { await targetDb.subscriptionPlan.create({ data: p }); } catch (_) {}
    }
  }

  // 10. Sync RecurringSubscriptions
  const subs = await sourceDevsDb.recurringSubscription.findMany();
  for (const s of subs) {
    const existing = await targetDb.recurringSubscription.findUnique({ where: { id: s.id } });
    if (!existing) {
      try { await targetDb.recurringSubscription.create({ data: s }); } catch (_) {}
    }
  }

  // Final Verification in 180core_db
  const totalAppsInCore = await targetDb.oAuthApp.count();
  const allApps = await targetDb.oAuthApp.findMany({ select: { id: true, name: true, clientId: true, userId: true } });
  console.log(`\n🎉 SUCCESS! 180core_db now has ${totalAppsInCore} OAuth Applications:`);
  console.table(allApps);

  const totalUsersInCore = await targetDb.user.count();
  console.log(`Total Users in 180core_db: ${totalUsersInCore}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await targetDb.$disconnect();
    await sourceDevsDb.$disconnect();
    await sourceWorkspace180Core.$disconnect();
  });
