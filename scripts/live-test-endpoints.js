const https = require('https');
const http = require('http');

const endpoints = [
  { name: '180 Marketing Site', url: 'https://180workspace.com' },
  { name: '180 SaaS Platform (3002)', url: 'https://app.180workspace.com' },
  { name: '180 Admin Console (3003)', url: 'https://admin.180workspace.com' },
  { name: '180 Docs Portal (3005)', url: 'https://docs.180workspace.com' },
  { name: '180 Traffic Director (3006)', url: 'https://traffic.180workspace.com' },
  { name: '180 Developers Portal (3008)', url: 'https://developers.180workspace.com' },
  { name: '180 Profile Frontend (3009)', url: 'https://profile.180workspace.com' },
  { name: '180 Pay Checkout (pay.)', url: 'https://pay.180workspace.com' },
  { name: '180 Main API Backend (Health)', url: 'https://api.180workspace.com/health' },
  { name: '180 Core Backend (Health)', url: 'https://services.180workspace.com/health' },
  { name: '180 OpenID Discovery (.well-known)', url: 'https://profile.180workspace.com/.well-known/openid-configuration' },
  { name: 'Twitter / Meta OAuth Dispatcher', url: 'https://api.180workspace.com/v1/social-media/accounts/oauth/meta' },
  { name: 'Social Media Webhook Verification', url: 'https://api.180workspace.com/v1/social-media/webhooks/meta' },
  { name: 'LiveKit WebRTC Server', url: 'https://livekit.180workspace.com' },
];

function checkEndpoint(item) {
  return new Promise((resolve) => {
    const parsed = new URL(item.url);
    const client = parsed.protocol === 'https:' ? https : http;
    
    const req = client.request(item.url, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': '180workspace-Endpoint-Auditor/1.0',
        'Accept': '*/*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => {
        if (data.length < 500) data += chunk;
      });
      res.on('end', () => {
        resolve({
          name: item.name,
          url: item.url,
          status: res.statusCode,
          headers: res.headers,
          snippet: data.slice(0, 100).replace(/\r?\n|\r/g, ' ')
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name: item.name,
        url: item.url,
        status: 'ERROR',
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: item.name,
        url: item.url,
        status: 'TIMEOUT',
        error: 'Request timed out after 10s'
      });
    });

    req.end();
  });
}

async function runAudit() {
  console.log('==> Testing All Live 180workspace Production Endpoints...\n');
  const results = await Promise.all(endpoints.map(checkEndpoint));
  console.table(results.map(r => ({
    Application: r.name,
    URL: r.url,
    Status: r.status,
    Detail: r.error || r.snippet || 'OK'
  })));
}

runAudit();
