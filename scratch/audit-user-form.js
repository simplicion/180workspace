const http = require('http');

const req = http.request({
  hostname: '127.0.0.1',
  port: 4002,
  path: '/api/public/forms/4he5uv3dpu',
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const form = json.data?.form;
    console.log('=== FORM AUDIT ===');
    console.log('Title:', form?.title);
    console.log('Description:', form?.description);
    console.log('Header Image:', form?.settings?.headerImage);
    console.log('Footer Image:', form?.settings?.footerImage);
    console.log('Footer Text:', form?.settings?.footerText);
    console.log('Button Color:', form?.settings?.buttonColor);
    console.log('Submit Button Text:', form?.settings?.submitButtonText);
    console.log('Fields count:', form?.fields?.length);
    console.log('Company:', form?.company?.name);
    console.log('==================');
  });
});

req.on('error', e => console.error('Error:', e.message));
req.end();
