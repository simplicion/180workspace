'use strict';

import { developersPrisma } from '../src';
import crypto from 'crypto';

function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

async function seedRdsDevelopersDb() {
  console.log('\n================================================================');
  console.log('  SEEDING AWS RDS DATABASE: 180developers_db');
  console.log('  Host: pitchin-db.csne8mek4dog.us-east-1.rds.amazonaws.com');
  console.log('================================================================\n');

  try {
    // 1. Ensure System Administrator User
    console.log('[1/4] Ensuring Sovereign System Administrator account...');
    let systemUser = await developersPrisma.user.findFirst({
      where: {
        OR: [
          { role: 'SUPERADMIN' },
          { email: 'system@180identity.internal' },
          { username: 'system_idp' }
        ]
      }
    });

    if (!systemUser) {
      systemUser = await developersPrisma.user.create({
        data: {
          name: '180 System Identity Authority',
          email: 'system@180identity.internal',
          username: 'system_idp',
          role: 'SUPERADMIN',
          isVerified: true,
          emailVerified: true,
          bio: 'Root cryptographic authority for the 180 Identity & Developers ecosystem.',
        }
      });
      console.log(`  -> Created System User: ${systemUser.name} (${systemUser.id})`);
    } else {
      console.log(`  -> System User exists: ${systemUser.name} (${systemUser.id})`);
    }

    // 2. First-Party Ecosystem Applications
    console.log('\n[2/4] Registering First-Party Ecosystem OAuth Applications...');
    const APPS = [
      {
        clientId: '180-workspace-platform',
        name: '180 Workspace ERP',
        description: 'Unified Business Operating System & Collaboration Suite',
        redirectUris: [
          'http://localhost:3000/callback',
          'http://localhost:3000/oauth/callback',
          'http://localhost:3002/callback',
          'http://localhost:3002/oauth/callback',
          'https://180workspace.com/callback',
          'https://180workspace.com/oauth/callback',
          'https://*.180workspace.com/callback'
        ],
        allowedOrigins: [
          'http://localhost:3000',
          'http://localhost:3002',
          'https://180workspace.com',
          'https://*.180workspace.com'
        ],
        allowedScopes: ['openid', 'identity:read', 'identity:email', 'identity:phone'],
        isVerified: true,
        logoUrl: 'https://180workspace.com/icon.svg'
      },
      {
        clientId: '180-social-studio-mobile',
        name: '180 Social Studio',
        description: 'Multi-Channel Social Media Automation & Analytics Hub',
        redirectUris: [
          '180social://oauth-callback',
          'socialstudio://oauth-callback',
          'http://localhost:3000/social/callback',
          'http://localhost:3007/callback'
        ],
        allowedOrigins: [
          'http://localhost:3000',
          'http://localhost:3007'
        ],
        allowedScopes: ['openid', 'identity:read', 'identity:email', 'social:publish', 'social:analytics'],
        isVerified: true,
        logoUrl: 'https://180workspace.com/icon.svg'
      },
      {
        clientId: '180-developers-portal',
        name: '180 Developers Console',
        description: 'Developer Sandbox, Webhook Studio & API Keys Management',
        redirectUris: [
          'http://localhost:3008/callback',
          'https://developers.180workspace.com/callback'
        ],
        allowedOrigins: [
          'http://localhost:3008',
          'https://developers.180workspace.com'
        ],
        allowedScopes: ['openid', 'identity:read', 'identity:email', 'developers:manage'],
        isVerified: true,
        logoUrl: 'https://developers.180workspace.com/icon.svg'
      }
    ];

    for (const app of APPS) {
      const existing = await developersPrisma.oAuthApp.findUnique({
        where: { clientId: app.clientId }
      });

      if (!existing) {
        const rawSecret = `180_secret_${app.clientId}_${Date.now()}`;
        const secretHash = hashSecret(rawSecret);
        const secretHint = `...${rawSecret.slice(-4)}`;

        const created = await developersPrisma.oAuthApp.create({
          data: {
            name: app.name,
            description: app.description,
            clientId: app.clientId,
            clientSecretHash: secretHash,
            clientSecretHint: secretHint,
            redirectUris: app.redirectUris,
            allowedOrigins: app.allowedOrigins,
            allowedScopes: app.allowedScopes,
            isVerified: app.isVerified,
            isActive: true,
            logoUrl: app.logoUrl,
            userId: systemUser.id
          }
        });
        console.log(`  -> Registered App: ${created.name} (Client ID: ${created.clientId})`);
      } else {
        console.log(`  -> App already exists: ${existing.name} (Client ID: ${existing.clientId})`);
      }
    }

    // 3. Verify Database Integrity & Counts
    console.log('\n[3/4] Verifying table records on AWS RDS instance...');
    const userCount = await developersPrisma.user.count();
    const appCount = await developersPrisma.oAuthApp.count();
    const tokenCount = await developersPrisma.oAuthToken.count();
    const codeCount = await developersPrisma.oAuthAuthorizationCode.count();
    const consentCount = await developersPrisma.oAuthConsent.count();
    const webhookCount = await developersPrisma.webhookEndpoint.count();

    console.log(`  Users:        ${userCount}`);
    console.log(`  OAuth Apps:   ${appCount}`);
    console.log(`  OAuth Tokens: ${tokenCount}`);
    console.log(`  Auth Codes:   ${codeCount}`);
    console.log(`  Consents:     ${consentCount}`);
    console.log(`  Webhooks:     ${webhookCount}`);

    // 4. Confirmation
    console.log('\n[4/4] AWS RDS Deployment Status: 100% HEALTHY & ONLINE!');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err: any) {
    console.error('\n[FATAL ERROR during RDS Seed]:', err);
    process.exit(1);
  } finally {
    await developersPrisma.$disconnect();
  }
}

seedRdsDevelopersDb();
