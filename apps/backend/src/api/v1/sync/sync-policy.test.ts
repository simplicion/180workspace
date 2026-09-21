/**
 * Run: npx tsx --test apps/backend/src/api/v1/sync/sync-policy.test.ts
 * (Backend jest only matches __tests__/*.test.js and has no TS transform, so this uses node:test like the
 *  video-engine-runtime harness.)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyMutation, mapHttpStatus, validateBody, MAX_MUTATION_BODY_BYTES } from './sync-policy';

const UUID = '3f2b8c1e-9a4d-4e0b-8f6a-1c2d3e4f5a6b';

test('classifies create / update / delete on supported collections', () => {
  const create = classifyMutation('POST', '/api/tasks');
  assert.ok(create.ok && create.action === 'CREATE' && create.rule.entityType === 'task');

  const update = classifyMutation('put', `/api/projects/${UUID}`);
  assert.ok(update.ok && update.action === 'UPDATE' && update.entityId === UUID);

  const del = classifyMutation('DELETE', `/api/clients/${UUID}`);
  assert.ok(del.ok && del.action === 'DELETE' && del.rule.entityType === 'client');
});

test('leads: full CRUD; leave requests: apply and cancel only (approval and editing stay online)', () => {
  assert.ok(classifyMutation('POST', '/api/sales/leads').ok);
  const upd = classifyMutation('PUT', `/api/sales/leads/${UUID}`);
  assert.ok(upd.ok && upd.rule.entityType === 'lead' && upd.action === 'UPDATE');
  assert.ok(classifyMutation('DELETE', `/api/sales/leads/${UUID}`).ok);
  assert.equal(classifyMutation('POST', '/api/sales/leads/bulk-delete').ok, false);
  assert.equal(classifyMutation('POST', `/api/sales/leads/${UUID}/convert`).ok, false);

  const apply = classifyMutation('POST', '/api/leaves');
  assert.ok(apply.ok && apply.rule.entityType === 'leave' && apply.action === 'CREATE');
  assert.ok(classifyMutation('DELETE', `/api/leaves/${UUID}`).ok);
  const edit = classifyMutation('PUT', `/api/leaves/${UUID}`);
  assert.ok(!edit.ok && edit.code === 'bad_method', 'leave requests cannot be edited offline');
  assert.equal(classifyMutation('PUT', `/api/leaves/${UUID}/review`).ok, false, 'approval is online-only');
});

test('rejects unsupported entities, nested resources and bulk endpoints', () => {
  for (const p of ['/api/users', '/api/tasks/bulk-delete', `/api/tasks/${UUID}/attachments`, '/api/auth/login', '/api/billing/pay']) {
    const r = classifyMutation('POST', p);
    assert.equal(r.ok, false, p);
  }
});

test('rejects path traversal, encoding tricks, absolute URLs and query strings', () => {
  for (const p of [
    '/api/tasks/../users',
    '/api/tasks/%2e%2e/users',
    'https://evil.example/api/tasks',
    '//evil.example/api/tasks',
    '/api/tasks?x=1',
    '/api/tasks#frag',
    '/api/tasks/ab cdefgh',
    '/api\\tasks',
    '/api/tasks/./x1234567',
    '',
  ]) {
    assert.equal(classifyMutation('POST', p).ok, false, JSON.stringify(p));
  }
});

test('rejects unresolved client-side temp ids so they are remapped before replay', () => {
  for (const id of ['temp_1726900000_ab12', 'tmp-abcdef12', 'offline_1726', 'local_123456789']) {
    const r = classifyMutation('PUT', `/api/tasks/${id}`);
    assert.ok(!r.ok && r.code === 'unresolved_temp_id', id);
  }
});

test('rejects invalid method/path combinations', () => {
  assert.equal(classifyMutation('PATCH', `/api/tasks/${UUID}`).ok, false);
  assert.equal(classifyMutation('GET', '/api/tasks').ok, false);
  assert.equal(classifyMutation('DELETE', '/api/tasks').ok, false);
  assert.equal(classifyMutation('POST', `/api/tasks/${UUID}`).ok, false);
  assert.equal(classifyMutation(undefined, '/api/tasks').ok, false);
  assert.equal(classifyMutation('POST', undefined).ok, false);
});

test('validates bodies', () => {
  assert.equal(validateBody('POST', { title: 'x' }).ok, true);
  assert.equal(validateBody('DELETE', undefined).ok, true);
  assert.equal(validateBody('POST', null).ok, false);
  assert.equal(validateBody('PUT', [1, 2]).ok, false);
  assert.equal(validateBody('POST', 'str').ok, false);
  assert.equal(validateBody('POST', { blob: 'x'.repeat(MAX_MUTATION_BODY_BYTES + 1) }).ok, false);
});

test('maps HTTP outcomes to sync statuses', () => {
  assert.deepEqual(mapHttpStatus('CREATE', 201), { status: 'applied' });
  assert.equal(mapHttpStatus('UPDATE', 401).status, 'retry');
  assert.equal(mapHttpStatus('UPDATE', 429).status, 'retry');
  assert.equal(mapHttpStatus('UPDATE', 502).status, 'retry');
  assert.equal(mapHttpStatus('UPDATE', 409).status, 'conflict');
  assert.equal(mapHttpStatus('UPDATE', 404).status, 'conflict');
  assert.equal(mapHttpStatus('DELETE', 404).status, 'applied'); // deleting something already gone is a success
  assert.equal(mapHttpStatus('CREATE', 403).status, 'rejected');
  assert.equal(mapHttpStatus('CREATE', 402).status, 'rejected');
  assert.equal(mapHttpStatus('CREATE', 400).status, 'rejected');
  assert.equal(mapHttpStatus('CREATE', 422).status, 'rejected');
});
