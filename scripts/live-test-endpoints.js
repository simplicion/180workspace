const https = require('https');
const http = require('http');

const endpoints = [
  { name: 'Marketing Site', url: 'https://180workspace.com' },
  { name: 'Documentation Portal', url: 'https://docs.180workspace.com' },
  { name: 'SaaS Platform App', url: 'https://app.180workspace.com' },
  { name: 'Admin Console Web', url: 'https://admin.180workspace.com' },
  { name: 'Main Backend Health API', url: 'https://api.180workspace.com/health' },
  { name: '180 Core Backend Health', url: 'https://services.180workspace.com/health' },
  { name: 'OpenID Configuration (180 Identity)', url: 'https://auth.180workspace.com/.well-known/openid-configuration' },
  { name: '180 Identity Portal (180identity)', url: 'https://180identity.180workspace.com/.well-known/openid-configuration' },
  { name: 'Twitter / Social Accounts Endpoint', url: 'https://api.180workspace.com/v1/social-media/accounts/oauth/meta' },
  { name: 'Social Media Webhook Verification', url: 'https://api.180workspace.com/v1/social-media/webhooks/meta' },
  { name: 'LiveKit WebRTC Health', url: 'https://livekit.180workspace.com' },
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
          snippet: data.slice(0, 150).replace(/\r?\n|\r/g, ' ')
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
