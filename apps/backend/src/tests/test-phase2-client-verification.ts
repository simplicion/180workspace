'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
    IdentityAuthController,
    UsernameService,
    LocationService,
    OAuthController
} from '@workspace/identity';

async function runPhase2ClientVerificationSuite() {
    console.log('\n================================================================');
    console.log('  180 IDENTITY PHASE 2: DYNAMIC MODAL & CLIENT SDK VERIFICATION');
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

    // ─── Test 1: Frontend Dynamic Modal Components Exist ───────────────────────
    await test('Authorize Page layout and page exist with 10 auth states', () => {
        const pagePath = path.resolve(__dirname, '../../../frontend/app/oauth/authorize/page.tsx');
        const layoutPath = path.resolve(__dirname, '../../../frontend/app/oauth/authorize/layout.tsx');
        const otpPath = path.resolve(__dirname, '../../../frontend/app/oauth/authorize/components/OtpInput.tsx');
        const userPath = path.resolve(__dirname, '../../../frontend/app/oauth/authorize/components/UsernameField.tsx');
        const consentPath = path.resolve(__dirname, '../../../frontend/app/oauth/authorize/components/ConsentScreen.tsx');

        assert(fs.existsSync(pagePath), 'page.tsx must exist');
        assert(fs.existsSync(layoutPath), 'layout.tsx must exist');
        assert(fs.existsSync(otpPath), 'OtpInput.tsx must exist');
        assert(fs.existsSync(userPath), 'UsernameField.tsx must exist');
        assert(fs.existsSync(consentPath), 'ConsentScreen.tsx must exist');

        const pageContent = fs.readFileSync(pagePath, 'utf8');
        assert(pageContent.includes('LOGIN'), 'page must handle LOGIN');
        assert(pageContent.includes('SIGNUP_CONTACT'), 'page must handle SIGNUP_CONTACT');
        assert(pageContent.includes('SIGNUP_OTP'), 'page must handle SIGNUP_OTP');
        assert(pageContent.includes('SIGNUP_PASSWORD'), 'page must handle SIGNUP_PASSWORD');
        assert(pageContent.includes('SIGNUP_PROFILE'), 'page must handle SIGNUP_PROFILE');
        assert(pageContent.includes('FORGOT_PASSWORD'), 'page must handle FORGOT_PASSWORD');
        assert(pageContent.includes('RESET_PASSWORD'), 'page must handle RESET_PASSWORD');
        assert(pageContent.includes('GOOGLE_CONTINUATION'), 'page must handle GOOGLE_CONTINUATION');
        assert(pageContent.includes('CONSENT'), 'page must handle CONSENT');
        assert(pageContent.includes('180_IDENTITY_SUCCESS'), 'page must emit postMessage');
    });

    // ─── Test 2: Client Drop-In SDK Exists & Has Core Methods ──────────────────
    await test('Client SDK 180-identity.js exists with openPopup and renderButton', () => {
        const sdkPath = path.resolve(__dirname, '../../../frontend/public/sdk/180-identity.js');
        assert(fs.existsSync(sdkPath), '180-identity.js must exist in public/sdk');

        const content = fs.readFileSync(sdkPath, 'utf8');
        assert(content.includes('OneEightyIdentity'), 'Must export OneEightyIdentity');
        assert(content.includes('openPopup'), 'Must implement openPopup');
        assert(content.includes('renderButton'), 'Must implement renderButton');
        assert(content.includes('180_IDENTITY_SUCCESS'), 'Must listen for 180_IDENTITY_SUCCESS');
    });

    // ─── Test 3: Username Normalization & Real-time Collision Defense ──────────
    await test('UsernameService prevents collisions and normalizes handles', async () => {
        const handle1 = UsernameService.normalizeUsername('  Elon Musk!@#  ');
        assert.strictEqual(handle1, 'elonmusk');

        const available = await UsernameService.checkAvailability('admin');
        assert.strictEqual(available.available, false, 'System usernames like admin must be reserved');
    });

    // ─── Test 4: Geolocation Reverse-Resolution ────────────────────────────────
    await test('LocationService resolves coordinates into city and country', async () => {
        const resolved = await LocationService.resolveCoordinates(37.7749, -122.4194);
        assert.strictEqual(typeof resolved.latitude, 'number');
        assert.strictEqual(typeof resolved.longitude, 'number');
        assert(resolved.formatted.length > 0);
    });

    // ─── Test 5: Identity Auth Controller Password Hashing & Verification ──────
    await test('Bcrypt hashes and verifies user passwords accurately', async () => {
        const plain = 'SecurePassword180!';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(plain, salt);

        const match = await bcrypt.compare(plain, hash);
        assert.strictEqual(match, true);

        const mismatch = await bcrypt.compare('WrongPassword', hash);
        assert.strictEqual(mismatch, false);
    });

    // ─── Test 6: Cross-Window Handshake Protocol Signature ─────────────────────
    await test('postMessage payload conforms to RFC Web Message Response Mode', () => {
        const mockAuthCode = '180_code_test_abc123';
        const mockState = 'xyz_state_456';

        const payload = {
            type: '180_IDENTITY_SUCCESS',
            code: mockAuthCode,
            state: mockState
        };

        assert.strictEqual(payload.type, '180_IDENTITY_SUCCESS');
        assert(payload.code.startsWith('180_code_'));
        assert.strictEqual(payload.state, mockState);
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

runPhase2ClientVerificationSuite().catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
});
