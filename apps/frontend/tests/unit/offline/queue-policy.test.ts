import { cacheKeyFor, classifyForQueue, isCacheableGet, normalizeApiPath } from '../../../lib/offline/queue-policy';

const ID = '3f2b8c1e-9a4d-4e0b-8f6a-1c2d3e4f5a6b';

describe('normalizeApiPath', () => {
  it('strips origin, query and hash and folds /api/v1 into /api', () => {
    expect(normalizeApiPath('https://api.180workspace.com/api/v1/tasks?x=1#y')).toBe('/api/tasks');
    expect(normalizeApiPath('/api/tasks/')).toBe('/api/tasks');
    expect(normalizeApiPath('api/tasks')).toBe('/api/tasks');
  });
  it('rejects non-API urls', () => {
    expect(normalizeApiPath('/dashboard')).toBeNull();
    expect(normalizeApiPath('')).toBeNull();
    expect(normalizeApiPath(undefined)).toBeNull();
  });
});

describe('classifyForQueue (what may be queued while offline)', () => {
  it('accepts create/update/delete on tasks, projects and clients', () => {
    expect(classifyForQueue('POST', '/api/tasks')).toMatchObject({ entityType: 'task', action: 'CREATE' });
    expect(classifyForQueue('put', `/api/projects/${ID}`)).toMatchObject({ entityType: 'project', action: 'UPDATE', entityId: ID });
    expect(classifyForQueue('DELETE', `/api/clients/${ID}`)).toMatchObject({ entityType: 'client', action: 'DELETE' });
    expect(classifyForQueue('POST', 'https://x.example/api/v1/tasks')).toMatchObject({ path: '/api/tasks' });
  });

  it('accepts edits of entities created offline (temp ids) so they can merge into the pending create', () => {
    expect(classifyForQueue('PUT', '/api/tasks/temp_3f2b8c1e-9a4d-4e0b')).toMatchObject({ action: 'UPDATE' });
  });

  it('refuses everything that must fail normally when offline', () => {
    for (const [m, u] of [
      ['POST', '/api/auth/login'],
      ['POST', '/api/auth/register-user'],
      ['PUT', `/api/users/${ID}`],
      ['POST', '/api/wallet/topup'],
      ['POST', '/api/v1/crm-and-sales/sales/ai/chat'],
      ['POST', '/api/tasks/bulk-delete'],
      ['POST', `/api/tasks/${ID}/attachments`],
      ['POST', `/api/projects/${ID}/notes`],
      ['PATCH', `/api/tasks/${ID}`],
      ['GET', '/api/tasks'],
      ['POST', `/api/tasks/${ID}`],
      ['DELETE', '/api/tasks'],
    ] as const) {
      expect(classifyForQueue(m, u)).toBeNull();
    }
  });

  it('supports leads and leave requests, but only the actions a user may perform offline', () => {
    expect(classifyForQueue('POST', '/api/sales/leads')).toMatchObject({ entityType: 'lead', action: 'CREATE' });
    expect(classifyForQueue('PUT', `/api/sales/leads/${ID}`)).toMatchObject({ entityType: 'lead', action: 'UPDATE' });
    expect(classifyForQueue('DELETE', `/api/sales/leads/${ID}`)).toMatchObject({ entityType: 'lead', action: 'DELETE' });
    // bulk and conversion endpoints stay online
    expect(classifyForQueue('POST', '/api/sales/leads/bulk-delete')).toBeNull();
    expect(classifyForQueue('POST', `/api/sales/leads/${ID}/convert`)).toBeNull();
    // employees apply for and cancel leave offline; approval is a manager action and editing is not offered
    expect(classifyForQueue('POST', '/api/leaves')).toMatchObject({ entityType: 'leave', action: 'CREATE' });
    expect(classifyForQueue('DELETE', `/api/leaves/${ID}`)).toMatchObject({ entityType: 'leave', action: 'DELETE' });
    expect(classifyForQueue('PUT', `/api/leaves/${ID}`)).toBeNull();
    expect(classifyForQueue('PUT', `/api/leaves/${ID}/review`)).toBeNull();
  });

  it('refuses malformed ids', () => {
    expect(classifyForQueue('PUT', '/api/tasks/x')).toBeNull();
    expect(classifyForQueue('PUT', '/api/tasks/a b c d e f g h')).toBeNull();
  });
});

describe('read cache allowlist', () => {
  it('caches boot payload and entity reads only', () => {
    expect(isCacheableGet('/api/init')).toBe(true);
    expect(isCacheableGet('/api/tasks?limit=30')).toBe(true);
    expect(isCacheableGet(`/api/projects/${ID}`)).toBe(true);
    expect(isCacheableGet('/api/wallet/balance')).toBe(false);
    expect(isCacheableGet('/api/auth/me')).toBe(false);
    // sub-resources of a cacheable module are cacheable too
    expect(isCacheableGet(`/api/tasks/${ID}/comments`)).toBe(true);
    expect(isCacheableGet('/api/sales/leads')).toBe(true);
    expect(isCacheableGet('/api/v1/crm-and-sales/sales/leads')).toBe(true);
    // the team directory list, but never an individual employee record
    expect(isCacheableGet('/api/users')).toBe(true);
    expect(isCacheableGet(`/api/users/${ID}`)).toBe(false);
    // sensitive areas are never written to the device, even under a cacheable prefix
    for (const p of ['/api/salary', '/api/salary/preview', '/api/wallet/transactions', '/api/invoices', `/api/clients/${ID}/invoices`, '/api/workspace-tools/vaults', '/api/integrations/google', '/api/finance/dashboard-stats', '/api/analytics/financial', '/api/social-media/inbox', '/api/social-media/accounts', '/api/platform-billing/plans', '/api/chat', '/api/voiceforce/agents']) {
      expect(isCacheableGet(p)).toBe(false);
    }
  });

  it('builds order-independent cache keys and ignores empty params', () => {
    const a = cacheKeyFor('/api/tasks?b=2&a=1');
    const b = cacheKeyFor('/api/tasks', { a: 1, b: 2 });
    const c = cacheKeyFor('/api/tasks', { b: 2, a: 1, empty: '', nil: null, undef: undefined });
    expect(a).toBe('/api/tasks?a=1&b=2');
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(cacheKeyFor('/api/init')).toBe('/api/init');
    expect(cacheKeyFor('/not-api')).toBeNull();
  });
});
