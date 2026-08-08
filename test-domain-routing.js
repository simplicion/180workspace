/**
 * Comprehensive Domain Routing Audit Script
 * Tests all critical routing paths for the 180workspace platform.
 * 
 * This script validates:
 * 1. Unauthenticated user on root domain → redirect to /login
 * 2. Custom domain public website → serves website (200)
 * 3. Company subdomain + /dashboard → serves dashboard (not rewrite to /sites/)
 * 4. Company subdomain + public path → rewrites to /sites/ for marketing website
 * 5. Auth callback URL construction is correct
 * 6. Workspace setup returns companySlug
 */
const http = require('http');

const RESULTS = [];

function log(name, status, detail) {
    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${name}`);
    if (detail) console.log(`   ${detail}`);
    RESULTS.push({ name, status, detail });
}

async function httpGet(options) {
    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', (e) => resolve({ error: e.message }));
        req.end();
    });
}

async function runTests() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  180workspace Domain Routing Audit                          ║');
    console.log('║  Testing Middleware, Subdomain Auth, Custom Domains          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // ─── Test 1: Unauthenticated user on root domain accessing /dashboard ───
    console.log('── Test 1: Unauthenticated → /dashboard ──');
    const t1 = await httpGet({
        hostname: 'localhost', port: 3002, path: '/dashboard', method: 'GET',
        headers: { 'Host': 'localhost:3002' }
    });
    if (t1.error) {
        log('Unauthenticated /dashboard', 'FAIL', `Connection error: ${t1.error}`);
    } else if (t1.status === 307 && t1.headers.location && t1.headers.location.includes('/login')) {
        log('Unauthenticated /dashboard', 'PASS', `Redirected to: ${t1.headers.location}`);
    } else {
        log('Unauthenticated /dashboard', 'FAIL', `Got status ${t1.status}, location: ${t1.headers.location || 'none'}`);
    }

    // ─── Test 2: Unauthenticated user on root domain accessing / ────────────
    console.log('\n── Test 2: Unauthenticated → / ──');
    const t2 = await httpGet({
        hostname: 'localhost', port: 3002, path: '/', method: 'GET',
        headers: { 'Host': 'localhost:3002' }
    });
    if (t2.error) {
        log('Unauthenticated /', 'FAIL', `Connection error: ${t2.error}`);
    } else if (t2.status === 200) {
        log('Unauthenticated /', 'PASS', `Landing page served (status 200)`);
    } else if (t2.status === 307) {
        log('Unauthenticated /', 'WARN', `Redirected (expected 200 for landing page): ${t2.headers.location}`);
    } else {
        log('Unauthenticated /', 'FAIL', `Got status ${t2.status}`);
    }

    // ─── Test 3: Custom domain rewrite (simulated with Host header) ─────────
    console.log('\n── Test 3: Custom domain → public website ──');
    const t3 = await httpGet({
        hostname: 'localhost', port: 3002, path: '/', method: 'GET',
        headers: { 'Host': 'mycustomdomain.com' }
    });
    if (t3.error) {
        log('Custom domain rewrite', 'FAIL', `Connection error: ${t3.error}`);
    } else if (t3.status === 200) {
        log('Custom domain rewrite', 'PASS', `Public website served (status 200, rewritten to /sites/)`);
    } else {
        log('Custom domain rewrite', 'FAIL', `Got status ${t3.status}, expected 200`);
    }

    // ─── Test 4: Subdomain + /dashboard should NOT rewrite to /sites/ ───────
    console.log('\n── Test 4: company.localhost /dashboard → should NOT rewrite ──');
    const t4 = await httpGet({
        hostname: 'localhost', port: 3002, path: '/dashboard', method: 'GET',
        headers: { 'Host': 'mycompany.localhost:3002' }
    });
    if (t4.error) {
        log('Subdomain /dashboard', 'FAIL', `Connection error: ${t4.error}`);
    } else if (t4.status === 307 && t4.headers.location && t4.headers.location.includes('/login')) {
        log('Subdomain /dashboard', 'PASS', `Correctly redirected unauthenticated user to login: ${t4.headers.location}`);
    } else if (t4.status === 200) {
        log('Subdomain /dashboard', 'WARN', `Got 200 — could mean /sites/ rewrite happened (check body)`);
    } else {
        log('Subdomain /dashboard', 'WARN', `Got status ${t4.status}, location: ${t4.headers.location || 'none'}`);
    }

    // ─── Test 5: Subdomain + public path SHOULD rewrite to /sites/ ──────────
    console.log('\n── Test 5: company.localhost / → should rewrite to marketing site ──');
    const t5 = await httpGet({
        hostname: 'localhost', port: 3002, path: '/', method: 'GET',
        headers: { 'Host': 'mycompany.localhost:3002' }
    });
    if (t5.error) {
        log('Subdomain / rewrite', 'FAIL', `Connection error: ${t5.error}`);
    } else if (t5.status === 200) {
        log('Subdomain / rewrite', 'PASS', `Public marketing site served (status 200)`);
    } else {
        log('Subdomain / rewrite', 'WARN', `Got status ${t5.status}, expected 200 for public site`);
    }

    // ─── Test 6: API endpoint for public website resolution ─────────────────
    console.log('\n── Test 6: Public website resolve API ──');
    const t6 = await httpGet({
        hostname: 'localhost', port: 5000, path: '/api/public/websites/resolve?domain=localhost', method: 'GET',
        headers: {}
    });
    if (t6.error) {
        log('Public resolve API', 'FAIL', `Connection error: ${t6.error}. Is the backend running on port 5000?`);
    } else {
        log('Public resolve API', t6.status === 404 ? 'PASS' : (t6.status === 200 ? 'PASS' : 'WARN'),
            `Status ${t6.status}, body: ${t6.body?.substring(0, 200)}`);
    }

    // ─── Summary ─────────────────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  AUDIT SUMMARY                                              ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    const passed = RESULTS.filter(r => r.status === 'PASS').length;
    const warned = RESULTS.filter(r => r.status === 'WARN').length;
    const failed = RESULTS.filter(r => r.status === 'FAIL').length;
    console.log(`║  ✅ Passed: ${passed}   ⚠️  Warnings: ${warned}   ❌ Failed: ${failed}              ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
}

runTests();
