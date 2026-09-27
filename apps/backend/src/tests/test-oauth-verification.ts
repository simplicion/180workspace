'use strict';

import assert from 'assert';
import crypto from 'crypto';
import {
    getJwks,
    getPrivateKey,
    getPublicKey,
    getKeyId,
    signIdToken,
    verifyIdToken,
    verifyCodeChallenge,
    generateRandomToken,
    hashSecret,
    UsernameService,
    LocationService,
    Msg91OtpService,
    OAuthController
} from '@workspace/identity';

async function runOAuthVerificationSuite() {
    console.log('\n================================================================');
    console.log('  180 IDENTITY & OAUTH 2.0 / OIDC VERIFICATION SUITE');
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

    // ─── Test 1: RSA Keypair & JWKS ───────────────────────────────────────────
    await test('RSA Keypair generates valid PEMs and Key ID', () => {
        const priv = getPrivateKey();
        const pub = getPublicKey();
        const kid = getKeyId();

        assert(priv.includes('BEGIN PRIVATE KEY'), 'Private key must be valid PEM');
        assert(pub.includes('BEGIN PUBLIC KEY'), 'Public key must be valid PEM');
        assert.strictEqual(typeof kid, 'string');
        assert(kid.length > 0);
    });

    await test('getJwks() returns RFC 7517 compliant JWKS payload', () => {
        const jwks = getJwks();
        assert(Array.isArray(jwks.keys), 'JWKS must contain keys array');
        assert(jwks.keys.length > 0, 'JWKS must have at least one key');

        const key = jwks.keys[0];
        assert.strictEqual(key.kty, 'RSA');
        assert.strictEqual(key.use, 'sig');
        assert.strictEqual(key.alg, 'RS256');
        assert.strictEqual(typeof key.n, 'string');
        assert.strictEqual(typeof key.e, 'string');
        assert.strictEqual(key.kid, getKeyId());
    });

    // ─── Test 2: RFC 7636 PKCE Verification ──────────────────────────────────
    await test('verifyCodeChallenge() validates RFC 7636 S256 verifier correctly', () => {
        const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
        const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

        assert.strictEqual(verifyCodeChallenge(verifier, challenge, 'S256'), true);
        assert.strictEqual(verifyCodeChallenge('wrong_verifier_string', challenge, 'S256'), false);
    });

    await test('verifyCodeChallenge() validates plain PKCE method', () => {
        const plainStr = 'sample_plain_challenge_string';
        assert.strictEqual(verifyCodeChallenge(plainStr, plainStr, 'plain'), true);
        assert.strictEqual(verifyCodeChallenge('wrong', plainStr, 'plain'), false);
    });

    // ─── Test 3: RS256 ID Token Signing & Verification ────────────────────────
    await test('signIdToken() produces valid RS256 JWT with user claims', () => {
        const mockUser = {
            id: 'usr_test_123',
            name: 'Prince Kumar',
            username: 'princekumar',
            email: 'prince@180workspace.com',
            emailVerified: new Date(),
            phone: '+919876543210',
            headline: 'Architect',
            latitude: 28.6139,
            longitude: 77.2090,
            city: 'New Delhi',
            country: 'India'
        };

        const clientId = 'client_app_abc';
        const nonce = 'nonce_secure_999';

        const token = signIdToken(mockUser, clientId, nonce, 3600);
        assert.strictEqual(typeof token, 'string');
        assert.strictEqual(token.split('.').length, 3, 'JWT must have 3 segments');

        // Cryptographically verify token
        const verified = verifyIdToken(token, clientId);
        assert.strictEqual(verified.valid, true, verified.error);
        assert.strictEqual(verified.payload.sub, mockUser.id);
        assert.strictEqual(verified.payload.name, mockUser.name);
        assert.strictEqual(verified.payload.username, mockUser.username);
        assert.strictEqual(verified.payload.email, mockUser.email);
        assert.strictEqual(verified.payload.aud, clientId);
        assert.strictEqual(verified.payload.nonce, nonce);
        assert.strictEqual(verified.payload.location.city, 'New Delhi');
    });

    await test('verifyIdToken() strictly rejects audience mismatch', () => {
        const mockUser = { id: 'usr_test_123', email: 'test@180workspace.com' };
        const token = signIdToken(mockUser, 'correct_client_id');

        const wrongAud = verifyIdToken(token, 'attacker_client_id');
        assert.strictEqual(wrongAud.valid, false);
        assert(wrongAud.error?.includes('audience mismatch'));
    });

    await test('verifyIdToken() strictly rejects unsigned or forged tokens', () => {
        const forged = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.';
        const result = verifyIdToken(forged);
        assert.strictEqual(result.valid, false);
    });

    // ─── Test 4: Token Generation & Secret Hashing ───────────────────────────
    await test('generateRandomToken() produces unique tokens with prefix', () => {
        const token1 = generateRandomToken('180_code', 32);
        const token2 = generateRandomToken('180_code', 32);

        assert(token1.startsWith('180_code_'));
        assert(token2.startsWith('180_code_'));
        assert.notStrictEqual(token1, token2);
    });

    await test('hashSecret() produces reliable SHA-256 digest', () => {
        const secret = 'super_secret_client_key_180';
        const hash = hashSecret(secret);
        const expected = crypto.createHash('sha256').update(secret).digest('hex');
        assert.strictEqual(hash, expected);
    });

    // ─── Test 5: OpenID Discovery Metadata ────────────────────────────────────
    await test('OAuthController.getOpenIdConfiguration returns complete discovery document', () => {
        let sentJson: any = null;
        const mockRes = {
            json: (data: any) => { sentJson = data; }
        };

        OAuthController.getOpenIdConfiguration({}, mockRes);
        assert(sentJson !== null);
        assert(sentJson.authorization_endpoint.includes('/oauth/authorize'));
        assert(sentJson.token_endpoint.includes('/oauth/token'));
        assert(sentJson.jwks_uri.includes('/.well-known/jwks.json'));
        assert(sentJson.response_types_supported.includes('code'));
        assert(sentJson.scopes_supported.includes('openid'));
        assert(sentJson.scopes_supported.includes('identity:read'));
    });

    // ─── Test 6: Username Generation & Availability ───────────────────────────
    await test('UsernameService.normalizeUsername() sanitizes invalid characters', () => {
        assert.strictEqual(UsernameService.normalizeUsername('Prince Kumar!@#'), 'princekumar');
        assert.strictEqual(UsernameService.normalizeUsername('  Hello_World-123  '), 'hello_world123');
    });

    await test('UsernameService.generateUniqueUsername() creates valid handle from Name', async () => {
        const username = await UsernameService.generateUniqueUsername('Prince Kumar');
        assert(username.length >= 3);
        assert(/^[a-z0-9_]+$/.test(username), 'Username must contain only a-z, 0-9, and _');
    });

    // ─── Test 7: Location Geocoding Fallback ──────────────────────────────────
    await test('LocationService.resolveCoordinates() handles coordinate resolution', async () => {
        const location = await LocationService.resolveCoordinates(28.6139, 77.2090);
        assert.strictEqual(typeof location.latitude, 'number');
        assert.strictEqual(typeof location.longitude, 'number');
        assert(location.formatted.length > 0);
    });

    // ─── Test 8: MSG91 WhatsApp OTP Dispatch Simulation ───────────────────────
    await test('Msg91OtpService handles WhatsApp OTP gracefully in DEV mode', async () => {
        const res = await Msg91OtpService.sendWhatsAppOtp('+919876543210');
        assert.strictEqual(res.success, true);
        assert(res.message.includes('OTP'));
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

runOAuthVerificationSuite().catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
});
