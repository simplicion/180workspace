import assert from 'node:assert/strict';

console.log('🧪 Starting 180workspace Free Tools Edge-Case Test Suite...\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

// 1. YouTube Video ID Extractor Edge Cases
function extractVideoId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'shorts' || pathParts[0] === 'embed' || pathParts[0] === 'v') {
        if (pathParts[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[1])) return pathParts[1];
      }
    } else if (parsed.hostname.includes('youtu.be')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) return pathParts[0];
    }
  } catch {
    // Fall through
  }

  const match = trimmed.match(/(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

console.log('📌 1. Testing YouTube Video ID Extraction:');
test('Standard watch URL', () => {
  assert.equal(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('Query params before v=', () => {
  assert.equal(extractVideoId('https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42s'), 'dQw4w9WgXcQ');
});

test('Playlist query params', () => {
  assert.equal(extractVideoId('https://www.youtube.com/watch?list=PL12345&v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('Mobile URL', () => {
  assert.equal(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('Shortlink youtu.be', () => {
  assert.equal(extractVideoId('https://youtu.be/dQw4w9WgXcQ?si=customTrack123'), 'dQw4w9WgXcQ');
});

test('YouTube Shorts URL', () => {
  assert.equal(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('YouTube Embed URL', () => {
  assert.equal(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('Raw 11-char ID', () => {
  assert.equal(extractVideoId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('Invalid URLs return null', () => {
  assert.equal(extractVideoId('https://google.com'), null);
  assert.equal(extractVideoId(''), null);
  assert.equal(extractVideoId(null), null);
});

// 2. UTM Builder & Sanitizer
console.log('\n📌 2. Testing UTM Campaign Builder & Sanitization:');
function buildUtmUrl(baseUrl, params) {
  let trimmedBase = (baseUrl || '').trim();
  if (!trimmedBase) return '';
  if (!trimmedBase.startsWith('http://') && !trimmedBase.startsWith('https://')) {
    trimmedBase = 'https://' + trimmedBase;
  }

  const url = new URL(trimmedBase);
  if (params.source?.trim()) url.searchParams.set('utm_source', params.source.trim());
  if (params.medium?.trim()) url.searchParams.set('utm_medium', params.medium.trim());
  if (params.campaign?.trim()) url.searchParams.set('utm_campaign', params.campaign.trim());
  if (params.term?.trim()) url.searchParams.set('utm_term', params.term.trim());
  if (params.content?.trim()) url.searchParams.set('utm_content', params.content.trim());

  return url.toString();
}

test('Auto-prepends https:// on protocol-less input', () => {
  const res = buildUtmUrl('180workspace.com/pricing', { source: 'google', medium: 'cpc' });
  assert.equal(res, 'https://180workspace.com/pricing?utm_source=google&utm_medium=cpc');
});

test('Preserves existing query parameters without double question marks', () => {
  const res = buildUtmUrl('https://180workspace.com/signup?plan=momentum&ref=partner', { source: 'twitter', medium: 'social' });
  assert.ok(res.includes('plan=momentum'));
  assert.ok(res.includes('ref=partner'));
  assert.ok(res.includes('utm_source=twitter'));
  assert.equal(res.split('?').length - 1, 1);
});

test('Encodes special characters and spaces in campaign names', () => {
  const res = buildUtmUrl('https://180workspace.com', { campaign: 'summer & black friday sale' });
  assert.ok(res.includes('utm_campaign=summer+%26+black+friday+sale'));
});

// 3. Invoice Calculations
console.log('\n📌 3. Testing Invoice Calculation Engine:');
function calculateInvoice(items, discountPercent, shipping, amountPaid) {
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const totalTax = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (item.taxPercent / 100)), 0);
  const discountAmount = (subtotal * Math.min(100, Math.max(0, discountPercent))) / 100;
  const total = Math.max(0, subtotal + totalTax + Math.max(0, shipping) - discountAmount);
  const balanceDue = Math.max(0, total - Math.max(0, amountPaid));

  return { subtotal, totalTax, discountAmount, total, balanceDue };
}

test('Standard multi-item calculation', () => {
  const items = [
    { quantity: 2, unitPrice: 100, taxPercent: 10 },
    { quantity: 1, unitPrice: 300, taxPercent: 0 }
  ];
  const res = calculateInvoice(items, 10, 20, 0);
  assert.equal(res.subtotal, 500);
  assert.equal(res.totalTax, 20);
  assert.equal(res.discountAmount, 50);
  assert.equal(res.total, 490);
  assert.equal(res.balanceDue, 490);
});

test('100% discount handles total as 0', () => {
  const items = [{ quantity: 1, unitPrice: 1000, taxPercent: 0 }];
  const res = calculateInvoice(items, 100, 0, 0);
  assert.equal(res.discountAmount, 1000);
  assert.equal(res.total, 0);
  assert.equal(res.balanceDue, 0);
});

// 4. Dynamic Currency Resolution
console.log('\n📌 4. Testing Currency Dynamic Intl Resolution:');
function resolveCurrencySymbol(currencyCode) {
  try {
    const code = (currencyCode || 'USD').toString().trim().toUpperCase();
    return (0).toLocaleString('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).replace(/\d/g, '').trim() || code;
  } catch {
    return currencyCode;
  }
}

test('Resolves global currencies dynamically', () => {
  assert.equal(resolveCurrencySymbol('USD'), '$');
  assert.equal(resolveCurrencySymbol('EUR'), '€');
  assert.equal(resolveCurrencySymbol('GBP'), '£');
  assert.equal(resolveCurrencySymbol('INR'), '₹');
  assert.equal(resolveCurrencySymbol('JPY'), '¥');
  assert.equal(resolveCurrencySymbol('CAD'), 'CA$');
  assert.ok(resolveCurrencySymbol('AUD') === 'A$' || resolveCurrencySymbol('AUD') === 'AU$');
});

test('Gracefully handles exotic or fallback codes', () => {
  assert.equal(resolveCurrencySymbol('XYZ'), 'XYZ');
  assert.equal(resolveCurrencySymbol(''), '$');
});

console.log(`\n🎉 Results: ${passed} / ${total} Tests Passed Successfully!\n`);
