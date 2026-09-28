#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const APPS = {
  backend: {
    name: 'Backend API & Main Monolith',
    filter: 'backend',
    cmd: 'pnpm',
    args: ['--filter', 'backend', 'dev'],
    port: 4002,
    color: '\x1b[36m', // Cyan
  },
  'core-backend': {
    name: '180 Core Backend (Identity, Wallet, Checkout & Payouts)',
    filter: '180-core-backend',
    cmd: 'pnpm',
    args: ['--filter', '180-core-backend', 'dev'],
    port: 4003,
    color: '\x1b[38;5;141m', // Purple
  },
  frontend: {
    name: '180 Workspace Platform (Web)',
    filter: 'frontend',
    cmd: 'pnpm',
    args: ['--filter', 'frontend', 'dev'],
    port: 3002,
    color: '\x1b[34m', // Blue
  },
  profile: {
    name: '180 Profile Frontend (Universal Identity, Wallet & Popups)',
    filter: '180-profile-frontend',
    cmd: 'pnpm',
    args: ['--filter', '180-profile-frontend', 'dev'],
    port: 3009,
    color: '\x1b[38;5;213m', // Pink / Magenta
  },
  developers: {
    name: '180 Developer Platform',
    filter: '180developers-frontend',
    cmd: 'pnpm',
    args: ['--filter', '180developers-frontend', 'dev'],
    port: 3008,
    color: '\x1b[38;5;208m', // Orange
  },
  admin: {
    name: 'Platform Admin Portal',
    filter: 'admin-web',
    cmd: 'pnpm',
    args: ['--filter', 'admin-web', 'dev'],
    port: 3003,
    color: '\x1b[35m', // Magenta
  },
  marketing: {
    name: 'Marketing & Landing Web',
    filter: 'apps-marketing-web',
    cmd: 'pnpm',
    args: ['--filter', 'apps-marketing-web', 'dev'],
    port: 3004,
    color: '\x1b[33m', // Yellow
  },
  worker: {
    name: 'Background Worker Node',
    filter: 'worker',
    cmd: 'pnpm',
    args: ['--filter', 'worker', 'dev'],
    port: 4004,
    color: '\x1b[32m', // Green
  },
  docs: {
    name: 'Documentation Portal',
    filter: 'apps-docs',
    cmd: 'pnpm',
    args: ['--filter', 'apps-docs', 'dev'],
    port: 3005,
    color: '\x1b[90m', // Gray
  },
  trafficdirector: {
    name: '180 Traffic Director (Web)',
    filter: 'traffic-director-web',
    cmd: 'pnpm',
    args: ['--filter', 'traffic-director-web', 'dev'],
    port: 3010,
    color: '\x1b[38;5;197m', // Crimson / Rose
  },
  social: {
    name: '180 Social Studio (Flutter Mobile)',
    filter: 'social-studio-mobile',
    cmd: 'flutter',
    args: ['run', '-d', 'chrome', '--web-port', '3007'],
    cwd: path.join(rootDir, 'apps', 'social-studio-mobile'),
    port: 3007,
    color: '\x1b[96m', // Bright Cyan
  },
};

const ALIASES = {
  api: 'backend',
  server: 'backend',
  core: 'core-backend',
  '180-core-backend': 'core-backend',
  services: 'core-backend',
  web: 'frontend',
  app: 'frontend',
  '180-profile': 'profile',
  '180-profile-frontend': 'profile',
  auth: 'profile',
  pay: 'profile',
  'admin-web': 'admin',
  'marketing-web': 'marketing',
  'developer-portal': 'developers',
  developer: 'developers',
  devs: 'developers',
  'traffic-director': 'trafficdirector',
  traffic: 'trafficdirector',
  td: 'trafficdirector',
  'social-studio': 'social',
  'social-studio-mobile': 'social',
};

