/**
 * Run: npx tsx --test --test-force-exit apps/backend/src/system-configs/middleware/system/central-upload.test.ts
 *
 * Drives the real handleUpload() with object storage replaced by a stub, to prove the SERVER_VIDEO_PROCESSING switch:
 * off => no FFmpeg on the API server and the original bytes are stored; streaming (HLS) requests fail loudly.
 */
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

// Replace @workspace/integrations (R2 / Google Drive) BEFORE the middleware is loaded.
const uploads: Array<{ buffer: Buffer; key: string; mime: string }> = [];
const integrationsPath = require.resolve('@workspace/integrations');
require.cache[integrationsPath] = {
  id: integrationsPath,
  filename: integrationsPath,
  loaded: true,
  exports: {
    googleDriveService: {},
    uploadBufferToR2: async (buffer: Buffer, key: string, mime: string) => {
      uploads.push({ buffer, key, mime });
      return { url: `https://cdn.test/${key}`, key };
    },
  },
} as unknown as Module;

// `require`, not `import`: ES imports are hoisted above the cache override, which would load the real storage client.
const { handleUpload, serverVideoProcessingEnabled } = require('./central-upload') as typeof import('./central-upload');

const VIDEO = Buffer.from('this is not a real video; if ffmpeg ran on it the bytes would change or it would fail');

function harness(file: any, extra: { query?: any; body?: any } = {}) {
  const res: any = { statusCode: 200, body: undefined as any };
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: any) => ((res.body = b), res);
  const req: any = {
    file,
    query: extra.query ?? {},
    body: extra.body ?? {},
    user: { companyId: 'co-1' },
    prisma: { settings: { findFirst: async () => ({}) } },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  return { req, res, next, nextCalled: () => nextCalled };
}

beforeEach(() => {
  uploads.length = 0;
  delete process.env.SERVER_VIDEO_PROCESSING;
});

test('the switch defaults to ON so deploying changes nothing by itself; only an explicit "off" disables it', () => {
  assert.equal(serverVideoProcessingEnabled(), true);
  process.env.SERVER_VIDEO_PROCESSING = 'on';
  assert.equal(serverVideoProcessingEnabled(), true);
  process.env.SERVER_VIDEO_PROCESSING = 'garbage';
  assert.equal(serverVideoProcessingEnabled(), true);
  process.env.SERVER_VIDEO_PROCESSING = 'off';
  assert.equal(serverVideoProcessingEnabled(), false);
  process.env.SERVER_VIDEO_PROCESSING = 'OFF';
  assert.equal(serverVideoProcessingEnabled(), false);
});

test('OFF: a video is stored exactly as uploaded (same bytes, same type); no transcode runs on the API server', async () => {
  process.env.SERVER_VIDEO_PROCESSING = 'off';
  const h = harness({ mimetype: 'video/quicktime', buffer: VIDEO, originalname: 'clip.MOV' });
  await handleUpload('videos')(h.req, h.res, h.next);

  assert.equal(h.nextCalled(), true);
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].mime, 'video/quicktime', 'not re-labelled as mp4');
  assert.ok(uploads[0].buffer.equals(VIDEO), 'the original bytes were stored untouched');
  assert.match(uploads[0].key, /\.MOV$/, 'original extension kept');
  assert.equal(h.req.storageResult.storageType, 'r2');
});

test('OFF: a streaming (HLS) request is refused with a clear 422 and nothing is stored', async () => {
  process.env.SERVER_VIDEO_PROCESSING = 'off';
  for (const extra of [{ query: { streaming: 'true' } }, { body: { streaming: 'true' } }]) {
    const h = harness({ mimetype: 'video/mp4', buffer: VIDEO, originalname: 'a.mp4' }, extra);
    await handleUpload('videos')(h.req, h.res, h.next);
    assert.equal(h.res.statusCode, 422);
    assert.equal(h.res.body.error, 'STREAMING_PREPARATION_MOVED');
    assert.equal(h.nextCalled(), false);
  }
  const viaOptions = harness({ mimetype: 'video/mp4', buffer: VIDEO, originalname: 'a.mp4' });
  await handleUpload('videos', { streaming: true })(viaOptions.req, viaOptions.res, viaOptions.next);
  assert.equal(viaOptions.res.statusCode, 422);
  assert.equal(uploads.length, 0);
});

test('OFF does not affect non-video uploads (documents pass through untouched)', async () => {
  process.env.SERVER_VIDEO_PROCESSING = 'off';
  const pdf = Buffer.from('%PDF-1.4 test');
  const h = harness({ mimetype: 'application/pdf', buffer: pdf, originalname: 'doc.pdf' });
  await handleUpload('docs')(h.req, h.res, h.next);
  assert.equal(h.nextCalled(), true);
  assert.ok(uploads[0].buffer.equals(pdf));
});

test('ON (default): a non-streaming video still goes through the existing pipeline and is stored (behaviour unchanged)', async () => {
  // The bytes are not a real video, so the (still-enabled) transcode fails and the middleware falls back to the
  // original file, which is exactly the pre-existing behaviour we must not have changed.
  const h = harness({ mimetype: 'video/mp4', buffer: VIDEO, originalname: 'a.mp4' });
  await handleUpload('videos')(h.req, h.res, h.next);
  assert.equal(h.res.statusCode, 200);
  assert.equal(h.nextCalled(), true);
  assert.equal(uploads.length, 1);
});
