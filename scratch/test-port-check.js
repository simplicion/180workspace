const http = require('http');

[3000, 3001, 3002, 4000, 4002].forEach(port => {
  const req = http.request({
    hostname: '127.0.0.1',
    port,
    path: '/f/4he5uv3dpu',
    method: 'GET',
    timeout: 3000
  }, (res) => {
    console.log(`Port ${port} -> Status ${res.statusCode}`);
  });
  req.on('error', e => {});
  req.on('timeout', () => { req.destroy(); });
  req.end();
});
