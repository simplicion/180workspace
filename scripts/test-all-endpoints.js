const https = require('https');

function test(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = https.request(parsed, {
      method,
      headers: { ...headers, ...(data ? { 'Content-Type': 'application/json' } : {}) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 500,
          preview: body.substring(0, 180).replace(/\s+/g, ' ')
        });
      });
    });
    req.on('error', (err) => resolve({ url, status: 'ERROR', error: err.message, ok: false }));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function verifyAll() {
  const tests = [
    { name: '180 Core Backend Health', fn: () => test('https://services.180workspace.com/health') },
    { name: '180 Core Auth Login Validation', fn: () => test('https://services.180workspace.com/api/oauth/login', 'POST', { identifier: 'isolation_verify@180workspace.com', password: 'samplepassword' }) },
    { name: '180 Workspace Backend API', fn: () => test('https://api.180workspace.com/') },
    { name: '180 Profile Frontend (profile)', fn: () => test('https://profile.180workspace.com/auth/login') },
    { name: '180 Pay Gateway Frontend (pay)', fn: () => test('https://pay.180workspace.com/checkout/preview') },
    { name: '180 Developers Console', fn: () => test('https://developers.180workspace.com/') },
    { name: '180 Traffic Director Platform', fn: () => test('https://traffic.180workspace.com/traffic-director') },
    { name: '180 SaaS Documentation', fn: () => test('https://docs.180workspace.com/') },
    { name: '180 Admin Web Portal', fn: () => test('https://admin.180workspace.com/') },
    { name: '180 SaaS Main App', fn: () => test('https://app.180workspace.com/') },
  ];

  console.log('\n========================================================');
  console.log('       180 PLATFORM COMPLETE VERIFICATION AUDIT');
  console.log('========================================================\n');

  for (const t of tests) {
    const res = await t.fn();
    const icon = res.ok ? '✓ PASS' : '✗ FAIL';
    console.log(icon + ' [' + res.status + '] ' + t.name);
    console.log('       URL: ' + res.url);
    if (res.preview) console.log('       Response: ' + res.preview);
    console.log('');
  }
}

verifyAll();
