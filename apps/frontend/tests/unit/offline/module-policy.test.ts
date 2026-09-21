import { OFFLINE_MODULES, isReadCacheablePath, moduleForRoute, tierLabel } from '../../../lib/offline/module-policy';
import { COLLECTIONS } from '../../../lib/offline/queue-policy';

describe('module table invariants', () => {
  it('has unique ids and no route claimed by two modules', () => {
    const ids = OFFLINE_MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const routes = OFFLINE_MODULES.flatMap((m) => m.routes);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('only modules usable offline contribute cacheable API paths', () => {
    for (const m of OFFLINE_MODULES) {
      if (m.tier === 'online-only' || m.tier === 'desktop') expect(m.readApi).toEqual([]);
      else expect(m.readApi.length).toBeGreaterThan(0);
    }
  });

  it('every module that promises offline writes actually has a writable entity behind it', () => {
    const writableCollections = COLLECTIONS.map((c) => c.path);
    const claims: Record<string, string[]> = {
      'projects-and-tasks': ['/api/tasks', '/api/projects'],
      'crm-and-sales': ['/api/clients', '/api/sales/leads'],
    };
    for (const [id, paths] of Object.entries(claims)) {
      expect(OFFLINE_MODULES.find((m) => m.id === id)?.tier).toBe('full');
      for (const p of paths) expect(writableCollections).toContain(p);
    }
    // and nothing else is labelled "full" without a writable collection
    expect(OFFLINE_MODULES.filter((m) => m.tier === 'full').map((m) => m.id).sort()).toEqual(['crm-and-sales', 'projects-and-tasks']);
  });

  it('sensitive and real-time modules are online-only; video editing is desktop-only', () => {
    const tier = (id: string) => OFFLINE_MODULES.find((m) => m.id === id)?.tier;
    for (const id of ['finance', 'insights', 'settings', 'communications', 'voiceforce', 'ai', 'social-inbox', 'service-desk']) expect(tier(id)).toBe('online-only');
    expect(tier('media-editor')).toBe('desktop');
  });

  it('labels every tier for the UI', () => {
    for (const t of ['full', 'read', 'online-only', 'desktop'] as const) expect(tierLabel(t).length).toBeGreaterThan(3);
  });
});

describe('moduleForRoute', () => {
  it.each([
    ['/tasks', 'projects-and-tasks'],
    ['/tasks/abc-123', 'projects-and-tasks'],
    ['/projects/x/notes', 'projects-and-tasks'],
    ['/clients', 'crm-and-sales'],
    ['/sales/leads', 'crm-and-sales'],
    ['/employees/42', 'hr-management'],
    ['/invoices/1', 'finance'],
    ['/wallet', 'finance'],
    ['/settings/platform-billing', 'settings'],
    ['/meeting/room1', 'communications'],
    ['/voiceforce/agents', 'voiceforce'],
    ['/ai', 'ai'],
    ['/media-editor', 'media-editor'],
    ['/video-studio', 'media-editor'],
    ['/dashboard', 'dashboard'],
    ['/', 'dashboard'],
    ['/tasks/', 'projects-and-tasks'],
  ])('%s -> %s', (route, id) => {
    expect(moduleForRoute(route)?.id).toBe(id);
  });

  it('does not match look-alike prefixes or unknown routes', () => {
    expect(moduleForRoute('/taskforce')).toBeNull();
    expect(moduleForRoute('/login')).toBeNull();
    expect(moduleForRoute('')).toBeNull();
    expect(moduleForRoute(undefined)).toBeNull();
  });
});

describe('isReadCacheablePath', () => {
  it('requires a boundary: /api/tasksfoo is not /api/tasks', () => {
    expect(isReadCacheablePath('/api/tasks')).toBe(true);
    expect(isReadCacheablePath('/api/tasks/x')).toBe(true);
    expect(isReadCacheablePath('/api/tasksfoo')).toBe(false);
  });
  it('exact-only entries do not leak to sub-paths', () => {
    expect(isReadCacheablePath('/api/users')).toBe(true);
    expect(isReadCacheablePath('/api/users/123')).toBe(false);
    expect(isReadCacheablePath('/api/users/123/salary')).toBe(false);
  });
  it('the deny list wins over any allowed prefix', () => {
    expect(isReadCacheablePath('/api/clients/1/invoices')).toBe(false);
    expect(isReadCacheablePath('/api/workspace-tools/documents/vaults')).toBe(false);
    expect(isReadCacheablePath('/api/company-config/secrets')).toBe(false);
  });
});
