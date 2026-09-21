#!/usr/bin/env node
/**
 * Post-deploy security check: does the site accept a NextAuth session signed with a KNOWN-BAD secret?
 *
 * Until 2026-09-21 the repository shipped a public fallback secret, and production ran with it (a token signed with it
 * was accepted). This probe signs a throw-away session with each known-bad string and sends one GET to a protected page.
 * A healthy site treats the token as anonymous and redirects to /login; anything else means that secret is still live.
 *
 * Non-destructive (one GET per token, nothing is written) and only for sites you own.
 *
 *   node scripts/probe-forged-session.js [https://app.180workspace.com]
 *
 * Exit code 1 if any known-bad secret is accepted.
 */
const path = require('path');
const { createRequire } = require('module');
const frontendRequire = createRequire(path.resolve(__dirname, '../apps/frontend/package.json'));
const { encode } = frontendRequire('next-auth/jwt');

// Known-bad values: they were (or are) public in this repository's history. These are NOT credentials to use.
const KNOWN_BAD = {
  'old middleware/authOptions fallback': 'build-time-secret-placeholder-min-32-chars',
  'old Dockerfile build ENV': 'build-secret-placeholder-minimum-32-chars-for-jwt',
};

async function main() {
  const base = (process.argv[2] || 'https://app.180workspace.com').replace(/\/$/, '');
  const baseline = await fetch(`${base}/dashboard`, { redirect: 'manual' });
  const baselineLoc = baseline.headers.get('location') || '';
  console.log(`baseline (no cookie): HTTP ${baseline.status} -> ${baselineLoc}`);

  let bad = 0;
  for (const [label, secret] of Object.entries(KNOWN_BAD)) {
    const token = await encode({
      token: { name: 'probe', email: 'probe@example.invalid', sub: 'probe' },
      secret,
      maxAge: 600,
    });
    const res = await fetch(`${base}/dashboard`, {
      redirect: 'manual',
      headers: { cookie: `__Secure-next-auth.session-token=${token}` },
    });
    const loc = res.headers.get('location') || '';
    // Rejected == behaves exactly like the anonymous baseline.
    const rejected = res.status === baseline.status && loc === baselineLoc;
    if (!rejected) bad++;
    console.log(`${label.padEnd(40)} HTTP ${res.status} -> ${loc}  ${rejected ? 'OK (rejected)' : 'FAIL (known-bad secret is accepted)'}`);
  }
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error('probe failed:', e.message);
  process.exit(2);
});
