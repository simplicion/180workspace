/**
 * Run: npx tsx --test apps/backend/src/api/v1/social-media/posts/deliverable-upload.test.ts
 * Covers the multipart gate of POST /social-media/posts/:id/submit-for-approval (limits and types). The DB/R2 part is
 * covered by the curl smoke test in docs/social-studio-mobile/BACKEND_LOCAL.md.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import { deliverableMultipart, maxDeliverableBytes } from './deliverable-upload';

let server: http.Server;
let base = '';
before(async () => {
  const app = express();
  app.post('/upload', deliverableMultipart, (req: any, res) => res.json({ video: req.files?.video?.[0]?.size ?? null }));
  server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }));

const mp4 = (bytes: number) => { const b = Buffer.alloc(bytes); b.write('ftypisom', 4, 'latin1'); return b; };
const send = (field: string, buf: Buffer, type: string) => {
  const fd = new FormData();
  fd.append(field, new Blob([buf], { type }), 'clip.mp4');
  return fetch(base + '/upload', { method: 'POST', body: fd }).then(async (r) => ({ status: r.status, json: (await r.json()) as any }));
};

test('size limit comes from MOBILE_VIDEO_UPLOAD_MAX_MB and oversized uploads get 413', async () => {
  process.env.MOBILE_VIDEO_UPLOAD_MAX_MB = '1';
  assert.equal(maxDeliverableBytes(), 1024 * 1024);
  const ok = await send('video', mp4(512 * 1024), 'video/mp4');
  assert.equal(ok.status, 200);
  const big = await send('video', mp4(1024 * 1024 + 10), 'video/mp4');
  assert.equal(big.status, 413);
  assert.equal(big.json.error, 'FILE_TOO_LARGE');
  process.env.MOBILE_VIDEO_UPLOAD_MAX_MB = 'nonsense';
  assert.equal(maxDeliverableBytes(), 300 * 1024 * 1024, 'invalid value falls back to the 300 MB default');
  delete process.env.MOBILE_VIDEO_UPLOAD_MAX_MB;
});

test('only video/mp4|quicktime in "video" and images in "thumbnail" are accepted', async () => {
  assert.equal((await send('video', mp4(100), 'application/octet-stream')).status, 415);
  assert.equal((await send('thumbnail', mp4(100), 'video/mp4')).status, 415);
  const unexpected = await send('other', mp4(100), 'video/mp4');
  assert.equal(unexpected.status, 400, 'unknown file field');
  assert.match(unexpected.json.message, /video.*thumbnail/);
});
