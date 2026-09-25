/**
 * Run: npx tsx --test apps/backend/src/system-configs/utils/sanitize-user.test.ts
 * No *Hash / secret / password field may leave the API through sanitizeUser (login, Google login, /auth/me, ...).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeUser, sanitizeUsers, PUBLIC_COMPANY_FIELDS } from './sanitize-user';

const leakyKey = /(hash|secret|password|otp|apikey|refreshtokens)/i;
function sensitiveKeys(value: any, path = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([k, v]) => [...(leakyKey.test(k) ? [`${path}${k}`] : []), ...sensitiveKeys(v, `${path}${k}.`)]);
}

const userWithCompany = () => ({
  id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'admin', companyId: 'c1',
  password: '$2a$10$hash', mfaSecret: 'MFA', otpCode: '123456', otpExpiry: new Date(), apiKey: 'k', refreshTokens: ['t'],
  company: {
    id: 'c1', name: 'Acme', slug: 'acme', customDomain: null, logoUrl: 'https://cdn/logo.png', bannerUrl: null,
    isOnboardingComplete: true, currency: 'USD', currencySymbol: '$',
    adminPasswordHash: '$2a$10$companyhash', adminEmail: 'owner@acme.test', adminPhone: '+100000', adminName: 'Owner',
    subscriptionStatus: 'active', nextChargeDate: new Date(), autopayEnabled: true, mandateStatus: 'active',
    voiceBalanceInr: 1234.5, metadata: { geminiKey: 'AI-KEY', openaiKey: 'AI-KEY' }, privacySettings: {},
  },
  employeeProfile: { bankAccount: { accountNumber: '1', webhookSecret: 's', pinHash: 'h' } },
});

test('user.company is reduced to the public allow-list (no admin hash, contact, billing or AI keys)', () => {
  const out = sanitizeUser(userWithCompany());
  assert.deepEqual(Object.keys(out.company).sort(), Object.keys(out.company).filter((k) => PUBLIC_COMPANY_FIELDS.includes(k)).sort());
  for (const k of ['adminPasswordHash', 'adminEmail', 'adminPhone', 'subscriptionStatus', 'nextChargeDate', 'voiceBalanceInr', 'metadata', 'mandateStatus']) {
    assert.equal(out.company[k], undefined, k);
  }
  // Fields the web (NextAuth) and mobile clients read survive.
  assert.equal(out.company.id, 'c1');
  assert.equal(out.company.name, 'Acme');
  assert.equal(out.company.slug, 'acme');
  assert.equal(out.company.logoUrl, 'https://cdn/logo.png');
  assert.equal(out.company.isOnboardingComplete, true);
});

test('no *Hash / secret / password / otp / apiKey field survives at any depth', () => {
  const out = sanitizeUser(userWithCompany());
  assert.deepEqual(sensitiveKeys(out), []);
  assert.equal(JSON.stringify(out).includes('AI-KEY'), false);
  assert.deepEqual(sensitiveKeys(sanitizeUsers([userWithCompany(), userWithCompany()])), []);
});

test('ordinary user fields are kept, the input is not mutated, and dates stay dates', () => {
  const input = userWithCompany();
  const out = sanitizeUser(input);
  assert.equal(out.email, 'ana@example.com');
  assert.equal(out.role, 'admin');
  assert.ok(out.otpExpiry === undefined);
  assert.equal(input.company.adminPasswordHash, '$2a$10$companyhash');
  assert.equal(input.password, '$2a$10$hash');
  assert.equal(sanitizeUser(null), null);
  assert.ok(sanitizeUser({ id: 'x', createdAt: new Date(0) }).createdAt instanceof Date);
});
