/**
 * Run: npx tsx --test --test-force-exit apps/backend/src/system-configs/middleware/system/central-upload-gate.test.ts
 * The multipart gate of POST /api/files/upload: missing file -> 400 NO_FILE, oversize -> 413, bad type -> 415.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import { requireSingleFile, MAX_UPLOAD_BYTES } from './central-upload';

let server: http.Server;
let base = '';
before(async () => {
  const app = express();
  app.post('/upload', requireSingleFile('file'), (req: any, res) => res.json({ size: req.file.size }));
  server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }));

const send = (fd: FormData) => fetch(base + '/upload', { method: 'POST', body: fd }).then(async (r) => ({ status: r.status, json: (await r.json()) as any }));
const withFile = (bytes: number, type = 'text/plain', field = 'file') => {
  const fd = new FormData();
  fd.append(field, new Blob([Buffer.alloc(bytes)], { type }), 'a.txt');
  return fd;
};

test('no file -> 400 NO_FILE (not a 500 "Storage not configured")', async () => {
  const fd = new FormData();
  fd.append('name', 'x');
  const r = await send(fd);
  assert.equal(r.status, 400);
  assert.equal(r.json.error, 'NO_FILE');
  const empty = await fetch(base + '/upload', { method: 'POST' });
  assert.equal(empty.status, 400);
});

test('a file under the wrong field name is a 400 client error', async () => {
  assert.equal((await send(withFile(10, 'text/plain', 'upload'))).status, 400);
});

test('a valid file passes through', async () => {
  const r = await send(withFile(1024));
  assert.equal(r.status, 200);
  assert.equal(r.json.size, 1024);
});

test('oversize -> 413 FILE_TOO_LARGE with the real limit in the message', async () => {
  const r = await send(withFile(MAX_UPLOAD_BYTES + 1));
  assert.equal(r.status, 413);
  assert.equal(r.json.error, 'FILE_TOO_LARGE');
  assert.match(r.json.message, /50 MB/);
});

test('disallowed type -> 415', async () => {
  const r = await send(withFile(10, 'application/x-msdownload'));
  assert.equal(r.status, 415);
});
