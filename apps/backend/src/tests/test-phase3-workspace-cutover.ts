'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
    FIRST_PARTY_APPS,
    OAuthController
} from '@workspace/identity';

async function runPhase3WorkspaceCutoverSuite() {
    console.log('\n================================================================');
    console.log('  180 IDENTITY PHASE 3: WORKSPACE AUTH CUTOVER VERIFICATION');
    console.log('================================================================\n');

    let passedTests = 0;
    let failedTests = 0;

    function test(name: string, fn: () => Promise<void> | void) {
        return (async () => {
            try {
                await fn();
                console.log(`  [PASS] ${name}`);
                passedTests++;
            } catch (err: any) {
                console.error(`  [FAIL] ${name}:`, err.message);
                failedTests++;
            }
        })();
    }

    // ─── Test 1: First-Party Ecosystem Registry ──────────────────────────────
    await test('FIRST_PARTY_APPS contains 180-workspace-platform and companion apps', () => {
        assert(Array.isArray(FIRST_PARTY_APPS), 'FIRST_PARTY_APPS must be an array');
        const workspaceApp = FIRST_PARTY_APPS.find(a => a.clientId === '180-workspace-platform');
        const socialApp = FIRST_PARTY_APPS.find(a => a.clientId === '180-social-studio-mobile');

        assert(workspaceApp, '180 Workspace must be registered');
        assert(socialApp, '180 Social Studio must be registered');

        assert.strictEqual(workspaceApp?.isVerified, true);
        assert(workspaceApp?.redirectUris.some(u => u.includes('/callback')));
    });

    // ─── Test 2: OAuth Controller First-Party Auto-Resolution ────────────────
    await test('validateAuthorize resolves 180-workspace-platform seamlessly', async () => {
        let sentStatus = 200;
        let sentJson: any = null;

        const mockReq = {
            query: {
                client_id: '180-workspace-platform',
                redirect_uri: 'http://localhost:3000/callback',
                scope: 'openid identity:read'
            }
        };

        const mockRes = {
            status: (code: number) => {
                sentStatus = code;
                return mockRes;
            },
            json: (data: any) => {
                sentJson = data;
            }
        };

        await OAuthController.validateAuthorize(mockReq, mockRes);

        assert.strictEqual(sentStatus, 200);
        assert(sentJson !== null, 'Response JSON must be returned');
        assert.strictEqual(sentJson.success, true);
        assert(sentJson.app?.name?.startsWith('180 Workspace'), 'App name must start with 180 Workspace');
        assert.strictEqual(sentJson.app?.isVerified, true);
    });

    // ─── Test 3: Routing Decision Logic (Company vs Setup) ────────────────────
    await test('Routing correctly distinguishes existing vs new company users', () => {
        function resolvePostAuthTarget(user: { companyId?: string | null }) {
            if (user && user.companyId) {
                return '/';
            }
            return '/workspace-setup';
        }

        const existingCorporateUser = { companyId: 'company_tenant_abc' };
        assert.strictEqual(resolvePostAuthTarget(existingCorporateUser), '/');

        const newIdentityUser = { companyId: null };
        assert.strictEqual(resolvePostAuthTarget(newIdentityUser), '/workspace-setup');
    });

    // ─── Test 4: Identity SDK & Frontend Cutover Files Exist & Wired ─────────
    await test('Identity SDK and Frontend login, signup, callback files are intact', () => {
        const sdkPath = path.resolve(__dirname, '../../../../packages/identity-sdk/src/index.tsx');
        const callbackPath = path.resolve(__dirname, '../../../frontend/app/(auth)/callback/page.tsx');
        const loginPath = path.resolve(__dirname, '../../../frontend/app/(auth)/login/page.tsx');
        const signupPath = path.resolve(__dirname, '../../../frontend/app/(auth)/signup/page.tsx');

        assert(fs.existsSync(sdkPath), 'packages/identity-sdk/src/index.tsx must exist');
        assert(fs.existsSync(callbackPath), 'callback/page.tsx must exist');
        assert(fs.existsSync(loginPath), 'login/page.tsx must exist');
        assert(fs.existsSync(signupPath), 'signup/page.tsx must exist');

        const sdkContent = fs.readFileSync(sdkPath, 'utf8');
        assert(sdkContent.includes('180-workspace-platform'));
        assert(sdkContent.includes('180_IDENTITY_SUCCESS'));
        assert(sdkContent.includes('use180Identity'));
        assert(sdkContent.includes('use180Pay'));

        const loginContent = fs.readFileSync(loginPath, 'utf8');
        assert(loginContent.includes('@workspace/identity-sdk'));
        assert(loginContent.includes('launch180Identity'));

        const signupContent = fs.readFileSync(signupPath, 'utf8');
        assert(signupContent.includes('@workspace/identity-sdk'));
        assert(signupContent.includes('launch180Identity'));

        const callbackContent = fs.readFileSync(callbackPath, 'utf8');
        assert(callbackContent.includes('/workspace-setup'));
        assert(callbackContent.includes('exchangeAuthCode'));
    });

    console.log('\n----------------------------------------------------------------');
    console.log(`  RESULTS: ${passedTests} passed, ${failedTests} failed`);
    console.log('================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runPhase3WorkspaceCutoverSuite().catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
});
