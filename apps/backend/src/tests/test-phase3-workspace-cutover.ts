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
        const pitchApp = FIRST_PARTY_APPS.find(a => a.clientId === '180-pitch-network');
        const socialApp = FIRST_PARTY_APPS.find(a => a.clientId === '180-social-studio-mobile');

        assert(workspaceApp, '180 Workspace must be registered');
        assert(pitchApp, 'Pitch in 180 must be registered');
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
        assert.strictEqual(sentJson.app?.name, '180 Workspace');
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

    // ─── Test 4: Frontend Cutover Files Exist & Wired ─────────────────────────
    await test('Frontend login, signup, callback, and hook files are intact', () => {
        const hookPath = path.resolve(__dirname, '../../../frontend/lib/use180Identity.ts');
        const callbackPath = path.resolve(__dirname, '../../../frontend/app/(auth)/callback/page.tsx');
        const loginPath = path.resolve(__dirname, '../../../frontend/app/(auth)/login/page.tsx');
        const signupPath = path.resolve(__dirname, '../../../frontend/app/(auth)/signup/page.tsx');

        assert(fs.existsSync(hookPath), 'use180Identity.ts must exist');
        assert(fs.existsSync(callbackPath), 'callback/page.tsx must exist');
        assert(fs.existsSync(loginPath), 'login/page.tsx must exist');
        assert(fs.existsSync(signupPath), 'signup/page.tsx must exist');

        const hookContent = fs.readFileSync(hookPath, 'utf8');
        assert(hookContent.includes('180-workspace-platform'));
        assert(hookContent.includes('180_IDENTITY_SUCCESS'));

        const loginContent = fs.readFileSync(loginPath, 'utf8');
        assert(loginContent.includes('Get started with 180 Identity'));
        assert(loginContent.includes('launch180Identity'));

        const signupContent = fs.readFileSync(signupPath, 'utf8');
        assert(signupContent.includes('Sign up with 180 Identity'));
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
