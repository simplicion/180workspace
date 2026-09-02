const http = require('http');

const req = http.request({
  hostname: '127.0.0.1',
  port: 3002,
  path: '/f/4he5uv3dpu',
  method: 'GET'
}, (res) => {
  console.log('STATUS:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('BODY LENGTH:', data.length);
    console.log('HAS ERROR IN HTML:', data.includes('Error:') || data.includes('Expected'));
  });
});

req.on('error', e => console.error('Error:', e.message));
req.end();
