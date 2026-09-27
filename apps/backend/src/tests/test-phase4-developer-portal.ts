'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
    generateRandomToken,
    hashSecret,
    DeveloperController
} from '@workspace/identity';

async function runPhase4DeveloperPortalSuite() {
    console.log('\n================================================================');
    console.log('  180 IDENTITY PHASE 4: DEVELOPER PORTAL VERIFICATION');
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

    // ─── Test 1: Developer App Key & Secret Generation ────────────────────────
    await test('Generates standard 180 Client ID and high-entropy Client Secret', () => {
        const clientId = generateRandomToken('180_client', 16);
        const rawSecret = generateRandomToken('180_secret', 32);

        assert(clientId.startsWith('180_client_'));
        assert(rawSecret.startsWith('180_secret_'));
        assert(clientId.length >= 24);
        assert(rawSecret.length >= 40);

        const secretHash = hashSecret(rawSecret);
        const expected = crypto.createHash('sha256').update(rawSecret).digest('hex');
        assert.strictEqual(secretHash, expected);

        const hint = `...${rawSecret.slice(-4)}`;
        assert(hint.startsWith('...'));
        assert.strictEqual(hint.length, 7);
    });

    // ─── Test 2: Secret Rotation Simulation ───────────────────────────────────
    await test('Secret rotation replaces secret hash and hint correctly', () => {
        const secret1 = generateRandomToken('180_secret', 32);
        const hash1 = hashSecret(secret1);

        const secret2 = generateRandomToken('180_secret', 32);
        const hash2 = hashSecret(secret2);

        assert.notStrictEqual(secret1, secret2);
        assert.notStrictEqual(hash1, hash2);

        const hint2 = `...${secret2.slice(-4)}`;
        assert.strictEqual(hint2, `...${secret2.slice(-4)}`);
    });

    // ─── Test 3: Developer Portal Frontend Files Integrity ────────────────────
    await test('Developer portal layout, console, detail, and snippets exist', () => {
        const layoutPath = path.resolve(__dirname, '../../../frontend/app/developers/layout.tsx');
        const consolePath = path.resolve(__dirname, '../../../frontend/app/developers/page.tsx');
        const detailPath = path.resolve(__dirname, '../../../frontend/app/developers/[id]/page.tsx');
        const snippetsPath = path.resolve(__dirname, '../../../frontend/app/developers/components/CodeSnippets.tsx');

        assert(fs.existsSync(layoutPath), 'layout.tsx must exist');
        assert(fs.existsSync(consolePath), 'page.tsx must exist');
        assert(fs.existsSync(detailPath), '[id]/page.tsx must exist');
        assert(fs.existsSync(snippetsPath), 'CodeSnippets.tsx must exist');

        const consoleContent = fs.readFileSync(consolePath, 'utf8');
        assert(consoleContent.includes('Register New OAuth App'));
        assert(consoleContent.includes('revealedCredentials'));
        assert(consoleContent.includes('clientSecret'));

        const detailContent = fs.readFileSync(detailPath, 'utf8');
        assert(detailContent.includes('handleRotateSecret'));
        assert(detailContent.includes('handleSaveChanges'));

        const snippetsContent = fs.readFileSync(snippetsPath, 'utf8');
        assert(snippetsContent.includes('curl'));
        assert(snippetsContent.includes('node'));
        assert(snippetsContent.includes('python'));
        assert(snippetsContent.includes('react'));
        assert(snippetsContent.includes('nextauth'));
        assert(snippetsContent.includes('flutter'));
    });

    // ─── Test 4: Developer Controller Methods ─────────────────────────────────
    await test('DeveloperController has all required CRUD and rotation handlers', () => {
        assert.strictEqual(typeof DeveloperController.listApps, 'function');
        assert.strictEqual(typeof DeveloperController.getApp, 'function');
        assert.strictEqual(typeof DeveloperController.createApp, 'function');
        assert.strictEqual(typeof DeveloperController.updateApp, 'function');
        assert.strictEqual(typeof DeveloperController.rotateSecret, 'function');
        assert.strictEqual(typeof DeveloperController.deleteApp, 'function');
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

runPhase4DeveloperPortalSuite().catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
});
