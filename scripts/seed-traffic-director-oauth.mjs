import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding 180 Traffic Director OAuth App...');

  const systemUser =
    (await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } })) ||
    (await prisma.user.findFirst());

  if (!systemUser) {
    console.error('[Seed] No user found in database to associate OAuthApp with.');
    process.exit(1);
  }

  const clientId = '180-traffic-director';
  const secret = '180_secret_traffic_director_live_sec7729';
  const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

  const appData = {
    name: '180 Traffic Director',
    description: 'Enterprise Edge Traffic Router, Safe-Page Cloaker & Click Armor',
    clientId,
    clientSecretHash: secretHash,
    clientSecretHint: secret.slice(-4),
    redirectUris: [
      'http://localhost:3000/callback',
      'http://localhost:3009/callback',
      'http://localhost:3002/callback',
      'https://trafficdirector.180workspace.com/callback',
      'https://*.180workspace.com/callback',
    ],
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3009',
      'http://127.0.0.1:3009',
      'http://localhost:3002',
      'https://trafficdirector.180workspace.com',
      'https://*.180workspace.com',
    ],
    allowedScopes: ['openid', 'identity:read', 'identity:email'],
    isVerified: true,
    isActive: true,
    logoUrl: '/icon.svg',
    homepageUrl: 'https://trafficdirector.180workspace.com',
    userId: systemUser.id,
  };

  const existing = await prisma.oAuthApp.findUnique({
    where: { clientId },
  });

  if (existing) {
    await prisma.oAuthApp.update({
      where: { clientId },
      data: appData,
    });
    console.log('✅ Updated existing OAuthApp for 180-traffic-director');
  } else {
    await prisma.oAuthApp.create({
      data: appData,
    });
    console.log('✅ Created new OAuthApp for 180-traffic-director');
  }

  console.log(`Client ID: ${clientId}`);
  console.log(`Client Secret: ${secret}`);
  console.log(`Whitelisted Origins:`, appData.allowedOrigins);
  console.log(`Redirect URIs:`, appData.redirectUris);
}

main()
  .catch((e) => {
    console.error('[Seed] Error seeding traffic director OAuth app:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
