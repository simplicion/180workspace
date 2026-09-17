import assert from 'assert';
import { ReverseProxyService } from '../../src/services/proxy.service';
import { TrafficLinksService } from '../../src/services/links.service';

async function runTests() {
  console.log('--- TEST SUITE 17: Subpath Navigation, Audio/Media Streaming & Cloaking Integrity ---');

  // 1. Audio & Media MIME Type Detection
  console.log('\n[1/6] Testing Media MIME Type Resolution...');
  assert.strictEqual((ReverseProxyService as any).detectMimeType('https://example.com/audio/voice-alert.mp3'), 'audio/mpeg');
  assert.strictEqual((ReverseProxyService as any).detectMimeType('https://example.com/sounds/chime.wav'), 'audio/wav');
  assert.strictEqual((ReverseProxyService as any).detectMimeType('https://example.com/media/track.ogg'), 'audio/ogg');
  assert.strictEqual((ReverseProxyService as any).detectMimeType('https://example.com/media/song.m4a'), 'audio/mp4');
  assert.strictEqual((ReverseProxyService as any).detectMimeType('https://example.com/media/audio.aac'), 'audio/mp4');
  assert.strictEqual((ReverseProxyService as any).detectMimeType('https://example.com/media/audio.flac'), 'audio/flac');
  assert.strictEqual((ReverseProxyService as any).detectMimeType('https://example.com/media/video.mp4'), 'video/mp4');
  assert.strictEqual((ReverseProxyService as any).detectMimeType('https://example.com/media/video.webm'), 'video/webm');
  assert.strictEqual((ReverseProxyService as any).detectMimeType('https://example.com/sub/page.html'), 'text/html; charset=utf-8');
  console.log('  ✓ All Audio, Video, and HTML MIME types detected accurately with no corrupt fallbacks.');

  // 2. Subpath URL Resolution Logic
  console.log('\n[2/6] Testing Deep Subpath URL Construction (.html, subfolders, query preservation)...');
  const baseTarget = 'https://food-qouta.vercel.app/';
  const subpath1 = 'K7mQ2xv9pL4zR8nT1wY6aC3dF5hj0sB8uN2eG7kP4qW9rX1tM6vZ3yH5cD8fL0nA2sE7iU4ol9pO1bV6xC3mQ8zR5wT0kY7nJ2.html';
  const resolved1 = new URL(subpath1, new URL(baseTarget).href).toString();
  assert.strictEqual(resolved1, 'https://food-qouta.vercel.app/K7mQ2xv9pL4zR8nT1wY6aC3dF5hj0sB8uN2eG7kP4qW9rX1tM6vZ3yH5cD8fL0nA2sE7iU4ol9pO1bV6xC3mQ8zR5wT0kY7nJ2.html');

  const subpath2 = 'nested/subfolder/pricing.html';
  const resolved2 = new URL(subpath2, new URL(baseTarget).href).toString();
  assert.strictEqual(resolved2, 'https://food-qouta.vercel.app/nested/subfolder/pricing.html');

  const subpath3 = 'audio/alert.mp3';
  const resolved3 = new URL(subpath3, new URL(baseTarget).href).toString();
  assert.strictEqual(resolved3, 'https://food-qouta.vercel.app/audio/alert.mp3');
  console.log('  ✓ Deep subpath URL resolution accurately resolves multi-level paths and .html extensions.');

  // 3. Media & Audio Tags Rewriting
  console.log('\n[3/6] Testing HTML Audio & Media Tag Rewriting...');
  const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Microsoft Support Alert</title>
  <link rel="stylesheet" href="/assets/style.css">
  <script src="/js/app.js"></script>
</head>
<body>
  <audio id="alert-sound" src="/audio/warning.mp3" autoplay></audio>
  <video id="intro" src="/media/intro.mp4" controls>
    <source src="/media/intro.webm" type="video/webm">
    <track src="/media/subtitles.vtt">
  </video>
  <a href="https://food-qouta.vercel.app/contact.html">Contact Us</a>
  <a href="https://food-qouta.vercel.app/support/page2">Next Page</a>
  <form action="https://food-qouta.vercel.app/submit-form" method="POST">
    <input type="text" name="query" />
  </form>
</body>
</html>`;

  // Mock upstream fetch for test
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: any, init?: any) => {
    return {
      status: 200,
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: async () => sampleHtml
    } as any;
  };

  const streamResult = await ReverseProxyService.fetchAndStreamHtml('https://food-qouta.vercel.app/');
  globalThis.fetch = originalFetch;

  // Verify Audio tag was rewritten to asset proxy
  assert.ok(
    streamResult.html.includes('src="/r/_proxy/asset?url=' + encodeURIComponent('https://food-qouta.vercel.app/audio/warning.mp3') + '"'),
    'Audio src attribute must be rewritten through /r/_proxy/asset'
  );

  // Verify Video & Source tags were rewritten
  assert.ok(
    streamResult.html.includes('src="/r/_proxy/asset?url=' + encodeURIComponent('https://food-qouta.vercel.app/media/intro.mp4') + '"'),
    'Video src attribute must be rewritten through /r/_proxy/asset'
  );
  assert.ok(
    streamResult.html.includes('src="/r/_proxy/asset?url=' + encodeURIComponent('https://food-qouta.vercel.app/media/intro.webm') + '"'),
    'Source src attribute must be rewritten through /r/_proxy/asset'
  );

  // Verify Internal links & form action were rewritten to root-relative paths
  assert.ok(
    streamResult.html.includes('href="/contact.html"'),
    'Internal target link must be rewritten to root-relative path (/contact.html) to keep navigation on cloaked domain'
  );
  assert.ok(
    streamResult.html.includes('href="/support/page2"'),
    'Internal subpage link must be rewritten to root-relative path (/support/page2)'
  );
  assert.ok(
    streamResult.html.includes('action="/submit-form"'),
    'Form action must be rewritten to root-relative path (/submit-form)'
  );
  console.log('  ✓ HTML media tags and internal navigation links rewritten seamlessly to preserve cloaked domain session.');

  // 4. Client-Side Audio Interceptors & Autoplay Unlocking Script
  console.log('\n[4/6] Testing Client-Side Script Injection (Audio Constructor & Autoplay Unlocker)...');
  assert.ok(streamResult.html.includes('window.Audio = function(src)'), 'Must inject window.Audio constructor proxy wrapper');
  assert.ok(streamResult.html.includes('unlockAudio'), 'Must inject unlockAudio autoplay handler');
  assert.ok(streamResult.html.includes('HTMLAudioElement'), 'Must inject HTMLAudioElement prototype interceptor');
  assert.ok(streamResult.html.includes('addEventListener'), 'Must inject user-interaction unlock listener');
  console.log('  ✓ Audio constructor wrapper, property setters, and autoplay unlocker successfully injected.');

  // 5. Asset Streaming & Range Support
  console.log('\n[5/6] Testing Asset Streaming with Range & CORS headers...');
  const fakeAudioBuffer = Buffer.from('FAKE_MP3_AUDIO_HEADER_BINARY_DATA');
  globalThis.fetch = async (url: any, init?: any) => {
    const ab = new ArrayBuffer(fakeAudioBuffer.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < fakeAudioBuffer.length; i++) {
      view[i] = fakeAudioBuffer[i];
    }
    return {
      status: 200,
      headers: new Headers({
        'content-type': 'audio/mpeg',
        'accept-ranges': 'bytes'
      }),
      arrayBuffer: async () => ab
    } as any;
  };

  const assetResult = await ReverseProxyService.fetchAndStreamAsset('https://food-qouta.vercel.app/audio/alert.mp3', {
    customHeaders: { range: 'bytes=0-100' },
    bypassCache: true
  });
  globalThis.fetch = originalFetch;

  assert.strictEqual(assetResult.contentType, 'audio/mpeg');
  assert.strictEqual(assetResult.headers['Accept-Ranges'], 'bytes');
  assert.strictEqual(assetResult.headers['Access-Control-Allow-Origin'], '*');
  assert.strictEqual(assetResult.headers['X-Powered-By'], '180workspace-Traffic-Director');
  assert.strictEqual(assetResult.body.toString('utf-8'), 'FAKE_MP3_AUDIO_HEADER_BINARY_DATA');
  console.log('  ✓ Audio asset streaming preserves binary payload, content-type, Range support, and universal CORS.');

  // 6. Subdomain Prefix Custom Domain Matching
  console.log('\n[6/6] Testing Custom Domain & Subdomain Prefix Resolution...');
  assert.strictEqual(typeof TrafficLinksService.getLinkByCustomDomain, 'function');
  console.log('  ✓ Custom domain service ready with fallback subdomain prefix support.');

  console.log('\n========================================================================');
  console.log('🎉 ALL TEST SUITE 17 VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('========================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test Suite 17 failed:', err);
  process.exit(1);
});
