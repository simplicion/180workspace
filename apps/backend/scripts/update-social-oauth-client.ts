import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { corePrisma as prisma } from '@workspace/db-180core';

async function updateClient() {
    const clientId = process.env.SOCIAL_STUDIO_180_CLIENT_ID || '180_client_266753c1171df1e2c4a391483fd2e02e';
    console.log(`Checking OAuth client: ${clientId}...`);

    const client = await prisma.oAuthApp.findUnique({
        where: { clientId }
    });

    if (!client) {
        console.error(`OAuth client ${clientId} not found in database!`);
        return;
    }

    const redirectUris = Array.from(new Set([
        ...client.redirectUris,
        'workspace180://oauth/callback',
        'workspace180://oauth-callback',
        '180social://oauth-callback',
        '180social://oauth/callback',
        'socialstudio://oauth-callback',
        'https://social.180workspace.com/#/oauth-callback',
        'http://localhost:3007/#/oauth-callback',
        'http://localhost:3000/callback',
        'http://localhost:3000/social/callback'
    ]));

    const allowedOrigins = Array.from(new Set([
        ...client.allowedOrigins,
        'https://social.180workspace.com',
        'http://localhost:3007',
        'http://localhost:3000'
    ]));

    const allowedScopes = Array.from(new Set([
        ...client.allowedScopes,
        'openid',
        'identity:read',
        'identity:email',
        'identity:phone',
        'social:publish',
        'pay:checkout',
        'pay:subscriptions'
    ]));

    await prisma.oAuthApp.update({
        where: { clientId },
        data: {
            redirectUris,
            allowedOrigins,
            allowedScopes,
            isVerified: true,
            isActive: true
        }
    });

    console.log(`Updated client ${clientId} successfully with ${redirectUris.length} redirect URIs.`);
}

updateClient()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