const rawArg = (process.argv[2] || '').trim().toLowerCase();
const requestedApp = ALIASES[rawArg] || rawArg;

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function printBanner() {
  console.log('\n' + BOLD + '============================================================' + RESET);
  console.log(BOLD + '        180 WORKSPACE — DEV ORCHESTRATION ENGINE' + RESET);
  console.log(BOLD + '============================================================' + RESET);
  console.log('Available app targets:\n');
  for (const [key, app] of Object.entries(APPS)) {
    const portStr = app.port ? ` -> http://localhost:${app.port}` : '';
    console.log(`  ${app.color}${key.padEnd(16)}${RESET} : ${app.name}${portStr}`);
  }
  console.log('\nUsage commands:');
  console.log('  pnpm dev                 (Spins up ALL workspace platform apps)');
  console.log('  pnpm dev:core-backend    (Runs 180 Core Backend on :4003)');
  console.log('  pnpm dev:profile         (Runs 180 Profile Frontend on :3009)');
  console.log('  pnpm dev:developers      (Runs 180 Developer Portal on :3008)');
  console.log('  pnpm dev:backend         (Runs Main Backend on :4002)');
  console.log('  pnpm dev:frontend        (Runs Web Platform on :3002)');
  console.log('  pnpm dev:admin           (Runs Admin Portal on :3003)');
  console.log('  pnpm dev:marketing       (Runs Marketing on :3004)');
  console.log('  pnpm dev:all             (Runs all web & backend apps)');
  console.log(BOLD + '============================================================\n' + RESET);
}

function runSingleApp(key) {
  const app = APPS[key];
  if (!app) {
    console.error(`\nUnknown app: "${key}". See list above for valid app keys.`);
    process.exit(1);
  }

  console.log(`\nLaunching ${BOLD}${app.name}${RESET}...`);
  if (app.port) {
    console.log(`URL: http://localhost:${app.port}`);
  }

  const child = spawn(app.cmd, app.args, {
    cwd: app.cwd || rootDir,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

function runAllApps(includeMobile = false) {
  console.log(BOLD + 'Starting ALL workspace platform apps in parallel via Turborepo...' + RESET);
  console.log('  [180-core-backend]      -> http://localhost:4003 (Identity, Wallet, 180 Pay & Payouts)');
  console.log('  [180-profile-frontend]  -> http://localhost:3009 (Universal Profile, Wallet & Popups)');
  console.log('  [180developers-frontend]-> http://localhost:3008 (180 Developer Portal)');
  console.log('  [backend]               -> http://localhost:4002 (Main Backend API)');
  console.log('  [frontend]              -> http://localhost:3002 (180 Workspace Web Platform)');
  console.log('  [admin-web]             -> http://localhost:3003 (Platform Admin Portal)');
  console.log('  [apps-marketing-web]    -> http://localhost:3004 (Marketing & Landing Web)');
  console.log('  [traffic-director-web]  -> http://localhost:3010 (Traffic Director)');
  console.log('  [worker]                -> Background Jobs Node');
  console.log('  [apps-docs]             -> http://localhost:3005 (Documentation Portal)');
  if (includeMobile) {
    console.log('  [social-studio-mobile]  -> http://localhost:3007 (180 Social Studio Flutter Mobile)');
  }
  console.log('\nPress Ctrl+C to terminate all servers.\n');

  const turboArgs = [
    'exec',
    'turbo',
    'run',
    'dev',
    '--concurrency=25',
    '--filter=180-core-backend',
    '--filter=180-profile-frontend',
    '--filter=180developers-frontend',
    '--filter=backend',
    '--filter=frontend',
    '--filter=traffic-director-web',
    '--filter=admin-web',
    '--filter=apps-marketing-web',
    '--filter=worker',
    '--filter=apps-docs',
  ];

  if (includeMobile) {
    turboArgs.push('--filter=social-studio-mobile');
  }

  const child = spawn('pnpm', turboArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });

  const cleanup = () => {
    try {
      child.kill('SIGINT');
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

// ─── Main Dispatch ──────────────────────────────────────────────────────────
if (requestedApp === 'help' || requestedApp === '--help' || requestedApp === '-h') {
  printBanner();
  process.exit(0);
}

if (!requestedApp || requestedApp === '' || requestedApp === 'all') {
  printBanner();
  runAllApps(false);
} else if (requestedApp === 'all:mobile' || requestedApp === 'full') {
  printBanner();
  runAllApps(true);
} else if (APPS[requestedApp]) {
  runSingleApp(requestedApp);
} else {
  printBanner();
  console.error(`Error: Unknown target "${rawArg}".\n`);
  process.exit(1);
}
