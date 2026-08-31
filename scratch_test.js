const http = require('http');

const req = http.request('http://localhost:3002/api/v1/workspace-tools/documents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});

req.on('error', console.error);
req.write(JSON.stringify({ title: 'Test Document', content: '{"blocks": []}' }));
req.end();
