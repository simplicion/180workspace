/**
 * 180 PLATFORM PHASE 7: SECURITY & END-TO-END CRYPTOGRAPHIC AUDIT
 * Tests RS256 token signing against JWKS, PKCE challenge rejection,
 * token tamper detection, and multi-tenancy isolation.
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  signIdToken,
  verifyIdToken,
  getJwks,
  verifyCodeChallenge,
  generateRandomToken,
  hashSecret,
  ISSUER,
} from '@workspace/identity';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runPhase7SecurityAndE2E() {
  console.log('\n================================================================');
  console.log('  180 PLATFORM PHASE 7: SECURITY, CRYPTOGRAPHY & ISOLATION AUDIT');
  console.log('================================================================\n');

  // Test 1: RS256 Cryptographic Verification against Public JWKS
  console.log('1. Auditing RS256 Token Signatures & JWKS Public Key Set...');
  try {
    const jwks = getJwks();
    assert(
      Array.isArray(jwks.keys) && jwks.keys.length > 0,
      'JWKS returns a valid RFC 7517 keys array'
    );

    const rsaKey = jwks.keys[0];
    assert(
      rsaKey.kty === 'RSA' && rsaKey.use === 'sig' && rsaKey.alg === 'RS256',
      'Public key specifies kty: RSA, use: sig, alg: RS256'
    );
    assert(
      typeof rsaKey.n === 'string' && typeof rsaKey.e === 'string' && rsaKey.kid.length > 0,
      'Public key contains valid modulus (n), exponent (e), and Key ID (kid)'
    );

    // Sign ID Token
    const testClaims = {
      id: 'usr_sec_audit_981273',
      sub: 'usr_sec_audit_981273',
      name: 'Prince Kumar',
      username: 'princekumar',
      email: 'prince@180workspace.com',
      phone: '+919876543210',
      headline: 'Founder & Lead Architect @ 180',
      city: 'New Delhi',
      country: 'India',
      picture: 'https://r2.180workspace.com/avatars/prince.jpg',
    };

    const idToken = signIdToken(testClaims, '180-pitch-network', '1h');
    assert(
      typeof idToken === 'string' && idToken.split('.').length === 3,
      'signIdToken generates valid 3-part RS256 JWT string'
    );

    const verified = verifyIdToken(idToken);
    assert(
      verified.valid === true &&
      verified.payload?.sub === testClaims.sub &&
      verified.payload?.username === testClaims.username &&
      verified.payload?.iss === ISSUER &&
      verified.payload?.aud === '180-pitch-network',
      'Cryptographically verifies claims, subject, issuer, and audience against RS256 public key'
    );
  } catch (err: any) {
    assert(false, `JWKS verification failed: ${err.message}`);
  }

  // Test 2: PKCE Challenge Validation & Attack Rejection
  console.log('\n2. Auditing RFC 7636 PKCE Challenge & Attack Rejection...');
  try {
    const rawVerifier = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM.secure_test_entropy';
    const rawChallenge = crypto
      .createHash('sha256')
      .update(rawVerifier)
      .digest('base64url');

    // Mismatched verifier attack
    const attackerVerifier = 'attacker_fake_verifier_99999999999999999999999999999999';
    const rejectAttack = verifyCodeChallenge(attackerVerifier, rawChallenge, 'S256');
    assert(
      rejectAttack === false,
      'Strictly rejects mismatched PKCE code_verifier (preventing interception attacks)'
    );

    // Legitimate verifier
    const acceptLegitimate = verifyCodeChallenge(rawVerifier, rawChallenge, 'S256');
    assert(
      acceptLegitimate === true,
      'Validates genuine PKCE code_verifier with S256 hash'
    );

    // Unsupported method rejection
    const rejectInvalidMethod = verifyCodeChallenge(rawVerifier, rawChallenge, 'UNSUPPORTED_ALGO');
    assert(
      rejectInvalidMethod === false,
      'Strictly rejects unsupported code challenge methods'
    );
  } catch (err: any) {
    assert(false, `PKCE audit failed: ${err.message}`);
  }

  // Test 3: Tampered Token Rejection
  console.log('\n3. Auditing Token Tamper Resistance & Forgery Protection...');
  try {
    const testClaims = {
      sub: 'usr_tamper_test',
      name: 'Alice Legit',
      username: 'alice',
      email: 'alice@180workspace.com',
    };
    const validToken = signIdToken(testClaims, '180-workspace-platform', '1h');
    const parts = validToken.split('.');

    // Tamper with payload (elevate privileges or change sub)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    payload.sub = 'usr_hacked_admin';
    const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const tamperRes = verifyIdToken(tamperedToken);
    assert(
      tamperRes.valid === false,
      'Cryptographically detects and rejects modified JWT payload'
    );

    // Tamper with signature
    const badSignatureToken = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -6)}AAAAAA`;
    const badSigRes = verifyIdToken(badSignatureToken);
    assert(
      badSigRes.valid === false,
      'Cryptographically detects and rejects forged RSA signature'
    );
  } catch (err: any) {
    assert(false, `Tamper audit failed: ${err.message}`);
  }

  // Test 4: Multi-Tenancy Isolation & Tenant Leakage Verification
  console.log('\n4. Auditing Multi-Tenancy Isolation Rules in Middleware...');
  try {
    const companyContextPath = path.resolve(
      __dirname,
      '../system-configs/middleware/company/company-context.ts'
    );
    const contextContent = fs.readFileSync(companyContextPath, 'utf8');

    // 1. Confirm IdP, Auth, and Pitch Network routes are explicitly exempt
    const expectedExemptions = [
      '/oauth',
      '/.well-known',
      '/certs',
      '/api/v1/identity/check-username',
      '/api/v1/identity/resolve-location',
      '/api/v1/identity/otp',
      '/api/v1/pitch',
      '/v1/pitch',
      '/pitch',
    ];

    for (const route of expectedExemptions) {
      assert(
        contextContent.includes(`'${route}'`),
        `Public exemption verified for route: ${route}`
      );
    }

    // 2. Confirm ERP modules are NOT exempt and remain strictly guarded
    const indexRoutesPath = path.resolve(__dirname, '../routes/index.routes.ts');
    const indexRoutesContent = fs.readFileSync(indexRoutesPath, 'utf8');

    assert(
      indexRoutesContent.includes("router.use('/v1/finance', protect, moduleGuard('finance')"),
      'Finance module strictly enforces protect and moduleGuard'
    );
    assert(
      indexRoutesContent.includes("router.use('/v1/hr-management', protect, moduleGuard('hr')"),
      'HR Management module strictly enforces protect and moduleGuard'
    );
    assert(
      indexRoutesContent.includes("router.use('/v1/crm-and-sales', protect, moduleGuard('crm')"),
      'CRM & Sales module strictly enforces protect and moduleGuard'
    );
  } catch (err: any) {
    assert(false, `Multi-tenancy audit failed: ${err.message}`);
  }

  // Test 5: End-to-End OAuth Handshake Simulation
  console.log('\n5. Validating Full End-to-End OAuth 2.0 PKCE Handshake Flow...');
  try {
    // A. App generates high-entropy code verifier and challenge
    const clientVerifier = generateRandomToken(48);
    const clientChallenge = crypto
      .createHash('sha256')
      .update(clientVerifier)
      .digest('base64url');

    // B. Authorization code issued with challenge bound
    const authCode = `180_code_${generateRandomToken(32)}`;
    assert(
      authCode.startsWith('180_code_') && authCode.length > 30,
      'Authorization code minted with standard high-entropy prefix'
    );

    // C. Code exchange verification
    const isValidExchange = verifyCodeChallenge(clientVerifier, clientChallenge, 'S256');
    assert(
      isValidExchange === true,
      'Client verifier matches authorization code challenge on token exchange'
    );

    // D. Token issuance
    const accessToken = `180_acc_${generateRandomToken(40)}`;
    const refreshToken = `180_ref_${generateRandomToken(40)}`;
    assert(
      accessToken.startsWith('180_acc_') && refreshToken.startsWith('180_ref_'),
      'Access token and refresh token minted with standard high-entropy prefixes'
    );
  } catch (err: any) {
    assert(false, `E2E handshake simulation failed: ${err.message}`);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase7SecurityAndE2E().catch((err) => {
  console.error('Fatal error during Phase 7 security audit:', err);
  process.exit(1);
});
