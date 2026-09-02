const http = require('http');

const req = http.request({
  hostname: '127.0.0.1',
  port: 3002,
  path: '/f/4he5uv3dpu?embed=true',
  headers: {
    'Host': 'thor-power.localhost:3002'
  },
  method: 'GET'
}, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:');
  console.log('X-Frame-Options:', res.headers['x-frame-options']);
  console.log('Content-Security-Policy:', res.headers['content-security-policy']);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('BODY length:', data.length);
  });
});

req.on('error', e => console.error(e));
req.end();
